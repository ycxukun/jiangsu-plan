-- 江苏志愿填报系统数据库结构
-- 适用：Supabase PostgreSQL
-- 用法：Supabase Dashboard -> SQL Editor -> 粘贴整份执行

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('admin', 'consultant', 'viewer');
exception when duplicate_object then null;
end $$;

alter type public.user_role add value if not exists 'planner';

do $$
begin
  create type public.student_stage as enum ('undergraduate', 'specialty');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.subject_type as enum ('physics', 'history');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.volunteer_status as enum ('draft', 'final', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.strategy_type as enum ('冲', '稳', '保', '垫', '待定');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create sequence if not exists public.student_no_seq start 1;

-- 登录账号由 Supabase Auth 管理。
-- 这里不保存明文密码，只保存业务侧用户资料和权限。
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.user_role not null default 'consultant',
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
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
      and role = 'admin'
      and status = 'active'
  );
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
      and role::text in ('admin', 'consultant', 'planner')
      and status = 'active'
  );
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 学生档案：一个登录用户可以管理多个学生。
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  planner_id uuid references auth.users(id) on delete set null,
  student_no text,
  name text not null,
  phone text,
  gender text check (gender in ('男', '女', '未知')) default '未知',
  province text not null default '江苏',
  stage public.student_stage not null default 'undergraduate',
  subject_type public.subject_type not null default 'physics',
  subject_choices text[] not null default '{}',
  score integer check (score between 0 and 750),
  rank integer check (rank >= 0),
  target_cities text[] not null default '{}',
  target_majors text[] not null default '{}',
  medical_codes text[] not null default '{}',
  intake_payload jsonb not null default '{}'::jsonb,
  note text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.students
add column if not exists subject_choices text[] not null default '{}';

alter table if exists public.students
add column if not exists planner_id uuid references auth.users(id) on delete set null;

alter table if exists public.students
add column if not exists student_no text;

alter table if exists public.students
add column if not exists intake_payload jsonb not null default '{}'::jsonb;

update public.students
set planner_id = owner_id
where planner_id is null;

with numbered_students as (
  select id, row_number() over (order by created_at, id) as rn
  from public.students
  where student_no is null or student_no = ''
)
update public.students s
set student_no = lpad(numbered_students.rn::text, 5, '0')
from numbered_students
where s.id = numbered_students.id;

select setval(
  'public.student_no_seq',
  greatest(
    coalesce((select max(student_no::integer) from public.students where student_no ~ '^[0-9]+$'), 0) + 1,
    1
  ),
  false
);

create or replace function public.assign_student_identity()
returns trigger
language plpgsql
as $$
begin
  if new.planner_id is null then
    new.planner_id := new.owner_id;
  end if;
  if new.student_no is null or btrim(new.student_no) = '' then
    loop
      new.student_no := lpad(nextval('public.student_no_seq')::text, 5, '0');
      exit when not exists (select 1 from public.students where student_no = new.student_no);
    end loop;
  end if;
  return new;
end;
$$;

create index if not exists students_owner_idx on public.students(owner_id);
create index if not exists students_planner_idx on public.students(planner_id);
create index if not exists students_owner_stage_idx on public.students(owner_id, stage);
create index if not exists students_owner_created_idx on public.students(owner_id, created_at desc);
create unique index if not exists students_student_no_uidx on public.students(student_no);

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists students_assign_identity on public.students;
create trigger students_assign_identity
before insert on public.students
for each row execute function public.assign_student_identity();

-- 志愿表主表：每个学生可以有多张草稿/终稿。
create table if not exists public.volunteer_forms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '默认志愿表',
  stage public.student_stage not null default 'undergraduate',
  status public.volunteer_status not null default 'draft',
  source_version text,
  max_group_count integer not null default 40 check (max_group_count > 0),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz
);

create index if not exists volunteer_forms_student_idx on public.volunteer_forms(student_id);
create index if not exists volunteer_forms_owner_idx on public.volunteer_forms(owner_id);
create index if not exists volunteer_forms_owner_updated_idx on public.volunteer_forms(owner_id, updated_at desc);

