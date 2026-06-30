









const APP_VERSION = 'V11 稳定回归版｜极小分片｜三年均分位次';
const CACHE_VERSION = '20260630-v11-three-year-avg';
window.PROVINCE_REGION_ORDER = window.PROVINCE_REGION_ORDER || [
  {name:'华东地区', provinces:['上海','江苏','浙江','安徽','福建','江西','山东']},
  {name:'华中地区', provinces:['河南','湖北','湖南']},
  {name:'华北地区', provinces:['北京','天津','河北','山西','内蒙古']},
  {name:'华南地区', provinces:['广东','广西','海南','香港']},
  {name:'西南地区', provinces:['重庆','四川','贵州','云南','西藏']},
  {name:'西北地区', provinces:['陕西','甘肃','青海','宁夏','新疆']},
  {name:'东北地区', provinces:['辽宁','吉林','黑龙江']}
];
document.addEventListener('DOMContentLoaded', function(){
  if(typeof detailForMajor!=='function' || typeof renderGroup!=='function') return;
  const HISTORY_YEARS_RUNTIME = [2025, 2024, 2023];
  const majorHistoryAvgRuntimeCache = new WeakMap();
  const groupHistoryAvgRuntimeCache = new WeakMap();
  function positiveNumberRuntime(v){const n=Number(v); return Number.isFinite(n) && n>0 ? n : null;}
  function avgValueRuntime(values){const arr=(values||[]).filter(v=>Number.isFinite(v)); return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;}
  function yearScoreRuntime(d,m,year){return positiveNumberRuntime(d?.[`${year}最低分`]) ?? (year===2025 ? positiveNumberRuntime(m?.score25) : null);}
  function yearRankRuntime(d,m,year){return positiveNumberRuntime(d?.[`${year}最低位次`]) ?? (year===2025 ? positiveNumberRuntime(m?.rank25) : null);}
  function yearPlanWeightRuntime(d,m,year){return positiveNumberRuntime(d?.[`${year}计划`]) ?? (year===2025 ? positiveNumberRuntime(m?.plan25) : null) ?? 1;}
  function majorHistoryAverageRuntime(m){
    if(!m || typeof m!=='object') return {score:null,rank:null,yearCount:0};
    if(majorHistoryAvgRuntimeCache.has(m)) return majorHistoryAvgRuntimeCache.get(m);
    const d=detailForMajor(m) || {};
    const years=new Set(), scores=[], ranks=[];
    HISTORY_YEARS_RUNTIME.forEach(year=>{
      const score=yearScoreRuntime(d,m,year);
      const rank=yearRankRuntime(d,m,year);
      if(score || rank) years.add(year);
      if(score) scores.push(score);
      if(rank) ranks.push(rank);
    });
    const out={score:avgValueRuntime(scores),rank:avgValueRuntime(ranks),yearCount:years.size};
    majorHistoryAvgRuntimeCache.set(m,out);
    return out;
  }
  function groupHistoryAverageRuntime(g){
    if(!g || typeof g!=='object') return {score:null,rank:null,yearCount:0};
    if(groupHistoryAvgRuntimeCache.has(g)) return groupHistoryAvgRuntimeCache.get(g);
    let scoreSum=0, scoreWeight=0, rankSum=0, rankWeight=0;
    const years=new Set();
    (g.majors||[]).forEach(m=>{
      const d=detailForMajor(m) || {};
      HISTORY_YEARS_RUNTIME.forEach(year=>{
        const score=yearScoreRuntime(d,m,year);
        const rank=yearRankRuntime(d,m,year);
        if(score || rank) years.add(year);
        const weight=yearPlanWeightRuntime(d,m,year);
        if(score){scoreSum+=score*weight; scoreWeight+=weight;}
        if(rank){rankSum+=rank*weight; rankWeight+=weight;}
      });
    });
    const out={score:scoreWeight ? scoreSum/scoreWeight : null, rank:rankWeight ? rankSum/rankWeight : null, yearCount:years.size};
    groupHistoryAvgRuntimeCache.set(g,out);
    return out;
  }
  function hasHistoryAverageRuntime(avg){return !!avg && (Number.isFinite(avg.score) || Number.isFinite(avg.rank));}
  function formatAvgScoreRuntime(v){if(!Number.isFinite(v)) return '—'; const rounded=Math.round(v*10)/10; return Number.isInteger(rounded) ? fmt(rounded) : rounded.toFixed(1);}
  function formatAvgRankRuntime(v){return Number.isFinite(v) ? fmt(Math.round(v)) : '—';}
  function historyAverageTextRuntime(avg,showYearCount=false){
    if(!hasHistoryAverageRuntime(avg)) return '—';
    const suffix=showYearCount && avg.yearCount>0 && avg.yearCount<3 ? `（${avg.yearCount}年）` : '';
    return `${formatAvgScoreRuntime(avg.score)} / ${formatAvgRankRuntime(avg.rank)}${suffix}`;
  }
  function historyAverageTitleRuntime(avg){
    const count=avg?.yearCount || 0;
    return `按2023-2025中有有效分/位次的年份平均${count ? `，覆盖${count}年` : ''}`;
  }
  function historyAverageCellRuntime(avg){
    if(!hasHistoryAverageRuntime(avg)) return '—';
    return `<span title="${esc(historyAverageTitleRuntime(avg))}">${historyAverageTextRuntime(avg,true)}</span>`;
  }
  function historyAveragePillRuntime(avg,label='三年均分/位次'){
    if(!hasHistoryAverageRuntime(avg)) return '';
    return `<span class="detail-pill" title="${esc(historyAverageTitleRuntime(avg))}">${label} ${historyAverageTextRuntime(avg,true)}</span>`;
  }
  if(typeof compactScore==='function'){
    compactScore = function(g){
      const a=[];
      const hist=groupHistoryAverageRuntime(g);
      if(g.avgScore) a.push(`<span>25均分 ${fmt(g.avgScore)}</span>`);
      if(g.avgRank) a.push(`<span>位次 ${fmt(g.avgRank)}</span>`);
      if(hasHistoryAverageRuntime(hist)) a.push(`<span title="${esc(historyAverageTitleRuntime(hist))}">三年均分/位次 ${historyAverageTextRuntime(hist)}</span>`);
      if(g.majorCount) a.push(`<span>专业 ${fmt(g.majorCount)}</span>`);
      return a.join('');
    };
  }
  const originalRenderHome = typeof renderHome==='function' ? renderHome : null;
  if(originalRenderHome){
    renderHome = function(){
      originalRenderHome();
      const main=$('main');
      if(main) main.innerHTML=main.innerHTML.replace('25均分、位次、计划25→26','25均分、位次、三年均分/位次、计划25→26');
    };
  }
  renderGroup = function(g){
    const legacyClass=g.legacyOnly?'legacy':'';
    const assess=groupAssessment(g);
    const pc=planAudit(g);
    const compactMeta=[compactScore(g), planCompact(pc,g)].filter(Boolean).join('');
    const rows=g.majors.map((m,idx)=>{
      const vr=majorVisualRisk(m,g);
      const rowCls=vr.level==='danger'?'major-danger':(vr.level==='warn'?'major-warn':'');
      const scoreRank=(m.score25||m.rank25) ? `${m.score25?fmt(m.score25):'—'} / ${m.rank25?fmt(m.rank25):'—'}` : '—';
      const histAvg=majorHistoryAverageRuntime(m);
      return `<tr class="${rowCls}"><td>${esc(m.code||'—')}</td><td><div class="major-name major-click" onclick="openMajorDetail('${esc(g.id)}',${idx})">${iconSvg(m.direction)}${esc(m.name)}${majorRiskTagHtml(vr)}</div></td><td>${esc(m.majorClass||'—')}</td><td>${fmt(m.plan26)}</td><td>${majorPlanCell(m)}</td><td>${scoreRank}</td><td>${historyAverageCellRuntime(histAvg)}</td><td><button class="btn detail-btn" onclick="openMajorDetail('${esc(g.id)}',${idx})">详情</button></td></tr>`;
    }).join('');
    return `<article class="group-card ${g.bucket} ${assess.cls} ${legacyClass} ${isNewGroupStrict(g)?'new-group-card':''}" id="grp-${cssId(g.id)}"><div class="group-head compact-head"><div class="group-head-main"><div><div class="group-title">${esc(g.groupCode)}组｜${esc(groupDisplayTitle(g))}</div>${groupAttrTagHtml(g)}</div><div class="actions"><button class="btn" onclick="openEvo('${esc(g.id)}')">前世今生</button></div></div><div class="compact-line">${compactMeta}</div></div><div class="table-wrap"><table><thead><tr><th>代码</th><th>专业名称</th><th>专业类</th><th>26计划</th><th>25计划/变化</th><th>25分/位次</th><th>三年均分/位次</th><th>专业详情</th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="empty">2026 当前批次未见在招专业。请查看前世今生核对。</td></tr>'}</tbody></table></div></article>`;
  };
  openMajorDetail = function(groupId, majorIndex){
    const g=findGroup(groupId); if(!g) return;
    const m=(g.majors||[])[majorIndex]; if(!m) return;
    const d=detailForMajor(m) || {};
    $('modalTitle').textContent=`${m.school}｜${g.groupCode}组｜${m.name}`;
    const planDelta=safeNum(m.plan26)-safeNum(m.plan25);
    const histAvg=majorHistoryAverageRuntime(m);
    const lead=[
      `<span class="detail-pill">${esc(m.subject||g.subject||'')}</span>`,
      `<span class="detail-pill">${esc(m.batch||g.batch||'')}</span>`,
      `<span class="detail-pill">${esc(g.groupCode)}组</span>`,
      `<span class="detail-pill">计划 ${fmt(safeNum(m.plan25))}→${fmt(safeNum(m.plan26))}（${planDelta>0?`+${fmt(planDelta)}`:fmt(planDelta)}）</span>`,
      (m.score25||m.rank25)?`<span class="detail-pill">25分/位次 ${m.score25?fmt(m.score25):'—'} / ${m.rank25?fmt(m.rank25):'—'}</span>`:'',
      historyAveragePillRuntime(histAvg)
    ].filter(Boolean).join('');
    const sections=[
      sectionHTML('培养属性', [...propertyRowsFromMajor(m,d), ['专业名称', d['专业名称'] || m.name], ['本科专业名称', d['本科专业名称']], ['本科专业类', d['本科专业类'] || m.majorClass], ['研究生学科专业', d['研究生学科专业']], ['再选科目', d['再选科目'] || g.elective], ['学制', d['学制'] || m.years], ['学费', d['学费'] || m.tuition], ['专业录取规则', d['专业录取规则']]]),
      sectionHTML('学科实力', [['院校层次', d['院校层次'] || m.level], ['保研率', d['保研率']], ['软科学校排名', d['软科学校排名']], ['硕博点', d['硕博']], ['第四轮评估', d['第四轮评估']], ['第五轮A', d['第五轮A']], ['一流/101', d['一流/101']], ['软科专业排名', d['软科专业排名']]]),
      sectionHTML('计划与录取', [['2026计划', d['2026计划'] || m.plan26], ['2025计划', d['2025计划'] || m.plan25], ['2025录取', d['2025录取'] || m.admit25], ['2025最高分', d['2025最高分'] || m.max25], ['2025最低分', d['2025最低分'] || m.score25], ['2025最低位次', d['2025最低位次'] || m.rank25], ['三年平均分', hasHistoryAverageRuntime(histAvg) ? formatAvgScoreRuntime(histAvg.score) : ''], ['三年平均位次', hasHistoryAverageRuntime(histAvg) ? formatAvgRankRuntime(histAvg.rank) : ''], ['2024计划', d['2024计划']], ['2024最低分', d['2024最低分']], ['2024最低位次', d['2024最低位次']], ['2023计划', d['2023计划']], ['2023最低分', d['2023最低分']], ['2023最低位次', d['2023最低位次']]]),
      sectionHTML('其他信息', [['省份', d['省份'] || m.province], ['城市', d['城市'] || m.city], ['院校专业组', d['院校专业组']], ['院校组代号', d['院校组代号']], ['专业代号', d['专业代号'] || m.code], ['志愿标注', d['志愿标注']], ['提前批类别', d['提前批类别']], ['去年辅助', d['去年辅助']], ['辅助', d['辅助']], ['来源表', d['__sheet']]])
    ].filter(Boolean).join('');
    $('modalBody').innerHTML = `<div class="detail-lead">${lead}</div>${sections || '<div class="empty">该专业暂无可展示明细。</div>'}`;
    $('modal').classList.add('open');
  };
  exportCSV = function(){
    const s=findSchool(state.selected); if(!s) return;
    const lines=[['学校','批次','科类','专业组','专业组名称','专业组类型','再选','组内颜色','专业匹配度','风险等级','25对照组计划','26组计划','组计划增减','组计划口径','25加权均分','三年平均分','三年平均位次','模拟参考分','模拟区间','筛选分','模拟依据','专业代码','专业名称','专业类','标签','26专业计划','25专业计划','行级增减','25最低分','25最低位次','专业三年平均分','专业三年平均位次','风险提示']];
    s.groups.forEach(g=>{
      if(!groupMatchesBase(g)) return;
      const pc=planAudit(g); const groupHist=groupHistoryAverageRuntime(g);
      g.majors.forEach(m=>{
        const majorHist=majorHistoryAverageRuntime(m);
        lines.push([s.name,s.batch,s.subject,g.groupCode,groupDisplayTitle(g),(g.typeTags||[]).map(typeTagLabel).join('|'),g.elective,groupAssessment(g).label,groupAssessment(g).score,g.riskLevel,pc.oldPlan??'待核对',pc.plan26,pc.delta??'待核对',pc.basis,g.avgScore||'',hasHistoryAverageRuntime(groupHist)?formatAvgScoreRuntime(groupHist.score):'',hasHistoryAverageRuntime(groupHist)?formatAvgRankRuntime(groupHist.rank):'',g.predScore||'',(g.predLow!==null&&g.predHigh!==null)?`${g.predLow}-${g.predHigh}`:'',scoreForFilter(g)||'',g.predBasis||'',m.code,m.name,m.majorClass||'',(m.labels||[]).join('|'),m.plan26,m.plan25,(m.plan26||0)-(m.plan25||0),m.score25||'',m.rank25||'',hasHistoryAverageRuntime(majorHist)?formatAvgScoreRuntime(majorHist.score):'',hasHistoryAverageRuntime(majorHist)?formatAvgRankRuntime(majorHist.rank):'',(m.auditNote||m.riskTip||'')]);
      });
    });
    const csv=lines.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${s.name}_${s.subject}_${s.batch}_专业组变化.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  if(typeof render==='function') render();
});
const DB = JSON.parse(window.__DB_JSON_PARTS.join(''));
window.__DB_JSON_PARTS = null;
