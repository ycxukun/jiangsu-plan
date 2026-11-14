/* 知行学录 · 学生工作台（v2）
   一个入口：学生列表 → 学生页（五个服务阶段）。
   数据：沿用现有 Supabase 表。students 存基本信息；每个学生一条 volunteer_forms（title='划线看组方案'）存
   划线看组条件、多张志愿表、服务阶段、下一步、专项与录取跟踪。登录状态与旧版共用。 */
(function(){
'use strict';
const SB=(/(^|\.)ycxukun\.cn$/.test(location.hostname)?location.origin+'/sbapi':'https://qnspmqsrbjcgrgpqkzgl.supabase.co');
const KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_KEY='js-plan-auth-v1';
const PLAN_TITLE='划线看组方案';
const STAGES=[['1','建档'],['2','定方向'],['3','专项通道'],['4','出分填报'],['5','录取跟踪']];
const SUBS=['化学','生物','政治','地理'];
const LEVELS=[['985','985'],['211','211'],['双一流','双一流'],['国重点','国重点'],['省重点','省重点'],['保研','有保研资格']];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const klName=t=>t==='history'?'历史':'物理';
const klCode=n=>n==='历史'?'history':'physics';
let benchMine=false, META=null, STU=[], PLANS={}, benchLoaded=false, cur=null, curPlan=null, saveT=0, view='bench', stageView='4', benchQ='', benchStage='';

/* ---------- 登录（与旧版共用 localStorage 里的登录状态） ---------- */
function readAuth(){try{const a=JSON.parse(localStorage.getItem(AUTH_KEY)||'{}');return a&&a.accessToken&&a.user?a:null}catch(e){return null}}
function writeAuth(a){try{localStorage.setItem(AUTH_KEY,JSON.stringify({accessToken:a.accessToken||'',refreshToken:a.refreshToken||'',user:a.user||null}))}catch(e){}}
function jwtExp(t){try{return JSON.parse(atob(String(t).split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp*1000}catch(e){return 0}}
let refreshing=null;
async function token(force){
  let a=readAuth();if(!a)throw Object.assign(new Error('请先登录'),{code:'auth'});
  if(!force&&jwtExp(a.accessToken)-Date.now()>120000)return a.accessToken;
  if(refreshing)return refreshing;
  refreshing=(async()=>{
    a=readAuth();
    if(!force&&a&&jwtExp(a.accessToken)-Date.now()>120000)return a.accessToken;
    const r=await fetch(SB+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refreshToken})});
    if(!r.ok)throw Object.assign(new Error('登录已过期，请重新登录'),{code:'auth'});
    const d=await r.json();writeAuth({accessToken:d.access_token,refreshToken:d.refresh_token||a.refreshToken,user:d.user||a.user});return d.access_token;
  })();
  try{return await refreshing}finally{refreshing=null}
}
async function api(path,opt={},retry){
  const t=await token(false);
  const r=await fetch(SB+'/rest/v1/'+path,{...opt,headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json',...(opt.headers||{})}});
  if(r.status===401&&!retry){await token(true);return api(path,opt,true)}
  const txt=await r.text();
  if(!r.ok){let m=txt;try{m=JSON.parse(txt).message||txt}catch(e){}throw new Error(m||('HTTP '+r.status))}
  return txt?JSON.parse(txt):null;
}
async function login(email,password){
  const r=await fetch(SB+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.access_token)throw new Error(/invalid/i.test(d.error_description||d.msg||'')?'邮箱或密码不对':'登录没有成功，请稍后再试');
  writeAuth({accessToken:d.access_token,refreshToken:d.refresh_token,user:d.user});
}
function showLogin(msg,apply){
  view='login';PROFILE=null;$('#crumb').textContent='';$('#who').textContent='';$('#logout').hidden=true;setNav('');
  $('#view').innerHTML=apply?`<form class="login" id="af"><h1>申请账号</h1><p>给同事、助理用。提交后由管理员开通，开通前登录会提示“等待开通”。</p>
   <label class="f"><span>姓名</span><input name="name" required maxlength="20" placeholder="开通时管理员看到的名字"></label>
   <label class="f"><span>邮箱</span><input name="email" type="email" autocomplete="username" required></label>
   <label class="f"><span>密码（至少 6 位）</span><input name="password" type="password" autocomplete="new-password" minlength="6" required></label>
   <p class="msg" id="lmsg">${esc(msg||'')}</p><button class="btn primary" type="submit" style="width:100%">提交申请</button>
   <p class="alt"><a href="#" id="tologin">已有账号，去登录</a></p></form>`
  :`<form class="login" id="lf"><h1>登录</h1><p>和旧版知识库、CRM 用同一个账号。</p>
   <label class="f"><span>邮箱</span><input name="email" type="email" autocomplete="username" required></label>
   <label class="f"><span>密码</span><input name="password" type="password" autocomplete="current-password" required></label>
   <p class="msg" id="lmsg">${esc(msg||'')}</p><button class="btn primary" type="submit" style="width:100%">登录</button>
   <p class="alt">同事、助理没有账号？<a href="#" id="toapply">申请账号</a></p></form>`;
  $('#toapply')?.addEventListener('click',e=>{e.preventDefault();showLogin('',true)});
  $('#tologin')?.addEventListener('click',e=>{e.preventDefault();showLogin('')});
  $('#lf')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target;$('#lmsg').textContent='正在登录……';
    try{await login(f.email.value.trim(),f.password.value);route()}catch(err){$('#lmsg').textContent=err.message}});
  $('#af')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button[type=submit]');$('#lmsg').textContent='正在提交……';b.disabled=true;
    try{const ok=await signup(f.email.value.trim(),f.password.value,f.name.value.trim());
      if(ok)route();else{$('#lmsg').textContent='已提交。请先到邮箱点确认链接，再回来登录；登录后等管理员开通。'}}
    catch(err){$('#lmsg').textContent=err.message;b.disabled=false}});
}
async function signup(email,password,name){
  const r=await fetch(SB+'/auth/v1/signup',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{display_name:name}})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const m=d.msg||d.error_description||d.message||'';throw new Error(/already|registered|exists/i.test(m)?'这个邮箱已经注册过，直接登录即可':/password/i.test(m)?'密码不符合要求（至少 6 位）':'申请没有提交成功：'+(m||r.status))}
  if(d.access_token){writeAuth({accessToken:d.access_token,refreshToken:d.refresh_token,user:d.user});pendingName=name;return true}
  return false;
}
/* 账号状态：status=active 且 role 不是 viewer 才能进；viewer 视为“已申请、待开通” */
let PROFILE=null,pendingName='';
const ROLE_NAME={admin:'管理员',planner:'规划师',consultant:'咨询师',manager:'主管',assistant:'助理',sales:'销售',reviewer:'审核',finance:'财务',observer:'观察员',viewer:'待开通'};
async function ensureProfile(){
  if(PROFILE)return PROFILE;
  const a=readAuth();
  let r=await api('profiles?select=id,email,display_name,role,status&id=eq.'+a.user.id+'&limit=1');
  if(!r||!r.length){
    try{await api('profiles?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({id:a.user.id,email:a.user.email,display_name:pendingName||a.user.user_metadata?.display_name||a.user.email,role:'viewer',status:'active'})})}catch(e){}
    r=await api('profiles?select=id,email,display_name,role,status&id=eq.'+a.user.id+'&limit=1');
  }
  PROFILE=(r&&r[0])||{role:'viewer',status:'active'};return PROFILE;
}
function gateView(p){
  view='gate';setNav('');$('#crumb').textContent='';
  const off=p.status!=='active';
  $('#view').innerHTML=`<section class="login"><h1>${off?'账号已停用':'等待开通'}</h1>
    <p>${off?'这个账号已被管理员停用。如有疑问请联系管理员。':`申请已收到（${esc(p.display_name||p.email||'')}）。管理员开通后，重新进入这个页面就能用了。`}</p>
    <button type="button" class="btn" id="gateRe">${off?'刷新':'我已开通，刷新看看'}</button></section>`;
  $('#gateRe').addEventListener('click',()=>{PROFILE=null;route()});
}

/* ---------- 数据 ---------- */
async function loadMeta(){if(META)return META;try{META=await (await fetch('../huaxian/meta.json?v=20261114-v2-r3')).json()}catch(e){META={dirs:[],medCodes:{},provs:[]}}return META}
async function loadBench(){
  const [s,p]=await Promise.all([
    api('students?select=id,name,student_no,subject_type,subject_choices,score,rank,phone,updated_at,stage,medical_codes,target_cities,planner_id,owner_id&archived=eq.false&order=updated_at.desc&limit=500'),
    api('volunteer_forms?select=id,student_id,snapshot,updated_at&title=eq.'+encodeURIComponent(PLAN_TITLE)+'&limit=1000')]);
  STU=s||[];PLANS={};if(PROFILE&&PROFILE.role==='admin'){try{await loadStaff()}catch(e){}}(p||[]).forEach(r=>{PLANS[r.student_id]=r});benchLoaded=true;
}
const snapOf=sid=>PLANS[sid]?.snapshot||{};
function stageOf(s){const sn=snapOf(s.id);if(sn.stage)return String(sn.stage);return s.score?'4':'1'}

/* ---------- 工作台 ---------- */
function benchView(){
  view='bench';$('#crumb').innerHTML='';
  const q=benchQ.trim();
  const adm=PROFILE&&PROFILE.role==='admin',me=readAuth()?.user?.id,pname={};(STAFF||[]).forEach(p=>pname[p.id]=p.display_name||p.email||'');
  const rows=STU.filter(s=>(!benchMine||!adm||s.planner_id===me)&&(!q||(s.name||'').includes(q)||(s.student_no||'').includes(q)||(s.phone||'').includes(q))&&(!benchStage||stageOf(s)===benchStage));
  const cnt={};STU.forEach(s=>{const k=stageOf(s);cnt[k]=(cnt[k]||0)+1});
  $('#view').innerHTML=`<section class="bench"><div class="bench-h"><h1>${adm?'全部学生':'我的学生'} <span class="cnt">${STU.length} 人</span></h1>${adm?`<label class="chk"><input type="checkbox" id="bmine" ${benchMine?'checked':''}> 只看我负责的</label>`:''}
   <div class="bench-tools"><input type="search" id="bq" placeholder="搜姓名、编号、电话" value="${esc(benchQ)}" aria-label="搜索学生"><button class="btn primary" id="newbtn" type="button">＋ 新建学生</button></div></div>
   <div class="stagef"><button type="button" class="chip" data-sf="" aria-pressed="${!benchStage}">全部</button>${STAGES.map(([k,n])=>`<button type="button" class="chip" data-sf="${k}" aria-pressed="${benchStage===k}">${k==='1'?'①':k==='2'?'②':k==='3'?'③':k==='4'?'④':'⑤'} ${n} <small>${cnt[k]||0}</small></button>`).join('')}</div>
   ${rows.length?`<table class="list"><thead><tr><th>学生</th><th>科类 · 再选</th><th>分数 / 位次</th><th>阶段</th><th class="hide-m">志愿表</th><th class="hide-m">下一步</th>${adm?'<th class="hide-m">负责</th>':''}<th class="hide-m">更新</th></tr></thead><tbody>${rows.map(s=>{const sn=snapOf(s.id),st=stageOf(s),c=sn.counts||{};const n=sn.n??0;
     return `<tr class="r" data-sid="${esc(s.id)}" tabindex="0"><td><span class="nm">${esc(s.name)}</span><span class="no">${esc(s.student_no||'')}</span></td><td>${klName(s.subject_type)}${(s.subject_choices||[]).length?' · '+esc(s.subject_choices.join('')):''}</td><td class="mono">${s.score??'—'} / ${s.rank?Number(s.rank).toLocaleString():'—'}</td><td><span class="stg s${st}">${'①②③④⑤'[st-1]} ${STAGES[st-1][1]}</span></td><td class="hide-m">${n?`<span class="cnt"><b>${n}</b>/40 · <span class="c-chong">冲${c['冲']||0}</span> <span class="c-wen">稳${c['稳']||0}</span> <span class="c-bao">保${c['保']||0}</span></span>`:'<span class="cnt">—</span>'}</td><td class="hide-m">${esc(sn.next||'')}</td>${adm?`<td class="hide-m cnt">${esc(pname[s.planner_id]||'未分配')}</td>`:''}<td class="hide-m cnt">${new Date(PLANS[s.id]?.updated_at||s.updated_at).toLocaleDateString('zh-CN')}</td></tr>`}).join('')}</tbody></table>`
     :`<p class="empty">${STU.length?'没有符合条件的学生。':'还没有学生。点右上角“新建学生”开始建档。'}</p>`}</section>`;
  $('#bq').addEventListener('input',e=>{benchQ=e.target.value;const p=e.target.selectionStart;benchView();const i=$('#bq');i.focus();i.setSelectionRange(p,p)});
  $('#newbtn').addEventListener('click',openNew);
  $('#bmine')?.addEventListener('change',e=>{benchMine=e.target.checked;benchView()});
  document.querySelectorAll('[data-sf]').forEach(b=>b.addEventListener('click',()=>{benchStage=b.dataset.sf;benchView()}));
  document.querySelectorAll('tr.r').forEach(tr=>{const go=()=>{location.hash='#/s/'+tr.dataset.sid};tr.addEventListener('click',go);tr.addEventListener('keydown',e=>{if(e.key==='Enter')go()})});
}
function openNew(){
  const m=$('#newm'),f=$('#newform');f.reset();$('#newmsg').textContent='';
  f.querySelector('[data-chips="subs"]').innerHTML=SUBS.map(x=>`<label class="chip"><input type="checkbox" value="${x}">${x}</label>`).join('');
  f.querySelectorAll('[data-seg="kl"] button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v==='physics')));
  m.hidden=false;f.name.focus();
}
async function createStudent(e){
  e.preventDefault();const f=e.target,a=readAuth();if(!a)return showLogin();
  const kl=f.querySelector('[data-seg="kl"] [aria-pressed="true"]').dataset.v;
  const subs=[...f.querySelectorAll('[data-chips="subs"] input:checked')].map(i=>i.value);
  const body={owner_id:a.user.id,planner_id:a.user.id,name:f.name.value.trim(),phone:f.phone.value.trim()||null,province:'江苏',stage:'undergraduate',subject_type:kl,subject_choices:subs,score:f.score.value?Number(f.score.value):null,rank:f.rank.value?Number(f.rank.value):null};
  if(!body.name){$('#newmsg').textContent='请填写姓名';return}
  $('#newmsg').textContent='正在建档……';
  try{const r=await api('students',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});$('#newm').hidden=true;STU.unshift(r[0]);location.hash='#/s/'+r[0].id}
  catch(err){$('#newmsg').textContent='没有建成：'+err.message}
}

/* ---------- 学生页 ---------- */
function defaultSnap(s){return {stage:s.score?'4':'1',next:'',st:{kl:klName(s.subject_type),S:s.score||600,subs:s.subject_choices||[],med:s.medical_codes||[],pv:s.target_cities||[],dirs:[],avoid:[],lv:[],mj:[]},tabs:null,ti:0,sp:{},track:{}}}
async function openStudent(sid){
  view='student';
  if(!cur||cur.id!==sid){
    $('#view').innerHTML='<p class="loading">正在打开学生……</p>';
    const [s,p]=await Promise.all([api('students?select=*&id=eq.'+sid),api('volunteer_forms?select=*&student_id=eq.'+sid+'&title=eq.'+encodeURIComponent(PLAN_TITLE)+'&order=updated_at.desc&limit=1')]);
    if(!s||!s.length){$('#view').innerHTML='<p class="empty">没有找到这个学生，可能没有权限。<a href="#/">返回学生列表</a></p>';return}
    cur=s[0];curPlan=p&&p[0]||null;
    if(!curPlan)curPlan={id:null,student_id:cur.id,snapshot:defaultSnap(cur)};
    const sn=curPlan.snapshot;sn.st=sn.st||defaultSnap(cur).st;sn.sp=sn.sp||{};sn.track=sn.track||{};
    stageView=String(sn.stage||'1');
  }
  await loadMeta();renderStudent();
}
function factsLine(){const s=cur;return `${klName(s.subject_type)}类${(s.subject_choices||[]).length?' · 再选'+esc(s.subject_choices.join('')):''} · 分数 <b>${s.score??'—'}</b> · 位次 <b>${s.rank?Number(s.rank).toLocaleString():'—'}</b>${(s.medical_codes||[]).length?' · <span style="color:var(--warn-ink)">体检限报 '+esc(s.medical_codes.join('/'))+'</span>':''}`}
function renderStudent(){
  const s=cur,sn=curPlan.snapshot,cs=String(sn.stage||'1');
  $('#crumb').innerHTML=`<a href="#/">我的学生</a> › <b>${esc(s.name)}</b>`;
  $('#view').innerHTML=`<section class="sp-head"><div class="sp-id"><h1>${esc(s.name)}</h1><span class="facts" id="facts">${factsLine()}</span><span class="saved" id="saved"></span></div>
    <label class="next"><span>下一步</span><input id="nextin" maxlength="80" placeholder="例：周三前和家长确认是否接受中外合作" value="${esc(sn.next||'')}"></label>
    <nav class="steps" aria-label="服务阶段">${STAGES.map(([k,n])=>`<button type="button" data-st="${k}" ${stageView===k?'aria-current="page"':''}>${'①②③④⑤'[k-1]} ${n}${cs===k?'<span class="cur">当前</span>':''}</button>`).join('')}</nav></section>
    <div id="stagebox"></div>`;
  $('#nextin').addEventListener('input',e=>{sn.next=e.target.value;queueSave()});
  document.querySelectorAll('[data-st]').forEach(b=>b.addEventListener('click',()=>{stageView=b.dataset.st;renderStudent()}));
  ({'1':stage1,'2':stage2,'3':stage3,'4':stage4,'5':stage5})[stageView]();
}
function stageHead(k,title,desc){const cs=String(curPlan.snapshot.stage||'1');return `<div class="stage-h"><div><h2>${'①②③④⑤'[k-1]} ${title}</h2><p>${desc}</p></div>${cs===k?'<span class="stg s4">当前阶段</span>':`<button type="button" class="btn sm" id="setcur">设为当前阶段</button>`}</div>`}
function bindSetCur(k){const b=$('#setcur');if(b)b.addEventListener('click',()=>{curPlan.snapshot.stage=k;queueSave(true);renderStudent()})}

/* ① 建档 */
function bindPlanner(){const sel=$('#plsel');if(!sel)return;sel.addEventListener('change',async()=>{const v=sel.value||null;try{await api('students?id=eq.'+cur.id,{method:'PATCH',body:JSON.stringify({planner_id:v})});cur.planner_id=v;const x=STU.find(z=>z.id===cur.id);if(x)x.planner_id=v;saved('负责老师已更新')}catch(e){saved('没改成：'+e.message,true)}})}
function stage1(){
  const s=cur,med=META.medCodes||{},ip=s.intake_payload&&typeof s.intake_payload==='object'?s.intake_payload:{};
  const ipk=Object.keys(ip).filter(k=>ip[k]!==''&&ip[k]!=null&&typeof ip[k]!=='object').slice(0,60);
  $('#stagebox').innerHTML=`<section class="stage">${stageHead('1','建档','基本信息、选科、成绩和体检。这里改了，后面各阶段自动带上。')}
   <div class="card"><h3>基本信息</h3><div class="row2"><label class="f"><span>姓名</span><input data-fld="name" value="${esc(s.name)}"></label><label class="f"><span>家长电话</span><input data-fld="phone" value="${esc(s.phone||'')}"></label></div>
    <div class="row2"><div class="f"><span>科类</span><span class="seg" id="klseg"><button type="button" data-v="physics" aria-pressed="${s.subject_type!=='history'}">物理</button><button type="button" data-v="history" aria-pressed="${s.subject_type==='history'}">历史</button></span></div>
    <div class="f"><span>再选</span><span class="chips" id="subsel">${SUBS.map(x=>`<label class="chip"><input type="checkbox" value="${x}" ${(s.subject_choices||[]).includes(x)?'checked':''}>${x}</label>`).join('')}</span></div></div>
    <div class="row2"><label class="f"><span>分数（估分或实际分）</span><input data-fld="score" type="number" min="0" max="750" value="${s.score??''}"></label><label class="f"><span>位次</span><input data-fld="rank" type="number" min="1" value="${s.rank??''}"></label></div>
    <label class="f"><span>备注</span><textarea data-fld="note" rows="2">${esc(s.note||'')}</textarea></label>
    ${PROFILE&&PROFILE.role==='admin'&&STAFF?`<label class="f"><span>负责老师（只有管理员能改）</span><select id="plsel"><option value="">未分配</option>${STAFF.filter(isStaff).map(p=>`<option value="${p.id}" ${s.planner_id===p.id?'selected':''}>${esc(p.display_name||p.email)}（${esc(ROLE_NAME[p.role]||p.role)}）</option>`).join('')}</select></label>`:''}</div>
   <div class="card"><h3>体检限报 <span class="cnt">勾选后，划线看组会把受限专业标出来</span></h3><div class="medgrid" id="medsel">${Object.keys(med).filter(c=>!/^1[1-6]$/.test(c)).map(c=>`<label><input type="checkbox" value="${c}" ${(s.medical_codes||[]).includes(c)?'checked':''}><b>${c}</b><span>${esc(med[c])}</span></label>`).join('')}</div></div>
   <div class="card"><h3>家长采集表</h3>${ipk.length?`<dl class="kv">${ipk.map(k=>`<dt>${esc(k)}</dt><dd>${esc(String(ip[k]).slice(0,300))}</dd>`).join('')}</dl>`:'<p class="cnt">还没有采集表内容。</p>'}
    <div class="links" style="margin-top:10px"><a class="btn sm" href="../students/intake-form-v6.6.7.html" target="_blank" rel="noopener">打开本科采集表</a><a class="btn sm" href="../students/intake-form-specialty-2026.html" target="_blank" rel="noopener">打开专科采集表</a><a class="btn sm" href="../students/index.html" target="_blank" rel="noopener">原学生档案页</a></div></div></section>`;
  bindSetCur('1');bindPlanner();
  document.querySelectorAll('[data-fld]').forEach(i=>i.addEventListener('input',()=>{const k=i.dataset.fld;let v=i.value;if(k==='score'||k==='rank')v=v===''?null:Number(v);if(k==='name'&&!v.trim())return;cur[k]=v;if(k==='score'&&v)curPlan.snapshot.st.S=v;queueStudent({[k]:v});$('#facts').innerHTML=factsLine()}));
  $('#klseg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur.subject_type=b.dataset.v;curPlan.snapshot.st.kl=klName(b.dataset.v);curPlan.snapshot.st.subs=[];cur.subject_choices=[];queueStudent({subject_type:b.dataset.v,subject_choices:[]});stage1();$('#facts').innerHTML=factsLine()});
  $('#subsel').addEventListener('change',()=>{const v=[...document.querySelectorAll('#subsel input:checked')].map(i=>i.value);cur.subject_choices=v;curPlan.snapshot.st.subs=v;queueStudent({subject_choices:v});$('#facts').innerHTML=factsLine()});
  $('#medsel').addEventListener('change',()=>{const v=[...document.querySelectorAll('#medsel input:checked')].map(i=>i.value);cur.medical_codes=v;curPlan.snapshot.st.med=v;queueStudent({medical_codes:v});$('#facts').innerHTML=factsLine()});
}
/* ② 定方向 */
function stage2(){
  const st=curPlan.snapshot.st,fam={};(META.dirs||[]).forEach(([n,f])=>{(fam[f]=fam[f]||[]).push(n)});
  const famChips=(key,cls)=>Object.entries(fam).map(([f,ns])=>`<div class="fam">${esc(f)}</div><div class="chips">${ns.map(n=>`<label class="chip ${cls}"><input type="checkbox" data-k="${key}" value="${esc(n)}" ${(st[key]||[]).includes(n)?'checked':''}>${esc(n)}</label>`).join('')}</div>`).join('');
  $('#stagebox').innerHTML=`<section class="stage">${stageHead('2','定方向','想学和不学的方向、能接受的地区和学校层次。出分填报时这些条件会直接勾好。')}
   <div class="card"><h3>想学的方向</h3>${famChips('dirs','')}</div>
   <div class="card"><h3>不学的方向</h3>${famChips('avoid','danger')}</div>
   <div class="card"><h3>能接受的地区 <span class="cnt">不选＝全国</span></h3><div class="chips">${(META.provs||[]).map(p=>`<label class="chip"><input type="checkbox" data-k="pv" value="${esc(p)}" ${(st.pv||[]).includes(p)?'checked':''}>${esc(p)}</label>`).join('')}</div></div>
   <div class="card"><h3>学校层次 <span class="cnt">满足任一即可</span></h3><div class="chips">${LEVELS.map(([v,n])=>`<label class="chip"><input type="checkbox" data-k="lv" value="${v}" ${(st.lv||[]).includes(v)?'checked':''}>${n}</label>`).join('')}</div></div>
   <div class="card"><h3>参考资料</h3><div class="links"><a class="btn sm" href="#/t/majormap">专业地图</a><a class="btn sm" href="../huaxian/" target="_blank" rel="noopener">各省本地高校与产业（在划线看组的“按省份看”）</a></div></div></section>`;
  bindSetCur('2');
  $('#stagebox section').addEventListener('change',e=>{const i=e.target;if(!i.dataset||!i.dataset.k)return;const k=i.dataset.k;const set=new Set(st[k]||[]);i.checked?set.add(i.value):set.delete(i.value);st[k]=[...set];
    if(i.checked&&k==='dirs'&&(st.avoid||[]).includes(i.value)){st.avoid=st.avoid.filter(x=>x!==i.value);stage2()}
    if(i.checked&&k==='avoid'&&(st.dirs||[]).includes(i.value)){st.dirs=st.dirs.filter(x=>x!==i.value);stage2()}
    if(k==='pv'){cur.target_cities=st.pv;queueStudent({target_cities:st.pv})}
    if(k==='dirs'){cur.target_majors=st.dirs;queueStudent({target_majors:st.dirs})}
    queueSave()});
}
/* ③ 专项通道 */
function stage3(){
  const sp=curPlan.snapshot.sp,opts=['未评估','不报','评估中','已报名','已入围','已出结果'];
  const card=(k,t,href,desc)=>`<div class="card"><h3>${t}</h3><p class="cnt">${desc}</p><div class="row2"><label class="f"><span>状态</span><select data-sp="${k}">${opts.map(o=>`<option ${sp[k]===o?'selected':''}>${o}</option>`).join('')}</select></label><label class="f"><span>报考学校 / 备注</span><input data-spn="${k}" value="${esc(sp[k+'_n']||'')}"></label></div><a class="btn sm" href="${href}">打开${t}工具</a></div>`;
  $('#stagebox').innerHTML=`<section class="stage">${stageHead('3','专项通道','强基计划、综合评价、提前批的报考决定和进度。详细操作在各自的工具里。')}
   <div class="grid3">${card('qj','强基计划','#/t/qiangji','高三上学期至 4 月报名，6 月校测。')}${card('zp','综合评价','#/t/zongping','高三上学期至 5 月报名，出分后校测。')}${card('tq','提前批','#/t/early','军警、公费师范、定向医学等，出分后与本科批一起填。')}</div></section>`;
  bindSetCur('3');
  document.querySelectorAll('[data-sp]').forEach(x=>x.addEventListener('change',()=>{sp[x.dataset.sp]=x.value;queueSave()}));
  document.querySelectorAll('[data-spn]').forEach(x=>x.addEventListener('input',()=>{sp[x.dataset.spn+'_n']=x.value;queueSave()}));
}
/* ④ 出分填报：嵌入划线看组 */
let hxFrame=null;
function stage4(){
  const sn=curPlan.snapshot,c=sn.counts||{};
  $('#stagebox').innerHTML=`<div class="fill-bar"><b>④ 出分填报</b><span class="cnt" id="volsum">${sn.n?`志愿表 <b>${sn.n}</b>/40 · <span class="c-chong">冲${c['冲']||0}</span> <span class="c-wen">稳${c['稳']||0}</span> <span class="c-bao">保${c['保']||0}</span>`:'还没有志愿表'}</span><span class="grow"></span>
    <span class="cnt">条件来自①②，在这里改了也会存回档案</span><a class="btn sm" href="#/kb/bk?sid=${esc(cur.id)}">在院校库里查</a><a class="btn sm" href="#/t/early">提前批</a><a class="btn sm" href="#/kb/zk?sid=${esc(cur.id)}">专科批</a>${String(sn.stage)==='4'?'':'<button type="button" class="btn sm" id="setcur">设为当前阶段</button>'}</div>
   <iframe class="hx" id="hxf" title="划线看组" src="../huaxian/?embed=1&v=20261114-v2-r3"></iframe>`;
  bindSetCur('4');hxFrame=$('#hxf');
}
function hxInit(){
  if(!hxFrame)return;const sn=curPlan.snapshot,st={...sn.st};
  st.kl=klName(cur.subject_type);if(cur.score)st.S=cur.score;st.subs=cur.subject_choices||st.subs||[];st.med=cur.medical_codes||st.med||[];
  hxFrame.contentWindow.postMessage({type:'hx:init',st,tabs:sn.tabs,ti:sn.ti||0,name:cur.name},location.origin);
}
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!e.data||view!=='student'||!curPlan)return;
  if(e.data.type==='hx:ready'){hxInit();return}
  if(e.data.type==='hx:state'){const sn=curPlan.snapshot,d=e.data;sn.st=d.st;sn.tabs=d.tabs;sn.ti=d.ti;sn.counts=d.counts;sn.n=d.n;
    const patch={};if(d.st.S&&d.st.S!==cur.score){patch.score=d.st.S;cur.score=d.st.S}
    const kl=klCode(d.st.kl);if(kl!==cur.subject_type){patch.subject_type=kl;cur.subject_type=kl}
    if(JSON.stringify(d.st.subs||[])!==JSON.stringify(cur.subject_choices||[])){patch.subject_choices=d.st.subs||[];cur.subject_choices=patch.subject_choices}
    if(JSON.stringify(d.st.med||[])!==JSON.stringify(cur.medical_codes||[])){patch.medical_codes=d.st.med||[];cur.medical_codes=patch.medical_codes}
    if(Object.keys(patch).length)queueStudent(patch);
    const f=$('#facts');if(f)f.innerHTML=factsLine();
    const v=$('#volsum'),c=d.counts||{};if(v)v.innerHTML=d.n?`志愿表 <b>${d.n}</b>/40 · <span class="c-chong">冲${c['冲']||0}</span> <span class="c-wen">稳${c['稳']||0}</span> <span class="c-bao">保${c['保']||0}</span>`:'还没有志愿表';
    queueSave()}
});
/* ⑤ 录取跟踪 */
function stage5(){
  const t=curPlan.snapshot.track;
  const fld=(k,label,ph)=>`<label class="f"><span>${label}</span><input data-tr="${k}" value="${esc(t[k]||'')}" placeholder="${ph||''}"></label>`;
  $('#stagebox').innerHTML=`<section class="stage">${stageHead('5','录取跟踪','投档、录取结果和后续安排。')}
   <div class="card"><div class="row2">${fld('tou','投档院校 / 专业组','如：南京邮电大学 09 组')}${fld('lu','录取专业','')}</div>
   <div class="row2"><label class="f"><span>结果</span><select data-tr="res">${['等待投档','已投档','已录取','退档','滑档'].map(o=>`<option ${t.res===o?'selected':''}>${o}</option>`).join('')}</select></label>${fld('zp','征求平行志愿 / 补录','')}</div>
   ${fld('zz','入学后转专业计划','')}<label class="f"><span>备注</span><textarea data-tr="note" rows="3">${esc(t.note||'')}</textarea></label></div></section>`;
  bindSetCur('5');
  document.querySelectorAll('[data-tr]').forEach(x=>x.addEventListener(x.tagName==='SELECT'?'change':'input',()=>{t[x.dataset.tr]=x.value;queueSave()}));
}

