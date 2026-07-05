-- 一次性把指定邮箱设为 active 管理员。
-- 用法：把下面 email 改成你的登录邮箱，然后在 Supabase SQL Editor 里执行。

insert into public.profiles (id, email, display_name, role, status)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), u.email),
  'admin',
  'active'
from auth.users u
where lower(u.email) = lower('17855321770@163.com')
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    role = 'admin',
    status = 'active',
    updated_at = now();
