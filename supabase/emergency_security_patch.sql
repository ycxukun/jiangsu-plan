-- 紧急权限收口补丁（必须在 schema.sql、student_archive_schema.sql、
-- student_intake_schema.sql、open_signup_patch.sql、crm_schema.sql 之后执行）。
--
-- 目标：
-- 1. 新注册账号固定为 viewer / active，只能操作自己名下的数据；内部角色由管理员授予。
-- 2. 非管理员不能自行修改 profiles.role / profiles.status。
-- 3. disabled 等非 active 账号立即失去学生与 CRM 数据权限。
-- 4. 学生权限只来自 active admin/manager、owner、planner 或明确 CRM 分配。
-- 5. 非 active admin/manager 不能转移 students.owner_id / students.planner_id。
--
-- 本文件可重复执行。若其他旧 SQL 后续再次执行，请最后重新执行本文件，
-- 以便重新固定最终函数、触发器和 RLS 策略。

begin;

-- 开放注册固定为 viewer/active：可操作自己名下数据，但没有全局员工权限。
-- 不追溯修改已有账号，避免误伤已授权人员。
alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column status set default 'active';

-- 当前请求是否拥有 active 业务身份。
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

create or replace function public.is_admin()
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
      and p.role::text = 'admin'
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

-- 保留规划内容模块所需的编辑身份，但不再把该函数用于全局学生权限。
create or replace function public.is_consultant_or_admin()
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
      and p.role::text in ('admin', 'manager', 'consultant', 'planner')
      and p.status = 'active'
  );
$$;

