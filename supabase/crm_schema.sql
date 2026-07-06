-- 好生涯志愿填报服务 CRM 平台 MVP 数据结构
-- 用法：Supabase Dashboard -> SQL Editor -> 粘贴执行。
-- 依赖：已执行 supabase/schema.sql，存在 profiles、students、audit_logs、set_updated_at()。

create extension if not exists pgcrypto;

alter type public.user_role add value if not exists 'manager';
alter type public.user_role add value if not exists 'sales';
alter type public.user_role add value if not exists 'assistant';
alter type public.user_role add value if not exists 'reviewer';
alter type public.user_role add value if not exists 'finance';
alter type public.user_role add value if not exists 'observer';

alter table if exists public.students
add column if not exists city text,
add column if not exists high_school text,
add column if not exists grade text,
add column if not exists candidate_type text,
add column if not exists first_subject text,
add column if not exists subject_choices text[] not null default '{}',
add column if not exists second_subjects text[] not null default '{}',
add column if not exists class_type text,
add column if not exists gaokao_score integer,
add column if not exists gaokao_rank integer,
add column if not exists estimated_score integer,
add column if not exists estimated_rank integer,
add column if not exists chinese_score integer,
add column if not exists math_score integer,
add column if not exists english_score integer,
add column if not exists physics_score integer,
add column if not exists history_score integer,
add column if not exists chemistry_score integer,
add column if not exists biology_score integer,
add column if not exists politics_score integer,
add column if not exists geography_score integer,
add column if not exists mock_scores jsonb not null default '[]'::jsonb,
add column if not exists color_blind text,
add column if not exists color_weak text,
add column if not exists monocular_color_recognition_issue text,
add column if not exists vision_left text,
add column if not exists vision_right text,
add column if not exists corrected_vision text,
add column if not exists height_cm integer,
add column if not exists weight_kg integer,
add column if not exists physical_limit_codes text[] not null default '{}',
add column if not exists medical_remark text,
add column if not exists region_preference text,
add column if not exists school_level_preference text,
add column if not exists major_preference text,
add column if not exists major_graylist text,
add column if not exists major_blacklist text,
add column if not exists accept_adjustment text,
add column if not exists accept_sino_foreign text,
add column if not exists annual_budget numeric,
add column if not exists out_of_province_willingness text,
add column if not exists postgraduate_intention text,
add column if not exists employment_preference text,
add column if not exists comprehensive_eval_status text,
add column if not exists strong_base_status text,
add column if not exists early_batch_interest text,
add column if not exists university_special_plan text,
add column if not exists local_special_plan text,
add column if not exists rural_special_qualification text,
add column if not exists art_sports_status text,
add column if not exists parent_demand text,
add column if not exists student_demand text,
add column if not exists decision_maker text,
add column if not exists family_resources text,
add column if not exists conflict_points text,
add column if not exists risk_tolerance text,
add column if not exists consultant_remark text,
add column if not exists supervisor_remark text,
add column if not exists crm_external_id text;

do $$
begin
  if to_regclass('public.students') is null then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'score'
  ) then
    execute 'update public.students set gaokao_score = coalesce(gaokao_score, score) where gaokao_score is null and score is not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'rank'
  ) then
    execute 'update public.students set gaokao_rank = coalesce(gaokao_rank, rank) where gaokao_rank is null and rank is not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'subject_type'
  ) then
    execute $sql$
      update public.students
      set first_subject = coalesce(first_subject, case when subject_type::text = 'history' then '历史' else '物理' end),
          class_type = coalesce(class_type, case when subject_type::text = 'history' then '历史类' else '物理类' end)
      where first_subject is null or class_type is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'subject_choices'
  ) then
    execute $sql$
      update public.students
      set second_subjects = subject_choices
      where coalesce(array_length(second_subjects, 1), 0) = 0
        and coalesce(array_length(subject_choices, 1), 0) > 0
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'subject_choices'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'second_subjects'
  ) then
    execute $sql$
      update public.students
      set subject_choices = second_subjects
      where coalesce(array_length(subject_choices, 1), 0) = 0
        and coalesce(array_length(second_subjects, 1), 0) > 0
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'medical_codes'
  ) then
    execute $sql$
      update public.students
      set physical_limit_codes = medical_codes
      where coalesce(array_length(physical_limit_codes, 1), 0) = 0
        and coalesce(array_length(medical_codes, 1), 0) > 0
    $sql$;
  end if;
end $$;

create or replace function public.crm_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role::text in ('admin','manager')
      and status = 'active'
  );
$$;

create or replace function public.crm_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role::text from public.profiles
    where id = auth.uid() and status = 'active'
    limit 1
  ), '');
