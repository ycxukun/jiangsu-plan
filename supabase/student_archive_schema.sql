-- 学生档案库增量 SQL
-- 用法：Supabase Dashboard -> SQL Editor -> 粘贴执行

alter type public.user_role add value if not exists 'planner';

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

alter table if exists public.students
add column if not exists service_started_at timestamptz;

update public.students
set service_started_at = coalesce(service_started_at, created_at, now())
where service_started_at is null;

alter table if exists public.students
alter column service_started_at set default now();

alter table if exists public.students
alter column service_started_at set not null;

create table if not exists public.student_archive_files (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  section text not null check (section in ('comprehensive_eval', 'strong_base', 'awards', 'specialties', 'other')),
  title text not null,
  summary text,
  file_url text,
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_archive_files_student_idx on public.student_archive_files(student_id, section, created_at desc);
create index if not exists student_archive_files_uploaded_by_idx on public.student_archive_files(uploaded_by, created_at desc);

drop trigger if exists student_archive_files_set_updated_at on public.student_archive_files;
create trigger student_archive_files_set_updated_at
before update on public.student_archive_files
for each row execute function public.set_updated_at();

alter table public.student_archive_files enable row level security;

alter table if exists public.volunteer_exports
add column if not exists form_id uuid references public.volunteer_forms(id) on delete set null;

create index if not exists volunteer_exports_form_idx on public.volunteer_exports(form_id);

create or replace function public.can_manage_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_consultant_or_admin()
    or exists (
      select 1
      from public.students s
      where s.id = target_student_id
        and (s.owner_id = auth.uid() or s.planner_id = auth.uid())
    );
$$;

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_profile_id = auth.uid()
    or public.is_consultant_or_admin()
    or exists (
      select 1
      from public.students s
      where (s.owner_id = auth.uid() and s.planner_id = target_profile_id)
         or (s.planner_id = auth.uid() and s.owner_id = target_profile_id)
    );
$$;

create or replace function public.can_manage_volunteer_form(target_form_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_consultant_or_admin()
    or exists (
      select 1
      from public.volunteer_forms f
      where f.id = target_form_id
        and (f.owner_id = auth.uid() or public.can_manage_student(f.student_id))
    );
$$;

create or replace function public.can_manage_volunteer_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_consultant_or_admin()
    or exists (
      select 1
      from public.volunteer_form_groups g
      where g.id = target_group_id
        and (g.owner_id = auth.uid() or public.can_manage_volunteer_form(g.form_id))
    );
$$;

create or replace function public.can_manage_student_archive_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  with parts as (
    select storage.foldername(object_name) as segs
  )
  select public.is_consultant_or_admin()
    or exists (
      select 1
      from parts, public.students s
      where parts.segs[1] = 'students'
        and parts.segs[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and s.id::text = parts.segs[2]
        and public.can_manage_student(s.id)
    );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (public.can_view_profile(id));

drop policy if exists "students_owner_all" on public.students;
create policy "students_owner_all"
on public.students for all
using (public.can_manage_student(id))
with check (public.is_consultant_or_admin() or owner_id = auth.uid() or planner_id = auth.uid());

drop policy if exists "volunteer_forms_owner_all" on public.volunteer_forms;
create policy "volunteer_forms_owner_all"
on public.volunteer_forms for all
using (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_student(student_id))
with check (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_student(student_id));

drop policy if exists "volunteer_groups_owner_all" on public.volunteer_form_groups;
create policy "volunteer_groups_owner_all"
on public.volunteer_form_groups for all
using (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_volunteer_form(form_id))
with check (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_volunteer_form(form_id));

drop policy if exists "volunteer_majors_owner_all" on public.volunteer_form_majors;
create policy "volunteer_majors_owner_all"
on public.volunteer_form_majors for all
using (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_volunteer_group(form_group_id))
with check (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_volunteer_group(form_group_id));

drop policy if exists "volunteer_exports_owner_insert_select" on public.volunteer_exports;
create policy "volunteer_exports_owner_insert_select"
on public.volunteer_exports for all
using (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_volunteer_form(form_id))
with check (public.is_consultant_or_admin() or owner_id = auth.uid() or public.can_manage_volunteer_form(form_id));

drop policy if exists "student_archive_files_planner_all" on public.student_archive_files;
create policy "student_archive_files_planner_all"
on public.student_archive_files for all
using (public.can_manage_student(student_id))
with check (public.can_manage_student(student_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-archives', 'student-archives', false, 104857600, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "student_archive_files_read" on storage.objects;
create policy "student_archive_files_read"
on storage.objects for select
using (bucket_id = 'student-archives' and public.can_manage_student_archive_object(name));

drop policy if exists "student_archive_files_insert" on storage.objects;
create policy "student_archive_files_insert"
on storage.objects for insert
with check (bucket_id = 'student-archives' and public.can_manage_student_archive_object(name));

drop policy if exists "student_archive_files_update" on storage.objects;
create policy "student_archive_files_update"
on storage.objects for update
using (bucket_id = 'student-archives' and public.can_manage_student_archive_object(name))
with check (bucket_id = 'student-archives' and public.can_manage_student_archive_object(name));

drop policy if exists "student_archive_files_delete" on storage.objects;
create policy "student_archive_files_delete"
on storage.objects for delete
using (bucket_id = 'student-archives' and public.can_manage_student_archive_object(name));
