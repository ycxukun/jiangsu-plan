## V1.1.9 志愿展开导出版

- 导出 Excel 第一张表改为“专业组展开表”，结构类似志愿填报清单：每个专业组先出一行汇总，再展开该专业组下的全部专业。
- 所有专业都会导出；用户勾选的专业标记为“已选”，未勾选专业标记为“未选”，风险专业继续单独提示。
- 保留“40专业组志愿表”和“所选专业明细”两个辅助工作表，便于同时看志愿顺序和只看已选专业。

## V1.1.8 志愿表单版

- 顶部新增“志愿表 0/40”入口，可维护最多 40 个院校专业组志愿。
- 每个专业组卡片与详情区新增“加入志愿表”按钮。
- 志愿表单支持按当前筛选结果一键补满 40 个专业组，也支持逐个删除、上移、下移。
- 每个院校专业组可设置“冲 / 稳 / 保 / 垫”、是否服从调剂、备注。
- 每个院校专业组可展开勾选具体专业，默认选取组内排序靠前的 6 个专业。
- 导出 Excel 时按“院校专业组 + 专业1-6 + 完整专业清单”的结构生成 40 行基础表。
- Excel 导出升级为两个工作表：“40专业组志愿表”和“所选专业明细”，便于同时核对志愿顺序和专业明细。
- 导出字段包含院校、地区、科类、批次、院校层次、专业组、专业组名称、再选科目、专业、服从调剂、计划、分数位次、组色判断、变迁状态与备注。

## V1.1.7 giscus 批注 + 组色 + 变迁版

- 新增学校、专业组、专业三级 giscus 批注入口。
- 点击“查看批注 / 新增批注”后，右侧打开对象批注抽屉。
- 新增专业组红/黄/绿边框提醒：含风险专业为红色，整组冷门/风险为黄色，其余结构清爽组为绿色。
- 专业组标题后追加命名结果；`data-group-names.js` 已改为基于 2026 当前在招专业、专业类与计划数生成，不再沿用 2025 组号命名。
- 专业组卡片与详情区右上角新增“变迁”入口，打开后可查看 2026 当前组与 2025 对应组、计划数、专业数、相似度、覆盖率以及新增/减少/拆入/拆出明细。
- 页面默认进入紧凑模式，顶部按钮显示“标准显示”，可切回标准模式。
- 每个批注对象使用稳定 term 绑定到独立 GitHub Discussion：
  - `js-plan-annotation::schools::<school-key>`
  - `js-plan-annotation::groups::<group-key>`
  - `js-plan-annotation::majors::<major-key>`
- 批注抽屉保持极简，只展示当前批注对象和对应的 giscus 评论内容。
- giscus 已配置到 GitHub Pages 仓库：
  - `repo`: `ycxukun/jiangsu-plan`
  - `repoId`: `R_kgDOTIG-gg`
  - `category`: `批注`
  - `categoryId`: `DIC_kwDOTIG-gs4DAM7P`
  - `theme`: `light`
  - `lang`: `zh-CN`
- 仓库已开启 GitHub Discussions，并安装 giscus GitHub App；抽屉会直接加载对应对象的 giscus 评论区。

## V1.1.7 选科要求筛选版

- 新增“选科要求”多选筛选面板。
- 选科要求按专业组的 `requirement` 字段筛选，例如：不限、化学、生物、化和生、政治、地理等。
- 面板中继续过滤 `#REF!` 等 Excel 错误项。
- 筛选逻辑作用于专业组：同一院校下只显示符合选科要求的专业组。
- 保留 V1.1.7 的回到顶部、三年均分专业排序、26 年计划口径等功能。

## V1.1.7 专业排序与计划口径修正版

- 新增右下角“↑ 顶部”按钮，点击后平滑回到页面顶部。
- 专业表格行现在按“三年均分”从高到低排序；均分相同再按三年均位次、25分、25位次、代码排序。
- 表格列名由“25计划/变化”修正为“26计划/变化”。
- 专业行计划数显示 2026 年计划，变化值仍表示相对 2025 年计划的增减。
- 专业组标题中的计划口径同步改为“26计划｜较25年”。

## V1.1.7 紧凑显示版

