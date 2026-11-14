# 划线看组（全国院校）接入 + 站点维护任务

## 新增页面 `/huaxian/`
- 首页顶部按钮“划线看组”进入；页面左上“← 返回知识库”回到首页。
- 冲稳保按 2026 年江苏真实投档线判断；组内专业用 2025 年真实最低分按位次折合到 26 年分数尺度。
- 功能：筷子图划线、组结构结论与调剂风险、25→26 组别变化图、各省《本地高校选择》专题、专业门类/专业类/专业搜索、学生方案保存（浏览器本地）、多张志愿表、志愿表检查、按组+专业格式导出 Excel。
- 站内版不连 Google Fonts / 外部 CDN（JSZip 随页面放在 `huaxian/jszip.min.js`），国内访问不受影响。
- 站内版没有 AI 读沟通记录（该功能依赖 claude.ai）；学生方案存在当前浏览器里。
- 数据文件：`huaxian/data.json`（约 10MB）、`prov.json`、`bySchool.json`。更新数据时整体替换这几个文件即可。

## 新增 `.github/workflows/maintenance.yml`
- 每 3 天查询一次 Supabase，防止免费项目因 7 天无访问被自动暂停（已暂停的项目需先到控制台手动 Restore）。
- 同一任务通过 SSH 在服务器执行 `certbot renew`（到期前 30 天内才会真正续期），并启用系统自带的续期定时器。
- 可在 GitHub → Actions → Site maintenance → Run workflow 手动立即执行。

## 其他
- `app.js` 缓存版本号更新为 `20261114-huaxian-r1`（index.html 与部署检查脚本同步）。
- `scripts/prepare-static-site.sh` 打包 `huaxian/` 目录并加入必需文件检查。
