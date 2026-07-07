(function(){
'use strict';

const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const CRM_FILE_BUCKET='crm-files';

const SERVICE_STATUSES=['待建档','待补资料','待分配','已分配','初筛中','方案制作中','待复核','待沟通','待修改','待确认','已交付','已填报','待录取','已归档','已终止'];
const SERVICE_TYPES=['普通批志愿填报','综合评价','强基计划','提前批','军校公安司法航海','专项计划','全年规划','高一高二规划','中外合作专项','港澳升学','其他'];
const TASK_TEMPLATES=['收集成绩与位次','收集体检表','收集选科信息','收集家长诉求','收集学生诉求','确认是否接受调剂','确认中外合作预算','完成院校初筛','完成专业组初筛','完成普通批初版方案','完成综评方案整理','完成强基入围分析','完成提前批风险核对','完成方案复核','完成家长沟通会议','完成会议纪要','完成方案修改','上传最终版方案','确认最终版方案','回收录取结果','完成案例复盘'];
const COMM_TEMPLATE='一、学生基本情况\n\n二、本次沟通重点\n\n三、家长主要诉求\n\n四、学生主要诉求\n\n五、当前方案方向\n\n六、已提示风险\n\n七、待补充资料\n\n八、下一步安排\n';
const RISK_TYPES=['规则风险','体检风险','分数风险','位次风险','专业风险','调剂风险','大类分流风险','家庭决策风险','时间风险','交付风险','合规风险','数据待核对','其他'];
const SUBJECT_CHOICE_OPTIONS=['化学','生物','政治','地理'];
const OPTIONAL_STUDENT_COLUMNS=new Set([
  'planner_id','student_no','city','high_school','grade','candidate_type','first_subject','subject_choices','second_subjects','class_type',
  'gaokao_score','gaokao_rank','estimated_score','estimated_rank','chinese_score','math_score','english_score','physics_score','history_score',
  'chemistry_score','biology_score','politics_score','geography_score','mock_scores','color_blind','color_weak',
  'monocular_color_recognition_issue','vision_left','vision_right','corrected_vision','height_cm','weight_kg','physical_limit_codes',
  'medical_remark','region_preference','school_level_preference','major_preference','major_graylist','major_blacklist','accept_adjustment',
  'accept_sino_foreign','annual_budget','out_of_province_willingness','postgraduate_intention','employment_preference',
  'comprehensive_eval_status','strong_base_status','early_batch_interest','university_special_plan','local_special_plan',
  'rural_special_qualification','art_sports_status','parent_demand','student_demand','decision_maker','family_resources',
  'conflict_points','risk_tolerance','consultant_remark','supervisor_remark','crm_external_id'
]);

const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dateOnly=value=>value?String(value).slice(0,10):'';
const shortDate=value=>value?String(value).slice(0,16).replace('T',' '):'';
const num=value=>Number(value||0)||0;
const uniq=arr=>Array.from(new Set((arr||[]).filter(Boolean)));

let auth={accessToken:'',refreshToken:'',user:null,expiresAt:0};
let profile=null;
let view='dashboard';
let query='';
let statusFilter='';
let ownerFilter='';
let riskFilter='';
let selectedStudentId='';
let selectedCaseId='';
let data={
  profiles:[],
  customers:[],
  orders:[],
  students:[],
  cases:[],
  assignments:[],
  tasks:[],
  communications:[],
  risks:[],
  plans:[],
  files:[],
  audits:[]
};

function storageJSON(key,fallback){
  try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}
}

function loadAuth(){
  const saved=storageJSON(AUTH_STORAGE_KEY,{});
  if(saved?.accessToken&&saved?.user){
    auth={
      accessToken:saved.accessToken,
      refreshToken:saved.refreshToken||'',
      user:saved.user,
      expiresAt:saved.expiresAt||0
    };
  }
}

function saveAuth(){
  try{localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(auth));}catch(e){}
}

function authHeaders(extra={}){
  return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json',...extra};
}

async function refreshSessionIfNeeded(){
  if(!auth.refreshToken)return;
  const now=Math.floor(Date.now()/1000);
  if(auth.expiresAt&&auth.expiresAt-now>90)return;
  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',
    headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:auth.refreshToken})
  });
  if(!res.ok)return;
  const json=await res.json();
  auth.accessToken=json.access_token;
  auth.refreshToken=json.refresh_token||auth.refreshToken;
  auth.user=json.user||auth.user;
  auth.expiresAt=json.expires_at||0;
  saveAuth();
}

async function apiFetch(path,options={}){
  if(!auth.accessToken)throw new Error('请先登录。可以在本科/专科系统登录后再进入 CRM。');
  await refreshSessionIfNeeded();
  const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:authHeaders(options.headers||{})});
  if(!res.ok)throw new Error(await res.text());
  if(res.status===204)return null;
  const text=await res.text();
  return text?JSON.parse(text):null;
}