-- 学生访问来源：
--   * active admin/manager：全局；
--   * active owner/planner：students 上的直接关系；
--   * active CRM staff：订单销售归属或 CRM 分配关系。
-- 不再让所有 consultant/planner/staff 自动拥有全库权限。
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
          and auth.uid() in (s.owner_id, s.planner_id)
      )
      or (
        public.crm_is_staff()
        and exists (
          select 1
          from public.crm_orders o
          where o.student_id = target_student_id
            and o.sales_owner_id = auth.uid()
        )
      )
      or (
        public.crm_is_staff()
        and exists (
          select 1
          from public.crm_assignments a
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

create or replace function public.crm_can_view_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.crm_is_staff()
    and public.can_manage_student(target_student_id);
$$;

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_profile_id = auth.uid()
    or public.crm_is_manager()
    or (
      public.crm_is_staff()
      and exists (
        select 1
        from public.profiles target
        where target.id = target_profile_id
          and target.status = 'active'
          and target.role::text in (
            'admin', 'manager', 'sales', 'planner', 'consultant',
            'assistant', 'reviewer', 'finance', 'observer'
          )
      )
    )
    or (
      public.has_active_profile()
      and exists (
        select 1
        from public.students s
        where (s.owner_id = auth.uid() and s.planner_id = target_profile_id)
           or (s.planner_id = auth.uid() and s.owner_id = target_profile_id)
      )
    );
$$;

create or replace function public.can_manage_volunteer_form(target_form_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.volunteer_forms f
    where f.id = target_form_id
      and public.can_manage_student(f.student_id)
  );
$$;

create or replace function public.can_manage_volunteer_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.volunteer_form_groups g
    where g.id = target_group_id
      and public.can_manage_volunteer_form(g.form_id)
  );
$$;

create or replace function public.can_manage_student_archive_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  with parts as (
    select storage.foldername(object_name) as segs
  )
  select exists (
    select 1
    from parts, public.students s
    where parts.segs[1] = 'students'
      and parts.segs[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and s.id::text = parts.segs[2]
      and public.can_manage_student(s.id)
  );
$$;

create or replace function public.crm_can_manage_case(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.crm_is_manager()
    or (
      public.crm_is_staff()
      and exists (
        select 1
        from public.crm_service_cases c
        where c.id = target_case_id
          and public.crm_can_view_student(c.student_id)
      )
    );
$$;

create or replace function public.crm_can_manage_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  with parts as (
    select storage.foldername(object_name) as segs
  )
  select public.crm_is_staff()
    and (
      public.crm_is_manager()
      or exists (
        select 1
        from parts, public.students s
        where parts.segs[1] = 'students'
          and parts.segs[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and s.id::text = parts.segs[2]
          and public.crm_can_view_student(s.id)
      )
    );
$$;

-- 非管理员只能创建自己的 viewer/active 档案，且不能自行改 role/status。
-- auth.uid() 为 null 时视为 SQL Editor / service-role 维护通道；该通道本身绕过 RLS。
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.id is distinct from auth.uid()
       or new.role::text <> 'viewer'
       or new.status <> 'active' then
      raise exception using
        errcode = '42501',
        message = 'New accounts must start as viewer/active.';
    end if;
  elsif new.role is distinct from old.role
     or new.status is distinct from old.status then
    raise exception using
      errcode = '42501',
      message = 'Only an active administrator can change profile role or status.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
before insert or update on public.profiles
for each row execute function public.guard_profile_privileges();

-- owner/planner 转移只能由 active admin/manager 完成。
-- 新建学生仍要求 owner 为当前用户；初始 planner 可在创建时指定，便于 CRM 收单。
create or replace function public.guard_student_assignment_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
     and not public.crm_is_manager()
     and (
       new.owner_id is distinct from old.owner_id
       or new.planner_id is distinct from old.planner_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'Only an active admin or manager can change student owner/planner assignments.';
  end if;

  return new;
end;
$$;

drop trigger if exists students_guard_assignment_changes on public.students;
create trigger students_guard_assignment_changes
before update of owner_id, planner_id on public.students
for each row execute function public.guard_student_assignment_changes();

-- 原子保存整份志愿表。
-- RPC：public.save_volunteer_form_atomic(p_form jsonb, p_groups jsonb)
-- p_form.id 为空时新建，存在时编辑；p_groups 每项可包含 majors 数组。
-- 新建时 owner_id 固定为 auth.uid()；编辑时保留原 student_id/owner_id。
-- form_id、form_group_id 均由服务端固定，忽略客户端同名字段。
-- SECURITY INVOKER 确保函数内每一步仍受下方 RLS 约束；函数异常会回滚整次调用。
create or replace function public.save_volunteer_form_atomic(
  p_form jsonb,
  p_groups jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target_form_id uuid;
  target_student_id uuid;
  target_title text;
  target_stage public.student_stage;
  target_status public.volunteer_status;
  target_source_version text;
  target_max_group_count integer;
  target_snapshot jsonb;
  target_finalized_at timestamptz;
  existing_form public.volunteer_forms%rowtype;
  saved_form public.volunteer_forms%rowtype;

  group_item jsonb;
  major_item jsonb;
  majors_payload jsonb;
  group_position integer;
  major_position integer;
  group_key_value text;
  major_key_value text;
  strategy_value text;
  new_group_id uuid;

  group_count integer := 0;
  major_count integer := 0;
  seen_group_positions integer[] := '{}'::integer[];
  seen_group_keys text[] := '{}'::text[];
  seen_major_positions integer[];
  seen_major_keys text[];
  saved_group_refs jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.has_active_profile() then
    raise exception using
      errcode = '42501',
      message = 'An active signed-in account is required.';
  end if;

  if coalesce(jsonb_typeof(p_form), '') <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'p_form must be a JSON object.';
  end if;

  if coalesce(jsonb_typeof(p_groups), '') <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'p_groups must be a JSON array.';
  end if;

  target_form_id := nullif(btrim(coalesce(p_form->>'id', '')), '')::uuid;

  if target_form_id is not null then
    if not public.can_manage_volunteer_form(target_form_id) then
      raise exception using
        errcode = '42501',
        message = 'Permission denied for this volunteer form.';
    end if;

    select f.*
    into existing_form
    from public.volunteer_forms f
    where f.id = target_form_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Volunteer form not found.';
    end if;

    -- 已保存志愿表不得通过本 RPC 搬到另一名学生。
    target_student_id := existing_form.student_id;
    target_title := coalesce(
      nullif(btrim(coalesce(p_form->>'title', '')), ''),
      existing_form.title
    );
    target_stage := coalesce(
      nullif(btrim(coalesce(p_form->>'stage', '')), ''),
      existing_form.stage::text
    )::public.student_stage;
    target_status := coalesce(
      nullif(btrim(coalesce(p_form->>'status', '')), ''),
      existing_form.status::text
    )::public.volunteer_status;
    target_source_version := case
      when p_form ? 'source_version' then nullif(p_form->>'source_version', '')
      else existing_form.source_version
    end;
    target_max_group_count := coalesce(
      nullif(btrim(coalesce(p_form->>'max_group_count', '')), '')::integer,
      existing_form.max_group_count
    );
    target_snapshot := case
      when p_form ? 'snapshot' then p_form->'snapshot'
      else existing_form.snapshot
    end;
    target_finalized_at := case
      when p_form ? 'finalized_at'
        then nullif(btrim(coalesce(p_form->>'finalized_at', '')), '')::timestamptz
      else existing_form.finalized_at
    end;
  else
    target_student_id := nullif(
      btrim(coalesce(p_form->>'student_id', '')),
      ''
    )::uuid;
    target_title := coalesce(
      nullif(btrim(coalesce(p_form->>'title', '')), ''),
      '默认志愿表'
    );
    target_stage := coalesce(
      nullif(btrim(coalesce(p_form->>'stage', '')), ''),
      'undergraduate'
    )::public.student_stage;
    target_status := coalesce(
      nullif(btrim(coalesce(p_form->>'status', '')), ''),
      'draft'
    )::public.volunteer_status;
    target_source_version := nullif(p_form->>'source_version', '');
    target_max_group_count := coalesce(
      nullif(btrim(coalesce(p_form->>'max_group_count', '')), '')::integer,
      40
    );
    target_snapshot := coalesce(p_form->'snapshot', '{}'::jsonb);
    target_finalized_at := nullif(
      btrim(coalesce(p_form->>'finalized_at', '')),
      ''
    )::timestamptz;
  end if;

  if target_student_id is null
     or not public.can_manage_student(target_student_id) then
    raise exception using
      errcode = '42501',
      message = 'Permission denied for the target student.';
  end if;

  if target_max_group_count < 1 then
    raise exception using
      errcode = '22023',
      message = 'max_group_count must be greater than zero.';
  end if;

  if coalesce(jsonb_typeof(target_snapshot), '') <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'p_form.snapshot must be a JSON object.';
  end if;

  if target_status::text = 'final' and target_finalized_at is null then
    target_finalized_at := now();
  end if;

  group_count := jsonb_array_length(p_groups);
  if group_count > least(target_max_group_count, 80) then
    raise exception using
      errcode = '22023',
      message = format(
        'Group count %s exceeds the allowed limit %s.',
        group_count,
        least(target_max_group_count, 80)
      );
  end if;

  -- 先完整校验，再执行任何写操作；数据库约束仍作为第二道防线。
  for group_item in
    select value from jsonb_array_elements(p_groups)
  loop
    if coalesce(jsonb_typeof(group_item), '') <> 'object' then
      raise exception using
        errcode = '22023',
        message = 'Every group must be a JSON object.';
    end if;

    group_position := nullif(
      btrim(coalesce(group_item->>'position', '')),
      ''
    )::integer;
    group_key_value := btrim(coalesce(group_item->>'group_key', ''));
    strategy_value := coalesce(
      nullif(btrim(coalesce(group_item->>'strategy', '')), ''),
      '待定'
    );

    if group_position is null or group_position not between 1 and 80 then
      raise exception using
        errcode = '22023',
        message = 'Every group position must be between 1 and 80.';
    end if;
    if group_position = any (seen_group_positions) then
      raise exception using
        errcode = '23505',
        message = format('Duplicate group position: %s.', group_position);
    end if;
    seen_group_positions := array_append(seen_group_positions, group_position);

    if group_key_value = ''
       or btrim(coalesce(group_item->>'school_name', '')) = ''
       or btrim(coalesce(group_item->>'group_name', '')) = '' then
      raise exception using
        errcode = '22023',
        message = 'group_key, school_name and group_name are required.';
    end if;
    if group_key_value = any (seen_group_keys) then
      raise exception using
        errcode = '23505',
        message = format('Duplicate group_key: %s.', group_key_value);
    end if;
    seen_group_keys := array_append(seen_group_keys, group_key_value);

    if strategy_value not in ('冲', '稳', '保', '垫', '待定') then
      raise exception using
        errcode = '22023',
        message = format('Unsupported strategy: %s.', strategy_value);
    end if;

    if group_item ? 'majors'
       and coalesce(jsonb_typeof(group_item->'majors'), '') <> 'array' then
      raise exception using
        errcode = '22023',
        message = format('majors must be an array for group %s.', group_key_value);
    end if;

    majors_payload := case
      when group_item ? 'majors' then group_item->'majors'
      else '[]'::jsonb
    end;

    if jsonb_array_length(majors_payload) > 6 then
      raise exception using
        errcode = '22023',
        message = format('Group %s has more than 6 majors.', group_key_value);
    end if;

    seen_major_positions := '{}'::integer[];
    seen_major_keys := '{}'::text[];
    for major_item in
      select value from jsonb_array_elements(majors_payload)
    loop
      if coalesce(jsonb_typeof(major_item), '') <> 'object' then
        raise exception using
          errcode = '22023',
          message = format('Every major in group %s must be an object.', group_key_value);
      end if;

      major_position := nullif(
        btrim(coalesce(major_item->>'position', '')),
        ''
      )::integer;
      major_key_value := btrim(coalesce(major_item->>'major_key', ''));

      if major_position is null or major_position not between 1 and 6 then
        raise exception using
          errcode = '22023',
          message = format('Major position must be 1-6 in group %s.', group_key_value);
      end if;
      if major_position = any (seen_major_positions) then
        raise exception using
          errcode = '23505',
          message = format(
            'Duplicate major position %s in group %s.',
            major_position,
            group_key_value
          );
      end if;
      seen_major_positions := array_append(seen_major_positions, major_position);

      if major_key_value = ''
         or btrim(coalesce(major_item->>'major_name', '')) = '' then
        raise exception using
          errcode = '22023',
          message = format('major_key and major_name are required in group %s.', group_key_value);
      end if;
      if major_key_value = any (seen_major_keys) then
        raise exception using
          errcode = '23505',
          message = format(
            'Duplicate major_key %s in group %s.',
            major_key_value,
            group_key_value
          );
      end if;
      seen_major_keys := array_append(seen_major_keys, major_key_value);
      major_count := major_count + 1;
    end loop;
  end loop;

  if target_form_id is null then
    insert into public.volunteer_forms (
      student_id,
      owner_id,
      title,
      stage,
      status,
      source_version,
      max_group_count,
      snapshot,
      finalized_at
    )
    values (
      target_student_id,
      auth.uid(),
      target_title,
      target_stage,
      target_status,
      target_source_version,
      target_max_group_count,
      target_snapshot,
      target_finalized_at
    )
    returning * into saved_form;
    target_form_id := saved_form.id;
  else
    update public.volunteer_forms f
    set student_id = target_student_id,
        owner_id = existing_form.owner_id,
        title = target_title,
        stage = target_stage,
        status = target_status,
        source_version = target_source_version,
        max_group_count = target_max_group_count,
        snapshot = target_snapshot,
        finalized_at = target_finalized_at
    where f.id = target_form_id
    returning * into saved_form;

    if not found then
      raise exception using
        errcode = '42501',
        message = 'Volunteer form update was rejected.';
    end if;
  end if;

  -- majors 由外键级联删除；后续任意 insert 失败都会回滚本次 delete 和主表更新。
  delete from public.volunteer_form_groups g
  where g.form_id = target_form_id;

  for group_item in
    select value from jsonb_array_elements(p_groups)
    order by (value->>'position')::integer
  loop
    group_key_value := btrim(group_item->>'group_key');
    strategy_value := coalesce(
      nullif(btrim(coalesce(group_item->>'strategy', '')), ''),
      '待定'
    );

    insert into public.volunteer_form_groups (
      form_id,
      owner_id,
      position,
      group_key,
      school_name,
      school_code,
      province,
      city,
      batch,
      subject,
      group_name,
      group_code,
      group_alias,
      requirement,
      plan26,
      plan25,
      score25,
      rank25,
      avg_score3,
      avg_rank3,
      strategy,
      obey_adjustment,
      note,
      source_payload
    )
    values (
      target_form_id,
      saved_form.owner_id,
      (group_item->>'position')::integer,
      group_key_value,
      btrim(group_item->>'school_name'),
      nullif(group_item->>'school_code', ''),
      nullif(group_item->>'province', ''),
      nullif(group_item->>'city', ''),
      nullif(group_item->>'batch', ''),
      nullif(group_item->>'subject', ''),
      btrim(group_item->>'group_name'),
      nullif(group_item->>'group_code', ''),
      nullif(group_item->>'group_alias', ''),
      nullif(group_item->>'requirement', ''),
      nullif(group_item->>'plan26', '')::integer,
      nullif(group_item->>'plan25', '')::integer,
      nullif(group_item->>'score25', '')::numeric,
      nullif(group_item->>'rank25', '')::integer,
      nullif(group_item->>'avg_score3', '')::numeric,
      nullif(group_item->>'avg_rank3', '')::integer,
      strategy_value::public.strategy_type,
      coalesce(nullif(group_item->>'obey_adjustment', '')::boolean, true),
      nullif(group_item->>'note', ''),
      case
        when jsonb_typeof(group_item->'source_payload') = 'object'
          then group_item->'source_payload'
        else '{}'::jsonb
      end
    )
    returning id into new_group_id;

    saved_group_refs := saved_group_refs || jsonb_build_array(
      jsonb_build_object(
        'id', new_group_id,
        'group_key', group_key_value,
        'position', (group_item->>'position')::integer
      )
    );

    majors_payload := case
      when group_item ? 'majors' then group_item->'majors'
      else '[]'::jsonb
    end;

    for major_item in
      select value from jsonb_array_elements(majors_payload)
      order by (value->>'position')::integer
    loop
      insert into public.volunteer_form_majors (
        form_group_id,
        owner_id,
        position,
        major_key,
        major_code,
        major_name,
        major_class,
        discipline,
        plan26,
        plan25,
        score25,
        rank25,
        avg_score3,
        avg_rank3,
        risk_label,
        source_payload
      )
      values (
        new_group_id,
        saved_form.owner_id,
        (major_item->>'position')::integer,
        btrim(major_item->>'major_key'),
        nullif(major_item->>'major_code', ''),
        btrim(major_item->>'major_name'),
        nullif(major_item->>'major_class', ''),
        nullif(major_item->>'discipline', ''),
        nullif(major_item->>'plan26', '')::integer,
        nullif(major_item->>'plan25', '')::integer,
        nullif(major_item->>'score25', '')::numeric,
        nullif(major_item->>'rank25', '')::integer,
        nullif(major_item->>'avg_score3', '')::numeric,
        nullif(major_item->>'avg_rank3', '')::integer,
        nullif(major_item->>'risk_label', ''),
        case
          when jsonb_typeof(major_item->'source_payload') = 'object'
            then major_item->'source_payload'
          else '{}'::jsonb
        end
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'form', to_jsonb(saved_form),
    'group_count', group_count,
    'major_count', major_count,
    'groups', saved_group_refs
  );
end;
$$;

revoke all on function public.save_volunteer_form_atomic(jsonb, jsonb) from PUBLIC;
grant execute on function public.save_volunteer_form_atomic(jsonb, jsonb) to authenticated;

-- 明确开启 RLS，随后删除这些关键表上的所有旧 permissive 策略，避免 OR 叠加绕过。
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.volunteer_forms enable row level security;
alter table public.volunteer_form_groups enable row level security;
alter table public.volunteer_form_majors enable row level security;
alter table public.volunteer_exports enable row level security;
alter table public.student_archive_files enable row level security;
alter table public.crm_customers enable row level security;
alter table public.crm_orders enable row level security;
alter table public.crm_service_cases enable row level security;
alter table public.crm_assignments enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_communications enable row level security;
alter table public.crm_file_attachments enable row level security;
alter table public.crm_plan_versions enable row level security;
alter table public.crm_risk_items enable row level security;
alter table public.crm_admission_results enable row level security;
alter table public.crm_audit_logs enable row level security;

do $$
declare
  old_policy record;
begin
  for old_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename::text = any (array[
        'profiles',
        'students',
        'volunteer_forms',
        'volunteer_form_groups',
        'volunteer_form_majors',
        'volunteer_exports',
        'student_archive_files',
        'crm_customers',
        'crm_orders',
        'crm_service_cases',
        'crm_assignments',
        'crm_tasks',
        'crm_communications',
        'crm_file_attachments',
        'crm_plan_versions',
        'crm_risk_items',
        'crm_admission_results',
        'crm_audit_logs'
      ]::text[])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      old_policy.policyname,
      old_policy.schemaname,
      old_policy.tablename
    );
  end loop;
end;
$$;

-- profiles：本人可查看/维护普通资料；只有 active admin 可管理他人及授权字段。
create policy "emergency_profiles_select"
on public.profiles for select
using (public.can_view_profile(id));

create policy "emergency_profiles_insert"
on public.profiles for insert
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role::text = 'viewer'
    and status = 'active'
  )
);

create policy "emergency_profiles_update"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- students：读取/编辑来自明确关系；删除主档只允许 manager 或直接 owner/planner。
create policy "emergency_students_select"
on public.students for select
using (public.can_manage_student(id));

create policy "emergency_students_insert"
on public.students for insert
with check (
  public.crm_is_manager()
  or (
    public.has_active_profile()
    and owner_id = auth.uid()
    and (
      planner_id = auth.uid()
      or exists (
        select 1
        from public.profiles planner
        where planner.id = planner_id
          and planner.status = 'active'
          and planner.role::text in ('admin', 'manager', 'planner', 'consultant')
      )
    )
  )
);

create policy "emergency_students_update"
on public.students for update
using (public.can_manage_student(id))
with check (public.can_manage_student(id));

create policy "emergency_students_delete"
on public.students for delete
using (
  public.crm_is_manager()
  or (
    public.has_active_profile()
    and auth.uid() in (owner_id, planner_id)
  )
);

-- 志愿表及学生档案附件跟随学生关系，不再给所有 planner/consultant 全局放行。
create policy "emergency_volunteer_forms_all"
on public.volunteer_forms for all
using (public.can_manage_student(student_id))
with check (public.can_manage_student(student_id));

create policy "emergency_volunteer_groups_all"
on public.volunteer_form_groups for all
using (public.can_manage_volunteer_form(form_id))
with check (public.can_manage_volunteer_form(form_id));

create policy "emergency_volunteer_majors_all"
on public.volunteer_form_majors for all
using (public.can_manage_volunteer_group(form_group_id))
with check (public.can_manage_volunteer_group(form_group_id));

create policy "emergency_volunteer_exports_all"
on public.volunteer_exports for all
using (public.can_manage_volunteer_form(form_id))
with check (public.can_manage_volunteer_form(form_id));

create policy "emergency_student_archive_files_all"
on public.student_archive_files for all
using (public.can_manage_student(student_id))
with check (public.can_manage_student(student_id));

-- CRM：所有 USING（包括 DELETE）均先检查 active staff，disabled 账号立即失权。
create policy "emergency_crm_customers_all"
on public.crm_customers for all
using (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or sales_owner_id = auth.uid()
    or created_by = auth.uid()
  )
)
with check (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or sales_owner_id = auth.uid()
    or created_by = auth.uid()
  )
);

create policy "emergency_crm_orders_all"
on public.crm_orders for all
using (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or sales_owner_id = auth.uid()
    or created_by = auth.uid()
    or (student_id is not null and public.crm_can_view_student(student_id))
  )
)
with check (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or (
      (
        sales_owner_id = auth.uid()
        or created_by = auth.uid()
        or (student_id is not null and public.crm_can_view_student(student_id))
      )
      and (student_id is null or public.crm_can_view_student(student_id))
    )
  )
);

