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
let currentStudent=null;
let query='';
let stageFilter='';
let subjectFilter='';
let readonlyNotice='';
function params(){return new URLSearchParams(location.search);}
function defaultStage(){return params().get('from')==='specialty'?'specialty':'undergraduate';}
function stageLabel(v){return v==='specialty'?'专科':'本科';}
function subjectLabel(v){return v==='history'?'历史':'物理';}
function stageValue(v){return v==='specialty'||v==='专科'?'specialty':'undergraduate';}
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
function isSubjectChoicesColumnMissing(err){return /subject_choices|schema cache|column/i.test(err?.message||String(err));}
async function writeStudentRecord(path,method,payload){
  try{
    return await apiFetch(path,{method,headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  }catch(err){
    if(Object.prototype.hasOwnProperty.call(payload,'subject_choices')&&isSubjectChoicesColumnMissing(err)){
      const fallback={...payload};
      delete fallback.subject_choices;
      return apiFetch(path,{method,headers:{Prefer:'return=representation'},body:JSON.stringify(fallback)});
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
      apiFetch('volunteer_forms?select=id,student_id,title,status,stage,created_at,updated_at&order=updated_at.desc')
    ]);
    students=results[0]||[];
    forms=results[1]||[];
    const fresh=students.find(s=>s.id===currentStudent?.id);
    if(fresh){currentStudent={...fresh,subject_choices:studentSubjectChoices(fresh)};saveCurrentStudent(currentStudent);}
    saveStudentCache();
    render();
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
function studentSummary(s){
  const cities=(s.target_cities||[]).length?`｜城市 ${(s.target_cities||[]).join('、')}`:'';
  const medical=studentMedicalCodes(s);
  return `${stageLabel(s.stage)}｜${studentSubjectSummary(s)}｜${s.score||'—'}分｜位次 ${s.rank||'—'}${medical.length?'｜体检 '+medical.join('/'):''}${cities}`;
}
function searchText(s,savedForms=[]){
  return [s.name,s.phone,stageLabel(s.stage),subjectLabel(s.subject_type),studentSubjectChoices(s).join(' '),s.score,s.rank,(s.target_cities||[]).join(' '),(s.medical_codes||[]).join(' '),savedForms.map(f=>f.title).join(' ')].join(' ').toLowerCase();
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
function render(){
  const from=defaultStage();
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
    <div class="student-card-head"><div><h3>${esc(s.name)}</h3><p>${esc(studentSummary(s))}</p></div><span class="badge">${esc(stageLabel(s.stage))}</span></div>
    <div class="card-actions">
      <button class="save" data-set-current="${esc(s.id)}" type="button">设为当前</button>
      <button data-edit-student="${esc(s.id)}" type="button">编辑档案</button>
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
  const payload={owner_id:auth.user.id,name,phone:$('#newStudentPhone').value.trim()||null,province:'江苏',stage:stageValue($('#newStudentStage').value),subject_type:subjectTypeValue($('#newStudentSubject').value),subject_choices:subjectChoices,score:dbInteger($('#newStudentScore').value),rank:dbInteger($('#newStudentRank').value),target_cities:splitListInput($('#newStudentCities').value),medical_codes:studentMedicalCodesFromInputs('newStudentMedical','#newStudentMedical')};
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
function closeModal(){$('#modalMask').classList.remove('open');}
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
    ['就读学校','就读学校'],['班级','班级'],['沟通老师','沟通老师'],['家长诉求','家长核心诉求原话'],['学生诉求','学生本人诉求原话'],
    ['专业白名单','专业白名单'],['专业灰名单','专业灰名单'],['专业黑名单','专业黑名单'],['院校意向','意向院校'],['排斥院校','明确排斥院校'],
    ['规划师判断','规划师初步判断'],['补充材料','需要补充材料'],['采集备注','沟通备注或录音文件名']
  ];
  return pairs.map(([label,key])=>intakeText(data,key)?`${label}：${intakeText(data,key)}`:'').filter(Boolean).join('\n').slice(0,6000);
}
function intakePayload(data){
  const name=intakeText(data,'学生姓名');
  if(!name)throw new Error('采集表 JSON 缺少“学生姓名”。');
  const subjectChoices=intakeSubjectChoices(data);
  return {
    owner_id:auth.user.id,
    name,
    phone:intakeText(data,'家长电话')||intakeText(data,'备用电话')||null,
    gender:['男','女'].includes(intakeText(data,'性别'))?intakeText(data,'性别'):'未知',
    province:intakeText(data,'高考省份')||'江苏',
    stage:'undergraduate',
    subject_type:intakeSubjectType(data),
    subject_choices:subjectChoices,
    score:dbInteger(intakeText(data,'总分')),
    rank:dbInteger(intakeText(data,'位次')),
    target_cities:intakeTargetCities(data),
    target_majors:intakeTargetMajors(data),
    medical_codes:parseMedicalCodes([...(Array.isArray(data['体检快捷代码'])?data['体检快捷代码']:[]),intakeText(data,'体检限制补充'),intakeText(data,'体检需避开专业')].join(' ')),
    note:intakeNote(data)
  };
}
async function importIntakeData(data){
  if(!auth.user)throw new Error('请先登录后再导入采集表。');
  const payload=intakePayload(data);
  const existing=students.find(s=>s.name===payload.name&&(payload.phone?String(s.phone||'')===String(payload.phone):true));
  let rows;
  if(existing&&confirm(`检测到已有学生“${payload.name}”。是否用采集表覆盖更新该学生档案？\n\n选择取消将新增一个学生。`)){
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