$$;

create or replace function public.crm_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.crm_role() in ('admin','manager','sales','planner','consultant','assistant','reviewer','finance','observer');
$$;

create or replace function public.is_consultant_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin','manager','consultant','planner','sales','assistant','reviewer','finance','observer')
      and status = 'active'
  );
$$;

create sequence if not exists public.crm_order_no_seq start 1;

create table if not exists public.crm_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  relation_to_student text,
  mobile text,
  wechat text,
  email text,
  city text,
  source text,
  sales_owner_id uuid references auth.users(id) on delete set null,
  remark text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique,
  customer_id uuid references public.crm_customers(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  service_type text[] not null default '{}',
  amount_total numeric not null default 0,
  amount_paid numeric not null default 0,
  payment_status text not null default '未付款',
  order_status text not null default '待确认',
  contract_status text not null default '未签',
  source text,
  sales_owner_id uuid references auth.users(id) on delete set null,
  order_date date not null default current_date,
  service_deadline date,
  remark text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.crm_assign_order_no()
returns trigger
language plpgsql
as $$
begin
  if new.order_no is null or btrim(new.order_no) = '' then
    new.order_no := 'CRM-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.crm_order_no_seq')::text, 4, '0');
  end if;
  if new.sales_owner_id is null then
    new.sales_owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists crm_orders_assign_order_no on public.crm_orders;
create trigger crm_orders_assign_order_no
before insert on public.crm_orders
for each row execute function public.crm_assign_order_no();

