-- 升学规划资讯中心增量 SQL
-- 用法：Supabase Dashboard -> SQL Editor -> 粘贴执行

-- 升学规划资讯中心：公开图文与 PDF 资料
-- 目标：登录用户上传，所有网络用户可读。PDF 文件放入 public Storage bucket。
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
with check (auth.uid() is not null and (created_by = auth.uid() or public.is_admin()));

drop policy if exists "planning_articles_owner_update" on public.planning_articles;
create policy "planning_articles_owner_update"
on public.planning_articles for update
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "planning_articles_owner_delete" on public.planning_articles;
create policy "planning_articles_owner_delete"
on public.planning_articles for delete
using (created_by = auth.uid() or public.is_admin());

-- Supabase Storage 公开 PDF bucket。
-- 注意：如果 Dashboard 不允许 SQL 修改 storage.buckets，可在 Storage 页面手动创建 public bucket：planning-public。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planning-public', 'planning-public', true, 52428800, array['application/pdf'])
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
with check (bucket_id = 'planning-public' and auth.uid() is not null);

drop policy if exists "planning_owner_files_update" on storage.objects;
create policy "planning_owner_files_update"
on storage.objects for update
using (bucket_id = 'planning-public' and (owner = auth.uid() or public.is_admin()))
with check (bucket_id = 'planning-public' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "planning_owner_files_delete" on storage.objects;
create policy "planning_owner_files_delete"
on storage.objects for delete
using (bucket_id = 'planning-public' and (owner = auth.uid() or public.is_admin()));
