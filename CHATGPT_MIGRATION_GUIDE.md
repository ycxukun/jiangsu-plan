# 江苏招生计划变化知识库：ChatGPT 网页开发迁移指南

## 你要上传的文件

优先上传这个压缩包：

- `jiangsu-plan-chatgpt-dev-package-2026-07-03.zip`

这个包已排除 `.git`、`.DS_Store` 和审计临时 CSV，保留网页运行和继续开发需要的核心文件。

## 包里最重要的目录和文件

- `index.html`、`app.js`：本科主页面。
- `specialty/index.html`、`specialty/app.js`：专科主页面。
- `students/index.html`、`students/app.js`：独立学生档案二级页面。
- `data-*.js`、`specialty/data-*.js`：本科/专科运行数据，不能删。
- `data-assassin-risks.js`、`data-group-changes.js`、`data-group-names.js`、`data-major-details*.js`：风险、专业、变化、专业组等数据，不能删。
- `haoshengya_login_landing.html`：登录/注册落地页。
- `admin.html`、`specialty/admin.html`：管理/备注相关页面。
- `supabase/schema.sql`：数据库结构，学生档案新增的 `subject_choices` 字段在这里。
- `articles/`：文章页面。
- `.nojekyll`：GitHub Pages 静态部署需要保留。

## 在 ChatGPT 网页里的推荐操作

1. 新建一个 ChatGPT 对话或项目。
2. 上传 `jiangsu-plan-chatgpt-dev-package-2026-07-03.zip`。
3. 对 ChatGPT 说：
   “请先解压并阅读 `CHATGPT_MIGRATION_GUIDE.md`，这是一个 GitHub Pages 静态网页项目。本科和专科功能要保持一致，只允许批次和数据不同。修改后请给我完整变更说明和可下载文件。”
4. 让 ChatGPT 修改时，优先告诉它具体目标，例如：
   “检查专科和本科学生档案、志愿表、登录退出是否一致。”
   “学生档案二级页要支持大量学生搜索。”
   “选科不符合专业组选科要求时禁止加入志愿表。”
5. 修改完成后，让 ChatGPT 输出 ZIP 或变更文件。
6. 下载修改后的文件，覆盖本地 GitHub Desktop 项目。
7. 在本地打开测试：
   - `http://127.0.0.1:4173/index.html`
   - `http://127.0.0.1:4173/specialty/index.html`
   - `http://127.0.0.1:4173/students/index.html?from=specialty`
8. 确认无误后，用 GitHub Desktop commit + push。

## 本地测试命令

在项目根目录运行：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后浏览器打开：

```text
http://127.0.0.1:4173/index.html
http://127.0.0.1:4173/specialty/index.html
http://127.0.0.1:4173/students/index.html?from=specialty
```

## 修改时的注意事项

- 本科和专科只允许数据、标题、批次路径不同，功能必须一致。
- 专科志愿表和本科志愿表的 localStorage key 要分开，避免互相串数据。
- 学生档案是独立二级页面，不要再只塞进右侧抽屉。
- 学生档案要保留：姓名、手机号、批次、科类、再选科目、分数、位次、目标城市、体检代码。
- 选科校验必须同时检查：
  - 首选科目：物理/历史。
  - 再选科目：化学/生物/政治/地理。
- 如果学生选科不满足专业组要求，要禁用“加入志愿表”和专业勾选。
- 不要把 Supabase service role secret 放进网页，网页里只能使用公开 anon key。

## 如果上传失败

如果 ChatGPT 网页提示压缩包太大，可以分批上传：

1. 第一批：`index.html`、`app.js`、`students/`、`supabase/`、`haoshengya_login_landing.html`。
2. 第二批：`specialty/`。
3. 第三批：根目录所有 `data-*.js` 和 `data-assassin-risks.js`。
4. 第四批：`specialty/` 下所有 `data-*.js`。

不要只上传 `app.js`，因为这个项目的数据都在本地 JS 文件里。
