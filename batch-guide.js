(function(){
'use strict';

const GUIDE_LINKS=window.BATCH_GUIDE_LINKS||{};
const GUIDE_DEFS=[
  {
    id:'early-military',
    channel:'军校提前批',
    title:'军校报考指南',
    scope:'提前批 · 军校',
    summary:'军校志愿必须按军校提前批通道单独核对，不能和公安、航海、专项计划、其他院校、定向医学生等提前批类型混在一个排序口径里。',
    checks:['政治考核','军检','面试','体格检查','年龄要求','应届/往届要求','性别计划','视力/身高体重','指挥类与非指挥类','录取后管理与就业路径'],
    trigger:/军校|军队院校|军事类|国防科技大学|陆军|海军|空军|火箭军|战略支援|武警|军医大学|军械|指挥类/
  },
  {
    id:'early-police',
    channel:'公安提前批',
    title:'公安院校报考指南',
    scope:'提前批 · 公安',
    summary:'公安院校和公安专业按公安提前批通道独立填报，需重点核对政审、体检、体测、面试和户籍/生源要求。',
    checks:['公安提前批属性','公安专业与普通专业区别','政审','面试','体检','体测','视力/身高','年龄','户籍或生源要求','公安联考与就业路径'],
    trigger:/公安|警校|人民公安|刑事警察|警察学院|治安学|侦查学|公安学|公安技术|网络安全与执法|交通管理工程|禁毒学|涉外警务/
  },
  {
    id:'early-maritime',
    channel:'航海提前批',
    title:'航海类报考指南',
    scope:'提前批 · 航海类',
    summary:'航海、轮机等专业按航海类通道单独核对，重点关注视力、色觉、身高、性别适配和就业环境。',
    checks:['视力要求','色觉要求','身高要求','是否适合女生','就业环境','上船工作','海员证','体检标准'],
    trigger:/航海技术|轮机工程|船舶电子电气|航海类|轮机类|船舶驾驶|海洋船舶驾驶/
  },
  {
    id:'early-special-plan',
    channel:'专项计划提前批',
    title:'专项计划报考指南',
    scope:'提前批 · 专项计划',
    summary:'专项计划按独立政策通道核对，重点确认计划类型、报考资格、户籍/学籍、审核流程和是否与普通批冲突。',
    checks:['国家专项/高校专项/地方专项类型','户籍要求','学籍要求','资格审核','报名时间','投档批次','是否影响普通批','专业限制'],
    trigger:/国家专项|高校专项|地方专项|农村专项|专项计划/
  },
  {
    id:'early-other',
    channel:'其他院校提前批',
    title:'其他院校提前批指南',
    scope:'提前批 · 其他院校',
    summary:'不属于军校、公安、航海、专项计划、定向医学生的提前批院校，统一按其他院校提前批口径核对。',
    checks:['是否属于其他院校提前批','报名或确认时间','面试/体检/政审要求','综合评价或强基规则','飞行/消防/司法等特殊要求','录取后是否影响后续批次'],
    trigger:/其他院校|本科提前批|提前本科|提前批|综合评价|强基|飞行技术|民航|空中交通管制|消防|司法警官|中央司法警官|司法行政|司法警察|监狱学|刑事执行|行政执行|罪犯心理测量/
  },
  {
    id:'early-medical',
    channel:'定向医学生提前批',
    title:'定向医学生报考指南',
    scope:'提前批 · 定向医学生',
    summary:'定向医学生按提前批定向培养通道核对，重点确认户籍、生源地、协议签订、服务年限和违约责任。',
    checks:['定向医学生属性','户籍或生源地','服务地区','协议签订','服务年限','违约责任','体检限制','专业与就业去向'],
    trigger:/定向医学生|免费医学生|免费医学定向|农村订单定向医学生|订单定向医学生|定向医学/
  },
  {
    id:'early-sergeant',
    channel:'定向军士提前批',
    title:'定向培养军士报考指南',
    scope:'专科提前批 · 定向军士',
    summary:'定向培养军士按专科提前批通道单独填报，需核对政治考核、体检、面试、年龄、性别和服役方向。',
    checks:['专科提前批','政治考核','体检','面试','年龄','性别计划','服役方向','入伍节点','培养院校','退役与就业'],
    trigger:/定向培养军士|定向军士|军士生|士官|直招军士/
  }
];
const GUIDE_PRIORITY=['early-sergeant','early-medical','early-military','early-police','early-maritime','early-special-plan','early-other'];

function esc(s){
  return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function textOf(v){
  if(v===null||v===undefined)return '';
  if(Array.isArray(v))return v.map(textOf).filter(Boolean).join(' ');
  if(typeof v==='object')return Object.values(v).map(textOf).filter(Boolean).join(' ');
  return String(v).trim();
}
function contextText(ctx={}){
  const s=ctx.school||ctx.s||{};
  const g=ctx.group||ctx.g||{};
  const m=ctx.major||ctx.m||{};
  const d=ctx.details||{};
  return [
    s.name,s.level,s.batch,s.subject,s.schoolType,s.administration,
    g.groupName,g.displayCode,g.rawGroupName,g.remark,g.majorSummary,g.rawGroupMajors,(g.tags||[]).join(' '),(g.majorClasses||[]).join(' '),
    m.name,m.baseName,m.remark,m.majorClass,m.discipline,
    d.school,d.name,d.majorFullName,d.undergraduateName,d.majorRemark,d.planCategory,d.batch,d.recruitChapter,d.admissionRule,d.subjectMajor
  ].map(textOf).filter(Boolean).join(' ');
}
function detect(ctx={}){
  const text=contextText(ctx);
  const matches=GUIDE_DEFS.filter(d=>d.trigger.test(text));
  if(!matches.length)return null;
  return matches.sort((a,b)=>GUIDE_PRIORITY.indexOf(a.id)-GUIDE_PRIORITY.indexOf(b.id))[0];
}
function allMatches(ctx={}){
  const text=contextText(ctx);
  const matches=GUIDE_DEFS.filter(d=>d.trigger.test(text));
  if(!matches.length)return [];
  const sorted=matches.sort((a,b)=>GUIDE_PRIORITY.indexOf(a.id)-GUIDE_PRIORITY.indexOf(b.id));
  return [sorted[0]];
}
function urlFor(def){
  return GUIDE_LINKS[def.id]||def.yuque_url||'';
}
function badgeHTML(ctx,compact=false){
  const def=detect(ctx);
  if(!def)return '';
  return `<span class="batch-guide-badge" title="${esc(def.summary)}">${esc(compact?def.channel:def.scope)}</span>`;
}
function buttonsHTML(ctx,compact=false){
  const defs=allMatches(ctx);
  if(!defs.length)return '';
  return defs.map(def=>`<button class="batch-guide-btn" type="button" data-batch-guide="${esc(def.id)}" title="${esc(def.summary)}">${esc(compact?'指南':def.title)}</button>`).join('');
}
function panelHTML(id){
  const def=GUIDE_DEFS.find(x=>x.id===id)||GUIDE_DEFS[0];
  const url=urlFor(def);
  const checks=def.checks.map(x=>`<li>${esc(x)}</li>`).join('');
  return `<section class="batch-guide-card">
    <div class="batch-guide-eyebrow">${esc(def.scope)}</div>
    <h4>${esc(def.title)}</h4>
    <p>${esc(def.summary)}</p>
    <div class="batch-guide-warning"><b>填报逻辑：</b>${esc(def.channel)} 必须作为独立通道核对和排序；本科提前批按军校、公安、航海、专项计划、其他院校、定向医学生分开，专科提前批定向军士单独核对。</div>
    <h5>本地核对清单</h5>
    <ol>${checks}</ol>
    <div class="batch-guide-link-row">${url?`<a href="${esc(url)}" target="_blank" rel="noopener">打开语雀原文</a>`:`<span>语雀链接未配置：在页面加载前设置 window.BATCH_GUIDE_LINKS['${esc(def.id)}'] 即可接入。</span>`}</div>
  </section>`;
}
function channelSummaryHTML(entries){
  const counts=new Map();
  (entries||[]).forEach(entry=>{
    const rec=entry.rec||{};
    const def=detect({school:rec.s,group:rec.g});
    if(def)counts.set(def.id,{def,count:(counts.get(def.id)?.count||0)+1});
  });
  if(!counts.size)return '';
  const items=[...counts.values()].map(x=>`<button type="button" data-batch-guide="${esc(x.def.id)}"><b>${esc(x.def.channel)}</b><span>${x.count} 组</span></button>`).join('');
  const warn=counts.size>1?'<p class="batch-channel-warn">已出现多个提前批通道：本科提前批按军校、公安、航海、专项计划、其他院校、定向医学生分别核对；专科定向军士单独核对。</p>':'';
  return `<div class="batch-channel-summary"><div><strong>提前批通道</strong><span>点击查看对应指南</span></div><div class="batch-channel-items">${items}</div>${warn}</div>`;
}

window.BatchGuide={GUIDE_DEFS,detect,allMatches,badgeHTML,buttonsHTML,panelHTML,channelSummaryHTML,urlFor};
})();