/* ---------- 保存 ---------- */
let stuPatch={},stuT=0;
function saved(t,err){const s=$('#saved');if(s){s.textContent=t;s.classList.toggle('err',!!err)}}
function queueStudent(p){Object.assign(stuPatch,p);clearTimeout(stuT);saved('正在保存……');stuT=setTimeout(saveStudent,700)}
async function saveStudent(){const p=stuPatch;stuPatch={};if(!Object.keys(p).length)return;
  try{await api('students?id=eq.'+cur.id,{method:'PATCH',body:JSON.stringify(p)});saved('已保存')}catch(e){saved('保存失败：'+e.message,true);Object.assign(stuPatch,p)}}
function queueSave(now){clearTimeout(saveT);saved('正在保存……');saveT=setTimeout(savePlan,now?10:800)}
async function savePlanFor(stu,plan){
  const sn=plan.snapshot,a=readAuth();
  if(plan.id){await api('volunteer_forms?id=eq.'+plan.id,{method:'PATCH',body:JSON.stringify({snapshot:sn})})}
  else{const r=await api('volunteer_forms',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({student_id:stu.id,owner_id:a.user.id,title:PLAN_TITLE,stage:'undergraduate',status:'draft',source_version:'v2-huaxian',snapshot:sn})});plan.id=r[0].id}
  PLANS[stu.id]={...(PLANS[stu.id]||{}),id:plan.id,student_id:stu.id,snapshot:sn,updated_at:new Date().toISOString()};
  if(cur&&cur.id===stu.id&&curPlan!==plan){curPlan=null}
}
async function savePlan(){
  try{await savePlanFor(cur,curPlan);saved('已保存')}catch(e){saved('保存失败：'+e.message,true)}
}
window.addEventListener('beforeunload',e=>{if(Object.keys(stuPatch).length){saveStudent()}});