create table if not exists public.crm_service_cases (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.crm_orders(id) on delete set null,
  student_id uuid not null references public.students(id) on delete cascade,
  service_type text not null default '普通批志愿填报',
  service_status text not null default '待分配',
  priority text not null default '中',
  risk_level text not null default '低',
  start_date date not null default current_date,
  deadline date,
  completed_at timestamptz,
  archived_at timestamptz,
  external_id text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_assignments (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid not null references public.crm_service_cases(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  main_consultant_id uuid references auth.users(id) on delete set null,
  assistant_id uuid references auth.users(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,
  sales_owner_id uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null default auth.uid(),
  assignment_status text not null default '未分配',
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid references public.crm_service_cases(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references auth.users(id) on delete set null,
  priority text not null default '中',
  task_status text not null default '未开始',
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_communications (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid references public.crm_service_cases(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  communication_time timestamptz not null default now(),
  communication_type text not null default '微信',
  participant text,
  topic text,
  content text,
  parent_opinion text,
  student_opinion text,
  risk_notice text,
  next_action text,
  is_key boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_file_attachments (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid references public.crm_service_cases(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  file_name text not null,
  file_type text not null default '其他',
  file_url text,
  file_path text,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  remark text,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.crm_plan_versions (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid references public.crm_service_cases(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  plan_name text not null,
  version_no text not null default 'V1',
  plan_type text not null default '普通批方案',
  file_id uuid references public.crm_file_attachments(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  reviewed_by uuid references auth.users(id) on delete set null,
  review_status text not null default '未提交',
  parent_confirm_status text not null default '未确认',
  change_log text,
  is_locked boolean not null default false,
  locked_at timestamptz,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_risk_items (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid references public.crm_service_cases(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  risk_type text not null default '其他',
  risk_level text not null default '中',
  batch_type text,
  related_school text,
  related_major_group text,
  evidence_source text not null default '待核对',
  evidence_detail text,
  suggestion text,
  notice_to_parent boolean not null default false,
  confirmation_record text,
  risk_status text not null default '未处理',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_admission_results (
  id uuid primary key default gen_random_uuid(),
  service_case_id uuid references public.crm_service_cases(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  admitted_school text,
  admitted_major text,
  admitted_batch text,
  admission_status text not null default '待回收',
  result_source text,
  remark text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists crm_customers_sales_idx on public.crm_customers(sales_owner_id, created_at desc);
create index if not exists crm_orders_customer_idx on public.crm_orders(customer_id);
create index if not exists crm_orders_student_idx on public.crm_orders(student_id);
create index if not exists crm_orders_sales_idx on public.crm_orders(sales_owner_id, created_at desc);
create index if not exists crm_cases_student_idx on public.crm_service_cases(student_id, updated_at desc);
create index if not exists crm_cases_status_idx on public.crm_service_cases(service_status, deadline);
create index if not exists crm_assignments_case_idx on public.crm_assignments(service_case_id);
create index if not exists crm_assignments_main_idx on public.crm_assignments(main_consultant_id);
create index if not exists crm_tasks_student_idx on public.crm_tasks(student_id, due_at);
create index if not exists crm_tasks_owner_idx on public.crm_tasks(owner_id, task_status, due_at);
create index if not exists crm_communications_student_idx on public.crm_communications(student_id, communication_time desc);
create index if not exists crm_risks_student_idx on public.crm_risk_items(student_id, risk_level, risk_status);
create index if not exists crm_plans_student_idx on public.crm_plan_versions(student_id, created_at desc);
create index if not exists crm_files_student_idx on public.crm_file_attachments(student_id, uploaded_at desc);
create index if not exists crm_audit_entity_idx on public.crm_audit_logs(entity_type, entity_id, created_at desc);

drop trigger if exists crm_customers_set_updated_at on public.crm_customers;
create trigger crm_customers_set_updated_at before update on public.crm_customers for each row execute function public.set_updated_at();
drop trigger if exists crm_orders_set_updated_at on public.crm_orders;
create trigger crm_orders_set_updated_at before update on public.crm_orders for each row execute function public.set_updated_at();
drop trigger if exists crm_cases_set_updated_at on public.crm_service_cases;
create trigger crm_cases_set_updated_at before update on public.crm_service_cases for each row execute function public.set_updated_at();
drop trigger if exists crm_assignments_set_updated_at on public.crm_assignments;
create trigger crm_assignments_set_updated_at before update on public.crm_assignments for each row execute function public.set_updated_at();
drop trigger if exists crm_tasks_set_updated_at on public.crm_tasks;
create trigger crm_tasks_set_updated_at before update on public.crm_tasks for each row execute function public.set_updated_at();
drop trigger if exists crm_communications_set_updated_at on public.crm_communications;
create trigger crm_communications_set_updated_at before update on public.crm_communications for each row execute function public.set_updated_at();
drop trigger if exists crm_plans_set_updated_at on public.crm_plan_versions;
create trigger crm_plans_set_updated_at before update on public.crm_plan_versions for each row execute function public.set_updated_at();
drop trigger if exists crm_risks_set_updated_at on public.crm_risk_items;
create trigger crm_risks_set_updated_at before update on public.crm_risk_items for each row execute function public.set_updated_at();
drop trigger if exists crm_results_set_updated_at on public.crm_admission_results;
create trigger crm_results_set_updated_at before update on public.crm_admission_results for each row execute function public.set_updated_at();

create or replace function public.crm_can_view_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.crm_is_manager()
    or exists (
      select 1 from public.students s
      where s.id = target_student_id
        and (s.owner_id = auth.uid() or s.planner_id = auth.uid())
    )
    or exists (
      select 1 from public.crm_orders o
      where o.student_id = target_student_id and o.sales_owner_id = auth.uid()
    )
    or exists (
      select 1 from public.crm_assignments a
      where a.student_id = target_student_id
        and auth.uid() in (a.main_consultant_id, a.assistant_id, a.reviewer_id, a.sales_owner_id)
    );
$$;

create or replace function public.crm_can_manage_case(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.crm_is_manager()
    or exists (
      select 1 from public.crm_service_cases c
      where c.id = target_case_id
        and public.crm_can_view_student(c.student_id)
    );
$$;

create or replace function public.crm_create_default_tasks(target_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_case public.crm_service_cases%rowtype;
  item text;
  task_names text[] := array[
    '收集成绩位次',
    '收集体检信息',
    '确认地域偏好',
    '确认专业偏好',
    '完成初筛',
    '完成方案初版',
    '完成复核',
    '完成家长沟通',
    '完成最终版',
    '确认填报完成'
  ];
begin
  select * into target_case from public.crm_service_cases where id = target_case_id;
  if target_case.id is null then
    raise exception 'Service case not found.';
  end if;
  if not public.crm_can_manage_case(target_case_id) then
    raise exception 'Permission denied.';
  end if;
  foreach item in array task_names loop
    insert into public.crm_tasks (service_case_id, student_id, title, owner_id, created_by)
    values (target_case.id, target_case.student_id, item, auth.uid(), auth.uid())
    on conflict do nothing;
  end loop;
end;
$$;

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

drop policy if exists "crm_customers_staff_select" on public.crm_customers;
create policy "crm_customers_staff_select" on public.crm_customers for select
using (public.crm_is_manager() or sales_owner_id = auth.uid() or created_by = auth.uid());
drop policy if exists "crm_customers_staff_insert" on public.crm_customers;
create policy "crm_customers_staff_insert" on public.crm_customers for insert
with check (public.crm_is_staff() and coalesce(sales_owner_id, auth.uid()) = auth.uid() or public.crm_is_manager());
drop policy if exists "crm_customers_staff_update" on public.crm_customers;
create policy "crm_customers_staff_update" on public.crm_customers for update
using (public.crm_is_manager() or sales_owner_id = auth.uid() or created_by = auth.uid())
with check (public.crm_is_manager() or sales_owner_id = auth.uid() or created_by = auth.uid());

drop policy if exists "crm_orders_staff_all" on public.crm_orders;
create policy "crm_orders_staff_all" on public.crm_orders for all
using (public.crm_is_manager() or sales_owner_id = auth.uid() or created_by = auth.uid() or public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and (public.crm_is_manager() or coalesce(sales_owner_id, auth.uid()) = auth.uid() or public.crm_can_view_student(student_id)));

drop policy if exists "crm_cases_staff_all" on public.crm_service_cases;
create policy "crm_cases_staff_all" on public.crm_service_cases for all
using (public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and public.crm_can_view_student(student_id));

drop policy if exists "crm_assignments_staff_all" on public.crm_assignments;
create policy "crm_assignments_staff_all" on public.crm_assignments for all
using (public.crm_is_manager() or auth.uid() in (main_consultant_id, assistant_id, reviewer_id, sales_owner_id, assigned_by) or public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and (public.crm_is_manager() or public.crm_can_view_student(student_id)));

drop policy if exists "crm_tasks_staff_all" on public.crm_tasks;
create policy "crm_tasks_staff_all" on public.crm_tasks for all
using (public.crm_can_view_student(student_id) or owner_id = auth.uid() or created_by = auth.uid())
with check (public.crm_is_staff() and (public.crm_can_view_student(student_id) or owner_id = auth.uid() or created_by = auth.uid()));

drop policy if exists "crm_communications_staff_all" on public.crm_communications;
create policy "crm_communications_staff_all" on public.crm_communications for all
using (public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and public.crm_can_view_student(student_id));

drop policy if exists "crm_files_staff_all" on public.crm_file_attachments;
create policy "crm_files_staff_all" on public.crm_file_attachments for all
using (student_id is null or public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and (student_id is null or public.crm_can_view_student(student_id)));

drop policy if exists "crm_plans_staff_all" on public.crm_plan_versions;
create policy "crm_plans_staff_all" on public.crm_plan_versions for all
using (public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and public.crm_can_view_student(student_id));

drop policy if exists "crm_risks_staff_all" on public.crm_risk_items;
create policy "crm_risks_staff_all" on public.crm_risk_items for all
using (public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and public.crm_can_view_student(student_id));

drop policy if exists "crm_results_staff_all" on public.crm_admission_results;
create policy "crm_results_staff_all" on public.crm_admission_results for all
using (public.crm_can_view_student(student_id))
with check (public.crm_is_staff() and public.crm_can_view_student(student_id));

drop policy if exists "crm_audit_staff_insert" on public.crm_audit_logs;
create policy "crm_audit_staff_insert" on public.crm_audit_logs for insert
with check (public.crm_is_staff() and user_id = auth.uid());
drop policy if exists "crm_audit_manager_select" on public.crm_audit_logs;
create policy "crm_audit_manager_select" on public.crm_audit_logs for select
using (public.crm_is_manager());

insert into storage.buckets (id, name, public)
values ('crm-files', 'crm-files', false)
on conflict (id) do nothing;

create or replace function public.crm_can_manage_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  with parts as (select storage.foldername(object_name) as segs)
  select public.crm_is_staff()
    and (
      public.crm_is_manager()
      or exists (
        select 1 from parts, public.students s
        where parts.segs[1] = 'students'
          and parts.segs[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and s.id::text = parts.segs[2]
          and public.crm_can_view_student(s.id)
      )
    );
$$;

drop policy if exists "crm_files_storage_read" on storage.objects;
create policy "crm_files_storage_read" on storage.objects for select
using (bucket_id = 'crm-files' and public.crm_can_manage_storage_object(name));

drop policy if exists "crm_files_storage_insert" on storage.objects;
create policy "crm_files_storage_insert" on storage.objects for insert
with check (bucket_id = 'crm-files' and public.crm_can_manage_storage_object(name));

drop policy if exists "crm_files_storage_update" on storage.objects;
create policy "crm_files_storage_update" on storage.objects for update
using (bucket_id = 'crm-files' and public.crm_can_manage_storage_object(name))
with check (bucket_id = 'crm-files' and public.crm_can_manage_storage_object(name));

drop policy if exists "crm_files_storage_delete" on storage.objects;
create policy "crm_files_storage_delete" on storage.objects for delete
using (bucket_id = 'crm-files' and public.crm_can_manage_storage_object(name));

notify pgrst, 'reload schema';