create policy "emergency_crm_cases_all"
on public.crm_service_cases for all
using (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
)
with check (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
);

create policy "emergency_crm_assignments_all"
on public.crm_assignments for all
using (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or auth.uid() in (
      main_consultant_id,
      assistant_id,
      reviewer_id,
      sales_owner_id,
      assigned_by
    )
    or public.crm_can_view_student(student_id)
  )
)
with check (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or public.crm_can_view_student(student_id)
  )
);

create policy "emergency_crm_tasks_all"
on public.crm_tasks for all
using (
  public.crm_is_staff()
  and (
    public.crm_can_view_student(student_id)
    or owner_id = auth.uid()
    or created_by = auth.uid()
  )
)
with check (
  public.crm_is_staff()
  and (
    public.crm_can_view_student(student_id)
    or owner_id = auth.uid()
    or created_by = auth.uid()
  )
);

create policy "emergency_crm_communications_all"
on public.crm_communications for all
using (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
)
with check (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
);

create policy "emergency_crm_files_all"
on public.crm_file_attachments for all
using (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or uploaded_by = auth.uid()
    or (student_id is not null and public.crm_can_view_student(student_id))
  )
)
with check (
  public.crm_is_staff()
  and (
    public.crm_is_manager()
    or uploaded_by = auth.uid()
    or (student_id is not null and public.crm_can_view_student(student_id))
  )
);