/* ---------- 导航、专题与工具 ---------- */
const TOOLS={
  'early':['提前批助手','../early-batch/','军校、公安、航海、专项计划、定向医学生等提前批的政策与核对。'],
  'qiangji':['强基计划助手','../strong-base/','强基计划的院校、专业与流程。'],
  'zongping':['综合评价','../comprehensive/index.html','综合评价报名系统。'],
  'qjzp':['强基综评流程','../foundation-comprehensive-preview/index.html','强基与综评的报名、校测、录取流程。'],
  'tijian':['体检限报查询','../medical-restriction-preview/index.html','按体检代码查哪些专业不能报。'],
  'rules':['高考规则讲解','../gaokao-rules-preview/index.html','江苏新高考投档、录取规则。'],
  'majormap':['专业地图','../major-map/','本科专业的门类、专业类和具体专业。'],
  'cards':['2026 专业组卡','../professional-group-cards/','每所学校每个专业组的变化卡，可打印。'],
  'guide':['升学规划资料导航','../planning-hub/index.html','各类资料的入口。'],
  'news':['升学资讯','../content/index.html','文章与资讯，可以写文章。'],
  'crm':['CRM 工作台','../crm.html','服务进度、分配、跟进（旧版）。'],
  'archive':['学生档案库（旧版）','../students/archive.html','旧版学生档案与采集表记录。'],
  'admin':['管理员后台','../admin-console.html','账号审核与权限。']
};
const TOOL_GROUPS=[['填报相关',['early','qiangji','zongping','qjzp','tijian']],['讲解与资料',['rules','majormap','cards','guide','news']],['管理',['crm','archive','admin']]];
function toolsView(){
  $('#view').innerHTML=`<section class="bench"><div class="bench-h"><h1>专题与工具</h1></div>${TOOL_GROUPS.map(([t,ks])=>`<h2 class="tg-h">${esc(t)}</h2><div class="tools">${ks.map(k=>`<a class="tool-card" href="#/t/${k}"><b>${esc(TOOLS[k][0])}</b><span>${esc(TOOLS[k][2])}</span></a>`).join('')}</div>`).join('')}</section>`;
}
function setNav(k){document.querySelectorAll('#nav a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.nav===k))}
const loaded={};
function loadScript(f){return loaded[f]||(loaded[f]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=f+'?v=20261114-v2-r3';s.onload=ok;s.onerror=()=>{delete loaded[f];no(new Error(f+' 没有载入'))};document.head.appendChild(s)}))}
window.ZX={V:'20261114-v2-r3',esc,api,students:()=>STU,planOf:sid=>PLANS[sid],defaultSnap,savePlanFor};