- 新增“紧凑显示 / 标准显示”切换按钮。
- 紧凑模式压缩顶部栏、左侧索引、学校概览卡片、专业组卡片、专业表格行高。
- 紧凑模式下左侧索引宽度由 320px 调整为 270px，主内容区域可显示更多专业组和专业行。
- 保留 V1.1.7 的省份数量排序、错误项过滤、头部折叠、专业行点击详情等功能。

## V1.1.7 省份数量排序

- 省份多选面板改为按数量从高到低排序。
- 数量相同的省份，按中文名称排序。
- 继续过滤 `#REF!` 等 Excel 公式错误项。

## V1.1.7 头部折叠与筛选项清理

- 省份、院校层次多选面板已过滤 Excel 公式错误项，例如 `#REF!`。
- 新增“收起头部 / 展开头部”按钮，可折叠顶部说明与筛选状态栏。
- 折叠后左侧院校索引的吸顶位置同步调整，避免顶部留白过大。

## V1.1 批注优化说明

- 省份改为多选面板。
- 院校层次改为多选面板。
- 专业行点击即可打开专业详情，移除“详情”列按钮。
- 招生计划增减统一使用红/绿强调。
- 专业组卡片与详情区域补充所含专业大类展示。

# 江苏省招生计划变化知识库｜GitHub Pages 静态部署版

版本：2026在招专业组版｜V1.1 GitHub Pages 静态版

## 一、文件结构

- `index.html`：公开展示页，只读，不显示管理员入口。
- `admin.html`：管理员页，左下角固定显示“管理员备注”按钮。
- `app.js`：页面交互、筛选、排序、专业详情弹窗、Supabase 备注逻辑。
- `data-db-part-xx.js`：招生数据库分片。
- `data-db.js`：合并招生数据库分片。
- `data-group-names.js`：2026 当前专业组命名映射，用于标题展示。
- `data-group-changes.js`：25-26 专业组变迁映射，用于专业组右上角“变迁”抽屉。
- `data-major-details-part-xx.js`：专业详情分片。
- `data-major-details.js`：合并专业详情分片。
- `.nojekyll`：保证 GitHub Pages 原样发布。

## 二、数据识别结果

- 普通批专业组：5118 行。
- 普通批专业：20458 行。
- 提前批专业：1687 行。
- 生成院校记录：2142 条。
- 生成专业组记录：5615 条。
- 生成专业记录：22145 条。

## 三、核心口径

院校加权平均分按以下规则计算：

```text
sum(2025专业最低分 × 2025专业招生计划) / sum(2025专业招生计划)
```

排序规则：

```text
院校加权平均分 desc → 可见专业组最高25分 desc → 最好25位次 asc → 学校名 asc
```

学校展示区不显示“顶尖、强校、985/顶尖、211/双一流、学校加权、民办/独立、保研/强校”等主观标签；院校层次字段仅保留为顶部筛选项。

## 四、GitHub Pages 上传方法

1. 新建 GitHub 仓库，例如 `jiangsu-plan`。
2. 解压本 zip。
3. 将 zip 内所有文件上传到仓库根目录。
4. 进入仓库 `Settings → Pages`。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/root`。
7. 保存后等待 GitHub Pages 发布。
8. 公开页访问 `https://你的用户名.github.io/jiangsu-plan/`。
9. 管理员页访问 `https://你的用户名.github.io/jiangsu-plan/admin.html`。

## 五、Supabase 配置

当前 `app.js` 中 Supabase 配置为空：

```js
const SUPABASE_URL='';
const SUPABASE_ANON_KEY='';
const ADMIN_EMAIL='ycxukun@gmail.com';
```

需要接入备注库时，填写 Supabase Project URL 与 anon/publishable key。不要使用 service_role key。

## 六、Supabase 建表 SQL

```sql
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('schools','groups','majors')),
  target_key text not null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique(scope, target_key)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
alter table public.admin_users enable row level security;

create policy "notes public read"
on public.notes for select
to anon, authenticated
using (true);

create policy "notes admin insert"
on public.notes for insert
to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "notes admin update"
on public.notes for update
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "notes admin delete"
on public.notes for delete
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admin users self read"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

insert into public.admin_users (user_id, role)
select id, 'owner'
from auth.users
where email = 'ycxukun@gmail.com'
on conflict (user_id) do update set role = excluded.role;
```

## 七、已做检查

- `node --check app.js`：通过。
- 数据分片控制在约 1MB 以内。
- zip 可直接解压上传 GitHub Pages。