drop trigger if exists volunteer_forms_set_updated_at on public.volunteer_forms;
create trigger volunteer_forms_set_updated_at
before update on public.volunteer_forms
for each row execute function public.set_updated_at();

-- 志愿表里的院校专业组。
-- group_key 对应你当前前端的 keyGroup(s,g)：subject|batch|schoolName|groupName。
create table if not exists public.volunteer_form_groups (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.volunteer_forms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position between 1 and 80),
  group_key text not null,
  school_name text not null,
  school_code text,
  province text,
  city text,
  batch text,
  subject text,
  group_name text not null,
  group_code text,
  group_alias text,
  requirement text,
  plan26 integer,
  plan25 integer,
  score25 numeric,
  rank25 integer,
  avg_score3 numeric,
  avg_rank3 integer,
  strategy public.strategy_type not null default '待定',
  obey_adjustment boolean not null default true,
  note text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, position),
  unique (form_id, group_key)
);

create index if not exists volunteer_form_groups_form_idx on public.volunteer_form_groups(form_id);
create index if not exists volunteer_form_groups_owner_idx on public.volunteer_form_groups(owner_id);
create index if not exists volunteer_form_groups_group_key_idx on public.volunteer_form_groups(group_key);

drop trigger if exists volunteer_form_groups_set_updated_at on public.volunteer_form_groups;
create trigger volunteer_form_groups_set_updated_at
before update on public.volunteer_form_groups
for each row execute function public.set_updated_at();

-- 每个专业组里选择的 1-6 个专业志愿。
-- major_key 对应你当前前端专业对象的 m.key。
create table if not exists public.volunteer_form_majors (
  id uuid primary key default gen_random_uuid(),
  form_group_id uuid not null references public.volunteer_form_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position between 1 and 6),
  major_key text not null,
  major_code text,
  major_name text not null,
  major_class text,
  discipline text,
  plan26 integer,
  plan25 integer,
  score25 numeric,
  rank25 integer,
  avg_score3 numeric,
  avg_rank3 integer,
  risk_label text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_group_id, position),
  unique (form_group_id, major_key)
);

create index if not exists volunteer_form_majors_group_idx on public.volunteer_form_majors(form_group_id);
create index if not exists volunteer_form_majors_owner_idx on public.volunteer_form_majors(owner_id);
create index if not exists volunteer_form_majors_major_key_idx on public.volunteer_form_majors(major_key);

drop trigger if exists volunteer_form_majors_set_updated_at on public.volunteer_form_majors;
create trigger volunteer_form_majors_set_updated_at
before update on public.volunteer_form_majors
for each row execute function public.set_updated_at();

-- 导出记录：当前可以继续前端导出 Excel，同时把导出动作留痕。
create table if not exists public.volunteer_exports (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.volunteer_forms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  format text not null default 'xls' check (format in ('xls', 'xlsx', 'csv', 'pdf')),
  file_name text,
  group_count integer not null default 0,
  major_count integer not null default 0,
  exported_at timestamptz not null default now(),
  source_payload jsonb not null default '{}'::jsonb
);

create index if not exists volunteer_exports_form_idx on public.volunteer_exports(form_id);
create index if not exists volunteer_exports_owner_idx on public.volunteer_exports(owner_id, exported_at desc);

-- 兼容你当前 app.js 已经写好的批注接口。
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('schools', 'groups', 'majors')),
  target_key text not null,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, target_key)
);

create index if not exists notes_scope_target_idx on public.notes(scope, target_key);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

-- 关键业务操作审计。
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

-- RLS 权限
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.volunteer_forms enable row level security;
alter table public.volunteer_form_groups enable row level security;
alter table public.volunteer_form_majors enable row level security;
alter table public.volunteer_exports enable row level security;
alter table public.notes enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
with check (id = auth.uid() and role in ('consultant', 'viewer') and status = 'active');

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles for insert
with check (public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (id = auth.uid() and role in ('consultant', 'viewer') and status = 'active')
);