/* ---------- 账号（管理员） ---------- */
let STAFF=null;
async function loadStaff(force){if(STAFF&&!force)return STAFF;STAFF=await api('profiles?select=id,email,display_name,role,status,created_at&order=created_at.desc&limit=500')||[];return STAFF}
const isStaff=p=>p.status==='active'&&p.role!=='viewer';
async function teamView(){
  $('#view').innerHTML='<p class="loading">正在载入账号……</p>';
  const [ps]=await Promise.all([loadStaff(true),benchLoaded?null:loadBench()]);
  const me=readAuth().user.id;
  const cnt={};STU.forEach(s=>{if(s.planner_id)cnt[s.planner_id]=(cnt[s.planner_id]||0)+1});
  const pend=ps.filter(p=>p.status==='active'&&p.role==='viewer'),staff=ps.filter(isStaff),off=ps.filter(p=>p.status!=='active');
  const who=p=>`<span class="nm">${esc(p.display_name||'未填姓名')}</span><span class="no">${esc(p.email||'')}</span>`;
  const day=t=>t?new Date(t).toLocaleDateString('zh-CN'):'';
  $('#view').innerHTML=`<section class="bench"><div class="bench-h"><h1>账号</h1></div>
   <p class="cnt">同事、助理在登录页点“申请账号”，申请会出现在下面。开通为规划师后，他只能看到分配给他的学生；管理员能看到全部学生。</p>
   <h2 class="tg-h">待开通 <span class="cnt">${pend.length}</span></h2>
   ${pend.length?`<table class="list"><tbody>${pend.map(p=>`<tr><td>${who(p)}</td><td class="hide-m">${day(p.created_at)} 申请</td><td class="act"><button type="button" class="btn sm primary" data-acc="${p.id}" data-role="planner">开通为规划师</button><button type="button" class="btn sm ghost" data-acc="${p.id}" data-off="1">拒绝</button></td></tr>`).join('')}</tbody></table>`:'<p class="empty sm">没有待开通的申请。</p>'}
   <h2 class="tg-h">在用的账号 <span class="cnt">${staff.length}</span></h2>
   <table class="list"><thead><tr><th>姓名</th><th>角色</th><th>负责学生</th><th></th></tr></thead><tbody>${staff.map(p=>`<tr><td>${who(p)}</td><td>${p.id===me?esc(ROLE_NAME[p.role]||p.role)+'（你）':`<select data-acc="${p.id}" data-rolesel aria-label="角色">${['planner','admin',...(['planner','admin'].includes(p.role)?[]:[p.role])].map(r=>`<option value="${r}" ${p.role===r?'selected':''}>${esc(ROLE_NAME[r]||r)}</option>`).join('')}</select>`}</td><td>${cnt[p.id]||0} 人</td><td class="act">${p.id===me?'':`<button type="button" class="btn sm ghost" data-acc="${p.id}" data-off="1">停用</button>`}</td></tr>`).join('')}</tbody></table>
   ${off.length?`<h2 class="tg-h">已停用 <span class="cnt">${off.length}</span></h2><table class="list"><tbody>${off.map(p=>`<tr><td>${who(p)}</td><td>${esc(ROLE_NAME[p.role]||p.role)}</td><td class="act"><button type="button" class="btn sm" data-acc="${p.id}" data-on="1">恢复</button></td></tr>`).join('')}</tbody></table>`:''}
   <p class="msg" id="teammsg" role="status"></p></section>`;
  const set=async(id,body,label)=>{$('#teammsg').textContent='正在保存……';try{await api('profiles?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});await teamView();$('#teammsg').textContent=label}catch(e){$('#teammsg').textContent='没有改成：'+e.message}};
  document.querySelectorAll('button[data-acc]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.acc;
    if(b.dataset.role)set(id,{role:b.dataset.role,status:'active'},'已开通');
    else if(b.dataset.off){if(confirm('确定停用这个账号？停用后他登录不了新版和旧版。'))set(id,{status:'disabled'},'已停用')}
    else if(b.dataset.on)set(id,{status:'active'},'已恢复')}));
  document.querySelectorAll('select[data-rolesel]').forEach(sel=>sel.addEventListener('change',()=>set(sel.dataset.acc,{role:sel.value},'角色已更新')));
}

/* ---------- 路由 ---------- */
async function route(){
  if(!readAuth())return showLogin();
  const a=readAuth();$('#logout').hidden=false;
  let pf;try{pf=await ensureProfile()}catch(e){if(e.code==='auth')return showLogin(e.message);$('#view').innerHTML=`<p class="empty">账号信息没有读到：${esc(e.message)}　<a href="#/" onclick="location.reload()">重试</a></p>`;return}
  $('#who').textContent=(pf.display_name||a.user.email||'')+(pf.role&&pf.role!=='viewer'?' · '+(ROLE_NAME[pf.role]||pf.role):'');
  if(pf.status!=='active'||pf.role==='viewer')return gateView(pf);
  $('#navTeam').hidden=pf.role!=='admin';
  if(pf.role==='admin'&&!STAFF){try{await loadStaff()}catch(e){}}
  const h=location.hash;
  const m=h.match(/^#\/s\/([0-9a-f-]{36})/),kb=h.match(/^#\/kb(?:\/(bk|zk))?(?:\?(.*))?$/),tl=h.match(/^#\/t\/([a-z-]+)$/);
  setNav(m||!h||h==='#/'?'stu':kb?'kb':h.startsWith('#/hx')?'hx':h.startsWith('#/team')?'team':tl||h.startsWith('#/tools')?'tools':'stu');
  document.body.classList.toggle('full',!!(h.startsWith('#/hx')||tl));
  try{
    if(m){await openStudent(m[1])}
    else if(kb){view='kb';cur=null;curPlan=null;hxFrame=null;$('#crumb').innerHTML='';
      if(!benchLoaded){$('#view').innerHTML='<p class="loading">正在载入……</p>';await loadBench()}
      await loadScript('kb.js');const q=new URLSearchParams(kb[2]||'');
      await window.KB.mount($('#view'),kb[1]||'bk',{sid:q.has('sid')?q.get('sid'):null});
    }
    else if(h.startsWith('#/hx')){view='hx';cur=null;curPlan=null;hxFrame=null;$('#crumb').innerHTML='';
      $('#view').innerHTML=`<iframe class="hx full" title="划线看组" src="../huaxian/?v=20261114-v2-r3"></iframe>`}
    else if(tl&&TOOLS[tl[1]]){view='tool';cur=null;curPlan=null;hxFrame=null;const t=TOOLS[tl[1]];
      $('#crumb').innerHTML=`<a href="#/tools">专题与工具</a> › <b>${esc(t[0])}</b>`;
      $('#view').innerHTML=`<div class="tool-bar"><span class="cnt">${esc(t[2])}</span><a class="btn sm" href="${t[1]}" target="_blank" rel="noopener">在新窗口打开</a></div><iframe class="hx full tool" title="${esc(t[0])}" src="${t[1]}"></iframe>`}
    else if(h.startsWith('#/team')&&pf.role==='admin'){view='team';cur=null;curPlan=null;hxFrame=null;$('#crumb').innerHTML='';await teamView()}
    else if(h.startsWith('#/tools')){view='tools';cur=null;curPlan=null;hxFrame=null;$('#crumb').innerHTML='';toolsView()}
    else{cur=null;curPlan=null;hxFrame=null;$('#view').innerHTML='<p class="loading">正在载入学生……</p>';await loadBench();benchView()}
  }catch(e){if(e.code==='auth')return showLogin(e.message);$('#view').innerHTML=`<p class="empty">载入失败：${esc(e.message)}　<a href="#/">重试</a></p>`}
}
window.addEventListener('hashchange',()=>{clearTimeout(saveT);if(curPlan&&view==='student')savePlan();route()});
document.addEventListener('click',e=>{const a=e.target.closest('a[data-nav="stu"]');if(a&&view!=='bench'){benchLoaded=false}});
$('#logout').addEventListener('click',()=>{try{localStorage.removeItem(AUTH_KEY)}catch(e){}cur=null;PROFILE=null;STAFF=null;benchLoaded=false;showLogin()});
$('#newform').addEventListener('submit',createStudent);
$('#newform').addEventListener('click',e=>{const b=e.target.closest('[data-seg="kl"] button');if(b){b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{$('#'+b.dataset.close).hidden=true}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal:not([hidden])').forEach(m=>m.hidden=true)});
document.addEventListener('click',e=>{const d=$('#libmenu');if(d&&d.open&&!d.contains(e.target))d.open=false});
route();
})();
