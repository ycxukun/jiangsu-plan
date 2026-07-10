-- 一次性把指定邮箱设为 active 管理员。
-- 用法：在 Supabase SQL Editor 里执行本文件；执行后最后一行会返回当前管理员资料。

do $$
begin
  if not exists (
    select 1 from auth.users u
    where lower(u.email) = lower('17855321770@163.com')
  ) then
    raise exception '未找到 Supabase Auth 用户：17855321770@163.com。请先用这个邮箱注册/登录一次。';
  end if;
end $$;

insert into public.profiles (id, email, display_name, role, status)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), u.email),
  'admin'::public.user_role,
  'active'
from auth.users u
where lower(u.email) = lower('17855321770@163.com')
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    role = 'admin'::public.user_role,
    status = 'active',
    updated_at = now()
returning id, email, display_name, role, status, updated_at;

select
  u.id,
  u.email as auth_email,
  p.email as profile_email,
  p.display_name,
  p.role,
  p.status,
  (p.role::text = 'admin' and p.status = 'active') as can_enter_admin,
  p.updated_at
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('17855321770@163.com');
