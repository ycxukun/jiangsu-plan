# 江苏省招生计划变化知识库｜V11 极小分片网页端上传版

## 这个版本解决什么问题

GitHub 网页端上传时提示：

`Commit failed: The file is too large and cannot be uploaded`

所以本版把数据拆成更小的 JS 分片。每个数据分片都控制在 1MB 以下，避免 GitHub 网页端拒绝上传。

## 上传方式

1. 解压 zip。
2. 打开解压后的文件夹。
3. 把里面的所有文件上传到 GitHub 仓库根目录。
4. 不要上传 zip 本身。
5. 不要上传任何“源文件.html”。

## 当前版本

V11 稳定回归版｜极小分片｜严格中外合作识别

## 注意

这个包里没有 40MB+ 的源文件 HTML，只有 GitHub Pages 运行所需文件。
