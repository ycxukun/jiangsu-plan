# 资讯中心上传登录令牌过期修复

## 更新时间
2026-07-04

## 修复内容

- 修复 Supabase Storage 上传时报错 `403 Unauthorized: exp claim timestamp check failed` 的问题。
- 上传文件前会自动检查登录 JWT 是否即将过期。
- 如果 token 即将过期，会使用 refresh token 自动刷新 session。
- 如果 refresh token 也失效，会提示用户重新登录，而不是继续上传并报复杂错误。
- 更新 `content/index.html` 中脚本版本参数，降低缓存导致旧脚本继续运行的概率。

## 影响文件

- `content/app.js`
- `content/index.html`
