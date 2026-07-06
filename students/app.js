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
const STUDENT_SUBJECT_CHOICES_STORAGE_KEY='js-plan-student-subject-choices-v1';
const STUDENT_CACHE_STORAGE_KEY='js-plan-student-cache-v1';
const SUBJECT_CHOICE_OPTIONS=['化学','生物','政治','地理'];
const STUDENT_ARCHIVE_BUCKET='student-archives';
const STUDENT_ARCHIVE_SECTIONS=[
  {id:'comprehensive_eval',label:'综合评价'},
  {id:'strong_base',label:'强基计划'},
  {id:'awards',label:'奖项证书'},
  {id:'specialties',label:'特长'},
  {id:'other',label:'其他'}
];
const INTAKE_FORM_PATHS={
  undergraduate:'./intake-form-v6.6.7.html',
  specialty:'./intake-form-specialty-2026.html'
};
const MAX_ARCHIVE_FILE_BYTES=100*1024*1024;

const MEDICAL_CODE_META={
  '11':'严重心脏病等疾病：学校可不予录取','12':'重症支气管扩张、哮喘等：学校可不予录取','13':'严重血液、内分泌及代谢系统疾病：学校可不予录取','14':'重症或难治性癫痫等神经精神疾病：学校可不予录取','15':'慢性肝炎病人且肝功能不正常：学校可不予录取','16':'结核病相关情况：部分情形学校可不予录取',
  '21':'轻度色觉异常（色弱）：化学、化工、药学、生物、医学、公安技术、食品、农林等限报','22':'色觉异常Ⅱ度（色盲）：同21，并扩展到美术、设计、物理、天文、地理、材料、交通等','23':'不能准确识别单色：同21/22，并扩展到经济、管理、计算机等依赖颜色识别专业','24':'裸眼视力任一眼低于5.0：飞行技术、航海技术、消防工程、刑事科学技术等不宜就读','25':'裸眼视力任一眼低于4.8：轮机工程、运动训练、烹饪等不宜就读','26':'公安类院校相关视力、身高等要求：需按公安院校体检标准另行核对',
  '31':'主要脏器手术史或功能恢复情况：部分地矿、水利、交通、农林、医学等不宜就读','32':'先天性心脏病术后或轻微缺损：不宜就读同31类专业','33':'肢体残疾不继续恶化：不宜就读同31类专业','34':'矫正到4.8且镜片度数>400：海洋、测控、核工、生医工、服装、飞行器制造等不宜就读','35':'矫正到4.8且镜片度数>800：地矿、水利、土建、材料、能动、化工、医学、电子信息科学、测绘、交通、船舶、生物工程等不宜就读','36':'一眼失明且另一眼矫正到4.8镜片度数>400：工学、农学、医学、法学及部分理学专业不宜就读','37':'双耳听力均3米以内或一耳5米另一耳全聋：法学、外语、新闻、学前、音乐、土木、交通、动物、医学等不宜就读','38':'嗅觉迟钝、口吃、步态异常、驼背、面部疤痕等：教育、公安、外交、法学、新闻、音乐表演、表演等不宜就读','39':'斜视、嗅觉迟钝、口吃：医学类专业不宜就读'
};
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let auth={accessToken:'',refreshToken:'',user:null};
let students=[];
let forms=[];
let profiles=[];
let currentStudent=null;
let query='';
let stageFilter='';
let subjectFilter='';
let readonlyNotice='';
let archiveStudentId='';
let archiveFiles=[];
let initialArchiveOpened=false;
function params(){return new URLSearchParams(location.search);}
function defaultStage(){return params().get('from')==='specialty'?'specialty':'undergraduate';}
function stageLabel(v){return v==='specialty'||v==='专科'?'专科':'本科';}
function subjectLabel(v){return v==='history'?'历史':'物理';}
function stageValue(v){return v==='specialty'||v==='专科'?'specialty':'undergraduate';}
function intakeFormPathForStage(v){return INTAKE_FORM_PATHS[stageValue(v)]||INTAKE_FORM_PATHS.undergraduate;}
function subjectTypeValue(v){return v==='history'||v==='历史'?'history':'physics';}
function storageJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function loadSavedAuth(){const data=storageJSON(AUTH_STORAGE_KEY,{}); if(data?.accessToken&&data?.user)auth={accessToken:data.accessToken,refreshToken:data.refreshToken||'',user:data.user};}
function saveAuth(){try{localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify({accessToken:auth.accessToken||'',refreshToken:auth.refreshToken||'',user:auth.user||null}));}catch(e){}}
function clearAuth(keepUser=false){const user=keepUser?auth.user:null;try{localStorage.removeItem(AUTH_STORAGE_KEY);}catch(e){} auth={accessToken:'',refreshToken:'',user};}
function authCacheId(user=auth.user){return user?.id||user?.email||'guest';}
function studentCacheKey(user=auth.user){return `${STUDENT_CACHE_STORAGE_KEY}:${authCacheId(user)}`;}
function saveStudentCache(){
  if(!auth.user)return;
  try{localStorage.setItem(studentCacheKey(),JSON.stringify({students,forms,saved_at:new Date().toISOString(),user:auth.user}));}catch(e){}
}
function loadStudentCache(user=auth.user){
  const data=storageJSON(studentCacheKey(user),null);
  return data&&Array.isArray(data.students)&&Array.isArray(data.forms)?data:null;
}
function decodeJwtPayload(token){try{const part=String(token||'').split('.')[1]; if(!part)return null; const json=atob(part.replace(/-/g,'+').replace(/_/g,'/')); return JSON.parse(decodeURIComponent(Array.from(json).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join('')));}catch(e){return null;}}
function tokenExpiresSoon(token){const payload=decodeJwtPayload(token); if(!payload?.exp)return true; return payload.exp*1000-Date.now()<120000;}
function isJwtExpiredErrorText(text){return /JWT expired|exp.*claim|timestamp check failed|invalid jwt|unauthorized/i.test(String(text||''));}
async function refreshSessionIfNeeded(force=false){
  if(!auth.accessToken)throw new Error('请先登录。');
  if(!force&&!tokenExpiresSoon(auth.accessToken))return;
  if(!auth.refreshToken)throw new Error('登录状态已过期，请返回首页退出后重新登录。');
  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',
    headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:auth.refreshToken})
  });
  if(!res.ok){clearAuth(true);throw new Error('登录状态已过期，请返回首页重新登录。');}
  const data=await res.json();
  auth={accessToken:data.access_token||'',refreshToken:data.refresh_token||auth.refreshToken,user:data.user||auth.user};
  saveAuth();
}
function currentStudentStorageKey(){return auth.user?.id?`${CURRENT_STUDENT_STORAGE_KEY}:${auth.user.id}`:CURRENT_STUDENT_STORAGE_KEY;}
function loadCurrentStudent(){currentStudent=storageJSON(currentStudentStorageKey(),null);}
function saveCurrentStudent(student){currentStudent=student||null; try{currentStudent?localStorage.setItem(currentStudentStorageKey(),JSON.stringify(currentStudent)):localStorage.removeItem(currentStudentStorageKey());}catch(e){}}
function volunteerStorageSuffix(student){
  const base=`${auth.user?.id||'guest'}:${student?.id||'no-student'}`;
  return stageValue(student?.stage)==='specialty'?`specialty:${base}`:base;
}
function scopedVolunteerKeyForStudent(base,student){return `${base}:${volunteerStorageSuffix(student)}`;}
function saveVolunteerDraftForStudent(student,draft){
  if(!student||!draft)return;
  try{
    localStorage.setItem(scopedVolunteerKeyForStudent(VOLUNTEER_STORAGE_KEY,student),JSON.stringify(draft.volunteerKeys||[]));
    localStorage.setItem(scopedVolunteerKeyForStudent(VOLUNTEER_MAJOR_STORAGE_KEY,student),JSON.stringify(draft.volunteerMajorKeys||{}));
    localStorage.setItem(scopedVolunteerKeyForStudent(VOLUNTEER_META_STORAGE_KEY,student),JSON.stringify(draft.volunteerMeta||{}));
  }catch(e){}
}
function saveVolunteerEditFormForStudent(student,form){
  if(!student||!form?.id)return;
  try{
    localStorage.setItem(scopedVolunteerKeyForStudent(VOLUNTEER_EDIT_FORM_STORAGE_KEY,student),JSON.stringify({id:form.id,title:form.title||'',stage:form.stage||student.stage}));
  }catch(e){}
}
function saveMedicalCodesForMain(student,form){
  const rawCodes=(form?.snapshot||{}).medicalCodes||student?.medical_codes||[];
  const codes=parseMedicalCodes(Array.isArray(rawCodes)?rawCodes.join(' '):rawCodes);
  try{localStorage.setItem(MEDICAL_RESTRICTION_STORAGE_KEY,JSON.stringify(codes));}catch(e){}
}
function normalizeSubjectChoices(values){
  const alias={'化':'化学','化学':'化学','生':'生物','生物':'生物','政':'政治','政治':'政治','思想政治':'政治','地':'地理','地理':'地理'};
  const raw=Array.isArray(values)?values:String(values||'').split(/[，,、\s/+]+/);
  const out=[];
  raw.forEach(v=>{const t=alias[String(v||'').trim()]; if(t&&!out.includes(t))out.push(t);});
  return out;
}
function studentSubjectChoiceStorageKey(){return `${STUDENT_SUBJECT_CHOICES_STORAGE_KEY}:${auth.user?.id||'guest'}`;}
function studentSubjectChoiceMap(){const data=storageJSON(studentSubjectChoiceStorageKey(),{}); return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}
function saveLocalStudentSubjectChoices(studentId,choices){if(!studentId)return; try{const data=studentSubjectChoiceMap(); data[studentId]=normalizeSubjectChoices(choices); localStorage.setItem(studentSubjectChoiceStorageKey(),JSON.stringify(data));}catch(e){}}
function localStudentSubjectChoices(studentId){return studentId?normalizeSubjectChoices(studentSubjectChoiceMap()[studentId]||[]):[];}
function studentSubjectChoices(student){return normalizeSubjectChoices(student?.subject_choices||localStudentSubjectChoices(student?.id));}
function studentSubjectSummary(student){const choices=studentSubjectChoices(student); return `${subjectLabel(student?.subject_type)}${choices.length?'+'+choices.join('+'):'+未填再选'}`;}
function subjectChoicesInputsHTML(scope,selected){
  const chosen=new Set(normalizeSubjectChoices(selected));
  return `<div class="subject-choice-row">${SUBJECT_CHOICE_OPTIONS.map(v=>`<label><input type="checkbox" data-subject-choice="${esc(scope)}" value="${esc(v)}" ${chosen.has(v)?'checked':''}>${esc(v)}</label>`).join('')}</div>`;
}
function subjectChoicesFromInputs(scope){return normalizeSubjectChoices($$(`[data-subject-choice="${scope}"]:checked`).map(el=>el.value));}

