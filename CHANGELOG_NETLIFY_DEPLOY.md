# Netlify 部署适配记录

## 2026-07-04

- 新增 `netlify.toml`，明确该项目是静态站点，无构建命令，发布目录为项目根目录。
- 新增 `_redirects`，保证 `/content`、`/students`、`/specialty` 等路径可直接访问。
- 新增 `NETLIFY_DEPLOY_GUIDE.md`，说明 Netlify + GitHub 自动部署流程。
- 保留通用文件上传功能：前端部署在 Netlify，文件继续存储在 Supabase Storage。
