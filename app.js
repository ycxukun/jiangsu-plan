(function(){
'use strict';
const VERSION='2026在招专业组版｜V1.1.24 未选专业标红导出版';
const SUPABASE_URL='';
const SUPABASE_ANON_KEY='';
const ADMIN_EMAIL='ycxukun@gmail.com';
const GISCUS_CONFIG={
  repo:'ycxukun/jiangsu-plan',
  repoId:'R_kgDOTIG-gg',
  category:'批注',    // GitHub Discussions 分类名
  categoryId:'DIC_kwDOTIG-gs4DAM7P',
  theme:'light',
  lang:'zh-CN'
};
const disciplineOrder=['工学','理学','农学','医学','经济学','管理学','法学','教育学','文学/历史/哲学','艺术学','其他'];
const hotOrder=['计算机类','电子信息类','电气类','自动化类','机械类','临床医学类','口腔医学类','金融学类','法学类','数学类','统计学类'];
let DB=Array.isArray(window.DB)?window.DB:[];
let DETAILS=window.MAJOR_DETAILS||{};
let GROUP_NAMING=window.GROUP_NAMING||{};
let GROUP_CHANGES=window.GROUP_CHANGES||{};
let state={batch:'',subject:'',selectedProvinces:new Set(),selectedLevels:new Set(),selectedRequirements:new Set(),role:'',mode:'schools',q:'',selectedClasses:new Set(),scoreRange:null,compact:true,activeSchoolId:null,filtered:[]};
let notes={schools:{},groups:{},majors:{}};
let auth={accessToken:'',user:null};
const VOLUNTEER_LIMIT=40;
const MAX_MAJOR_PER_GROUP=6;
const VOLUNTEER_STORAGE_KEY='js-plan-volunteer-groups-v1';
const VOLUNTEER_MAJOR_STORAGE_KEY='js-plan-volunteer-major-keys-v2';
const VOLUNTEER_META_STORAGE_KEY='js-plan-volunteer-meta-v1';
let volunteerKeys=loadVolunteerKeys();
let volunteerMajorKeys=loadVolunteerMajorKeys();
let volunteerMeta=loadVolunteerMeta();
let volunteerDragKey='';
let volunteerSearchQuery='';
let volunteerFilterMode='';
let volunteerAllExpanded=false;
let volunteerExpandedKeys=new Set();
let volunteerMajorPoolFilter={};
let groupIndex=new Map();
let majorRefs=[];
let majorRefsBySchool=new Map();
let majorRefsByBucket=new Map();
let rankRefsBySubjectBatch=new Map();
let predictionCache=new Map();
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const fmt=v=>v===null||v===undefined||v===''?'—':String(v);
const fmtNum=v=>v===null||v===undefined||v===''?'—':(typeof v==='number'?Number(v.toFixed? v.toFixed(1):v):v);
const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const keySchool=s=>`${s.subject}|${s.batch}|${s.name}`;
const keyGroup=(s,g)=>`${s.subject}|${s.batch}|${s.name}|${g.groupName}`;
const keyMajor=m=>m.key;
function loadVolunteerKeys(){try{const arr=JSON.parse(localStorage.getItem(VOLUNTEER_STORAGE_KEY)||'[]'); return Array.isArray(arr)?arr.filter(x=>typeof x==='string').slice(0,VOLUNTEER_LIMIT):[];}catch(e){return [];}}
function saveVolunteerKeys(){try{localStorage.setItem(VOLUNTEER_STORAGE_KEY,JSON.stringify(volunteerKeys));}catch(e){}}
function loadVolunteerMajorKeys(){try{const data=JSON.parse(localStorage.getItem(VOLUNTEER_MAJOR_STORAGE_KEY)||'{}'); return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(e){return {};}}
function saveVolunteerMajorKeys(){try{localStorage.setItem(VOLUNTEER_MAJOR_STORAGE_KEY,JSON.stringify(volunteerMajorKeys));}catch(e){}}
function loadVolunteerMeta(){try{const data=JSON.parse(localStorage.getItem(VOLUNTEER_META_STORAGE_KEY)||'{}'); return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(e){return {};}}
function saveVolunteerMeta(){try{localStorage.setItem(VOLUNTEER_META_STORAGE_KEY,JSON.stringify(volunteerMeta));}catch(e){}}
const coldMajorPattern=/材料|化工|化学类|应用化学|环境|生态|生物|食品|地质|地球物理|测绘|遥感|地理空间|土木|建筑|交通运输|安全|消防|矿|采矿|资源|海洋|农业|农学|林学|水产|动物|植物|草学|轻工|纺织|服装|旅游管理|酒店管理|外国语言|翻译|俄语|日语|法语|西班牙语|朝鲜语|印地语|哲学|历史学|考古|图书馆|档案|社会学|公共管理|行政管理|戏剧影视|广播电视编导/;
const hotMajorPattern=/计算机|软件|人工智能|智能科学|数据科学|网络空间|电子信息|通信工程|微电子|集成电路|电气工程|自动化|临床医学|口腔医学|法学|会计学|金融学|数学|统计/;
function normalize(s){return String(s??'').toLowerCase().replace(/\s+/g,'');}
function formatSigned(v){if(v===null||v===undefined||v==='')return '—'; return `${v>0?'+':''}${v}`;}
function signedClass(v){return v>0?'change-pos':v<0?'change-neg':'';}
function planChangeInline(v){if(v===null||v===undefined||v==='')return '—'; return `<span class="${signedClass(v)}">${formatSigned(v)}</span>`;}
function planDeltaBadge(v){if(v===null||v===undefined||v==='')return ''; const cls=signedClass(v); const label=v>0?'计划增加':v<0?'计划减少':'计划持平'; return `<span class="badge ${v>0?'green':v<0?'red':''} ${cls}">${label} ${formatSigned(v)}</span>`;}
function groupNamingMeta(s,g){
  const meta=GROUP_NAMING[keyGroup(s,g)]||null;
  return meta&&meta.sourceYear===2026?meta:null;
}
function classBucket(c){
  const t=String(c||'');
  if(/计算机|软件|网络空间|数据科学|智能科学/.test(t))return '计算机';
  if(/电子信息|通信|微电子|集成电路|光电|电子科学/.test(t))return '电子信息';
  if(/电气|自动化|机器人工程|仪器|测控/.test(t))return '电气自动化';
  if(/临床医学|口腔|医学技术|基础医学|中医学|药学|护理/.test(t))return '医药';
  if(/数学|统计|物理|天文|力学/.test(t))return '数理基础';
  if(/金融|经济|财政|经贸|工商管理|管理科学|会计|财务|电子商务|物流|工业工程/.test(t))return '经管';
  if(/法学|公安|马克思|政治|社会学/.test(t))return '法政公安';
  if(/中国语言|外国语言|新闻传播|历史|哲学|图书|戏剧|艺术/.test(t))return '文史语言新闻';
  if(/材料/.test(t))return '材料';
  if(/化学|化工|制药/.test(t))return '化工';
  if(/生物|食品|环境|生态|农学|林学|水产|动物|植物/.test(t))return '生物食品环境';
  if(/土木|建筑|交通|测绘|地理|地质|地球|海洋|矿业|安全/.test(t))return '土木建筑交通';
  if(/能源|核工程/.test(t))return '能源动力';
  if(/机械|车辆|航空航天|兵器/.test(t))return '机械车辆';
  if(/大类|试验|交叉/.test(t))return '试验班未细分';
  return t.replace(/类$/,'')||'其他未细分';
}
function groupBucketStats(g){
  const map=new Map();
  const add=(bucket,plan)=>{
    if(!bucket)return;
    const old=map.get(bucket)||{bucket,plan:0,count:0};
    old.plan+=Number(plan)||0;
    old.count+=1;
    map.set(bucket,old);
  };
  (g.majors||[]).forEach(m=>add(classBucket(m.majorClass||m.name),m.plan26||1));
  if(!map.size)(g.majorClasses||[]).forEach(c=>add(classBucket(c),1));
  return [...map.values()].sort((a,b)=>(b.plan-a.plan)||(b.count-a.count)||a.bucket.localeCompare(b.bucket,'zh-Hans-CN'));
}
function cooperationSuffix(g){
  const text=`${(g.tags||[]).join(' ')} ${g.remark||''} ${(g.majors||[]).map(m=>m.name).join(' ')}`;
  if(/中外合作|合作办学/.test(text))return '（中外合作）';
  if(/联合培养|双学位/.test(text))return '（联合培养）';
  return '';
}
function inferGroupName(g){
  const stats=groupBucketStats(g);
  const suffix=cooperationSuffix(g);
  if(!stats.length)return suffix.replace(/[（）]/g,'');
  const buckets=stats.map(x=>x.bucket);
  if(buckets.length===1)return `${buckets[0]}组${suffix}`;
  if(buckets.length<=4)return `${buckets.join('、')}复合组${suffix}`;
  return `${buckets.slice(0,4).join('、')}等混合组${suffix}`;
}
function groupDisplayName(s,g){return groupNamingMeta(s,g)?.name||inferGroupName(g);}
function groupDisplayTitleText(s,g){const name=groupDisplayName(s,g); return name?`${g.groupName} ${name}`:g.groupName;}
function groupTitleHTML(s,g){const name=groupDisplayName(s,g); return `${esc(g.groupName)}${name?` <span class="group-name-label">${esc(name)}</span>`:''}`;}
function isColdMajor(m){
  const text=`${m.name||''} ${m.majorClass||''} ${m.discipline||''}`;
  if(hotMajorPattern.test(text)&&!/中外合作|地质|地球物理|测绘|地理空间|环境|化工|材料|生物|食品|土木|建筑/.test(text))return false;
  return coldMajorPattern.test(text);
}
function groupQuality(s,g){
  const majors=g.majors||[];
  const meta=groupNamingMeta(s,g);
  const riskCount=majors.filter(m=>m.risk).length;
  const coldCount=majors.filter(isColdMajor).length;
  const total=majors.length||0;
  const name=groupDisplayName(s,g);
  const allCold=total>0&&(riskCount===total||coldCount===total||(coldCount/total>=0.75&&riskCount/total>=0.5));
  if(allCold)return {tone:'yellow',label:'整体冷门',title:`整组以冷门/风险专业为主：${coldCount}/${total} 个冷门，${riskCount}/${total} 个已标风险`};
  if(riskCount>0)return {tone:'red',label:`含风险专业 ${riskCount} 个`,title:`组内夹有相对风险专业：${riskCount}/${total} 个`};
  return {tone:'green',label:'干净组',title:'组内未发现风险专业，结构相对清爽'};
}
function groupQualityBadge(status){return `<span class="group-quality-badge ${status.tone}" title="${esc(status.title)}">${esc(status.label)}</span>`;}
function groupChangeKey(s,g){return keyGroup(s,g);}
function groupChangeData(s,g){return GROUP_CHANGES[groupChangeKey(s,g)]||null;}
function pushMapList(map,key,value){
  if(!map.has(key))map.set(key,[]);
  map.get(key).push(value);
}
function detailOf(m){return DETAILS[m.key]||{};}
function cleanMajorText(v){
  return normalize(String(v||'')
    .replace(/（[^）]*）|\([^)]*\)|\[[^\]]*\]|【[^】]*】/g,'')
    .replace(/专业|大类|类$/g,''));
}
function majorInfo(m){
  const d=detailOf(m);
  const majorClass=m.majorClass||d.majorClass||'';
  return {
    name:m.name||d.name||'',
    majorClass,
    discipline:m.discipline||d.discipline||'',
    undergraduateName:d.undergraduateName||'',
    subjectMajor:d.subjectMajor||'',
    bucket:classBucket(majorClass||m.name||d.undergraduateName),
    base:cleanMajorText(d.undergraduateName||m.name||d.name)
  };
}
function buildPredictionIndexes(){
  majorRefs=[];
  majorRefsBySchool=new Map();
  majorRefsByBucket=new Map();
  rankRefsBySubjectBatch=new Map();
  predictionCache=new Map();
  DB.forEach(s=>(s.groups||[]).forEach(g=>(g.majors||[]).forEach(m=>{
    const score=num(m.score25);
    if(score===null)return;
    const rank=num(m.rank25);
    const info=majorInfo(m);
    const ref={s,g,m,score,rank,school:s.name,subject:s.subject,batch:s.batch,level:String(s.level||''),groupName:g.groupName,...info};
    majorRefs.push(ref);
    pushMapList(majorRefsBySchool,`${s.subject}|${s.batch}|${s.name}`,ref);
    pushMapList(majorRefsByBucket,`${s.subject}|${s.batch}|${String(s.level||'')}|${info.bucket}`,ref);
    pushMapList(majorRefsByBucket,`${s.subject}|${s.batch}|*|${info.bucket}`,ref);
    if(rank!==null)pushMapList(rankRefsBySubjectBatch,`${s.subject}|${s.batch}`,{score,rank});
  })));
}
function splitGroupNames(v){
  return String(v||'').split(/[；;、,，/]+/).map(x=>x.trim()).filter(Boolean);
}
function changeSourceGroups(s,g){
  const d=groupChangeData(s,g);
  const names=new Set();
  if(!d)return names;
  splitGroupNames(d.group25).forEach(x=>names.add(x));
  ['add','in','remove','out'].forEach(k=>(d.details?.[k]||[]).forEach(item=>{
    splitGroupNames(item.from).forEach(x=>names.add(x));
    splitGroupNames(item.to).forEach(x=>names.add(x));
  }));
  return names;
}
function majorSimilarity(m,ref,sourceGroups){
  const info=majorInfo(m);
  let score=0;
  if(sourceGroups.has(ref.groupName))score+=70;
  if(info.base&&ref.base){
    if(info.base===ref.base)score+=90;
    else if(info.base.includes(ref.base)||ref.base.includes(info.base))score+=55;
  }
  const text=normalize(info.name);
  if(ref.base&&text.includes(ref.base))score+=30;
  if(info.majorClass&&info.majorClass===ref.majorClass)score+=25;
  if(info.bucket&&info.bucket===ref.bucket)score+=18;
  if(info.discipline&&info.discipline===ref.discipline)score+=8;
  const sm=normalize(info.subjectMajor), rm=normalize(ref.subjectMajor);
  if(sm&&rm&&(sm.includes(rm)||rm.includes(sm)))score+=15;
  return score;
}
function bestMajorReference(s,g,m){
  const sourceGroups=changeSourceGroups(s,g);
  const schoolRefs=majorRefsBySchool.get(`${s.subject}|${s.batch}|${s.name}`)||[];
  const info=majorInfo(m);
  const bucketRefs=majorRefsByBucket.get(`${s.subject}|${s.batch}|${String(s.level||'')}|${info.bucket}`)
    ||majorRefsByBucket.get(`${s.subject}|${s.batch}|*|${info.bucket}`)||[];
  const pick=(refs,minScore)=>{
    let best=null;
    refs.forEach(ref=>{
      const match=majorSimilarity(m,ref,sourceGroups);
      if(!best||match>best.match)best={ref,match};
    });
    return best&&best.match>=minScore?best:null;
  };
  const sourceRefs=schoolRefs.filter(ref=>sourceGroups.has(ref.groupName));
  return pick(sourceRefs,50)||pick(schoolRefs,72)||pick(bucketRefs,98);
}
function predictionAdjustment(m,g){
  const text=`${m.name||''} ${m.majorClass||''} ${(g.tags||[]).join(' ')} ${g.remark||''}`;
  const size=(g.majors||[]).length;
  let adj=0;
  const reasons=[];
  if(hotMajorPattern.test(text)&&!isColdMajor(m)){adj+=3; reasons.push('热门方向 +3');}
  if(/人工智能|计算机科学与技术|软件工程|集成电路|微电子|口腔医学|临床医学|法学/.test(text)){adj+=2; reasons.push('强需求专业 +2');}
  if(/至诚|拔尖|卓越|实验|试验|本博|八年|双学士|未来技术|创新班|书院/.test(text)){adj+=3; reasons.push('培养模式 +3');}
  if(size===1){adj+=2; reasons.push('专业单列 +2');}
  else if(size===2){adj+=1; reasons.push('小组单列 +1');}
  const plan=num(m.plan26)||num(g.plan26);
  if(plan!==null&&plan<=2){adj+=2; reasons.push('计划少 +2');}
  else if(plan!==null&&plan<=5){adj+=1; reasons.push('计划偏少 +1');}
  else if(plan!==null&&plan>=80){adj-=2; reasons.push('计划多 -2');}
  else if(plan!==null&&plan>=30){adj-=1; reasons.push('计划偏多 -1');}
  if(/中外合作|合作办学|学分互认|中澳|中美|中英|国际|境外|出国/.test(text)){adj-=8; reasons.push('合作/出国成本 -8');}
  if(isColdMajor(m)){adj-=4; reasons.push('冷门或风险方向 -4');}
  if(m.risk){adj-=2; reasons.push('已标风险 -2');}
  return {adj:Math.max(-15,Math.min(12,adj)),reasons};
}
function estimateRankForScore(subject,batch,score,fallbackRank){
  const fallback=num(fallbackRank);
  const arr=rankRefsBySubjectBatch.get(`${subject}|${batch}`)||[];
  if(!arr.length)return fallback;
  let best=null;
  arr.forEach(x=>{
    const dist=Math.abs(x.score-score);
    if(!best||dist<best.dist)best={...x,dist};
  });
  return best?Math.round(best.rank):fallback;
}
function predictMajorScore(s,g,m){
  const avg=num(m.avgScore3);
  if(avg!==null&&(m.avgYears||0)>=2){
    const adj=predictionAdjustment(m,g);
    const score=Math.round(avg+adj.adj);
    return {score,rank:estimateRankForScore(s.subject,s.batch,score,m.avgRank3),confidence:'中',source:`本专业三年均分 ${fmtNum(avg)}`,adjustment:adj.reasons.join('；')};
  }
  const best=bestMajorReference(s,g,m);
  if(!best)return null;
  const adj=predictionAdjustment(m,g);
  const score=Math.round(best.ref.score+adj.adj);
  const confidence=best.match>=145?'高':best.match>=95?'中':'低';
  return {
    score,
    rank:estimateRankForScore(s.subject,s.batch,score,best.ref.rank),
    confidence,
    source:`参考 ${best.ref.groupName}｜${best.ref.name} ${fmtNum(best.ref.score)}分`,
    adjustment:adj.reasons.join('；')
  };
}
function predictGroupScore(s,g){
  if(num(g.score25)!==null)return null;
  const cacheKey=keyGroup(s,g);
  if(predictionCache.has(cacheKey))return predictionCache.get(cacheKey);
  const scores=[];
  (g.majors||[]).forEach(m=>{
    const actual=num(m.score25);
    if(actual!==null){
      scores.push({score:actual,rank:num(m.rank25),confidence:'高',source:`${m.name} 25年真实分`,adjustment:''});
      return;
    }
    const pred=predictMajorScore(s,g,m);
    if(pred)scores.push(pred);
  });
  let result=null;
  if(scores.length){
    scores.sort((a,b)=>a.score-b.score);
    const floor=scores[0];
    const eq=num(g.score26Eq);
    let score=floor.score;
    if(eq!==null){
      score=Math.round((eq*0.7)+(floor.score*0.3));
      if(Math.abs(eq-floor.score)>18)score=Math.max(eq-12,Math.min(eq+8,score));
    }
    const rank=estimateRankForScore(s.subject,s.batch,score,floor.rank||g.rank26Eq);
    const confidence=scores.some(x=>x.confidence==='高')?'中高':scores.some(x=>x.confidence==='中')?'中':'低';
    const eqNote=eq!==null?`；26等效分参考 ${fmtNum(eq)}`:'';
    result={score,rank,confidence,reason:`按组内最低参考专业估算：${floor.source}${floor.adjustment?`；修正：${floor.adjustment}`:''}${eqNote}`};
  }else if(num(g.score26Eq)!==null){
    const score=Math.round(num(g.score26Eq));
    result={score,rank:num(g.rank26Eq),confidence:'中',reason:`使用现有 26 等效分参考 ${fmtNum(score)}`};
  }else{
    const peerScores=(s.groups||[]).filter(x=>x!==g&&num(x.score25)!==null).map(x=>num(x.score25)).sort((a,b)=>a-b);
    if(peerScores.length){
      const score=Math.round(peerScores[0]);
      result={score,rank:estimateRankForScore(s.subject,s.batch,score,null),confidence:'低',reason:`同校同批已有专业组最低分参考 ${fmtNum(score)}，缺少直接专业锚点`};
    }
  }
  predictionCache.set(cacheKey,result);
  return result;
}
function groupScoreEstimate(s,g){return num(g.score25)===null?predictGroupScore(s,g):null;}
function predictionBadgeHTML(s,g){
  const p=groupScoreEstimate(s,g);
  return p?`<span class="badge green" title="${esc(p.reason)}">预测分 ${esc(fmtNum(p.score))}｜${esc(p.confidence)}</span>`:'';
}
function groupScoreMiniHTML(s,g){
  const p=groupScoreEstimate(s,g);
  if(p)return `<div class="mini" title="${esc(p.reason)}"><b>${esc(fmtNum(p.score))}</b><span>预测分</span></div><div class="mini" title="${esc(p.reason)}"><b>${esc(fmtNum(p.rank))}</b><span>预测位次</span></div>`;
  return `<div class="mini"><b>${fmtNum(g.score25)}</b><span>25分</span></div><div class="mini"><b>${fmtNum(g.rank25)}</b><span>25位次</span></div>`;
}
function groupScoreLineHTML(s,g){
  const p=groupScoreEstimate(s,g);
  if(p)return `预测分 ${esc(fmtNum(p.score))}｜预测位次 ${esc(fmtNum(p.rank))} <span class="note-badge" title="${esc(p.reason)}">估</span>`;
  return `25分 ${fmtNum(g.score25)}｜25位次 ${fmtNum(g.rank25)}`;
}
function groupChangeButtonHTML(s,g,variant){
  const data=groupChangeData(s,g);
  const cls=`change-btn ${variant||''} ${data?'':'muted'}`.trim();
  const label=data&&data.advice==='重点核对'?'变迁*':'变迁';
  return `<button class="${cls}" type="button" data-change-key="${esc(groupChangeKey(s,g))}" data-change-title="${esc(`${s.name} ${groupDisplayTitleText(s,g)}`)}" title="${data?'查看 2025-2026 专业组变迁':'暂无普通批变迁数据'}">${label}</button>`;
}
function volunteerButtonHTML(s,g){
  const key=keyGroup(s,g);
  const selected=volunteerKeys.includes(key);
  const disabled=!selected&&volunteerKeys.length>=VOLUNTEER_LIMIT;
  const label=selected?'已加入志愿表':disabled?'志愿表已满':'加入志愿表';
  const cls=`volunteer-add-btn ${selected?'selected':''}`.trim();
  return `<button class="${cls}" type="button" data-volunteer-key="${esc(key)}" ${disabled?'disabled':''}>${label}</button>`;
}
function percent(v){return typeof v==='number'?`${Math.round(v*1000)/10}%`:fmt(v);}
function diffText(a,b){return typeof a==='number'&&typeof b==='number'?formatSigned(a-b):'—';}
function createLayout(){
  document.body.className=[document.body.dataset.admin==='1'?'admin-page':'',state.compact?'compact-mode':''].filter(Boolean).join(' ');
  document.body.innerHTML=`
  <div class="app-shell">
    <header class="topbar">
      <div class="hero"><div class="brand"><h1>江苏省招生计划变化知识库</h1><p>基于 2026 在招数据、2025 专业最低分与招生计划生成；院校排序按 2025 专业最低分 × 2025 招生计划的加权平均分执行。</p></div><div class="top-actions"><div class="version">${VERSION}</div><button id="volunteerPanelBtn" class="header-toggle volunteer-toggle" type="button">志愿表 0/40</button><button id="compactBtn" class="header-toggle" type="button">${state.compact?'标准显示':'紧凑显示'}</button><button id="toggleHeaderBtn" class="header-toggle" type="button">收起头部</button></div></div>
      <div class="filters">
        <select id="batchFilter"><option value="">全部批次</option></select>
        <select id="subjectFilter"><option value="">全部科类</option></select>
        <button id="requirementBtn" class="filter-btn">选科要求</button>
        <button id="provinceBtn" class="filter-btn">全部省份</button>
        <button id="levelBtn" class="filter-btn">院校层次</button>
        <select id="roleFilter"><option value="">角色/客观标签</option></select>
        <select id="modeFilter"><option value="schools">全部院校</option><option value="groups">全部专业组</option></select>
        <button id="classBtn" class="filter-btn">全部专业大类</button>
        <button id="scoreBtn" class="filter-btn">目标分区间</button>
        <input id="searchInput" placeholder="搜索院校、专业组、专业、专业大类，例如：计算机类 / 南京邮电 / 中外合作" />
      </div>
    </header>
    <div class="layout"><aside class="sidebar"><div class="side-head"><strong>院校索引</strong><span id="resultMeta">正在加载数据</span></div><div id="schoolList" class="school-list"></div></aside><main id="main" class="main"></main></div>
    <div id="provincePanel" class="panel"><div class="panel-head"><h3>省份多选筛选</h3><button class="close-btn" data-close="provincePanel">×</button></div><div class="panel-body"><div id="provincePanelBody"></div></div></div>
    <div id="levelPanel" class="panel"><div class="panel-head"><h3>院校层次多选</h3><button class="close-btn" data-close="levelPanel">×</button></div><div class="panel-body"><div id="levelPanelBody"></div></div></div>
    <div id="requirementPanel" class="panel"><div class="panel-head"><h3>选科要求多选筛选</h3><button class="close-btn" data-close="requirementPanel">×</button></div><div class="panel-body"><div id="requirementPanelBody"></div></div></div>
    <div id="classPanel" class="panel"><div class="panel-head"><h3>专业大类二级多选</h3><button class="close-btn" data-close="classPanel">×</button></div><div class="panel-body"><div id="classPanelBody"></div></div></div>
    <div id="scorePanel" class="panel"><div class="panel-head"><h3>目标分区间筛选</h3><button class="close-btn" data-close="scorePanel">×</button></div><div class="panel-body"><div id="rangeSummary" class="range-summary"></div><div class="score-row"><label>目标分</label><input id="targetScoreRange" type="range" min="350" max="710" value="550"><input id="targetScoreInput" type="number" value="550"></div><div class="score-row"><label>下浮</label><input id="downRange" type="range" min="0" max="80" value="20"><input id="downInput" type="number" value="20"></div><div class="score-row"><label>上浮</label><input id="upRange" type="range" min="0" max="80" value="30"><input id="upInput" type="number" value="30"></div><div class="modal-actions"><button id="clearScoreBtn">清空分数筛选</button><button id="applyScoreBtn" class="save">应用区间</button></div></div></div>
    <div id="changePanel" class="panel change-panel"><div class="panel-head"><div><h3>专业组变迁</h3><p id="changePanelTitle" class="panel-subtitle"></p></div><button class="close-btn" data-close="changePanel">×</button></div><div id="changePanelBody" class="panel-body"></div></div>
    <div id="volunteerPanel" class="panel volunteer-panel"><div class="panel-head volunteer-panel-head"><div><h3>专业组专业表</h3><p id="volunteerPanelCount" class="panel-subtitle">已选 0 / 40 个专业组</p></div><div class="volunteer-head-actions"><button id="exportVolunteerBtn" class="save" type="button">导出 Excel</button><button class="close-btn" data-close="volunteerPanel">×</button></div></div><div class="panel-body volunteer-workbench"><div class="volunteer-sticky-shell"><div class="volunteer-toolbar volunteer-workbench-toolbar"><input id="volunteerSearchInput" type="search" placeholder="搜索院校、专业组、专业、专业类"><select id="volunteerFilterSelect"><option value="">全部专业组</option><option value="冲">只看冲</option><option value="稳">只看稳</option><option value="保">只看保</option><option value="垫">只看垫</option><option value="pending">只看待定</option><option value="emptyMajor">未选具体专业</option><option value="notFullMajor">专业未满 6 个</option><option value="fullMajor">已满 6 个专业</option></select><button id="resetVolunteerFilterBtn" type="button">清除筛选</button><button id="expandVolunteerBtn" type="button">一键收起编辑</button><button id="fillVolunteerBtn" type="button">当前筛选补满</button><button id="clearVolunteerBtn" type="button">清空</button></div><div class="volunteer-table-head"><div>排序</div><div>院校专业组</div><div>已选专业</div><div>基础信息</div><div>操作</div></div></div><div id="volunteerList" class="volunteer-list volunteer-table-list"></div></div></div>
    <div id="annotationDrawer" class="annotation-drawer">
      <div class="annotation-head"><div><h3>批注</h3><p id="annotationObject">未选择批注对象</p></div><button id="closeAnnotationBtn" class="close-btn" type="button">×</button></div>
      <div class="annotation-body"><div id="giscusMount" class="giscus-mount"></div></div>
    </div>
    <div id="notePanel" class="note-panel"><h4>备注</h4><div id="notePanelText"></div></div>
    <div id="modalMask" class="modal-mask"><div id="modal" class="modal"></div></div>
    <div class="admin-dock"><button id="adminDockBtn">管理员备注</button></div><div id="adminMenu" class="admin-menu"><button id="loginBtn">登录数据库</button><button id="reloadNotesBtn">读取备注</button><button id="addSchoolNoteBtn">新增当前学校备注</button><button id="logoutBtn">退出登录</button><div class="context-hint">右键学校、专业组或专业行可编辑备注。</div></div>
    <button id="backTopBtn" class="back-top" type="button">↑ 顶部</button>
    <div class="footer">GitHub Pages 静态部署版 · 数据分片加载 · 公开页只读 / 管理员页可写备注</div>
  </div>`;
}
function unique(arr){return Array.from(new Set(arr.filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='')));}
function fillSelect(sel,vals){const el=$(sel); const first=el.options[0].outerHTML; el.innerHTML=first+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}
function initFilters(){
  const batches=unique(DB.map(s=>s.batch)).sort();
  const subjects=unique(DB.map(s=>s.subject)).sort();
  const roles=unique(DB.flatMap(s=>s.groups.flatMap(g=>g.tags||[]))).sort((a,b)=>String(a).localeCompare(String(b),'zh-Hans-CN'));
  fillSelect('#batchFilter',batches);
  fillSelect('#subjectFilter',subjects);
  fillSelect('#roleFilter',roles);
}
function schoolCountBy(field){const m=new Map(); DB.forEach(s=>{const key=String(s[field]??'').trim(); if(!isValidFacetValue(key))return; m.set(key,(m.get(key)||0)+1);}); return m;}
function groupCountBy(field){const m=new Map(); DB.forEach(s=>s.groups.forEach(g=>{const key=String(g[field]??'').trim(); if(!isValidFacetValue(key))return; m.set(key,(m.get(key)||0)+1);})); return m;}
function bindEvents(){
  ['batchFilter','subjectFilter','roleFilter','modeFilter'].forEach(id=>$('#'+id).addEventListener('change',e=>{state[id.replace('Filter','')]=e.target.value; if(id==='modeFilter')state.mode=e.target.value; applyFilters();}));
  $('#searchInput').addEventListener('input',e=>{state.q=e.target.value; applyFilters();});
  $('#provinceBtn').addEventListener('click',()=>openPanel('provincePanel'));
  $('#levelBtn').addEventListener('click',()=>openPanel('levelPanel'));
  $('#requirementBtn').addEventListener('click',()=>openPanel('requirementPanel'));
  $('#classBtn').addEventListener('click',()=>openPanel('classPanel'));
  $('#scoreBtn').addEventListener('click',()=>{updateRangeSummary();openPanel('scorePanel')});
  $('#volunteerPanelBtn').addEventListener('click',()=>{renderVolunteerPanel();openPanel('volunteerPanel')});
  $('#fillVolunteerBtn').addEventListener('click',fillVolunteerFromCurrentFilters);
  $('#exportVolunteerBtn').addEventListener('click',exportVolunteerXlsx);
  $('#clearVolunteerBtn').addEventListener('click',clearVolunteers);
  $('#volunteerSearchInput')?.addEventListener('input',e=>{volunteerSearchQuery=e.target.value;renderVolunteerPanel();});
  $('#volunteerFilterSelect')?.addEventListener('change',e=>{volunteerFilterMode=e.target.value;renderVolunteerPanel();});
  $('#resetVolunteerFilterBtn')?.addEventListener('click',()=>{volunteerSearchQuery='';volunteerFilterMode='';const q=$('#volunteerSearchInput');if(q)q.value='';const f=$('#volunteerFilterSelect');if(f)f.value='';renderVolunteerPanel();});
  $('#expandVolunteerBtn')?.addEventListener('click',()=>{volunteerAllExpanded=!volunteerAllExpanded;if(!volunteerAllExpanded){volunteerExpandedKeys.clear();}else{volunteerVisibleEntries().forEach(x=>volunteerExpandedKeys.add(x.key));}renderVolunteerPanel();});
  $('#compactBtn').addEventListener('click',toggleCompact);
  $('#toggleHeaderBtn').addEventListener('click',toggleHeader);
  $('#backTopBtn').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  $('#closeAnnotationBtn').addEventListener('click',closeAnnotationDrawer);
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closePanel(b.dataset.close)));
  bindScoreInputs();
  $('#modalMask').addEventListener('click',e=>{if(e.target.id==='modalMask')closeModal();});
  $('#adminDockBtn')?.addEventListener('click',()=>$('#adminMenu').classList.toggle('open'));
  $('#loginBtn')?.addEventListener('click',showLoginModal);
  $('#reloadNotesBtn')?.addEventListener('click',fetchNotes);
  $('#logoutBtn')?.addEventListener('click',()=>{auth={accessToken:'',user:null}; alert('已退出当前前端会话');});
  $('#addSchoolNoteBtn')?.addEventListener('click',()=>{const s=getActiveSchool(); if(s)showNoteEditor('schools',keySchool(s),`${s.name}｜学校备注`);});
}
function bindScoreInputs(){
  const pairs=[['targetScoreRange','targetScoreInput'],['downRange','downInput'],['upRange','upInput']];
  pairs.forEach(([r,i])=>{const rr=$('#'+r), ii=$('#'+i); rr.addEventListener('input',()=>{ii.value=rr.value;updateRangeSummary()}); ii.addEventListener('input',()=>{rr.value=ii.value;updateRangeSummary()});});
  $('#applyScoreBtn').addEventListener('click',()=>{const target=+$('#targetScoreInput').value, down=+$('#downInput').value, up=+$('#upInput').value;state.scoreRange={target,down,up,min:target-down,max:target+up};$('#scoreBtn').textContent=`分数 ${target-down}—${target+up}`;closePanel('scorePanel');applyFilters();});
  $('#clearScoreBtn').addEventListener('click',()=>{state.scoreRange=null;$('#scoreBtn').textContent='目标分区间';closePanel('scorePanel');applyFilters();});
}
function updateRangeSummary(){const t=+$('#targetScoreInput').value||0,d=+$('#downInput').value||0,u=+$('#upInput').value||0;$('#rangeSummary').textContent=`目标分：${t}｜下浮${d}｜上浮${u}｜区间${t-d}—${t+u}｜含新增组预测分`;}
function openPanel(id){const panel=$('#'+id);if(panel)panel.classList.add('open');if(id==='volunteerPanel')document.body.classList.add('volunteer-workbench-open');}
function closePanel(id){const panel=$('#'+id);if(panel)panel.classList.remove('open');if(id==='volunteerPanel')document.body.classList.remove('volunteer-workbench-open');}
function toggleHeader(){
  const collapsed=document.body.classList.toggle('header-collapsed');
  $('#toggleHeaderBtn').textContent=collapsed?'展开头部':'收起头部';
}
function toggleCompact(){
  state.compact=!state.compact;
  document.body.classList.toggle('compact-mode',state.compact);
  $('#compactBtn').textContent=state.compact?'标准显示':'紧凑显示';
}
function isValidFacetValue(v){
  const t=String(v??'').trim();
  if(!t)return false;
  if(t.includes('#REF'))return false;
  if(/^#(VALUE|N\/A|DIV\/0|NAME|NULL|NUM)!?$/i.test(t))return false;
  return true;
}
function buildCheckPanel(panelId, items, counterMap, setRef, buttonUpdater, clearLabel){
  const body=typeof panelId==='string' ? document.getElementById(panelId.replace(/^#/,'')) : panelId;
  if(!body){console.error('筛选面板容器不存在：',panelId);return;}
  const baseId=String(panelId).replace(/^#/,'').replace('Body','');
  const clearBtnId=baseId+'ClearBtn';
  body.innerHTML=`<div class="class-grid">${items.map(v=>`<label class="class-chip"><input type="checkbox" value="${esc(v)}" ${setRef.has(v)?'checked':''}>${esc(v)} <span class="muted">${counterMap.get(v)||0}</span></label>`).join('')}</div><div class="modal-actions"><button id="${clearBtnId}">${clearLabel}</button></div>`;
  body.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.addEventListener('change',()=>{setRef.clear(); body.querySelectorAll('input[type=checkbox]:checked').forEach(x=>setRef.add(x.value)); buttonUpdater(); applyFilters();}));
  document.getElementById(clearBtnId).addEventListener('click',()=>{body.querySelectorAll('input[type=checkbox]').forEach(x=>x.checked=false); setRef.clear(); buttonUpdater(); applyFilters();});
}
function buildProvincePanel(){
  const counts=schoolCountBy('province');
  const items=Array.from(counts.keys()).sort((a,b)=>(counts.get(b)-counts.get(a))||a.localeCompare(b,'zh-Hans-CN'));
  buildCheckPanel('provincePanelBody',items,counts,state.selectedProvinces,updateProvinceButton,'清空省份筛选');
}
function buildLevelPanel(){
  const counts=schoolCountBy('level');
  const items=Array.from(counts.keys()).sort((a,b)=>String(a).localeCompare(String(b),'zh-Hans-CN'));
  buildCheckPanel('levelPanelBody',items,counts,state.selectedLevels,updateLevelButton,'清空院校层次');
}
function buildRequirementPanel(){
  const counts=groupCountBy('requirement');
  const order=['不限','化学','生物','化和生','政治','地理','政和地','生和地'];
  const items=Array.from(counts.keys()).sort((a,b)=>{
    const ai=order.indexOf(a), bi=order.indexOf(b);
    if(ai>=0&&bi>=0)return ai-bi;
    if(ai>=0)return -1;
    if(bi>=0)return 1;
    return (counts.get(b)-counts.get(a))||String(a).localeCompare(String(b),'zh-Hans-CN');
  });
  buildCheckPanel('requirementPanelBody',items,counts,state.selectedRequirements,updateRequirementButton,'清空选科要求');
}
function CounterLike(){this.m=new Map();this.add=k=>this.m.set(k,(this.m.get(k)||0)+1);this.keys=()=>this.m.keys();this.get=k=>this.m.get(k)||0;}
function buildClassPanel(){
  const counts=new CounterLike();
  DB.forEach(s=>s.groups.forEach(g=>(g.majorClasses||[]).forEach(c=>counts.add(c))));
  const byDisc={};
  [...counts.keys()].forEach(c=>{let disc='其他'; DB.some(s=>s.groups.some(g=>g.majors.some(m=>{if(m.majorClass===c){disc=m.discipline||'其他';return true}return false;}))); (byDisc[disc]||(byDisc[disc]=[])).push(c);});
  const html=disciplineOrder.map(d=>{let arr=byDisc[d]||[]; arr.sort((a,b)=>{let ai=hotOrder.indexOf(a),bi=hotOrder.indexOf(b); if(ai<0)ai=999;if(bi<0)bi=999; if(ai!==bi)return ai-bi; return (counts.get(b)-counts.get(a))||a.localeCompare(b,'zh-Hans-CN');}); if(!arr.length)return ''; return `<section class="class-group"><h4>${esc(d)}</h4><div class="class-grid">${arr.map(c=>`<label class="class-chip"><input type="checkbox" value="${esc(c)}" ${state.selectedClasses.has(c)?'checked':''}>${esc(c)} <span class="muted">${counts.get(c)}</span></label>`).join('')}</div></section>`;}).join('');
  $('#classPanelBody').innerHTML=html+`<div class="modal-actions"><button id="clearClassBtn">清空专业大类</button></div>`;
  $$('#classPanel input[type=checkbox]').forEach(cb=>cb.addEventListener('change',()=>{state.selectedClasses=new Set($$('#classPanel input[type=checkbox]:checked').map(x=>x.value));updateClassButton();applyFilters();}));
  $('#clearClassBtn').addEventListener('click',()=>{$$('#classPanel input[type=checkbox]').forEach(x=>x.checked=false);state.selectedClasses.clear();updateClassButton();applyFilters();});
}
function updateProvinceButton(){const n=state.selectedProvinces.size; $('#provinceBtn').textContent=n===0?'全部省份':n===1?[...state.selectedProvinces][0]:`已选 ${n} 个省份`;}
function updateLevelButton(){const n=state.selectedLevels.size; $('#levelBtn').textContent=n===0?'院校层次':n===1?[...state.selectedLevels][0]:`已选 ${n} 个院校层次`;}
function updateRequirementButton(){const n=state.selectedRequirements.size; $('#requirementBtn').textContent=n===0?'选科要求':n===1?[...state.selectedRequirements][0]:`已选 ${n} 个选科要求`;}
function updateClassButton(){const n=state.selectedClasses.size; $('#classBtn').textContent=n===0?'全部专业大类':n===1?[...state.selectedClasses][0]:`已选 ${n} 个专业大类`;}
function groupMatchesSearch(s,g,q){if(!q)return true; const nq=normalize(q); if(normalize(s.name+s.province+s.city+s.subject+s.batch).includes(nq))return true; if(normalize(g.groupName+groupDisplayName(s,g)+g.requirement+(g.tags||[]).join('')+(g.majorClasses||[]).join('')+g.majorSummary).includes(nq))return true; return g.majors.some(m=>normalize(m.name+m.majorClass+m.discipline+m.code).includes(nq));}
function groupMatchesScore(s,g){
  if(!state.scoreRange)return true;
  const scores=[];
  if(num(g.score25)!==null)scores.push(num(g.score25));
  g.majors.forEach(m=>{if(num(m.score25)!==null)scores.push(num(m.score25));});
  const p=groupScoreEstimate(s,g);
  if(p&&num(p.score)!==null)scores.push(num(p.score));
  return scores.some(sc=>sc>=state.scoreRange.min&&sc<=state.scoreRange.max);
}
function groupMatchesClass(g){if(!state.selectedClasses.size)return true; return (g.majorClasses||[]).some(c=>state.selectedClasses.has(c));}
function groupMatchesRequirement(g){if(!state.selectedRequirements.size)return true; return state.selectedRequirements.has(String(g.requirement||'').trim());}
function applyFilters(){
  const result=[]; const q=state.q;
  DB.forEach(s=>{
    if(state.batch&&s.batch!==state.batch)return;
    if(state.subject&&s.subject!==state.subject)return;
    if(state.selectedProvinces.size&&!state.selectedProvinces.has(s.province))return;
    if(state.selectedLevels.size&&!state.selectedLevels.has(String(s.level)))return;
    const groups=s.groups.filter(g=>{if(state.role&&!(g.tags||[]).includes(state.role))return false; if(!groupMatchesRequirement(g))return false; if(!groupMatchesScore(s,g))return false; if(!groupMatchesClass(g))return false; if(!groupMatchesSearch(s,g,q))return false; return true;});
    if(groups.length){result.push({...s,visibleGroups:groups});}
  });
  result.sort(schoolSort);
  state.filtered=result;
  if(!result.some(s=>s.id===state.activeSchoolId)) state.activeSchoolId=result[0]?.id||null;
  render();
}
function schoolSort(a,b){
  const aw=a.weightedScore??-1,bw=b.weightedScore??-1; if(bw!==aw)return bw-aw;
  const as=Math.max(...a.visibleGroups.map(g=>g.score25||-1)),bs=Math.max(...b.visibleGroups.map(g=>g.score25||-1)); if(bs!==as)return bs-as;
  const ar=Math.min(...a.visibleGroups.map(g=>g.rank25||1e9)),br=Math.min(...b.visibleGroups.map(g=>g.rank25||1e9)); if(ar!==br)return ar-br;
  return a.name.localeCompare(b.name,'zh-Hans-CN');
}
function majorSortByThreeYear(a,b){
  const as=a.avgScore3??-1, bs=b.avgScore3??-1;
  if(bs!==as)return bs-as;
  const ar=a.avgRank3??1e9, br=b.avgRank3??1e9;
  if(ar!==br)return ar-br;
  const s25a=a.score25??-1, s25b=b.score25??-1;
  if(s25b!==s25a)return s25b-s25a;
  const r25a=a.rank25??1e9, r25b=b.rank25??1e9;
  if(r25a!==r25b)return r25a-r25b;
  return String(a.code||'').localeCompare(String(b.code||''),'zh-Hans-CN');
}
function render(){renderSidebar(); if(state.mode==='groups')renderGroupMode(); else renderSchoolMode();}
function renderSidebar(){
  const totalGroups=state.filtered.reduce((a,s)=>a+s.visibleGroups.length,0);
  $('#resultMeta').textContent=`${state.filtered.length} 所院校｜${totalGroups} 个专业组`;
  $('#schoolList').innerHTML=state.filtered.map(s=>`<div class="school-item ${s.id===state.activeSchoolId?'active':''}" data-school-id="${s.id}" data-note-scope="schools" data-note-key="${esc(keySchool(s))}"><div class="name">${esc(s.name)}${noteBadge('schools',keySchool(s))}</div><div class="meta"><span>${esc(s.province)}</span><span>${esc(s.subject)}</span><span>${esc(s.batch)}</span><span>${s.visibleGroups.length}组</span></div><div class="score-pill">加权均分 ${fmtNum(s.weightedScore)}</div></div>`).join('');
  $$('.school-item').forEach(el=>el.addEventListener('click',()=>{state.activeSchoolId=el.dataset.schoolId;render();}));
  bindNoteHoverAndContext();
}
function getActiveSchool(){return state.filtered.find(s=>s.id===state.activeSchoolId)||state.filtered[0]||null;}
function renderSchoolMode(){const s=getActiveSchool(); if(!s){$('#main').innerHTML='<div class="empty">没有匹配数据，请调整筛选条件。</div>';return;} $('#main').innerHTML=schoolHTML(s,s.visibleGroups,true); bindDynamic();}
function renderGroupMode(){
  const groups=[]; state.filtered.forEach(s=>s.visibleGroups.forEach(g=>groups.push([s,g])));
  const limit=120; const shown=groups.slice(0,limit);
  $('#main').innerHTML=`<div class="school-header"><div class="school-title"><h2>专业组视图</h2><span class="badge green">当前显示 ${shown.length} / ${groups.length} 组</span></div><div class="badges"><span class="badge">按院校加权均分排序</span><span class="badge">分数筛选含新增组预测分</span></div></div>`+shown.map(([s,g])=>groupSectionHTML(s,g)).join('')+(groups.length>limit?`<div class="empty">为保证浏览器性能，当前展示前 ${limit} 个专业组；可以继续缩小筛选条件。</div>`:'');
  bindDynamic();
}
function schoolHTML(s,groups,withCards){
  const plan26=groups.reduce((a,g)=>a+(g.plan26||0),0);
  const plan25=groups.reduce((a,g)=>a+(g.plan25||0),0);
  const planDiff=plan26-plan25;
  return `<section class="school-header" data-note-scope="schools" data-note-key="${esc(keySchool(s))}"><div class="school-title"><h2>${esc(s.name)}</h2>${noteBadge('schools',keySchool(s))}<button class="anno-btn" data-annotation-scope="schools" data-annotation-key="${esc(keySchool(s))}" data-annotation-title="${esc(s.name)}｜院校批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="schools" data-annotation-key="${esc(keySchool(s))}" data-annotation-title="${esc(s.name)}｜院校批注">新增批注</button></div><div class="badges"><span class="badge">${esc(s.province)}</span><span class="badge">${esc(s.subject)}</span><span class="badge">${esc(s.batch)}</span><span class="badge green">当前显示 ${groups.length} 组</span></div><div class="summary-grid"><div class="metric"><b>${fmtNum(s.weightedScore)}</b><span>院校加权平均分</span></div><div class="metric"><b>${fmtNum(s.weightedRank)}</b><span>加权平均位次</span></div><div class="metric"><b>${plan26}</b><span>2026 显示计划</span></div><div class="metric"><b class="${signedClass(planDiff)}">${formatSigned(planDiff)}</b><span>较 2025 计划变化</span></div></div></section>${withCards?`<div class="group-cards">${groups.map(g=>groupCardHTML(s,g)).join('')}</div>`:''}${groups.map(g=>groupSectionHTML(s,g)).join('')}`;
}
function groupCardHTML(s,g){
  const planDiff=(g.plan26||0)-(g.plan25||0);
  const topTags=[...(g.tags||[]).slice(0,3),...(g.majorClasses||[]).slice(0,3)];
  const quality=groupQuality(s,g);
  const title=groupDisplayTitleText(s,g);
  return `<article class="group-card group-quality-${quality.tone}" data-scroll="${g.id}" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}" title="${esc(quality.title)}"><div class="group-card-head"><h3>${groupTitleHTML(s,g)}${noteBadge('groups',keyGroup(s,g))}</h3>${groupChangeButtonHTML(s,g,'card')}</div><div class="grid">${groupScoreMiniHTML(s,g)}<div class="mini"><b>${g.majors.length}</b><span>专业数</span></div></div><div class="tag-row">${groupQualityBadge(quality)}${predictionBadgeHTML(s,g)}${planDeltaBadge(planDiff)}${topTags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="anno-actions">${volunteerButtonHTML(s,g)}<button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">新增批注</button></div></article>`;
}
function groupSectionHTML(s,g){
  const planDiff=(g.plan26||0)-(g.plan25||0);
  const quality=groupQuality(s,g);
  const title=groupDisplayTitleText(s,g);
  return `<section id="${g.id}" class="group-section group-quality-${quality.tone}" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}" title="${esc(quality.title)}"><div class="group-head"><div class="group-head-main"><h3>${groupTitleHTML(s,g)}${noteBadge('groups',keyGroup(s,g))}</h3><p>${esc(s.name)}｜再选：${esc(g.requirement||'—')}｜${groupScoreLineHTML(s,g)}｜26计划 ${fmt(g.plan26)}｜较25年 ${formatSigned(planDiff)} ${planDiff===0?'':`<span class="${signedClass(planDiff)}">(${formatSigned(planDiff)})</span>`}</p><div class="tag-row">${groupQualityBadge(quality)}${predictionBadgeHTML(s,g)}${(g.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')} ${(g.majorClasses||[]).slice(0,8).map(c=>`<span class="badge">${esc(c)}</span>`).join('')} ${planDeltaBadge(planDiff)}</div><div class="anno-actions">${volunteerButtonHTML(s,g)}<button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">新增批注</button></div></div>${groupChangeButtonHTML(s,g,'section')}</div><div class="table-wrap"><table><thead><tr><th>专业志愿</th><th>代码</th><th>专业名称</th><th>专业类</th><th>26计划/变化</th><th>25分/位次</th><th>三年均分/位次</th></tr></thead><tbody>${[...g.majors].sort(majorSortByThreeYear).map(m=>majorRowHTML(s,g,m)).join('')}</tbody></table></div></section>`;
}
function majorRowHTML(s,g,m){
  const avgYears=m.avgYears&&m.avgYears<3?`<br><span class="muted">${m.avgYears}年均值</span>`:'';
  const groupKey=keyGroup(s,g);
  const order=selectedMajorIndex(groupKey,m.key);
  const checked=order>=0;
  return `<tr class="${m.risk?'risk-row':''} ${checked?'major-selected-row':''} clickable-row" data-note-scope="majors" data-note-key="${esc(keyMajor(m))}" data-detail-row="${esc(m.key)}" data-school-key="${esc(keySchool(s))}" data-group-key="${esc(groupKey)}"><td class="major-select-cell"><label class="major-select-box" title="勾选后会自动加入该专业组，并按勾选顺序生成专业 1-6"><input type="checkbox" data-main-major-check="${esc(groupKey)}" value="${esc(m.key)}" ${checked?'checked':''}>${checked?`<span class="major-order-badge">${order+1}</span>`:'<span class="major-order-placeholder">—</span>'}</label></td><td>${esc(m.code)}</td><td class="major-name">${esc(m.name)}${m.risk?'<span class="risk-label">风险</span>':''}${noteBadge('majors',keyMajor(m))}<button class="anno-mini" data-annotation-scope="majors" data-annotation-key="${esc(keyMajor(m))}" data-annotation-title="${esc(s.name)} ${esc(groupDisplayTitleText(s,g))} ${esc(m.name)}｜专业批注">批注</button></td><td>${esc(m.majorClass||'其他')}<br><span class="muted">${esc(m.discipline||'其他')}</span></td><td>${fmt(m.plan26)} / ${planChangeInline(m.planChange)}</td><td>${fmtNum(m.score25)} / ${fmtNum(m.rank25)}</td><td>${fmtNum(m.avgScore3)} / ${fmtNum(m.avgRank3)}${avgYears}</td></tr>`;
}
function bindDynamic(){
  $$('[data-scroll]').forEach(el=>el.addEventListener('click',()=>document.getElementById(el.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));
  $$('[data-detail-row]').forEach(tr=>tr.addEventListener('click',e=>{if(e.target.closest('button,a,input,label,textarea'))return; showDetail(tr.dataset.detailRow,tr.dataset.schoolKey,tr.dataset.groupKey);}));
  bindVolunteerButtons();
  bindMainMajorChecks();
  bindGroupChangeButtons();
  bindAnnotationButtons();
  bindNoteHoverAndContext();
}
function noteBadge(scope,key){return notes[scope]&&notes[scope][key]?` <span class="note-badge">备注</span>`:'';}
function bindNoteHoverAndContext(){
  $$('[data-note-scope]').forEach(el=>{
    el.onmouseenter=()=>{const n=notes[el.dataset.noteScope]?.[el.dataset.noteKey]; if(n)showNotePanel(n);};
    el.onmouseleave=()=>hideNotePanel();
    if(document.body.dataset.admin==='1'){
      el.oncontextmenu=e=>{e.preventDefault(); showNoteEditor(el.dataset.noteScope,el.dataset.noteKey,`${labelScope(el.dataset.noteScope)}｜${el.dataset.noteKey}`);};
    }
  });
}
function labelScope(s){return s==='schools'?'学校备注':s==='groups'?'专业组备注':'专业备注';}
function showNotePanel(text){$('#notePanelText').textContent=text;$('#notePanel').classList.add('open');}
function hideNotePanel(){$('#notePanel').classList.remove('open');}
function showDetail(key,schoolKey,groupKey){
  const d=DETAILS[key]||{};
  const schoolNote=notes.schools[schoolKey]||'';
  const groupNote=notes.groups[groupKey]||'';
  const majorNote=notes.majors[key]||'';
  $('#modal').innerHTML=`<h3>${esc(d.name||'专业详情')}</h3><div class="modal-body"><dl class="kv">${Object.entries({学校:d.school,专业组:d.group,科类:d.subject,批次:d.batch,专业代码:d.code,专业类:d.majorClass,学科门类:d.discipline,本科专业名称:d.undergraduateName,学科专业:d.subjectMajor,学制:d.degreeYears,学费:d.tuition,保研率:d.baoyanRate,学校软科排名:d.schoolRank,硕博:d.masterDoctor,四轮评估:d.disciplineEval4,第五轮:d.disciplineEval5,一流学科:d.firstClass,软科专业排名:d.majorRank,录取规则:d.admissionRule,相似度:d.similarity,'2026计划':d.plan26,'2025计划':d.plan25,'2025最低分':d.score25,'2025位次':d.rank25,'2024最低分':d.score24,'2024位次':d.rank24,'2023最低分':d.score23,'2023位次':d.rank23}).filter(([k,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(fmtNum(v))}</dd>`).join('')}</dl><div class="badges">${schoolNote?`<span class="note-badge">学校备注</span>`:''}${groupNote?`<span class="note-badge">专业组备注</span>`:''}${majorNote?`<span class="note-badge">专业备注</span>`:''}</div>${noteBlock('学校备注',schoolNote)}${noteBlock('专业组备注',groupNote)}${noteBlock('专业备注',majorNote)}<div class="modal-actions"><button onclick="document.getElementById('modalMask').classList.remove('open')">关闭</button></div></div>`;
  openModal();
}
function noteBlock(title,text){return text?`<section class="metric" style="margin-top:12px"><b style="font-size:14px">${esc(title)}</b><span style="white-space:pre-wrap;color:#33443a">${esc(text)}</span></section>`:'';}
function openModal(){$('#modalMask').classList.add('open');}
function closeModal(){$('#modalMask').classList.remove('open');}

function buildGroupIndex(){
  groupIndex=new Map();
  DB.forEach(s=>(s.groups||[]).forEach(g=>groupIndex.set(keyGroup(s,g),{s,g})));
  buildPredictionIndexes();
  volunteerKeys=[...new Set(volunteerKeys)].filter(k=>groupIndex.has(k)).slice(0,VOLUNTEER_LIMIT);
  volunteerKeys.forEach(ensureVolunteerSelection);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
}
function getGroupRecord(key){return groupIndex.get(key)||null;}
function sortedMajors(g){return [...(g.majors||[])].sort((a,b)=>{if(Boolean(a.risk)!==Boolean(b.risk))return a.risk?1:-1; return majorSortByThreeYear(a,b);});}
function defaultMajorKeys(g){return sortedMajors(g).slice(0,MAX_MAJOR_PER_GROUP).map(m=>m.key);}
function uniqueValidMajorKeys(keys,g){
  const valid=new Set((g.majors||[]).map(m=>m.key));
  const out=[];
  (Array.isArray(keys)?keys:[]).forEach(k=>{
    if(valid.has(k)&&!out.includes(k)&&out.length<MAX_MAJOR_PER_GROUP)out.push(k);
  });
  return out;
}
function ensureVolunteerSelection(key){
  const rec=getGroupRecord(key);
  if(!rec)return;
  volunteerMajorKeys[key]=uniqueValidMajorKeys(volunteerMajorKeys[key],rec.g);
  if(!volunteerMeta[key])volunteerMeta[key]={strategy:'',obey:'是',note:''};
}
function ensureVolunteerGroupForMajor(key){
  if(!groupIndex.has(key))return false;
  if(!volunteerKeys.includes(key)){
    if(volunteerKeys.length>=VOLUNTEER_LIMIT){alert(`志愿表最多 ${VOLUNTEER_LIMIT} 个专业组。`);return false;}
    volunteerKeys.push(key);
  }
  ensureVolunteerSelection(key);
  return true;
}
function selectedMajorOrder(key){
  const rec=getGroupRecord(key);
  return rec?uniqueValidMajorKeys(volunteerMajorKeys[key],rec.g):[];
}
function selectedMajorIndex(key,majorKey){return selectedMajorOrder(key).indexOf(majorKey);}
function setMajorSelection(key,majorKey,checked){
  const rec=getGroupRecord(key);
  if(!rec)return false;
  let arr=selectedMajorOrder(key);
  if(checked){
    if(!ensureVolunteerGroupForMajor(key))return false;
    arr=selectedMajorOrder(key);
    if(!arr.includes(majorKey)){
      if(arr.length>=MAX_MAJOR_PER_GROUP){alert(`每个专业组最多只能选择 ${MAX_MAJOR_PER_GROUP} 个专业；请先取消一个已选专业，再选择新的专业。`);return false;}
      arr.push(majorKey);
    }
  }else{
    arr=arr.filter(k=>k!==majorKey);
  }
  volunteerMajorKeys[key]=arr;
  ensureVolunteerSelection(key);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  updateVolunteerUI();
  return true;
}
function setMajorSelectionBulk(key,majorKeys){
  if(!ensureVolunteerGroupForMajor(key))return false;
  const rec=getGroupRecord(key);
  if(!rec)return false;
  volunteerMajorKeys[key]=uniqueValidMajorKeys(majorKeys,rec.g);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  updateVolunteerUI();
  return true;
}
function moveMajorSelection(key,majorKey,delta){
  const arr=selectedMajorOrder(key);
  const i=arr.indexOf(majorKey);
  const j=i+delta;
  if(i<0||j<0||j>=arr.length)return false;
  [arr[i],arr[j]]=[arr[j],arr[i]];
  volunteerMajorKeys[key]=arr;
  saveVolunteerMajorKeys();
  return true;
}
function updateVolunteerUI(){
  const count=volunteerKeys.length;
  const btn=$('#volunteerPanelBtn');
  if(btn)btn.textContent=`志愿表 ${count}/${VOLUNTEER_LIMIT}`;
  const countEl=$('#volunteerPanelCount');
  if(countEl)countEl.textContent=`已选 ${count} / ${VOLUNTEER_LIMIT} 个专业组`;
  $$('[data-volunteer-key]').forEach(btn=>{
    const selected=volunteerKeys.includes(btn.dataset.volunteerKey);
    const disabled=!selected&&volunteerKeys.length>=VOLUNTEER_LIMIT;
    btn.textContent=selected?'已加入志愿表':disabled?'志愿表已满':'加入志愿表';
    btn.classList.toggle('selected',selected);
    btn.disabled=disabled;
  });
}
function addVolunteerKey(key){
  if(!groupIndex.has(key))return;
  if(!volunteerKeys.includes(key)){
    if(volunteerKeys.length>=VOLUNTEER_LIMIT){alert(`志愿表最多 ${VOLUNTEER_LIMIT} 个专业组。`);return;}
    volunteerKeys.push(key);
  }
  ensureVolunteerSelection(key);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  updateVolunteerUI();
}
function removeVolunteerKey(key){
  volunteerKeys=volunteerKeys.filter(k=>k!==key);
  delete volunteerMajorKeys[key];
  delete volunteerMeta[key];
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  renderVolunteerPanel();
  updateVolunteerUI();
}
function moveVolunteerKey(key,delta){
  const i=volunteerKeys.indexOf(key);
  const j=i+delta;
  if(i<0||j<0||j>=volunteerKeys.length)return;
  const arr=[...volunteerKeys];
  [arr[i],arr[j]]=[arr[j],arr[i]];
  volunteerKeys=arr;
  saveVolunteerKeys();
  renderVolunteerPanel();
  updateVolunteerUI();
}
function moveVolunteerKeyToPosition(key,rawPosition){
  const match=String(rawPosition||'').match(/\d+/);
  if(!match){alert('请输入目标序号，例如 10 或 第10。');return false;}
  const pos=Number(match[0]);
  if(!Number.isFinite(pos)||pos<1||pos>volunteerKeys.length){alert(`请输入 1-${volunteerKeys.length} 之间的序号。`);return false;}
  const i=volunteerKeys.indexOf(key);
  if(i<0)return false;
  const arr=[...volunteerKeys];
  const [item]=arr.splice(i,1);
  arr.splice(pos-1,0,item);
  volunteerKeys=arr;
  saveVolunteerKeys();
  renderVolunteerPanel();
  updateVolunteerUI();
  return true;
}
function moveVolunteerKeyByDrop(dragKey,targetKey,afterTarget){
  if(!dragKey||!targetKey||dragKey===targetKey)return false;
  if(!volunteerKeys.includes(dragKey)||!volunteerKeys.includes(targetKey))return false;
  const arr=volunteerKeys.filter(k=>k!==dragKey);
  const targetIndex=arr.indexOf(targetKey);
  if(targetIndex<0)return false;
  const insertIndex=targetIndex+(afterTarget?1:0);
  arr.splice(insertIndex,0,dragKey);
  volunteerKeys=arr;
  saveVolunteerKeys();
  renderVolunteerPanel();
  updateVolunteerUI();
  return true;
}
function bindVolunteerButtons(){
  $$('[data-volunteer-key]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      addVolunteerKey(btn.dataset.volunteerKey);
    };
  });
}
function bindMainMajorChecks(){
  $$('[data-main-major-check]').forEach(cb=>{
    cb.addEventListener('click',e=>e.stopPropagation());
    cb.addEventListener('change',()=>{
      const ok=setMajorSelection(cb.dataset.mainMajorCheck,cb.value,cb.checked);
      if(!ok)cb.checked=!cb.checked;
      render();
      renderVolunteerPanel();
    });
  });
}
function fillVolunteerFromCurrentFilters(){
  for(const s of state.filtered){
    for(const g of s.visibleGroups){
      if(volunteerKeys.length>=VOLUNTEER_LIMIT)break;
      const key=keyGroup(s,g);
      if(!volunteerKeys.includes(key))addVolunteerKey(key);
    }
    if(volunteerKeys.length>=VOLUNTEER_LIMIT)break;
  }
  renderVolunteerPanel();
  updateVolunteerUI();
}
function clearVolunteers(){
  if(!volunteerKeys.length)return;
  if(!confirm('确定清空当前志愿表吗？'))return;
  volunteerKeys=[];
  volunteerMajorKeys={};
  volunteerMeta={};
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  renderVolunteerPanel();
  updateVolunteerUI();
}
function selectedMajorsForKey(key){
  const rec=getGroupRecord(key);
  if(!rec)return [];
  const byKey=new Map((rec.g.majors||[]).map(m=>[m.key,m]));
  return selectedMajorOrder(key).map(k=>byKey.get(k)).filter(Boolean);
}
function volunteerSearchText(key,rec){
  if(!rec)return '';
  const {s,g}=rec;
  const meta=volunteerMeta[key]||{};
  const majorText=(g.majors||[]).map(m=>`${m.name||''} ${m.code||''} ${m.majorClass||''} ${m.discipline||''}`).join(' ');
  const selectedText=selectedMajorsForKey(key).map(m=>m.name||'').join(' ');
  return `${s.name||''} ${s.province||''} ${s.subject||''} ${s.batch||''} ${g.groupName||''} ${g.groupCode||''} ${groupDisplayName(s,g)||''} ${g.requirement||''} ${(g.tags||[]).join(' ')} ${meta.strategy||''} ${meta.note||''} ${selectedText} ${majorText}`;
}
function volunteerEntryMatches(key,rec){
  if(!rec)return false;
  const q=normalize(volunteerSearchQuery);
  if(q&&!normalize(volunteerSearchText(key,rec)).includes(q))return false;
  const mode=volunteerFilterMode;
  if(!mode)return true;
  const meta=volunteerMeta[key]||{};
  const selectedCount=selectedMajorOrder(key).length;
  if(['冲','稳','保','垫'].includes(mode))return meta.strategy===mode;
  if(mode==='pending')return !meta.strategy;
  if(mode==='emptyMajor')return selectedCount===0;
  if(mode==='notFullMajor')return selectedCount<MAX_MAJOR_PER_GROUP;
  if(mode==='fullMajor')return selectedCount>=MAX_MAJOR_PER_GROUP;
  return true;
}
function volunteerVisibleEntries(){
  return volunteerKeys.map((key,index)=>({key,index,rec:getGroupRecord(key)})).filter(x=>volunteerEntryMatches(x.key,x.rec));
}
function captureVolunteerExpandedState(){
  const list=$('#volunteerList');
  if(!list)return;
  $$('[data-volunteer-item]').forEach(row=>{
    const key=row.dataset.volunteerItem;
    const drawer=row.querySelector('.volunteer-edit-drawer');
    if(!key||!drawer)return;
    if(drawer.open)volunteerExpandedKeys.add(key);
    else if(!volunteerAllExpanded)volunteerExpandedKeys.delete(key);
  });
}
function keepVolunteerDrawerOpen(key){
  if(key)volunteerExpandedKeys.add(key);
}
function renderVolunteerPanel(){
  const list=$('#volunteerList');
  if(!list)return;
  captureVolunteerExpandedState();
  const visible=volunteerVisibleEntries();
  const countEl=$('#volunteerPanelCount');
  if(countEl)countEl.textContent=`已选 ${volunteerKeys.length} / ${VOLUNTEER_LIMIT} 个专业组｜当前显示 ${visible.length} 个`;
  const expandBtn=$('#expandVolunteerBtn');
  if(expandBtn)expandBtn.textContent=volunteerAllExpanded?'一键收起编辑':'一键展开编辑';
  if(!volunteerKeys.length){
    list.innerHTML='<div class="change-empty">还没有加入专业组。先按院校、地区、专业大类、分数段筛选，再点“当前筛选补满”，或在专业组卡片上点“加入志愿表”。</div>';
    updateVolunteerUI();
    return;
  }
  if(!visible.length){
    list.innerHTML='<div class="change-empty">当前志愿表中没有符合筛选条件的专业组。可以清除筛选后再查看完整志愿表。</div>';
    updateVolunteerUI();
    return;
  }
  list.innerHTML=visible.map(({key,index})=>volunteerRowHTML(key,index)).join('');
  bindVolunteerPanelControls();
  updateVolunteerUI();
}
function volunteerRowHTML(key,index){
  const rec=getGroupRecord(key);
  if(!rec)return '';
  const {s,g}=rec;
  ensureVolunteerSelection(key);
  const meta=volunteerMeta[key]||{};
  const majors=sortedMajors(g);
  const selectedOrder=selectedMajorOrder(key);
  const selectedMajors=selectedMajorsForKey(key);
  const planDiff=(g.plan26||0)-(g.plan25||0);
  const detailsOpen=(volunteerAllExpanded||volunteerExpandedKeys.has(key))?' open':'';
  const groupAlias=groupDisplayName(s,g)||'未命名';
  const poolFilter=volunteerMajorPoolFilter[key]||'all';
  const selectedList=selectedMajors.length?`<ol class="volunteer-major-strip">${selectedMajors.map((m,i)=>`<li class="volunteer-major-strip-item"><span class="major-order-badge">${i+1}</span><div class="volunteer-major-name"><b>${esc(m.name)}</b><small>${esc(m.majorClass||'其他')}｜${fmt(m.plan26)}人｜${fmtNum(m.score25)}分</small></div><div class="volunteer-major-mini-actions"><button title="专业上移" data-major-move="${esc(key)}" data-major-key="${esc(m.key)}" data-delta="-1" ${i===0?'disabled':''}>↑</button><button title="专业下移" data-major-move="${esc(key)}" data-major-key="${esc(m.key)}" data-delta="1" ${i===selectedMajors.length-1?'disabled':''}>↓</button><button title="取消该专业" data-major-unselect="${esc(key)}" data-major-key="${esc(m.key)}">×</button></div></li>`).join('')}</ol>`:`<div class="volunteer-selected-empty-compact">尚未选择具体专业。展开专业池后勾选，系统会按勾选顺序生成第 1—6 专业。</div>`;
  const majorPicker=`<details class="major-picker volunteer-edit-drawer"${detailsOpen}><summary>专业池 ${majors.length} 个｜已选 ${selectedOrder.length} / ${MAX_MAJOR_PER_GROUP}</summary><div class="major-picker-actions compact"><select data-major-pool-filter="${esc(key)}"><option value="all" ${poolFilter==='all'?'selected':''}>全部专业</option><option value="selected" ${poolFilter==='selected'?'selected':''}>只看已选</option><option value="unselected" ${poolFilter==='unselected'?'selected':''}>只看未选</option></select><button data-major-preset="${esc(key)}" data-preset="none">清空专业</button></div><div class="major-picker-grid volunteer-major-grid compact-grid">${majors.map(m=>{const order=selectedOrder.indexOf(m.key);const isSelected=order>=0;const hidden=(poolFilter==='selected'&&!isSelected)||(poolFilter==='unselected'&&isSelected);return `<label class="major-check ${m.risk?'risk':''} ${isSelected?'selected':'unselected'}" data-major-pool-state="${isSelected?'selected':'unselected'}" ${hidden?'style="display:none"':''}><input type="checkbox" data-major-check="${esc(key)}" value="${esc(m.key)}" ${isSelected?'checked':''}>${isSelected?`<span class="major-order-badge">${order+1}</span>`:'<span class="major-order-placeholder">—</span>'}<b>${esc(m.name)}</b>${m.risk?' <span>风险</span>':''}<small>${esc(m.majorClass||'其他')}｜${fmt(m.plan26)}人｜${fmtNum(m.score25)}分｜位次 ${fmtNum(m.rank25)}</small></label>`;}).join('')}</div></details>`;
  return `<article class="volunteer-item volunteer-table-row" data-volunteer-item="${esc(key)}">
    <div class="volunteer-order-col"><input class="volunteer-position-input" data-volunteer-position="${esc(key)}" value="${index+1}" title="输入目标序号，例如 10 或 第10" inputmode="numeric" aria-label="志愿序号"><span class="volunteer-drag-handle" data-volunteer-drag-handle="${esc(key)}" draggable="true" title="按住拖动调整专业组顺序">↕</span></div>
    <div class="volunteer-group-col"><div class="volunteer-group-title"><b>${esc(s.name)} ${esc(g.groupName)}</b></div><p>再选 ${esc(g.requirement||'—')}</p><p class="volunteer-group-alias">${esc(groupAlias)}</p></div>
    <div class="volunteer-major-col"><div class="volunteer-selected-summary"><div class="volunteer-col-caption">已选专业 <span>${selectedOrder.length}/${MAX_MAJOR_PER_GROUP}</span></div>${selectedList}</div>${majorPicker}</div>
    <div class="volunteer-data-col"><div class="volunteer-data-line emphasis">${groupScoreLineHTML(s,g)}</div><div class="volunteer-data-line">26计划 ${fmt(g.plan26)}｜较25 ${formatSigned(planDiff)}</div><div class="volunteer-mini-controls single"><label>定位<select data-volunteer-meta="${esc(key)}" data-field="strategy"><option value="">待定</option>${['冲','稳','保','垫'].map(v=>`<option value="${v}" ${meta.strategy===v?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="volunteer-obey-fixed">默认服从专业组内调剂</div><input class="volunteer-note-compact" data-volunteer-meta="${esc(key)}" data-field="note" value="${esc(meta.note||'')}" placeholder="备注"></div>
    <div class="volunteer-actions volunteer-action-col"><button class="icon-btn" title="上移" aria-label="上移" data-volunteer-move="${esc(key)}" data-delta="-1" ${index===0?'disabled':''}>↑</button><button class="icon-btn" title="下移" aria-label="下移" data-volunteer-move="${esc(key)}" data-delta="1" ${index===volunteerKeys.length-1?'disabled':''}>↓</button><button class="icon-btn danger" title="删除" aria-label="删除" data-volunteer-remove="${esc(key)}">×</button></div>
  </article>`;
}
function bindVolunteerPanelControls(){
  $$('.volunteer-edit-drawer').forEach(drawer=>drawer.addEventListener('toggle',()=>{
    const row=drawer.closest('[data-volunteer-item]');
    const key=row?.dataset.volunteerItem;
    if(!key)return;
    if(drawer.open)volunteerExpandedKeys.add(key);
    else if(!volunteerAllExpanded)volunteerExpandedKeys.delete(key);
  }));
  $$('[data-volunteer-remove]').forEach(btn=>btn.addEventListener('click',()=>removeVolunteerKey(btn.dataset.volunteerRemove)));
  $$('[data-volunteer-move]').forEach(btn=>btn.addEventListener('click',()=>moveVolunteerKey(btn.dataset.volunteerMove,Number(btn.dataset.delta)||0)));
  $$('[data-volunteer-position]').forEach(input=>{
    input.addEventListener('focus',()=>input.select());
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}});
    input.addEventListener('change',()=>{if(!moveVolunteerKeyToPosition(input.dataset.volunteerPosition,input.value))renderVolunteerPanel();});
  });
  bindVolunteerDragControls();
  $$('[data-volunteer-meta]').forEach(el=>el.addEventListener('input',()=>{const key=el.dataset.volunteerMeta; volunteerMeta[key]={...(volunteerMeta[key]||{}),[el.dataset.field]:el.value}; saveVolunteerMeta();}));
  $$('[data-major-pool-filter]').forEach(sel=>sel.addEventListener('change',()=>{const key=sel.dataset.majorPoolFilter; volunteerMajorPoolFilter[key]=sel.value||'all'; keepVolunteerDrawerOpen(key); renderVolunteerPanel();}));
  $$('[data-major-check]').forEach(cb=>cb.addEventListener('change',()=>{
    keepVolunteerDrawerOpen(cb.dataset.majorCheck);
    const ok=setMajorSelection(cb.dataset.majorCheck,cb.value,cb.checked);
    if(!ok)cb.checked=!cb.checked;
    renderVolunteerPanel();
    render();
  }));
  $$('[data-major-preset]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    const key=btn.dataset.majorPreset;
    keepVolunteerDrawerOpen(key);
    const rec=getGroupRecord(key);
    if(!rec)return;
    if(btn.dataset.preset==='none')setMajorSelectionBulk(key,[]);
    renderVolunteerPanel();
    render();
  }));
  $$('[data-major-move]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    keepVolunteerDrawerOpen(btn.dataset.majorMove);
    moveMajorSelection(btn.dataset.majorMove,btn.dataset.majorKey,Number(btn.dataset.delta)||0);
    renderVolunteerPanel();
    render();
  }));
  $$('[data-major-unselect]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    keepVolunteerDrawerOpen(btn.dataset.majorUnselect);
    setMajorSelection(btn.dataset.majorUnselect,btn.dataset.majorKey,false);
    renderVolunteerPanel();
    render();
  }));
}
function clearVolunteerDragMarks(){
  $$('[data-volunteer-item]').forEach(item=>item.classList.remove('dragging','drag-over','drop-after','drop-before'));
}
function bindVolunteerDragControls(){
  $$('[data-volunteer-drag-handle]').forEach(handle=>{
    handle.addEventListener('dragstart',e=>{
      volunteerDragKey=handle.dataset.volunteerDragHandle||'';
      if(e.dataTransfer){
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',volunteerDragKey);
      }
      const item=handle.closest('[data-volunteer-item]');
      if(item)item.classList.add('dragging');
    });
    handle.addEventListener('dragend',()=>{volunteerDragKey='';clearVolunteerDragMarks();});
  });
  $$('[data-volunteer-item]').forEach(item=>{
    item.addEventListener('dragover',e=>{
      const targetKey=item.dataset.volunteerItem;
      if(!volunteerDragKey||!targetKey||volunteerDragKey===targetKey)return;
      e.preventDefault();
      const rect=item.getBoundingClientRect();
      const after=e.clientY>rect.top+rect.height/2;
      item.classList.add('drag-over');
      item.classList.toggle('drop-after',after);
      item.classList.toggle('drop-before',!after);
    });
    item.addEventListener('dragleave',()=>item.classList.remove('drag-over','drop-after','drop-before'));
    item.addEventListener('drop',e=>{
      const targetKey=item.dataset.volunteerItem;
      if(!volunteerDragKey||!targetKey||volunteerDragKey===targetKey)return;
      e.preventDefault();
      const after=item.classList.contains('drop-after');
      const dragKey=volunteerDragKey;
      volunteerDragKey='';
      clearVolunteerDragMarks();
      moveVolunteerKeyByDrop(dragKey,targetKey,after);
    });
  });
}