drop policy if exists "students_owner_all" on public.students;
create policy "students_owner_all"
on public.students for all
using (owner_id = auth.uid() or planner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or planner_id = auth.uid() or public.is_admin());

drop policy if exists "volunteer_forms_owner_all" on public.volunteer_forms;
create policy "volunteer_forms_owner_all"
on public.volunteer_forms for all
using (owner_id = auth.uid() or public.is_admin())
with check (
  (owner_id = auth.uid() or public.is_admin())
  and exists (
    select 1 from public.students s
    where s.id = student_id
      and (s.owner_id = owner_id or public.is_admin())
  )
);

drop policy if exists "volunteer_groups_owner_all" on public.volunteer_form_groups;
create policy "volunteer_groups_owner_all"
on public.volunteer_form_groups for all
using (owner_id = auth.uid() or public.is_admin())
with check (
  (owner_id = auth.uid() or public.is_admin())
  and exists (
    select 1 from public.volunteer_forms f
    where f.id = form_id
      and (f.owner_id = owner_id or public.is_admin())
  )
);

drop policy if exists "volunteer_majors_owner_all" on public.volunteer_form_majors;
create policy "volunteer_majors_owner_all"
on public.volunteer_form_majors for all
using (owner_id = auth.uid() or public.is_admin())
with check (
  (owner_id = auth.uid() or public.is_admin())
  and exists (
    select 1
    from public.volunteer_form_groups g
    where g.id = form_group_id
      and (g.owner_id = owner_id or public.is_admin())
  )
);

drop policy if exists "volunteer_exports_owner_insert_select" on public.volunteer_exports;
create policy "volunteer_exports_owner_insert_select"
on public.volunteer_exports for all
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

-- notes 当前前端未登录也会读取，所以允许公开读；写入只允许登录用户。
drop policy if exists "notes_public_read" on public.notes;
create policy "notes_public_read"
on public.notes for select
using (true);

drop policy if exists "notes_auth_write" on public.notes;
create policy "notes_auth_write"
on public.notes for insert
with check (auth.uid() is not null and (created_by = auth.uid() or public.is_admin()));

drop policy if exists "notes_auth_update" on public.notes;
create policy "notes_auth_update"
on public.notes for update
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "notes_auth_delete" on public.notes;
create policy "notes_auth_delete"
on public.notes for delete
using (created_by = auth.uid() or public.is_admin());

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read"
on public.audit_logs for select
using (public.is_admin());

drop policy if exists "audit_logs_auth_insert" on public.audit_logs;
create policy "audit_logs_auth_insert"
on public.audit_logs for insert
with check (actor_id = auth.uid() or public.is_admin());

-- 视图：导出志愿表时常用的扁平结果。
create or replace view public.volunteer_export_rows
with (security_invoker = true)
as
select
  f.id as form_id,
  st.id as student_id,
  st.name as student_name,
  st.score,
  st.rank,
  g.position as group_position,
  g.group_code,
  g.school_name,
  g.group_name,
  g.group_alias,
  g.requirement,
  g.strategy,
  g.obey_adjustment,
  g.note as group_note,
  m.position as major_position,
  m.major_code,
  m.major_name,
  m.major_class,
  m.plan26,
  m.score25,
  m.rank25,
  f.owner_id
from public.volunteer_forms f
join public.students st on st.id = f.student_id
join public.volunteer_form_groups g on g.form_id = f.id
left join public.volunteer_form_majors m on m.form_group_id = g.id
order by g.position, m.position;


-- 升学规划资讯中心：公开图文与多类型文件资料
-- 目标：规划师/管理员上传和删除，所有网络用户可读。公开文件放入 public Storage bucket。
create table if not exists public.planning_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '未分类',
  summary text,
  body text,
  cover_url text,
  file_url text,
  file_path text,
  file_name text,
  mime_type text,
  file_size bigint,
  published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planning_articles_published_idx on public.planning_articles(published, created_at desc);