function studentMedicalCodes(student){return parseMedicalCodes(Array.isArray(student?.medical_codes)?student.medical_codes.join(' '):(student?.medical_codes||''));}
function medicalCodePickerHTML(scope,selected){
  const chosen=new Set(parseMedicalCodes(Array.isArray(selected)?selected.join(' '):selected));
  return `<div class="medical-picker-row" data-medical-picker="${esc(scope)}">${Object.keys(MEDICAL_CODE_META).map(c=>`<label title="${esc(MEDICAL_CODE_META[c]||'体检受限')}"><input type="checkbox" data-student-medical-code="${esc(scope)}" value="${esc(c)}" ${chosen.has(c)?'checked':''}>${esc(c)}</label>`).join('')}</div><div class="medical-picker-summary" data-student-medical-summary="${esc(scope)}"></div>`;
}
function studentMedicalCodesFromInputs(scope,inputSelector){
  const checked=$$(`[data-student-medical-code="${scope}"]:checked`).map(el=>el.value);
  const typed=inputSelector&&$(inputSelector)?parseMedicalCodes($(inputSelector).value):[];
  return [...new Set([...checked,...typed])].sort((a,b)=>Number(a)-Number(b));
}
function syncStudentMedicalPicker(scope,inputSelector){
  const summary=document.querySelector(`[data-student-medical-summary="${scope}"]`);
  if(!summary)return;
  const codes=studentMedicalCodesFromInputs(scope,inputSelector);
  summary.innerHTML=codes.length?`已选：${codes.map(c=>`<b title="${esc(MEDICAL_CODE_META[c]||'体检受限')}">${esc(c)}</b>`).join('')}`:'未选择体检代码。可直接点选，也可手动输入。';
}
function bindStudentMedicalPickers(){
  const scopes=[...new Set($$('[data-student-medical-code]').map(el=>el.dataset.studentMedicalCode).filter(Boolean))];
  scopes.forEach(scope=>{
    const inputSelector=scope==='newStudentMedical'?'#newStudentMedical':scope==='editStudentMedical'?'#editStudentMedical':'';
    $$(`[data-student-medical-code="${scope}"]`).forEach(cb=>cb.addEventListener('change',()=>syncStudentMedicalPicker(scope,inputSelector)));
    if(inputSelector&&$(inputSelector))$(inputSelector).addEventListener('input',()=>syncStudentMedicalPicker(scope,inputSelector));
    syncStudentMedicalPicker(scope,inputSelector);
  });
}
function hydrateNewStudentMedicalPicker(){
  const input=$('#newStudentMedical');
  if(!input||$('#newStudentMedicalPickerHost'))return;
  const host=document.createElement('div');
  host.id='newStudentMedicalPickerHost';
  host.className='wide student-choice-field medical-picker-host';
  host.innerHTML='<span>体检代码快捷选择</span>'+medicalCodePickerHTML('newStudentMedical',[]);
  input.closest('label')?.insertAdjacentElement('beforebegin',host);
  bindStudentMedicalPickers();
}
function splitListInput(v){return String(v||'').split(/[，,、\s/]+/).map(x=>x.trim()).filter(Boolean);}
function dbNumber(v){if(v===null||v===undefined||v==='')return null; const n=Number(String(v).replace(/,/g,'').trim()); return Number.isFinite(n)?n:null;}
function dbInteger(v){const n=dbNumber(v); return n===null?null:Math.round(n);}
function parseMedicalCodes(raw){const valid=new Set(Object.keys(MEDICAL_CODE_META));return String(raw||'').split(/[^0-9]+/).map(x=>x.trim()).filter(Boolean).filter(x=>valid.has(x));}
function shortDateTime(v){if(!v)return ''; const d=new Date(v); if(Number.isNaN(d.getTime()))return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function shortDate(v){if(!v)return ''; const d=new Date(v); if(Number.isNaN(d.getTime()))return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function formatSize(bytes){const n=Number(bytes)||0;if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(1)} MB`;}
function safeFileExt(name){const ext=String(name||'').split('.').pop().toLowerCase();return /^[a-z0-9]{1,12}$/.test(ext)?ext:'bin';}
function safePathSegment(value){return String(value||'file').trim().replace(/[^\w.-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'file';}
function archiveSectionLabel(id){return STUDENT_ARCHIVE_SECTIONS.find(x=>x.id===id)?.label||'其他';}
function isSafeArchiveFile(file){
  if(!file)return false;
  const ext=safeFileExt(file.name);
  return new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx','csv','txt','md','jpg','jpeg','png','webp','gif','zip','rar','7z']).has(ext);
}
function createArchiveStoragePath(student,section,file){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const ext=safeFileExt(file.name);
  const base=safePathSegment(file.name.replace(/\.[^.]+$/,''));
  return `students/${safePathSegment(student.id)}/${safePathSegment(section)}/${stamp}-${base}.${ext}`;
}
function plannerProfile(id){return profiles.find(p=>p.id===id)||null;}
function plannerName(id){
  const p=plannerProfile(id);
  return p?.display_name||p?.email||'未关联规划师';
}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json',...extra};}
async function apiFetch(path,options={},retried=false){
  if(!auth.accessToken)throw new Error('请先登录');
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
async function uploadArchiveStorageFile(file,path){
  await refreshSessionIfNeeded();
  const encoded=encodeURIComponent(path).replace(/%2F/g,'/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${STUDENT_ARCHIVE_BUCKET}/${encoded}`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
  if(!res.ok)throw new Error(await res.text());
  return path;
}
async function signedArchiveFileUrl(path){
  await refreshSessionIfNeeded();
  const encoded=encodeURIComponent(path).replace(/%2F/g,'/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${STUDENT_ARCHIVE_BUCKET}/${encoded}`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
  if(!res.ok)throw new Error(await res.text());
  const data=await res.json();
  const signed=data.signedURL||data.signedUrl||data.url;
  if(!signed)throw new Error('没有生成文件查看链接。');
  return /^https?:\/\//.test(signed)?signed:`${SUPABASE_URL}/storage/v1${signed}`;
}
async function deleteArchiveStorageObject(path){
  if(!path)return;
  await refreshSessionIfNeeded();
  const encoded=encodeURIComponent(path).replace(/%2F/g,'/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${STUDENT_ARCHIVE_BUCKET}/${encoded}`,{method:'DELETE',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`}});
  if(!res.ok)throw new Error(await res.text());
}
function isOptionalStudentColumnMissing(err){return /subject_choices|intake_payload|planner_id|student_no|schema cache|column/i.test(err?.message||String(err));}
async function writeStudentRecord(path,method,payload){
  try{
    return await apiFetch(path,{method,headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  }catch(err){
    if(isOptionalStudentColumnMissing(err)){
      const msg=String(err?.message||err);
      const fallback={...payload};
      if(/subject_choices|schema cache|column/i.test(msg))delete fallback.subject_choices;
      if(/intake_payload|schema cache|column/i.test(msg))delete fallback.intake_payload;
      if(/planner_id|schema cache|column/i.test(msg))delete fallback.planner_id;
      if(/student_no|schema cache|column/i.test(msg))delete fallback.student_no;
      if(Object.keys(fallback).length!==Object.keys(payload).length){
        return apiFetch(path,{method,headers:{Prefer:'return=representation'},body:JSON.stringify(fallback)});
      }
    }
    throw err;
  }
}
function backUrlForStudent(student){
  const stage=stageValue(student?.stage||defaultStage());
  return stage==='specialty'?'../specialty/index.html':'../index.html';
}
function setLoginNotice(text){
  const el=$('#loginNotice');
  if(!text){el.hidden=true;el.innerHTML='';return;}
  el.hidden=false;
  el.innerHTML=text;
}
async function fetchAll(){
  if(!auth.user){
    students=[];forms=[];
    render();
    return;
  }
  $('#studentList').innerHTML='<div class="empty">正在读取学生档案...</div>';
  const userBeforeRequest=auth.user;
  try{
    readonlyNotice='';
    const results=await Promise.all([
      apiFetch('students?select=*&archived=eq.false&order=updated_at.desc'),
      apiFetch('volunteer_forms?select=id,student_id,title,status,stage,created_at,updated_at&order=updated_at.desc'),
      apiFetch('profiles?select=id,email,display_name,role,status').catch(()=>[])
    ]);
    students=results[0]||[];
    forms=results[1]||[];
    profiles=results[2]||[];
    const fresh=students.find(s=>s.id===currentStudent?.id);
    if(fresh){currentStudent={...fresh,subject_choices:studentSubjectChoices(fresh)};saveCurrentStudent(currentStudent);}
    saveStudentCache();
    render();
    openInitialArchiveIfNeeded();
  }catch(err){
    const msg=String(err.message||err);
    if(isJwtExpiredErrorText(msg)||/登录状态已过期/.test(msg)){
      const cached=loadStudentCache(userBeforeRequest);
      if(cached){
        auth.user=userBeforeRequest;
        students=cached.students||[];
        forms=cached.forms||[];
        readonlyNotice=`登录状态已过期，当前显示 ${esc(shortDateTime(cached.saved_at)||'最近一次')} 的本机缓存。请返回本科或专科首页重新登录后再刷新同步。`;
        render();
        openInitialArchiveIfNeeded();
        return;
      }
      auth.user=userBeforeRequest;
      readonlyNotice='登录状态已过期，且本机没有可用学生缓存。请返回本科或专科首页重新登录后再刷新。';
      render();
      return;
    }
    $('#studentList').innerHTML=`<div class="notice">读取学生失败：${esc(msg)}</div>`;
  }
}
function formGroups(){
  const map=new Map();
  forms.forEach(f=>{
    const arr=map.get(f.student_id)||[];
    arr.push(f);
    map.set(f.student_id,arr);
  });
  return map;
}
async function fetchVolunteerFormDetail(formId){
  const rows=await apiFetch(`volunteer_forms?select=*&id=eq.${encodeURIComponent(formId)}&limit=1`);
  const form=rows?.[0]||forms.find(f=>f.id===formId);
  if(!form)throw new Error('没有找到这份志愿表。');
  const groups=await apiFetch(`volunteer_form_groups?select=*&form_id=eq.${encodeURIComponent(form.id)}&order=position.asc`);
  const ids=(groups||[]).map(g=>g.id).filter(Boolean);
  const majors=ids.length?await apiFetch(`volunteer_form_majors?select=*&form_group_id=in.(${ids.join(',')})&order=position.asc`):[];
  return {form,groups:groups||[],majors:majors||[]};
}
function volunteerDraftFromDetail(groups,majors){
  const groupById=new Map(groups.map(g=>[g.id,g]));
  const volunteerKeys=groups.map(g=>g.group_key).filter(Boolean);
  const volunteerMeta={};
  const volunteerMajorKeys={};
  groups.forEach(g=>{
    if(!g.group_key)return;
    volunteerMeta[g.group_key]={strategy:g.strategy==='待定'?'':(g.strategy||''),obey:g.obey_adjustment?'是':'否',note:g.note||''};
    volunteerMajorKeys[g.group_key]=[];
  });
  majors.forEach(m=>{
    const group=groupById.get(m.form_group_id);
    if(group?.group_key&&volunteerMajorKeys[group.group_key]&&m.major_key)volunteerMajorKeys[group.group_key].push(m.major_key);
  });
  return {volunteerKeys,volunteerMajorKeys,volunteerMeta};
}
async function openVolunteerFormForEdit(formId){
  const summary=forms.find(f=>f.id===formId);
  const student=students.find(s=>s.id===summary?.student_id);
  if(!student){alert('没有找到这份志愿表对应的学生。请先刷新学生档案。');return;}
  try{
    const detail=await fetchVolunteerFormDetail(formId);
    const chosen={...student,stage:detail.form.stage||student.stage,subject_choices:studentSubjectChoices(student)};
    saveLocalStudentSubjectChoices(chosen.id,chosen.subject_choices);
    saveCurrentStudent(chosen);
    saveVolunteerDraftForStudent(chosen,volunteerDraftFromDetail(detail.groups,detail.majors));
    saveVolunteerEditFormForStudent(chosen,detail.form);
    saveMedicalCodesForMain(chosen,detail.form);
    location.href=backUrlForStudent(chosen);
  }catch(err){alert('打开志愿表失败：'+err.message);}
}
async function deleteVolunteerForm(formId){
  const form=forms.find(f=>f.id===formId);
  if(!form){alert('没有找到这份志愿表。请刷新后再试。');return;}
  if(!confirm(`确定删除“${form.title||'未命名志愿表'}”吗？删除后不能恢复。`))return;
  try{
    await apiFetch(`volunteer_forms?id=eq.${encodeURIComponent(formId)}`,{method:'DELETE'});
    forms=forms.filter(f=>f.id!==formId);
    saveStudentCache();
    render();
  }catch(err){alert('删除志愿表失败：'+err.message);}
}
function studentNoText(student){return student?.student_no?`HSY${student.student_no}`:'待生成学号';}
function studentIntakePayload(student){
  if(student?.intake_payload&&typeof student.intake_payload==='object'&&!Array.isArray(student.intake_payload)&&Object.keys(student.intake_payload).length)return student.intake_payload;
  const local=storageJSON(`js-plan-intake-json:${student?.id}`,null);
  if(local?.data&&typeof local.data==='object'&&!Array.isArray(local.data))return local.data;
  return null;
}
function studentSummary(s){
  const cities=(s.target_cities||[]).length?`｜城市 ${(s.target_cities||[]).join('、')}`:'';
  const medical=studentMedicalCodes(s);
  return `${studentNoText(s)}｜${stageLabel(s.stage)}｜${studentSubjectSummary(s)}｜${s.score||'—'}分｜位次 ${s.rank||'—'}${medical.length?'｜体检 '+medical.join('/'):''}${cities}`;
}
function searchText(s,savedForms=[]){
  const intake=studentIntakePayload(s);
  return [s.student_no,s.name,s.phone,stageLabel(s.stage),subjectLabel(s.subject_type),studentSubjectChoices(s).join(' '),s.score,s.rank,(s.target_cities||[]).join(' '),(s.target_majors||[]).join(' '),(s.medical_codes||[]).join(' '),s.note,intake?JSON.stringify(intake):'',savedForms.map(f=>f.title).join(' ')].join(' ').toLowerCase();
}
function filteredStudents(){
  const q=query.trim().toLowerCase();
  const grouped=formGroups();
  return students.filter(s=>{
    if(stageFilter&&stageValue(s.stage)!==stageFilter)return false;
    if(subjectFilter&&subjectTypeValue(s.subject_type)!==subjectFilter)return false;
    if(q&&!searchText(s,grouped.get(s.id)||[]).includes(q))return false;
    return true;
  });
}
function syncContextLinks(){
  const from=defaultStage();
  const intakeLink=$('#openIntakeFormLink');
  if(intakeLink){
    intakeLink.href=intakeFormPathForStage(from);
    intakeLink.textContent=from==='specialty'?'打开专科采集表':'打开本科采集表';
  }
  const subtitle=$('#pageSubtitle');
  if(subtitle){
    subtitle.textContent=from==='specialty'
      ?'集中管理专科学生、分数、选科、采集表和已保存志愿表。'
      :'集中管理本科学生、分数、选科、采集表和已保存志愿表。';
  }
}
function render(){
  const from=defaultStage();
  syncContextLinks();
  $('#defaultStageBadge').textContent=stageLabel(from);
  $('#stageFilter').value=stageFilter;
  $('#subjectFilter').value=subjectFilter;
  $('#studentSearch').value=query;
  $('#accountLine').textContent=auth.user?.email||'未登录';
  $('#currentLine').textContent=currentStudent?.name?`当前学生：${currentStudent.name}`:'未选择当前学生';
  if(!auth.user){
    setLoginNotice('请先回到本科或专科首页登录/注册账号，登录后这里会显示完整学生列表。');
    $('#studentList').innerHTML='<div class="empty">未登录，暂时不能读取学生档案。</div>';
    $('#studentCount').textContent='0 人';
    return;
  }
  setLoginNotice(readonlyNotice?`<b>${readonlyNotice}</b>`:'');
  const grouped=formGroups();
  const list=filteredStudents();
  $('#studentCount').textContent=`${list.length} / ${students.length} 人`;
  $('#studentList').innerHTML=list.length?list.map(s=>studentCardHTML(s,grouped.get(s.id)||[])).join(''):'<div class="empty">没有匹配的学生。可以换个关键词，或新增学生。</div>';
  bindCardActions();
}
function studentCardHTML(s,savedForms){
  const active=currentStudent?.id===s.id;
  const recent=savedForms.slice(0,3);
  const formList=recent.length?`<div class="form-list">${recent.map(f=>`<div class="form-row"><button class="form-title-btn" type="button" data-open-volunteer-form="${esc(f.id)}"><span>${esc(f.title||'未命名志愿表')}</span><small>${esc(shortDateTime(f.updated_at||f.created_at))}</small></button><div class="form-row-actions"><span class="badge">${esc(stageLabel(f.stage||s.stage))}</span><button type="button" data-open-volunteer-form="${esc(f.id)}">修改</button><button class="danger" type="button" data-delete-volunteer-form="${esc(f.id)}">删除</button></div></div>`).join('')}${savedForms.length>3?`<div class="form-row more"><span>还有 ${savedForms.length-3} 份未显示，可刷新后查看最近 3 份</span><span></span></div>`:''}</div>`:'<div class="form-list">还没有保存过志愿表。</div>';
  return `<article class="student-card ${active?'active':''}">
    <div class="student-card-head"><div><h3>${esc(s.name)} <span class="student-no">${esc(studentNoText(s))}</span></h3><p>${esc(studentSummary(s))}</p></div><span class="badge">${esc(stageLabel(s.stage))}</span></div>
    <div class="card-actions">
      <button class="save" data-set-current="${esc(s.id)}" type="button">设为当前</button>
      <a class="pill-btn" href="./archive.html?student=${encodeURIComponent(s.id)}">档案库</a>
      <button data-edit-student="${esc(s.id)}" type="button">编辑档案</button>
      <button data-intake-detail="${esc(s.id)}" type="button">采集详情</button>
      <a class="pill-btn" href="${esc(backUrlForStudent(s))}">去做志愿表</a>
    </div>
    ${formList}
  </article>`;
}
function bindCardActions(){
  $$('[data-set-current]').forEach(btn=>btn.addEventListener('click',()=>{
    const s=students.find(x=>x.id===btn.dataset.setCurrent);
    if(!s)return;
    const chosen={...s,subject_choices:studentSubjectChoices(s)};
    saveLocalStudentSubjectChoices(chosen.id,chosen.subject_choices);
    saveCurrentStudent(chosen);
    render();
    alert(`已设为当前学生：${chosen.name}`);
  }));
  $$('[data-edit-student]').forEach(btn=>btn.addEventListener('click',()=>{
    const s=students.find(x=>x.id===btn.dataset.editStudent);
    if(s)showEditor(s);
  }));
  $$('[data-intake-detail]').forEach(btn=>btn.addEventListener('click',()=>{
    const s=students.find(x=>x.id===btn.dataset.intakeDetail);
    if(s)showIntakeDetail(s);
  }));
  $$('[data-open-volunteer-form]').forEach(btn=>btn.addEventListener('click',()=>openVolunteerFormForEdit(btn.dataset.openVolunteerForm)));
  $$('[data-delete-volunteer-form]').forEach(btn=>btn.addEventListener('click',()=>deleteVolunteerForm(btn.dataset.deleteVolunteerForm)));
}
function resetNewForm(){
  $('#newStudentName').value='';
  $('#newStudentPhone').value='';
  $('#newStudentStage').value=defaultStage();
  $('#newStudentSubject').value='physics';
  $('#newStudentScore').value='';
  $('#newStudentRank').value='';
  $('#newStudentCities').value='';
  $('#newStudentMedical').value='';
  $('#newSubjectChoices').innerHTML=subjectChoicesInputsHTML('newStudentSubjects',[]);
  $$('[data-student-medical-code="newStudentMedical"]').forEach(cb=>{cb.checked=false;});
  syncStudentMedicalPicker('newStudentMedical','#newStudentMedical');
}
async function createStudent(){
  if(!auth.user){alert('请先登录。');return;}
  const name=$('#newStudentName').value.trim();
  if(!name){alert('请填写学生姓名。');return;}
  const subjectChoices=subjectChoicesFromInputs('newStudentSubjects');
  const payload={owner_id:auth.user.id,planner_id:auth.user.id,name,phone:$('#newStudentPhone').value.trim()||null,province:'江苏',stage:stageValue($('#newStudentStage').value),subject_type:subjectTypeValue($('#newStudentSubject').value),subject_choices:subjectChoices,score:dbInteger($('#newStudentScore').value),rank:dbInteger($('#newStudentRank').value),target_cities:splitListInput($('#newStudentCities').value),medical_codes:studentMedicalCodesFromInputs('newStudentMedical','#newStudentMedical')};
  try{
    const rows=await writeStudentRecord('students','POST',payload);
    const created={...rows[0],subject_choices:subjectChoices};
    saveLocalStudentSubjectChoices(created.id,subjectChoices);
    saveCurrentStudent(created);
    resetNewForm();
    await fetchAll();
    alert('学生已新增，并设为当前学生。');
  }catch(err){alert('新增学生失败：'+err.message);}
}
function showEditor(student){
  $('#modal').className='modal';
  const choices=studentSubjectChoices(student);
  $('#modal').innerHTML=`<h2>编辑学生档案</h2><div class="modal-body"><div class="student-form-grid">
    <label>姓名<input id="editStudentName" value="${esc(student.name||'')}" placeholder="学生姓名"></label>
    <label>手机号<input id="editStudentPhone" value="${esc(student.phone||'')}" placeholder="可选"></label>
    <label>批次<select id="editStudentStage"><option value="undergraduate" ${stageValue(student.stage)==='undergraduate'?'selected':''}>本科</option><option value="specialty" ${stageValue(student.stage)==='specialty'?'selected':''}>专科</option></select></label>
    <label>科类<select id="editStudentSubject"><option value="physics" ${subjectTypeValue(student.subject_type)==='physics'?'selected':''}>物理</option><option value="history" ${subjectTypeValue(student.subject_type)==='history'?'selected':''}>历史</option></select></label>
    <div class="wide student-choice-field"><span>再选科目</span>${subjectChoicesInputsHTML('editStudentSubjects',choices)}</div>
    <label>分数<input id="editStudentScore" type="number" value="${esc(student.score??'')}" placeholder="例如 586"></label>
    <label>位次<input id="editStudentRank" type="number" value="${esc(student.rank??'')}" placeholder="例如 39000"></label>
    <label class="wide">目标城市<input id="editStudentCities" value="${esc((student.target_cities||[]).join('、'))}" placeholder="南京、苏州、上海"></label>
    <div class="wide student-choice-field"><span>体检代码</span>${medicalCodePickerHTML('editStudentMedical',student.medical_codes||[])}<input id="editStudentMedical" value="${esc((student.medical_codes||[]).join(' '))}" placeholder="也可手动输入，如 21 35，可空"></div>
  </div><div class="modal-actions"><button id="cancelEditBtn" type="button">取消</button><button id="saveEditBtn" class="save" type="button">保存修改</button></div></div>`;
  $('#modalMask').classList.add('open');
  bindStudentMedicalPickers();
  $('#cancelEditBtn').addEventListener('click',closeModal);
  $('#saveEditBtn').addEventListener('click',()=>updateStudent(student.id));
}
function detailValue(value){
  if(Array.isArray(value))return value.length?value.join('、'):'—';
  if(value&&typeof value==='object')return JSON.stringify(value);
  const text=String(value??'').trim();
  return text||'—';
}
function detailRowHTML(label,value){
  return `<div class="detail-row"><div class="detail-k">${esc(label)}</div><div class="detail-v">${esc(detailValue(value))}</div></div>`;
}
function detailSectionHTML(title,rows){
  const body=rows.map(([label,value])=>detailRowHTML(label,value)).join('');
  return `<section class="detail-section"><h3>${esc(title)}</h3>${body}</section>`;
}
function detailFromKeys(data,pairs){
  return pairs.map(([label,key])=>[label,data?.[key]]);
}
function openInitialArchiveIfNeeded(){
  if(initialArchiveOpened)return;
  const id=params().get('student');
  if(!id)return;
  const exists=students.some(s=>s.id===id);
  if(exists){
    initialArchiveOpened=true;
    openStudentArchive(id,false);
  }
}
async function fetchStudentArchiveFiles(studentId){
  return apiFetch(`student_archive_files?select=*&student_id=eq.${encodeURIComponent(studentId)}&order=created_at.desc`);
}
function archiveCounts(files){
  const m=new Map(STUDENT_ARCHIVE_SECTIONS.map(x=>[x.id,0]));
  (files||[]).forEach(f=>m.set(f.section,(m.get(f.section)||0)+1));
  return m;
}
function archiveFilesForSection(section){
  return archiveFiles.filter(f=>f.section===section);
}
function archiveFileHTML(file){
  const title=file.title||file.file_name||'未命名文件';
  return `<div class="archive-file">
    <div><b>${esc(title)}</b><p>${esc(file.file_name||'文件')}｜${esc(formatSize(file.file_size))}｜上传 ${esc(shortDateTime(file.created_at))}${file.summary?`<br>${esc(file.summary)}`:''}</p></div>
    <div class="archive-file-actions"><button type="button" data-view-archive-file="${esc(file.id)}">查看</button><button class="danger" type="button" data-delete-archive-file="${esc(file.id)}">删除</button></div>
  </div>`;
}
function archiveSectionHTML(section,counts){
  const files=archiveFilesForSection(section.id);
  return `<section class="archive-section">
    <div class="archive-section-head"><h3>${esc(section.label)}</h3><span class="badge">${counts.get(section.id)||0} 个文件</span></div>
    <div class="archive-file-list">${files.length?files.map(archiveFileHTML).join(''):`<div class="archive-empty">暂无${esc(section.label)}资料。</div>`}</div>
  </section>`;
}
function studentArchiveHTML(student){
  const data=studentIntakePayload(student);
  const savedForms=formGroups().get(student.id)||[];
  const counts=archiveCounts(archiveFiles);
  const planner=plannerName(student.planner_id||student.owner_id);
  const serviceStart=student.service_started_at||student.created_at;
  const intakeKeys=data?Object.keys(data).length:0;
  return `<div class="archive-shell">
    <div class="archive-hero">
      <div>
        <h3>${esc(student.name)} <span class="student-no">${esc(studentNoText(student))}</span></h3>
        <p>${esc(studentSummary(student))}</p>
        <div class="archive-actions" style="margin-top:10px">
          <button class="save" type="button" data-set-current-from-archive="${esc(student.id)}">设为当前学生</button>
          <button type="button" data-edit-student-from-archive="${esc(student.id)}">编辑基本信息</button>
          <button type="button" data-intake-from-archive="${esc(student.id)}">查看采集详情</button>
          <a href="${esc(backUrlForStudent(student))}">去做志愿表</a>
          <a href="${esc(intakeFormPathForStage(student.stage))}" target="_blank" rel="noopener">打开${esc(stageLabel(student.stage))}信息采集表</a>
        </div>
      </div>
      <div class="archive-meta-grid">
        <div><b>服务规划师</b><span>${esc(planner)}</span></div>
        <div><b>开始服务</b><span>${esc(shortDate(serviceStart)||'未记录')}</span></div>
        <div><b>采集字段</b><span>${esc(intakeKeys?`${intakeKeys} 项`:'未导入')}</span></div>
        <div><b>志愿表</b><span>${esc(`${savedForms.length} 份`)}</span></div>
      </div>
    </div>
    <div class="archive-section-grid">${STUDENT_ARCHIVE_SECTIONS.map(sec=>`<div class="archive-stat"><b>${esc(sec.label)}</b><span>${counts.get(sec.id)||0}</span></div>`).join('')}</div>
    <div class="archive-upload">
      <label>资料板块<select id="archiveUploadSection">${STUDENT_ARCHIVE_SECTIONS.map(sec=>`<option value="${esc(sec.id)}">${esc(sec.label)}</option>`).join('')}</select></label>
      <label>资料标题<input id="archiveUploadTitle" placeholder="如 综评报名截图 / 竞赛证书"></label>
      <label>文件<input id="archiveUploadFile" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png,.webp,.gif,.zip,.rar,.7z,application/pdf,image/*,text/*"></label>
      <button id="archiveUploadBtn" class="save" type="button">上传到档案库</button>
    </div>
    ${detailSectionHTML('基本信息',[
      ['学生',student.name],['手机号',student.phone],['批次',stageLabel(student.stage)],['选科',studentSubjectSummary(student)],['分数',student.score],['位次',student.rank],['体检代码',studentMedicalCodes(student)],['目标城市',student.target_cities],['目标专业',student.target_majors],['备注',student.note]
    ])}
    ${detailSectionHTML('已保存志愿表',savedForms.length?savedForms.map(f=>[f.title||'未命名志愿表',`${stageLabel(f.stage||student.stage)}｜${shortDateTime(f.updated_at||f.created_at)}`]):[['志愿表','暂无保存记录']])}
    <div class="archive-files">${STUDENT_ARCHIVE_SECTIONS.map(sec=>archiveSectionHTML(sec,counts)).join('')}</div>
  </div>`;
}
async function openStudentArchive(studentId,pushUrl=false){
  const student=students.find(s=>s.id===studentId);
  if(!student){alert('没有找到这个学生。请刷新后再试。');return;}
  archiveStudentId=studentId;
  if(pushUrl)history.pushState(null,'',`${location.pathname}?student=${encodeURIComponent(studentId)}`);
  $('#modal').className='modal archive-modal';
  $('#modal').innerHTML=`<h2>学生档案库｜${esc(student.name)}</h2><div class="modal-body"><div class="empty">正在读取档案库...</div></div>`;
  $('#modalMask').classList.add('open');
  try{
    archiveFiles=await fetchStudentArchiveFiles(studentId);
  }catch(err){
    archiveFiles=[];
    $('#modal .modal-body').innerHTML=`<div class="notice">读取档案库失败：${esc(err.message)}<br>请确认已执行最新版 Supabase schema，包含 student_archive_files 表和 student-archives bucket。</div>`;
    return;
  }
  renderStudentArchive(student);
}
function renderStudentArchive(student){
  $('#modal').className='modal archive-modal';
  $('#modal').innerHTML=`<h2>学生档案库｜${esc(student.name)} <span class="student-no">${esc(studentNoText(student))}</span></h2><div class="modal-body">${studentArchiveHTML(student)}<div class="modal-actions"><button id="closeArchiveBtn" type="button">关闭</button></div></div>`;
  bindArchiveActions(student);
}
function bindArchiveActions(student){
  $('#closeArchiveBtn')?.addEventListener('click',closeModal);
  $('[data-set-current-from-archive]')?.addEventListener('click',()=>{
    const chosen={...student,subject_choices:studentSubjectChoices(student)};
    saveLocalStudentSubjectChoices(chosen.id,chosen.subject_choices);
    saveCurrentStudent(chosen);
    render();
    alert(`已设为当前学生：${chosen.name}`);
  });
  $('[data-edit-student-from-archive]')?.addEventListener('click',()=>showEditor(student));
  $('[data-intake-from-archive]')?.addEventListener('click',()=>showIntakeDetail(student));
  $('#archiveUploadBtn')?.addEventListener('click',()=>uploadArchiveFileForStudent(student));
  $$('[data-view-archive-file]').forEach(btn=>btn.addEventListener('click',()=>viewArchiveFile(btn.dataset.viewArchiveFile)));
  $$('[data-delete-archive-file]').forEach(btn=>btn.addEventListener('click',()=>deleteArchiveFile(btn.dataset.deleteArchiveFile,student)));
}
async function uploadArchiveFileForStudent(student){
  const file=$('#archiveUploadFile')?.files?.[0];
  const section=$('#archiveUploadSection')?.value||'other';
  const title=$('#archiveUploadTitle')?.value.trim()||file?.name||'未命名资料';
  if(!file){alert('请选择要上传的文件。');return;}
  if(file.size>MAX_ARCHIVE_FILE_BYTES){alert(`文件过大：${formatSize(file.size)}，请控制在 100MB 以内。`);return;}
  if(!isSafeArchiveFile(file)){alert('当前只允许 PDF、Word、PPT、Excel、CSV、TXT、Markdown、常见图片和压缩包。');return;}
  try{
    $('#archiveUploadBtn').disabled=true;
    $('#archiveUploadBtn').textContent='上传中...';
    const path=createArchiveStoragePath(student,section,file);
    await uploadArchiveStorageFile(file,path);
    await apiFetch('student_archive_files',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({student_id:student.id,section,title,summary:'',file_path:path,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size:file.size,uploaded_by:auth.user.id})});
    archiveFiles=await fetchStudentArchiveFiles(student.id);
    renderStudentArchive(student);
  }catch(err){alert('上传失败：'+err.message);}
  finally{
    const btn=$('#archiveUploadBtn');
    if(btn){btn.disabled=false;btn.textContent='上传到档案库';}
  }
}
async function viewArchiveFile(fileId){
  const file=archiveFiles.find(f=>String(f.id)===String(fileId));
  if(!file)return;
  try{
    const url=await signedArchiveFileUrl(file.file_path);
    window.open(url,'_blank','noopener');
  }catch(err){alert('打开文件失败：'+err.message);}
}
async function deleteArchiveFile(fileId,student){
  const file=archiveFiles.find(f=>String(f.id)===String(fileId));
  if(!file)return;
  if(!confirm(`确定删除“${file.title||file.file_name||'这份资料'}”吗？`))return;
  try{
    await apiFetch(`student_archive_files?id=eq.${encodeURIComponent(fileId)}`,{method:'DELETE'});
    try{await deleteArchiveStorageObject(file.file_path);}catch(err){console.warn('删除存储文件失败',err);}
    archiveFiles=archiveFiles.filter(f=>String(f.id)!==String(fileId));
    renderStudentArchive(student);
  }catch(err){alert('删除失败：'+err.message);}
}
function showIntakeDetail(student){
  const data=studentIntakePayload(student);
  const fallbackSections=[
    detailSectionHTML('系统档案',[
      ['好生涯学号',studentNoText(student)],
      ['姓名',student.name],
      ['手机号',student.phone],
      ['批次',stageLabel(student.stage)],
      ['选科',studentSubjectSummary(student)],
      ['分数',student.score],
      ['位次',student.rank],
      ['目标城市',(student.target_cities||[]).join('、')],
      ['体检代码',(student.medical_codes||[]).join('、')],
      ['备注',student.note]
    ])
  ];
  const sections=data?[
    detailSectionHTML('基础信息',[
      ['好生涯学号',studentNoText(student)],
      ['学生姓名',data['学生姓名']||student.name],
      ['性别',data['性别']],
      ['出生日期',data['出生日期']],
      ['就读学校',data['就读学校']],
      ['班级',data['班级']],
      ['规划师/沟通老师',data['规划师']||data['沟通老师']],
      ['家长电话',data['家长电话']||student.phone],
      ['备用电话',data['备用电话']],
      ['高考省份',data['高考省份']||student.province],
      ['高考年份',data['高考年份']||'2026']
    ]),
    detailSectionHTML('成绩与选科',[
      ['选科',data['选科']||studentSubjectSummary(student)],
      ['总分',data['总分']||student.score],
      ['位次',data['位次']||student.rank],
      ['高考语种',data['高考语种']],
      ['语文',data['语文']],
      ['数学',data['数学']],
      ['外语',data['外语']],
      ['历次模考',data['历次模考']],
      ['成绩结构判断',data['成绩结构判断']],
      ['专科路径适配说明',data['专科路径适配说明']]
    ]),
    detailSectionHTML('体检与限制',[
      ['体检代码',data['体检快捷代码']||data['体检受限代码']||data['体检快捷项']||student.medical_codes],
      ['口语测试',data['口语测试']],
      ['体检风险等级',data['体检风险等级']],
      ['体检限制补充',data['体检限制补充']],
      ['体检需避开专业',data['体检需避开专业']],
      ['其他特殊类型',data['其他特殊类型']],
      ['资格核验说明',data['资格核验说明']]
    ]),
    detailSectionHTML('家庭诉求',detailFromKeys(data,[
      ['家庭核心诉求排序','家庭核心诉求排序'],['学校专业取舍','学校专业取舍'],['就业偏好','就业偏好'],['最终决策人','最终决策人'],
      ['家庭基本说明','家庭基本说明'],['家长核心诉求原话','家长核心诉求原话'],['学生本人诉求原话','学生本人诉求原话'],['家庭内部冲突点','家庭内部冲突点'],['家庭资源职业背景','家庭资源职业背景'],
      ['学生签字/确认','学生签字'],['家长签字/确认','家长签字']
    ])),
    detailSectionHTML('地域与院校',detailFromKeys(data,[
      ['意向地区排序','意向地区排序'],['坚决不去地区排序','坚决不去地区排序'],['地域偏好补充说明','地域偏好补充说明'],
      ['院校层次偏好','院校层次偏好'],['意向院校','意向院校'],['明确排斥院校','明确排斥院校'],
      ['院校层次','院校层次'],['是否接受中外合作院校','是否接受中外合作院校'],['是否接受中外合作','是否接受中外合作'],['是否接受港澳院校','是否接受港澳院校'],['年预算上限','年预算上限'],
      ['是否接受分段培养','是否接受分段培养'],['分段培养类型','分段培养类型'],['是否接受转段不确定性','是否接受转段不确定性']
    ])),
    detailSectionHTML('专业偏好',detailFromKeys(data,[
      ['意向专业类排序','意向专业类排序'],['意向专业类','意向专业类'],['专业白名单','专业白名单'],['专业灰名单','专业灰名单'],
      ['专业黑名单','专业黑名单'],['专业选择原因','专业选择原因'],['规划师匹配适合方向','规划师匹配适合的专业方向'],['学生家长确定排序','学生和家长确定的专业方向排序']
    ])),
    detailSectionHTML('风险与规划结论',detailFromKeys(data,[
      ['是否接受调剂','是否接受调剂'],['整体风险偏好','整体风险偏好'],['是否接受大类分流','是否接受大类分流'],
      ['不能接受的最差结果','不能接受的最差结果'],['可以妥协的条件','可以妥协的条件'],['规划师初步判断','规划师初步判断'],
      ['初步适合方向','初步适合方向'],['初步院校层次策略','初步院校层次策略'],['是否考虑专升本','是否考虑专升本'],['下一次必须追问的问题','下一次必须追问的问题'],['需要补充材料','需要补充材料'],['沟通备注或录音文件名','沟通备注或录音文件名'],['沟通备注','沟通备注'],['确认人','确认人']
    ]))
  ]:fallbackSections;
  $('#modal').className='modal detail-modal';
  $('#modal').innerHTML=`<h2>采集详情｜${esc(student.name)} <span class="student-no">${esc(studentNoText(student))}</span></h2>
    <div class="modal-body">
      ${data?'':'<div class="detail-empty">这个学生还没有同步完整采集表 JSON；当前只显示系统档案字段。</div>'}
      <div class="detail-grid">${sections.join('')}</div>
      <div class="modal-actions"><button id="closeDetailBtn" type="button">关闭</button></div>
    </div>`;
  $('#modalMask').classList.add('open');
  $('#closeDetailBtn').addEventListener('click',closeModal);
}
function closeModal(){
  $('#modalMask').classList.remove('open');
  if(archiveStudentId){
    archiveStudentId='';
    archiveFiles=[];
    if(params().get('student'))history.replaceState(null,'',location.pathname);
  }
}
async function updateStudent(studentId){
  const name=$('#editStudentName').value.trim();
  if(!name){alert('请填写学生姓名。');return;}
  const subjectChoices=subjectChoicesFromInputs('editStudentSubjects');
  const payload={name,phone:$('#editStudentPhone').value.trim()||null,province:'江苏',stage:stageValue($('#editStudentStage').value),subject_type:subjectTypeValue($('#editStudentSubject').value),subject_choices:subjectChoices,score:dbInteger($('#editStudentScore').value),rank:dbInteger($('#editStudentRank').value),target_cities:splitListInput($('#editStudentCities').value),medical_codes:studentMedicalCodesFromInputs('editStudentMedical','#editStudentMedical')};
  try{
    const rows=await writeStudentRecord(`students?id=eq.${encodeURIComponent(studentId)}`,'PATCH',payload);
    const updated={...(rows?.[0]||payload),id:studentId,owner_id:auth.user.id,subject_choices:subjectChoices};
    saveLocalStudentSubjectChoices(studentId,subjectChoices);
    if(currentStudent?.id===studentId)saveCurrentStudent(updated);
    closeModal();
    await fetchAll();
    alert('学生档案已更新。');
  }catch(err){alert('更新学生失败：'+err.message);}
}
function intakeText(data,key){return String(data?.[key]??'').trim();}
function intakeArray(data,key){const v=data?.[key];return Array.isArray(v)?v.filter(Boolean).map(x=>String(x).trim()).filter(Boolean):splitListInput(v);}
function intakeSubjectType(data){
  const xk=intakeText(data,'选科');
  return /史|历/.test(xk)&&!/物/.test(xk)?'history':'physics';
}
function intakeSubjectChoices(data){
  const xk=intakeText(data,'选科');
  const out=[];
  [['化学',/化/],['生物',/生/],['政治',/政/],['地理',/地/]].forEach(([name,re])=>{if(re.test(xk)&&!out.includes(name))out.push(name);});
  return out;
}
function intakeStage(data){
  const explicit=[data?.['采集表类型'],data?.['批次'],data?.['报考层次'],data?.['本科/专科'],data?.['填报阶段']].map(x=>String(x||'')).join(' ');
  if(/specialty|专科|高职|第二阶段/i.test(explicit))return 'specialty';
  const specialtyKeys=['专科路径适配说明','是否接受分段培养','分段培养类型','是否接受转段不确定性','是否考虑专升本','资格核验说明'];
  return specialtyKeys.some(k=>Object.prototype.hasOwnProperty.call(data||{},k))?'specialty':'undergraduate';
}
function intakeTargetMajors(data){
  const ordered=intakeArray(data,'意向专业类排序');
  const checked=intakeArray(data,'意向专业类');
  const white=splitListInput(intakeText(data,'专业白名单'));
  return [...new Set([...ordered,...checked,...white])].slice(0,80);
}
function intakeTargetCities(data){
  const wanted=intakeArray(data,'意向地区排序');
  const extra=splitListInput(intakeText(data,'地域偏好补充说明'));
  return [...new Set([...wanted,...extra])].slice(0,80);
}
function intakeNote(data){
  const pairs=[
    ['就读学校','就读学校'],['班级','班级'],['沟通老师','沟通老师'],['规划师','规划师'],['家庭说明','家庭基本说明'],['家长诉求','家长核心诉求原话'],['学生诉求','学生本人诉求原话'],
    ['专科路径','专科路径适配说明'],['资格核验','资格核验说明'],['分段培养','是否接受分段培养'],['转段不确定性','是否接受转段不确定性'],['专升本','是否考虑专升本'],
    ['专业白名单','专业白名单'],['专业灰名单','专业灰名单'],['专业黑名单','专业黑名单'],['院校意向','意向院校'],['排斥院校','明确排斥院校'],
    ['规划师判断','规划师初步判断'],['规划师方向','规划师匹配适合的专业方向'],['确定排序','学生和家长确定的专业方向排序'],['院校策略','初步院校层次策略'],['补充材料','需要补充材料'],['采集备注','沟通备注或录音文件名'],['沟通备注','沟通备注']
  ];
  return pairs.map(([label,key])=>intakeText(data,key)?`${label}：${intakeText(data,key)}`:'').filter(Boolean).join('\n').slice(0,6000);
}
function intakeStudentNo(data){
  const raw=intakeText(data,'好生涯学号')||intakeText(data,'学号')||intakeText(data,'学生编号');
  const digits=raw.replace(/^HSY/i,'').replace(/\D/g,'');
  return digits?digits.padStart(5,'0').slice(-5):null;
}
function intakePayload(data){
  const name=intakeText(data,'学生姓名');
  if(!name)throw new Error('采集表 JSON 缺少“学生姓名”。');
  const subjectChoices=intakeSubjectChoices(data);
  const payload={
    owner_id:auth.user.id,
    planner_id:auth.user.id,
    name,
    phone:intakeText(data,'家长电话')||intakeText(data,'备用电话')||null,
    gender:['男','女'].includes(intakeText(data,'性别'))?intakeText(data,'性别'):'未知',
    province:intakeText(data,'高考省份')||'江苏',
    stage:intakeStage(data),
    subject_type:intakeSubjectType(data),
    subject_choices:subjectChoices,
    score:dbInteger(intakeText(data,'总分')),
    rank:dbInteger(intakeText(data,'位次')),
    target_cities:intakeTargetCities(data),
    target_majors:intakeTargetMajors(data),
    medical_codes:parseMedicalCodes([...(Array.isArray(data['体检快捷代码'])?data['体检快捷代码']:[]),...(Array.isArray(data['体检快捷项'])?data['体检快捷项']:[]),intakeText(data,'体检受限代码'),intakeText(data,'体检限制补充'),intakeText(data,'体检需避开专业')].join(' ')),
    intake_payload:{...data,采集表类型:intakeStage(data)==='specialty'?'specialty':'undergraduate'},
    note:intakeNote(data)
  };
  const no=intakeStudentNo(data);
  if(no)payload.student_no=no;
  return payload;
}
async function importIntakeData(data){
  if(!auth.user)throw new Error('请先登录后再导入采集表。');
  const payload=intakePayload(data);
  const existingByNo=payload.student_no?students.find(s=>s.student_no===payload.student_no):null;
  const sameName=students.filter(s=>s.name===payload.name&&(payload.phone?String(s.phone||'')===String(payload.phone):true));
  const existing=existingByNo||sameName[0];
  let rows;
  if(existing&&(existingByNo||confirm(`检测到同名学生“${payload.name}”。\n\n系统不会自动按姓名串档。确认后才会用采集表覆盖该学生；取消将新增一个独立学生。`))){
    rows=await writeStudentRecord(`students?id=eq.${encodeURIComponent(existing.id)}`,'PATCH',payload);
  }else{
    rows=await writeStudentRecord('students','POST',payload);
  }
  const saved={...(rows?.[0]||payload),subject_choices:payload.subject_choices};
  saveLocalStudentSubjectChoices(saved.id,payload.subject_choices);
  saveCurrentStudent(saved);
  try{localStorage.setItem(`js-plan-intake-json:${saved.id}`,JSON.stringify({saved_at:new Date().toISOString(),data}));}catch(e){}
  await fetchAll();
  alert(`采集表已导入并设为当前学生：${saved.name}`);
}
function handleIntakeImport(event){
  const file=event.target.files?.[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=async()=>{
    try{await importIntakeData(JSON.parse(reader.result));}
    catch(err){alert('导入采集表失败：'+err.message);}
    event.target.value='';
  };
  reader.readAsText(file,'utf-8');
}
function bindEvents(){
  $('#studentSearch').addEventListener('input',e=>{query=e.target.value;render();});
  $('#stageFilter').addEventListener('change',e=>{stageFilter=e.target.value;render();});
  $('#subjectFilter').addEventListener('change',e=>{subjectFilter=e.target.value;render();});
  $('#clearSearchBtn').addEventListener('click',()=>{query='';stageFilter='';subjectFilter='';render();});
  $('#refreshBtn').addEventListener('click',fetchAll);
  $('#importIntakeBtn')?.addEventListener('click',()=>$('#intakeImportFile')?.click());
  $('#intakeImportFile')?.addEventListener('change',handleIntakeImport);
  $('#createStudentBtn').addEventListener('click',createStudent);
  $('#resetFormBtn').addEventListener('click',resetNewForm);
  $('#modalMask').addEventListener('click',e=>{if(e.target.id==='modalMask')closeModal();});
}
function init(){
  loadSavedAuth();
  loadCurrentStudent();
  $('#newSubjectChoices').innerHTML=subjectChoicesInputsHTML('newStudentSubjects',[]);
  hydrateNewStudentMedicalPicker();
  resetNewForm();
  bindEvents();
  render();
  fetchAll();
}
init();
})();
