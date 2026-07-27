import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const moduleDir = path.join(root, "professional-group-cards");
const dataDir = path.join(moduleDir, "data");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function sha256(filePath) {
  return createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

const index = await readJson(path.join(dataDir, "index.json"));
const manifest = await readJson(path.join(dataDir, "manifest.json"));
const expectedTotals = {
  schools: 1076,
  currentSchools: 1070,
  oldOnlySchools: 6,
  currentGroups: 5115,
  retiredGroups: 342,
  plan26: 233450,
  plan25: 224189,
  planDelta: 9261,
  status: {
    retained: 15107,
    deleted: 4533,
    added: 5184,
    anomaly: 166,
  },
};

assert(
  JSON.stringify(index.totals) === JSON.stringify(expectedTotals),
  `全量汇总不一致：${JSON.stringify(index.totals)}`,
);
assert(
  JSON.stringify(manifest.totals) === JSON.stringify(expectedTotals),
  "manifest 与目录汇总不一致",
);
assert(index.schools.length === 1076, "院校目录数量不是1076");
assert(
  new Set(index.schools.map((school) => school.id)).size ===
    index.schools.length,
  "院校ID不唯一",
);
assert(
  new Set(index.schools.map((school) => school.name)).size ===
    index.schools.length,
  "院校名称不唯一",
);

let seenNullScore = false;
for (let indexPosition = 0; indexPosition < index.schools.length; indexPosition += 1) {
  const school = index.schools[indexPosition];
  if (school.maxScore26 === null) {
    seenNullScore = true;
    assert(school.oldOnly, `${school.name} 无26投档分但未标记为25年停设`);
    continue;
  }
  assert(!seenNullScore, `${school.name} 排在25年停设院校之后`);
  const previous = index.schools[indexPosition - 1];
  if (previous && previous.maxScore26 !== null) {
    assert(
      previous.maxScore26 >= school.maxScore26,
      `${school.name} 未按26最高投档分降序排列`,
    );
  }
}

for (const source of index.sources) {
  assert(source.file, "数据来源缺少文件名");
  assert(/^[0-9a-f]{64}$/.test(source.sha256), `${source.file} 缺少SHA-256`);
}

for (const file of manifest.files) {
  const filePath = path.join(dataDir, file.file);
  const stat = await fs.stat(filePath);
  assert(stat.size === file.size, `${file.file} 文件大小不一致`);
  assert((await sha256(filePath)) === file.sha256, `${file.file} 哈希不一致`);
}

const chunks = new Map();
for (let bucketNumber = 0; bucketNumber < 32; bucketNumber += 1) {
  const bucket = String(bucketNumber).padStart(2, "0");
  chunks.set(
    bucket,
    await readJson(path.join(dataDir, "chunks", `${bucket}.json`)),
  );
}

const status = {
  retained: 0,
  deleted: 0,
  added: 0,
  anomaly: 0,
};
let currentGroups = 0;
let retiredGroups = 0;
let plan26 = 0;
let plan25 = 0;
let rowPlanDelta = 0;
let schoolCount = 0;
const schoolsByName = new Map();

for (const directorySchool of index.schools) {
  const school = chunks
    .get(directorySchool.bucket)
    ?.schools?.[directorySchool.id];
  assert(school, `${directorySchool.name} 未在分块数据中找到`);
  assert(
    school.name === directorySchool.name,
    `${directorySchool.name} 的目录与分块名称不一致`,
  );
  assert(
    JSON.stringify(school.summary.status) ===
      JSON.stringify(directorySchool.status),
    `${directorySchool.name} 的状态汇总不一致`,
  );
  const subjectOrder = school.subjects.map((section) => section.subject);
  assert(
    subjectOrder.every((subject) => ["物理", "历史"].includes(subject)) &&
      (subjectOrder.length < 2 ||
        subjectOrder.indexOf("物理") < subjectOrder.indexOf("历史")),
    `${directorySchool.name} 未按物理类在前、历史类在后排列`,
  );
  schoolCount += 1;
  plan26 += school.summary.plan26;
  plan25 += school.summary.plan25;
  schoolsByName.set(school.name, school);
  for (const section of school.subjects) {
    for (const group of section.groups) {
      if (group.retired) retiredGroups += 1;
      else currentGroups += 1;
      assert(group.rows.length > 0, `${school.name} ${group.id} 没有专业明细`);
      for (const row of group.rows) {
        assert(
          Object.hasOwn(status, row.statusKind),
          `${school.name} ${group.id} 出现未知标色 ${row.statusKind}`,
        );
        status[row.statusKind] += 1;
        rowPlanDelta += row.planDelta ?? 0;
      }
    }
  }
}

assert(schoolCount === expectedTotals.schools, "分块院校数量不一致");
assert(currentGroups === expectedTotals.currentGroups, "26专业组数量不一致");
assert(retiredGroups === expectedTotals.retiredGroups, "25停设组数量不一致");
assert(plan26 === expectedTotals.plan26, "26计划合计不一致");
assert(plan25 === expectedTotals.plan25, "25计划合计不一致");
assert(rowPlanDelta === expectedTotals.planDelta, "逐专业计划增减没有对平");
assert(
  JSON.stringify(status) === JSON.stringify(expectedTotals.status),
  `专业标色合计不一致：${JSON.stringify(status)}`,
);

const nanjing = schoolsByName.get("南京工业大学");
assert(nanjing, "南京工业大学缺失");
assert(
  nanjing.summary.physicsGroupCount === 12 &&
    nanjing.summary.historyGroupCount === 1,
  "南京工业大学物理/历史组数量不一致",
);
assert(
  nanjing.summary.plan26 === 3630 &&
    nanjing.summary.plan25 === 3334 &&
    nanjing.summary.planDelta === 296,
  "南京工业大学计划汇总不一致",
);
assert(
  JSON.stringify(nanjing.summary.status) ===
    JSON.stringify({
      retained: 78,
      deleted: 6,
      added: 5,
      anomaly: 4,
    }),
  "南京工业大学专业标色不一致",
);
const nanjingMapping = Object.fromEntries(
  nanjing.subjects
    .flatMap((section) =>
      section.groups
        .filter((group) => !group.retired)
        .map((group) => [
          `${section.subject}${group.group26}`,
          group.group25,
        ]),
    )
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, "zh-CN")),
);
const expectedNanjingMapping = Object.fromEntries(
  Object.entries({
    物理05: "05",
    物理06: "06",
    物理07: "08",
    物理08: "07",
    物理09: "09",
    物理10: "11",
    物理11: "10",
    物理12: "12",
    物理13: "13",
    物理14: "15",
    物理15: "16",
    物理16: "14",
    历史02: "02",
  }).sort(([keyA], [keyB]) => keyA.localeCompare(keyB, "zh-CN")),
);
assert(
  JSON.stringify(nanjingMapping) ===
    JSON.stringify(expectedNanjingMapping),
  `南京工业大学组映射不一致：${JSON.stringify(nanjingMapping)}`,
);

