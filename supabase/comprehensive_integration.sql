-- 综合评价正式系统：学生账号绑定、档案同步与权限
-- 执行顺序：schema.sql / crm_schema.sql / emergency_security_patch.sql 之后执行。
-- 可重复执行。

begin;

alter table public.profiles alter column email drop not null;
alter table public.profiles add column if not exists phone text;

alter table public.students
add column if not exists account_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists students_account_user_uidx
on public.students(account_user_id)
where account_user_id is not null;

create index if not exists students_phone_idx on public.students(phone);

-- Phone Auth 用户也需要 active viewer 业务身份，才能参与现有 RLS 权限判断。
create or replace function public.ensure_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, phone, display_name, role, status)
  values (
    new.id,
    nullif(new.email, ''),
    nullif(new.phone, ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.phone, ''),
      nullif(new.email, ''),
      '学生'
    ),
    'viewer',
    'active'
  )
  on conflict (id) do update
  set email = coalesce(excluded.email, public.profiles.email),
      phone = coalesce(excluded.phone, public.profiles.phone),
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists auth_user_ensure_profile on auth.users;
create trigger auth_user_ensure_profile
after insert or update of email, phone, raw_user_meta_data on auth.users
for each row execute function public.ensure_profile_for_auth_user();

insert into public.profiles (id, email, phone, display_name, role, status)
select
  u.id,
  nullif(u.email, ''),
  nullif(u.phone, ''),
  coalesce(
    nullif(u.raw_user_meta_data->>'display_name', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.phone, ''),
    nullif(u.email, ''),
    '学生'
  ),
  'viewer',
  'active'
from auth.users u
on conflict (id) do update
set email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();

-- 把学生本人加入原有的学生访问关系；员工权限规则保持不变。
create or replace function public.can_manage_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_active_profile()
    and (
      public.crm_is_manager()
      or exists (
        select 1
        from public.students s
        where s.id = target_student_id
          and auth.uid() in (s.owner_id, s.planner_id, s.account_user_id)
      )
      or (
        public.crm_is_staff()
        and exists (
          select 1 from public.crm_orders o
          where o.student_id = target_student_id
            and o.sales_owner_id = auth.uid()
        )
      )
      or (
        public.crm_is_staff()
        and exists (
          select 1 from public.crm_assignments a
          where a.student_id = target_student_id
            and auth.uid() in (
              a.main_consultant_id,
              a.assistant_id,
              a.reviewer_id,
              a.sales_owner_id
            )
        )
      )
    );
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

-- 管理员在 Auth 中创建手机号账号后，用此 RPC 把账号绑定到指定学生。
create or replace function public.link_student_account_by_phone(
  p_student_id uuid,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  normalized_phone text;
  target_user auth.users%rowtype;
  saved_student public.students%rowtype;
begin
  if not public.crm_is_manager() then
    raise exception using errcode = '42501', message = 'Only an active admin or manager can link student accounts.';
  end if;

  normalized_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(normalized_phone) = 13 and left(normalized_phone, 2) = '86' then
    normalized_phone := right(normalized_phone, 11);
  end if;
  if normalized_phone !~ '^1[0-9]{10}$' then
    raise exception using errcode = '22023', message = 'A valid mainland China mobile number is required.';
  end if;

  select u.* into target_user
  from auth.users u
  where right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 11) = normalized_phone
  order by u.created_at desc
  limit 1;

  if target_user.id is null then
    raise exception using errcode = 'P0002', message = 'No Supabase Auth user exists for this phone number.';
  end if;

  if exists (
    select 1 from public.students s
    where s.account_user_id = target_user.id and s.id <> p_student_id
  ) then
    raise exception using errcode = '23505', message = 'This account is already linked to another student.';
  end if;

  update public.students
  set account_user_id = target_user.id,
      phone = normalized_phone,
      updated_at = now()
  where id = p_student_id
  returning * into saved_student;

  if saved_student.id is null then
    raise exception using errcode = 'P0002', message = 'Student not found.';
  end if;

  insert into public.profiles (id, email, phone, display_name, role, status)
  values (
    target_user.id,
    nullif(target_user.email, ''),
    nullif(target_user.phone, ''),
    saved_student.name,
    'viewer',
    'active'
  )
  on conflict (id) do update
  set phone = excluded.phone,
      display_name = saved_student.name,
      status = 'active',
      updated_at = now();

  return jsonb_build_object(
    'student_id', saved_student.id,
    'student_no', saved_student.student_no,
    'student_name', saved_student.name,
    'account_user_id', target_user.id,
    'phone', normalized_phone
  );
end;
$$;

-- 学生首次登录时，可用 Auth 中已验证/已创建的手机号自动认领唯一同号档案。
-- 仅匹配完全一致且尚未绑定的一个学生，避免模糊匹配和跨学生认领。
create or replace function public.claim_student_account_by_phone()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user auth.users%rowtype;
  normalized_phone text;
  matched_count integer;
  target_student public.students%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Sign-in is required.';
  end if;

  select u.* into current_user from auth.users u where u.id = auth.uid();
  normalized_phone := regexp_replace(coalesce(current_user.phone, ''), '\D', '', 'g');
  if length(normalized_phone) = 13 and left(normalized_phone, 2) = '86' then
    normalized_phone := right(normalized_phone, 11);
  end if;
  if normalized_phone !~ '^1[0-9]{10}$' then
    raise exception using errcode = '22023', message = 'The signed-in account has no valid mobile number.';
  end if;

  select count(*) into matched_count
  from public.students s
  where regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') = normalized_phone
    and (s.account_user_id is null or s.account_user_id = auth.uid())
    and not s.archived;

  if matched_count <> 1 then
    raise exception using
      errcode = 'P0002',
      message = case when matched_count = 0
        then 'No unbound student archive matches this phone number.'
        else 'Multiple student archives use this phone number; an administrator must bind the account.'
      end;
  end if;

  update public.students s
  set account_user_id = auth.uid(), updated_at = now()
  where regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') = normalized_phone
    and (s.account_user_id is null or s.account_user_id = auth.uid())
    and not s.archived
  returning s.* into target_student;

  insert into public.profiles (id, email, phone, display_name, role, status)
  values (
    current_user.id,
    nullif(current_user.email, ''),
    nullif(current_user.phone, ''),
    target_student.name,
    'viewer',
    'active'
  )
  on conflict (id) do update
  set phone = excluded.phone,
      display_name = target_student.name,
      status = 'active',
      updated_at = now();

  return jsonb_build_object(
    'student_id', target_student.id,
    'student_no', target_student.student_no,
    'student_name', target_student.name,
    'account_user_id', current_user.id,
    'phone', normalized_phone
  );
end;
$$;

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

grant execute on function public.link_student_account_by_phone(uuid, text) to authenticated;
grant execute on function public.claim_student_account_by_phone() to authenticated;
grant execute on function public.save_student_comprehensive(uuid, jsonb, text, boolean) to authenticated;

commit;