function xlsCell(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function localDateStamp(d=new Date()){
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}
function excelCell(v,style,opts={}){
  const isNum=typeof v==='number'&&Number.isFinite(v);
  const attrs=[];
  if(style)attrs.push(`ss:StyleID="${style}"`);
  if(opts.index)attrs.push(`ss:Index="${opts.index}"`);
  if(opts.mergeDown)attrs.push(`ss:MergeDown="${opts.mergeDown}"`);
  if(opts.mergeAcross)attrs.push(`ss:MergeAcross="${opts.mergeAcross}"`);
  return `<Cell${attrs.length?' '+attrs.join(' '):''}><Data ss:Type="${isNum?'Number':'String'}">${xlsCell(v)}</Data></Cell>`;
}
function excelCellSpec(spec,rowStyle){
  if(spec&&typeof spec==='object'&&!Array.isArray(spec)&&Object.prototype.hasOwnProperty.call(spec,'value')){
    return excelCell(spec.value,spec.style!==undefined?spec.style:rowStyle,spec);
  }
  return excelCell(spec,rowStyle);
}
function excelRow(row,style,opts={}){const attrs=[]; if(opts.height)attrs.push(`ss:Height="${opts.height}"`); return `<Row${attrs.length?' '+attrs.join(' '):''}>${row.map(v=>excelCellSpec(v,style)).join('')}</Row>`;}
function excelColumns(headers,widths=[]){return headers.map((h,i)=>`<Column ss:Index="${i+1}" ss:AutoFitWidth="0" ss:Width="${widths[i]||Math.min(Math.max(String(h).length*10,56),180)}"/>`).join('');}
function excelWorksheet(name,headers,rows,widths){
  return `<Worksheet ss:Name="${xlsCell(name)}"><Table>${excelColumns(headers,widths)}${excelRow(headers,'header')}${rows.map(r=>Array.isArray(r)?excelRow(r):excelRow(r.values,r.style)).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
}
function excelMetric(v){
  return v===null||v===undefined||v===''||Number.isNaN(v)?'':v;
}
function groupShortTitle(s,g){
  const school=String(s?.name||'').trim();
  const group=String(g?.groupName||'').trim();
  if(!group)return school;
  return group.includes(school)?group:`${school} ${group}`;
}
function groupExportInfo(s,g){
  const parts=[];
  const alias=groupDisplayName(s,g)||'';
  if(alias)parts.push(alias);
  if(g.requirement)parts.push(`再选 ${g.requirement}`);
  parts.push(`26计划 ${fmt(g.plan26)}`);
  parts.push(`25分 ${fmtNum(g.score25)}`);
  parts.push(`25位次 ${fmtNum(g.rank25)}`);
  return parts.filter(Boolean).join('｜');
}
function majorsForVolunteerExport(key,g){
  const selectedKeys=selectedMajorOrder(key);
  const selectedSet=new Set(selectedKeys);
  const byKey=new Map((g.majors||[]).map(m=>[m.key,m]));
  const selected=selectedKeys.map(k=>byKey.get(k)).filter(Boolean).map((m,i)=>({m,order:i+1,selected:true}));
  const unselected=sortedMajors(g).filter(m=>!selectedSet.has(m.key)).map(m=>({m,order:'',selected:false}));
  return selected.concat(unselected);
}
function exportVolunteerXlsx(){
  const invalid=[];
  for(let i=0;i<volunteerKeys.length;i++){
    const key=volunteerKeys[i];
    const rec=getGroupRecord(key);
    if(!rec)continue;
    const total=(rec.g.majors||[]).length;
    const required=Math.min(MAX_MAJOR_PER_GROUP,total);
    const selectedCount=selectedMajorOrder(key).length;
    if(required>0&&selectedCount!==required){
      invalid.push(`${i+1}. ${groupShortTitle(rec.s,rec.g)}：已选 ${selectedCount}/${required}`);
    }
  }
  if(invalid.length){
    alert(`导出前需要把每个专业组的专业填满：\n${invalid.slice(0,10).join('\n')}${invalid.length>10?'\n……':''}`);
    return;
  }
  const date=localDateStamp();
  const headers=['志愿序号','院校代码','专业组','专业组信息','专业志愿序号','专业代码','专业名称','2026计划','25计划','25最低分','25最低位次','3年平均分','3年平均位次','定位','服从调剂','备注','选择状态'];
  const widths=[58,82,170,320,72,76,280,76,72,76,92,86,110,70,78,220,92];
  const valueOrBlank=v=>v===null||v===undefined||v===''||Number.isNaN(v)?'':v;
  const rows=[];
  for(let i=0;i<volunteerKeys.length;i++){
    const key=volunteerKeys[i];
    const rec=getGroupRecord(key);
    if(!rec)continue;
    const {s,g}=rec;
    const meta=volunteerMeta[key]||{};
    const majorItems=majorsForVolunteerExport(key,g);
    const items=majorItems.length?majorItems:[{m:null,order:'',selected:false}];
    const span=items.length;
    const merge=span>1?span-1:0;
    const selectedCount=selectedMajorOrder(key).length;
    const totalMajors=(g.majors||[]).length;
    const groupTitle=`${groupShortTitle(s,g)}（${selectedCount}-${totalMajors}）`;
    const groupInfo=groupExportInfo(s,g);
    items.forEach((item,idx)=>{
      const m=item.m;
      const selected=item.selected;
      const status=selected?`已选第${item.order}专业`:'未选';
      const majorSeqStyle=selected?'seq':'unselectedSeq';
      const majorTextStyle=selected?'body':'unselected';
      const majorNumStyle=selected?'num':'unselectedNum';
      const majorCells=[
        {value:m?item.order:'',style:majorSeqStyle,index:5},
        {value:m?(m.code||''):'',style:majorTextStyle},
        {value:m?(m.name||'未选择具体专业'):'未选择具体专业',style:majorTextStyle},
        {value:m?valueOrBlank(m.plan26):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.plan25):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.score25):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.rank25):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.avgScore3):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.avgRank3):'',style:majorNumStyle}
      ];
      const statusCell={value:status,style:selected?'body':'unselectedStatus'};
      if(idx===0){
        rows.push([
          {value:i+1,style:'seq',mergeDown:merge},
          {value:g.groupCode||'',style:'body',mergeDown:merge},
          {value:groupTitle,style:'group',mergeDown:merge},
          {value:groupInfo,style:'groupInfo',mergeDown:merge},
          ...majorCells.map((c,n)=>n===0?{...c,index:undefined}:c),
          {value:meta.strategy||'待定',style:'seq',mergeDown:merge},
          {value:'是',style:'seq',mergeDown:merge},
          {value:meta.note||'',style:'note',mergeDown:merge},
          statusCell
        ]);
      }else{
        rows.push([...majorCells,{...statusCell,index:17}]);
      }
    });
  }
  if(!rows.length){
    alert('志愿表为空，暂无可导出的专业组。');
    return;
  }
  const thinBorder='<Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/></Borders>';
  const columns=excelColumns(headers,widths);
  const title=`江苏本科志愿表｜已选 ${volunteerKeys.length} / ${VOLUNTEER_LIMIT} 专业组｜导出日期 ${date}`;
  const topRows=[
    excelRow([{value:title,style:'title',mergeAcross:headers.length-1}],null,{height:32}),
    excelRow(headers.map(h=>({value:h,style:'subheader'})),null,{height:30})
  ].join('');
  const body=rows.map(r=>excelRow(r,'body')).join('');
  const lastRow=rows.length+2;
  const lastCol=headers.length;
  const workbook=`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Created>${new Date().toISOString()}</Created><LastSaved>${new Date().toISOString()}</LastSaved></DocumentProperties>
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/>${thinBorder}</Style>
<Style ss:ID="title"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0A7C42" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="subheader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E8F1EC" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="group"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#173526"/><Interior ss:Color="#F3FBF6" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="groupInfo"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#173526"/><Interior ss:Color="#F3FBF6" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="body"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/>${thinBorder}</Style>
<Style ss:ID="seq"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1"/>${thinBorder}</Style>
<Style ss:ID="num"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/>${thinBorder}</Style>
<Style ss:ID="note"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#374151"/><Interior ss:Color="#FAFAFA" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="unselected"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#B91C1C"/>${thinBorder}</Style>
<Style ss:ID="unselectedSeq"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>${thinBorder}</Style>
<Style ss:ID="unselectedNum"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#B91C1C"/>${thinBorder}</Style>
<Style ss:ID="unselectedStatus"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>${thinBorder}</Style>
</Styles>
<Worksheet ss:Name="志愿基础表"><Table>${columns}${topRows}${body}</Table><AutoFilter x:Range="R2C1:R${lastRow}C${lastCol}" xmlns="urn:schemas-microsoft-com:office:excel"/><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>2</SplitHorizontal><TopRowBottomPane>2</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>
</Workbook>`;
  const blob=new Blob(['\ufeff',workbook],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`江苏志愿基础表_${date}.xls`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
}

function bindGroupChangeButtons(){
  $$('[data-change-key]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      openGroupChange(btn.dataset.changeKey,btn.dataset.changeTitle);
    };
  });
}
function openGroupChange(key,title){
  $('#changePanelTitle').textContent=title||key;
  const data=GROUP_CHANGES[key];
  $('#changePanelBody').innerHTML=data?groupChangeHTML(data):`<div class="change-empty">暂无普通批 25-26 变迁数据。<br><span class="muted">当前变迁表主要覆盖普通类本科批；提前批或异常组可能未纳入。</span></div>`;
  openPanel('changePanel');
}
function metricTile(label,value,sub){
  return `<div class="change-metric"><b>${esc(fmt(value))}</b><span>${esc(label)}${sub?`｜${esc(sub)}`:''}</span></div>`;
}
function changeDetailLine(item){
  const parts=[];
  if(item.plan!==null&&item.plan!==undefined&&item.plan!=='')parts.push(`${item.plan}人`);
  if(item.type)parts.push(item.type);
  if(item.from)parts.push(`来源：${item.from}`);
  if(item.to)parts.push(`去向：${item.to}`);
  if(item.basis)parts.push(`依据：${item.basis}`);
  if(item.note||item.reason)parts.push(item.note||item.reason);
  return `<li><b>${esc(item.name||'未命名专业')}</b>${parts.length?`<br><span>${esc(parts.join('｜'))}</span>`:''}</li>`;
}
function changeDetailBlock(title,items){
  const list=(items||[]).slice(0,80);
  return `<section class="change-section"><h4>${esc(title)} <span class="muted">${(items||[]).length}</span></h4>${list.length?`<ol class="change-list">${list.map(changeDetailLine).join('')}</ol>${(items||[]).length>80?'<p class="muted">仅显示前 80 条。</p>':''}`:'<p class="muted">无</p>'}</section>`;
}
function groupChangeHTML(d){
  const planDiff=diffText(d.plan26,d.plan25);
  const majorDiff=diffText(d.majorCount26,d.majorCount25);
  const adviceClass=d.advice==='重点核对'?'warn':'';
  return `<div class="change-status-row"><span class="change-pill">${esc(d.status||'未标注状态')}</span><span class="change-pill ${adviceClass}">${esc(d.advice||'常规核对')}</span><span class="change-pill">置信度：${esc(fmt(d.confidence))}</span></div>
  <div class="change-compare"><div class="change-side"><span>2026 当前组</span><b>${esc(d.group26||'—')}</b><p>再选：${esc(fmt(d.require26))}｜专业 ${esc(fmt(d.majorCount26))}｜计划 ${esc(fmt(d.plan26))}</p></div><div class="change-side"><span>2025 对应组</span><b>${esc(d.group25||'—')}</b><p>再选：${esc(fmt(d.require25))}｜专业 ${esc(fmt(d.majorCount25))}｜计划 ${esc(fmt(d.plan25))}</p></div></div>
  <div class="change-metrics">${metricTile('计划变化',planDiff)}${metricTile('专业数变化',majorDiff)}${metricTile('综合相似度',percent(d.similarity))}${metricTile('26/25覆盖率',`${percent(d.cover26)} / ${percent(d.cover25)}`)}${metricTile('新增专业',d.addCount)}${metricTile('减少专业',d.removeCount)}${metricTile('拆入专业',d.inCount)}${metricTile('拆出专业',d.outCount)}</div>
  <section class="change-section"><h4>变化摘要</h4><p class="change-summary-text">${esc(d.summary||'无明显变化')}</p></section>
  ${changeDetailBlock('新增专业',d.details?.add)}
  ${changeDetailBlock('减少专业',d.details?.remove)}
  ${changeDetailBlock('拆入专业',d.details?.in)}
  ${changeDetailBlock('拆出专业',d.details?.out)}`;
}

function stableTerm(scope,key){
  return `js-plan-annotation::${scope}::${key}`;
}
function openAnnotation(payload){
  window.__currentAnnotation=payload;
  const {scope,key,title}=payload;
  const term=stableTerm(scope,key);
  $('#annotationObject').textContent=title;
  $('#annotationDrawer').classList.add('open');
  loadGiscus(term,title);
}
function closeAnnotationDrawer(){
  $('#annotationDrawer').classList.remove('open');
}
function giscusConfigured(){
  return !!(GISCUS_CONFIG.repo&&GISCUS_CONFIG.repoId&&GISCUS_CONFIG.category&&GISCUS_CONFIG.categoryId);
}
function loadGiscus(term,title){
  const mount=$('#giscusMount');
  mount.innerHTML='';
  if(!giscusConfigured()){
    mount.innerHTML=`<div class="giscus-config-tip"><h4>giscus 尚未配置</h4><p>请先到 giscus.app 为你的 GitHub 仓库生成配置，然后把 <code>repo</code>、<code>repoId</code>、<code>category</code>、<code>categoryId</code> 填入 app.js 顶部的 <code>GISCUS_CONFIG</code>。</p><p><b>当前批注绑定 term：</b></p><code>${esc(term)}</code><p class="muted">配置完成后，同一个学校、专业组或专业会稳定绑定到同一个 GitHub Discussion。</p></div>`;
    return;
  }
  const script=document.createElement('script');
  script.src='https://giscus.app/client.js';
  script.setAttribute('data-repo',GISCUS_CONFIG.repo);
  script.setAttribute('data-repo-id',GISCUS_CONFIG.repoId);
  script.setAttribute('data-category',GISCUS_CONFIG.category);
  script.setAttribute('data-category-id',GISCUS_CONFIG.categoryId);
  script.setAttribute('data-mapping','specific');
  script.setAttribute('data-term',term);
  script.setAttribute('data-strict','1');
  script.setAttribute('data-reactions-enabled','1');
  script.setAttribute('data-emit-metadata','0');
  script.setAttribute('data-input-position','top');
  script.setAttribute('data-theme',GISCUS_CONFIG.theme||'light');
  script.setAttribute('data-lang',GISCUS_CONFIG.lang||'zh-CN');
  script.setAttribute('crossorigin','anonymous');
  script.async=true;
  mount.appendChild(script);
}
function bindAnnotationButtons(){
  $$('[data-annotation-scope]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      openAnnotation({scope:btn.dataset.annotationScope,key:btn.dataset.annotationKey,title:btn.dataset.annotationTitle});
    };
  });
}

async function fetchNotes(){
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY){return;}
  try{const res=await fetch(`${SUPABASE_URL}/rest/v1/notes?select=scope,target_key,note`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken||SUPABASE_ANON_KEY}`}}); if(!res.ok)throw new Error(await res.text()); const rows=await res.json(); notes={schools:{},groups:{},majors:{}}; rows.forEach(r=>{if(notes[r.scope])notes[r.scope][r.target_key]=r.note;}); applyFilters();}
  catch(err){console.warn('读取备注失败',err);}
}
function showLoginModal(){
  $('#modal').innerHTML=`<h3>登录 Supabase 数据库</h3><div class="modal-body"><p class="muted">需要先在 app.js 中填写 Supabase URL 与 anon key，并在 Supabase 中配置 notes / admin_users 表与 RLS。</p><div class="score-row"><label>邮箱</label><input id="loginEmail" type="email" value="${esc(ADMIN_EMAIL)}" style="grid-column:span 2;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 10px"></div><div class="score-row"><label>密码</label><input id="loginPwd" type="password" style="grid-column:span 2;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 10px"></div><div class="modal-actions"><button onclick="document.getElementById('modalMask').classList.remove('open')">取消</button><button id="doLogin" class="save">登录</button></div></div>`;
  openModal(); $('#doLogin').addEventListener('click',loginSupabase);
}
async function loginSupabase(){
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY){alert('请先在 app.js 中填写 Supabase 配置。');return;}
  const email=$('#loginEmail').value, password=$('#loginPwd').value;
  try{const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})}); if(!res.ok)throw new Error(await res.text()); const data=await res.json(); auth.accessToken=data.access_token; auth.user=data.user; closeModal(); alert('登录成功'); fetchNotes();}
  catch(err){alert('登录失败：'+err.message);}
}
function showNoteEditor(scope,key,title){
  if(document.body.dataset.admin!=='1')return;
  const old=notes[scope]?.[key]||'';
  $('#modal').innerHTML=`<h3>${esc(title)}</h3><div class="modal-body edit-area"><textarea id="noteText" placeholder="输入文字备注；不支持图片备注。">${esc(old)}</textarea><div class="modal-actions"><button onclick="document.getElementById('modalMask').classList.remove('open')">关闭</button><button class="delete" id="deleteNote">删除</button><button class="save" id="saveNote">保存</button></div><div class="context-hint">scope：${esc(scope)}｜target_key：${esc(key)}</div></div>`;
  openModal();
  $('#saveNote').addEventListener('click',()=>saveNote(scope,key,$('#noteText').value));
  $('#deleteNote').addEventListener('click',()=>deleteNote(scope,key));
}
async function saveNote(scope,key,text){
  if(!text.trim()){await deleteNote(scope,key);return;}
  notes[scope][key]=text.trim();
  closeModal(); applyFilters();
  if(SUPABASE_URL&&SUPABASE_ANON_KEY&&auth.accessToken){try{await fetch(`${SUPABASE_URL}/rest/v1/notes?on_conflict=scope,target_key`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({scope,target_key:key,note:text.trim(),created_by:auth.user?.id})});}catch(err){console.warn('保存备注失败',err);}}
}
async function deleteNote(scope,key){
  delete notes[scope][key];
  closeModal(); applyFilters();
  if(SUPABASE_URL&&SUPABASE_ANON_KEY&&auth.accessToken){try{await fetch(`${SUPABASE_URL}/rest/v1/notes?scope=eq.${encodeURIComponent(scope)}&target_key=eq.${encodeURIComponent(key)}`,{method:'DELETE',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`}});}catch(err){console.warn('删除备注失败',err);}}
}
function init(){
  buildGroupIndex();
  createLayout();
  initFilters();
  buildProvincePanel();
  buildLevelPanel();
  buildRequirementPanel();
  buildClassPanel();
  updateProvinceButton();
  updateLevelButton();
  updateRequirementButton();
  updateClassButton();
  bindEvents();
  updateVolunteerUI();
  applyFilters();
  fetchNotes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
