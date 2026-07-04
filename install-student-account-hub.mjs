#!/usr/bin/env node
/**
 * 安装 Student Account Hub 到当前静态项目。
 * 使用方法：
 *   cd /Users/xiwangzaibeifang/Documents/GitHub/jiangsu-plan
 *   node install-student-account-hub.mjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '20260704-student-account-hub-r1';

const targets = [
  {
    file: path.join(ROOT, 'index.html'),
    cssHref: `student-account-hub.css?v=${VERSION}`,
    jsSrc: `student-account-hub.js?v=${VERSION}`
  },
  {
    file: path.join(ROOT, 'specialty', 'index.html'),
    cssHref: `../student-account-hub.css?v=${VERSION}`,
    jsSrc: `../student-account-hub.js?v=${VERSION}`
  }
];

function assertFile(file){
  if(!fs.existsSync(file)){
    throw new Error(`找不到文件：${file}`);
  }
}

function insertBeforeClosingHead(html, tag){
  if(html.includes(tag)) return html;
  if(!html.includes('</head>')) throw new Error('HTML 缺少 </head>');
  return html.replace('</head>', `${tag}\n</head>`);
}

function insertBeforeClosingBody(html, tag){
  if(html.includes(tag)) return html;
  if(!html.includes('</body>')) throw new Error('HTML 缺少 </body>');
  return html.replace('</body>', `${tag}\n</body>`);
}

for(const t of targets){
  assertFile(t.file);
  let html = fs.readFileSync(t.file, 'utf8');

  const cssTag = `<link rel="stylesheet" href="${t.cssHref}" />`;
  const jsTag = `<script src="${t.jsSrc}"></script>`;

  html = insertBeforeClosingHead(html, cssTag);
  html = insertBeforeClosingBody(html, jsTag);

  fs.writeFileSync(t.file, html, 'utf8');
  console.log(`已更新：${path.relative(ROOT, t.file)}`);
}

console.log('\n完成。请继续运行：');
console.log('node --check app.js');
console.log('node --check students/app.js');
console.log('node --check specialty/app.js');
