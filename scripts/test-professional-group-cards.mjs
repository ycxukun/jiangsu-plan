import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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
const rootCss = await fs.readFile(
  path.join(root, "style-claude-clean.css"),
  "utf8",
);
const rootHtml = await fs.readFile(path.join(root, "index.html"), "utf8");
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
for (const token of [
  "major-change-retained",
  "major-change-added",
  "major-change-anomaly",
  "major-change-deleted",
]) {
  assert(rootApp.includes(token), `原站内嵌专业标色缺少 ${token}`);
  assert(rootCss.includes(token), `原站内嵌专业颜色样式缺少 ${token}`);
}
assert(
  rootHtml.includes("20260727-inline-cutoff26-r1"),
  "原站没有刷新专业标色与26投档线资源版本",
);
assert(
  (rootApp.match(/const cutoff26=inlineMajorCutoff26HTML\(cardGroup\);/g) || [])
    .length === 1,
  "26投档线没有限定为专业组标题信息区一处",
);

const inlineContext = {
  console,
  fetch: async () => {
    throw new Error("测试不应发起网络请求");
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  document: {
    readyState: "loading",
    addEventListener: () => {},
  },
  navigator: {},
  location: {},
  alert: () => {},
  confirm: () => true,
  setTimeout,
  clearTimeout,
  URL,
};
inlineContext.window = inlineContext;
inlineContext.DB_PARTS = [];
vm.createContext(inlineContext);
for (let part = 1; part <= 4; part += 1) {
  const file = `data-db-part-${String(part).padStart(2, "0")}.js`;
  vm.runInContext(
    await fs.readFile(path.join(root, file), "utf8"),
    inlineContext,
    { filename: file },
  );
}
inlineContext.DB = inlineContext.DB_PARTS.flat();
const inlineExport =
  "\nwindow.__INLINE_MAJOR_CHANGE_TEST__={" +
  [
    "inlineMajorChangeSchoolCache",
    "inlineMajorChangeGroup",
    "matchInlineMajorChangeRows",
    "inlineMajorChangeClass",
    "inlineMajorChangeDeletedRows",
    "inlineMajorDeletedRowHTML",
    "inlineMajorCutoff26HTML",
  ].join(",") +
  "};\n})();";
const instrumentedRootApp = rootApp.replace(/\n\}\)\(\);\s*$/, inlineExport);
assert(instrumentedRootApp !== rootApp, "无法挂接原站内嵌标色测试");
vm.runInContext(instrumentedRootApp, inlineContext, {
  filename: "app.js",
});
const inlineTest = inlineContext.__INLINE_MAJOR_CHANGE_TEST__;
inlineTest.inlineMajorChangeSchoolCache.set("南京工业大学", nanjing);
const nanjingPhysics06 = nanjing.subjects
  .find((section) => section.subject === "物理")
  ?.groups.find((group) => group.group26 === "06");
