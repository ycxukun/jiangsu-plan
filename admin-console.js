(function(){
'use strict';
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let auth={accessToken:'',refreshToken:'',user:null};
let profile=null;
let planners=[];
let students=[];
let forms=[];
let query='';
let plannerFilter='';
let archivedFilter='active';

function storageJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function loadAuth(){const data=storageJSON(AUTH_STORAGE_KEY,{});if(data?.accessToken&&data?.user)auth={accessToken:data.accessToken,refreshToken:data.refreshToken||'',user:data.user};}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json',...extra};}
async function apiFetch(path,options={}){
  if(!auth.accessToken)throw new Error('请先在本科或专科系统登录管理员账号。');
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:authHeaders(options.headers||{})});
  if(!res.ok)throw new Error(await res.text());
  if(res.status===204)return null;
  const text=await res.text();
  return text?JSON.parse(text):null;
}
function roleLabel(role){return role==='admin'?'管理员':role==='planner'?'规划师':role==='consultant'?'规划师':'只读';}
function studentNo(s){return s.student_no?`HSY${s.student_no}`:'待生成学号';}
function plannerName(id){
  const p=planners.find(x=>x.id===id);
  return p?(p.display_name||p.email||p.id):'未分配';
}
function setNotice(text,type='info'){
  const el=$('#notice');
  el.textContent=text;
  el.style.display=text?'block':'none';
  el.style.borderColor=type==='error'?'#f1c8c2':'#fed7aa';
  el.style.background=type==='error'?'#fff8f7':'#fff7ed';
  el.style.color=type==='error'?'#8a1f17':'#7c2d12';
}
async function ensureAdmin(){
  if(!auth.user)throw new Error('请先登录管理员账号。');
  const rows=await apiFetch(`profiles?select=*&id=eq.${encodeURIComponent(auth.user.id)}&limit=1`);
  profile=rows?.[0]||null;
  if(profile?.role!=='admin'||profile?.status!=='active')throw new Error('当前账号不是 active 管理员，不能进入后台。');
}
async function loadAll(){
  setNotice('正在读取后台数据...');
  await ensureAdmin();
  const [profileRows,studentRows,formRows]=await Promise.all([
    apiFetch('profiles?select=*&order=created_at.desc'),
    apiFetch('students?select=*&order=updated_at.desc'),
    apiFetch('volunteer_forms?select=id,student_id,owner_id,title,stage,status,updated_at&order=updated_at.desc')
  ]);
  planners=(profileRows||[]).filter(p=>['admin','consultant','planner'].includes(p.role));
  students=studentRows||[];
  forms=formRows||[];
  setNotice(`管理员：${profile.display_name||profile.email||auth.user.email}。可以管理 ${planners.length} 个规划师、${students.length} 个学生。`);
  render();
}
function renderPlannerFilter(){
  const current=$('#plannerFilter').value;
  $('#plannerFilter').innerHTML='<option value="">全部规划师</option>'+planners.map(p=>`<option value="${esc(p.id)}">${esc(p.display_name||p.email||p.id)}${p.status==='disabled'?'（禁用）':''}</option>`).join('');
  $('#plannerFilter').value=current;
}
function plannerCardHTML(p){
  const count=students.filter(s=>(s.planner_id||s.owner_id)===p.id&&!s.archived).length;
  return `<article class="planner-card ${p.status==='disabled'?'disabled':''}">
    <h3>${esc(p.display_name||p.email||'未命名规划师')} <span class="badge">${esc(roleLabel(p.role))}</span></h3>
    <p>${esc(p.email||p.id)}｜状态 ${esc(p.status)}｜当前学生 ${count} 人</p>
    <div class="row-actions">
      <button data-role="${esc(p.id)}" data-next-role="planner" type="button">设为规划师</button>
      <button data-role="${esc(p.id)}" data-next-role="admin" type="button">设为管理员</button>
      <button class="${p.status==='disabled'?'save':'danger'}" data-toggle-planner="${esc(p.id)}" type="button">${p.status==='disabled'?'启用':'禁用'}</button>
    </div>
  </article>`;
}
function formCount(studentId){return forms.filter(f=>f.student_id===studentId).length;}
function studentCardHTML(s){
  const plannerId=s.planner_id||s.owner_id||'';
  const plannerOptions=planners.filter(p=>p.status==='active').map(p=>`<option value="${esc(p.id)}" ${p.id===plannerId?'selected':''}>${esc(p.display_name||p.email||p.id)}</option>`).join('');
  return `<article class="student-card">
    <h3>${esc(s.name)} <span class="student-no">${esc(studentNo(s))}</span></h3>
    <p>${esc(plannerName(plannerId))}｜${esc(s.stage==='specialty'?'专科':'本科')}｜${esc(s.subject_type==='history'?'历史':'物理')}｜${esc(s.score||'—')}分｜位次 ${esc(s.rank||'—')}｜志愿表 ${formCount(s.id)} 份｜${s.archived?'已删除':'正常'}</p>
    <div class="transfer-row">
      <select data-transfer-select="${esc(s.id)}">${plannerOptions}</select>
      <button class="save" data-transfer-student="${esc(s.id)}" type="button">转移给该规划师</button>
    </div>
    <div class="row-actions">
      <button data-open-student="${esc(s.id)}" type="button">设为当前并打开档案</button>
      <button class="${s.archived?'save':'danger'}" data-archive-student="${esc(s.id)}" type="button">${s.archived?'恢复学生':'删除学生'}</button>
    </div>
  </article>`;
}
function filteredStudents(){
  const q=query.trim().toLowerCase();
  return students.filter(s=>{
    const plannerId=s.planner_id||s.owner_id||'';
    if(plannerFilter&&plannerId!==plannerFilter)return false;
    if(archivedFilter==='active'&&s.archived)return false;
    if(archivedFilter==='archived'&&!s.archived)return false;
    if(q){
      const hay=[s.student_no,s.name,s.phone,s.score,s.rank,plannerName(plannerId),s.note].join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
}
function render(){
  renderPlannerFilter();
  $('#plannerCount').textContent=`${planners.length} 人`;
  $('#studentCount').textContent=`${filteredStudents().length} / ${students.length} 人`;
  $('#plannerList').innerHTML=planners.length?planners.map(plannerCardHTML).join(''):'<div class="empty">还没有规划师资料。</div>';
  const list=filteredStudents();
  $('#studentList').innerHTML=list.length?list.map(studentCardHTML).join(''):'<div class="empty">没有匹配的学生。</div>';
  bindActions();
}
async function addPlanner(){
  const id=$('#plannerUserId').value.trim();
  const email=$('#plannerEmail').value.trim();
  const name=$('#plannerName').value.trim();
  if(!id||!email){alert('请填写 Supabase Auth 用户 UUID 和邮箱。');return;}
  try{
    await apiFetch('profiles?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({id,email,display_name:name||email,role:'planner',status:'active'})});
    $('#plannerUserId').value='';$('#plannerEmail').value='';$('#plannerName').value='';
    await loadAll();
  }catch(err){alert('添加规划师失败：'+err.message);}
}
async function togglePlanner(id){
  const p=planners.find(x=>x.id===id);
  if(!p)return;
  if(p.id===auth.user.id&&p.status==='active'){alert('不能在这里禁用当前登录的管理员账号。');return;}
  const next=p.status==='disabled'?'active':'disabled';
  try{
    await apiFetch(`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:next})});
    await loadAll();
  }catch(err){alert('更新规划师状态失败：'+err.message);}
}
async function changeRole(id,role){
  if(id===auth.user.id&&role!=='admin'){alert('不能把当前登录管理员降级。');return;}
  try{
    await apiFetch(`profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({role})});
    await loadAll();
  }catch(err){alert('修改角色失败：'+err.message);}
}
async function transferStudent(studentId,newPlannerId){
  const student=students.find(s=>s.id===studentId);
  const target=planners.find(p=>p.id===newPlannerId);
  if(!student||!target)return;
  if(!confirm(`确定把 ${studentNo(student)} ${student.name} 转移给 ${target.display_name||target.email} 吗？`))return;
  try{
    await apiFetch(`students?id=eq.${encodeURIComponent(studentId)}`,{method:'PATCH',body:JSON.stringify({owner_id:newPlannerId,planner_id:newPlannerId})});
    const studentForms=forms.filter(f=>f.student_id===studentId).map(f=>f.id);
    if(studentForms.length){
      await apiFetch(`volunteer_forms?student_id=eq.${encodeURIComponent(studentId)}`,{method:'PATCH',body:JSON.stringify({owner_id:newPlannerId})});
      await apiFetch(`volunteer_form_groups?form_id=in.(${studentForms.join(',')})`,{method:'PATCH',body:JSON.stringify({owner_id:newPlannerId})});
      const groupRows=await apiFetch(`volunteer_form_groups?select=id&form_id=in.(${studentForms.join(',')})`);
      const groupIds=(groupRows||[]).map(g=>g.id);
      if(groupIds.length)await apiFetch(`volunteer_form_majors?form_group_id=in.(${groupIds.join(',')})`,{method:'PATCH',body:JSON.stringify({owner_id:newPlannerId})});
      await apiFetch(`volunteer_exports?student_id=eq.${encodeURIComponent(studentId)}`,{method:'PATCH',body:JSON.stringify({owner_id:newPlannerId})});
    }
    await loadAll();
  }catch(err){alert('转移学生失败：'+err.message);}
}
async function archiveStudent(studentId){
  const student=students.find(s=>s.id===studentId);
  if(!student)return;
  const next=!student.archived;
  if(next&&!confirm(`确定删除学生 ${studentNo(student)} ${student.name} 吗？这里只会归档，不会物理删除。`))return;
  try{
    await apiFetch(`students?id=eq.${encodeURIComponent(studentId)}`,{method:'PATCH',body:JSON.stringify({archived:next})});
    await loadAll();
  }catch(err){alert('更新学生状态失败：'+err.message);}
}
function openStudent(studentId){
  const student=students.find(s=>s.id===studentId);
  if(!student)return;
  try{localStorage.setItem(`js-plan-current-student-v1:${auth.user.id}`,JSON.stringify(student));}catch(e){}
  location.href='./students/index.html';
}
function bindActions(){
  $$('[data-toggle-planner]').forEach(btn=>btn.addEventListener('click',()=>togglePlanner(btn.dataset.togglePlanner)));
  $$('[data-role]').forEach(btn=>btn.addEventListener('click',()=>changeRole(btn.dataset.role,btn.dataset.nextRole)));
  $$('[data-transfer-student]').forEach(btn=>btn.addEventListener('click',()=>transferStudent(btn.dataset.transferStudent,document.querySelector(`[data-transfer-select="${btn.dataset.transferStudent}"]`)?.value)));
  $$('[data-archive-student]').forEach(btn=>btn.addEventListener('click',()=>archiveStudent(btn.dataset.archiveStudent)));
  $$('[data-open-student]').forEach(btn=>btn.addEventListener('click',()=>openStudent(btn.dataset.openStudent)));
}
function bindEvents(){
  $('#refreshBtn').addEventListener('click',loadAll);
  $('#addPlannerBtn').addEventListener('click',addPlanner);
  $('#searchInput').addEventListener('input',e=>{query=e.target.value;render();});
  $('#plannerFilter').addEventListener('change',e=>{plannerFilter=e.target.value;render();});
  $('#archivedFilter').addEventListener('change',e=>{archivedFilter=e.target.value;render();});
  $('#clearBtn').addEventListener('click',()=>{query='';plannerFilter='';archivedFilter='active';$('#searchInput').value='';$('#plannerFilter').value='';$('#archivedFilter').value='active';render();});
}
async function init(){
  bindEvents();
  loadAuth();
  try{await loadAll();}catch(err){setNotice(err.message,'error');$('#plannerList').innerHTML='<div class="empty">无法读取后台。</div>';$('#studentList').innerHTML='<div class="empty">无法读取学生。</div>';}
}
init();
})();
