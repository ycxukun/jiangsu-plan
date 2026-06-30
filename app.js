(function(){
'use strict';
const VERSION='2026在招专业组版｜V1.1.8 志愿表单版';
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
const VOLUNTEER_STORAGE_KEY='js-plan-volunteer-groups-v1';
const VOLUNTEER_MAJOR_STORAGE_KEY='js-plan-volunteer-major-keys-v1';
const VOLUNTEER_META_STORAGE_KEY='js-plan-volunteer-meta-v1';
let volunteerKeys=loadVolunteerKeys();
let volunteerMajorKeys=loadVolunteerMajorKeys();
let volunteerMeta=loadVolunteerMeta();
let groupIndex=new Map();
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const fmt=v=>v===null||v===undefined||v===''?'—':String(v);
const fmtNum=v=>v===null||v===undefined||v===''?'—':(typeof v==='number'?Number(v.toFixed? v.toFixed(1):v):v);
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
    <div id="volunteerPanel" class="panel volunteer-panel"><div class="panel-head"><div><h3>志愿表单</h3><p id="volunteerPanelCount" class="panel-subtitle">0 / 40</p></div><button class="close-btn" data-close="volunteerPanel">×</button></div><div class="panel-body"><div class="volunteer-toolbar"><button id="fillVolunteerBtn" type="button">当前筛选补满</button><button id="exportVolunteerBtn" class="save" type="button">导出 Excel</button><button id="clearVolunteerBtn" type="button">清空</button></div><div id="volunteerList" class="volunteer-list"></div></div></div>
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
function updateRangeSummary(){const t=+$('#targetScoreInput').value||0,d=+$('#downInput').value||0,u=+$('#upInput').value||0;$('#rangeSummary').textContent=`目标分：${t}｜下浮${d}｜上浮${u}｜区间${t-d}—${t+u}`;}
function openPanel(id){$('#'+id).classList.add('open');}
function closePanel(id){$('#'+id).classList.remove('open');}
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
function groupMatchesScore(g){if(!state.scoreRange)return true; const scores=[]; if(g.score25)scores.push(g.score25); g.majors.forEach(m=>{if(m.score25)scores.push(m.score25)}); return scores.some(sc=>sc>=state.scoreRange.min&&sc<=state.scoreRange.max);}
function groupMatchesClass(g){if(!state.selectedClasses.size)return true; return (g.majorClasses||[]).some(c=>state.selectedClasses.has(c));}
function groupMatchesRequirement(g){if(!state.selectedRequirements.size)return true; return state.selectedRequirements.has(String(g.requirement||'').trim());}
function applyFilters(){
  const result=[]; const q=state.q;
  DB.forEach(s=>{
    if(state.batch&&s.batch!==state.batch)return;
    if(state.subject&&s.subject!==state.subject)return;
    if(state.selectedProvinces.size&&!state.selectedProvinces.has(s.province))return;
    if(state.selectedLevels.size&&!state.selectedLevels.has(String(s.level)))return;
    const groups=s.groups.filter(g=>{if(state.role&&!(g.tags||[]).includes(state.role))return false; if(!groupMatchesRequirement(g))return false; if(!groupMatchesScore(g))return false; if(!groupMatchesClass(g))return false; if(!groupMatchesSearch(s,g,q))return false; return true;});
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
  $('#main').innerHTML=`<div class="school-header"><div class="school-title"><h2>专业组视图</h2><span class="badge green">当前显示 ${shown.length} / ${groups.length} 组</span></div><div class="badges"><span class="badge">按院校加权均分排序</span><span class="badge">每所院校下按专业组 25 分排序</span></div></div>`+shown.map(([s,g])=>groupSectionHTML(s,g)).join('')+(groups.length>limit?`<div class="empty">为保证浏览器性能，当前展示前 ${limit} 个专业组；可以继续缩小筛选条件。</div>`:'');
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
  return `<article class="group-card group-quality-${quality.tone}" data-scroll="${g.id}" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}" title="${esc(quality.title)}"><div class="group-card-head"><h3>${groupTitleHTML(s,g)}${noteBadge('groups',keyGroup(s,g))}</h3>${groupChangeButtonHTML(s,g,'card')}</div><div class="grid"><div class="mini"><b>${fmtNum(g.score25)}</b><span>25分</span></div><div class="mini"><b>${fmtNum(g.rank25)}</b><span>25位次</span></div><div class="mini"><b>${g.majors.length}</b><span>专业数</span></div></div><div class="tag-row">${groupQualityBadge(quality)}${planDeltaBadge(planDiff)}${topTags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="anno-actions">${volunteerButtonHTML(s,g)}<button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">新增批注</button></div></article>`;
}
function groupSectionHTML(s,g){
  const planDiff=(g.plan26||0)-(g.plan25||0);
  const quality=groupQuality(s,g);
  const title=groupDisplayTitleText(s,g);
  return `<section id="${g.id}" class="group-section group-quality-${quality.tone}" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}" title="${esc(quality.title)}"><div class="group-head"><div class="group-head-main"><h3>${groupTitleHTML(s,g)}${noteBadge('groups',keyGroup(s,g))}</h3><p>${esc(s.name)}｜再选：${esc(g.requirement||'—')}｜25分 ${fmtNum(g.score25)}｜25位次 ${fmtNum(g.rank25)}｜26计划 ${fmt(g.plan26)}｜较25年 ${formatSigned(planDiff)} ${planDiff===0?'':`<span class="${signedClass(planDiff)}">(${formatSigned(planDiff)})</span>`}</p><div class="tag-row">${groupQualityBadge(quality)}${(g.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')} ${(g.majorClasses||[]).slice(0,8).map(c=>`<span class="badge">${esc(c)}</span>`).join('')} ${planDeltaBadge(planDiff)}</div><div class="anno-actions">${volunteerButtonHTML(s,g)}<button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">新增批注</button></div></div>${groupChangeButtonHTML(s,g,'section')}</div><div class="table-wrap"><table><thead><tr><th>代码</th><th>专业名称</th><th>专业类</th><th>26计划/变化</th><th>25分/位次</th><th>三年均分/位次</th></tr></thead><tbody>${[...g.majors].sort(majorSortByThreeYear).map(m=>majorRowHTML(s,g,m)).join('')}</tbody></table></div></section>`;
}
function majorRowHTML(s,g,m){
  const avgYears=m.avgYears&&m.avgYears<3?`<br><span class="muted">${m.avgYears}年均值</span>`:'';
  return `<tr class="${m.risk?'risk-row':''} clickable-row" data-note-scope="majors" data-note-key="${esc(keyMajor(m))}" data-detail-row="${esc(m.key)}" data-school-key="${esc(keySchool(s))}" data-group-key="${esc(keyGroup(s,g))}"><td>${esc(m.code)}</td><td class="major-name">${esc(m.name)}${m.risk?'<span class="risk-label">风险</span>':''}${noteBadge('majors',keyMajor(m))}<button class="anno-mini" data-annotation-scope="majors" data-annotation-key="${esc(keyMajor(m))}" data-annotation-title="${esc(s.name)} ${esc(groupDisplayTitleText(s,g))} ${esc(m.name)}｜专业批注">批注</button></td><td>${esc(m.majorClass||'其他')}<br><span class="muted">${esc(m.discipline||'其他')}</span></td><td>${fmt(m.plan26)} / ${planChangeInline(m.planChange)}</td><td>${fmtNum(m.score25)} / ${fmtNum(m.rank25)}</td><td>${fmtNum(m.avgScore3)} / ${fmtNum(m.avgRank3)}${avgYears}</td></tr>`;
}
function bindDynamic(){
  $$('[data-scroll]').forEach(el=>el.addEventListener('click',()=>document.getElementById(el.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));
  $$('[data-detail-row]').forEach(tr=>tr.addEventListener('click',e=>{if(e.target.closest('button,a,input,label,textarea'))return; showDetail(tr.dataset.detailRow,tr.dataset.schoolKey,tr.dataset.groupKey);}));
  bindVolunteerButtons();
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
  volunteerKeys=[...new Set(volunteerKeys)].filter(k=>groupIndex.has(k)).slice(0,VOLUNTEER_LIMIT);
  volunteerKeys.forEach(ensureVolunteerSelection);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
}
function getGroupRecord(key){return groupIndex.get(key)||null;}
function sortedMajors(g){return [...(g.majors||[])].sort((a,b)=>{if(Boolean(a.risk)!==Boolean(b.risk))return a.risk?1:-1; return majorSortByThreeYear(a,b);});}
function defaultMajorKeys(g){return sortedMajors(g).slice(0,6).map(m=>m.key);}
function ensureVolunteerSelection(key){
  const rec=getGroupRecord(key);
  if(!rec)return;
  const valid=new Set((rec.g.majors||[]).map(m=>m.key));
  const old=Array.isArray(volunteerMajorKeys[key])?volunteerMajorKeys[key].filter(k=>valid.has(k)):[];
  volunteerMajorKeys[key]=old.length?old:defaultMajorKeys(rec.g);
  if(!volunteerMeta[key])volunteerMeta[key]={strategy:'',obey:'是',note:''};
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
function bindVolunteerButtons(){
  $$('[data-volunteer-key]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      addVolunteerKey(btn.dataset.volunteerKey);
    };
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
  const selected=new Set(volunteerMajorKeys[key]||[]);
  return sortedMajors(rec.g).filter(m=>selected.has(m.key));
}
function renderVolunteerPanel(){
  const list=$('#volunteerList');
  if(!list)return;
  if(!volunteerKeys.length){
    list.innerHTML='<div class="change-empty">还没有加入专业组。先按院校、地区、专业大类、分数段筛选，再点“当前筛选补满”，或在专业组卡片上点“加入志愿表”。</div>';
    updateVolunteerUI();
    return;
  }
  list.innerHTML=volunteerKeys.map((key,i)=>volunteerRowHTML(key,i)).join('');
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
  const selected=new Set(volunteerMajorKeys[key]||[]);
  const quality=groupQuality(s,g);
  const change=groupChangeData(s,g);
  const planDiff=(g.plan26||0)-(g.plan25||0);
  return `<article class="volunteer-item" data-volunteer-item="${esc(key)}"><div class="volunteer-item-head"><div><b>${index+1}. ${esc(s.name)} ${esc(g.groupName)}</b><p>${esc(s.province)}｜${esc(s.subject)}｜${esc(s.batch)}｜再选 ${esc(g.requirement||'—')}｜25分 ${fmtNum(g.score25)}｜26计划 ${fmt(g.plan26)}｜较25 ${formatSigned(planDiff)}</p></div><div class="volunteer-actions"><button data-volunteer-move="${esc(key)}" data-delta="-1" ${index===0?'disabled':''}>上移</button><button data-volunteer-move="${esc(key)}" data-delta="1" ${index===volunteerKeys.length-1?'disabled':''}>下移</button><button data-volunteer-remove="${esc(key)}">删除</button></div></div><div class="volunteer-meta-row"><label>定位<select data-volunteer-meta="${esc(key)}" data-field="strategy"><option value="">待定</option>${['冲','稳','保','垫'].map(v=>`<option value="${v}" ${meta.strategy===v?'selected':''}>${v}</option>`).join('')}</select></label><label>服从调剂<select data-volunteer-meta="${esc(key)}" data-field="obey"><option value="是" ${meta.obey!=='否'?'selected':''}>是</option><option value="否" ${meta.obey==='否'?'selected':''}>否</option></select></label><input data-volunteer-meta="${esc(key)}" data-field="note" value="${esc(meta.note||'')}" placeholder="备注，例如校区/学费/调剂风险"></div><div class="tag-row"><span class="group-quality-badge ${quality.tone}">${esc(quality.label)}</span><span class="badge">${esc(groupDisplayName(s,g)||'未命名')}</span>${change?`<span class="badge ${change.advice==='重点核对'?'red':'green'}">${esc(change.status||'变迁')}</span>`:''}</div><details class="major-picker" open><summary>已选专业 ${selected.size} / ${majors.length}</summary><div class="major-picker-actions"><button data-major-preset="${esc(key)}" data-preset="top6">默认前6</button><button data-major-preset="${esc(key)}" data-preset="all">全选</button><button data-major-preset="${esc(key)}" data-preset="none">清空</button></div><div class="major-picker-grid">${majors.map(m=>`<label class="major-check ${m.risk?'risk':''}"><input type="checkbox" data-major-check="${esc(key)}" value="${esc(m.key)}" ${selected.has(m.key)?'checked':''}>${esc(m.name)}${m.risk?' <span>风险</span>':''}<small>${esc(m.majorClass||'其他')}｜${fmt(m.plan26)}人｜${fmtNum(m.score25)}分</small></label>`).join('')}</div></details></article>`;
}
function bindVolunteerPanelControls(){
  $$('[data-volunteer-remove]').forEach(btn=>btn.addEventListener('click',()=>removeVolunteerKey(btn.dataset.volunteerRemove)));
  $$('[data-volunteer-move]').forEach(btn=>btn.addEventListener('click',()=>moveVolunteerKey(btn.dataset.volunteerMove,Number(btn.dataset.delta)||0)));
  $$('[data-volunteer-meta]').forEach(el=>el.addEventListener('input',()=>{const key=el.dataset.volunteerMeta; volunteerMeta[key]={...(volunteerMeta[key]||{}),[el.dataset.field]:el.value}; saveVolunteerMeta();}));
  $$('[data-major-check]').forEach(cb=>cb.addEventListener('change',()=>{const key=cb.dataset.majorCheck; const checked=$$(`[data-major-check="${CSS.escape(key)}"]:checked`).map(x=>x.value); volunteerMajorKeys[key]=checked; saveVolunteerMajorKeys(); renderVolunteerPanel();}));
  $$('[data-major-preset]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault(); const key=btn.dataset.majorPreset; const rec=getGroupRecord(key); if(!rec)return; if(btn.dataset.preset==='top6')volunteerMajorKeys[key]=defaultMajorKeys(rec.g); if(btn.dataset.preset==='all')volunteerMajorKeys[key]=(rec.g.majors||[]).map(m=>m.key); if(btn.dataset.preset==='none')volunteerMajorKeys[key]=[]; saveVolunteerMajorKeys(); renderVolunteerPanel();}));
}
function xlsCell(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function exportVolunteerXlsx(){
  const headers=['序号','定位','院校','地区','科类','批次','院校层次','院校专业组','专业组名称','再选科目','专业1','专业2','专业3','专业4','专业5','专业6','专业清单','服从调剂','2026计划','较25计划','2025最低分','2025位次','三年均分','三年均位次','组色判断','客观标签','2025对应组','变迁状态','核对建议','备注'];
  const rows=[];
  for(let i=0;i<VOLUNTEER_LIMIT;i++){
    const key=volunteerKeys[i];
    const rec=key?getGroupRecord(key):null;
    if(!rec){rows.push([i+1,'','','','','','','','','','','','','','','','','','','','','','','','','','','','','']);continue;}
    const {s,g}=rec;
    const meta=volunteerMeta[key]||{};
    const majors=selectedMajorsForKey(key);
    const majorNames=majors.map(m=>m.name);
    const scoreMajors=majors.filter(m=>m.avgScore3);
    const rankMajors=majors.filter(m=>m.avgRank3);
    const avgScore=scoreMajors.length?scoreMajors.reduce((a,m)=>a+(Number(m.avgScore3)||0),0)/scoreMajors.length:null;
    const avgRank=rankMajors.length?rankMajors.reduce((a,m)=>a+(Number(m.avgRank3)||0),0)/rankMajors.length:null;
    const quality=groupQuality(s,g);
    const change=groupChangeData(s,g)||{};
    const planDiff=(g.plan26||0)-(g.plan25||0);
    rows.push([i+1,meta.strategy||'',s.name,s.province,s.subject,s.batch,s.level,g.groupName,groupDisplayName(s,g),g.requirement||'',majorNames[0]||'',majorNames[1]||'',majorNames[2]||'',majorNames[3]||'',majorNames[4]||'',majorNames[5]||'',majorNames.join('；'),meta.obey||'是',g.plan26,planDiff,g.score25,g.rank25,avgScore?Number(avgScore.toFixed(1)):'',avgRank?Number(avgRank.toFixed(1)):'',quality.label,(g.tags||[]).join('；'),change.group25||'',change.status||'',change.advice||'',meta.note||'']);
  }
  const table=[headers,...rows].map((row,i)=>`<tr>${row.map(v=>`<${i?'td':'th'}>${xlsCell(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:11pt}th{background:#0a7c42;color:white;font-weight:700}td,th{border:1px solid #d9e2dd;padding:6px 8px;vertical-align:top;white-space:pre-wrap}.num{text-align:right}</style></head><body><table>${table}</table></body></html>`;
  const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a');
  const date=new Date().toISOString().slice(0,10).replace(/-/g,'');
  a.href=URL.createObjectURL(blob);
  a.download=`江苏志愿填报基础表_40专业组_${date}.xls`;
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
