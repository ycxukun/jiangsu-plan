(function(){
'use strict';
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const CURRENT_STUDENT_STORAGE_KEY='js-plan-current-student-v1';
const VOLUNTEER_STORAGE_KEY='js-plan-volunteer-groups-v1';
const VOLUNTEER_MAJOR_STORAGE_KEY='js-plan-volunteer-major-keys-v2';
const VOLUNTEER_META_STORAGE_KEY='js-plan-volunteer-meta-v1';
const VOLUNTEER_EDIT_FORM_STORAGE_KEY='js-plan-volunteer-edit-form-v1';
const MEDICAL_RESTRICTION_STORAGE_KEY='js-plan-medical-restriction-codes-v1';
const STUDENT_ARCHIVE_BUCKET='student-archives';
const MAX_ARCHIVE_FILE_BYTES=100*1024*1024;
const SECTIONS=[
  {id:'comprehensive_eval',label:'综合评价'},
  {id:'strong_base',label:'强基计划'},
  {id:'awards',label:'奖项证书'},
  {id:'specialties',label:'特长'},
  {id:'other',label:'其他'}
];
const $=sel=>document.querySelector(sel);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const params=new URLSearchParams(location.search);
const studentId=params.get('student')||params.get('id')||'';
let auth={accessToken:'',refreshToken:'',user:null};
let student=null;
let forms=[];
let archiveFiles=[];
let profiles=[];

function storageJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function loadAuth(){const data=storageJSON(AUTH_STORAGE_KEY,{});if(data?.accessToken&&data?.user)auth={accessToken:data.accessToken,refreshToken:data.refreshToken||'',user:data.user};}
function saveAuth(){try{localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify({accessToken:auth.accessToken||'',refreshToken:auth.refreshToken||'',user:auth.user||null}));}catch(e){}}
function decodeJwtPayload(token){try{const part=String(token||'').split('.')[1];if(!part)return null;const json=atob(part.replace(/-/g,'+').replace(/_/g,'/'));return JSON.parse(decodeURIComponent(Array.from(json).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join('')));}catch(e){return null;}}
function tokenExpiresSoon(token){const p=decodeJwtPayload(token);return !p?.exp||p.exp*1000-Date.now()<120000;}
function isJwtExpiredErrorText(text){return /JWT expired|exp.*claim|timestamp check failed|invalid jwt|unauthorized/i.test(String(text||''));}
async function refreshSessionIfNeeded(force=false){
  if(!auth.accessToken)throw new Error('请先登录。');
  if(!force&&!tokenExpiresSoon(auth.accessToken))return;
  if(!auth.refreshToken)throw new Error('登录状态已过期，请返回首页重新登录。');
  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refreshToken})});
  if(!res.ok)throw new Error('登录状态已过期，请返回首页重新登录。');
  const data=await res.json();
  auth={accessToken:data.access_token||'',refreshToken:data.refresh_token||auth.refreshToken,user:data.user||auth.user};
  saveAuth();
}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json',...extra};}
async function apiFetch(path,options={},retried=false){
  await refreshSessionIfNeeded();
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:authHeaders(options.headers||{})});
  if(!res.ok){
    const text=await res.text();
    if(!retried&&(res.status===401||res.status===403||isJwtExpiredErrorText(text))){
      await refreshSessionIfNeeded(true);
      return apiFetch(path,options,true);
    }
    throw new Error(text);
  }
  if(res.status===204)return null;
  const text=await res.text();
  return text?JSON.parse(text):null;
}
function subjectLabel(v){return v==='history'?'历史':'物理';}
function stageLabel(v){return v==='specialty'||v==='专科'?'专科':'本科';}
function stageValue(v){return v==='specialty'||v==='专科'?'specialty':'undergraduate';}
function studentNoText(s){return s?.student_no?`HSY${s.student_no}`:'待生成学号';}
function shortDate(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function shortDateTime(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';return `${shortDate(v)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function normalizeSubjectChoices(values){const alias={'化':'化学','化学':'化学','生':'生物','生物':'生物','政':'政治','政治':'政治','思想政治':'政治','地':'地理','地理':'地理'};const raw=Array.isArray(values)?values:String(values||'').split(/[，,、\s/+]+/);const out=[];raw.forEach(v=>{const t=alias[String(v||'').trim()];if(t&&!out.includes(t))out.push(t);});return out;}
function firstStudentValue(s,...keys){for(const key of keys){const value=s?.[key];if(value!==null&&value!==undefined&&value!=='')return value;}return null;}
function studentScore(s){return firstStudentValue(s,'score','gaokao_score','estimated_score');}
function studentRank(s){return firstStudentValue(s,'rank','gaokao_rank','estimated_rank');}
function studentMedicalCodes(s){const raw=[s?.medical_codes,s?.physical_limit_codes,s?.medicalCodes,s?.medical_remark].map(v=>Array.isArray(v)?v.join(' '):(v||'')).join(' ');return raw.split(/[^0-9]+/).map(x=>x.trim()).filter(Boolean);}
function subjectSummary(s){const choices=normalizeSubjectChoices(s?.subject_choices||s?.second_subjects||s?.subjectChoices);return `${subjectLabel(s?.subject_type)}${choices.length?'+'+choices.join('+'):'+未填再选'}`;}
function formatSize(bytes){const n=Number(bytes)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(1)} MB`;}
function safeFileExt(name){const ext=String(name||'').split('.').pop().toLowerCase();return /^[a-z0-9]{1,12}$/.test(ext)?ext:'bin';}
function safePathSegment(value){return String(value||'file').trim().replace(/[^\w.-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'file';}
function sectionLabel(id){return SECTIONS.find(x=>x.id===id)?.label||'其他';}
function validArchiveFile(file){if(!file)return false;return new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx','csv','txt','md','jpg','jpeg','png','webp','gif','zip','rar','7z']).has(safeFileExt(file.name));}
function archiveStoragePath(section,file){const stamp=new Date().toISOString().replace(/[:.]/g,'-');const ext=safeFileExt(file.name);const base=safePathSegment(file.name.replace(/\.[^.]+$/,''));return `students/${safePathSegment(student.id)}/${safePathSegment(section)}/${stamp}-${base}.${ext}`;}
function plannerName(id){const p=profiles.find(x=>x.id===id);return p?.display_name||p?.email||'未关联规划师';}
function intakePayload(){const raw=student?.intake_payload;return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};}
function kvRows(rows){return `<div class="kv-grid">${rows.map(([k,v])=>`<div><b>${esc(k)}</b><span>${esc(Array.isArray(v)?v.join('、'):(v??'—'))}</span></div>`).join('')}</div>`;}
function archiveCounts(){const out={};SECTIONS.forEach(x=>out[x.id]=0);archiveFiles.forEach(f=>{out[f.section]=(out[f.section]||0)+1;});return out;}
function filesForSection(id){return archiveFiles.filter(f=>f.section===id);}
async function uploadStorage(file,path){
  await refreshSessionIfNeeded();
  const encoded=encodeURIComponent(path).replace(/%2F/g,'/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${STUDENT_ARCHIVE_BUCKET}/${encoded}`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
  if(!res.ok)throw new Error(await res.text());
}
async function signedFileUrl(path){
  await refreshSessionIfNeeded();
  const encoded=encodeURIComponent(path).replace(/%2F/g,'/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${STUDENT_ARCHIVE_BUCKET}/${encoded}`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
  if(!res.ok)throw new Error(await res.text());
  const data=await res.json();
  const signed=data.signedURL||data.signedUrl||data.url;
  if(!signed)throw new Error('没有生成文件查看链接。');
  return /^https?:\/\//.test(signed)?signed:`${SUPABASE_URL}/storage/v1${signed}`;
}
async function deleteStorage(path){
  if(!path)return;
  await refreshSessionIfNeeded();
  const encoded=encodeURIComponent(path).replace(/%2F/g,'/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${STUDENT_ARCHIVE_BUCKET}/${encoded}`,{method:'DELETE',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`}});
  if(!res.ok)throw new Error(await res.text());
}
function currentStudentStorageKey(){return auth.user?.id?`${CURRENT_STUDENT_STORAGE_KEY}:${auth.user.id}`:CURRENT_STUDENT_STORAGE_KEY;}
function volunteerStorageSuffix(s){const base=`${auth.user?.id||'guest'}:${s?.id||'no-student'}`;return stageValue(s?.stage)==='specialty'?`specialty:${base}`:base;}
function scopedVolunteerKey(base,s){return `${base}:${volunteerStorageSuffix(s)}`;}
function saveCurrentStudent(s){try{localStorage.setItem(currentStudentStorageKey(),JSON.stringify(s));}catch(e){}}
function backUrlForStudent(s){return stageValue(s?.stage)==='specialty'?'../specialty/index.html':'../index.html';}
async function openVolunteerForm(formId){
  const formRows=await apiFetch(`volunteer_forms?select=*&id=eq.${encodeURIComponent(formId)}&limit=1`);
  const form=formRows?.[0];
  if(!form)throw new Error('没有找到这份志愿表。');
  const groups=await apiFetch(`volunteer_form_groups?select=*&form_id=eq.${encodeURIComponent(formId)}&order=position.asc`);
  const majors=await apiFetch(`volunteer_form_majors?select=*&form_id=eq.${encodeURIComponent(formId)}&order=form_group_id.asc,position.asc`);
  const volunteerKeys=(groups||[]).map(g=>g.group_key);
  const volunteerMajorKeys={};
  (groups||[]).forEach(g=>{volunteerMajorKeys[g.group_key]=(majors||[]).filter(m=>m.form_group_id===g.id).sort((a,b)=>(a.position||0)-(b.position||0)).map(m=>m.major_key).filter(Boolean);});
  const volunteerMeta={};
  (groups||[]).forEach(g=>{volunteerMeta[g.group_key]={strategy:g.strategy||'待定',obey:g.obey_adjustment?'是':'否',note:g.note||''};});
  saveCurrentStudent({...student,stage:form.stage||student.stage});
  try{
    localStorage.setItem(scopedVolunteerKey(VOLUNTEER_STORAGE_KEY,student),JSON.stringify(volunteerKeys));
    localStorage.setItem(scopedVolunteerKey(VOLUNTEER_MAJOR_STORAGE_KEY,student),JSON.stringify(volunteerMajorKeys));
    localStorage.setItem(scopedVolunteerKey(VOLUNTEER_META_STORAGE_KEY,student),JSON.stringify(volunteerMeta));
    localStorage.setItem(scopedVolunteerKey(VOLUNTEER_EDIT_FORM_STORAGE_KEY,student),JSON.stringify({id:form.id,title:form.title||'',stage:form.stage||student.stage}));
    localStorage.setItem(MEDICAL_RESTRICTION_STORAGE_KEY,JSON.stringify((form.snapshot||{}).medicalCodes||studentMedicalCodes(student)));
  }catch(e){}
  location.href=backUrlForStudent({...student,stage:form.stage||student.stage});
}
function renderForms(){
  if(!forms.length)return '<div class="empty">还没有保存过志愿表。</div>';
  return `<div class="form-list">${forms.map(f=>`<div class="form-row"><div><b>${esc(f.title||'未命名志愿表')}</b><p>${esc(stageLabel(f.stage))}｜${esc(f.status||'draft')}｜更新 ${esc(shortDateTime(f.updated_at||f.created_at))}</p></div><div class="actions"><button type="button" data-open-form="${esc(f.id)}">载入编辑</button></div></div>`).join('')}</div>`;
}
function renderIntake(){
  const data=intakePayload();
  const keys=Object.keys(data);
  if(!keys.length)return '<div class="empty">还没有导入信息采集表。</div>';
  const preferred=['学生姓名','家长电话','高考省份','高考年份','选科','总分','位次','意向地区排序','意向专业类','体检快捷代码','体检限制补充','需求摘要','备注'];
  const shown=[...preferred.filter(k=>k in data),...keys.filter(k=>!preferred.includes(k)).slice(0,18)];
  return kvRows(shown.map(k=>[k,data[k]]));
}
function fileRow(file){
  return `<div class="file-row"><div><b>${esc(file.title||file.file_name||'未命名文件')}</b><p>${esc(file.file_name||'')}｜${esc(formatSize(file.file_size))}｜上传 ${esc(shortDateTime(file.created_at))}${file.summary?`｜${esc(file.summary)}`:''}</p></div><div class="file-actions"><button type="button" data-view-file="${esc(file.id)}">查看</button><button class="danger" type="button" data-delete-file="${esc(file.id)}">删除</button></div></div>`;
}
function renderSections(){
  return `<div class="sections">${SECTIONS.map(sec=>{const files=filesForSection(sec.id);return `<section class="section-panel"><div class="section-head"><h3>${esc(sec.label)}</h3><span class="badge">${files.length} 份</span></div>${files.length?files.map(fileRow).join(''):`<div class="empty">暂无${esc(sec.label)}资料。</div>`}</section>`;}).join('')}</div>`;
}
function render(){
  const counts=archiveCounts();
  $('#app').innerHTML=`
    <section class="profile-hero">
      <div class="profile-title">
        <h2>${esc(student.name)} <span class="student-no">${esc(studentNoText(student))}</span></h2>
        <p>${esc(stageLabel(student.stage))}｜${esc(subjectSummary(student))}｜${esc(studentScore(student)??'—')} 分｜位次 ${esc(studentRank(student)??'—')}</p>
        <p>目标城市：${esc((student.target_cities||[]).join('、')||'—')}｜目标专业：${esc((student.target_majors||[]).join('、')||'—')}</p>
        <div class="actions" style="margin-top:12px"><a class="pill-btn save" href="${esc(backUrlForStudent(student))}">进入志愿填报</a><a class="pill-btn" href="./index.html">返回学生列表</a><button id="refreshBtn" type="button">刷新档案</button></div>
      </div>
      <div class="meta-grid">
        <div class="meta-card"><b>服务规划师</b><span>${esc(plannerName(student.planner_id||student.owner_id))}</span></div>
        <div class="meta-card"><b>开始服务</b><span>${esc(shortDate(student.service_started_at||student.created_at)||'—')}</span></div>
        <div class="meta-card"><b>手机号</b><span>${esc(student.phone||'—')}</span></div>
        <div class="meta-card"><b>体检代码</b><span>${esc(studentMedicalCodes(student).join('、')||'无')}</span></div>
      </div>
    </section>
    <section class="section-stats">${SECTIONS.map(sec=>`<div class="stat-card"><b>${esc(sec.label)}</b><span>${counts[sec.id]||0}</span></div>`).join('')}</section>
    <section class="panel"><div class="panel-head"><h2>上传资料</h2><span class="badge">最大 100MB</span></div><div class="panel-body"><div class="upload-box"><label>板块<select id="sectionInput">${SECTIONS.map(sec=>`<option value="${esc(sec.id)}">${esc(sec.label)}</option>`).join('')}</select></label><label>标题<input id="titleInput" placeholder="默认使用文件名"></label><label>文件<input id="fileInput" type="file"></label><button id="uploadBtn" class="save" type="button">上传</button></div></div></section>
    <section class="two-col">
      <div class="panel"><div class="panel-head"><h2>基本信息</h2></div><div class="panel-body">${kvRows([['学号',studentNoText(student)],['学生',student.name],['阶段',stageLabel(student.stage)],['选科',subjectSummary(student)],['分数',studentScore(student)],['位次',studentRank(student)],['城市',(student.target_cities||[]).join('、')],['专业',(student.target_majors||[]).join('、')],['备注',student.note]])}</div></div>
      <div class="panel"><div class="panel-head"><h2>已保存志愿表</h2><span class="badge">${forms.length} 份</span></div><div class="panel-body">${renderForms()}</div></div>
    </section>
    <section class="panel"><div class="panel-head"><h2>信息采集表</h2></div><div class="panel-body">${renderIntake()}</div></section>
    <section class="panel"><div class="panel-head"><h2>分板块资料</h2></div><div class="panel-body">${renderSections()}</div></section>`;
  bindActions();
}
async function loadData(){
  if(!studentId)throw new Error('缺少 student 参数。');
  const results=await Promise.all([
    apiFetch(`students?select=*&id=eq.${encodeURIComponent(studentId)}&limit=1`),
    apiFetch(`volunteer_forms?select=id,student_id,title,status,stage,created_at,updated_at,snapshot&student_id=eq.${encodeURIComponent(studentId)}&order=updated_at.desc`),
    apiFetch(`student_archive_files?select=*&student_id=eq.${encodeURIComponent(studentId)}&order=created_at.desc`),
    apiFetch('profiles?select=id,email,display_name,role,status').catch(()=>[])
  ]);
  student=results[0]?.[0]||null;
  if(!student)throw new Error('没有找到该学生，或当前账号没有查看权限。');
  forms=results[1]||[];
  archiveFiles=results[2]||[];
  profiles=results[3]||[];
  render();
}
async function uploadFile(){
  const file=$('#fileInput')?.files?.[0];
  if(!file){alert('请选择文件。');return;}
  if(file.size>MAX_ARCHIVE_FILE_BYTES){alert('文件超过 100MB。');return;}
  if(!validArchiveFile(file)){alert('暂不支持该文件类型。');return;}
  const section=$('#sectionInput').value;
  const title=$('#titleInput').value.trim()||file.name;
  const btn=$('#uploadBtn');
  try{
    btn.disabled=true;btn.textContent='上传中...';
    const filePath=archiveStoragePath(section,file);
    await uploadStorage(file,filePath);
    await apiFetch('student_archive_files',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({student_id:student.id,section,title,summary:'',file_path:filePath,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size:file.size,uploaded_by:auth.user.id})});
    await loadData();
  }catch(err){alert(`上传失败：${err.message}`);}finally{if(btn){btn.disabled=false;btn.textContent='上传';}}
}
async function viewFile(fileId){
  const file=archiveFiles.find(x=>x.id===fileId);
  if(!file)return;
  try{
    const url=file.file_path?await signedFileUrl(file.file_path):file.file_url;
    if(!url)throw new Error('文件缺少路径。');
    window.open(url,'_blank','noopener');
  }catch(err){alert(`打开失败：${err.message}`);}
}
async function deleteFile(fileId){
  const file=archiveFiles.find(x=>x.id===fileId);
  if(!file)return;
  if(!confirm(`确定删除“${file.title||file.file_name}”？`))return;
  try{
    await deleteStorage(file.file_path);
    await apiFetch(`student_archive_files?id=eq.${encodeURIComponent(fileId)}`,{method:'DELETE'});
    await loadData();
  }catch(err){alert(`删除失败：${err.message}`);}
}
function bindActions(){
  $('#refreshBtn')?.addEventListener('click',()=>loadData().catch(showError));
  $('#uploadBtn')?.addEventListener('click',uploadFile);
  document.querySelectorAll('[data-view-file]').forEach(btn=>btn.addEventListener('click',()=>viewFile(btn.dataset.viewFile)));
  document.querySelectorAll('[data-delete-file]').forEach(btn=>btn.addEventListener('click',()=>deleteFile(btn.dataset.deleteFile)));
  document.querySelectorAll('[data-open-form]').forEach(btn=>btn.addEventListener('click',()=>openVolunteerForm(btn.dataset.openForm).catch(err=>alert(`载入失败：${err.message}`))));
}
function showError(err){
  $('#app').innerHTML=`<div class="notice"><b>档案库读取失败</b><br>${esc(err.message||err)}<br>如果提示表或 bucket 不存在，请先执行 supabase/student_archive_schema.sql。</div>`;
}
async function init(){
  loadAuth();
  if(!auth.user){showError(new Error('请先从本科或专科首页登录。'));return;}
  try{await loadData();}catch(err){showError(err);}
}
init();
})();
