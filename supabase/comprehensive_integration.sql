-- 综合评价正式系统：复用主系统登录与当前学生，保存综合评价档案。
-- 执行顺序：schema.sql / crm_schema.sql 之后执行。
-- 可重复执行。

begin;

-- 当前请求是否拥有 active 业务身份。
-- 综合评价迁移自带这些最小权限函数，兼容尚未执行 emergency_security_patch.sql 的生产库。
create or replace function public.has_active_profile()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
  );
$$;

create or replace function public.crm_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text in ('admin', 'manager')
      and p.status = 'active'
  );
$$;

create or replace function public.crm_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select p.role::text
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
    limit 1
  ), '');
$$;

create or replace function public.crm_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.crm_role() in (
    'admin', 'manager', 'sales', 'planner', 'consultant',
    'assistant', 'reviewer', 'finance', 'observer'
  );
$$;

-- 与志愿填报、升学咨询复用同一套学生访问关系。
create or replace function public.can_manage_student(target_student_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean := false;
begin
  if not public.has_active_profile() then
    return false;
  end if;

  if public.crm_is_manager() then
    return true;
  end if;

  select exists (
    select 1
    from public.students s
    where s.id = target_student_id
      and auth.uid() in (s.owner_id, s.planner_id)
  ) into allowed;

  if allowed or not public.crm_is_staff() then
    return allowed;
  end if;

  -- 兼容仅部署了学生档案、尚未部署完整 CRM 表的环境。
  if to_regclass('public.crm_orders') is not null then
    execute $query$
      select exists (
        select 1
        from public.crm_orders o
        where o.student_id = $1
          and o.sales_owner_id = auth.uid()
      )
    $query$ into allowed using target_student_id;
    if allowed then
      return true;
    end if;
  end if;

  if to_regclass('public.crm_assignments') is not null then
    execute $query$
      select exists (
        select 1
        from public.crm_assignments a
        where a.student_id = $1
          and auth.uid() in (
            a.main_consultant_id,
            a.assistant_id,
            a.reviewer_id,
            a.sales_owner_id
          )
      )
    $query$ into allowed using target_student_id;
  end if;

  return allowed;
end;
$$;

create table if not exists public.student_comprehensive_records (
  student_id uuid primary key references public.students(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  photo_data text,
  identity_confirmed boolean not null default false,
  identity_confirmed_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists student_comprehensive_records_set_updated_at
on public.student_comprehensive_records;
create trigger student_comprehensive_records_set_updated_at
before update on public.student_comprehensive_records
for each row execute function public.set_updated_at();

alter table public.student_comprehensive_records enable row level security;

drop policy if exists "student_comprehensive_records_access"
on public.student_comprehensive_records;
create policy "student_comprehensive_records_access"
on public.student_comprehensive_records for all
using (public.can_manage_student(student_id))
with check (
  public.can_manage_student(student_id)
  and (updated_by is null or updated_by = auth.uid())
);

-- 综合评价保存入口：原子保存完整资料，并把核心字段回写 students 主档。
create or replace function public.save_student_comprehensive(
  p_student_id uuid,
  p_payload jsonb,
  p_photo_data text default null,
  p_identity_confirmed boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  basic jsonb;
  school jsonb;
  selected_scores jsonb;
  saved public.student_comprehensive_records%rowtype;
begin
  if auth.uid() is null or not public.can_manage_student(p_student_id) then
    raise exception using errcode = '42501', message = 'Permission denied for this student.';
  end if;
  if coalesce(jsonb_typeof(p_payload), '') <> 'object' then
    raise exception using errcode = '22023', message = 'Comprehensive payload must be a JSON object.';
  end if;
  if p_photo_data is not null and length(p_photo_data) > 3000000 then
    raise exception using errcode = '22023', message = 'Photo data exceeds the 3 MB limit.';
  end if;

  basic := coalesce(p_payload->'basic', '{}'::jsonb);
  school := coalesce(p_payload->'school', '{}'::jsonb);
  selected_scores := coalesce(p_payload->'selectedScores', '{}'::jsonb);

  insert into public.student_comprehensive_records (
    student_id, payload, photo_data, identity_confirmed,
    identity_confirmed_at, updated_by
  )
  values (
    p_student_id,
    p_payload,
    p_photo_data,
    p_identity_confirmed,
    case when p_identity_confirmed then now() else null end,
    auth.uid()
  )
  on conflict (student_id) do update
  set payload = excluded.payload,
      photo_data = excluded.photo_data,
      identity_confirmed = excluded.identity_confirmed,
      identity_confirmed_at = case
        when excluded.identity_confirmed
          then coalesce(public.student_comprehensive_records.identity_confirmed_at, now())
        else null
      end,
      updated_by = auth.uid(),
      updated_at = now()
  returning * into saved;

  update public.students
  set name = coalesce(nullif(btrim(basic->>'name'), ''), name),
      phone = coalesce(nullif(regexp_replace(basic->>'phone', '\D', '', 'g'), ''), phone),
      gender = case when basic->>'gender' in ('男', '女', '未知') then basic->>'gender' else gender end,
      high_school = coalesce(nullif(btrim(school->>'currentSchool'), ''), high_school),
      mock_scores = coalesce(p_payload->'mockScores', mock_scores),
      politics_score = case when selected_scores->>'思想政治' ~ '^[0-9]+$' then (selected_scores->>'思想政治')::integer else politics_score end,
      history_score = case when selected_scores->>'历史' ~ '^[0-9]+$' then (selected_scores->>'历史')::integer else history_score end,
      geography_score = case when selected_scores->>'地理' ~ '^[0-9]+$' then (selected_scores->>'地理')::integer else geography_score end,
      physics_score = case when selected_scores->>'物理' ~ '^[0-9]+$' then (selected_scores->>'物理')::integer else physics_score end,
      chemistry_score = case when selected_scores->>'化学' ~ '^[0-9]+$' then (selected_scores->>'化学')::integer else chemistry_score end,
      biology_score = case when selected_scores->>'生物' ~ '^[0-9]+$' then (selected_scores->>'生物')::integer else biology_score end,
      english_score = case when selected_scores->>'外语' ~ '^[0-9]+$' then (selected_scores->>'外语')::integer else english_score end,
      comprehensive_eval_status = '资料已同步',
      intake_payload = coalesce(intake_payload, '{}'::jsonb)
        || jsonb_build_object('comprehensive_eval', p_payload),
      updated_at = now()
  where id = p_student_id;

  return to_jsonb(saved);
end;
$$;

grant execute on function public.save_student_comprehensive(uuid, jsonb, text, boolean) to authenticated;

commit;
