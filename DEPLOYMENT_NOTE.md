# 部署说明

1. 解压本包。
2. 将 `work_web_combined_v2` 文件夹里的所有文件和 `specialty` 文件夹一起上传/推送到 GitHub Pages 仓库根目录。
3. 访问根目录为本科版。
4. 点击右上角“专科”进入专科版。

注意：不要只上传 `index.html`，必须连同所有 `data-*.js`、`app.js`、`specialty/` 子目录一起上传。


## V1.1.58 专科目录重匹配
- 使用《高职专科专业目录_单表合并版》重新匹配专科专业名称、专业类、专业大类。
- 专科端有效专业 7660 条，匹配 7660 条，未匹配 0 条。
- 新增 specialty/specialty_catalog_rematch_full_audit.csv 与 specialty/specialty_catalog_rematch_summary.csv。
