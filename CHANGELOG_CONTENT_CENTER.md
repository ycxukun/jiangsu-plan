# V1.1.65 图文资讯中心版

## 新增

- 新增 `content/index.html` 与 `content/app.js`，形成与志愿填报系统平行的“升学规划资讯中心”。
- 资讯中心支持公开图文/PDF 资料列表、分类筛选、关键词搜索、PDF 在线查看。
- 登录账号可上传 PDF，上传后写入 Supabase `planning_articles` 表，并通过公开 Storage bucket 面向所有网络用户查看。
- 本科页、专科页顶部新增“升学资讯”入口。
- 登录成功后新增“选择工作区”弹窗：可进入志愿填报系统或升学规划资讯中心。
- 登录页文案同步更新，明确“志愿填报是内部工作台，资讯中心是公开资料区”。

## 数据库

- `supabase/schema.sql` 新增 `planning_articles` 表。
- 新增 Supabase Storage public bucket：`planning-public`。
- 策略：公开读取，登录用户上传；作者或管理员可更新/删除。

## 注意

- 要实现“所有网络用户可见”，必须先在 Supabase SQL Editor 执行新版 `supabase/schema.sql`。
- 若未执行 SQL，资讯中心会显示本地示例，上传会失败。
