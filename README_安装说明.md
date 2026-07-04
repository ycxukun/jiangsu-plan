# Student Account Hub 安装包

## 作用

把首页右上角零散的学生、账号、退出、志愿表按钮，聚合成一个类似“姜杰个人中心”的学生账号入口。

## 文件说明

- `student-account-hub.js`：新增交互逻辑，不直接改动原 `app.js`。
- `student-account-hub.css`：新增个人中心样式。
- `install-student-account-hub.mjs`：自动把 CSS/JS 引入写入 `index.html` 和 `specialty/index.html`。

## 安装步骤

把这三个文件复制到项目根目录：

```bash
/Users/xiwangzaibeifang/Documents/GitHub/jiangsu-plan
```

然后在终端运行：

```bash
cd /Users/xiwangzaibeifang/Documents/GitHub/jiangsu-plan
node install-student-account-hub.mjs
node --check app.js
node --check students/app.js
node --check specialty/app.js
```

验证无误后，打开 GitHub Desktop，提交并 Push。

## 回滚方法

如需回滚：

1. 删除根目录下：
   - `student-account-hub.js`
   - `student-account-hub.css`
   - `install-student-account-hub.mjs`

2. 从 `index.html` 和 `specialty/index.html` 删除对应两行：

```html
<link rel="stylesheet" href="student-account-hub.css?v=20260704-student-account-hub-r1" />
<script src="student-account-hub.js?v=20260704-student-account-hub-r1"></script>
```

专科页对应路径是 `../student-account-hub.css` 和 `../student-account-hub.js`。
