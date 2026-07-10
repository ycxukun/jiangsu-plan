-- 内测阶段：开放邮箱密码自由注册。
-- 执行位置：Supabase Dashboard -> SQL Editor。
-- 还需要在 Auth -> Sign In / Providers -> Email 中关闭 Confirm email，
-- 这样 signup 才会立即返回登录 session，不需要邮箱验证。

alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column status set default 'active';

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
      raise exception using errcode = '42501', message = 'New accounts must start as viewer/active.';
    end if;
  elsif new.role is distinct from old.role
     or new.status is distinct from old.status then
    raise exception using errcode = '42501', message = 'Only an active administrator can change profile role or status.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
before insert or update on public.profiles
for each row execute function public.guard_profile_privileges();

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
with check (
  id = auth.uid()
  and role::text = 'viewer'
  and status = 'active'
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or id = auth.uid()
);