function missingColumnFromError(err){
  const msg=String(err?.message||err);
  const quoted=msg.match(/['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s+column/i);
  if(quoted)return quoted[1];
  const column=msg.match(/column\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?\s+(?:of|does not exist)/i);
  if(column)return column[1];
  return '';
}

function shouldRetryWithoutStudentColumn(err,column){
  const msg=String(err?.message||err);
  return Boolean(column&&OPTIONAL_STUDENT_COLUMNS.has(column)&&/(schema cache|column|does not exist|PGRST204|42703)/i.test(msg));
}

async function writeStudentRecord(path,method,payload){
  const body={...payload};
  const removed=[];
  for(let i=0;i<OPTIONAL_STUDENT_COLUMNS.size+1;i+=1){
    try{
      const rows=await apiFetch(path,{method,headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
      if(removed.length&&rows?.[0])rows[0].__removed_columns=removed;
      return rows;
    }catch(err){
      const column=missingColumnFromError(err);
      if(!shouldRetryWithoutStudentColumn(err,column)||!(column in body))throw err;
      delete body[column];
      removed.push(column);
    }
  }
  return apiFetch(path,{method,headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
}

async function storageUpload(path,file){
  await refreshSessionIfNeeded();
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${CRM_FILE_BUCKET}/${encoded}`,{
    method:'POST',
    headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},
    body:file
  });
  if(!res.ok)throw new Error(await res.text());
  return path;
}

async function signedUrl(path){
  if(!path)return '';
  await refreshSessionIfNeeded();
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${CRM_FILE_BUCKET}/${encoded}`,{
    method:'POST',
    headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({expiresIn:3600})
  });
  if(!res.ok)throw new Error(await res.text());
  const json=await res.json();
  return /^https?:\/\//.test(json.signedURL)?json.signedURL:`${SUPABASE_URL}/storage/v1${json.signedURL}`;
}

function setNotice(text,type='info'){
  const el=$('#notice');
  el.textContent=text;
  el.className='notice';
  if(type==='error'){
    el.style.borderColor='#fecaca';
    el.style.background='#fef2f2';
    el.style.color='#991b1b';
  }else if(type==='success'){
    el.style.borderColor='#bbf7d0';
    el.style.background='#f0fdf4';
    el.style.color='#14532d';
  }else{
    el.style.borderColor='#fed7aa';
    el.style.background='#fff7ed';
    el.style.color='#7c2d12';
  }
}

function friendlyError(err){
  const raw=String(err?.message||err||'');
  try{const obj=JSON.parse(raw);return obj.message||obj.hint||raw;}catch(e){return raw;}
}

function personName(id){
  if(!id)return '未分配';
  const p=data.profiles.find(x=>x.id===id);
  return p?.display_name||p?.email||id.slice(0,8);
}

function roleText(role){
  return ({admin:'管理员',manager:'主管',sales:'销售',planner:'规划师',consultant:'咨询师',assistant:'助理',reviewer:'复核人',finance:'财务',observer:'观察员',viewer:'只读'}[role]||role||'未授权');
}

function roleBadge(role){
  const color=role==='admin'||role==='manager'?'green':role==='sales'?'blue':role==='planner'||role==='consultant'?'purple':'';
  return `<span class="badge ${color}">${esc(roleText(role))}</span>`;
}

function statusBadge(status){
  const color=status==='已归档'||status==='已交付'||status==='已填报'?'green':status==='已终止'?'red':status==='待复核'||status==='待沟通'||status==='待修改'?'orange':status==='待分配'||status==='待建档'?'yellow':'blue';
  return `<span class="badge ${color}">${esc(status||'待定')}</span>`;
}

function riskBadge(level){
  const color=level==='严重'?'red':level==='高'?'orange':level==='中'?'yellow':'';
  return `<span class="badge ${color}">${esc(level||'低')}风险</span>`;
}

function paymentBadge(status){
  const color=status==='已全款'?'green':status==='已退款'||status==='坏账/异常'?'red':status==='已付定金'||status==='已部分付款'?'yellow':'';
  return `<span class="badge ${color}">${esc(status||'未付款')}</span>`;
}

function serviceTypesText(types){
  return Array.isArray(types)?types.join('、'):String(types||'');
}

function studentNo(s){
  return s?.student_no?`HSY${s.student_no}`:'待编号';
}

function studentDisplay(s){
  if(!s)return '未知学生';
  return `${s.name||'未命名'} ${studentNo(s)}`;
}

function customerById(id){return data.customers.find(x=>x.id===id)||null;}
function studentById(id){return data.students.find(x=>x.id===id)||null;}
function orderById(id){return data.orders.find(x=>x.id===id)||null;}
function caseById(id){return data.cases.find(x=>x.id===id)||null;}
function latestAssignment(caseId){return data.assignments.filter(a=>a.service_case_id===caseId).sort((a,b)=>String(b.assigned_at).localeCompare(String(a.assigned_at)))[0]||null;}
function caseTasks(caseId){return data.tasks.filter(t=>t.service_case_id===caseId);}
function studentRisks(studentId){return data.risks.filter(r=>r.student_id===studentId&&r.risk_status!=='已关闭');}
function isOverdue(task){return task.due_at&&new Date(task.due_at)<new Date()&&!['已完成','已取消'].includes(task.task_status);}

function firstFilled(...values){
  return values.find(value=>value!==null&&value!==undefined&&value!=='')??null;
}

function splitVolunteerList(value){
  if(Array.isArray(value))return value;
  return String(value||'').split(/[，,、\s/+]+/);
}

function normalizeVolunteerSubjectChoices(...values){
  const alias={化:'化学',化学:'化学',生:'生物',生物:'生物',政:'政治',政治:'政治',思想政治:'政治',地:'地理',地理:'地理'};
  const out=[];
  const add=value=>{if(value&&!out.includes(value))out.push(value);};
  values.flatMap(splitVolunteerList).forEach(value=>{
    const text=String(value||'').trim();
    if(!text)return;
    const normalized=alias[text];
    if(normalized){add(normalized);return;}
    SUBJECT_CHOICE_OPTIONS.forEach(option=>{
      const short=option.slice(0,1);
      if(text.includes(option)||text.includes(short))add(option);
    });
  });
  return out;
}

function subjectChoicesFieldHTML(scope,selected){
  const chosen=new Set(normalizeVolunteerSubjectChoices(selected));
  return `<div class="choice-field"><span>再选科目</span><div class="choice-pills">${SUBJECT_CHOICE_OPTIONS.map(option=>`
    <label><input type="checkbox" data-subject-choice="${esc(scope)}" value="${esc(option)}" ${chosen.has(option)?'checked':''}><span>${esc(option)}</span></label>
  `).join('')}</div><small>最多选择 2 门。直接点击按钮，避免手输导致无法识别。</small></div>`;
}

function subjectChoicesFromField(scope){
  return normalizeVolunteerSubjectChoices($$(`[data-subject-choice="${scope}"]:checked`).map(el=>el.value));
}

function bindSubjectChoiceLimit(scope){
  const boxes=$$(`[data-subject-choice="${scope}"]`);
  boxes.forEach(box=>{
    box.addEventListener('change',()=>{
      const checked=boxes.filter(el=>el.checked);
      if(checked.length>2){
        box.checked=false;
        alert('再选科目最多选择 2 门。');
      }
    });
  });
}

function normalizeVolunteerSubjectType(student){
  const raw=String(firstFilled(student?.subject_type,student?.first_subject,student?.class_type,'')||'').trim();
  if(/history|历史|文科|史/i.test(raw))return 'history';
  return 'physics';
}

function normalizeVolunteerMedicalCodes(...values){
  const out=[];
  values.flatMap(splitVolunteerList).forEach(value=>{
    String(value||'').match(/\d+/g)?.forEach(code=>{if(!out.includes(code))out.push(code);});
  });
  return out;
}

function toVolunteerNumber(...values){
  const value=firstFilled(...values);
  if(value===null)return null;
  const n=Number(String(value).replace(/[^\d.-]/g,''));
  return Number.isFinite(n)?n:null;
}

function completeness(student){
  const required=[
    student?.name,
    student?.province,
    student?.first_subject||student?.subject_type,
    (student?.second_subjects?.length||student?.subject_choices?.length),
    student?.gaokao_score||student?.estimated_score||student?.score,
    student?.gaokao_rank||student?.estimated_rank||student?.rank,
    (student?.physical_limit_codes?.length||student?.medical_codes?.length||student?.medical_remark),
    student?.region_preference||student?.target_cities?.length,
    student?.major_preference||student?.target_majors?.length,
    student?.accept_adjustment,
    student?.accept_sino_foreign
  ];
  const done=required.filter(Boolean).length;
  return Math.round(done/required.length*100);
}

function filteredCases(){
  const q=query.trim().toLowerCase();
  return data.cases.filter(c=>{
    const s=studentById(c.student_id);
    const o=orderById(c.order_id);
    const customer=customerById(o?.customer_id);
    const ass=latestAssignment(c.id);
    if(statusFilter&&c.service_status!==statusFilter)return false;
    if(riskFilter&&c.risk_level!==riskFilter)return false;
    if(ownerFilter&&![ass?.main_consultant_id,ass?.assistant_id,ass?.reviewer_id,ass?.sales_owner_id,s?.planner_id,s?.owner_id].includes(ownerFilter))return false;
    if(q){
      const hay=[s?.name,s?.student_no,s?.phone,s?.high_school,customer?.name,customer?.mobile,customer?.wechat,o?.order_no,personName(ass?.main_consultant_id),c.service_type].join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
}

function filteredOrders(){
  const q=query.trim().toLowerCase();
  return data.orders.filter(o=>{
    const s=studentById(o.student_id);
    const customer=customerById(o.customer_id);
    if(ownerFilter&&![o.sales_owner_id,s?.planner_id,s?.owner_id].includes(ownerFilter))return false;
    if(q){
      const hay=[o.order_no,customer?.name,customer?.mobile,customer?.wechat,s?.name,s?.student_no,serviceTypesText(o.service_type),personName(o.sales_owner_id)].join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
}

function filteredStudents(){
  const q=query.trim().toLowerCase();
  return data.students.filter(s=>{
    const cases=data.cases.filter(c=>c.student_id===s.id);
    const ass=cases.map(c=>latestAssignment(c.id)).find(Boolean);
    if(ownerFilter&&![s.planner_id,s.owner_id,ass?.main_consultant_id,ass?.assistant_id,ass?.reviewer_id,ass?.sales_owner_id].includes(ownerFilter))return false;
    if(riskFilter&&studentRisks(s.id).every(r=>r.risk_level!==riskFilter))return false;
    if(q){
      const hay=[s.name,s.student_no,s.phone,s.high_school,s.province,s.city,personName(s.planner_id),s.major_preference,s.region_preference].join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
}

function stats(){
  const today=new Date().toISOString().slice(0,10);
  const month=today.slice(0,7);
  const activeCases=data.cases.filter(c=>!['已归档','已终止'].includes(c.service_status));
  const overdueTasks=data.tasks.filter(isOverdue);
  const highRisk=data.risks.filter(r=>['高','严重'].includes(r.risk_level)&&!['已关闭','已规避'].includes(r.risk_status));
  return {
    todayOrders:data.orders.filter(o=>dateOnly(o.created_at)===today).length,
    monthOrders:data.orders.filter(o=>dateOnly(o.created_at).slice(0,7)===month).length,
    pendingOrders:data.orders.filter(o=>['待确认','待建档','待分配'].includes(o.order_status)||o.payment_status!=='已全款').length,
    pendingArchive:data.orders.filter(o=>o.order_status==='待建档'||!o.student_id).length,
    pendingAssign:data.cases.filter(c=>['待分配','待建档'].includes(c.service_status)||!latestAssignment(c.id)?.main_consultant_id).length,
    activeStudents:uniq(activeCases.map(c=>c.student_id)).length,
    overdueTasks:overdueTasks.length,
    highRiskStudents:uniq(highRisk.map(r=>r.student_id)).length,
    pendingReview:data.plans.filter(p=>p.review_status==='待复核').length,
    pendingDelivery:data.cases.filter(c=>['待确认','待交付','待沟通','待修改'].includes(c.service_status)).length
  };
}

async function loadAll(){
  if(!auth.user)throw new Error('请先登录。');
  setNotice('正在读取 CRM 数据...');
  const [profileRows,profiles,customers,orders,students,cases,assignments,tasks,communications,risks,plans,files,audits]=await Promise.all([
    apiFetch(`profiles?select=*&id=eq.${encodeURIComponent(auth.user.id)}&limit=1`),
    apiFetch('profiles?select=id,email,display_name,role,status&order=created_at.desc'),
    apiFetch('crm_customers?select=*&order=updated_at.desc'),
    apiFetch('crm_orders?select=*&order=updated_at.desc'),
    apiFetch('students?select=*&archived=eq.false&order=updated_at.desc'),
    apiFetch('crm_service_cases?select=*&order=updated_at.desc'),
    apiFetch('crm_assignments?select=*&order=assigned_at.desc'),
    apiFetch('crm_tasks?select=*&order=due_at.asc.nullslast,updated_at.desc'),
    apiFetch('crm_communications?select=*&order=communication_time.desc'),
    apiFetch('crm_risk_items?select=*&order=updated_at.desc'),
    apiFetch('crm_plan_versions?select=*&order=updated_at.desc'),
    apiFetch('crm_file_attachments?select=*&order=uploaded_at.desc'),
    apiFetch('crm_audit_logs?select=*&order=created_at.desc&limit=150').catch(()=>[])
  ]);
  profile=profileRows?.[0]||null;
  if(!profile||profile.status!=='active')throw new Error('当前账号没有 active CRM 权限。请先注册登录，并在管理员后台设置角色。');
  data={profiles:profiles||[],customers:customers||[],orders:orders||[],students:students||[],cases:cases||[],assignments:assignments||[],tasks:tasks||[],communications:communications||[],risks:risks||[],plans:plans||[],files:files||[],audits:audits||[]};
  setNotice(`当前用户：${profile.display_name||profile.email||auth.user.email}｜${roleText(profile.role)}。CRM 已载入 ${data.orders.length} 个订单、${data.cases.length} 个服务案例。`);
  renderFilters();
  render();
}

function renderFilters(){
  $('#statusFilter').innerHTML='<option value="">全部服务状态</option>'+SERVICE_STATUSES.map(s=>`<option ${s===statusFilter?'selected':''}>${esc(s)}</option>`).join('');
  const staff=data.profiles.filter(p=>p.status==='active');
  $('#ownerFilter').innerHTML='<option value="">全部负责人</option>'+staff.map(p=>`<option value="${esc(p.id)}" ${p.id===ownerFilter?'selected':''}>${esc(p.display_name||p.email||p.id)}｜${esc(roleText(p.role))}</option>`).join('');
  $('#riskFilter').value=riskFilter;
}

function setTitle(title,sub){
  $('#pageTitle').textContent=title;
  $('#pageSub').textContent=sub;
}

function render(){
  $$('#nav button').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view));
  if(view==='dashboard')renderDashboard();
  if(view==='orders')renderOrders();
  if(view==='students')renderStudents();
  if(view==='board')renderBoard();
  if(view==='tasks')renderTasks();
  if(view==='risks')renderRisks();
  if(view==='plans')renderPlans();
  if(view==='audit')renderAudit();
  bindDynamic();
}

function renderDashboard(){
  setTitle('首页仪表盘','收单、建档、分配、任务、风险和交付状态总览。');
  const s=stats();
  const workload=data.profiles.filter(p=>['planner','consultant','manager','assistant','reviewer'].includes(p.role)).map(p=>({
    profile:p,
    count:data.assignments.filter(a=>a.main_consultant_id===p.id||a.assistant_id===p.id||a.reviewer_id===p.id).length
  })).sort((a,b)=>b.count-a.count).slice(0,8);
  const overdue=data.tasks.filter(isOverdue).slice(0,8);
  const risks=data.risks.filter(r=>['高','严重'].includes(r.risk_level)&&!['已关闭','已规避'].includes(r.risk_status)).slice(0,8);
  $('#view').innerHTML=`
    <section class="grid kpi-grid">
      ${kpi('今日新增订单',s.todayOrders)}
      ${kpi('本月新增订单',s.monthOrders)}
      ${kpi('待确认/待付款',s.pendingOrders,'orange')}
      ${kpi('待分配学生',s.pendingAssign,'orange')}
      ${kpi('服务中学生',s.activeStudents)}
      ${kpi('超时任务',s.overdueTasks,'red')}
      ${kpi('高风险学生',s.highRiskStudents,'red')}
      ${kpi('待复核方案',s.pendingReview,'orange')}
      ${kpi('待交付方案',s.pendingDelivery,'orange')}
      ${kpi('客户总数',data.customers.length)}
      ${kpi('方案版本',data.plans.length)}
      ${kpi('沟通记录',data.communications.length)}
    </section>
    <section class="grid" style="grid-template-columns:1.1fr .9fr">
      <div class="panel"><div class="panel-head"><h2>服务进度</h2><button class="btn" data-switch="board">进入看板</button></div><div class="panel-body">${statusSummaryHTML()}</div></div>
      <div class="panel"><div class="panel-head"><h2>老师负荷排行</h2><button class="btn" data-switch="board">分配服务</button></div><div class="panel-body">${workload.length?`<table><tbody>${workload.map(w=>`<tr><td>${esc(w.profile.display_name||w.profile.email)} ${roleBadge(w.profile.role)}</td><td><b>${w.count}</b> 个角色任务</td></tr>`).join('')}</tbody></table>`:'<div class="empty">暂无老师负荷数据。</div>'}</div></div>
    </section>
    <section class="grid" style="grid-template-columns:1fr 1fr">
      <div class="panel"><div class="panel-head"><h2>超时任务</h2><button class="btn" data-switch="tasks">查看全部</button></div><div class="panel-body">${recordList(overdue,t=>taskRecordHTML(t))}</div></div>
      <div class="panel"><div class="panel-head"><h2>高风险事项</h2><button class="btn" data-switch="risks">查看全部</button></div><div class="panel-body">${recordList(risks,r=>riskRecordHTML(r))}</div></div>
    </section>`;
}

function kpi(label,value,color=''){
  return `<div class="kpi ${color}"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
}

function statusSummaryHTML(){
  const counts=SERVICE_STATUSES.map(st=>({st,count:data.cases.filter(c=>c.service_status===st).length})).filter(x=>x.count);
  return counts.length?`<table><tbody>${counts.map(x=>`<tr><td>${statusBadge(x.st)}</td><td><b>${x.count}</b> 个服务案例</td></tr>`).join('')}</tbody></table>`:'<div class="empty">暂无服务案例。</div>';
}

function renderOrders(){
  setTitle('客户与订单','销售收单、付款确认、订单建档和服务案例创建。');
  const orders=filteredOrders();
  $('#view').innerHTML=`
    <div class="panel"><div class="panel-head"><h2>订单列表</h2><button class="btn primary" data-open-quick-order>新建客户/订单</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>订单</th><th>客户</th><th>学生</th><th>服务</th><th>金额</th><th>付款/订单</th><th>收单人</th><th>截止</th><th>操作</th></tr></thead>
        <tbody>${orders.map(orderRowHTML).join('')||'<tr><td colspan="9"><div class="empty">没有匹配订单。</div></td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="panel"><div class="panel-head"><h2>客户列表</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>客户</th><th>联系方式</th><th>来源</th><th>销售归属</th><th>关联订单</th><th>备注</th></tr></thead>
        <tbody>${data.customers.map(customerRowHTML).join('')||'<tr><td colspan="6"><div class="empty">暂无客户。</div></td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function orderRowHTML(o){
  const c=customerById(o.customer_id);
  const s=studentById(o.student_id);
  return `<tr>
    <td><button class="link-btn" data-order-detail="${esc(o.id)}">${esc(o.order_no||'未编号')}</button><br><span class="badge">${esc(dateOnly(o.order_date||o.created_at))}</span></td>
    <td>${esc(c?.name||'未关联')}<br><span class="badge">${esc(c?.relation_to_student||'家长')}</span></td>
    <td>${s?`<button class="link-btn" data-student-detail="${esc(s.id)}">${esc(studentDisplay(s))}</button>`:'<span class="badge orange">待建档</span>'}</td>
    <td>${esc(serviceTypesText(o.service_type)||'未填写')}</td>
    <td>${num(o.amount_paid)} / ${num(o.amount_total)}</td>
    <td>${paymentBadge(o.payment_status)} ${statusBadge(o.order_status)}</td>
    <td>${esc(personName(o.sales_owner_id))}</td>
    <td>${esc(dateOnly(o.service_deadline)||'未定')}</td>
    <td><button class="btn" data-order-detail="${esc(o.id)}">详情</button> <button class="btn" data-case-from-order="${esc(o.id)}">建案例</button></td>
  </tr>`;
}

function customerRowHTML(c){
  const orders=data.orders.filter(o=>o.customer_id===c.id);
  return `<tr><td><b>${esc(c.name)}</b><br>${esc(c.relation_to_student||'')}</td><td>${esc(c.mobile||'')}<br>${esc(c.wechat||'')}</td><td>${esc(c.source||'')}</td><td>${esc(personName(c.sales_owner_id))}</td><td>${orders.length}</td><td>${esc(c.remark||'')}</td></tr>`;
}

function renderStudents(){
  setTitle('学生档案','围绕学生展示资料完整度、订单、服务案例、任务、沟通、风险和方案。');
  const list=filteredStudents();
  $('#view').innerHTML=`
    <div class="panel"><div class="panel-head"><h2>学生列表</h2><button class="btn primary" data-open-student-form>新建学生</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>学生</th><th>省份科类</th><th>成绩位次</th><th>完整度</th><th>负责老师</th><th>服务案例</th><th>风险</th><th>操作</th></tr></thead>
        <tbody>${list.map(studentRowHTML).join('')||'<tr><td colspan="8"><div class="empty">没有匹配学生。</div></td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function studentRowHTML(s){
  const cases=data.cases.filter(c=>c.student_id===s.id);
  const ass=cases.map(c=>latestAssignment(c.id)).find(Boolean);
  const pct=completeness(s);
  const risks=studentRisks(s.id);
  return `<tr>
    <td><button class="link-btn" data-student-detail="${esc(s.id)}">${esc(s.name)}</button><br><span class="badge">${esc(studentNo(s))}</span></td>
    <td>${esc(s.province||'江苏')} ${esc(s.class_type||s.subject_type||'')}</td>
    <td>${esc(s.gaokao_score||s.score||s.estimated_score||'—')} / ${esc(s.gaokao_rank||s.rank||s.estimated_rank||'—')}</td>
    <td><div class="complete"><i style="width:${pct}%"></i></div><span class="badge ${pct>=80?'green':pct>=55?'yellow':'orange'}">${pct}%</span></td>
    <td>${esc(personName(ass?.main_consultant_id||s.planner_id))}</td>
    <td>${cases.map(c=>statusBadge(c.service_status)).join(' ')||'<span class="badge orange">未建案例</span>'}</td>
    <td>${risks.slice(0,2).map(r=>riskBadge(r.risk_level)).join(' ')||riskBadge('低')}</td>
    <td><button class="btn" data-student-detail="${esc(s.id)}">详情</button> <button class="btn" data-open-volunteer="${esc(s.id)}">去填报</button></td>
  </tr>`;
}

function renderBoard(){
  setTitle('服务看板','按服务状态展示学生服务案例，支持分配、推进、退回和进入详情。');
  const cases=filteredCases();
  const lanes=SERVICE_STATUSES.filter(st=>st!=='已归档'||cases.some(c=>c.service_status===st));
  $('#view').innerHTML=`<div class="board">${lanes.map(st=>laneHTML(st,cases.filter(c=>c.service_status===st))).join('')}</div>`;
}

function laneHTML(status,cases){
  return `<section class="lane"><div class="lane-head"><span>${esc(status)}</span><span class="badge">${cases.length}</span></div><div class="cards">${cases.map(caseCardHTML).join('')||'<div class="empty">暂无</div>'}</div></section>`;
}

function caseCardHTML(c){
  const s=studentById(c.student_id);
  const ass=latestAssignment(c.id);
  const tasks=caseTasks(c.id);
  const nextTask=tasks.find(t=>!['已完成','已取消'].includes(t.task_status));
  const high=studentRisks(c.student_id).some(r=>r.risk_level==='高');
  const severe=studentRisks(c.student_id).some(r=>r.risk_level==='严重');
  return `<article class="case-card ${severe?'severe':high?'high':''}">
    <h3>${esc(s?.name||'未知学生')} ${riskBadge(c.risk_level)}</h3>
    <p>${esc(s?.province||'江苏')} ${esc(s?.class_type||s?.subject_type||'')}｜${esc(s?.gaokao_score||s?.score||'—')} / ${esc(s?.gaokao_rank||s?.rank||'—')}<br>${esc(c.service_type)}｜主规划师：${esc(personName(ass?.main_consultant_id||s?.planner_id))}<br>截止：${esc(dateOnly(c.deadline)||'未定')}｜当前任务：${esc(nextTask?.title||'无')}</p>
    <div class="case-actions">
      <button class="btn" data-case-detail="${esc(c.id)}">详情</button>
      <button class="btn" data-assign-case="${esc(c.id)}">分配</button>
      <button class="btn" data-move-case="${esc(c.id)}" data-dir="-1">退回</button>
      <button class="btn primary" data-move-case="${esc(c.id)}" data-dir="1">推进</button>
    </div>
  </article>`;
}

function renderTasks(){
  setTitle('任务中心','每个学生服务过程拆解为任务，超时任务会标红。');
  const q=query.trim().toLowerCase();
  const tasks=data.tasks.filter(t=>{
    const s=studentById(t.student_id);
    if(ownerFilter&&![t.owner_id,t.created_by].includes(ownerFilter))return false;
    if(q&&!([t.title,t.description,s?.name,s?.student_no,personName(t.owner_id)].join(' ').toLowerCase().includes(q)))return false;
    return true;
  });
  $('#view').innerHTML=`<div class="panel"><div class="panel-head"><h2>任务列表</h2><button class="btn primary" data-open-task-form>新增任务</button></div><div class="table-wrap"><table>
    <thead><tr><th>任务</th><th>学生</th><th>负责人</th><th>优先级</th><th>状态</th><th>截止</th><th>操作</th></tr></thead>
    <tbody>${tasks.map(taskRowHTML).join('')||'<tr><td colspan="7"><div class="empty">暂无任务。</div></td></tr>'}</tbody></table></div></div>`;
}

function taskRowHTML(t){
  const overdue=isOverdue(t);
  return `<tr><td><b>${esc(t.title)}</b><br><span class="badge ${overdue?'red':''}">${esc(t.description||'')}</span></td><td>${esc(studentDisplay(studentById(t.student_id)))}</td><td>${esc(personName(t.owner_id))}</td><td>${esc(t.priority)}</td><td>${statusBadge(t.task_status)}</td><td>${esc(shortDate(t.due_at)||'未定')}</td><td>${t.task_status==='已完成'?'<span class="badge green">已完成</span>':`<button class="btn primary" data-complete-task="${esc(t.id)}">完成</button>`}</td></tr>`;
}

function renderRisks(){
  setTitle('风险中心','结构化记录规则、体检、分数、调剂、交付等风险，并留存家长确认。');
  const risks=data.risks.filter(r=>{
    if(riskFilter&&r.risk_level!==riskFilter)return false;
    const s=studentById(r.student_id);
    const q=query.trim().toLowerCase();
    return !q||[r.title,r.risk_type,r.evidence_detail,r.suggestion,s?.name,s?.student_no].join(' ').toLowerCase().includes(q);
  });
  $('#view').innerHTML=`<div class="panel"><div class="panel-head"><h2>风险列表</h2><button class="btn primary" data-open-risk-form>添加风险</button></div><div class="table-wrap"><table>
    <thead><tr><th>风险</th><th>学生</th><th>类型/等级</th><th>依据</th><th>家长提醒</th><th>状态</th><th>操作</th></tr></thead>
    <tbody>${risks.map(riskRowHTML).join('')||'<tr><td colspan="7"><div class="empty">暂无风险。</div></td></tr>'}</tbody></table></div></div>`;
}

function riskRowHTML(r){
  return `<tr><td><b>${esc(r.title)}</b><br>${esc(r.related_school||'')} ${esc(r.related_major_group||'')}</td><td>${esc(studentDisplay(studentById(r.student_id)))}</td><td><span class="badge">${esc(r.risk_type)}</span> ${riskBadge(r.risk_level)}</td><td>${esc(r.evidence_source||'待核对')}<br><span class="badge">${esc(r.evidence_detail||'')}</span></td><td>${r.notice_to_parent?'<span class="badge green">已提醒</span>':'<span class="badge orange">未提醒</span>'}</td><td>${statusBadge(r.risk_status)}</td><td><button class="btn" data-risk-notice="${esc(r.id)}">已提醒</button> <button class="btn primary" data-risk-close="${esc(r.id)}">关闭</button></td></tr>`;
}

function renderPlans(){
  setTitle('方案与附件','方案版本、复核状态、最终版锁定和附件资料统一管理。');
  $('#view').innerHTML=`<section class="grid" style="grid-template-columns:1fr 1fr">
    <div class="panel"><div class="panel-head"><h2>方案版本</h2><button class="btn primary" data-open-plan-form>上传方案</button></div><div class="table-wrap"><table>
      <thead><tr><th>方案</th><th>学生</th><th>类型</th><th>复核/确认</th><th>锁定</th><th>操作</th></tr></thead>
      <tbody>${data.plans.map(planRowHTML).join('')||'<tr><td colspan="6"><div class="empty">暂无方案版本。</div></td></tr>'}</tbody></table></div></div>
    <div class="panel"><div class="panel-head"><h2>附件资料</h2><button class="btn primary" data-open-file-form>上传附件</button></div><div class="table-wrap"><table>
      <thead><tr><th>文件</th><th>学生</th><th>类型</th><th>上传人</th><th>操作</th></tr></thead>
      <tbody>${data.files.map(fileRowHTML).join('')||'<tr><td colspan="5"><div class="empty">暂无附件。</div></td></tr>'}</tbody></table></div></div>
    </section>`;
}

function planRowHTML(p){
  return `<tr><td><b>${esc(p.plan_name)}</b><br><span class="badge">${esc(p.version_no)}</span></td><td>${esc(studentDisplay(studentById(p.student_id)))}</td><td>${esc(p.plan_type)}</td><td>${statusBadge(p.review_status)} ${statusBadge(p.parent_confirm_status)}</td><td>${p.is_locked?'<span class="badge green">已锁定</span>':'<span class="badge orange">未锁定</span>'}</td><td>${p.is_locked?'':`<button class="btn primary" data-lock-plan="${esc(p.id)}">锁定</button>`}</td></tr>`;
}

function fileRowHTML(f){
  return `<tr><td><b>${esc(f.file_name)}</b><br>${esc(f.remark||'')}</td><td>${esc(studentDisplay(studentById(f.student_id)))}</td><td>${esc(f.file_type)}</td><td>${esc(personName(f.uploaded_by))}</td><td><button class="btn" data-download-file="${esc(f.id)}">下载</button></td></tr>`;
}

function renderAudit(){
  setTitle('操作日志','管理员和主管可查看关键动作留痕。');
  $('#view').innerHTML=`<div class="panel"><div class="panel-head"><h2>最近操作</h2></div><div class="table-wrap"><table>
    <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>内容</th></tr></thead>
    <tbody>${data.audits.map(a=>`<tr><td>${esc(shortDate(a.created_at))}</td><td>${esc(personName(a.user_id))}</td><td>${esc(a.action)}</td><td>${esc(a.entity_type)} ${esc(a.entity_id||'')}</td><td><pre style="margin:0;white-space:pre-wrap;font-size:12px">${esc(JSON.stringify(a.after_data||a.before_data||{},null,2))}</pre></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">当前账号无日志读取权限，或暂无日志。</div></td></tr>'}</tbody></table></div></div>`;
}

function recordList(items,renderItem){
  return items.length?`<div class="record-list">${items.map(renderItem).join('')}</div>`:'<div class="empty">暂无。</div>';
}

function taskRecordHTML(t){return `<div class="record"><h4>${esc(t.title)} ${isOverdue(t)?'<span class="badge red">超时</span>':''}</h4><p>${esc(studentDisplay(studentById(t.student_id)))}｜负责人：${esc(personName(t.owner_id))}｜截止：${esc(shortDate(t.due_at)||'未定')}</p></div>`;}
function riskRecordHTML(r){return `<div class="record"><h4>${esc(r.title)} ${riskBadge(r.risk_level)}</h4><p>${esc(studentDisplay(studentById(r.student_id)))}｜${esc(r.risk_type)}｜依据：${esc(r.evidence_source||'待核对')}</p></div>`;}

function openModal(title,body){
  $('#modalTitle').textContent=title;
  $('#modalBody').innerHTML=body;
  $('#modalMask').classList.add('open');
  bindDynamic();
}

function closeModal(){
  $('#modalMask').classList.remove('open');
  $('#modalBody').innerHTML='';
}

function studentOptions(selected=''){
  return '<option value="">选择学生</option>'+data.students.map(s=>`<option value="${esc(s.id)}" ${s.id===selected?'selected':''}>${esc(studentDisplay(s))}</option>`).join('');
}

function caseOptions(selected=''){
  return '<option value="">选择服务案例</option>'+data.cases.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(studentDisplay(studentById(c.student_id)))}｜${esc(c.service_type)}｜${esc(c.service_status)}</option>`).join('');
}

function casesForStudent(studentId){
  return data.cases.filter(c=>!studentId||c.student_id===studentId);
}

function caseOptionsForUpload(selected='',studentId=''){
  const rows=casesForStudent(studentId);
  if(!rows.length)return '<option value="">暂无服务案例，可先挂到学生档案</option>';
  return '<option value="">不关联服务案例，仅挂到学生档案</option>'+rows.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(studentDisplay(studentById(c.student_id)))}｜${esc(c.service_type)}｜${esc(c.service_status)}</option>`).join('');
}

function profileOptions(selected='',roles=[]){
  const rows=data.profiles.filter(p=>p.status==='active'&&(!roles.length||roles.includes(p.role)||roles.includes('*')));
  return '<option value="">未分配</option>'+rows.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.display_name||p.email)}｜${esc(roleText(p.role))}</option>`).join('');
}

function quickOrderForm(){
  openModal('新建收单 / 客户 / 学生 / 服务案例',`
    <form id="quickOrderForm" class="form-grid">
      <label>家长姓名<input name="customer_name" required placeholder="例如 王女士"></label>
      <label>关系<input name="relation_to_student" placeholder="母亲/父亲"></label>
      <label>手机号<input name="mobile" placeholder="手机号"></label>
      <label>微信<input name="wechat" placeholder="微信号"></label>
      <label>客户来源<select name="source"><option>自然咨询</option><option>朋友圈</option><option>老客户转介绍</option><option>直播</option><option>社群</option><option>线下活动</option><option>渠道合作</option><option>内部推荐</option><option>其他</option></select></label>
      <label>学生姓名<input name="student_name" required placeholder="例如 张子蒙"></label>
      <label>高考省份<input name="province" value="江苏"></label>
      <label>所在城市<input name="city" placeholder="南京"></label>
      <label>科类<select name="subject_type"><option value="physics">物理类</option><option value="history">历史类</option></select></label>
      ${subjectChoicesFieldHTML('quickOrderSubjects',[])}
      <label>分数<input name="score" type="number" min="0" max="750"></label>
      <label>位次<input name="rank" type="number" min="0"></label>
      <label>服务类型<select name="service_type">${SERVICE_TYPES.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>
      <label>应收金额<input name="amount_total" type="number" min="0" step="0.01"></label>
      <label>实收金额<input name="amount_paid" type="number" min="0" step="0.01"></label>
      <label>付款状态<select name="payment_status"><option>未付款</option><option>已付定金</option><option>已部分付款</option><option>已全款</option><option>已退款</option><option>部分退款</option><option>坏账/异常</option></select></label>
      <label>服务截止日期<input name="service_deadline" type="date"></label>
      <label>主规划师<select name="main_consultant_id">${profileOptions('', ['planner','consultant','manager'])}</select></label>
      <label>风险等级<select name="risk_level"><option>低</option><option>中</option><option>高</option><option>严重</option></select></label>
      <label class="wide">订单备注<textarea name="remark" placeholder="服务承诺、家长诉求、特殊情况"></textarea></label>
      <div class="wide modal-actions"><button class="btn" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">创建并进入服务看板</button></div>
    </form>`);
}

async function submitQuickOrder(form){
  const fd=new FormData(form);
  const serviceType=fd.get('service_type');
  const customer=(await apiFetch('crm_customers',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
    name:fd.get('customer_name'),relation_to_student:fd.get('relation_to_student'),mobile:fd.get('mobile'),wechat:fd.get('wechat'),source:fd.get('source'),sales_owner_id:auth.user.id,remark:fd.get('remark')
  })}))[0];
  const subjectChoices=subjectChoicesFromField('quickOrderSubjects');
  const studentPayload={
    owner_id:auth.user.id,
    planner_id:fd.get('main_consultant_id')||auth.user.id,
    name:fd.get('student_name'),
    phone:fd.get('mobile'),
    province:fd.get('province')||'江苏',
    city:fd.get('city'),
    stage:'undergraduate',
    subject_type:fd.get('subject_type'),
    subject_choices:subjectChoices,
    second_subjects:subjectChoices,
    first_subject:fd.get('subject_type')==='history'?'历史':'物理',
    class_type:fd.get('subject_type')==='history'?'历史类':'物理类',
    score:fd.get('score')?Number(fd.get('score')):null,
    rank:fd.get('rank')?Number(fd.get('rank')):null,
    gaokao_score:fd.get('score')?Number(fd.get('score')):null,
    gaokao_rank:fd.get('rank')?Number(fd.get('rank')):null,
    parent_demand:fd.get('remark'),
    service_started_at:new Date().toISOString()
  };
  const student=(await writeStudentRecord('students','POST',studentPayload))[0];
  if(student){
    student.subject_choices=subjectChoices;
    student.second_subjects=subjectChoices;
  }
  const order=(await apiFetch('crm_orders',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
    customer_id:customer.id,student_id:student.id,service_type:[serviceType],amount_total:Number(fd.get('amount_total')||0),amount_paid:Number(fd.get('amount_paid')||0),payment_status:fd.get('payment_status'),order_status:'待分配',contract_status:'未签',source:fd.get('source'),sales_owner_id:auth.user.id,service_deadline:fd.get('service_deadline')||null,remark:fd.get('remark')
  })}))[0];
  const serviceCase=(await apiFetch('crm_service_cases',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
    order_id:order.id,student_id:student.id,service_type:serviceType,service_status:fd.get('main_consultant_id')?'已分配':'待分配',risk_level:fd.get('risk_level'),deadline:fd.get('service_deadline')||null,created_by:auth.user.id
  })}))[0];
  await apiFetch('crm_assignments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
    service_case_id:serviceCase.id,student_id:student.id,main_consultant_id:fd.get('main_consultant_id')||null,sales_owner_id:auth.user.id,assignment_status:fd.get('main_consultant_id')?'已分配':'未分配',remark:'收单时创建'
  })});
  await apiFetch('rpc/crm_create_default_tasks',{method:'POST',body:JSON.stringify({target_case_id:serviceCase.id})}).catch(()=>{});
  await logAudit('创建订单','crm_orders',order.id,null,{order_no:order.order_no,student_id:student.id,service_case_id:serviceCase.id});
  const removed=student.__removed_columns||[];
  const subjectStored=!removed.includes('subject_choices')&&!removed.includes('second_subjects');
  const subjectText=subjectChoices.length?subjectChoices.join('、'):'未选';
  closeModal();
  view='board';
  await loadAll();
  setNotice(`已创建订单${order.order_no?`：${order.order_no}`:''}，学生 ${student.name||fd.get('student_name')} 已建档。${subjectStored?`再选科目：${subjectText}。`:`当前数据库还未接收选科字段，${subjectText} 暂未写入；请执行 supabase/crm_subject_choices_hotfix.sql。`}`,subjectStored?'success':'error');
}

function studentForm(student=null){
  openModal(student?'编辑学生档案':'新建学生档案',`
    <form id="studentForm" class="form-grid" data-id="${esc(student?.id||'')}">
      <label>学生姓名<input name="name" required value="${esc(student?.name||'')}"></label>
      <label>手机号<input name="phone" value="${esc(student?.phone||'')}"></label>
      <label>省份<input name="province" value="${esc(student?.province||'江苏')}"></label>
      <label>城市<input name="city" value="${esc(student?.city||'')}"></label>
      <label>高中<input name="high_school" value="${esc(student?.high_school||'')}"></label>
      <label>科类<select name="subject_type"><option value="physics" ${student?.subject_type==='physics'?'selected':''}>物理类</option><option value="history" ${student?.subject_type==='history'?'selected':''}>历史类</option></select></label>
      ${subjectChoicesFieldHTML('studentFormSubjects',normalizeVolunteerSubjectChoices(student?.second_subjects,student?.subject_choices,student?.subjectChoices))}
      <label>分数<input name="score" type="number" value="${esc(student?.gaokao_score||student?.score||'')}"></label>
      <label>位次<input name="rank" type="number" value="${esc(student?.gaokao_rank||student?.rank||'')}"></label>
      <label>体检代码<input name="medical_codes" value="${esc(normalizeVolunteerMedicalCodes(student?.physical_limit_codes,student?.medical_codes,student?.medicalCodes,student?.medical_remark).join(','))}" placeholder="21,22"></label>
      <label>接受调剂<select name="accept_adjustment"><option value="">待确认</option><option ${student?.accept_adjustment==='是'?'selected':''}>是</option><option ${student?.accept_adjustment==='否'?'selected':''}>否</option><option ${student?.accept_adjustment==='看专业组'?'selected':''}>看专业组</option></select></label>
      <label>接受中外合作<select name="accept_sino_foreign"><option value="">待确认</option><option ${student?.accept_sino_foreign==='是'?'selected':''}>是</option><option ${student?.accept_sino_foreign==='否'?'selected':''}>否</option><option ${student?.accept_sino_foreign==='看项目'?'selected':''}>看项目</option></select></label>
      <label class="wide">地域偏好<textarea name="region_preference">${esc(student?.region_preference||'')}</textarea></label>
      <label class="wide">专业偏好<textarea name="major_preference">${esc(student?.major_preference||'')}</textarea></label>
      <label class="wide">专业黑名单<textarea name="major_blacklist">${esc(student?.major_blacklist||'')}</textarea></label>
      <label class="wide">家长诉求<textarea name="parent_demand">${esc(student?.parent_demand||'')}</textarea></label>
      <div class="wide modal-actions"><button class="btn" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">保存学生</button></div>
    </form>`);
}

async function submitStudentForm(form){
  const id=form.dataset.id;
  const fd=new FormData(form);
  const choices=subjectChoicesFromField('studentFormSubjects');
  const codes=String(fd.get('medical_codes')||'').split(/[、,，\s]+/).filter(Boolean);
  const payload={
    owner_id:auth.user.id,
    planner_id:auth.user.id,
    name:fd.get('name'),
    phone:fd.get('phone'),
    province:fd.get('province')||'江苏',
    city:fd.get('city'),
    high_school:fd.get('high_school'),
    subject_type:fd.get('subject_type'),
    first_subject:fd.get('subject_type')==='history'?'历史':'物理',
    class_type:fd.get('subject_type')==='history'?'历史类':'物理类',
    subject_choices:choices,
    second_subjects:choices,
    score:fd.get('score')?Number(fd.get('score')):null,
    rank:fd.get('rank')?Number(fd.get('rank')):null,
    gaokao_score:fd.get('score')?Number(fd.get('score')):null,
    gaokao_rank:fd.get('rank')?Number(fd.get('rank')):null,
    medical_codes:codes,
    physical_limit_codes:codes,
    accept_adjustment:fd.get('accept_adjustment'),
    accept_sino_foreign:fd.get('accept_sino_foreign'),
    region_preference:fd.get('region_preference'),
    major_preference:fd.get('major_preference'),
    major_blacklist:fd.get('major_blacklist'),
    parent_demand:fd.get('parent_demand')
  };
  const rows=await writeStudentRecord(id?`students?id=eq.${encodeURIComponent(id)}`:'students',id?'PATCH':'POST',payload);
  if(rows?.[0]){
    rows[0].subject_choices=choices;
    rows[0].second_subjects=choices;
  }
  await logAudit(id?'修改学生档案':'创建学生档案','students',rows?.[0]?.id||id,null,payload);
  const removed=rows?.[0]?.__removed_columns||[];
  const subjectStored=!removed.includes('subject_choices')&&!removed.includes('second_subjects');
  const subjectText=choices.length?choices.join('、'):'未选';
  const hiddenRemoved=removed.filter(column=>!['subject_choices','second_subjects'].includes(column));
  const removedText=hiddenRemoved.length?`（其他扩展字段当前库表暂未接收：${hiddenRemoved.join('、')}）`:'';
  const savedName=rows?.[0]?.name||payload.name||'学生';
  closeModal();
  await loadAll();
  setNotice(`已保存学生档案：${savedName}。${subjectStored?`再选科目：${subjectText}。`:`当前数据库还未接收选科字段，${subjectText} 暂未写入；请执行 supabase/crm_subject_choices_hotfix.sql。`}${removedText}`,subjectStored?'success':'error');
}

function assignmentForm(caseId){
  const c=caseById(caseId);
  const ass=latestAssignment(caseId)||{};
  openModal('服务分配',`
    <form id="assignmentForm" class="form-grid" data-case-id="${esc(caseId)}">
      <label>服务案例<input value="${esc(studentDisplay(studentById(c.student_id)))}｜${esc(c.service_type)}" disabled></label>
      <label>主规划师<select name="main_consultant_id">${profileOptions(ass.main_consultant_id||'', ['planner','consultant','manager'])}</select></label>
      <label>助理<select name="assistant_id">${profileOptions(ass.assistant_id||'', ['assistant','planner','consultant','manager'])}</select></label>
      <label>复核人<select name="reviewer_id">${profileOptions(ass.reviewer_id||'', ['reviewer','manager','planner','consultant'])}</select></label>
      <label>销售跟进<select name="sales_owner_id">${profileOptions(ass.sales_owner_id||'', ['sales','manager','admin'])}</select></label>
      <label>分配状态<select name="assignment_status"><option>未分配</option><option ${ass.assignment_status==='已分配'?'selected':''}>已分配</option><option ${ass.assignment_status==='待接单'?'selected':''}>待接单</option><option ${ass.assignment_status==='已接单'?'selected':''}>已接单</option><option ${ass.assignment_status==='已转派'?'selected':''}>已转派</option></select></label>
      <label class="wide">备注<textarea name="remark">${esc(ass.remark||'')}</textarea></label>
      <div class="wide modal-actions"><button class="btn" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">保存分配</button></div>
    </form>`);
}

async function submitAssignment(form){
  const caseId=form.dataset.caseId;
  const c=caseById(caseId);
  const fd=new FormData(form);
  const payload={service_case_id:caseId,student_id:c.student_id,main_consultant_id:fd.get('main_consultant_id')||null,assistant_id:fd.get('assistant_id')||null,reviewer_id:fd.get('reviewer_id')||null,sales_owner_id:fd.get('sales_owner_id')||null,assignment_status:fd.get('assignment_status'),remark:fd.get('remark'),assigned_by:auth.user.id};
  await apiFetch('crm_assignments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  await apiFetch(`crm_service_cases?id=eq.${encodeURIComponent(caseId)}`,{method:'PATCH',body:JSON.stringify({service_status:payload.main_consultant_id?'已分配':'待分配'})});
  if(payload.main_consultant_id)await apiFetch(`students?id=eq.${encodeURIComponent(c.student_id)}`,{method:'PATCH',body:JSON.stringify({planner_id:payload.main_consultant_id})});
  await logAudit('分配老师','crm_assignments',caseId,null,payload);
  closeModal();
  await loadAll();
}

function taskForm(){
  openModal('新增任务',`
    <form id="taskForm" class="form-grid">
      <label>服务案例<select name="service_case_id" required>${caseOptions(selectedCaseId)}</select></label>
      <label>任务模板<select name="template"><option value="">自定义任务</option>${TASK_TEMPLATES.map(t=>`<option>${esc(t)}</option>`).join('')}</select></label>
      <label class="wide">任务标题<input name="title" required placeholder="选择模板或手动输入"></label>
      <label>负责人<select name="owner_id">${profileOptions(auth.user.id, ['*'])}</select></label>
      <label>优先级<select name="priority"><option>中</option><option>低</option><option>高</option><option>紧急</option></select></label>
      <label>截止时间<input name="due_at" type="datetime-local"></label>
      <label class="wide">说明<textarea name="description"></textarea></label>
      <div class="wide modal-actions"><button class="btn" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">创建任务</button></div>
    </form>`);
  const tpl=$('#taskForm [name="template"]');
  const title=$('#taskForm [name="title"]');
  tpl.addEventListener('change',()=>{if(tpl.value)title.value=tpl.value;});
}

async function submitTask(form){
  const fd=new FormData(form);
  const c=caseById(fd.get('service_case_id'));
  const rows=await apiFetch('crm_tasks',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({service_case_id:c.id,student_id:c.student_id,title:fd.get('title'),description:fd.get('description'),owner_id:fd.get('owner_id')||auth.user.id,priority:fd.get('priority'),task_status:'未开始',due_at:fd.get('due_at')||null,created_by:auth.user.id})});
  await logAudit('创建任务','crm_tasks',rows?.[0]?.id,null,rows?.[0]);
  closeModal();
  await loadAll();
}

function communicationForm(caseId=''){
  openModal('新增沟通记录',`
    <form id="communicationForm" class="form-grid">
      <label>服务案例<select name="service_case_id" required>${caseOptions(caseId||selectedCaseId)}</select></label>
      <label>沟通方式<select name="communication_type"><option>微信</option><option>电话</option><option>腾讯会议</option><option>飞书会议</option><option>线下沟通</option><option>短信</option><option>邮件</option><option>内部会议</option><option>其他</option></select></label>
      <label>沟通对象<input name="participant" placeholder="家长/学生/内部老师"></label>
      <label>沟通主题<input name="topic" placeholder="初版方案沟通"></label>
      <label class="wide">主要内容<textarea name="content">${esc(COMM_TEMPLATE)}</textarea></label>
      <label class="wide">已提示风险<textarea name="risk_notice"></textarea></label>
      <label class="wide">下一步动作<textarea name="next_action"></textarea></label>
      <div class="wide modal-actions"><button class="btn" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">保存沟通记录</button></div>
    </form>`);
}

async function submitCommunication(form){
  const fd=new FormData(form);
  const c=caseById(fd.get('service_case_id'));
  const rows=await apiFetch('crm_communications',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({service_case_id:c.id,student_id:c.student_id,communication_type:fd.get('communication_type'),participant:fd.get('participant'),topic:fd.get('topic'),content:fd.get('content'),risk_notice:fd.get('risk_notice'),next_action:fd.get('next_action'),created_by:auth.user.id})});
  await logAudit('添加沟通记录','crm_communications',rows?.[0]?.id,null,rows?.[0]);
  closeModal();
  await loadAll();
}

function riskForm(caseId=''){
  openModal('添加风险项',`
    <form id="riskForm" class="form-grid">
      <label>服务案例<select name="service_case_id" required>${caseOptions(caseId||selectedCaseId)}</select></label>
      <label>风险标题<input name="title" required placeholder="例如 色盲限制需核对章程"></label>
      <label>风险类型<select name="risk_type">${RISK_TYPES.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>
      <label>风险等级<select name="risk_level"><option>低</option><option>中</option><option>高</option><option>严重</option></select></label>
      <label>批次<input name="batch_type" placeholder="普通批/提前批/综评"></label>
      <label>相关院校/专业组<input name="related" placeholder="南京大学 03组"></label>
      <label>依据来源<select name="evidence_source"><option>待核对</option><option>江苏省教育考试院</option><option>高校招生章程</option><option>官方分省招生计划</option><option>高校本科招生网</option><option>家长口头反馈</option><option>学生口头反馈</option><option>内部经验判断</option><option>其他</option></select></label>
      <label>处理状态<select name="risk_status"><option>未处理</option><option>处理中</option><option>已提醒家长</option><option>已规避</option><option>已确认接受</option><option>已关闭</option></select></label>
      <label class="wide">依据说明<textarea name="evidence_detail"></textarea></label>
      <label class="wide">处理建议<textarea name="suggestion"></textarea></label>
      <div class="wide modal-actions"><button class="btn" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">保存风险</button></div>
    </form>`);
}

async function submitRisk(form){
  const fd=new FormData(form);
  const c=caseById(fd.get('service_case_id'));
  const [school,group]=String(fd.get('related')||'').split(/\s+/);
  const payload={service_case_id:c.id,student_id:c.student_id,title:fd.get('title'),risk_type:fd.get('risk_type'),risk_level:fd.get('risk_level'),batch_type:fd.get('batch_type'),related_school:school||'',related_major_group:group||'',evidence_source:fd.get('evidence_source'),evidence_detail:fd.get('evidence_detail'),suggestion:fd.get('suggestion'),risk_status:fd.get('risk_status'),created_by:auth.user.id};
  const rows=await apiFetch('crm_risk_items',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  const levelOrder={低:1,中:2,高:3,严重:4};
  if(levelOrder[payload.risk_level]>levelOrder[c.risk_level||'低'])await apiFetch(`crm_service_cases?id=eq.${encodeURIComponent(c.id)}`,{method:'PATCH',body:JSON.stringify({risk_level:payload.risk_level})});
  await logAudit('添加风险项','crm_risk_items',rows?.[0]?.id,null,payload);
  closeModal();
  await loadAll();
}

function fileForm(planMode=false){
  const currentCase=caseById(selectedCaseId);
  const currentStudentId=currentCase?.student_id||selectedStudentId||'';
  const hasCaseChoices=casesForStudent(currentStudentId).length>0;
  openModal(planMode?'上传方案版本':'上传附件',`
    <form id="${planMode?'planForm':'fileForm'}" class="form-grid">
      <label>学生档案<select name="student_id" required>${studentOptions(currentStudentId)}</select></label>
      <label>服务案例<select name="service_case_id" ${planMode?'required':''}>${caseOptionsForUpload(selectedCaseId,currentStudentId)}</select>${hasCaseChoices?'':'<small>该学生暂无服务案例，附件会先保存到学生档案。</small>'}</label>
      <label>文件类型<select name="file_type"><option>${planMode?'志愿方案':'成绩截图'}</option><option>体检表</option><option>报名截图</option><option>付款截图</option><option>聊天记录</option><option>志愿方案</option><option>会议纪要</option><option>招生简章</option><option>政策文件</option><option>身份证明</option><option>其他</option></select></label>
      ${planMode?'<label>方案名称<input name="plan_name" required placeholder="张三普通批方案"></label><label>版本号<input name="version_no" value="V1"></label><label>方案类型<select name="plan_type"><option>初筛方案</option><option>普通批方案</option><option>综评方案</option><option>强基方案</option><option>提前批方案</option><option>中外合作方案</option><option>最终交付方案</option><option>其他</option></select></label><label>复核状态<select name="review_status"><option>未提交</option><option>待复核</option><option>复核通过</option><option>需修改</option><option>已驳回</option></select></label>':''}
      <label class="wide">选择文件<input name="file" type="file" required></label>
      <label class="wide">备注/修改说明<textarea name="remark"></textarea></label>
      <div class="wide modal-actions"><button class="btn" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">上传保存</button></div>
    </form>`);
}

async function submitFile(form,planMode=false){
  const fd=new FormData(form);
  const c=caseById(fd.get('service_case_id'));
  const studentId=c?.student_id||fd.get('student_id');
  if(!studentId)throw new Error('请选择学生档案。');
  if(planMode&&!c)throw new Error('上传方案版本必须先选择服务案例。');
  const file=fd.get('file');
  if(!file||!file.name)throw new Error('请选择文件。');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const safe=file.name.replace(/[^\w.\-\u4e00-\u9fa5]+/g,'_');
  const path=`students/${studentId}/${c?.id||'student-files'}/${stamp}-${safe}`;
  await storageUpload(path,file);
  const fileRows=await apiFetch('crm_file_attachments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({service_case_id:c?.id||null,student_id:studentId,file_name:file.name,file_type:fd.get('file_type'),file_path:path,mime_type:file.type||'application/octet-stream',file_size:file.size,uploaded_by:auth.user.id,remark:fd.get('remark')})});
  if(planMode){
    const fileRow=fileRows[0];
    const planRows=await apiFetch('crm_plan_versions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({service_case_id:c.id,student_id:studentId,plan_name:fd.get('plan_name'),version_no:fd.get('version_no')||'V1',plan_type:fd.get('plan_type'),file_id:fileRow.id,created_by:auth.user.id,review_status:fd.get('review_status'),change_log:fd.get('remark')})});
    await logAudit('上传方案','crm_plan_versions',planRows?.[0]?.id,null,planRows?.[0]);
  }else{
    await logAudit('上传附件','crm_file_attachments',fileRows?.[0]?.id,null,fileRows?.[0]);
  }
  closeModal();
  await loadAll();
}

async function caseFromOrder(orderId){
  const o=orderById(orderId);
  if(!o?.student_id){alert('这个订单还没有关联学生，先创建学生档案。');return;}
  const exists=data.cases.find(c=>c.order_id===orderId);
  if(exists){selectedCaseId=exists.id;view='board';render();return;}
  const c=(await apiFetch('crm_service_cases',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({order_id:o.id,student_id:o.student_id,service_type:(o.service_type||[])[0]||'普通批志愿填报',service_status:'待分配',deadline:o.service_deadline||null,created_by:auth.user.id})}))[0];
  await apiFetch('rpc/crm_create_default_tasks',{method:'POST',body:JSON.stringify({target_case_id:c.id})}).catch(()=>{});
  await logAudit('创建服务案例','crm_service_cases',c.id,null,c);
  await loadAll();
}

async function moveCase(caseId,dir){
  const c=caseById(caseId);
  const idx=SERVICE_STATUSES.indexOf(c.service_status);
  const next=SERVICE_STATUSES[Math.max(0,Math.min(SERVICE_STATUSES.length-1,idx+Number(dir)))];
  if(!next||next===c.service_status)return;
  if(!confirm(`确认将服务状态从「${c.service_status}」改为「${next}」吗？`))return;
  const patch={service_status:next};
  if(next==='已交付'||next==='已归档')patch.completed_at=new Date().toISOString();
  if(next==='已归档')patch.archived_at=new Date().toISOString();
  await apiFetch(`crm_service_cases?id=eq.${encodeURIComponent(caseId)}`,{method:'PATCH',body:JSON.stringify(patch)});
  await logAudit('修改服务状态','crm_service_cases',caseId,{service_status:c.service_status},patch);
  await loadAll();
}

async function completeTask(taskId){
  const t=data.tasks.find(x=>x.id===taskId);
  await apiFetch(`crm_tasks?id=eq.${encodeURIComponent(taskId)}`,{method:'PATCH',body:JSON.stringify({task_status:'已完成',completed_at:new Date().toISOString()})});
  await logAudit('完成任务','crm_tasks',taskId,{task_status:t?.task_status},{task_status:'已完成'});
  await loadAll();
}

async function noticeRisk(id){
  await apiFetch(`crm_risk_items?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({notice_to_parent:true,risk_status:'已提醒家长'})});
  await logAudit('风险提醒家长','crm_risk_items',id,null,{notice_to_parent:true,risk_status:'已提醒家长'});
  await loadAll();
}

async function closeRisk(id){
  const record=prompt('请输入风险关闭/接受/规避的处理说明：');
  if(record===null)return;
  await apiFetch(`crm_risk_items?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({risk_status:'已关闭',confirmation_record:record})});
  await logAudit('关闭风险项','crm_risk_items',id,null,{risk_status:'已关闭',confirmation_record:record});
  await loadAll();
}

async function lockPlan(id){
  const reason=prompt('锁定最终版必须填写说明：');
  if(!reason)return;
  await apiFetch(`crm_plan_versions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({is_locked:true,locked_at:new Date().toISOString(),change_log:reason,review_status:'复核通过',parent_confirm_status:'已微信确认'})});
  await logAudit('锁定最终方案','crm_plan_versions',id,null,{is_locked:true,reason});
  await loadAll();
}

async function downloadFile(id){
  const f=data.files.find(x=>x.id===id);
  if(!f)return;
  const url=await signedUrl(f.file_path);
  window.open(url,'_blank');
}

function studentDetail(studentId){
  selectedStudentId=studentId;
  const s=studentById(studentId);
  const cases=data.cases.filter(c=>c.student_id===studentId);
  const orders=data.orders.filter(o=>o.student_id===studentId);
  const pct=completeness(s);
  const firstCase=cases[0];
  selectedCaseId=firstCase?.id||'';
  openModal('学生服务详情',`
    <section class="detail">
      <aside class="profile">
        <div class="profile-card">
          <h3>${esc(s.name)} <span class="badge">${esc(studentNo(s))}</span></h3>
          <p>${esc(s.province||'江苏')} ${esc(s.class_type||s.subject_type||'')}｜${esc(s.gaokao_score||s.score||s.estimated_score||'—')} / ${esc(s.gaokao_rank||s.rank||s.estimated_rank||'—')}<br>主规划师：${esc(personName(firstCase?latestAssignment(firstCase.id)?.main_consultant_id:s.planner_id))}<br>服务开始：${esc(shortDate(s.service_started_at||s.created_at))}</p>
          <div class="complete"><i style="width:${pct}%"></i></div><p>资料完整度 ${pct}%</p>
        </div>
        <button class="btn primary" data-open-volunteer="${esc(s.id)}">同步到志愿填报系统</button>
        <button class="btn" data-edit-student="${esc(s.id)}">编辑基础档案</button>
      </aside>
      <div>
        <div class="tabs">
          <button class="active" data-detail-tab="base">基础档案</button>
          <button data-detail-tab="case">订单服务</button>
          <button data-detail-tab="task">任务</button>
          <button data-detail-tab="comm">沟通</button>
          <button data-detail-tab="risk">风险</button>
          <button data-detail-tab="plan">方案附件</button>
        </div>
        <div id="detailTabBody">${detailBaseHTML(s)}</div>
      </div>
    </section>`);
  window.__crmDetail={student:s,cases,orders};
}

function detailBaseHTML(s){
  return `<div class="record-list">
    <div class="record"><h4>基本信息</h4><p>学校：${esc(s.high_school||'未填')}｜选科：${esc([s.first_subject,...normalizeVolunteerSubjectChoices(s.second_subjects,s.subject_choices,s.subjectChoices)].filter(Boolean).join('+')||'未填')}｜体检：${esc(normalizeVolunteerMedicalCodes(s.physical_limit_codes,s.medical_codes,s.medicalCodes,s.medical_remark).join('/')||'未填')}</p></div>
    <div class="record"><h4>偏好与诉求</h4><p>地域：${esc(s.region_preference||'未填')}\n专业：${esc(s.major_preference||'未填')}\n黑名单：${esc(s.major_blacklist||'未填')}\n家长诉求：${esc(s.parent_demand||'未填')}</p></div>
  </div>`;
}

function renderDetailTab(tab){
  const ctx=window.__crmDetail;
  if(!ctx)return;
  const s=ctx.student;
  const cases=ctx.cases;
  const caseIds=cases.map(c=>c.id);
  if(tab==='base')$('#detailTabBody').innerHTML=detailBaseHTML(s);
  if(tab==='case')$('#detailTabBody').innerHTML=recordList(cases,c=>`<div class="record"><h4>${esc(c.service_type)} ${statusBadge(c.service_status)} ${riskBadge(c.risk_level)}</h4><p>截止：${esc(dateOnly(c.deadline)||'未定')}｜分配：${esc(personName(latestAssignment(c.id)?.main_consultant_id))}</p><div class="record-actions"><button class="btn" data-assign-case="${esc(c.id)}">分配</button><button class="btn primary" data-move-case="${esc(c.id)}" data-dir="1">推进</button></div></div>`);
  if(tab==='task')$('#detailTabBody').innerHTML=`<button class="btn primary" data-open-task-form>新增任务</button><br><br>${recordList(data.tasks.filter(t=>t.student_id===s.id),taskRecordHTML)}`;
  if(tab==='comm')$('#detailTabBody').innerHTML=`<button class="btn primary" data-open-comm-form="${esc(caseIds[0]||'')}">新增沟通</button><br><br>${recordList(data.communications.filter(x=>x.student_id===s.id),x=>`<div class="record"><h4>${esc(x.topic||x.communication_type)} ${x.is_key?'<span class="badge orange">关键</span>':''}</h4><p>${esc(shortDate(x.communication_time))}｜${esc(x.participant||'')}\n${esc(x.content||'')}\n风险提示：${esc(x.risk_notice||'无')}\n下一步：${esc(x.next_action||'')}</p></div>`)}`;
  if(tab==='risk')$('#detailTabBody').innerHTML=`<button class="btn primary" data-open-risk-form="${esc(caseIds[0]||'')}">添加风险</button><br><br>${recordList(data.risks.filter(x=>x.student_id===s.id),riskRecordHTML)}`;
  if(tab==='plan')$('#detailTabBody').innerHTML=`<button class="btn primary" data-open-plan-form>上传方案</button> <button class="btn" data-open-file-form>上传附件</button><br><br>${recordList(data.plans.filter(x=>x.student_id===s.id),p=>`<div class="record"><h4>${esc(p.plan_name)} ${esc(p.version_no)} ${p.is_locked?'<span class="badge green">锁定</span>':''}</h4><p>${esc(p.plan_type)}｜${esc(p.review_status)}｜${esc(p.parent_confirm_status)}\n${esc(p.change_log||'')}</p></div>`)}${recordList(data.files.filter(x=>x.student_id===s.id),f=>`<div class="record"><h4>${esc(f.file_name)} <span class="badge">${esc(f.file_type)}</span></h4><p>${esc(f.remark||'')}</p><button class="btn" data-download-file="${esc(f.id)}">下载</button></div>`)}`;
  bindDynamic();
}

function caseDetail(caseId){
  const c=caseById(caseId);
  if(c)studentDetail(c.student_id);
}

function orderDetail(orderId){
  const o=orderById(orderId);
  const c=customerById(o.customer_id);
  const s=studentById(o.student_id);
  openModal('订单详情',`<div class="record-list">
    <div class="record"><h4>${esc(o.order_no)} ${paymentBadge(o.payment_status)} ${statusBadge(o.order_status)}</h4><p>客户：${esc(c?.name||'未关联')}｜学生：${esc(s?.name||'待建档')}｜服务：${esc(serviceTypesText(o.service_type))}\n金额：${num(o.amount_paid)} / ${num(o.amount_total)}｜截止：${esc(dateOnly(o.service_deadline)||'未定')}\n备注：${esc(o.remark||'')}</p></div>
    <div class="record-actions"><button class="btn" data-case-from-order="${esc(o.id)}">创建/查看服务案例</button>${s?`<button class="btn primary" data-student-detail="${esc(s.id)}">进入学生详情</button>`:''}</div>
  </div>`);
}

function volunteerStage(student){
  const stage=String(student?.stage||student?.service_stage||student?.batch||'').toLowerCase();
  return /specialty|专科/.test(stage)?'specialty':'undergraduate';
}

function volunteerStudentPayload(student){
  const subjectChoices=normalizeVolunteerSubjectChoices(student?.subject_choices,student?.second_subjects,student?.subjectChoices);
  const medicalCodes=normalizeVolunteerMedicalCodes(student?.medical_codes,student?.physical_limit_codes,student?.medicalCodes,student?.medical_remark);
  const subjectType=normalizeVolunteerSubjectType(student);
  const score=toVolunteerNumber(student?.score,student?.gaokao_score,student?.estimated_score);
  const rank=toVolunteerNumber(student?.rank,student?.gaokao_rank,student?.estimated_rank);
  const stage=volunteerStage(student);
  return {
    ...student,
    owner_id:auth.user?.id||student?.owner_id||null,
    planner_id:student?.planner_id||auth.user?.id||null,
    province:firstFilled(student?.province,'江苏'),
    stage,
    subject_type:subjectType,
    first_subject:subjectType==='history'?'历史':'物理',
    subject_choices:subjectChoices,
    second_subjects:subjectChoices,
    subjectChoices,
    medical_codes:medicalCodes,
    physical_limit_codes:medicalCodes,
    score,
    rank,
    gaokao_score:firstFilled(student?.gaokao_score,score),
    gaokao_rank:firstFilled(student?.gaokao_rank,rank),
    target_cities:Array.isArray(student?.target_cities)?student.target_cities:splitVolunteerList(student?.region_preference).filter(Boolean),
    target_majors:Array.isArray(student?.target_majors)?student.target_majors:splitVolunteerList(student?.major_preference).filter(Boolean)
  };
}

function saveVolunteerStudentIndexes(student){
  if(!auth.user?.id||!student?.id)return;
  try{
    const subjectKey=`js-plan-student-subject-choices-v1:${auth.user.id}`;
    const subjectMap=storageJSON(subjectKey,{})||{};
    subjectMap[student.id]=student.subject_choices||[];
    localStorage.setItem(subjectKey,JSON.stringify(subjectMap));
    if(student.medical_codes?.length){
      localStorage.setItem('js-plan-medical-restriction-codes-v1',JSON.stringify(student.medical_codes));
    }
  }catch(e){}
}

function openVolunteer(studentId){
  const s=studentById(studentId);
  if(!s)return;
  const payload=volunteerStudentPayload(s);
  try{
    localStorage.setItem(`js-plan-current-student-v1:${auth.user.id}`,JSON.stringify(payload));
    saveVolunteerStudentIndexes(payload);
  }catch(e){}
  const url=payload.stage==='specialty'?'./specialty/index.html':'./index.html';
  window.open(url,'_blank');
}

async function logAudit(action,entityType,entityId,beforeData,afterData){
  try{
    await apiFetch('crm_audit_logs',{method:'POST',body:JSON.stringify({user_id:auth.user.id,action,entity_type:entityType,entity_id:entityId,before_data:beforeData||null,after_data:afterData||null,user_agent:navigator.userAgent})});
  }catch(e){}
}

function bindDynamic(){
  $$('[data-switch]').forEach(btn=>btn.onclick=()=>{view=btn.dataset.switch;render();});
  $$('[data-open-quick-order]').forEach(btn=>btn.onclick=quickOrderForm);
  $$('[data-order-detail]').forEach(btn=>btn.onclick=()=>orderDetail(btn.dataset.orderDetail));
  $$('[data-student-detail]').forEach(btn=>btn.onclick=()=>studentDetail(btn.dataset.studentDetail));
  $$('[data-case-detail]').forEach(btn=>btn.onclick=()=>caseDetail(btn.dataset.caseDetail));
  $$('[data-case-from-order]').forEach(btn=>btn.onclick=()=>caseFromOrder(btn.dataset.caseFromOrder).catch(err=>alert(friendlyError(err))));
  $$('[data-assign-case]').forEach(btn=>btn.onclick=()=>assignmentForm(btn.dataset.assignCase));
  $$('[data-move-case]').forEach(btn=>btn.onclick=()=>moveCase(btn.dataset.moveCase,btn.dataset.dir).catch(err=>alert(friendlyError(err))));
  $$('[data-open-student-form]').forEach(btn=>btn.onclick=()=>studentForm());
  $$('[data-edit-student]').forEach(btn=>btn.onclick=()=>studentForm(studentById(btn.dataset.editStudent)));
  $$('[data-open-task-form]').forEach(btn=>btn.onclick=taskForm);
  $$('[data-open-comm-form]').forEach(btn=>btn.onclick=()=>communicationForm(btn.dataset.openCommForm));
  $$('[data-open-risk-form]').forEach(btn=>btn.onclick=()=>riskForm(btn.dataset.openRiskForm));
  $$('[data-open-plan-form]').forEach(btn=>btn.onclick=()=>fileForm(true));
  $$('[data-open-file-form]').forEach(btn=>btn.onclick=()=>fileForm(false));
  $$('[data-complete-task]').forEach(btn=>btn.onclick=()=>completeTask(btn.dataset.completeTask).catch(err=>alert(friendlyError(err))));
  $$('[data-risk-notice]').forEach(btn=>btn.onclick=()=>noticeRisk(btn.dataset.riskNotice).catch(err=>alert(friendlyError(err))));
  $$('[data-risk-close]').forEach(btn=>btn.onclick=()=>closeRisk(btn.dataset.riskClose).catch(err=>alert(friendlyError(err))));
  $$('[data-lock-plan]').forEach(btn=>btn.onclick=()=>lockPlan(btn.dataset.lockPlan).catch(err=>alert(friendlyError(err))));
  $$('[data-download-file]').forEach(btn=>btn.onclick=()=>downloadFile(btn.dataset.downloadFile).catch(err=>alert(friendlyError(err))));
  $$('[data-open-volunteer]').forEach(btn=>btn.onclick=()=>openVolunteer(btn.dataset.openVolunteer));
  $$('[data-close-modal]').forEach(btn=>btn.onclick=closeModal);
  $$('[data-detail-tab]').forEach(btn=>btn.onclick=()=>{$$('[data-detail-tab]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');renderDetailTab(btn.dataset.detailTab);});
  bindSubjectChoiceLimit('quickOrderSubjects');
  bindSubjectChoiceLimit('studentFormSubjects');
  const quick=$('#quickOrderForm'); if(quick)quick.onsubmit=e=>{e.preventDefault();submitQuickOrder(quick).catch(err=>{const msg=friendlyError(err);setNotice(`新建收单失败：${msg}`,'error');alert(msg);});};
  const student=$('#studentForm'); if(student)student.onsubmit=e=>{e.preventDefault();submitStudentForm(student).catch(err=>{const msg=friendlyError(err);setNotice(`学生档案保存失败：${msg}`,'error');alert(msg);});};
  const assignment=$('#assignmentForm'); if(assignment)assignment.onsubmit=e=>{e.preventDefault();submitAssignment(assignment).catch(err=>alert(friendlyError(err)));};
  const task=$('#taskForm'); if(task)task.onsubmit=e=>{e.preventDefault();submitTask(task).catch(err=>alert(friendlyError(err)));};
  const comm=$('#communicationForm'); if(comm)comm.onsubmit=e=>{e.preventDefault();submitCommunication(comm).catch(err=>alert(friendlyError(err)));};
  const risk=$('#riskForm'); if(risk)risk.onsubmit=e=>{e.preventDefault();submitRisk(risk).catch(err=>alert(friendlyError(err)));};
  const file=$('#fileForm'); if(file)file.onsubmit=e=>{e.preventDefault();submitFile(file,false).catch(err=>alert(friendlyError(err)));};
  const plan=$('#planForm'); if(plan)plan.onsubmit=e=>{e.preventDefault();submitFile(plan,true).catch(err=>alert(friendlyError(err)));};
}

function bindStatic(){
  $('#nav').addEventListener('click',e=>{
    const btn=e.target.closest('button[data-view]');
    if(!btn)return;
    view=btn.dataset.view;
    render();
  });
  $('#refreshBtn').addEventListener('click',()=>loadAll().catch(err=>setNotice(friendlyError(err),'error')));
  $('#quickOrderBtn').addEventListener('click',quickOrderForm);
  $('#globalSearch').addEventListener('input',e=>{query=e.target.value;render();});
  $('#statusFilter').addEventListener('change',e=>{statusFilter=e.target.value;render();});
  $('#ownerFilter').addEventListener('change',e=>{ownerFilter=e.target.value;render();});
  $('#riskFilter').addEventListener('change',e=>{riskFilter=e.target.value;render();});
  $('#clearFilterBtn').addEventListener('click',()=>{query='';statusFilter='';ownerFilter='';riskFilter='';$('#globalSearch').value='';renderFilters();render();});
  $('#modalMask').addEventListener('click',e=>{if(e.target.id==='modalMask')closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
}

async function init(){
  bindStatic();
  loadAuth();
  try{
    await loadAll();
  }catch(err){
    const msg=friendlyError(err);
    setNotice(msg.includes('crm_')||msg.includes('does not exist')?`${msg}\n\n如果提示表不存在，请先在 Supabase SQL Editor 执行 supabase/crm_schema.sql。`:msg,'error');
    $('#view').innerHTML='<div class="empty">CRM 暂未载入。请确认已登录，并已执行 CRM 数据库迁移。</div>';
  }
}

init();
})();
