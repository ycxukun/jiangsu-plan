# 新版（/v2/）院校库数据怎么重新生成

新版院校库不重新实现旧版的规则（刺客/专业组标签、体检限报、特殊类型、批次指南、预测分、录取规则提示等），
而是用旧版自己的函数把结果算一遍，存成静态 JSON。所以只要旧版数据（data-*.js、specialty/data-*.js）或
旧版 app.js 的规则改了，就按下面重新生成一次：

```bash
python3 -m http.server 8811 &          # 在仓库根目录
node scripts/v2/extract-kb.js /tmp/kb-raw.json index.html
node scripts/v2/extract-kb.js /tmp/zk-raw.json specialty/index.html
python3 scripts/v2/pack-kb.py /tmp/kb-raw.json v2/data/bk huaxian/data.json
python3 scripts/v2/pack-kb.py /tmp/zk-raw.json v2/data/zk
```

需要 Node + Playwright（本机 `npm i -g playwright && npx playwright install chromium`）。
生成后把 v2/index.html、app.js、kb.js 里的 `?v=` 版本号改一下，浏览器才会拿新数据。

- `index.json`：列表和筛选用，约 350KB（压缩后）。
- `search.json`：每个专业组的专业名，用于搜专业，约 250KB（压缩后），在列表出来以后再下载。
- `s/<n>.json`：每个校名一份，点开学校时才下载。
