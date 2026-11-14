# 数据瘦身（首页提速，不改功能）

- `data-major-details-part-*.js`：学校级、组级重复字段只存一份（例如每个专业都重复存了整组专业名单、学校硕博点列表），由 `data-major-details.js` 在浏览器里还原。原始体积约 100MB → 28MB，压缩后传输 4.9MB → 3.6MB。
- `data-db-part-*.js`：字段名只存一次的表格格式，由 `data-db.js` 还原。首页用到的 4 个分片原始 26MB → 13MB，压缩后传输约 4.3MB → 3.1MB（13 个分片合计）。
- 还原结果与原数据逐条比对完全一致（22147 条专业详情、3536 所院校记录，顺序一致）。
- 加载器同时兼容旧格式分片，浏览器缓存新旧混用也不会出错；index.html / admin.html 中这些脚本加了 `?v=20261114-compact-r1`。
- `scripts/test-professional-group-cards.mjs`、`scripts/generate_volunteer_sandbox_data.js` 改为经 `data-db.js` 读取。
- 部署包体积 218MB → 130MB。
