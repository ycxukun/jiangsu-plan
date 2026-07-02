# 江苏招生计划变化知识库｜本科+专科合并入口版｜专科批次口径修正 V1.1.57

## 部署方式

把本文件夹内所有内容直接推送到 GitHub Pages 仓库根目录。

- 根目录 `index.html`：本科版
- `specialty/index.html`：专科版

页面右上角已加入“本科 / 专科”切换入口。

## 保留内容

本科版保留 V1.1.55 的筛选、志愿表、体检受限、特殊类型双向筛选、批注、导出等功能。
专科版保留 V0.1 的高职专科数据、专科筛选口径、志愿表、特殊类型、体检受限与风险提示。

## 数据隔离

本科和专科数据分目录保存，互不污染：

- 本科数据：根目录 data-*.js
- 专科数据：specialty/data-*.js


## V1.1.58 专科目录重匹配
- 使用《高职专科专业目录_单表合并版》重新匹配专科专业名称、专业类、专业大类。
- 专科端有效专业 7660 条，匹配 7660 条，未匹配 0 条。
- 新增 specialty/specialty_catalog_rematch_full_audit.csv 与 specialty/specialty_catalog_rematch_summary.csv。
