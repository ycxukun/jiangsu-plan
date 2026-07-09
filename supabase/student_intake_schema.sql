-- 学生采集表全量信息与学生唯一编号。
-- 如果线上库已经建过 students 表，只需要执行本文件即可启用：
-- 1. “采集详情”跨设备保存
-- 2. 学生编号 student_no，例如 00001、00002
-- 3. planner_id 规划师归属，便于管理员转移学生

create sequence if not exists public.student_no_seq start 1;

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

drop trigger if exists students_assign_identity on public.students;
create trigger students_assign_identity
before insert on public.students
for each row execute function public.assign_student_identity();

create index if not exists students_planner_idx on public.students(planner_id);
create unique index if not exists students_student_no_uidx on public.students(student_no);

create or replace function public.admin_grant_profile_by_email(
  target_email text,
  target_display_name text default null,
  target_role text default 'planner'
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user auth.users%rowtype;
  next_role public.user_role;
  saved_profile public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only active admins can grant planner accounts.';
  end if;

  if btrim(coalesce(target_email, '')) = '' then
    raise exception 'Planner email is required.';
  end if;

  if target_role not in ('admin', 'consultant', 'planner') then
    raise exception 'Unsupported role: %', target_role;
  end if;
  next_role := target_role::public.user_role;

  select *
  into target_user
  from auth.users
  where lower(email) = lower(btrim(target_email))
  limit 1;

  if target_user.id is null then
    raise exception 'No Supabase Auth user found for email %. Ask this planner to register or log in once first.', target_email;
  end if;

  insert into public.profiles (id, email, display_name, role, status)
  values (
    target_user.id,
    target_user.email,
    nullif(btrim(coalesce(target_display_name, '')), ''),
    next_role,
    'active'
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.profiles.display_name, excluded.email),
      role = excluded.role,
      status = 'active',
      updated_at = now()
  returning * into saved_profile;

  return saved_profile;
end;
$$;

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles for insert
with check (public.is_admin());

alter table public.profiles alter column role set default 'planner';
alter table public.profiles alter column status set default 'active';

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
with check (
  id = auth.uid()
  and role::text in ('viewer', 'consultant', 'planner')
  and status in ('active', 'pending')
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role::text in ('viewer', 'consultant', 'planner')
    and status in ('active', 'pending')
  )
);

drop policy if exists "students_owner_all" on public.students;
create policy "students_owner_all"
on public.students for all
using (owner_id = auth.uid() or planner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or planner_id = auth.uid() or public.is_admin());
