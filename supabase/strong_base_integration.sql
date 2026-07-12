-- 2026 强基计划助手：复用主系统登录与当前学生，原子保存强基档案。
-- 执行顺序：schema.sql / student_intake_schema.sql / crm_schema.sql /
-- emergency_security_patch.sql / comprehensive_integration.sql 之后执行。
-- 可重复执行。

begin;

-- 主档同步仅使用这两个既有字段；重复执行不会覆盖已有数据。
alter table if exists public.students
  add column if not exists strong_base_status text,
  add column if not exists intake_payload jsonb not null default '{}'::jsonb;

create table if not exists public.student_strong_base_records (
  student_id uuid primary key references public.students(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  status text not null default '未开始'
    check (char_length(status) between 1 and 80),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_strong_base_records is
  '强基计划助手的学生级工作档案；院校规则仍由版本化静态规则文件提供。';
comment on column public.student_strong_base_records.payload is
  '学生画像、择校、进度、简章核对、面试和个人陈述等模块的 JSON 对象。';

drop trigger if exists student_strong_base_records_set_updated_at
on public.student_strong_base_records;
create trigger student_strong_base_records_set_updated_at
before update on public.student_strong_base_records
for each row execute function public.set_updated_at();

alter table public.student_strong_base_records enable row level security;

drop policy if exists "student_strong_base_records_select"
on public.student_strong_base_records;
create policy "student_strong_base_records_select"
on public.student_strong_base_records for select
using (public.can_manage_student(student_id));

drop policy if exists "student_strong_base_records_insert"
on public.student_strong_base_records;
create policy "student_strong_base_records_insert"
on public.student_strong_base_records for insert
with check (
  public.can_manage_student(student_id)
  and updated_by = auth.uid()
);

drop policy if exists "student_strong_base_records_update"
on public.student_strong_base_records;
create policy "student_strong_base_records_update"
on public.student_strong_base_records for update
using (public.can_manage_student(student_id))
with check (
  public.can_manage_student(student_id)
  and updated_by = auth.uid()
);

-- 前端可读取当前学生档案；写入统一走下面的 RPC，以保证主档同步与审计原子完成。
revoke all on table public.student_strong_base_records from public, anon;
revoke insert, update, delete on table public.student_strong_base_records from authenticated;
grant select on table public.student_strong_base_records to authenticated;

create or replace function public.save_student_strong_base(
  p_student_id uuid,
  p_status text,
  p_payload jsonb
)
returns public.student_strong_base_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_saved public.student_strong_base_records%rowtype;
begin
  if auth.uid() is null or not public.can_manage_student(p_student_id) then
    raise exception using
      errcode = '42501',
      message = 'Permission denied for this student.';
  end if;

  if coalesce(jsonb_typeof(p_payload), '') <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Strong-base payload must be a JSON object.';
  end if;

  if octet_length(p_payload::text) > 2000000 then
    raise exception using
      errcode = '22023',
      message = 'Strong-base payload exceeds the 2 MB limit.';
  end if;

  v_status := coalesce(
    nullif(btrim(p_status), ''),
    nullif(btrim(p_payload #>> '{workflow,status}'), ''),
    nullif(btrim(p_payload ->> 'status'), ''),
    '资料已同步'
  );

  if char_length(v_status) > 80 then
    raise exception using
      errcode = '22023',
      message = 'Strong-base status exceeds the 80 character limit.';
  end if;

  insert into public.student_strong_base_records (
    student_id,
    payload,
    status,
    updated_by
  )
  values (
    p_student_id,
    p_payload,
    v_status,
    auth.uid()
  )
  on conflict (student_id) do update
  set payload = excluded.payload,
      status = excluded.status,
      updated_by = auth.uid(),
      updated_at = now()
  returning * into v_saved;

  -- 安全边界：本 RPC 不同步姓名、手机号、分数等学生主档字段。
  -- jsonb_set 只替换 intake_payload.strong_base，并保留其他采集模块的数据。
  update public.students
  set strong_base_status = v_status,
      intake_payload = jsonb_set(
        case
          when jsonb_typeof(intake_payload) = 'object' then intake_payload
          else '{}'::jsonb
        end,
        '{strong_base}',
        p_payload,
        true
      )
  where id = p_student_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Student record was not found.';
  end if;

  -- 只记录操作元数据，不把学生画像、成绩或面试内容复制进审计日志。
  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    auth.uid(),
    'save_student_strong_base',
    'student_strong_base_record',
    p_student_id,
    jsonb_build_object(
      'status', v_status,
      'payload_bytes', octet_length(p_payload::text),
      'schema_version', coalesce(
        p_payload ->> 'schemaVersion',
        p_payload #>> '{meta,schemaVersion}',
        'unspecified'
      )
    )
  );

  return v_saved;
end;
$$;

revoke all on function public.save_student_strong_base(uuid, text, jsonb) from public;
revoke all on function public.save_student_strong_base(uuid, text, jsonb) from anon;
grant execute on function public.save_student_strong_base(uuid, text, jsonb) to authenticated;

commit;
