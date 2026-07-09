# Claude 字体规范统一版

## 变更目标

本次不是继续调整背景颜色，而是统一全站字体规范，解决表格、卡片、标签、按钮、侧栏、专业名称、指标数字之间字体混杂的问题。

## 设计规则

- 标题、院校名称、专业组名称、专业名称、说明文字：统一使用系统衬线字体栈，模拟 Claude/Anthropic 的编辑出版物风格。
- 筛选器、按钮、胶囊标签、表头、数字指标：统一使用系统无衬线字体栈，保证工具界面的清晰度。
- 所有分数、位次、计划数使用 tabular-nums，减少数字跳动和对齐混乱。
- 不内置、不分发 Claude/Anthropic 官方字体文件，只使用系统字体回退。

## 新增文件

- `style-claude-typography.css`

## 已接入页面

- `index.html`
- `specialty/index.html`
- `students/index.html`
- `content/index.html`
- `admin.html`
- `specialty/admin.html`
- `login_landing.html`
- `articles/zhaoban-negotiation-strategy.html`

## 验收标识

页面顶部版本胶囊应出现：`TYPO`。如果没有出现，说明页面没有加载到新版 CSS，需强制刷新或检查文件是否覆盖到根目录。
