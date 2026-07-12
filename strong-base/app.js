(function(){
  'use strict';

  const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
  const AUTH_STORAGE_KEY='js-plan-auth-v1';
  const CURRENT_STUDENT_STORAGE_KEY='js-plan-current-student-v1';
  const LOCAL_DRAFT_KEY='js-plan-strong-base-draft-v1';
  const CORE=window.STRONG_BASE_CORE||{};
  const RULES=window.STRONG_BASE_RULES_2026||{meta:{},schools:[],interviews:[]};
  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const unique=values=>[...new Set((values||[]).filter(Boolean))];
  const nowISO=()=>new Date().toISOString();

  const state={
    view:'dashboard',
    auth:{accessToken:'',refreshToken:'',user:null},
    students:[],
    currentStudent:null,
    record:null,
    cloudReady:true,
    selectedStage:'fit',
    mapChoices:{trend:'',major:'',assessment:'',risk:''},
    majorGroup:'',
    schoolFilters:{q:'',stage:'',mode:'',region:'',verification:''},
    trainerSchoolId:'',
    trainerQuery:'',
    trainerQuestionIndex:0,
    saveTimer:null,
    savePromise:null,
    toastTimer:null,
    loadingStudent:false,
    recordWritable:false,
    recordLoadError:''
  };

  function defaultRecord(){
    return {
      status:'准备中',
      profile:{
        recentScore:'',recentRank:'',scoreTrend:'',mathScore:'',physicsScore:'',chemistryScore:'',biologyScore:'',
        writtenStrength:'',interviewStrength:'',englishStrength:'',ordinaryBaseline:'',preferredDisciplines:[],rejectedDisciplines:'',
        careerDirection:'',regionPreference:'',acceptsLongDegree:'',acceptsDirectPhd:'',acceptsNoTransfer:'',acceptsEarlyLock:'',riskTolerance:'',notes:''
      },
      selectedSchoolIds:[],
      tasks:{},
      brochureChecks:{},
      mapChoices:{trend:'',major:'',assessment:'',risk:''},
      interview:{schoolId:'',questionIndex:0,answer:'',ratings:{academic:3,logic:3,expression:3},reviews:[]},
      statement:{origin:'',evidence:'',reading:'',school:'',future:'',proof:''},
      updatedAt:''
    };
  }

  function normalizeRecord(raw){
    const base=defaultRecord();
    const input=raw&&typeof raw==='object'?raw:{};
    return {
      ...base,...input,
      profile:{...base.profile,...(input.profile||{})},
      selectedSchoolIds:unique(input.selectedSchoolIds||input.selected_school_ids||[]),
      tasks:{...base.tasks,...(input.tasks||{})},
      brochureChecks:{...base.brochureChecks,...(input.brochureChecks||{})},
      mapChoices:{...base.mapChoices,...(input.mapChoices||{})},
      interview:{...base.interview,...(input.interview||{}),ratings:{...base.interview.ratings,...(input.interview?.ratings||{})},reviews:Array.isArray(input.interview?.reviews)?input.interview.reviews:[]},
      statement:{...base.statement,...(input.statement||{})}
    };
  }

  function storageJSON(key,fallback){
    try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(err){return fallback;}
  }
  function saveAuth(){try{localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(state.auth));}catch(err){}}
  function clearAuth(){
    clearTimeout(state.saveTimer);state.saveTimer=null;state.savePromise=null;
    state.auth={accessToken:'',refreshToken:'',user:null};state.students=[];state.currentStudent=null;state.record=null;
    state.recordWritable=false;state.recordLoadError='';state.cloudReady=false;
    try{localStorage.removeItem(AUTH_STORAGE_KEY);}catch(err){}
  }
  function currentStudentStorageKey(){
    return state.auth.user?.id?`${CURRENT_STUDENT_STORAGE_KEY}:${state.auth.user.id}`:CURRENT_STUDENT_STORAGE_KEY;
  }
  function localDraftKey(studentId=state.currentStudent?.id){
    return `${LOCAL_DRAFT_KEY}:${state.auth.user?.id||'guest'}:${studentId||'none'}:2026`;
  }
  function saveLocalDraft(studentId=state.currentStudent?.id,record=state.record,{touch=true}={}){
    if(!studentId||!record)return '';
    const updatedAt=touch?nowISO():(record.updatedAt||nowISO());
    const draft={...record,updatedAt};
    try{localStorage.setItem(localDraftKey(studentId),JSON.stringify(draft));}catch(err){}
    if(studentId===state.currentStudent?.id&&record===state.record)state.record.updatedAt=updatedAt;
    return updatedAt;
  }
  function saveCurrentStudent(student){
    state.currentStudent=student||null;
    try{
      if(student)localStorage.setItem(currentStudentStorageKey(),JSON.stringify(student));
      else localStorage.removeItem(currentStudentStorageKey());
    }catch(err){}
  }

  function decodeJwt(token){
    try{
      const part=String(token||'').split('.')[1];
      if(!part)return null;
      const base=part.replace(/-/g,'+').replace(/_/g,'/');
      const json=atob(base.padEnd(base.length+(4-base.length%4)%4,'='));
      return JSON.parse(decodeURIComponent(Array.from(json).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join('')));
    }catch(err){return null;}
  }
  function tokenExpiresSoon(){
    const payload=decodeJwt(state.auth.accessToken);
    return !payload?.exp||payload.exp*1000-Date.now()<120000;
  }
  async function refreshSession(force=false){
    if(!state.auth.accessToken){const error=new Error('请先登录。');error.authExpired=true;throw error;}
    if(!force&&!tokenExpiresSoon())return;
    if(!state.auth.refreshToken){const error=new Error('登录状态已过期，请重新登录。');error.authExpired=true;throw error;}
    const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:state.auth.refreshToken})
    });
    if(!response.ok){const error=new Error('登录状态已过期，请重新登录。');error.authExpired=true;error.status=response.status;throw error;}
    const data=await response.json();
    state.auth={accessToken:data.access_token||'',refreshToken:data.refresh_token||state.auth.refreshToken,user:data.user||state.auth.user};
    saveAuth();
  }
  async function apiFetch(path,options={}){
    await refreshSession(false);
    const request=async()=>fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
      ...options,
      headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${state.auth.accessToken}`,'Content-Type':'application/json',...(options.headers||{})}
    });
    let response=await request();
    if(response.status===401){await refreshSession(true);response=await request();}
    if(!response.ok){
      const text=await response.text();
      const error=new Error(text||`请求失败（${response.status}）`);
      error.status=response.status;error.body=text;if(response.status===401)error.authExpired=true;throw error;
    }
    if(response.status===204)return null;
    const text=await response.text();
    return text?JSON.parse(text):null;
  }

  function showAuthCover(show){
    $('#authCover').hidden=!show;
    $('#appShell').hidden=show;
  }
  function returnToLogin(message=''){
    clearAuth();showAuthCover(true);
    const frame=$('#authFrame');
    if(frame){frame.src=`../login_landing.html?next=strong-base%2F${message?`&notice=${encodeURIComponent(message)}`:''}`;}
  }
  async function ensureProfile(user){
    const rows=await apiFetch(`profiles?select=role,status&id=eq.${encodeURIComponent(user.id)}&limit=1`);
    if(rows?.[0]){
      if(rows[0].status!=='active')throw new Error('账号资料未启用，请联系管理员。');
      return;
    }
    await apiFetch('profiles?on_conflict=id',{
      method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},
      body:JSON.stringify({id:user.id,email:user.email||'',display_name:user.user_metadata?.display_name||user.email||'',role:'viewer',status:'active'})
    });
  }
  async function authenticateFromLanding(message){
    const action=message.action||'login';
    if(action==='reset-password'){
      const response=await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(new URL('../login_landing.html#login',location.href).href)}`,{
        method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:String(message.email||'')})
      });
      if(!response.ok)throw new Error(await response.text());
      return {message:'已发送密码重置邮件，请到邮箱继续操作。',stay:true};
    }
    const endpoint=action==='register'?'signup':'token?grant_type=password';
    const body=action==='register'
      ?{email:String(message.email||''),password:String(message.password||''),data:{role:'viewer',display_name:String(message.email||'').split('@')[0]}}
      :{email:String(message.email||''),password:String(message.password||'')};
    const response=await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`,{
      method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)
    });
    if(!response.ok)throw new Error(await response.text());
    const data=await response.json();
    if(!data.access_token||!data.user?.id)throw new Error(action==='register'?'注册已提交，但当前仍需要邮箱验证。':'登录响应不完整。');
    const previousAuth=state.auth;
    state.auth={accessToken:data.access_token,refreshToken:data.refresh_token||'',user:data.user};
    try{await ensureProfile(data.user);saveAuth();}
    catch(err){state.auth=previousAuth;try{localStorage.removeItem(AUTH_STORAGE_KEY);}catch(storageErr){}throw err;}
    return {message:action==='register'?'注册成功，正在进入系统...':'登录成功，正在进入系统...'};
  }
  async function handleAuthMessage(event){
    const frame=$('#authFrame')?.contentWindow;
    if(event.origin!==location.origin||event.source!==frame||event.data?.source!=='auth-login')return;
    try{
      const result=await authenticateFromLanding(event.data);
      if(!result.stay){await loadWorkspaceData();showAuthCover(false);}
      frame?.postMessage({source:'jiangsu-plan-auth',status:'ok',message:result.message},event.origin);
    }catch(err){
      if(err.authExpired)clearAuth();
      frame?.postMessage({source:'jiangsu-plan-auth',status:'error',message:`${event.data.action==='register'?'注册':'登录'}失败：${humanError(err)}`},event.origin);
    }
  }

  function humanError(err){
    const text=String(err?.message||err||'未知错误');
    if(/Invalid login credentials/i.test(text))return '账号或密码错误。';
    if(/user_already_exists|already registered/i.test(text))return '该邮箱已经注册，请直接登录。';
    if(/relation .*student_strong_base_records.* does not exist|PGRST202/i.test(text))return '强基云端数据表尚未启用。';
    return text.length>180?text.slice(0,180)+'…':text;
  }

  async function fetchStudents(){
    const fields='id,name,phone,stage,subject_type,subject_choices,second_subjects,score,rank,gaokao_score,gaokao_rank,estimated_score,estimated_rank,math_score,physics_score,chemistry_score,biology_score,region_preference,major_preference,risk_tolerance,strong_base_status,intake_payload,updated_at';
    state.students=await apiFetch(`students?select=${fields}&archived=eq.false&order=updated_at.desc`);
  }
  function findStoredStudent(){
    const stored=storageJSON(currentStudentStorageKey(),null);
    if(!stored?.id)return null;
    return state.students.find(student=>student.id===stored.id)||null;
  }
  function studentValue(student,...keys){
    for(const key of keys){const value=student?.[key];if(value!==null&&value!==undefined&&value!=='')return value;}
    return '';
  }
  function profileFromStudent(student){
    if(!student)return {};
    return {
      recentScore:studentValue(student,'gaokao_score','estimated_score','score'),
      recentRank:studentValue(student,'gaokao_rank','estimated_rank','rank'),
      mathScore:studentValue(student,'math_score'),physicsScore:studentValue(student,'physics_score'),
      chemistryScore:studentValue(student,'chemistry_score'),biologyScore:studentValue(student,'biology_score'),
      regionPreference:studentValue(student,'region_preference'),riskTolerance:studentValue(student,'risk_tolerance')
    };
  }
  function recordTimestamp(record){
    const value=Date.parse(record?.updatedAt||'');return Number.isFinite(value)?value:0;
  }
  function newestRecord(candidates){
    return candidates.filter(Boolean).reduce((best,current)=>!best||recordTimestamp(current)>recordTimestamp(best)?current:best,null);
  }
  function isMissingStrongBaseSchema(err){
    const text=String(err?.body||err?.message||'');
    return err?.status===404||/PGRST20[245]|student_strong_base_records.*(?:does not exist|schema cache)|cycle_year.*(?:does not exist|schema cache)|save_student_strong_base.*schema cache/i.test(text);
  }
  async function loadRecordData(student){
    const localRaw=storageJSON(localDraftKey(student.id),null);
    const local=localRaw&&typeof localRaw==='object'?normalizeRecord(localRaw):null;
    const studentCloud=student?.intake_payload?.strong_base&&typeof student.intake_payload.strong_base==='object'
      ?normalizeRecord(student.intake_payload.strong_base)
      :null;
    let cloudReady=true;
    let tableRecord=null;
    try{
      const rows=await apiFetch(`student_strong_base_records?select=*&student_id=eq.${encodeURIComponent(student.id)}&limit=1`);
      const row=rows?.[0];
      const payload=row?.payload||row?.profile_payload||{};
      tableRecord=row?normalizeRecord({...payload,status:row.status||payload.status,selectedSchoolIds:row.selected_school_ids||payload.selectedSchoolIds,updatedAt:row.updated_at}):null;
    }catch(err){
      if(err.authExpired||err.status===401)throw err;
      if(isMissingStrongBaseSchema(err))cloudReady='student_record';
      else if(local||studentCloud)cloudReady=false;
      else throw err;
    }
    return {record:newestRecord([tableRecord,studentCloud,local])||defaultRecord(),cloudReady};
  }
  function applyLoadedRecord(student,loaded){
    state.record=loaded.record;state.cloudReady=loaded.cloudReady;state.recordWritable=true;state.recordLoadError='';
    const imported=profileFromStudent(student);
    Object.keys(imported).forEach(key=>{if(state.record.profile[key]===''&&imported[key]!=='')state.record.profile[key]=imported[key];});
    state.mapChoices={...state.record.mapChoices};
    state.selectedStage=firstIncompleteStage()?.id||'result';
    state.trainerSchoolId=state.record.interview.schoolId||state.record.selectedSchoolIds[0]||RULES.interviews?.[0]?.schoolId||'';
    state.trainerQuestionIndex=Number(state.record.interview.questionIndex)||0;
    saveLocalDraft(student.id,state.record,{touch:false});
  }
  async function loadWorkspaceData(){
    setSaveState('saving','正在读取');
    state.recordLoadError='';state.recordWritable=false;
    let fetchError=null;
    try{
      await fetchStudents();
    }catch(err){
      if(err.authExpired||err.status===401)throw err;
      fetchError=err;
      const cached=storageJSON(currentStudentStorageKey(),null);
      state.students=cached?.id?[cached]:[];
      if(!state.students.length){
        state.currentStudent=null;state.record=defaultRecord();state.recordLoadError=humanError(err);
        setSaveState('error','读取失败');render();toast('读取学生数据失败：'+humanError(err));return false;
      }
    }
    const chosen=findStoredStudent()||state.students[0]||null;
    if(!chosen){saveCurrentStudent(null);state.record=defaultRecord();state.recordWritable=true;render();setSaveState('saved','云端已连接');return true;}
    try{
      const loaded=await loadRecordData(chosen);
      if(fetchError)loaded.cloudReady=false;
      saveCurrentStudent(chosen);applyLoadedRecord(chosen,loaded);updateStudentHeader();render();
      setSaveState(loaded.cloudReady?'saved':'error',loaded.cloudReady?'云端已连接':'本机草稿');
      if(fetchError)toast('网络暂不可用，已打开本机草稿。');
      return true;
    }catch(err){
      if(err.authExpired||err.status===401)throw err;
      saveCurrentStudent(chosen);state.record=defaultRecord();state.cloudReady=false;state.recordWritable=false;state.recordLoadError=humanError(err);
      setSaveState('error','读取失败');render();toast('读取强基档案失败：'+humanError(err));return false;
    }
  }

  function setSaveState(kind,label){
    const el=$('#saveState');if(!el)return;el.dataset.state=kind;el.textContent=label;
  }
  function toast(message){
    const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');
    clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
  }
  function queueSave(message='修改已保存'){
    if(!state.currentStudent?.id||!state.recordWritable)return;
    saveLocalDraft();setSaveState('saving','保存中');clearTimeout(state.saveTimer);
    state.saveTimer=setTimeout(()=>{state.saveTimer=null;saveRecord(message,{fromTimer:true});},650);
  }
  async function flushPendingSave(){
    if(state.saveTimer){clearTimeout(state.saveTimer);state.saveTimer=null;await saveRecord('',{fromTimer:true});}
    else if(state.savePromise)await state.savePromise;
  }
  async function saveStudentFallback(studentId,snapshot){
    const rows=await apiFetch(`students?select=intake_payload&id=eq.${encodeURIComponent(studentId)}&limit=1`);
    const intake=rows?.[0]?.intake_payload&&typeof rows[0].intake_payload==='object'?rows[0].intake_payload:{};
    await apiFetch(`students?id=eq.${encodeURIComponent(studentId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({strong_base_status:snapshot.status||'准备中',intake_payload:{...intake,strong_base:snapshot}})});
    return intake;
  }
  async function saveRecord(message='修改已保存',options={}){
    if(!state.currentStudent?.id||!state.record||!state.recordWritable)return false;
    if(!options.fromTimer){clearTimeout(state.saveTimer);state.saveTimer=null;}
    const studentId=state.currentStudent.id;const snapshot=clone(state.record);snapshot.updatedAt=nowISO();
    state.record.updatedAt=snapshot.updatedAt;saveLocalDraft(studentId,snapshot,{touch:false});
    if(!state.cloudReady){setSaveState('error','本机草稿');return false;}
    const operation=async()=>{
    try{
      if(state.cloudReady==='student_record'){
        const intake=await saveStudentFallback(studentId,snapshot);
        if(state.currentStudent?.id===studentId)state.currentStudent.intake_payload={...intake,strong_base:snapshot};
      }else{
        try{await apiFetch('rpc/save_student_strong_base',{method:'POST',body:JSON.stringify({p_student_id:studentId,p_status:snapshot.status||'准备中',p_payload:snapshot})});}
        catch(err){if(!isMissingStrongBaseSchema(err))throw err;state.cloudReady='student_record';const intake=await saveStudentFallback(studentId,snapshot);if(state.currentStudent?.id===studentId)state.currentStudent.intake_payload={...intake,strong_base:snapshot};}
      }
      if(state.currentStudent?.id===studentId){setSaveState('saved','已保存');if(message)toast(message);}return true;
    }catch(err){
      if(err.authExpired||err.status===401){returnToLogin('登录状态已过期');return false;}
      if(state.currentStudent?.id===studentId){setSaveState('error','本机草稿');toast('云端保存失败，修改已保留在本机：'+humanError(err));}return false;
    }
    };
    state.savePromise=(state.savePromise||Promise.resolve()).catch(()=>false).then(operation);
    return state.savePromise;
  }

  function scoreSummary(student=state.currentStudent){
    if(!student)return '尚未选择学生';
    const subjects=unique(student.subject_choices||student.second_subjects||[]);
    const first=student.subject_type==='history'?'历史':'物理';
    const score=studentValue(student,'gaokao_score','estimated_score','score');
    const rank=studentValue(student,'gaokao_rank','estimated_rank','rank');
    return `${first}${subjects.length?'+'+subjects.join('+'):''}${score?`｜${score} 分`:''}${rank?`｜位次 ${rank}`:''}`;
  }
  function updateStudentHeader(){
    const student=state.currentStudent;
    $('#studentName').textContent=student?.name||'请选择学生';
    $('#studentAvatar').textContent=student?.name?.slice(0,1)||'未';
    const progress=readiness();
    $('#cycleProgressBar').style.width=`${progress}%`;
    $('#cycleProgressText').textContent=`准备度 ${progress}%`;
  }

  function readiness(){
    const profile=state.record?.profile||{};
    const profileKeys=['recentScore','scoreTrend','ordinaryBaseline','careerDirection','regionPreference','acceptsLongDegree','acceptsNoTransfer','acceptsEarlyLock','riskTolerance'];
    const profileDone=profileKeys.filter(key=>String(profile[key]??'').trim()).length;
    const totalTasks=(CORE.stages||[]).flatMap(stage=>stage.tasks||[]).length;
    const taskDone=Object.values(state.record?.tasks||{}).filter(Boolean).length;
    const totalChecks=(CORE.brochureChecks||[]).flatMap(group=>group.items||[]).length;
    const checkDone=Object.values(state.record?.brochureChecks||{}).filter(Boolean).length;
    const statementDone=Object.values(state.record?.statement||{}).filter(value=>String(value||'').trim()).length;
    const numerator=profileDone+taskDone+checkDone+statementDone;
    const denominator=profileKeys.length+totalTasks+totalChecks+(CORE.statementSections||[]).length;
    return Math.round((numerator/Math.max(denominator,1))*100);
  }
  function completedTaskCount(){return Object.values(state.record?.tasks||{}).filter(Boolean).length;}
  function totalTaskCount(){return (CORE.stages||[]).flatMap(stage=>stage.tasks||[]).length;}
  function completedCheckCount(){return Object.values(state.record?.brochureChecks||{}).filter(Boolean).length;}
  function totalCheckCount(){return (CORE.brochureChecks||[]).flatMap(group=>group.items||[]).length;}
  function stageDone(stage){return (stage.tasks||[]).every(task=>state.record?.tasks?.[task.id]);}
  function firstIncompleteStage(){return (CORE.stages||[]).find(stage=>!stageDone(stage))||null;}
  function verificationLabel(school){
    const status=school.verification?.status;
    if(status==='blocked')return ['资料不足','red'];
    if(status==='official_verified')return ['江苏官方已核','green'];
    if(status==='source_checked')return ['原稿线索，待官方核验','orange'];
    return ['待江苏官方核验','orange'];
  }

  function pageHead(eyebrow,title,description,actions=''){
    return `<header class="page-head"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${actions?`<div class="page-actions">${actions}</div>`:''}</header>`;
  }
  function emptyStudentHTML(){
    return `${pageHead('STRONG BASE 2026','先选择一个学生','强基策略、报名任务和训练记录都按学生独立保存。')}<div class="empty-state"><strong>还没有可用的学生档案</strong><p>先在学生档案中建立学生，或确认当前账号拥有对应学生的查看权限。</p><a class="button primary" href="../students/index.html">去学生档案</a></div>`;
  }
  function recordLoadErrorHTML(){
    return `${pageHead('STRONG BASE 2026','强基档案暂未安全打开','为避免用空白内容覆盖云端原记录，本页已暂停编辑。')}<div class="empty-state"><strong>读取失败，尚未写入任何内容</strong><p>${esc(state.recordLoadError||'请检查网络后重试。')}</p><button class="button primary" type="button" id="retryWorkspace">重新读取</button></div>`;
  }

  function render(){
    if(!state.record)state.record=defaultRecord();
    $$('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.view===state.view));
    if(state.recordLoadError){$('#appView').innerHTML=recordLoadErrorHTML();updateStudentHeader();bindView();return;}
    if(!state.currentStudent){$('#appView').innerHTML=emptyStudentHTML();updateStudentHeader();return;}
    const renderers={dashboard:renderDashboard,profile:renderProfile,map:renderMap,majors:renderMajors,schools:renderSchools,timeline:renderTimeline,brochure:renderBrochure,interview:renderInterview,statement:renderStatement,sources:renderSources};
    $('#appView').innerHTML=(renderers[state.view]||renderDashboard)();
    updateStudentHeader();bindView();
  }

  function renderDashboard(){
    const progress=readiness();
    const next=firstIncompleteStage();
    const selected=state.record.selectedSchoolIds.length;
    const focus=[];
    if(!state.record.profile.ordinaryBaseline)focus.push({icon:'基',title:'补全普通批基线',detail:'强基不是孤立方案，先明确不走强基时的学校与专业。',view:'profile'});
    if(!state.record.profile.acceptsNoTransfer)focus.push({icon:'限',title:'确认专业限制接受度',detail:'多数学校限制本科阶段转专业，不能把跨转当作保证。',view:'profile'});
    if(selected===0)focus.push({icon:'校',title:'建立第一版待核研究清单',detail:'从决策地图逐层展开，把原稿线索加入清单，再逐校完成江苏官方核验。',view:'map'});
    if(completedCheckCount()<Math.min(6,totalCheckCount()))focus.push({icon:'核',title:'启动简章六项核对',detail:'江苏计划、入围公式、校测、报名、培养和身体限制逐项留痕。',view:'brochure'});
    if(!focus.length)focus.push({icon:'练',title:'进入目标校面试训练',detail:'从往年形式整理出的训练改编题开始，完成一次作答与复盘。',view:'interview'});
    return `
      <section class="hero-panel">
        <div class="hero-copy">
          <span class="eyebrow">2026 强基计划 · 江苏</span>
          <h1>${esc(state.currentStudent.name)}，先把“为什么报、能不能学、愿不愿承担风险”说清楚。</h1>
          <p>${esc(scoreSummary())}。系统先用普通批基线和专业边界筛选，再比较校测时机、入围方式与培养路径；不会把历史降分或转段个案当成承诺。</p>
          <button class="button primary" type="button" data-go-view="${next?'timeline':'map'}">${next?`继续：${esc(next.label)}`:'查看决策地图'} →</button>
        </div>
        <div class="hero-aside">
          <div><span class="eyebrow">READINESS</span><h3>强基准备度</h3><p>只反映信息和任务完成程度，不代表报名资格或录取概率。</p></div>
          <div class="readiness-ring" style="--progress:${progress}%"><div><strong>${progress}%</strong><small>准备度</small></div></div>
        </div>
      </section>
      <section class="metric-grid">
        <article class="metric-card"><span>研究清单</span><strong>${selected}</strong><small>所院校，均需核对江苏计划</small></article>
        <article class="metric-card"><span>报名任务</span><strong>${completedTaskCount()}/${totalTaskCount()}</strong><small>${next?`下一阶段：${esc(next.label)}`:'五阶段已完成'}</small></article>
        <article class="metric-card"><span>简章核对</span><strong>${completedCheckCount()}/${totalCheckCount()}</strong><small>每一项都要落到官方原文</small></article>
        <article class="metric-card"><span>资料基线</span><strong>6</strong><small>份原稿已结构化，冲突未隐藏</small></article>
      </section>
      <section class="dashboard-grid">
        <div class="panel"><div class="panel-head"><div><h2>现在最该做什么</h2><p>根据当前学生记录自动生成，不输出录取概率。</p></div></div><div class="focus-list">${focus.slice(0,4).map(item=>`<div class="focus-item"><span class="focus-icon">${esc(item.icon)}</span><div><b>${esc(item.title)}</b><p>${esc(item.detail)}</p></div><button class="button" type="button" data-go-view="${esc(item.view)}">去完成</button></div>`).join('')}</div></div>
        <div class="panel"><div class="panel-head"><div><h2>五阶段进度</h2><p>从适配判断一直跟到录取与材料归档。</p></div><button class="panel-link" type="button" data-go-view="timeline">完整时间线</button></div><div class="mini-timeline">${(CORE.stages||[]).map(stage=>`<div class="mini-step ${stageDone(stage)?'done':next?.id===stage.id?'current':''}"><b>${esc(stage.label)}</b><small>${esc(stage.window)}｜${esc(stage.description)}</small></div>`).join('')}</div></div>
      </section>`;
  }

  function choiceHTML(name,value,label,current){
    return `<label class="choice"><input type="radio" name="${esc(name)}" value="${esc(value)}" ${String(current)===String(value)?'checked':''}><span>${esc(label)}</span></label>`;
  }
  function renderProfile(){
    const p=state.record.profile;
    const disciplineOptions=['数学/信息','物理/电子','力学/空天','化学/材料','生物/医学','海洋/地球','文史哲'];
    return `${pageHead('STUDENT PROFILE','学生强基画像','把成绩底座、普通批方案、专业兴趣和风险边界放在同一张图里。','<button class="button primary" type="button" id="saveProfileNow">立即保存</button>')}
      <section class="profile-layout">
        <form id="profileForm" class="form-panel">
          <section class="form-section"><h2>一、成绩底座与学情走势</h2><p>分数只用于建立对话基线；正式判断应转成江苏位次并结合当年线差。</p><div class="form-grid">
            <label class="field"><span>最近/预估总分</span><input name="recentScore" inputmode="numeric" value="${esc(p.recentScore)}" placeholder="如 648"></label>
            <label class="field"><span>最近/预估位次</span><input name="recentRank" inputmode="numeric" value="${esc(p.recentRank)}" placeholder="如 3200"></label>
            <label class="field"><span>数学</span><input name="mathScore" inputmode="numeric" value="${esc(p.mathScore)}" placeholder="满分 150"></label>
            <label class="field"><span>物理</span><input name="physicsScore" inputmode="numeric" value="${esc(p.physicsScore)}" placeholder="等级赋分或原始分备注"></label>
            <label class="field"><span>化学</span><input name="chemistryScore" inputmode="numeric" value="${esc(p.chemistryScore)}"></label>
            <label class="field"><span>生物</span><input name="biologyScore" inputmode="numeric" value="${esc(p.biologyScore)}"></label>
            <div class="field wide"><span>成绩趋势</span><div class="choice-grid">${[['rising','持续走高'],['stable','相对稳定'],['volatile','波动较大']].map(x=>choiceHTML('scoreTrend',x[0],x[1],p.scoreTrend)).join('')}</div></div>
            <div class="field"><span>笔试能力</span><div class="choice-grid">${[['strong','强'],['medium','中'],['weak','弱']].map(x=>choiceHTML('writtenStrength',x[0],x[1],p.writtenStrength)).join('')}</div></div>
            <div class="field"><span>面试表达</span><div class="choice-grid">${[['strong','强'],['medium','中'],['weak','弱']].map(x=>choiceHTML('interviewStrength',x[0],x[1],p.interviewStrength)).join('')}</div></div>
          </div></section>
          <section class="form-section"><h2>二、普通批基线</h2><p>这是所有强基决策的底线参照，不能省略。</p><div class="form-grid"><label class="field wide"><span>不走强基时，普通批可去哪里、可保什么专业？</span><textarea name="ordinaryBaseline" placeholder="如：省内可比较哪些学校/专业；省外可接受到什么层次；最不愿牺牲什么。">${esc(p.ordinaryBaseline)}</textarea></label></div></section>
          <section class="form-section"><h2>三、专业与职业倾向</h2><p>招生名称、培养方向和研究生可申请方向必须分开理解。</p><div class="form-grid">
            <div class="field wide"><span>愿意深入研究的方向</span><div class="choice-grid">${disciplineOptions.map(label=>`<label class="choice"><input type="checkbox" name="preferredDisciplines" value="${esc(label)}" ${(p.preferredDisciplines||[]).includes(label)?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div></div>
            <label class="field wide"><span>明确拒绝的专业/培养方式</span><textarea name="rejectedDisciplines" placeholder="如：不接受纯生物；不接受本科不能调整方向；不接受必须长期实验室工作。">${esc(p.rejectedDisciplines)}</textarea></label>
            <label class="field"><span>职业方向</span><select name="careerDirection"><option value="">请选择</option>${[['research','学术科研'],['public','央国企/体制内'],['market','市场化就业/新工科'],['undecided','尚未明确']].map(x=>`<option value="${x[0]}" ${p.careerDirection===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></label>
            <label class="field"><span>地域边界</span><select name="regionPreference"><option value="">请选择</option>${[['yangtze','必须长三角'],['hub','可接受强城市'],['nationwide','全国均可'],['home','尽量江苏']].map(x=>`<option value="${x[0]}" ${p.regionPreference===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></label>
          </div></section>
          <section class="form-section"><h2>四、长期培养与风险边界</h2><p>这些答案比“能降多少分”更重要。</p><div class="form-grid">
            <div class="field"><span>接受 8—10 年长学制</span><div class="choice-grid">${[['yes','接受'],['uncertain','需讨论'],['no','不接受']].map(x=>choiceHTML('acceptsLongDegree',x[0],x[1],p.acceptsLongDegree)).join('')}</div></div>
            <div class="field"><span>接受直博可能</span><div class="choice-grid">${[['yes','接受'],['uncertain','需讨论'],['no','不接受']].map(x=>choiceHTML('acceptsDirectPhd',x[0],x[1],p.acceptsDirectPhd)).join('')}</div></div>
            <div class="field"><span>接受本科专业受限</span><div class="choice-grid">${[['yes','接受'],['uncertain','需讨论'],['no','不接受']].map(x=>choiceHTML('acceptsNoTransfer',x[0],x[1],p.acceptsNoTransfer)).join('')}</div></div>
            <div class="field"><span>接受出分前校测风险</span><div class="choice-grid">${[['yes','接受'],['uncertain','需讨论'],['no','不接受']].map(x=>choiceHTML('acceptsEarlyLock',x[0],x[1],p.acceptsEarlyLock)).join('')}</div></div>
            <label class="field"><span>整体风险偏好</span><select name="riskTolerance"><option value="">请选择</option>${[['strict','低风险'],['balanced','中风险'],['aggressive','高风险']].map(x=>`<option value="${x[0]}" ${p.riskTolerance===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></label>
            <label class="field"><span>英语能力</span><select name="englishStrength"><option value="">请选择</option>${[['strong','可完成英语问答/阅读'],['medium','基本应对'],['weak','需专项准备']].map(x=>`<option value="${x[0]}" ${p.englishStrength===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></label>
            <label class="field wide"><span>顾问/家庭补充备注</span><textarea name="notes">${esc(p.notes)}</textarea></label>
          </div></section>
        </form>
        <aside class="sticky-summary"><div class="summary-card"><span class="eyebrow">PROFILE SNAPSHOT</span><h2>${esc(state.currentStudent.name)}的判断底座</h2><div class="summary-list">
          <div class="summary-row"><span>当前成绩</span><b>${esc(p.recentScore||'未填')} / 位次 ${esc(p.recentRank||'未填')}</b></div>
          <div class="summary-row"><span>单科优势</span><b>${esc(subjectStrengthText(p))}</b></div>
          <div class="summary-row"><span>普通批基线</span><b>${p.ordinaryBaseline?'已记录':'未记录'}</b></div>
          <div class="summary-row"><span>专业方向</span><b>${esc((p.preferredDisciplines||[]).join('、')||'未选择')}</b></div>
          <div class="summary-row"><span>提前校测</span><b>${esc(choiceLabel(p.acceptsEarlyLock))}</b></div>
          <div class="summary-row"><span>专业受限</span><b>${esc(choiceLabel(p.acceptsNoTransfer))}</b></div>
        </div><p class="summary-note">画像用于整理决策条件，不是自动录取判断。下一步应在“决策地图”中展开校测路径，再到“院校矩阵”核对每所学校。</p></div></aside>
      </section>`;
  }

  function choiceLabel(value){return ({yes:'接受',no:'不接受',uncertain:'需讨论',strict:'低风险',balanced:'中风险',aggressive:'高风险'})[value]||'未填写';}
  function subjectStrengthText(p){
    const scores=[['数学',p.mathScore],['物理',p.physicsScore],['化学',p.chemistryScore],['生物',p.biologyScore]].filter(x=>x[1]!==''&&x[1]!==null);
    if(!scores.length)return '未录入';
    return scores.sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,2).map(x=>`${x[0]} ${x[1]}`).join('、');
  }

  function derivedMapChoices(){
    const p=state.record.profile;const stored=state.record.mapChoices||{};
    let major=stored.major||'';
    if(!major){
      const text=(p.preferredDisciplines||[]).join(' ');
      if(/信息|电子/.test(text))major='new-engineering';else if(/力学|空天/.test(text))major='traditional-engineering';else if(/文史哲/.test(text))major='humanities';else if(text)major='basic';
    }
    let assessment=stored.assessment||'';
    if(!assessment){assessment=p.acceptsEarlyLock==='yes'&&p.writtenStrength==='strong'?'early-written':p.interviewStrength==='strong'?'interview-only':p.acceptsEarlyLock==='no'?'post-written':'';}
    return {trend:stored.trend||p.scoreTrend||'',major,assessment,risk:stored.risk||p.riskTolerance||''};
  }
  function mapCandidates(choices=derivedMapChoices()){
    return (RULES.schools||[]).filter(school=>{
      if(!school.researchable)return false;
      const values=Object.values(choices).filter(Boolean);
      return !values.length||values.every(value=>(school.fit||[]).includes(value)||value===choices.trend);
    });
  }
  function renderMap(){
    const choices=derivedMapChoices();
    const steps=[['trend','第 1 层｜成绩走势',CORE.mapBranches.trend],['major','第 2 层｜专业目标',CORE.mapBranches.major],['assessment','第 3 层｜校测适配',CORE.mapBranches.assessment],['risk','第 4 层｜风险边界',CORE.mapBranches.risk]];
    const candidates=mapCandidates(choices);
    return `${pageHead('DECISION MAP','强基决策地图','像思维导图一样逐层展开：每点一个判断，下面的路径和院校研究清单都会跟着变化。','<button class="button ghost" type="button" id="resetMap">重置路径</button><button class="button primary" type="button" data-go-view="schools">进入院校矩阵</button>')}
      <section class="map-shell"><div class="map-toolbar"><p>当前路径：${esc(Object.values(choices).filter(Boolean).map(value=>branchLabel(value)).join(' → ')||'请从第一层开始')}</p><div class="map-toolbar-actions"><span class="badge orange">待核研究线索，不是正式推荐</span></div></div>
        <div class="map-canvas">${steps.map(([key,title,items])=>`<div class="map-level" style="--cols:${Math.min(items.length,4)}">${items.map(item=>`<button class="map-node ${choices[key]===item.id?'active':''}" type="button" data-map-key="${key}" data-map-value="${item.id}"><small>${esc(title)}</small><b>${esc(item.label)}</b><p>${esc(item.hint)}</p>${choices[key]===item.id?'<i class="node-count">已选</i>':''}</button>`).join('')}</div>`).join('')}</div>
        <div class="map-result-strip"><h3>当前路径下的待核研究线索 · ${candidates.length} 所</h3><div class="map-result-list">${candidates.length?candidates.slice(0,18).map(school=>`<button class="school-chip" type="button" data-school-id="${school.id}"><b>${esc(school.name)}</b><small>待江苏官方核验｜${esc(school.testStage)}｜${esc(school.testMode)}</small></button>`).join(''):'<p>当前条件过窄。可以放宽一层，或到院校矩阵查看被排除的原因。</p>'}</div></div>
      </section>`;
  }
  function branchLabel(id){
    const all=Object.values(CORE.mapBranches||{}).flat();return all.find(item=>item.id===id)?.label||id;
  }

  function renderMajors(){
    const profiles=CORE.majorProfiles||[];
    const groups=unique(profiles.map(item=>item.group));
    const visible=state.majorGroup?profiles.filter(item=>item.group===state.majorGroup):profiles;
    return `${pageHead('MAJOR & TRAINING PATH','专业与培养路径','先分清招生专业、实际培养方向和研究生可申请方向，再讨论就业与转段。','<button class="button primary" type="button" data-go-view="map">回到决策地图</button>')}
      <div class="source-policy"><b>同名专业也可能完全不同</b>判断“新工科是否真实”，至少要看培养学院、课程表、导师与实验室、转段接收学院和名额。允许申请不等于保证进入。</div>
      <div class="major-toolbar"><button class="${state.majorGroup?'':'active'}" type="button" data-major-group="">全部 28 条路径</button>${groups.map(group=>`<button class="${state.majorGroup===group?'active':''}" type="button" data-major-group="${esc(group)}">${esc(group)}</button>`).join('')}</div>
      <section class="major-grid">${visible.map(item=>`<button class="major-card" type="button" data-major-id="${item.id}"><span class="badge">${esc(item.group)}</span><span class="badge blue">${esc(item.nature)}</span><h3>${esc(item.name)}</h3><p>${esc(item.study)}</p><b>查看培养与风险 →</b></button>`).join('')}</section>`;
  }

  function openMajorDrawer(id){
    const item=(CORE.majorProfiles||[]).find(profile=>profile.id===id);if(!item)return;
    const schools=(RULES.schools||[]).filter(school=>(school.sourceMajorDirections||[]).join(' ').includes(item.name.split(/[ /]/)[0])).slice(0,8);
    const sourceBadges=(item.sourceRefs||[]).map(sourceId=>{const source=(CORE.sources||[]).find(entry=>entry.id===sourceId);return `<span class="badge">${esc(source?.title||sourceId)}</span>`;}).join('');
    $('#drawerTitle').textContent=item.name;
    $('#drawerBody').innerHTML=`
      <section class="detail-section"><div class="source-line"><span class="badge">${esc(item.group)}</span><span class="badge blue">${esc(item.nature)}</span><span class="badge orange">专业知识层，非招生计划</span></div></section>
      <section class="detail-section"><h3>内容来源层级</h3><div class="source-line">${sourceBadges}</div><p>${esc(item.sourceNotice||'')}</p></section>
      <section class="detail-section"><h3>三层信息必须分开</h3><div class="path-flow"><div class="path-step"><span>第 1 层</span><b>招生专业：简章里真正录取的名称</b></div><div class="path-step"><span>第 2 层</span><b>培养方向：学院、课程与分流后的实际训练</b></div><div class="path-step"><span>第 3 层</span><b>转段方向：满足条件后可申请的研究生路径</b></div></div></section>
      <section class="detail-section"><h3>主要学习内容</h3><p>${esc(item.study)}</p></section>
      <section class="detail-section"><h3>培养与延展方向</h3><p>${esc(item.route)}</p></section>
      <section class="detail-section"><h3>更适合什么学生</h3><p>${esc(item.fit)}</p></section>
      <section class="detail-section"><h3>必须前置说明的风险</h3><p>${esc(item.risk)}</p></section>
      <section class="detail-section"><h3>原稿中出现相关方向的学校</h3>${schools.length?`<div class="source-line">${schools.map(school=>`<button class="button" type="button" data-major-school="${school.id}">${esc(school.name)}</button>`).join('')}</div>`:'<p>暂未完成名称精确映射，请到院校矩阵按专业关键词检索。</p>'}</section>`;
    $('#schoolDrawer').classList.add('open');$('#schoolDrawer').setAttribute('aria-hidden','false');$('#drawerScrim').hidden=false;
    $$('[data-major-school]').forEach(button=>button.addEventListener('click',()=>openSchoolDrawer(button.dataset.majorSchool)));
  }

  function filteredSchools(){
    const f=state.schoolFilters;const query=f.q.trim().toLowerCase();
    return (RULES.schools||[]).filter(school=>{
      const hay=[school.name,school.city,school.entryRule,school.testMode,...(school.majorTags||[]),...(school.sourceMajorDirections||[]),...(school.jiangsuMajors||[])].join(' ').toLowerCase();
      return (!query||hay.includes(query))&&(!f.stage||school.testStage===f.stage)&&(!f.mode||school.testMode.includes(f.mode))&&(!f.region||school.region===f.region)&&(!f.verification||school.verification?.status===f.verification);
    });
  }
  function renderSchools(){
    const schools=filteredSchools();const selected=new Set(state.record.selectedSchoolIds);
    const officialCount=schools.filter(school=>school.recommendable).length;
    const options=(values,current)=>values.map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(value)}</option>`).join('');
    const regions=unique((RULES.schools||[]).map(s=>s.region));
    return `${pageHead('39-SCHOOL MATRIX','2026 院校矩阵','原稿线索只用于待核研究；完成江苏官方计划核验后，院校才可进入正式推荐。',`<span class="badge orange">待核线索 ${schools.length} 所</span><span class="badge green">正式可推荐 ${officialCount} 所</span>`)}
      <div class="source-policy"><b>硬过滤优先</b>只有当“年份=2026、省份=江苏、选科匹配、专业在江苏投放、健康与语言限制通过”时，才能进入正式推荐。当前原稿专业均为待核线索；固定裸分档不参与推荐，请改用江苏位次与普通批线差。</div>
      <div class="filter-bar"><input id="schoolQuery" value="${esc(state.schoolFilters.q)}" placeholder="搜索学校、城市、专业方向或规则"><select id="schoolStage"><option value="">全部校测时机</option>${options(['出分前','出分后','待官方简章'],state.schoolFilters.stage)}</select><select id="schoolMode"><option value="">全部考核方式</option>${options(['笔试','仅面试','上机','待官方简章'],state.schoolFilters.mode)}</select><select id="schoolRegion"><option value="">全部地区</option>${options(regions,state.schoolFilters.region)}</select><select id="schoolVerification"><option value="">全部复核状态</option><option value="source_checked" ${state.schoolFilters.verification==='source_checked'?'selected':''}>原稿含江苏线索</option><option value="needs_official_plan" ${state.schoolFilters.verification==='needs_official_plan'?'selected':''}>待核江苏计划</option><option value="blocked" ${state.schoolFilters.verification==='blocked'?'selected':''}>资料不足</option></select></div>
      <div class="school-table-wrap"><table class="school-table"><thead><tr><th>待核研究</th><th>院校</th><th>层次/地区</th><th>校测</th><th>入围原稿</th><th>专业研究线索</th><th>复核状态</th></tr></thead><tbody>${schools.map(school=>{const verify=verificationLabel(school);return `<tr><td class="check-cell"><input type="checkbox" data-toggle-school="${school.id}" ${selected.has(school.id)?'checked':''} ${!school.researchable?'disabled':''} aria-label="${esc(school.name)}加入待核研究清单"></td><td><button class="school-name-button" type="button" data-school-id="${school.id}">${esc(school.name)}</button><small>${esc(school.city)}｜${esc(school.scoreGuidance)}</small></td><td><span class="badge">${esc(school.tier)}</span><small>${esc(school.region)}</small></td><td><span class="badge ${school.testStage==='出分前'?'red':'green'}">${esc(school.testStage)}</span><small>${esc(school.testMode)}</small></td><td><p>${esc(school.entryRule)}</p><small>${esc(school.formula)}</small></td><td><p>${esc((school.sourceMajorDirections||[]).slice(0,5).join('、'))}</p>${school.jiangsuMajors?.length?`<small>原稿江苏线索（非官方计划）：${esc(school.jiangsuMajors.join('、'))}</small>`:'<small>尚未录入江苏官方专业计划</small>'}</td><td><span class="badge ${verify[1]}">${verify[0]}</span><small>资料整理 ${esc(school.verification?.lastStructuredAt||'待补')}</small></td></tr>`;}).join('')}</tbody></table></div>`;
  }

  function renderTimeline(){
    const stage=(CORE.stages||[]).find(item=>item.id===state.selectedStage)||CORE.stages?.[0];
    return `${pageHead('APPLICATION TRACKER','报名与提醒','把报名、材料、签字、确认、缴费、准考证、校测和结果变成学生级任务。','<button class="button primary" type="button" id="saveTimeline">保存进度</button>')}
      <section class="timeline-layout"><aside class="timeline-rail">${(CORE.stages||[]).map((item,index)=>`<button class="stage-button ${item.id===stage?.id?'active':''} ${stageDone(item)?'done':''}" type="button" data-stage-id="${item.id}"><span>${stageDone(item)?'✓':index+1}</span><div><b>${esc(item.label)}</b><small>${esc(item.window)}</small></div></button>`).join('')}</aside>
        <div class="panel"><div class="panel-head"><div><span class="eyebrow">${esc(stage?.window||'')}</span><h2>${esc(stage?.label||'')}</h2><p>${esc(stage?.description||'')}</p></div><span class="badge ${stageDone(stage)?'green':'orange'}">${stageDone(stage)?'已完成':'进行中'}</span></div><div class="task-list">${(stage?.tasks||[]).map(task=>`<label class="task-row ${state.record.tasks[task.id]?'done':''}"><input type="checkbox" data-task-id="${task.id}" ${state.record.tasks[task.id]?'checked':''}><div><b>${esc(task.title)}</b><p>${esc(task.detail)}</p></div><time>${state.record.tasks[task.id]?'已完成':'待处理'}</time></label>`).join('')}</div></div></section>`;
  }

  function renderBrochure(){
    return `${pageHead('OFFICIAL CHECKLIST','招生简章核对','每所目标校都要按这六组项目核对；勾选代表已经找到官方原文并记录，不是“听说过”。','<button class="button primary" type="button" id="saveBrochure">保存核对</button>')}
      <div class="source-policy"><b>核对优先级</b>教育部/阳光高考 → 高校本科招生网与 2026 简章 → 江苏省教育考试院 → 培养方案/研究生院公示 → 学院官网。讲座与历史个案不能覆盖官方规则。</div>
      <section class="checklist-grid">${(CORE.brochureChecks||[]).map(group=>`<article class="check-card"><h3>${esc(group.title)}</h3><p>${esc(group.description)}</p><div class="check-items">${group.items.map((item,index)=>{const key=`${group.id}:${index}`;return `<label class="check-item"><input type="checkbox" data-brochure-key="${esc(key)}" ${state.record.brochureChecks[key]?'checked':''}><span>${esc(item)}</span></label>`;}).join('')}</div></article>`).join('')}</section>`;
  }

  function interviewEntries(){
    const selected=new Set(state.record.selectedSchoolIds);const all=RULES.interviews||[];
    const query=state.trainerQuery.trim().toLowerCase();
    return all.filter(entry=>{
      const school=schoolById(entry.schoolId);const hay=[school?.name,...(entry.formats||[]),...(entry.questions||[])].join(' ').toLowerCase();
      return (!query||hay.includes(query))&&(!selected.size||selected.has(entry.schoolId)||entry.schoolId===state.trainerSchoolId);
    });
  }
  function schoolById(id){return (RULES.schools||[]).find(s=>s.id===id);}
  function interviewReview(schoolId,questionIndex){return (state.record.interview.reviews||[]).find(item=>item.schoolId===schoolId&&Number(item.questionIndex)===Number(questionIndex))||null;}
  function captureInterviewDraft(){
    if(!state.trainerSchoolId||!$('#interviewAnswer'))return;
    const answer=$('#interviewAnswer').value;const ratings=Object.fromEntries($$('[data-interview-rating]').map(input=>[input.dataset.interviewRating,Number(input.value)]));
    const review={schoolId:state.trainerSchoolId,questionIndex:state.trainerQuestionIndex,answer,ratings,updatedAt:nowISO()};
    const reviews=(state.record.interview.reviews||[]).filter(item=>!(item.schoolId===review.schoolId&&Number(item.questionIndex)===Number(review.questionIndex)));
    state.record.interview={...state.record.interview,...review,reviews:[...reviews,review]};
  }
  function renderInterview(){
    const entries=interviewEntries();let entry=(RULES.interviews||[]).find(x=>x.schoolId===state.trainerSchoolId)||entries[0]||RULES.interviews?.[0];
    const school=schoolById(entry?.schoolId);const questions=entry?.questions||[];const missingSource=entry?.availability==='missing_source';const index=Math.min(state.trainerQuestionIndex,Math.max(questions.length-1,0));const question=questions[index]||'该校暂无可追溯的面试题，待补可靠来源。';
    const savedReview=interviewReview(entry?.schoolId,index);const legacy=state.record.interview.schoolId===entry?.schoolId&&Number(state.record.interview.questionIndex)===index?state.record.interview:null;
    const draft=savedReview?.answer??legacy?.answer??'';const reviewRatings={...state.record.interview.ratings,...(legacy?.ratings||{}),...(savedReview?.ratings||{})};
    return `${pageHead('INTERVIEW LAB','面试训练','题目依据往年回忆的形式或主题整理为训练改编题，不是原题，也不代表 2026 年会考。',missingSource?'<span class="badge orange">暂无来源待补</span>':'<button class="button primary" type="button" id="saveInterview">保存本次训练</button>')}
      <section class="trainer-layout"><aside class="trainer-list"><input id="trainerQuery" class="trainer-search" value="${esc(state.trainerQuery)}" placeholder="搜索学校或题目">${entries.map(item=>{const s=schoolById(item.schoolId);return `<button class="trainer-school ${item.schoolId===entry?.schoolId?'active':''}" type="button" data-trainer-school="${item.schoolId}"><b>${esc(s?.name||item.schoolId)}</b><small>${esc((item.formats||[]).join(' / '))}</small></button>`;}).join('')}</aside>
        <div class="trainer-stage"><span class="eyebrow">MOCK INTERVIEW · 训练改编</span><h2>${esc(school?.name||'面试训练')}</h2><div class="format-line">${(entry?.formats||[]).map(format=>`<span class="badge blue">${esc(format)}</span>`).join('')}<span class="badge orange">${missingSource?'暂无来源待补':'训练改编题 · 非 2026 真题'}</span></div><p>${esc(entry?.prep||'')}</p><p class="verify-mark">${esc(entry?.notice||'')}</p>
          <div class="question-card"><span class="eyebrow">${missingSource?'SOURCE GAP':`TRAINING QUESTION ${index+1} / ${Math.max(questions.length,1)}`}</span><blockquote>${esc(question)}</blockquote>${missingSource?'':`<div class="page-actions" style="justify-content:flex-start"><button class="button" id="prevQuestion" type="button" ${index<=0?'disabled':''}>上一题</button><button class="button" id="nextQuestion" type="button" ${index>=questions.length-1?'disabled':''}>下一题</button></div>`}</div>
          ${missingSource?'':`<div class="question-card"><label class="field"><span>作答与复盘</span><textarea id="interviewAnswer" class="answer-area" placeholder="建议先限时口述，再记录结构、证据与卡顿点。">${esc(draft)}</textarea></label><div class="review-grid">${[['academic','学术准确性'],['logic','逻辑结构'],['expression','表达与应变']].map(([key,label])=>`<label>${esc(label)} <span><b data-rating-label="${key}">${esc(reviewRatings[key]||3)}</b>/5</span><input type="range" min="1" max="5" value="${esc(reviewRatings[key]||3)}" data-interview-rating="${key}"></label>`).join('')}</div></div>`}
        </div></section>`;
  }

  function statementText(){
    const parts=(CORE.statementSections||[]).map(section=>String(state.record.statement[section.id]||'').trim()).filter(Boolean);
    return parts.join('\n\n');
  }
  function renderStatement(){
    const text=statementText();
    return `${pageHead('STATEMENT WORKBENCH','个人陈述素材台','先积累可验证的真实素材，再根据目标校当年要求决定是否需要成文；不要直接套模板。','<button class="button primary" type="button" id="saveStatement">保存素材</button>')}
      <section class="statement-layout"><div class="material-board">${(CORE.statementSections||[]).map(section=>`<article class="material-card"><h3>${esc(section.title)}</h3><textarea data-statement-key="${section.id}" placeholder="${esc(section.prompt)}">${esc(state.record.statement[section.id]||'')}</textarea></article>`).join('')}</div>
        <aside class="statement-preview"><span class="eyebrow">MATERIAL CHECK</span><h2>事实素材完整度</h2><span class="word-count">当前约 ${text.replace(/\s/g,'').length} 字｜${Object.values(state.record.statement).filter(v=>String(v||'').trim()).length}/${(CORE.statementSections||[]).length} 组素材</span><p>${text?esc(text.slice(0,360))+(text.length>360?'…':''):'开始填写左侧素材后，这里会显示内容摘要。'}</p><ol><li>每个结论都能被追问和验证。</li><li>明确自己做了什么，而不是团队做了什么。</li><li>学校匹配写课程、实验室和研究问题，不写空泛赞美。</li><li>任何夸张、代写或无法证明的经历都应删除。</li></ol></aside>
      </section>`;
  }

  function renderSources(){
    return `${pageHead('PROVENANCE','来源与复核','六份原稿是知识与策略基线；所有年度规则、计划和限制仍要回到官方来源。')}
      <div class="source-policy"><b>系统不会隐藏冲突</b>“提前校测 11/12 所”“强制直博”“二八开”“转工比例”“降分幅度”等在原稿中存在年份混用、口径冲突或非官方判断，均不能直接成为硬规则。</div>
      <section class="source-list">${(CORE.sources||[]).map(source=>`<article class="source-card"><div><h3>${esc(source.title)}</h3><p>${esc(source.scope)}</p><div class="source-meta"><span class="badge">${esc(source.kind)}</span><span class="badge blue">${esc(source.lines)} 行</span><span class="badge orange">${esc(source.status)}</span></div></div><a href="${esc(source.yuque)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></article>`).join('')}</section>
      <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>上线核对原则</h2><p>推荐引擎必须按固定顺序执行。</p></div></div><div class="focus-list">${['年份必须是 2026','省份必须是江苏','首选与再选科目匹配','专业确实在江苏投放计划','健康、体测与语言限制通过','再比较入围公式、校测适配与培养风险'].map((item,index)=>`<div class="focus-item"><span class="focus-icon">${index+1}</span><div><b>${esc(item)}</b><p>${index<5?'硬过滤条件，不满足就停止资格判断。':'只输出条件推荐与待核项，不输出保证。'}</p></div></div>`).join('')}</div></section>`;
  }

  function openSchoolDrawer(id){
    const school=schoolById(id);if(!school)return;
    const verify=verificationLabel(school);
    $('#drawerTitle').textContent=school.name;
    $('#drawerBody').innerHTML=`
      <section class="detail-section"><div class="source-line"><span class="badge">${esc(school.tier)}</span><span class="badge">${esc(school.city)}</span><span class="badge ${school.testStage==='出分前'?'red':'green'}">${esc(school.testStage)}</span><span class="badge ${verify[1]}">${verify[0]}</span></div><p>${esc(school.verification?.notice||'')}</p></section>
      <section class="detail-section"><h3>入围与校测</h3><div class="detail-grid"><div class="detail-cell"><span>校测时机</span><b>${esc(school.testStage)}</b></div><div class="detail-cell"><span>考核形式</span><b>${esc(school.testMode)}</b></div><div class="detail-cell"><span>入围倍数</span><b>${esc(school.multiplier)}</b></div><div class="detail-cell"><span>报名模式</span><b>${esc(school.applicationMode)}</b></div></div><p>${esc(school.entryRule)}</p><p>${esc(school.formula)}</p></section>
      <section class="detail-section"><h3>原稿专业研究线索</h3><p>${esc((school.sourceMajorDirections||[]).join('、')||'暂无')}</p>${school.jiangsuMajors?.length?`<p><b>原稿明确提到的江苏线索：</b>${esc(school.jiangsuMajors.join('、'))}</p>`:'<p class="verify-mark">尚未录入 2026 江苏官方专业计划，不能据此判断可报名。</p>'}</section>
      <section class="detail-section"><h3>培养与转段</h3><p>${esc(school.transferPolicy)}</p><p>允许申请、培养方向和往届实际去向是三类不同信息；最终以当届培养方案和接收条件为准。</p></section>
      <section class="detail-section"><h3>需要前置讨论的风险</h3><ul>${(school.riskNotes||[]).map(note=>`<li>${esc(note)}</li>`).join('')}</ul></section>
      <section class="detail-section"><h3>来源状态</h3><div class="source-line">${(school.verification?.sourceRefs||[]).map(id=>{const source=(CORE.sources||[]).find(s=>s.id===id);return `<span class="badge">${esc(source?.title||id)}</span>`;}).join('')}</div><p>资料整理日期：${esc(school.verification?.lastStructuredAt||'待补')}｜官方核验日期：${esc(school.verification?.officialVerifiedAt||'尚未核验')}｜适用标记：${esc(school.verification?.year||'')} 年 / ${esc(school.verification?.province||'')}</p></section>
      <button class="button primary" type="button" data-drawer-toggle-school="${school.id}" ${!school.researchable?'disabled':''}>${state.record.selectedSchoolIds.includes(school.id)?'移出待核研究清单':'加入待核研究清单'}</button>`;
    $('#schoolDrawer').classList.add('open');$('#schoolDrawer').setAttribute('aria-hidden','false');$('#drawerScrim').hidden=false;
    $('[data-drawer-toggle-school]')?.addEventListener('click',()=>{toggleSchool(id);openSchoolDrawer(id);});
  }
  function closeDrawer(){
    $('#schoolDrawer').classList.remove('open');$('#schoolDrawer').setAttribute('aria-hidden','true');$('#drawerScrim').hidden=true;
  }
  function toggleSchool(id){
    const school=schoolById(id);if(!school?.researchable){toast('该校资料不足，暂不能加入研究清单');return;}
    const set=new Set(state.record.selectedSchoolIds);set.has(id)?set.delete(id):set.add(id);state.record.selectedSchoolIds=[...set];queueSave('院校研究清单已更新');render();
  }

  function openStudentPicker(){
    $('#modal').innerHTML=`<div class="modal-head"><h2 id="modalTitle">选择当前学生</h2><button class="icon-button" type="button" data-close-modal aria-label="关闭">×</button></div><div class="modal-body"><div class="student-list">${state.students.length?state.students.map(student=>`<button class="student-option" type="button" data-select-student="${student.id}"><span class="student-avatar">${esc(student.name?.slice(0,1)||'生')}</span><span><b>${esc(student.name)}</b><small>${esc(scoreSummary(student))}</small></span><i>${student.id===state.currentStudent?.id?'当前':'选择'}</i></button>`).join(''):'<div class="empty-state"><strong>暂无学生</strong><p>请先在学生档案中建立学生。</p></div>'}</div></div><div class="modal-actions"><a class="button" href="../students/index.html">管理学生档案</a></div>`;
    $('#modalMask').hidden=false;
    $$('[data-close-modal]').forEach(el=>el.addEventListener('click',closeModal));
    $$('[data-select-student]').forEach(button=>button.addEventListener('click',()=>selectStudent(button.dataset.selectStudent)));
  }
  function closeModal(){$('#modalMask').hidden=true;}
  async function selectStudent(id){
    if(state.loadingStudent)return;const student=state.students.find(item=>item.id===id);if(!student)return;
    const previous={student:state.currentStudent,record:state.record,cloudReady:state.cloudReady,recordWritable:state.recordWritable,recordLoadError:state.recordLoadError};
    state.loadingStudent=true;closeModal();setSaveState('saving','正在切换');
    try{
      await flushPendingSave();
      const loaded=await loadRecordData(student);
      saveCurrentStudent(student);applyLoadedRecord(student,loaded);updateStudentHeader();render();setSaveState(state.cloudReady?'saved':'error',state.cloudReady?'云端已连接':'本机草稿');toast(`已切换到 ${student.name}`);
    }catch(err){
      if(err.authExpired||err.status===401||!state.auth.user){returnToLogin('登录状态已过期');return;}
      saveCurrentStudent(previous.student);state.record=previous.record;state.cloudReady=previous.cloudReady;state.recordWritable=previous.recordWritable;state.recordLoadError=previous.recordLoadError;
      updateStudentHeader();render();setSaveState('error','切换失败');toast('切换学生失败：'+humanError(err));
    }
    finally{state.loadingStudent=false;}
  }

  function collectProfileForm(form){
    const data=new FormData(form);const next={...state.record.profile};
    Object.keys(next).forEach(key=>{if(key==='preferredDisciplines')return;if(data.has(key))next[key]=String(data.get(key)||'').trim();});
    next.preferredDisciplines=data.getAll('preferredDisciplines').map(String);
    state.record.profile=next;
  }
  function bindView(){
    $('#retryWorkspace')?.addEventListener('click',()=>loadWorkspaceData().catch(err=>{if(err.authExpired||err.status===401)returnToLogin('登录状态已过期');}));
    $$('[data-go-view]').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.goView;render();$('#appView').focus({preventScroll:true});scrollTo({top:0,behavior:'smooth'});}));
    $$('[data-school-id]').forEach(button=>button.addEventListener('click',()=>openSchoolDrawer(button.dataset.schoolId)));
    const form=$('#profileForm');
    if(form){form.addEventListener('input',()=>{collectProfileForm(form);queueSave('学生画像已更新');updateStudentHeader();});$('#saveProfileNow')?.addEventListener('click',()=>{collectProfileForm(form);saveRecord('学生画像已保存');});}
    $$('[data-map-key]').forEach(button=>button.addEventListener('click',()=>{state.record.mapChoices[button.dataset.mapKey]=button.dataset.mapValue;state.mapChoices={...state.record.mapChoices};queueSave('决策路径已更新');render();}));
    $('#resetMap')?.addEventListener('click',()=>{state.record.mapChoices={trend:'',major:'',assessment:'',risk:''};queueSave('决策路径已重置');render();});
    $$('[data-major-group]').forEach(button=>button.addEventListener('click',()=>{state.majorGroup=button.dataset.majorGroup;render();}));
    $$('[data-major-id]').forEach(button=>button.addEventListener('click',()=>openMajorDrawer(button.dataset.majorId)));
    $('#schoolQuery')?.addEventListener('input',event=>{state.schoolFilters.q=event.target.value;render();$('#schoolQuery')?.focus();});
    [['schoolStage','stage'],['schoolMode','mode'],['schoolRegion','region'],['schoolVerification','verification']].forEach(([id,key])=>$('#'+id)?.addEventListener('change',event=>{state.schoolFilters[key]=event.target.value;render();}));
    $$('[data-toggle-school]').forEach(input=>input.addEventListener('change',()=>toggleSchool(input.dataset.toggleSchool)));
    $$('[data-stage-id]').forEach(button=>button.addEventListener('click',()=>{state.selectedStage=button.dataset.stageId;render();}));
    $$('[data-task-id]').forEach(input=>input.addEventListener('change',()=>{state.record.tasks[input.dataset.taskId]=input.checked;queueSave('报名进度已更新');render();}));
    $('#saveTimeline')?.addEventListener('click',()=>saveRecord('报名进度已保存'));
    $$('[data-brochure-key]').forEach(input=>input.addEventListener('change',()=>{state.record.brochureChecks[input.dataset.brochureKey]=input.checked;queueSave('简章核对已更新');}));
    $('#saveBrochure')?.addEventListener('click',()=>saveRecord('简章核对已保存'));
    $('#trainerQuery')?.addEventListener('input',event=>{state.trainerQuery=event.target.value;render();$('#trainerQuery')?.focus();});
    $$('[data-trainer-school]').forEach(button=>button.addEventListener('click',()=>{captureInterviewDraft();queueSave('面试草稿已保存');state.trainerSchoolId=button.dataset.trainerSchool;state.trainerQuestionIndex=0;render();}));
    $('#prevQuestion')?.addEventListener('click',()=>{captureInterviewDraft();queueSave('面试草稿已保存');state.trainerQuestionIndex=Math.max(0,state.trainerQuestionIndex-1);render();});
    $('#nextQuestion')?.addEventListener('click',()=>{captureInterviewDraft();queueSave('面试草稿已保存');state.trainerQuestionIndex+=1;render();});
    $('#interviewAnswer')?.addEventListener('input',()=>{captureInterviewDraft();queueSave('面试草稿已保存');});
    $$('[data-interview-rating]').forEach(input=>input.addEventListener('input',()=>{$(`[data-rating-label="${input.dataset.interviewRating}"]`).textContent=input.value;captureInterviewDraft();queueSave('面试草稿已保存');}));
    $('#saveInterview')?.addEventListener('click',()=>{
      captureInterviewDraft();state.record.interview.savedAt=nowISO();
      saveRecord('本次面试训练已保存');
    });
    $$('[data-statement-key]').forEach(area=>area.addEventListener('input',()=>{state.record.statement[area.dataset.statementKey]=area.value;queueSave('个人陈述素材已更新');}));
    $('#saveStatement')?.addEventListener('click',()=>saveRecord('个人陈述素材已保存'));
  }

  function bindShell(){
    $$('.nav-item').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;render();scrollTo({top:0,behavior:'smooth'});}));
    $('#studentPicker').addEventListener('click',openStudentPicker);
    $('#closeDrawer').addEventListener('click',closeDrawer);$('#drawerScrim').addEventListener('click',closeDrawer);
    $('#modalMask').addEventListener('click',event=>{if(event.target===$('#modalMask'))closeModal();});
    $('#logoutBtn')?.addEventListener('click',()=>returnToLogin());
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeDrawer();closeModal();}});
    window.addEventListener('message',handleAuthMessage);
  }

  async function init(){
    bindShell();
    const localPreview=['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).get('preview')==='1';
    if(localPreview){
      const previewStudent={id:'local-preview-student',name:'预览学生',subject_type:'physics',subject_choices:['化学','生物'],estimated_score:648,estimated_rank:3200,math_score:137,physics_score:96,chemistry_score:92,strong_base_status:'准备中'};
      state.auth={accessToken:'local-preview',refreshToken:'',user:{id:'local-preview-user',email:'preview@local'}};
      state.students=[previewStudent];state.currentStudent=previewStudent;state.record=defaultRecord();state.record.profile={...state.record.profile,...profileFromStudent(previewStudent),scoreTrend:'rising',writtenStrength:'strong',interviewStrength:'medium',ordinaryBaseline:'普通批以学校层次和计算机相关专业为基线，强基不接受纯生物方向。',preferredDisciplines:['数学/信息','物理/电子'],careerDirection:'market',regionPreference:'yangtze',acceptsLongDegree:'uncertain',acceptsDirectPhd:'uncertain',acceptsNoTransfer:'yes',acceptsEarlyLock:'uncertain',riskTolerance:'balanced'};state.cloudReady=false;
      showAuthCover(false);updateStudentHeader();render();setSaveState('error','本地预览');return;
    }
    const saved=storageJSON(AUTH_STORAGE_KEY,{});
    if(saved?.accessToken&&saved?.user){
      state.auth={accessToken:saved.accessToken,refreshToken:saved.refreshToken||'',user:saved.user};
      try{await ensureProfile(saved.user);await loadWorkspaceData();showAuthCover(false);}
      catch(err){returnToLogin('登录状态已过期');}
    }else{showAuthCover(true);}
  }
  init();
})();
