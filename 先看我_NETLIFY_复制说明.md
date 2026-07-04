# Netlify 强 UI 重试版使用说明

## 这是什么

这是完整项目包，可直接覆盖到 GitHub Desktop 管理的 `jiangsu-plan` 项目根目录，然后推送到 GitHub，Netlify 会自动部署。

## 必须复制到哪里

解压后，打开解压出来的文件夹，把里面的所有内容复制到本地仓库根目录。

正确结构：

```text
jiangsu-plan/index.html
jiangsu-plan/app.js
jiangsu-plan/style-claude-force.css
jiangsu-plan/netlify.toml
jiangsu-plan/_redirects
jiangsu-plan/content/index.html
jiangsu-plan/specialty/index.html
jiangsu-plan/students/index.html
```

错误结构：

```text
jiangsu-plan/jiangsu-plan-netlify-force-ui-retry-2026-07-04/index.html
```

## 覆盖成功后 GitHub Desktop 应该出现

```text
style-claude-force.css
netlify.toml
_redirects
index.html
app.js
specialty/index.html
students/index.html
content/index.html
.gitignore
```

如果 GitHub Desktop 里只出现 `.DS_Store`，说明没有复制到正确目录。

## Netlify 设置

导入 GitHub 仓库时：

```text
Base directory：留空
Build command：留空
Publish directory：.
```

## 推送后访问

```text
https://你的-netlify-站点.netlify.app/index.html?v=force-ui-retry
```

然后强制刷新：Command + Shift + R。