assert(nanjingPhysics06, "南京工业大学物理06专业组缺失");
assert(
  inlineTest.inlineMajorCutoff26HTML(nanjingPhysics06) ===
    '<span class="group-cutoff26-inline">26投档线 602分（33651位）</span>',
  "南京工业大学物理06的26投档线显示不正确",
);
const rootNanjingSchools = inlineContext.DB.filter(
  (school) =>
    school.name === "南京工业大学" && school.batch === "本科批",
);
assert(rootNanjingSchools.length === 2, "原站南京工业大学普通本科科类不完整");
const inlineNanjingStatus = {
  retained: 0,
  added: 0,
  anomaly: 0,
  deleted: 0,
};
let inlineNanjingCurrent = 0;
let inlineNanjingMatched = 0;
let movedMajorTone = "";
for (const school of rootNanjingSchools) {
  for (const group of school.groups) {
    const cardGroup = inlineTest.inlineMajorChangeGroup(school, group);
    assert(cardGroup, `南京工业大学 ${school.subject}${group.displayCode} 未匹配`);
    const majors = [...group.majors];
    const matches = inlineTest.matchInlineMajorChangeRows(majors, cardGroup);
    inlineNanjingCurrent += majors.length;
    inlineNanjingMatched += matches.size;
    for (const major of majors) {
      const tone = inlineTest
        .inlineMajorChangeClass(major, matches.get(major), cardGroup)
        .replace("major-change-", "");
      inlineNanjingStatus[tone] += 1;
      if (
        major.name.startsWith(
          "建筑电气与智能化(与上海德衡数据科技有限公司联合培养)",
        )
      ) {
        movedMajorTone = tone;
      }
    }
    const deletedRows = inlineTest.inlineMajorChangeDeletedRows(
      majors,
      matches,
      cardGroup,
    );
    inlineNanjingStatus.deleted += deletedRows.length;
    for (const row of deletedRows) {
      const deletedHtml = inlineTest.inlineMajorDeletedRowHTML(row);
      assert(!/checkbox|data-main-major-check/.test(deletedHtml), "灰色行可以被勾选");
      assert(
        !/新增|延续|删减|转出/.test(deletedHtml),
        "灰色行出现了多余状态文字",
      );
    }
  }
}
assert(inlineNanjingCurrent === 87, "南京工业大学当前专业数量不一致");
assert(inlineNanjingMatched === 87, "南京工业大学当前专业没有全部匹配");
assert(
  JSON.stringify(inlineNanjingStatus) ===
    JSON.stringify({
      retained: 79,
      added: 4,
      anomaly: 4,
      deleted: 6,
    }),
  `南京工业大学原站标色不一致：${JSON.stringify(inlineNanjingStatus)}`,
);
assert(
  movedMajorTone === "retained",
  "带25年参考分的转组专业被误标为新增",
);
const wuhanCard = schoolsByName.get("武汉理工大学");
const wuhanRoot = inlineContext.DB.find(
  (school) =>
    school.name === "武汉理工大学" &&
    school.subject === "物理" &&
    school.batch === "本科批",
);
assert(wuhanCard && wuhanRoot, "武汉理工大学回退标色样本缺失");
inlineTest.inlineMajorChangeSchoolCache.set("武汉理工大学", wuhanCard);
const wuhanNewGroup = wuhanRoot.groups.find(
  (group) => group.displayCode === "15",
);
const wuhanNewCardGroup = inlineTest.inlineMajorChangeGroup(
  wuhanRoot,
  wuhanNewGroup,
);
const wuhanNewMatches = inlineTest.matchInlineMajorChangeRows(
  wuhanNewGroup.majors,
  wuhanNewCardGroup,
);
assert(
  inlineTest.inlineMajorChangeClass(
    wuhanNewGroup.majors[0],
    wuhanNewMatches.get(wuhanNewGroup.majors[0]),
    wuhanNewCardGroup,
  ) === "major-change-added",
  "目录遗漏组没有使用原站新增依据回退标绿",
);
for (const [name, school] of schoolsByName) {
  inlineTest.inlineMajorChangeSchoolCache.set(name, school);
}
const inlineCoverage = {
  schoolRows: 0,
  groups: 0,
  matchedGroups: 0,
  currentMajors: 0,
  matchedMajors: 0,
  retained: 0,
  added: 0,
  anomaly: 0,
  deleted: 0,
};
for (const school of inlineContext.DB.filter(
  (row) => row.batch === "本科批",
)) {
  inlineCoverage.schoolRows += 1;
  for (const group of school.groups) {
    inlineCoverage.groups += 1;
    inlineCoverage.currentMajors += group.majors.length;
    const cardGroup = inlineTest.inlineMajorChangeGroup(school, group);
    assert(cardGroup, `${school.name} ${school.subject}${group.displayCode} 无标色回退`);
    if (!cardGroup.inlineFallback) inlineCoverage.matchedGroups += 1;
    const matches = inlineTest.matchInlineMajorChangeRows(
      group.majors,
      cardGroup,
    );
    inlineCoverage.matchedMajors += matches.size;
    for (const major of group.majors) {
      const tone = inlineTest
        .inlineMajorChangeClass(major, matches.get(major), cardGroup)
        .replace("major-change-", "");
      inlineCoverage[tone] += 1;
    }
    inlineCoverage.deleted += inlineTest.inlineMajorChangeDeletedRows(
      group.majors,
      matches,
      cardGroup,
    ).length;
  }
}
assert(
  JSON.stringify(inlineCoverage) ===
    JSON.stringify({
      schoolRows: 1900,
      groups: 5118,
      matchedGroups: 5115,
      currentMajors: 20460,
      matchedMajors: 20457,
      retained: 16925,
      added: 3369,
      anomaly: 166,
      deleted: 3865,
    }),
  `原站全量内嵌覆盖不一致：${JSON.stringify(inlineCoverage)}`,
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
        inlineStatus: inlineNanjingStatus,
        planDelta: nanjing.summary.planDelta,
      },
      inlineCoverage,
    },
    null,
    2,
  ),
);