create policy "emergency_crm_plans_all"
on public.crm_plan_versions for all
using (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
)
with check (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
);

create policy "emergency_crm_risks_all"
on public.crm_risk_items for all
using (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
)
with check (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
);

create policy "emergency_crm_results_all"
on public.crm_admission_results for all
using (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
)
with check (
  public.crm_is_staff()
  and public.crm_can_view_student(student_id)
);

create policy "emergency_crm_audit_insert"
on public.crm_audit_logs for insert
with check (
  public.crm_is_staff()
  and user_id = auth.uid()
);

create policy "emergency_crm_audit_manager_select"
on public.crm_audit_logs for select
using (public.crm_is_manager());

-- 固定两个私有 bucket 的策略；函数内的 active 检查同时覆盖读取、写入与删除。
drop policy if exists "student_archive_files_read" on storage.objects;
create policy "student_archive_files_read"
on storage.objects for select
using (
  bucket_id = 'student-archives'
  and public.can_manage_student_archive_object(name)
);

drop policy if exists "student_archive_files_insert" on storage.objects;
create policy "student_archive_files_insert"
on storage.objects for insert
with check (
  bucket_id = 'student-archives'
  and public.can_manage_student_archive_object(name)
);

drop policy if exists "student_archive_files_update" on storage.objects;
create policy "student_archive_files_update"
on storage.objects for update
using (
  bucket_id = 'student-archives'
  and public.can_manage_student_archive_object(name)
)
with check (
  bucket_id = 'student-archives'
  and public.can_manage_student_archive_object(name)
);

