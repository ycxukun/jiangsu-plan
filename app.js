(function(){
'use strict';
const VERSION='2026在招专业组版｜V1.1.7 giscus批注版';
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
let state={batch:'',subject:'',selectedProvinces:new Set(),selectedLevels:new Set(),selectedRequirements:new Set(),role:'',mode:'schools',q:'',selectedClasses:new Set(),scoreRange:null,compact:false,activeSchoolId:null,filtered:[]};
let notes={schools:{},groups:{},majors:{}};
let auth={accessToken:'',user:null};
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const fmt=v=>v===null||v===undefined||v===''?'—':String(v);
const fmtNum=v=>v===null||v===undefined||v===''?'—':(typeof v==='number'?Number(v.toFixed? v.toFixed(1):v):v);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const keySchool=s=>`${s.subject}|${s.batch}|${s.name}`;
const keyGroup=(s,g)=>`${s.subject}|${s.batch}|${s.name}|${g.groupName}`;
const keyMajor=m=>m.key;
function normalize(s){return String(s??'').toLowerCase().replace(/\s+/g,'');}
function formatSigned(v){if(v===null||v===undefined||v==='')return '—'; return `${v>0?'+':''}${v}`;}
function signedClass(v){return v>0?'change-pos':v<0?'change-neg':'';}
function planChangeInline(v){if(v===null||v===undefined||v==='')return '—'; return `<span class="${signedClass(v)}">${formatSigned(v)}</span>`;}
function planDeltaBadge(v){if(v===null||v===undefined||v==='')return ''; const cls=signedClass(v); const label=v>0?'计划增加':v<0?'计划减少':'计划持平'; return `<span class="badge ${v>0?'green':v<0?'red':''} ${cls}">${label} ${formatSigned(v)}</span>`;}
function createLayout(){
  document.body.className+=(document.body.dataset.admin==='1'?' admin-page':'');
  document.body.innerHTML=`
  <div class="app-shell">
    <header class="topbar">
      <div class="hero"><div class="brand"><h1>江苏省招生计划变化知识库</h1><p>基于 2026 在招数据、2025 专业最低分与招生计划生成；院校排序按 2025 专业最低分 × 2025 招生计划的加权平均分执行。</p></div><div class="top-actions"><div class="version">${VERSION}</div><button id="compactBtn" class="header-toggle" type="button">紧凑显示</button><button id="toggleHeaderBtn" class="header-toggle" type="button">收起头部</button></div></div>
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
function groupMatchesSearch(s,g,q){if(!q)return true; const nq=normalize(q); if(normalize(s.name+s.province+s.city+s.subject+s.batch).includes(nq))return true; if(normalize(g.groupName+g.requirement+(g.tags||[]).join('')+(g.majorClasses||[]).join('')+g.majorSummary).includes(nq))return true; return g.majors.some(m=>normalize(m.name+m.majorClass+m.discipline+m.code).includes(nq));}
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
  return `<article class="group-card" data-scroll="${g.id}" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}"><h3>${esc(g.groupName)}${noteBadge('groups',keyGroup(s,g))}</h3><div class="grid"><div class="mini"><b>${fmtNum(g.score25)}</b><span>25分</span></div><div class="mini"><b>${fmtNum(g.rank25)}</b><span>25位次</span></div><div class="mini"><b>${g.majors.length}</b><span>专业数</span></div></div><div class="tag-row">${planDeltaBadge(planDiff)}${topTags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="anno-actions"><button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(g.groupName)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(g.groupName)}｜专业组批注">新增批注</button></div></article>`;
}
function groupSectionHTML(s,g){
  const planDiff=(g.plan26||0)-(g.plan25||0);
  return `<section id="${g.id}" class="group-section" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}"><div class="group-head"><div><h3>${esc(g.groupName)}${noteBadge('groups',keyGroup(s,g))}</h3><p>${esc(s.name)}｜再选：${esc(g.requirement||'—')}｜25分 ${fmtNum(g.score25)}｜25位次 ${fmtNum(g.rank25)}｜26计划 ${fmt(g.plan26)}｜较25年 ${formatSigned(planDiff)} ${planDiff===0?'':`<span class="${signedClass(planDiff)}">(${formatSigned(planDiff)})</span>`}</p><div class="tag-row">${(g.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')} ${(g.majorClasses||[]).slice(0,8).map(c=>`<span class="badge">${esc(c)}</span>`).join('')} ${planDeltaBadge(planDiff)}</div><div class="anno-actions"><button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(g.groupName)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(g.groupName)}｜专业组批注">新增批注</button></div></div></div><div class="table-wrap"><table><thead><tr><th>代码</th><th>专业名称</th><th>专业类</th><th>26计划/变化</th><th>25分/位次</th><th>三年均分/位次</th></tr></thead><tbody>${[...g.majors].sort(majorSortByThreeYear).map(m=>majorRowHTML(s,g,m)).join('')}</tbody></table></div></section>`;
}
function majorRowHTML(s,g,m){
  const avgYears=m.avgYears&&m.avgYears<3?`<br><span class="muted">${m.avgYears}年均值</span>`:'';
  return `<tr class="${m.risk?'risk-row':''} clickable-row" data-note-scope="majors" data-note-key="${esc(keyMajor(m))}" data-detail-row="${esc(m.key)}" data-school-key="${esc(keySchool(s))}" data-group-key="${esc(keyGroup(s,g))}"><td>${esc(m.code)}</td><td class="major-name">${esc(m.name)}${m.risk?'<span class="risk-label">风险</span>':''}${noteBadge('majors',keyMajor(m))}<button class="anno-mini" data-annotation-scope="majors" data-annotation-key="${esc(keyMajor(m))}" data-annotation-title="${esc(s.name)} ${esc(g.groupName)} ${esc(m.name)}｜专业批注">批注</button></td><td>${esc(m.majorClass||'其他')}<br><span class="muted">${esc(m.discipline||'其他')}</span></td><td>${fmt(m.plan26)} / ${planChangeInline(m.planChange)}</td><td>${fmtNum(m.score25)} / ${fmtNum(m.rank25)}</td><td>${fmtNum(m.avgScore3)} / ${fmtNum(m.avgRank3)}${avgYears}</td></tr>`;
}
function bindDynamic(){
  $$('[data-scroll]').forEach(el=>el.addEventListener('click',()=>document.getElementById(el.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));
  $$('[data-detail-row]').forEach(tr=>tr.addEventListener('click',e=>{if(e.target.closest('button,a,input,label,textarea'))return; showDetail(tr.dataset.detailRow,tr.dataset.schoolKey,tr.dataset.groupKey);}));
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
  applyFilters();
  fetchNotes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
