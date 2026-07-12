-- 2026 提前批助手：复用主系统登录与当前学生，原子保存提前批工作档案。
-- 执行顺序：schema.sql / student_intake_schema.sql / crm_schema.sql /
-- emergency_security_patch.sql / comprehensive_integration.sql /
-- strong_base_integration.sql 之后执行。
-- 可重复执行。

begin;

-- 主档同步仅使用提前批状态与 intake_payload.early_batch；不会覆盖其他模块。
alter table if exists public.students
  add column if not exists early_batch_status text,
  add column if not exists intake_payload jsonb not null default '{}'::jsonb;

-- 学生档案上传入口新增“提前批”板块；保留既有板块值不变。
alter table if exists public.student_archive_files
  drop constraint if exists student_archive_files_section_check;
alter table if exists public.student_archive_files
  add constraint student_archive_files_section_check
  check (section in (
    'comprehensive_eval', 'strong_base', 'early_batch',
    'awards', 'specialties', 'other'
  ));

create table if not exists public.student_early_batch_records (
  student_id uuid primary key references public.students(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  status text not null default '未开始'
    check (char_length(status) between 1 and 80),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.student_early_batch_records is
  '提前批助手的学生级工作档案；政策、资格与院校专业组规则由版本化静态规则文件提供。';
comment on column public.student_early_batch_records.payload is
  '学生画像、资格核对、决策地图、院校专业组清单、报考节点和备注等 JSON 对象。';

drop trigger if exists student_early_batch_records_set_updated_at
on public.student_early_batch_records;
create trigger student_early_batch_records_set_updated_at
before update on public.student_early_batch_records
for each row execute function public.set_updated_at();

alter table public.student_early_batch_records enable row level security;

drop policy if exists "student_early_batch_records_select"
on public.student_early_batch_records;
create policy "student_early_batch_records_select"
on public.student_early_batch_records for select
using (public.can_manage_student(student_id));

drop policy if exists "student_early_batch_records_insert"
on public.student_early_batch_records;
create policy "student_early_batch_records_insert"
on public.student_early_batch_records for insert
with check (
  public.can_manage_student(student_id)
  and updated_by = auth.uid()
);

drop policy if exists "student_early_batch_records_update"
on public.student_early_batch_records;
create policy "student_early_batch_records_update"
on public.student_early_batch_records for update
using (public.can_manage_student(student_id))
with check (
  public.can_manage_student(student_id)
  and updated_by = auth.uid()
);

-- 前端可读取当前学生档案；写入统一走 RPC，保证主档同步与审计原子完成。
revoke all on table public.student_early_batch_records from public, anon;
revoke insert, update, delete on table public.student_early_batch_records from authenticated;
grant select on table public.student_early_batch_records to authenticated;

drop function if exists public.save_student_early_batch(uuid, text, jsonb);

create or replace function public.save_student_early_batch(
  p_student_id uuid,
  p_status text,
  p_payload jsonb,
  p_expected_updated_at timestamptz default null
)
returns public.student_early_batch_records
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_schema_version text;
  v_existing_updated_at timestamptz;
  v_saved public.student_early_batch_records%rowtype;
begin
  if auth.uid() is null or not public.can_manage_student(p_student_id) then
    raise exception using
      errcode = '42501',
      message = 'Permission denied for this student.';
  end if;

  if coalesce(jsonb_typeof(p_payload), '') <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Early-batch payload must be a JSON object.';
  end if;

  if octet_length(p_payload::text) > 2000000 then
    raise exception using
      errcode = '22023',
      message = 'Early-batch payload exceeds the 2 MB limit.';
  end if;

  -- 同一学生的写入串行化，并用客户端读取到的版本阻止规划师/学生互相静默覆盖。
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  select updated_at
  into v_existing_updated_at
  from public.student_early_batch_records
  where student_id = p_student_id
  for update;

  if v_existing_updated_at is null and p_expected_updated_at is not null then
    raise exception using
      errcode = '40001',
      message = 'Early-batch record changed by another user; reload before saving.';
  end if;

  if v_existing_updated_at is not null and (
    p_expected_updated_at is null
    or v_existing_updated_at <> p_expected_updated_at
  ) then
    raise exception using
      errcode = '40001',
      message = 'Early-batch record changed by another user; reload before saving.';
  end if;

  v_status := coalesce(
    nullif(btrim(p_status), ''),
    nullif(btrim(p_payload #>> '{workflow,status}'), ''),
    nullif(btrim(p_payload ->> 'status'), ''),
    '资料已同步'
  );

  if v_status not in (
    '未开始', '准备中', '资格核验中', '专业组筛选中',
    '待官方核验', '已完成', '资料已同步'
  ) then
    v_status := '资料已同步';
  end if;

  v_schema_version := coalesce(
    p_payload ->> 'schemaVersion',
    p_payload #>> '{meta,schemaVersion}',
    'unspecified'
  );
  if v_schema_version !~ '^[0-9A-Za-z._-]{1,32}$' then
    v_schema_version := 'unspecified';
  end if;

  insert into public.student_early_batch_records (
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

  -- 安全边界：不用提前批表单反向覆盖姓名、手机号、分数、位次等主档字段。
  -- jsonb_set 只替换 intake_payload.early_batch，并保留采集表和其他模块数据。
  update public.students
  set early_batch_status = v_status,
      intake_payload = jsonb_set(
        case
          when jsonb_typeof(intake_payload) = 'object' then intake_payload
          else '{}'::jsonb
        end,
        '{early_batch}',
        p_payload,
        true
      )
  where id = p_student_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Student record was not found.';
  end if;

  -- 审计日志只保留操作元数据，不复制学生成绩、资格结论、目标清单或备注正文。
  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    auth.uid(),
    'save_student_early_batch',
    'student_early_batch_record',
    p_student_id,
    jsonb_build_object(
      'status', v_status,
      'payload_bytes', octet_length(p_payload::text),
      'schema_version', v_schema_version
    )
  );

  return v_saved;
end;
$$;

revoke all on function public.save_student_early_batch(uuid, text, jsonb, timestamptz) from public;
revoke all on function public.save_student_early_batch(uuid, text, jsonb, timestamptz) from anon;
grant execute on function public.save_student_early_batch(uuid, text, jsonb, timestamptz) to authenticated;

commit;