drop policy if exists "student_archive_files_delete" on storage.objects;
create policy "student_archive_files_delete"
on storage.objects for delete
using (
  bucket_id = 'student-archives'
  and public.can_manage_student_archive_object(name)
);

drop policy if exists "crm_files_storage_read" on storage.objects;
create policy "crm_files_storage_read"
on storage.objects for select
using (
  bucket_id = 'crm-files'
  and public.crm_can_manage_storage_object(name)
);

drop policy if exists "crm_files_storage_insert" on storage.objects;
create policy "crm_files_storage_insert"
on storage.objects for insert
with check (
  bucket_id = 'crm-files'
  and public.crm_can_manage_storage_object(name)
);

drop policy if exists "crm_files_storage_update" on storage.objects;
create policy "crm_files_storage_update"
on storage.objects for update
using (
  bucket_id = 'crm-files'
  and public.crm_can_manage_storage_object(name)
)
with check (
  bucket_id = 'crm-files'
  and public.crm_can_manage_storage_object(name)
);

drop policy if exists "crm_files_storage_delete" on storage.objects;
create policy "crm_files_storage_delete"
on storage.objects for delete
using (
  bucket_id = 'crm-files'
  and public.crm_can_manage_storage_object(name)
);

notify pgrst, 'reload schema';

commit;

-- 执行后人工复核（只读，按需单独运行）：
-- select id, email, role, status from public.profiles order by created_at desc;
-- 对补丁前自由注册得到的 planner/active 账号必须人工确认；本补丁无法可靠区分
-- “管理员正式授权”与“旧开放注册自动提权”，因此不会自动批量降级已有账号。
