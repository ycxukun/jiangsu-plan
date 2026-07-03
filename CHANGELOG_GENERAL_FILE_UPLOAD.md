# 通用公开文件上传功能更新

## 更新日期
2026-07-04

## 更新目标
将原“升学规划资讯中心”的 PDF 上传功能升级为“公开文件资料上传”功能，使项目仍可部署在 GitHub Pages / 阿里云静态环境中，同时通过 Supabase Storage 与 planning_articles 表保存公开资料。

## 核心变化

1. 上传范围从 PDF 扩展为常见公开资料文件：
   - PDF
   - Word：doc、docx
   - PPT：ppt、pptx
   - Excel/表格：xls、xlsx、csv
   - 文本：txt、md
   - 图片：jpg、jpeg、png、webp、gif
   - 压缩包：zip、rar、7z

2. 前端上传路径继续使用 ASCII 安全路径：
   - Storage 路径不再直接使用中文文件名；
   - 数据库保留原始中文文件名；
   - 页面显示仍使用原始文件名。

3. 在线查看能力：
   - PDF：iframe 在线查看；
   - 图片：页面内预览；
   - 音频/视频：页面内播放；
   - txt、md、csv：文本预览；
   - Word、PPT、Excel、压缩包：提供公开下载/新窗口打开入口。

4. Supabase Storage 设置：
   - planning-public bucket 文件大小限制调整为 100MB；
   - allowed_mime_types 调整为 null，避免 Word、PPT、Excel、图片等文件被 bucket MIME 限制拦截；
   - 具体可上传类型由前端白名单控制。

## 涉及文件

- content/index.html
- content/app.js
- supabase/planning_content_schema.sql
- supabase/schema.sql
- CHANGELOG_GENERAL_FILE_UPLOAD.md

## 注意事项

该资料中心仍是公开资料区。上传后文件默认进入公开 bucket，所有访问者可查看或下载。不得上传学生个人信息、身份证、成绩单、体检表、合同、未授权版权资料或内部敏感资料。