create index if not exists planning_articles_category_idx on public.planning_articles(category);
create index if not exists planning_articles_created_by_idx on public.planning_articles(created_by, created_at desc);

drop trigger if exists planning_articles_set_updated_at on public.planning_articles;
create trigger planning_articles_set_updated_at
before update on public.planning_articles
for each row execute function public.set_updated_at();

alter table public.planning_articles enable row level security;

drop policy if exists "planning_articles_public_read" on public.planning_articles;
create policy "planning_articles_public_read"
on public.planning_articles for select
using (published = true or created_by = auth.uid() or public.is_admin());

drop policy if exists "planning_articles_auth_insert" on public.planning_articles;
create policy "planning_articles_auth_insert"
on public.planning_articles for insert
with check (public.is_consultant_or_admin() and created_by = auth.uid());

drop policy if exists "planning_articles_owner_update" on public.planning_articles;
create policy "planning_articles_owner_update"
on public.planning_articles for update
using (public.is_consultant_or_admin())
with check (public.is_consultant_or_admin());

drop policy if exists "planning_articles_owner_delete" on public.planning_articles;
create policy "planning_articles_owner_delete"
on public.planning_articles for delete
using (public.is_consultant_or_admin());

-- 升学规划资讯中心：公众号式 Markdown 图文文章
create table if not exists public.planning_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  summary text,
  category text not null default '志愿填报',
  cover_url text,
  content_md text not null default '',
  content_html text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  pinned boolean not null default false,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planning_posts_status_idx on public.planning_posts(status, pinned desc, published_at desc, created_at desc);
create index if not exists planning_posts_category_idx on public.planning_posts(category);
create index if not exists planning_posts_author_idx on public.planning_posts(author_id, updated_at desc);

drop trigger if exists planning_posts_set_updated_at on public.planning_posts;
create trigger planning_posts_set_updated_at
before update on public.planning_posts
for each row execute function public.set_updated_at();

alter table public.planning_posts enable row level security;

drop policy if exists "planning_posts_public_read" on public.planning_posts;
create policy "planning_posts_public_read"
on public.planning_posts for select
using (status = 'published' or author_id = auth.uid() or public.is_consultant_or_admin());

drop policy if exists "planning_posts_planner_insert" on public.planning_posts;
create policy "planning_posts_planner_insert"
on public.planning_posts for insert
with check (public.is_consultant_or_admin() and author_id = auth.uid());

drop policy if exists "planning_posts_planner_update" on public.planning_posts;
create policy "planning_posts_planner_update"
on public.planning_posts for update
using (public.is_consultant_or_admin())
with check (public.is_consultant_or_admin());

drop policy if exists "planning_posts_planner_delete" on public.planning_posts;
create policy "planning_posts_planner_delete"
on public.planning_posts for delete
using (public.is_consultant_or_admin());

-- Supabase Storage 公开文件 bucket。
-- 注意：如果 Dashboard 不允许 SQL 修改 storage.buckets，可在 Storage 页面手动创建 public bucket：planning-public，并将 MIME 类型限制留空或允许常见文件类型。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planning-public', 'planning-public', true, 104857600, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "planning_public_files_read" on storage.objects;
create policy "planning_public_files_read"
on storage.objects for select
using (bucket_id = 'planning-public');

drop policy if exists "planning_auth_files_insert" on storage.objects;
create policy "planning_auth_files_insert"
on storage.objects for insert
with check (bucket_id = 'planning-public' and public.is_consultant_or_admin());

drop policy if exists "planning_owner_files_update" on storage.objects;
create policy "planning_owner_files_update"
on storage.objects for update
using (bucket_id = 'planning-public' and public.is_consultant_or_admin())
with check (bucket_id = 'planning-public' and public.is_consultant_or_admin());

drop policy if exists "planning_owner_files_delete" on storage.objects;
create policy "planning_owner_files_delete"
on storage.objects for delete
using (bucket_id = 'planning-public' and public.is_consultant_or_admin());
