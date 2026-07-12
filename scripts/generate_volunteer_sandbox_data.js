#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'volunteer-sandbox-preview', 'data.js');
const SAMPLE_SCORE = 610;
const PER_RISK_LEVEL = 12;

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function historyScores(group) {
  return [group.score25, group.score24, group.score23].map(numeric).filter((value) => value !== null);
}

function probabilityFor(group, score = SAMPLE_SCORE) {
  const history = historyScores(group);
  const margins = history.map((value) => score - value);
  const averageMargin = margins.reduce((sum, value) => sum + value, 0) / margins.length;
  const reachableRatio = margins.filter((value) => value >= 0).length / margins.length;
  const logistic = 100 / (1 + Math.exp(-averageMargin / 6));
  return Math.max(1, Math.min(99, Math.round(logistic * 0.65 + reachableRatio * 35)));
}

function riskLevel(probability) {
  if (probability < 40) return 'chong';
  if (probability < 80) return 'wen';
  return 'bao';
}

function compactMajor(major) {
  return {
    key: major.key,
    code: major.code,
    name: major.name,
    baseName: major.baseName,
    majorClass: major.majorClass,
    discipline: major.discipline,
    plan26: major.plan26,
    score25: major.score25,
    rank25: major.rank25,
    tuition: major.tuition,
    duration: major.duration,
    risk: Boolean(major.risk),
    remark: major.remark || ''
  };
}

function compactGroup(group) {
  const majors = (group.majors || []).map(compactMajor);
  const warningPattern = /色觉|色盲|色弱|视力|体检|听力|嗅觉|口吃/;
  const warningMajors = majors.filter((major) => major.risk || warningPattern.test(`${major.name} ${major.remark}`));
  return {
    id: group.id,
    groupCode: group.groupCode,
    displayCode: group.displayCode,
    groupName: group.groupName,
    school: group.school,
    province: group.province,
    city: group.city,
    subject: group.subject,
    batch: group.batch,
    requirement: group.requirement,
    plan26: group.plan26,
    plan25: group.plan25,
    score25: group.score25,
    score24: group.score24,
    score23: group.score23,
    rank25: group.rank25,
    rank24: group.rank24,
    rank23: group.rank23,
    groupMajorCount: group.groupMajorCount,
    tags: (group.tags || []).slice(0, 8),
    majorSummary: group.majorSummary,
    majorClasses: group.majorClasses || [],
    majors,
    medicalWarning: warningMajors.length > 0,
    warningMajorNames: warningMajors.map((major) => major.baseName || major.name)
  };
}

function loadSchools() {
  const context = { window: { DB_PARTS: [] } };
  vm.createContext(context);
  const partFiles = fs.readdirSync(ROOT)
    .filter((name) => /^data-db-part-\d+\.js$/.test(name))
    .sort();
  for (const name of partFiles) {
    const content = fs.readFileSync(path.join(ROOT, name), 'utf8');
    vm.runInContext(content, context, { filename: name });
  }
  return { schools: context.window.DB_PARTS.flat(), partFiles };
}

function chooseGroups(groups) {
  const candidates = groups
    .filter((group) => group.subject === '物理')
    .filter((group) => group.batch === '本科批')
    .filter((group) => historyScores(group).length >= 2)
    .filter((group) => group.school && group.groupCode && group.majors?.length)
    .map((group) => ({ group, probability: probabilityFor(group) }))
    .filter(({ probability }) => probability >= 8 && probability <= 97);

  const chosen = [];
  const perSchool = new Map();
  const targetProbability = { chong: 27, wen: 60, bao: 90 };

  for (const level of ['chong', 'wen', 'bao']) {
    const bucket = candidates
      .filter(({ probability }) => riskLevel(probability) === level)
      .sort((left, right) => {
        const target = targetProbability[level];
        const distance = Math.abs(left.probability - target) - Math.abs(right.probability - target);
        if (distance !== 0) return distance;
        return String(left.group.school).localeCompare(String(right.group.school), 'zh-CN');
      });

    let count = 0;
    for (const item of bucket) {
      const schoolCount = perSchool.get(item.group.school) || 0;
      if (schoolCount >= 2) continue;
      chosen.push(item.group);
      perSchool.set(item.group.school, schoolCount + 1);
      count += 1;
      if (count >= PER_RISK_LEVEL) break;
    }
    if (count < PER_RISK_LEVEL) {
      throw new Error(`Not enough ${level} groups: ${count}/${PER_RISK_LEVEL}`);
    }
  }
  return chosen.map(compactGroup);
}

const { schools, partFiles } = loadSchools();
const groups = schools.flatMap((school) => school.groups || []);
const selectedGroups = chooseGroups(groups);
const payload = {
  meta: {
    generatedAt: new Date().toISOString(),
    source: '项目现有 2026 招生计划与 2023-2025 专业组最低分数据库',
    sourceFiles: partFiles,
    sampleScore: SAMPLE_SCORE,
    subject: '物理',
    batch: '本科批',
    selectionRule: '至少两年可用专业组最低分；每个冲稳保区间各 12 组；同校最多 2 组',
    totalSourceGroups: groups.length,
    previewGroups: selectedGroups.length
  },
  groups: selectedGroups
};

const output = `window.VOLUNTEER_SANDBOX_DATA = ${JSON.stringify(payload, null, 2)};\n`;
fs.writeFileSync(OUTPUT, output);

const summary = selectedGroups.reduce((result, group) => {
  const probability = probabilityFor(group);
  const level = riskLevel(probability);
  result[level] += 1;
  return result;
}, { chong: 0, wen: 0, bao: 0 });

console.log(JSON.stringify({ output: OUTPUT, groups: selectedGroups.length, summary }, null, 2));
