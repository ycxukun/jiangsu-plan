import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const sourcePath = process.argv[2];
const outputPath = process.argv[3];
if (!sourcePath || !outputPath) {
  throw new Error('用法: node generate_early_batch_groups.mjs <xlsx> <groups-2026.js>');
}

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const groups = [];

for (const sheet of workbook.worksheets.items) {
  const values = sheet.getUsedRange(true)?.values || [];
  if (values.length < 2) continue;
  const headers = values[0].map(value => String(value ?? '').trim());
  const indexOf = (...names) => {
    for (const name of names) {
      const index = headers.indexOf(name);
      if (index >= 0) return index;
    }
    return -1;
  };
  const subjectType = sheet.name.includes('物理') ? '物理类' : '历史类';
  const indexes = {
    code: indexOf('专业组代码', '院校组代号'), level: indexOf('院校层次'), province: indexOf('省份'), city: indexOf('城市'),
    school: indexOf('院校'), groupName: indexOf('院校专业组'), elective: indexOf('再选科目'), majorCode: indexOf('专业代号'),
    majorName: indexOf('专业名称'), score2026: indexOf('26投档线', '26投档最低分'), rank2026: indexOf('26投档位次'),
    plan2026: indexOf('2026计划'), plan2025: indexOf('2025计划'), admitted2025: indexOf('2025录取'),
    high2025: indexOf('2025最高分'), low2025: indexOf('2025最低分'), rank2025: indexOf('2025最低位次'),
    plan2024: indexOf('2024计划'), low2024: indexOf('2024最低分'), rank2024: indexOf('2024最低位次'),
    plan2023: indexOf('2023计划'), low2023: indexOf('2023最低分'), rank2023: indexOf('2023最低位次'),
    duration: indexOf('学制'), tuition: indexOf('学费'), category: indexOf('提前批类别')
  };
  const rowValue = (row, key) => indexes[key] >= 0 ? row[indexes[key]] : '';
  const grouped = new Map();
  for (const row of values.slice(1)) {
    const rawCode = String(rowValue(row, 'code') ?? '').trim();
    if (!rawCode) continue;
    const code = rawCode.padStart(6, '0');
    const groupName = String(rowValue(row, 'groupName') ?? '').trim();
    const categoryRaw = String(rowValue(row, 'category') ?? '').trim();
    const key = `${subjectType}|${code}`;
    if (!grouped.has(key)) {
      const school = String(rowValue(row, 'school') ?? '').trim() || groupName.replace(/\d{2}\s*$/, '').trim();
      grouped.set(key, {
        id: `${subjectType === '物理类' ? 'P' : 'H'}-${code}`, schoolCode: code.slice(0, 4), groupNo: code.slice(-2),
        subjectType, code, school, groupName,
        level: rowValue(row, 'level') ?? '', province: String(rowValue(row, 'province') ?? ''), city: String(rowValue(row, 'city') ?? ''),
        elective: String(rowValue(row, 'elective') ?? '不限'), categoryRaw,
        categoryId: categoryId(categoryRaw), gender: categoryRaw.includes('男') ? '男' : categoryRaw.includes('女') ? '女' : '不限',
        separateTrack: /^5|^8/.test(categoryRaw),
        score2026Values: [], rank2026Values: [], plan2026: 0, plan2025: 0, admitted2025: 0, plan2024: 0, plan2023: 0,
        sourceSheet: sheet.name, sourceRows: [], majors: []
      });
    }
    const group = grouped.get(key);
    if (group.categoryRaw !== categoryRaw) throw new Error(`${key} 出现多个提前批类别: ${group.categoryRaw} / ${categoryRaw}`);
    const score2026 = positiveNumber(rowValue(row, 'score2026'));
    const rank2026 = positiveNumber(rowValue(row, 'rank2026'));
    if (score2026) group.score2026Values.push(score2026);
    if (rank2026) group.rank2026Values.push(rank2026);
    group.plan2026 += numberOrZero(rowValue(row, 'plan2026'));
    group.plan2025 += numberOrZero(rowValue(row, 'plan2025'));
    group.admitted2025 += numberOrZero(rowValue(row, 'admitted2025'));
    group.plan2024 += numberOrZero(rowValue(row, 'plan2024'));
    group.plan2023 += numberOrZero(rowValue(row, 'plan2023'));
    group.sourceRows.push(values.indexOf(row) + 1);
    group.majors.push({
      code: String(rowValue(row, 'majorCode') ?? '').trim(), name: String(rowValue(row, 'majorName') ?? '').trim(),
      plan2026: numberOrNull(rowValue(row, 'plan2026')), plan2025: numberOrNull(rowValue(row, 'plan2025')),
      admitted2025: numberOrNull(rowValue(row, 'admitted2025')), high2025: positiveNumber(rowValue(row, 'high2025')),
      low2025: positiveNumber(rowValue(row, 'low2025')), rank2025: positiveNumber(rowValue(row, 'rank2025')),
      plan2024: numberOrNull(rowValue(row, 'plan2024')), low2024: positiveNumber(rowValue(row, 'low2024')), rank2024: positiveNumber(rowValue(row, 'rank2024')),
      plan2023: numberOrNull(rowValue(row, 'plan2023')), low2023: positiveNumber(rowValue(row, 'low2023')), rank2023: positiveNumber(rowValue(row, 'rank2023')),
      duration: rowValue(row, 'duration') ?? '', tuition: rowValue(row, 'tuition') ?? ''
    });
  }
  for (const group of grouped.values()) {
    group.score2026 = uniquePositive(group.score2026Values, `${group.id} 2026投档线`);
    group.rank2026 = uniquePositive(group.rank2026Values, `${group.id} 2026位次`);
    delete group.score2026Values;
    delete group.rank2026Values;
    const row2025 = minScoreRow(group.majors, 'low2025', 'rank2025');
    const row2024 = minScoreRow(group.majors, 'low2024', 'rank2024');
    const row2023 = minScoreRow(group.majors, 'low2023', 'rank2023');
    group.score2025 = row2025.score;
    group.rank2025 = row2025.rank;
    group.high2025 = maxPositive(group.majors.map(row => row.high2025));
    group.score2024 = row2024.score;
    group.rank2024 = row2024.rank;
    group.score2023 = row2023.score;
    group.rank2023 = row2023.rank;
    group.scoreDelta = group.score2026 && group.score2025 ? group.score2026 - group.score2025 : null;
    group.rankDelta = group.rank2026 && group.rank2025 ? group.rank2025 - group.rank2026 : null;
    group.planDelta = group.plan2026 - group.plan2025;
    group.planGrowthRate = group.plan2025 > 0 ? group.planDelta / group.plan2025 : null;
    group.scoreRankStatus = group.categoryId === 'comprehensive-a' && !group.score2026 && !group.rank2026
      ? 'not_applicable_comprehensive_a'
      : group.score2026 && group.rank2026 ? 'complete'
        : group.score2026 ? 'missing_rank' : group.rank2026 ? 'missing_score' : 'missing_both';
    group.verificationStatus = '用户提供工作簿，待与2026江苏官方招生计划及投档公告复核';
    groups.push(group);
  }
}

