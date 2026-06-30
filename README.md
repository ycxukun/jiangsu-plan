# 江苏省招生计划变化知识库｜V16 Supabase 数据库备注版

## 入口

公开页：

`https://ycxukun.github.io/jiangsu-plan/`

管理员页：

`https://ycxukun.github.io/jiangsu-plan/admin.html`

## Supabase 配置

- Project URL: https://qnspmqsrbjcgrgpqkzgl.supabase.co
- REST URL: https://qnspmqsrbjcgrgpqkzgl.supabase.co/rest/v1
- 管理员邮箱: ycxukun@gmail.com
- 前端 key: publishable/anon key 已内置。

## 功能

1. 公开页自动读取 Supabase `notes` 表，展示备注。
2. 管理员页登录 Supabase Auth 后，右键学校/专业组/专业即可编辑备注。
3. 保存备注直接写入 Supabase `notes` 表。
4. 普通访问者只能看，不能写。
5. 不再需要 GitHub Token。
6. 不再需要手动导出 annotations.json。
7. 三年均分/位次合并列保留。
8. 固定备注面板、详情页备注保留。

## 注意

需要先在 Supabase 里创建 `notes` 和 `admin_users` 表，并把管理员邮箱对应用户加入 `admin_users`。
