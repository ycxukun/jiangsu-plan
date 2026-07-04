# 学生档案 JWT 过期自动刷新修复

## 更新内容

- 修复学生档案页读取学生时出现 `JWT expired` / `PGRST303` 的问题。
- 学生档案页在请求 Supabase 前会检查 access token 是否即将过期。
- 如果 token 过期，会使用 refresh token 自动刷新后重试请求。
- 如果 refresh token 也失效，会提示用户返回首页退出并重新登录。
- 给 `students/app.js` 增加版本参数，减少 Netlify/GitHub Pages 缓存导致旧脚本继续生效。

## 主要改动文件

- `students/app.js`
- `students/index.html`
