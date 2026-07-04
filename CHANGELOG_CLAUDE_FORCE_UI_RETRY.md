# V1.1.67 强制暖纸 UI 重新打包版

本包用于重新覆盖 GitHub Desktop 本地项目根目录。

## 关键变化

- 将 app.js / specialty/app.js 顶部版本号改为 V1.1.67 强制暖纸 UI 版。
- 重新缓存刷新 style-claude-force.css?v=20260704-ui-r3-retry。
- 新增 .gitignore，忽略 .DS_Store。
- 保留全部业务功能：本科、专科、学生档案、资讯中心、通用文件上传、中外合作详情。

## 覆盖后应看到

GitHub Desktop 不应只出现 .DS_Store；应至少出现：

- app.js
- specialty/app.js
- index.html
- specialty/index.html
- style-claude-force.css
- .gitignore
- CHANGELOG_CLAUDE_FORCE_UI_RETRY.md
