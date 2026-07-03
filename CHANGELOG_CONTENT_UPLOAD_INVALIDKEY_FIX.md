# 资讯中心 PDF 上传 InvalidKey 修复

## 修复时间
2026-07-04

## 问题
上传包含中文、空格或特殊字符的 PDF 文件名时，Supabase Storage 可能返回 `InvalidKey`，导致上传失败。

## 原因
旧版本把原始文件名拼进 Storage object path，例如：

```text
pdf/2026/<userId>-<timestamp>-面试表和病史调查表.pdf
```

Supabase Storage object key 需要遵循对象键命名规范，中文或特殊字符可能触发 400 InvalidKey。

## 修复
- 上传到 Storage 的路径改为 ASCII 安全路径：`pdf/<year>/<userId>/<timestamp>-<random>.pdf`。
- 数据库仍保留原始中文文件名 `file_name`，前台展示不受影响。
- 更新上传失败提示，区分 InvalidKey 与 bucket/RLS 问题。
- 更新 `content/index.html` 的脚本版本参数，降低缓存导致旧代码未生效的概率。

## 影响文件
- `content/app.js`
- `content/index.html`