const tsinghua = schoolsByName.get("清华大学");
assert(
  tsinghua?.summary.physicsGroupCount === 1 &&
    tsinghua?.summary.historyGroupCount === 1,
  "清华大学整校卡未同时包含物理类和历史类",
);
assert(
  index.schools.filter((school) => school.oldOnly).length === 6,
  "25年停设院校数量不一致",
);

const html = await fs.readFile(path.join(moduleDir, "index.html"), "utf8");
const css = await fs.readFile(path.join(moduleDir, "styles.css"), "utf8");
const app = await fs.readFile(path.join(moduleDir, "app.js"), "utf8");
const rootApp = await fs.readFile(path.join(root, "app.js"), "utf8");
for (const reference of ["./styles.css", "./app.js", "./data/index.json"]) {
  const fileReference =
    reference === "./data/index.json"
      ? app.includes(reference)
      : html.includes(reference);
  assert(fileReference, `页面缺少资源引用 ${reference}`);
}
for (const token of [
  "@page",
  "@media print",
  "size: A4 landscape",
  ".major-row.deleted",
  ".major-row.added",
  ".major-row.anomaly",
]) {
  assert(css.includes(token), `打印或标色样式缺少 ${token}`);
}
assert(app.includes("window.print()"), "缺少整校打印动作");
assert(
  app.includes('searchParams.set("school", school.name)'),
  "分享网址未使用稳定的院校名称参数",
);
assert(
  rootApp.includes('href="./professional-group-cards/"'),
  "原站首页缺少2026专业组卡入口",
);

console.log(
  JSON.stringify(
    {
      result: "PASS",
      schools: schoolCount,
      currentGroups,
      retiredGroups,
      status,
      plan26,
      plan25,
      planDelta: rowPlanDelta,
      nanjing: {
        groups: `${nanjing.summary.physicsGroupCount}+${nanjing.summary.historyGroupCount}`,
        status: nanjing.summary.status,
        planDelta: nanjing.summary.planDelta,
      },
    },
    null,
    2,
  ),
);