groups.sort((a, b) => a.subjectType.localeCompare(b.subjectType, 'zh-CN') || a.categoryRaw.localeCompare(b.categoryRaw, 'zh-CN') || a.school.localeCompare(b.school, 'zh-CN') || a.code.localeCompare(b.code));
const subjectCounts = Object.fromEntries([...new Set(groups.map(group => group.subjectType))].map(type => [type, groups.filter(group => group.subjectType === type).length]));
const categoryCounts = Object.fromEntries([...new Set(groups.map(group => group.categoryRaw))].sort().map(type => [type, groups.filter(group => group.categoryRaw === type).length]));
if (groups.length !== 499 || subjectCounts['物理类'] !== 353 || subjectCounts['历史类'] !== 146) {
  throw new Error(`专业组数量不符: total=${groups.length}, physics=${subjectCounts['物理类']}, history=${subjectCounts['历史类']}`);
}
const ids = new Set(groups.map(group => group.id));
if (ids.size !== groups.length) throw new Error('专业组主键不唯一');

const payload = {
  meta: {
    year: 2026, province: '江苏', sourceId: 'xlsx-2026-early-batch-analysis', sourceTitle: '2026 提前批次分析.xlsx',
    sourceType: '用户提供工作簿', verificationStatus: '待与2026江苏官方招生计划及投档公告逐项复核',
    groupCount: groups.length, majorCount: groups.reduce((sum, group) => sum + group.majors.length, 0),
    schoolCount: new Set(groups.map(group => group.school)).size, subjectCounts, categoryCounts,
    aggregation: '一行一个选科/类别/院校/专业组；2026为组投档线，2025为组内专业录取最低分，跨年变化仅为参考口径；历史最低分取正数最小值，位次取该最低分对应最大有效位次；分位缺失保留null，计划0保留。'
  },
  groups
};
const output = `/* 由用户提供的《2026 提前批次分析.xlsx》结构化生成。不要手工改写统计字段。 */\nwindow.EARLY_BATCH_GROUPS_2026=${JSON.stringify(payload)};\n`;
await fs.writeFile(outputPath, output, 'utf8');
console.log(JSON.stringify({ outputPath, groups: groups.length, subjectCounts, categoryCounts, bytes: Buffer.byteLength(output) }, null, 2));

function categoryId(value) {
  if (/^1/.test(value)) return 'military';
  if (/^2/.test(value)) return 'police';
  if (/^3/.test(value)) return 'maritime';
  if (/^4/.test(value)) return 'local-special';
  if (/^5/.test(value)) return 'university-special';
  if (/^6/.test(value)) return 'medical';
  if (/^7/.test(value)) return 'other';
  if (/^8/.test(value)) return 'comprehensive-a';
  throw new Error(`未知提前批类别: ${value}`);
}
function numberOrZero(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function numberOrNull(value) { if (value === '' || value === null || value === undefined) return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function positiveNumber(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function maxPositive(values) { const valid = values.filter(value => value && value > 0); return valid.length ? Math.max(...valid) : null; }
function uniquePositive(values, label) {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length > 1) throw new Error(`${label} 出现多个有效值: ${unique.join(', ')}`);
  return unique[0] ?? null;
}
function minScoreRow(majors, scoreKey, rankKey) {
  const candidates = majors.filter(row => row[scoreKey] && row[scoreKey] > 0);
  if (!candidates.length) return { score: null, rank: null };
  const score = Math.min(...candidates.map(row => row[scoreKey]));
  const ranks = candidates.filter(row => row[scoreKey] === score).map(row => row[rankKey]).filter(value => value && value > 0);
  return { score, rank: ranks.length ? Math.max(...ranks) : null };
}
