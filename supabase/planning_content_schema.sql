-- 升学规划资讯中心增量 SQL
-- 用法：Supabase Dashboard -> SQL Editor -> 粘贴执行

-- 升学规划资讯中心：公开图文与多类型文件资料
-- 目标：规划师/管理员上传和删除，所有网络用户可读。公开文件放入 public Storage bucket。
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

-- 公众号式 Markdown 图文文章
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
