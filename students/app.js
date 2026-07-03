(function(){
'use strict';
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const CURRENT_STUDENT_STORAGE_KEY='js-plan-current-student-v1';
const STUDENT_SUBJECT_CHOICES_STORAGE_KEY='js-plan-student-subject-choices-v1';
const SUBJECT_CHOICE_OPTIONS=['化学','生物','政治','地理'];
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let auth={accessToken:'',user:null};
let students=[];
let forms=[];
let currentStudent=null;
let query='';
let stageFilter='';
let subjectFilter='';
function params(){return new URLSearchParams(location.search);}
function defaultStage(){return params().get('from')==='specialty'?'specialty':'undergraduate';}
function stageLabel(v){return v==='specialty'?'专科':'本科';}
function subjectLabel(v){return v==='history'?'历史':'物理';}
function stageValue(v){return v==='specialty'||v==='专科'?'specialty':'undergraduate';}
function subjectTypeValue(v){return v==='history'||v==='历史'?'history':'physics';}
function storageJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function loadSavedAuth(){const data=storageJSON(AUTH_STORAGE_KEY,{}); if(data?.accessToken&&data?.user)auth={accessToken:data.accessToken,refreshToken:data.refreshToken||'',user:data.user};}
function currentStudentStorageKey(){return auth.user?.id?`${CURRENT_STUDENT_STORAGE_KEY}:${auth.user.id}`:CURRENT_STUDENT_STORAGE_KEY;}
function loadCurrentStudent(){currentStudent=storageJSON(currentStudentStorageKey(),null);}
function saveCurrentStudent(student){currentStudent=student||null; try{currentStudent?localStorage.setItem(currentStudentStorageKey(),JSON.stringify(currentStudent)):localStorage.removeItem(currentStudentStorageKey());}catch(e){}}
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
function splitListInput(v){return String(v||'').split(/[，,、\s/]+/).map(x=>x.trim()).filter(Boolean);}
function dbNumber(v){if(v===null||v===undefined||v==='')return null; const n=Number(String(v).replace(/,/g,'').trim()); return Number.isFinite(n)?n:null;}
function dbInteger(v){const n=dbNumber(v); return n===null?null:Math.round(n);}
function parseMedicalCodes(raw){return String(raw||'').split(/[^0-9]+/).map(x=>x.trim()).filter(Boolean);}
function shortDateTime(v){if(!v)return ''; const d=new Date(v); if(Number.isNaN(d.getTime()))return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json',...extra};}
async function apiFetch(path,options={}){
  if(!auth.accessToken)throw new Error('请先登录');
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:authHeaders(options.headers||{})});
  if(!res.ok)throw new Error(await res.text());
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
  try{
    const results=await Promise.all([
      apiFetch('students?select=*&archived=eq.false&order=updated_at.desc'),
      apiFetch('volunteer_forms?select=id,student_id,title,status,stage,created_at,updated_at&order=updated_at.desc')
    ]);
    students=results[0]||[];
    forms=results[1]||[];
    const fresh=students.find(s=>s.id===currentStudent?.id);
    if(fresh){currentStudent={...fresh,subject_choices:studentSubjectChoices(fresh)};saveCurrentStudent(currentStudent);}
    render();
  }catch(err){
    $('#studentList').innerHTML=`<div class="notice">读取学生失败：${esc(err.message)}</div>`;
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
function studentSummary(s){
  const cities=(s.target_cities||[]).length?`｜城市 ${(s.target_cities||[]).join('、')}`:'';
  return `${stageLabel(s.stage)}｜${studentSubjectSummary(s)}｜${s.score||'—'}分｜位次 ${s.rank||'—'}${cities}`;
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
  setLoginNotice('');
  const grouped=formGroups();
  const list=filteredStudents();
  $('#studentCount').textContent=`${list.length} / ${students.length} 人`;
  $('#studentList').innerHTML=list.length?list.map(s=>studentCardHTML(s,grouped.get(s.id)||[])).join(''):'<div class="empty">没有匹配的学生。可以换个关键词，或新增学生。</div>';
  bindCardActions();
}
function studentCardHTML(s,savedForms){
  const active=currentStudent?.id===s.id;
  const recent=savedForms.slice(0,3);
  const formList=recent.length?`<div class="form-list">${recent.map(f=>`<div class="form-row"><span>${esc(f.title||'未命名志愿表')}<small>${esc(shortDateTime(f.updated_at||f.created_at))}</small></span><span class="badge">${esc(stageLabel(f.stage||s.stage))}</span></div>`).join('')}${savedForms.length>3?`<div class="form-row"><span>还有 ${savedForms.length-3} 份未显示</span><span></span></div>`:''}</div>`:'<div class="form-list">还没有保存过志愿表。</div>';
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
}
async function createStudent(){
  if(!auth.user){alert('请先登录。');return;}
  const name=$('#newStudentName').value.trim();
  if(!name){alert('请填写学生姓名。');return;}
  const subjectChoices=subjectChoicesFromInputs('newStudentSubjects');
  const payload={owner_id:auth.user.id,name,phone:$('#newStudentPhone').value.trim()||null,province:'江苏',stage:stageValue($('#newStudentStage').value),subject_type:subjectTypeValue($('#newStudentSubject').value),subject_choices:subjectChoices,score:dbInteger($('#newStudentScore').value),rank:dbInteger($('#newStudentRank').value),target_cities:splitListInput($('#newStudentCities').value),medical_codes:parseMedicalCodes($('#newStudentMedical').value)};
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
    <label class="wide">体检代码<input id="editStudentMedical" value="${esc((student.medical_codes||[]).join(' '))}" placeholder="如 21 35，可空"></label>
  </div><div class="modal-actions"><button id="cancelEditBtn" type="button">取消</button><button id="saveEditBtn" class="save" type="button">保存修改</button></div></div>`;
  $('#modalMask').classList.add('open');
  $('#cancelEditBtn').addEventListener('click',closeModal);
  $('#saveEditBtn').addEventListener('click',()=>updateStudent(student.id));
}
function closeModal(){$('#modalMask').classList.remove('open');}
async function updateStudent(studentId){
  const name=$('#editStudentName').value.trim();
  if(!name){alert('请填写学生姓名。');return;}
  const subjectChoices=subjectChoicesFromInputs('editStudentSubjects');
  const payload={name,phone:$('#editStudentPhone').value.trim()||null,province:'江苏',stage:stageValue($('#editStudentStage').value),subject_type:subjectTypeValue($('#editStudentSubject').value),subject_choices:subjectChoices,score:dbInteger($('#editStudentScore').value),rank:dbInteger($('#editStudentRank').value),target_cities:splitListInput($('#editStudentCities').value),medical_codes:parseMedicalCodes($('#editStudentMedical').value)};
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
function bindEvents(){
  $('#studentSearch').addEventListener('input',e=>{query=e.target.value;render();});
  $('#stageFilter').addEventListener('change',e=>{stageFilter=e.target.value;render();});
  $('#subjectFilter').addEventListener('change',e=>{subjectFilter=e.target.value;render();});
  $('#clearSearchBtn').addEventListener('click',()=>{query='';stageFilter='';subjectFilter='';render();});
  $('#refreshBtn').addEventListener('click',fetchAll);
  $('#createStudentBtn').addEventListener('click',createStudent);
  $('#resetFormBtn').addEventListener('click',resetNewForm);
  $('#modalMask').addEventListener('click',e=>{if(e.target.id==='modalMask')closeModal();});
}
function init(){
  loadSavedAuth();
  loadCurrentStudent();
  $('#newSubjectChoices').innerHTML=subjectChoicesInputsHTML('newStudentSubjects',[]);
  resetNewForm();
  bindEvents();
  render();
  fetchAll();
}
init();
})();
