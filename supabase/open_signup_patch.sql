-- 内测阶段：开放邮箱密码自由注册。
-- 执行位置：Supabase Dashboard -> SQL Editor。
-- 还需要在 Auth -> Sign In / Providers -> Email 中关闭 Confirm email，
-- 这样 signup 才会立即返回登录 session，不需要邮箱验证。

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
