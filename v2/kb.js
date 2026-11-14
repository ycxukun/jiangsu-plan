/* 知行学录 v2 · 院校库（本科 / 专科）
   数据：data/<bk|zk>/index.json（列表+筛选，进页面就载入）、search.json（专业名搜索，随后载入）、
   s/<n>.json（点开某校时才载入）。所有风险/命名/体检/特殊类型的判断都是旧版函数事先算好的结果，
   这里只负责筛选和显示，所以与旧版知识库一致。
   冲稳保：选了学生后，用 2026 投档线（没有时用 2025 组线，标明）与学生分数比较，口径与划线看组一致。 */
(function(){
'use strict';
const Z=window.ZX; // 由 app.js 提供：api, esc, students(), planOf(), savePlanFor()
const esc=Z.esc;
const $=s=>document.querySelector(s);
const fmt=v=>v==null||v===''?'—':(typeof v==='number'?v.toLocaleString('zh-CN'):String(v));
const signed=v=>v==null?'—':(v>0?'+'+v:String(v));
const DS={}; // 数据缓存：bk / zk
const K={kind:'bk',batch:'',sub:'',q:'',prov:new Set(),city:new Set(),lv:new Set(),spec:new Set(),specMode:'drop',req:new Set(),reqAuto:true,cls:new Set(),smin:'',smax:'',med:new Set(),medHide:false,band:'',sid:'',page:0,open:null,gopen:null};
const PAGE=40;
const BAND_ORDER={冲:1,稳:2,保:3};

/* ---------- 数据 ---------- */
async function load(kind){
  if(DS[kind])return DS[kind];
  const v=Z.V;
  const d=await (await fetch(`data/${kind}/index.json?v=${v}`)).json();
  const sc=d.scols,gc=d.gcols;
  const S=d.S.map((r,i)=>{const o={i};sc.forEach((k,j)=>o[k]=r[j]);o.facetNames=o.facets.map(x=>d.facets[x]);o.groups=[];return o});
  const G=d.G.map((r,i)=>{const o={i};gc.forEach((k,j)=>o[k]=r[j]);o.s=S[o.e];o.specNames=o.spec.map(x=>d.specs[x]);o.trainNames=(o.train||[]).map(x=>d.specs[x]);o.clsNames=o.cls.map(x=>d.classes[x]);o.s.groups.push(o);return o});
  const ds={kind,meta:d.meta,facets:d.facets,specs:d.specs,classes:d.classes,S,G,words:null,shards:{}};
  DS[kind]=ds;
  fetch(`data/${kind}/search.json?v=${v}`).then(r=>r.json()).then(w=>{ds.words=w;if(K.q&&K.kind===kind)renderAll()}).catch(()=>{});
  return ds;
}
async function shard(ds,n){
  if(ds.shards[n])return ds.shards[n];
  const r=await fetch(`data/${ds.kind}/s/${n}.json?v=${Z.V}`);
  if(!r.ok)throw new Error('学校数据没有载入（'+r.status+'）');
  return ds.shards[n]=await r.json();
}

/* ---------- 学生口径 ---------- */
function student(){return K.sid?(Z.students().find(s=>s.id===K.sid)||null):null}
const klName=t=>t==='history'?'历史':'物理';
function reqSubjects(req){const t=String(req||'').replace(/\s+/g,'');if(!t||/不限|无要求|任意/.test(t))return [];const o=[];if(/化/.test(t))o.push('化学');if(/生/.test(t))o.push('生物');if(/政/.test(t))o.push('政治');if(/地/.test(t))o.push('地理');return [...new Set(o)]}
function reqOk(req,subs){const r=reqSubjects(req);if(!r.length)return true;if(!subs.length)return false;return /或|任选|任一/.test(String(req))?r.some(x=>subs.includes(x)):r.every(x=>subs.includes(x))}
function lineOf(g){if(g.l26!=null)return {L:g.l26,R:g.r26,y:26};if(g.s25!=null)return {L:g.s25,R:g.r25,y:25};return null}
function bandOf(g,S){
  if(S==null)return null;const l=lineOf(g);if(!l)return {b:'待定',t:'这个组没有 2026 投档线，也没有 2025 组线，不能判断'};
  const L=l.L,d=S-L,src=l.y===26?'26投档线':'25组线（26线未出）';
  let b;if(L>S+10)b='够不着';else if(L>S)b='冲';else if(L>=S-10)b='稳';else if(L>=S-30)b='保';else b='富余';
  return {b,t:`${src} ${L}分，学生 ${S}分，${d>=0?'高':'低'}${Math.abs(d)}分`,y:l.y};
}
function medCodes(){const s=student();if(s&&(s.medical_codes||[]).length&&!K.med.size)return new Set(s.medical_codes);return K.med}

/* ---------- 筛选 ---------- */
const TIER=q=>{const n=q.replace(/\s/g,'');if(/^985(大学|高校|院校)?$/.test(n)||n==='九八五')return '985';if(/^211(大学|高校|院校)?$/.test(n))return '211';if(['双一流','一流大学','一流学科'].includes(n))return '双一流';if(['保研','保研资格','推免资格'].includes(n))return '保研资格';if(n==='国家重点')return '国重点';if(['保研双非','普通公办','公办','民办','国重点'].includes(n))return n;return ''};
function filtered(ds){
  const st=student(),S=st?.score??null;
  const sub=K.sub||(st?klName(st.subject_type):'');
  const subs=st?.subject_choices||[];
  const q=K.q.trim().toLowerCase().replace(/\s+/g,''),tier=q?TIER(q):'';
  const smin=K.smin===''?null:+K.smin,smax=K.smax===''?null:+K.smax;
  const med=medCodes();
  const out=[];
  for(const s of ds.S){
    if(K.batch&&!/^(guide|specialty):/.test(K.batch)&&s.bat!==K.batch)continue;
    if(sub&&s.sub!==sub)continue;
    if(K.prov.size||K.city.size){const okP=K.prov.has(s.prov),okC=s.prov==='江苏'&&K.city.has(s.city);if(!(okP&&!(s.prov==='江苏'&&K.city.size))&&!okC)continue}
    if(K.lv.size&&!s.facetNames.some(f=>K.lv.has(f)))continue;
    if(tier&&!s.facetNames.includes(tier))continue;
    const sText=q&&!tier?(s.name+s.prov+s.city+s.sub+s.bat+s.facetNames.join('')).toLowerCase():'';
    const sHit=q&&!tier&&sText.includes(q);
    const vis=[];
    for(const g of s.groups){
      if(K.batch.startsWith('guide:')&&g.guide!==K.batch.slice(6))continue;
      if(K.batch.startsWith('specialty:')&&g.zk!==K.batch)continue;
      if(K.spec.size){const names=g.specNames.concat(g.trainNames);const hit=names.some(x=>K.spec.has(x));if(K.specMode==='only'?!hit:hit)continue}
      if(st&&K.reqAuto){if(!reqOk(g.req,subs))continue}else if(K.req.size&&!K.req.has(g.req))continue;
      if(smin!=null||smax!=null){const sc=[g.l26,g.s25,g.ps,g.anchor].filter(x=>x!=null);if(!sc.some(x=>(smin==null||x>=smin)&&(smax==null||x<=smax)))continue}
      if(K.cls.size&&!g.clsNames.some(c=>K.cls.has(c)))continue;
      if(K.medHide&&med.size&&[...med].some(c=>(g.med[c]||0)>=g.nm))continue;
      const band=bandOf(g,S);
      if(K.band&&(!band||band.b!==K.band))continue;
      if(q&&!tier&&!sHit){const t=(g.gname+g.title+g.req+g.tags+g.clsNames.join('')+g.summary+(ds.words?ds.words[g.i]:'')).toLowerCase().replace(/\s+/g,'');if(!t.includes(q))continue}
      vis.push({g,band});
    }
    if(!vis.length)continue;
    vis.sort((a,b)=>((b.g.wm??-1)-(a.g.wm??-1))||((a.g.r25??1e9)-(b.g.r25??1e9))||((b.g.s25??-1)-(a.g.s25??-1))||String(a.g.gname).localeCompare(b.g.gname,'zh'));
    out.push({s,vis});
  }
  const inWin=x=>S!=null&&x.vis.some(v=>v.band&&BAND_ORDER[v.band.b])?0:1;
  out.sort((a,b)=>(inWin(a)-inWin(b))||((b.s.ws??-1)-(a.s.ws??-1))||(Math.max(...b.vis.map(x=>x.g.s25??-1))-Math.max(...a.vis.map(x=>x.g.s25??-1)))||a.s.name.localeCompare(b.s.name,'zh'));
  return out;
}

/* ---------- 页面骨架 ---------- */
let root=null,ds=null,cache=null;
async function mount(el,kind,params){
  root=el;const switching=K.kind!==kind;K.kind=kind;
  if(switching){K.batch='';K.spec.clear();K.cls.clear();K.req.clear();K.page=0;K.open=null}
  if(params.sid!=null)K.sid=params.sid;
  if(params.open!=null)K.open=params.open;
  el.innerHTML=`<p class="loading">正在载入${kind==='zk'?'专科':'本科'}院校库……</p>`;
  try{ds=await load(kind)}catch(e){el.innerHTML=`<p class="empty">院校数据没有载入：${esc(e.message)}　<a href="#/kb/${kind}">重试</a></p>`;return}
  if(root!==el)return;
  el.innerHTML=`<section class="kb">
    <div class="kb-bar">
      <span class="seg" role="group" aria-label="本科或专科"><a role="button" href="#/kb/bk" aria-pressed="${kind==='bk'}">本科</a><a role="button" href="#/kb/zk" aria-pressed="${kind==='zk'}">专科</a></span>
      <label class="kb-stu"><span>按学生看</span><select id="kbsid"><option value="">不选学生</option>${Z.students().map(s=>`<option value="${esc(s.id)}" ${s.id===K.sid?'selected':''}>${esc(s.name)}${s.score?'　'+s.score+'分':''}</option>`).join('')}</select></label>
      <input type="search" id="kbq" placeholder="搜学校、专业组、专业、专业类，或 985 / 211 / 保研" value="${esc(K.q)}" aria-label="搜索">
    </div>
    <div class="kb-filters" id="kbf"></div>
    <div class="kb-sum" id="kbsum"></div>
    <div class="kb-main"><aside class="kb-list" id="kblist" aria-label="院校列表"></aside><article class="kb-detail" id="kbdet"></article></div>
  </section>`;
  $('#kbsid').addEventListener('change',e=>{K.sid=e.target.value;K.med.clear();K.reqAuto=true;K.page=0;renderAll();renderDetail()});
  let qt=0;$('#kbq').addEventListener('input',e=>{clearTimeout(qt);qt=setTimeout(()=>{K.q=e.target.value;K.page=0;renderAll()},180)});
  renderAll();renderDetail();
}
function renderAll(){if(!root||!ds)return;cache=filtered(ds);renderFilters();renderSummary();renderList()}

/* 筛选按钮：每个按钮弹出一个面板 */
function chip(set,v,label,cnt){return `<label class="chip"><input type="checkbox" data-set="${set}" value="${esc(v)}" ${K[set].has(v)?'checked':''}>${esc(label||v)}${cnt!=null?` <small>${cnt}</small>`:''}</label>`}
function pop(id,label,active,body){return `<details class="fpop" data-pop="${id}" ${openPop===id?'open':''}><summary class="${active?'on':''}">${esc(label)}</summary><div class="fpop-b">${body}</div></details>`}
let openPop=null;
function renderFilters(){
  const st=student(),m=ds.meta,isZk=ds.kind==='zk';
  const provs=[...new Set(ds.S.map(s=>s.prov))];
  const regionBody=(m.regions||[]).map(r=>{const items=r.items.filter(p=>provs.includes(p));return items.length?`<div class="fam">${esc(r.title)}</div><div class="chips">${items.map(p=>chip('prov',p)).join('')}</div>`:''}).join('')
    +`<div class="fam">江苏城市（只看江苏某几个城市时用）</div>${(m.jsCities||[]).map(g=>`<div class="chips"><b class="cnt">${esc(g.title)}</b>${g.items.map(c=>chip('city',c)).join('')}</div>`).join('')}`;
  const facetCnt={};ds.S.forEach(s=>s.facetNames.forEach(f=>facetCnt[f]=(facetCnt[f]||0)+1));
  const lvBody=`<div class="chips">${Object.keys(facetCnt).sort((a,b)=>facetCnt[b]-facetCnt[a]).map(f=>chip('lv',f,f,facetCnt[f])).join('')}</div>`;
  const specCnt={};ds.G.forEach(g=>g.specNames.concat(g.trainNames).forEach(x=>specCnt[x]=(specCnt[x]||0)+1));
  const known=new Set();const specBody=`<div class="seg sm"><button type="button" data-mode="only" aria-pressed="${K.specMode==='only'}">只看这些</button><button type="button" data-mode="drop" aria-pressed="${K.specMode==='drop'}">排除这些</button></div>`
    +(m.specialGroups||[]).map(gp=>{const it=gp.items.filter(x=>specCnt[x]);it.forEach(x=>known.add(x));return it.length?`<div class="fam">${esc(gp.title)}</div><div class="chips">${it.map(x=>chip('spec',x,x,specCnt[x])).join('')}</div>`:''}).join('')
    +`<div class="fam">其他标签</div><div class="chips">${Object.keys(specCnt).filter(x=>!known.has(x)).sort((a,b)=>specCnt[b]-specCnt[a]).map(x=>chip('spec',x,x,specCnt[x])).join('')}</div>`;
  const reqCnt={};ds.G.forEach(g=>reqCnt[g.req]=(reqCnt[g.req]||0)+1);
  const reqBody=(st?`<label class="chk"><input type="checkbox" id="reqauto" ${K.reqAuto?'checked':''}> 按 ${esc(st.name)} 的再选科目自动筛（${esc((st.subject_choices||[]).join('')||'未填再选')}）</label>`:'')
    +`<div class="chips" ${st&&K.reqAuto?'style="opacity:.45;pointer-events:none"':''}>${Object.keys(reqCnt).sort((a,b)=>reqCnt[b]-reqCnt[a]).map(r=>chip('req',r,r||'不限',reqCnt[r])).join('')}</div>`;
  const disc={};const order=m.disciplineOrder||[];const clsCnt={};ds.G.forEach(g=>g.clsNames.forEach(c=>clsCnt[c]=(clsCnt[c]||0)+1));
  Object.keys(clsCnt).forEach(c=>{let d=(m.classDisc||{})[c]||'其他';if(/^(文学|历史学|哲学)$/.test(d))d='文学/历史/哲学';if(!isZk&&!order.includes(d))d='其他';(disc[d]=disc[d]||[]).push(c)});
  const discKeys=isZk?Object.keys(disc).sort((a,b)=>disc[b].length-disc[a].length):order.filter(d=>disc[d]);
  const clsBody=`<input type="search" class="fpop-q" data-q="cls" placeholder="找专业类，如 计算机、土木">`+discKeys.map(d=>`<div class="fam">${esc(d)}</div><div class="chips">${disc[d].sort((a,b)=>clsCnt[b]-clsCnt[a]).map(c=>chip('cls',c,c,clsCnt[c])).join('')}</div>`).join('');
  const medMeta=m.medCodes||{};const stMed=st&&(st.medical_codes||[]).length&&!K.med.size;
  const medBody=(stMed?`<p class="cnt">正在使用 ${esc(st.name)} 档案里的体检代码：${esc(st.medical_codes.join('、'))}。在下面另选会临时替换。</p>`:'')
    +`<label class="chk"><input type="checkbox" id="medhide" ${K.medHide?'checked':''}> 隐藏整组都受限的专业组</label><div class="medgrid">${Object.keys(medMeta).map(c=>`<label><input type="checkbox" data-set="med" value="${c}" ${K.med.has(c)?'checked':''}><b>${c}</b><span>${esc(medMeta[c])}</span></label>`).join('')}</div>`;
  const scoreBody=`<div class="row2"><label class="f"><span>最低分</span><input type="number" id="smin" value="${esc(K.smin)}" min="0" max="750"></label><label class="f"><span>最高分</span><input type="number" id="smax" value="${esc(K.smax)}" min="0" max="750"></label></div><p class="cnt">按专业组的 26 投档线、25 组线、预测分任一落在区间内来筛。</p>${st&&st.score?`<button type="button" class="btn sm" id="sfill">按 ${esc(st.name)} 的 ${st.score} 分：${st.score-30} ~ ${st.score+15}</button>`:''}`;
  const subs=[...new Set(ds.S.map(s=>s.sub))];
  const batchOpts=(m.batches||[]).map(([v,t])=>`<option value="${esc(v)}" ${K.batch===v?'selected':''}>${esc(t)}</option>`).join('');
  const stKl=st?klName(st.subject_type):'';
  $('#kbf').innerHTML=`<select id="fbatch" aria-label="批次">${batchOpts||'<option value="">全部批次</option>'}</select>
    <select id="fsub" aria-label="科类" ${st?'disabled title="已按学生的科类"':''}><option value="">全部科类</option>${subs.map(x=>`<option ${(K.sub||stKl)===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
    ${pop('req',K.req.size?`选科 ${K.req.size}`:(st&&K.reqAuto?'选科：按学生':'选科要求'),K.req.size||(st&&K.reqAuto),reqBody)}
    ${pop('reg',K.prov.size||K.city.size?`地区 ${K.prov.size}省${K.city.size?'/'+K.city.size+'市':''}`:'全部地区',K.prov.size||K.city.size,regionBody)}
    ${pop('lv',K.lv.size?`院校层次 ${K.lv.size}`:'院校层次',K.lv.size,lvBody)}
    ${pop('spec',K.spec.size?`${K.specMode==='only'?'只看':'排除'} ${K.spec.size} 类`:'特殊类型/标签',K.spec.size,specBody)}
    ${pop('cls',K.cls.size?`专业类 ${K.cls.size}`:'专业大类',K.cls.size,clsBody)}
    ${pop('score',K.smin||K.smax?`分数 ${K.smin||'…'}~${K.smax||'…'}`:'分数区间',K.smin||K.smax,scoreBody)}
    ${pop('med',medCodes().size?`体检 ${[...medCodes()].join('/')}`:'体检受限',medCodes().size,medBody)}
    <button type="button" class="btn sm ghost" id="freset">清空筛选</button>`;
  bindFilters();
}
function bindFilters(){
  const f=$('#kbf');
  f.querySelectorAll('details.fpop').forEach(d=>d.addEventListener('toggle',()=>{if(d.open){openPop=d.dataset.pop;f.querySelectorAll('details.fpop').forEach(o=>{if(o!==d)o.open=false})}else if(openPop===d.dataset.pop)openPop=null}));
  f.addEventListener('change',e=>{const i=e.target;
    if(i.dataset.set){const set=K[i.dataset.set];i.checked?set.add(i.value):set.delete(i.value);if(i.dataset.set==='prov'&&i.value==='江苏'&&!i.checked)K.city.clear();K.page=0;refresh();return}
    if(i.id==='fbatch'){K.batch=i.value;K.page=0;refresh();return}
    if(i.id==='fsub'){K.sub=i.value;K.page=0;refresh();return}
    if(i.id==='reqauto'){K.reqAuto=i.checked;refresh();return}
    if(i.id==='medhide'){K.medHide=i.checked;refresh();return}
    if(i.id==='smin'||i.id==='smax'){K[i.id]=i.value;K.page=0;refresh();return}
  });
  f.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.mode){K.specMode=b.dataset.mode;refresh()}
    else if(b.id==='sfill'){const s=student();K.smin=String(s.score-30);K.smax=String(s.score+15);K.page=0;refresh()}
    else if(b.id==='freset'){K.batch='';K.sub='';K.prov.clear();K.city.clear();K.lv.clear();K.spec.clear();K.req.clear();K.reqAuto=true;K.cls.clear();K.smin='';K.smax='';K.med.clear();K.medHide=false;K.band='';K.page=0;openPop=null;refresh()}
  });
  f.addEventListener('input',e=>{const i=e.target;if(i.dataset.q!=='cls')return;const q=i.value.trim();i.closest('.fpop-b').querySelectorAll('label.chip').forEach(l=>l.hidden=!!q&&!l.textContent.includes(q))});
}
function refresh(){renderAll();renderDetail(true)}

function renderSummary(){
  const st=student(),c={冲:0,稳:0,保:0};let groups=0;
  cache.forEach(x=>x.vis.forEach(v=>{groups++;if(v.band&&c[v.band.b]!=null)c[v.band.b]++}));
  $('#kbsum').innerHTML=`<span><b>${cache.length.toLocaleString()}</b> 所院校 · <b>${groups.toLocaleString()}</b> 个专业组</span>`
    +(st?`<span class="grow"></span><span class="cnt">按 ${esc(st.name)} ${st.score??'—'}分看（能冲稳保的学校排在前面）：</span>${['','冲','稳','保'].map(b=>`<button type="button" class="chip" data-band="${b}" aria-pressed="${K.band===b}">${b||'全部'}${b?` <small>${c[b]}</small>`:''}</button>`).join('')}`
      :`<span class="grow"></span><span class="cnt">选一个学生，就能看到每个组是冲、稳还是保</span>`);
  $('#kbsum').querySelectorAll('[data-band]').forEach(b=>b.addEventListener('click',()=>{K.band=b.dataset.band;K.page=0;renderAll()}));
}
function bandTag(b){if(!b)return '';const cls={冲:'chong',稳:'wen',保:'bao'}[b.b]||'other';return `<span class="band ${cls}" title="${esc(b.t)}">${esc(b.b)}</span>`}
function renderList(){
  const pages=Math.max(1,Math.ceil(cache.length/PAGE));K.page=Math.min(K.page,pages-1);
  const rows=cache.slice(K.page*PAGE,(K.page+1)*PAGE);
  const cur=K.open;
  $('#kblist').innerHTML=(rows.length?rows.map(({s,vis})=>{const bc={};vis.forEach(v=>{if(v.band)bc[v.band.b]=(bc[v.band.b]||0)+1});
    return `<button type="button" class="kb-it ${cur===s.i?'on':''}" data-si="${s.i}"><span class="nm">${esc(s.name)}${s.prio==='high'?' <span class="warnb">专业优先</span>':''}</span>
      <span class="mt">${esc(s.region||s.city)} · ${esc(s.sub)} · ${esc(s.bat)} · ${vis.length}组${s.levelText?' · '+esc(s.levelText.split('/').slice(0,3).join('/')):''}</span>
      <span class="mt2">${s.ws!=null?`加权均分 <b>${s.ws}</b>`:''}${Object.keys(bc).sort((a,b)=>(BAND_ORDER[a]||9)-(BAND_ORDER[b]||9)).map(k=>`<span class="band ${({冲:'chong',稳:'wen',保:'bao'})[k]||'other'}">${k}${bc[k]}</span>`).join('')}</span></button>`}).join('')
    :'<p class="empty">没有符合条件的院校。可以点上面的“清空筛选”。</p>')
    +(pages>1?`<div class="pager"><button type="button" class="btn sm" data-pg="${K.page-1}" ${K.page?'':'disabled'}>上一页</button><span class="cnt">${K.page+1} / ${pages}</span><button type="button" class="btn sm" data-pg="${K.page+1}" ${K.page<pages-1?'':'disabled'}>下一页</button></div>`:'');
  $('#kblist').querySelectorAll('[data-si]').forEach(b=>b.addEventListener('click',()=>{K.open=+b.dataset.si;K.gopen=null;$('#kblist').querySelectorAll('.kb-it').forEach(x=>x.classList.toggle('on',x===b));renderDetail();if(matchMedia('(max-width:860px)').matches)$('#kbdet').scrollIntoView({behavior:'smooth'})}));
  $('#kblist').querySelectorAll('[data-pg]').forEach(b=>b.addEventListener('click',()=>{K.page=+b.dataset.pg;renderList();$('#kblist').scrollTop=0}));
}

/* ---------- 学校页 ---------- */
let detToken=0;
async function renderDetail(keep){
  const el=$('#kbdet');if(!el)return;
  if(K.open==null||!ds.S[K.open]){
    if(cache&&cache.length&&!keep){K.open=cache[0].s.i;$('#kblist .kb-it')?.classList.add('on')}else{el.innerHTML='<p class="empty">左边点一所学校，看它的专业组和专业。</p>';return}
  }
  const s=ds.S[K.open],my=++detToken;
  el.innerHTML='<p class="loading">正在打开 '+esc(s.name)+'……</p>';
  let sh;try{sh=await shard(ds,s.shard)}catch(e){el.innerHTML=`<p class="empty">${esc(e.message)}</p>`;return}
  if(my!==detToken)return;
  const en=sh.entries[s.se]||sh.entries.find(x=>x.sub===s.sub&&x.bat===s.bat)||sh.entries[0];
  const visCodes=new Set(((cache||[]).find(x=>x.s.i===s.i)?.vis||[]).map(v=>v.g.code));
  const st=student(),S=st?.score??null;
  let groups=en.groups.map(g=>({g,ix:ds.G.find(x=>x.s===s&&x.code===g.code)}));
  const filteredOut=groups.filter(x=>!visCodes.has(x.g.code)).length;
  const showAll=K.showAllGroups||!visCodes.size;
  if(!showAll)groups=groups.filter(x=>visCodes.has(x.g.code));
  groups.sort((a,b)=>((b.g.wm??-1)-(a.g.wm??-1))||((a.g.r25??1e9)-(b.g.r25??1e9))||((b.g.s25??-1)-(a.g.s25??-1)));
  if(!K.gopen||!groups.some(x=>x.g.k===K.gopen))K.gopen=groups[0]?.g.k||null;
  const p26=groups.reduce((a,x)=>a+(x.g.p26||0),0),p25=groups.reduce((a,x)=>a+(x.g.p25||0),0);
  el.innerHTML=`<header class="sch">
    <div class="sch-t"><h2>${esc(s.name)}</h2>${en.priority?`<span class="warnb" title="${esc(en.priority.title)}">⚠ ${esc(en.priority.label)}录取</span>`:''}
      <button type="button" class="btn sm" id="sinfo">院校基础信息</button><button type="button" class="btn sm ghost" id="sprint">打印本校全部专业组</button></div>
    <div class="tags"><span>${esc(en.region||s.city)}</span><span>${esc(s.sub)}</span><span>${esc(s.bat)}</span>${en.levelText?`<span>${esc(en.levelText)}</span>`:''}</div>
    ${en.priority?`<p class="alert">录取规则提示：${esc(en.priority.rules[0]||'')}</p>`:''}
    <div class="metrics"><div><b>${fmt(en.ws)}</b><span>院校加权平均分</span></div><div><b>${fmt(en.wr)}</b><span>加权平均位次</span></div><div><b>${fmt(p26)}</b><span>2026 计划（显示的组）</span></div><div><b class="${p26-p25>0?'up':p26-p25<0?'down':''}">${signed(p26-p25)}</b><span>较 2025 计划</span></div></div>
    ${filteredOut&&!K.showAllGroups?`<p class="cnt">按当前筛选显示 ${groups.length} 个组，另有 ${filteredOut} 个组被筛掉。<button type="button" class="linkbtn" id="showall">显示本校全部专业组</button></p>`:K.showAllGroups&&filteredOut?`<p class="cnt">正在显示本校全部专业组。<button type="button" class="linkbtn" id="showall">只看符合筛选的</button></p>`:''}
  </header>
  <div class="gcards">${groups.map(({g,ix})=>gcard(g,ix,S)).join('')}</div>
  <div id="gdet"></div>`;
  $('#sinfo').addEventListener('click',()=>schoolInfo(s,en,sh));
  $('#sprint').addEventListener('click',()=>printSchool(s,en,groups,S));
  $('#showall')?.addEventListener('click',()=>{K.showAllGroups=!K.showAllGroups;renderDetail(true)});
  el.querySelectorAll('[data-gk]').forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('[data-add]'))return;K.gopen=c.dataset.gk;el.querySelectorAll('.gcard').forEach(x=>x.classList.toggle('on',x===c));renderGroup(groups,S)}));
  el.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>addToPlan(b.dataset.add,b)));
  renderGroup(groups,S);
}
function lineText(g){
  if(g.l26)return `<span class="l26">26投档线 ${g.l26[0]}分${g.l26[1]?`（${fmt(g.l26[1])}位）`:''}</span>`;
  if(g.pred&&g.s25==null)return `<span title="${esc(g.pred.why)}">预测 ${g.pred.s}分 · ${fmt(g.pred.r)}位 <small>估</small></span>`;
  return `<span>25分 ${fmt(g.s25)} · 25位次 ${fmt(g.r25)}</span>`;
}
function medCount(g,med){if(!med.size)return 0;return g.majors.filter(m=>m.med.some(c=>med.has(c))).length}
function gcard(g,ix,S){
  const band=ix?bandOf(ix,S):null,st=student(),med=medCodes(),mc=medCount(g,med),pd=(g.p26||0)-(g.p25||0);
  const inPlan=st&&ix?.hx&&planHas(st.id,g.code);
  return `<article class="gcard q-${esc(g.q[0])} ${K.gopen===g.k?'on':''}" data-gk="${esc(g.k)}" tabindex="0" title="${esc(g.q[2])}">
    <div class="gc-h"><b>${esc(g.title)}</b>${bandTag(band)}</div>
    <div class="gc-l">${lineText(g)}</div>
    <div class="gc-m"><span>再选 ${esc(g.req||'不限')}</span><span>${g.majors.length} 个专业</span><span>计划 ${fmt(g.p26)}${g.p25!=null?`（${signed(pd)}）`:''}</span></div>
    <div class="gc-tags"><span class="ql q-${esc(g.q[0])}">${esc(g.q[1])}</span>${g.guide&&g.guide.ok?`<span class="tg">${esc(g.guide.scope)}</span>`:''}${g.coopN?`<span class="tg">中外合作 ${g.coopN}</span>`:''}${mc?`<span class="tg warn">体检限报 ${mc}/${g.majors.length}</span>`:''}</div>
    ${st&&ix?.hx?`<button type="button" class="btn sm ${inPlan?'':'primary'}" data-add="${esc(g.code)}">${inPlan?'✓ 已在志愿表（点击移出）':'＋ 加入志愿表'}</button>`:''}
  </article>`;
}
function renderGroup(groups,S){
  const box=$('#gdet');if(!box)return;
  const x=groups.find(x=>x.g.k===K.gopen);if(!x){box.innerHTML='';return}
  box.innerHTML=groupSection(x.g,x.ix,S,false);
  box.querySelectorAll('[data-coop]').forEach(b=>b.addEventListener('click',()=>{const m=x.g.majors.find(m=>m.key===b.dataset.coop);if(m)coopModal(x.g,m)}));
  box.querySelector('[data-chg]')?.addEventListener('click',()=>changeModal(x.g));
  box.querySelector('[data-guide]')?.addEventListener('click',()=>modal(x.g.guide.title,`<p>${esc(x.g.guide.summary)}</p><p class="cnt">详细流程在 <a href="../early-batch/" target="_blank" rel="noopener">提前批助手</a>、<a href="../strong-base/" target="_blank" rel="noopener">强基计划助手</a>、<a href="../comprehensive/index.html" target="_blank" rel="noopener">综合评价</a>。</p>`));
}
function groupSection(g,ix,S,print){
  const st=student(),subs=st?.subject_choices||[],med=medCodes();
  const band=ix?bandOf(ix,S):null,pd=(g.p26||0)-(g.p25||0);
  const reqBad=st&&!reqOk(g.req,subs);
  const rows=g.majors.map(m=>{
    const mb=med.size?m.med.filter(c=>med.has(c)):[];
    const risk=m.risk?`<span class="rk ${esc(m.risk[0])}" title="${esc(m.risk[2])}">${esc(m.risk[1])}</span>`:'';
    const badges=(m.dur&&m.dur!=='四'&&ds.kind==='bk'?`<span class="mbg">${esc(m.dur)}年</span>`:'')+(m.fee!=null&&m.fee>10000?`<span class="mbg fee" title="学费 ${fmt(m.fee)} 元/年">高收费</span>`:'')+(mb.length?`<span class="mbg warn" title="${esc(mb.map(c=>c+'：'+(ds.meta.medCodes[c]||'')).join('；'))}">体检限报 ${esc(mb.join('/'))}</span>`:'');
    const chg=m.chg==='added'?' r-add':m.chg==='anomaly'?' r-anom':'';
    return `<tr class="${m.risk?'r-risk r-'+esc(m.risk[0]):''}${mb.length?' r-med':''}${chg}"><td class="mono">${esc(m.code)}</td>
      <td><span class="mn">${esc(m.name)}</span>${risk}${badges}${m.chg==='added'?'<span class="mbg add">26新增</span>':''}${m.coop&&!print?` <button type="button" class="linkbtn" data-coop="${esc(m.key)}">中外合作详情</button>`:''}</td>
      <td>${esc(m.cls||'—')}</td><td class="num">${fmt(m.p26)} / ${m.pc==null?'—':signed(m.pc)}</td><td class="num">${fmt(m.s25)} / ${fmt(m.r25)}</td><td class="num">${fmt(m.a3)} / ${fmt(m.ar3)}${m.ay&&m.ay<3?` <small>${m.ay}年均值</small>`:''}</td></tr>`}).join('')
    +(g.deleted||[]).map(r=>`<tr class="r-del"><td>—</td><td><span class="mn">${esc(r.name)}</span><span class="mbg">26取消</span></td><td>${esc(r.cls||'—')}</td><td class="num">— / ${r.p25!=null?'−'+r.p25:'—'}</td><td class="num">${fmt(r.s25)} / ${fmt(r.r25)}</td><td class="num">— / —</td></tr>`).join('');
  return `<section class="gsec q-${esc(g.q[0])}">
    <div class="gsec-h"><div><h3>${esc(g.title)} ${bandTag(band)}</h3>
      <p>${esc(student()?'':'')}再选：${esc(g.req||'不限')} · ${lineText(g)} · 26计划 ${fmt(g.p26)}${g.p25!=null?` · 较25年 <span class="${pd>0?'up':pd<0?'down':''}">${signed(pd)}</span>`:''}${g.naming&&g.naming.main?' · '+esc(g.naming.main):''}</p>
      <div class="gc-tags"><span class="ql q-${esc(g.q[0])}" title="${esc(g.q[2])}">${esc(g.q[1])}</span>${(g.spec||[]).filter(x=>!/^(985|211|双一流|国重点|保研资格|卓越工程师|民办)$/.test(x)).slice(0,6).map(x=>`<span class="tg">${esc(x)}</span>`).join('')}${g.guide&&g.guide.ok&&!print?`<button type="button" class="linkbtn" data-guide>${esc(g.guide.channel)}指南</button>`:''}</div>
      ${reqBad?`<p class="alert">${esc(st.name)} 的再选科目（${esc(subs.join('')||'未填')}）不满足这个组的要求：${esc(g.req)}</p>`:''}
      <p class="qdesc">${esc(g.q[2])}</p></div>
      ${!print?`<div class="gsec-a">${g.change?'<button type="button" class="btn sm" data-chg>25→26 变迁</button>':''}</div>`:''}</div>
    <div class="tw"><table class="mtab"><thead><tr><th>代码</th><th>专业名称</th><th>专业类</th><th>26计划 / 变化</th><th>25分 / 位次</th><th>三年均分 / 位次</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${g.pred&&g.s25==null&&!g.l26?`<p class="cnt">预测说明：${esc(g.pred.why)}</p>`:''}
  </section>`;
}

/* ---------- 弹层 ---------- */
function modal(title,body){
  let m=$('#kbm');if(!m){m=document.createElement('div');m.id='kbm';m.className='modal';m.hidden=true;document.body.appendChild(m);
    m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-x]'))m.hidden=true})}
  m.innerHTML=`<div class="box wide" role="dialog" aria-label="${esc(title)}"><div class="mh"><h2>${esc(title)}</h2><button type="button" class="btn ghost sm" data-x>关闭</button></div><div class="mb kbm">${body}</div></div>`;
  m.hidden=false;m.querySelector('[data-x]').focus();
}
const kv=(pairs)=>pairs&&pairs.length?`<dl class="kv">${pairs.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(typeof v==='number'?v.toLocaleString('zh-CN'):v)}</dd>`).join('')}</dl>`:'';
const sec=(t,pairs)=>{const ok=(pairs||[]).filter(([,v])=>v!=null&&v!==''&&v!=='/'&&v!=='—');return ok.length?`<section class="isec"><h4>${esc(t)}</h4>${kv(ok)}</section>`:''};
function schoolInfo(s,en,sh){
  const L=sh.life,b=L?.basic||{},ev=L?.evaluation||{},dm=L?.dormitory||{},nt=L?.network||{},mg=L?.management||{},lf=L?.life||{};
  const addr=b.address||en.infoAddr||'';const q=encodeURIComponent([s.name,addr||s.city].filter(Boolean).join(' '));
  const maps=`<div class="links"><a class="btn sm" target="_blank" rel="noreferrer" href="https://uri.amap.com/search?keyword=${q}">高德地图</a><a class="btn sm" target="_blank" rel="noreferrer" href="https://map.baidu.com/search/${q}">百度地图</a></div>`;
  modal(s.name+' · 院校基础信息',sec('院校基础信息',en.info)
    +(L?`<section class="isec"><h4>位置与宿舍生活信息</h4><p>${esc(b.overview||'')}</p>${kv([['地址',addr],['校区',b.campus],['办学层次',L.educationLevel],['办学性质',L.ownership],['城市层级',L.cityLevel],['住宿判断',ev.dormitory],['交通便利度',ev.transport],['管理强度',ev.management]].filter(([,v])=>v))}${maps}</section>`
      +sec('住宿条件',[['床桌情况',dm.bunkDesk],['宿舍人数',dm.roomCapacity],['宿舍空调',dm.dormAirConditioning],['教室空调',dm.classroomAirConditioning],['独立卫浴',dm.privateBathroom],['热水时间',dm.hotWaterTime||dm.hotWater],['洗衣机',dm.washingMachine],['通宵自习室',dm.studyRoomOvernight||dm.overnightStudyRoom]])
      +sec('网络与用电',[['功率限制',nt.powerLimit],['夜间断电',nt.nightPowerOff],['夜间断网',nt.nightNetworkOff],['校园网速度',nt.campusNetworkSpeed||nt.speed],['校园网价格',nt.campusNetworkPrice||nt.price]])
      +sec('日常管理',[['新生带电脑',mg.freshmanCanBringComputer||mg.freshmanComputer],['查寝',mg.dormCheck],['门禁时间',mg.curfewTime||mg.curfew],['早晚自习',mg.morningEveningStudy||mg.studyRequirement],['晨跑',mg.morningRun],['跑步打卡',mg.runningCheckIn]])
      +sec('交通与生活',[['地铁',lf.metro],['到市中心',lf.distanceToDowntown||lf.downtownDistance],['交通便利度',lf.transportConvenience],['外卖',lf.takeout],['食堂价格',lf.canteenPrice],['超市价格',lf.supermarketPrice],['快递',lf.parcelService||lf.parcel],['共享单车',lf.sharedBike]])
      +((ev.notes||[]).length?`<section class="isec"><h4>注意事项</h4><ul>${ev.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></section>`:'')
    :`<section class="isec"><h4>位置</h4><p class="cnt">宿舍生活信息表暂未匹配到该校。</p>${maps}</section>`));
}
function coopModal(g,m){modal(g.title+' · 中外合作详情',`<p class="cnt">${esc(m.name)}</p>`+sec('中外合作项目',m.coop))}
function changeModal(g){
  const d=g.change,pct=v=>v==null||v===''?'—':Math.round(v*100)+'%',df=(a,b)=>a==null||b==null?'—':signed(a-b);
  const blk=(t,items)=>`<section class="isec"><h4>${esc(t)} <span class="cnt">${(items||[]).length}</span></h4>${(items||[]).length?`<ol>${items.slice(0,80).map(i=>{const p=[];if(i.plan!=null&&i.plan!=='')p.push(i.plan+'人');if(i.type)p.push(i.type);if(i.from)p.push('来源：'+i.from);if(i.to)p.push('去向：'+i.to);if(i.basis)p.push('依据：'+i.basis);if(i.note||i.reason)p.push(i.note||i.reason);return `<li><b>${esc(i.name||'未命名专业')}</b>${p.length?'<br><span class="cnt">'+esc(p.join('｜'))+'</span>':''}</li>`}).join('')}</ol>`:'<p class="cnt">无</p>'}</section>`;
  modal(g.title+' · 25→26 变迁',`<div class="tags"><span>${esc(d.status||'未标注')}</span><span>${esc(d.advice||'常规核对')}</span><span>置信度：${esc(d.confidence??'—')}</span></div>
   <div class="cmp"><div><small>2026 当前组</small><b>${esc(d.group26||'—')}</b><span>再选 ${esc(d.require26??'—')} · 专业 ${fmt(d.majorCount26)} · 计划 ${fmt(d.plan26)}</span></div><div><small>2025 对应组</small><b>${esc(d.group25||'—')}</b><span>再选 ${esc(d.require25??'—')} · 专业 ${fmt(d.majorCount25)} · 计划 ${fmt(d.plan25)}</span></div></div>
   <div class="metrics sm"><div><b>${df(d.plan26,d.plan25)}</b><span>计划变化</span></div><div><b>${df(d.majorCount26,d.majorCount25)}</b><span>专业数变化</span></div><div><b>${pct(d.similarity)}</b><span>综合相似度</span></div><div><b>${pct(d.cover26)} / ${pct(d.cover25)}</b><span>26/25覆盖率</span></div></div>
   <section class="isec"><h4>变化摘要</h4><p>${esc(d.summary||'无明显变化')}</p></section>${blk('新增专业',d.details?.add)}${blk('减少专业',d.details?.remove)}${blk('拆入专业',d.details?.in)}${blk('拆出专业',d.details?.out)}`);
}
function printSchool(s,en,groups,S){
  const w=document.createElement('div');w.className='print-only';w.id='kbprint';
  w.innerHTML=`<h1>${esc(s.name)}　${esc(s.sub)} · ${esc(s.bat)}</h1>`+groups.map(x=>groupSection(x.g,x.ix,S,true)).join('');
  document.body.appendChild(w);document.body.classList.add('printing');
  const done=()=>{document.body.classList.remove('printing');w.remove();window.removeEventListener('afterprint',done)};
  window.addEventListener('afterprint',done);window.print();setTimeout(()=>{if(document.body.classList.contains('printing'))done()},60000);
}

/* ---------- 加入学生志愿表（与④出分填报是同一张表） ---------- */
function planHas(sid,code){const sn=Z.planOf(sid)?.snapshot;const t=sn?.tabs?.[sn.ti||0];return !!t&&(t.v||[]).some(v=>v.id===code)}
async function addToPlan(code,btn){
  const st=student();if(!st)return;
  const p=Z.planOf(st.id)||{id:null,student_id:st.id,snapshot:Z.defaultSnap(st)};
  const sn=p.snapshot;if(!sn.tabs||!sn.tabs.length){sn.tabs=[{n:'志愿表1',v:[]}];sn.ti=0}
  const t=sn.tabs[sn.ti||0];t.v=t.v||[];
  const i=t.v.findIndex(v=>v.id===code);
  if(i>=0)t.v.splice(i,1);else{if(t.v.length>=40){alert('这张志愿表已满 40 个');return}t.v.push({id:code,m:[],obey:true,why:'院校库'})}
  sn.n=t.v.length;
  const c={冲:0,稳:0,保:0,其他:0},byCode={};ds.G.forEach(g=>{if(g.s.sub===klName(st.subject_type))byCode[g.code]=g});
  t.v.forEach(v=>{const g=byCode[v.id],bd=g&&bandOf(g,st.score??null);const k=!bd?'其他':bd.b==='够不着'?'冲':bd.b==='富余'?'保':(c[bd.b]!=null?bd.b:'其他');c[k]++});sn.counts=c;
  btn.disabled=true;btn.textContent='正在保存……';
  try{await Z.savePlanFor(st,p);renderDetail(true)}catch(e){btn.disabled=false;btn.textContent='保存失败：'+e.message}
}

// 自检用：给定筛选条件，返回院校数和专业组数（不改界面）
async function count(kind,c){const d=await load(kind);const save=JSON.stringify([K.q,K.batch,K.sub,K.specMode]);const sets=['spec','lv','prov','city'];const old=sets.map(k=>new Set(K[k]));
  K.q=c.q||'';K.batch=c.batch||'';K.sub=c.subject||'';K.specMode=c.mode||'only';sets.forEach(k=>{K[k]=new Set(c[k]||[])});const sid=K.sid;K.sid='';
  const r=filtered(d);const out=[r.length,r.reduce((a,x)=>a+x.vis.length,0)];
  [K.q,K.batch,K.sub,K.specMode]=JSON.parse(save);sets.forEach((k,i)=>K[k]=old[i]);K.sid=sid;return out}
window.KB={mount,count};
})();
