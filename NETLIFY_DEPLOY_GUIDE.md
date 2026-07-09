# Netlify 部署说明｜知行学录江苏志愿填报系统

## 1. 推荐部署方式

推荐使用 GitHub 仓库导入 Netlify，而不是每次手动拖拽文件。这样以后在 GitHub Desktop 里 commit + push，Netlify 会自动重新部署。

## 2. Netlify 新建项目

1. 登录 Netlify。
2. 进入 Team dashboard。
3. 点击 Add new project。
4. 选择 Import an existing project。
5. 选择 GitHub。
6. 授权 Netlify 读取你的 GitHub 仓库。
7. 选择当前项目仓库。

## 3. Build settings

本项目是静态网页，不是 Vue、React、Node 工程。

Netlify 设置如下：

```text
Base directory: 留空
Build command: 留空
Publish directory: .
```

项目根目录已包含 `netlify.toml`，Netlify 正常会自动读取：

```toml
[build]
  publish = "."
  command = ""
```

## 4. 访问地址

部署成功后，Netlify 会给一个类似这样的临时域名：

```text
https://xxxxxx.netlify.app/
```

重点测试：

```text
/
/specialty/index.html
/students/index.html
/content/index.html
```

## 5. 文件上传说明

Netlify 只负责托管前端网页。上传的资料文件不是存到 Netlify，而是存到 Supabase Storage。

所以通用文件上传要生效，必须确认 Supabase 已执行新版：

```text
supabase/planning_content_schema.sql
```

并确认有：

```text
Table: planning_articles
Storage bucket: planning-public
```

## 6. 后续更新流程

以后每次改功能：

```text
1. 下载 ChatGPT 给出的新版 ZIP。
2. 覆盖本地 GitHub Desktop 项目。
3. 本地简单测试。
4. GitHub Desktop commit。
5. Push origin。
6. Netlify 自动重新部署。
7. 打开 Netlify 网址验收。
```

## 7. 如果页面没变化

优先处理缓存：

```text
Command + Shift + R
```

或者访问：

```text
https://你的站点.netlify.app/index.html?v=netlify-deploy
https://你的站点.netlify.app/content/index.html?v=general-file-upload
```

## 8. 如果上传失败

按以下顺序排查：

| 报错 | 处理 |
|---|---|
| bucket not found | Supabase Storage 创建 planning-public |
| mime type not allowed | 重新执行新版 planning_content_schema.sql |
| row-level security policy | 重新执行 RLS policies |
| InvalidKey | 确认 content/app.js 是新版，且强制刷新 |
| 请先登录 | 先登录后上传 |

## 9. 安全纪律

`planning-public` 是公开资料桶。上传后，所有访问网站的用户都可以查看或下载。不要上传学生个人信息、身份证、成绩单、体检表、合同、家长手机号、内部敏感资料或未授权版权资料。
