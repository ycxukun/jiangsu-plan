(function(){
'use strict';
const VERSION='2026在招专业组版｜V1.1.49 取消专业详情点击版';
const SUPABASE_URL='';
const SUPABASE_ANON_KEY='';
const ADMIN_EMAIL='ycxukun@gmail.com';
const GISCUS_CONFIG={
  repo:'ycxukun/jiangsu-plan',
  repoId:'R_kgDOTIG-gg',
  category:'批注',    // GitHub Discussions 分类名
  categoryId:'DIC_kwDOTIG-gs4DAM7P',
  theme:'light',
  lang:'zh-CN'
};
const disciplineOrder=['工学','理学','农学','医学','经济学','管理学','法学','教育学','文学/历史/哲学','艺术学','其他'];
const hotOrder=['计算机类','电子信息类','电气类','自动化类','机械类','临床医学类','口腔医学类','金融学类','法学类','数学类','统计学类'];
const provinceRegionGroups=[
  {title:'华东',items:['江苏','上海','浙江','安徽','福建','山东','江西']},
  {title:'华北',items:['北京','天津','河北','山西','内蒙古']},
  {title:'华中',items:['湖北','湖南','河南']},
  {title:'华南',items:['广东','广西','海南','香港']},
  {title:'西南',items:['四川','重庆','贵州','云南','西藏']},
  {title:'西北',items:['陕西','甘肃','青海','宁夏','新疆']},
  {title:'东北',items:['辽宁','吉林','黑龙江']}
];
const levelFacetGroups=[
  {title:'国家层次',items:['985','211','双一流']},
  {title:'保研层次',items:['保研双非']},
  {title:'常规层次',items:['普通公办','民办']},
  {title:'办学性质',items:['公办','中外合作办学机构']},
  {title:'院校类型',items:['综合类','理工类','师范类','医药类','财经类','政法类','农林类','军事类']},
  {title:'行业标签',items:['电力','邮电','交通','水利','航空航天','兵器','石油']},
  {title:'录取规则',items:['专业优先','部分专业优先']}
];
let DB=Array.isArray(window.DB)?window.DB:[];
let DETAILS=window.MAJOR_DETAILS||{};
let GROUP_NAMING=window.GROUP_NAMING||{};
let GROUP_CHANGES=window.GROUP_CHANGES||{};
let ASSASSIN_GROUP_RISKS=window.ASSASSIN_GROUP_RISKS||{};
let ASSASSIN_MAJOR_RISKS=window.ASSASSIN_MAJOR_RISKS||{};
let ASSASSIN_RISK_AUTHORITATIVE=Boolean(window.ASSASSIN_RISK_AUTHORITATIVE);
let ASSASSIN_RISK_STRICT_V03=Boolean(window.ASSASSIN_RISK_STRICT_V03);
let state={batch:'',subject:'',selectedProvinces:new Set(),selectedLevels:new Set(),selectedRequirements:new Set(),role:'',mode:'schools',q:'',selectedClasses:new Set(),scoreRange:null,compact:true,activeSchoolId:null,filtered:[]};
let notes={schools:{},groups:{},majors:{}};
let auth={accessToken:'',user:null};
const VOLUNTEER_LIMIT=40;
const MAX_MAJOR_PER_GROUP=6;
const VOLUNTEER_STORAGE_KEY='js-plan-volunteer-groups-v1';
const VOLUNTEER_MAJOR_STORAGE_KEY='js-plan-volunteer-major-keys-v2';
const VOLUNTEER_META_STORAGE_KEY='js-plan-volunteer-meta-v1';
let volunteerKeys=loadVolunteerKeys();
let volunteerMajorKeys=loadVolunteerMajorKeys();
let volunteerMeta=loadVolunteerMeta();
let volunteerDragKey='';
let volunteerSearchQuery='';
let volunteerFilterMode='';
let volunteerAllExpanded=false;
let volunteerExpandedKeys=new Set();
let volunteerMajorPoolFilter={};
let groupIndex=new Map();
let majorRefs=[];
let majorRefsBySchool=new Map();
let majorRefsByBucket=new Map();
let rankRefsBySubjectBatch=new Map();
let predictionCache=new Map();
let schoolFacetCache=new Map();
let admissionPriorityCache=new Map();
const MANUAL_ADMISSION_PRIORITY_SCHOOL_HINTS=[
  {pattern:/中国地质大学/, severity:'high', rule:'人工重点提示：该校按专业志愿优先/专业优先类规则核对风险较高，专业顺序不能随意。最终以当年招生章程为准。'}
];
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const fmt=v=>v===null||v===undefined||v===''?'—':String(v);
const fmtNum=v=>v===null||v===undefined||v===''?'—':(typeof v==='number'?Number(v.toFixed? v.toFixed(1):v):v);
const num=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const keySchool=s=>`${s.subject}|${s.batch}|${s.name}`;
const keyGroup=(s,g)=>`${s.subject}|${s.batch}|${s.name}|${g.groupName}`;
const keyMajor=m=>m.key;
function loadVolunteerKeys(){try{const arr=JSON.parse(localStorage.getItem(VOLUNTEER_STORAGE_KEY)||'[]'); return Array.isArray(arr)?arr.filter(x=>typeof x==='string').slice(0,VOLUNTEER_LIMIT):[];}catch(e){return [];}}
function saveVolunteerKeys(){try{localStorage.setItem(VOLUNTEER_STORAGE_KEY,JSON.stringify(volunteerKeys));}catch(e){}}
function loadVolunteerMajorKeys(){try{const data=JSON.parse(localStorage.getItem(VOLUNTEER_MAJOR_STORAGE_KEY)||'{}'); return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(e){return {};}}
function saveVolunteerMajorKeys(){try{localStorage.setItem(VOLUNTEER_MAJOR_STORAGE_KEY,JSON.stringify(volunteerMajorKeys));}catch(e){}}
function loadVolunteerMeta(){try{const data=JSON.parse(localStorage.getItem(VOLUNTEER_META_STORAGE_KEY)||'{}'); return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(e){return {};}}
function saveVolunteerMeta(){try{localStorage.setItem(VOLUNTEER_META_STORAGE_KEY,JSON.stringify(volunteerMeta));}catch(e){}}
const coldMajorPattern=/材料|化工|化学类|应用化学|环境|生态|生物|食品|地质|地球物理|测绘|遥感|地理空间|土木|建筑|交通运输|安全|消防|矿|采矿|资源|海洋|农业|农学|林学|水产|动物|植物|草学|轻工|纺织|服装|旅游管理|酒店管理|外国语言|翻译|俄语|日语|法语|西班牙语|朝鲜语|印地语|哲学|历史学|考古|图书馆|档案|社会学|公共管理|行政管理|戏剧影视|广播电视编导/;
const hotMajorPattern=/计算机|软件|人工智能|智能科学|数据科学|网络空间|电子信息|通信工程|微电子|集成电路|电气工程|自动化|临床医学|口腔医学|法学|会计学|金融学|数学|统计/;
function normalize(s){return String(s??'').toLowerCase().replace(/\s+/g,'');}
function formatSigned(v){if(v===null||v===undefined||v==='')return '—'; return `${v>0?'+':''}${v}`;}
function signedClass(v){return v>0?'change-pos':v<0?'change-neg':'';}
function planChangeInline(v){if(v===null||v===undefined||v==='')return '—'; return `<span class="${signedClass(v)}">${formatSigned(v)}</span>`;}
function planDeltaBadge(v){if(v===null||v===undefined||v==='')return ''; const cls=signedClass(v); const label=v>0?'计划增加':v<0?'计划减少':'计划持平'; return `<span class="badge ${v>0?'green':v<0?'red':''} ${cls}">${label} ${formatSigned(v)}</span>`;}
function groupNamingMeta(s,g){
  const meta=GROUP_NAMING[keyGroup(s,g)]||null;
  return meta&&meta.sourceYear===2026?meta:null;
}
function classBucket(c){
  const t=String(c||'');
  if(/计算机|软件|网络空间|数据科学|智能科学/.test(t))return '计算机';
  if(/电子信息|通信|微电子|集成电路|光电|电子科学/.test(t))return '电子信息';
  if(/电气|自动化|机器人工程|仪器|测控/.test(t))return '电气自动化';
  if(/临床医学|口腔|医学技术|基础医学|中医学|药学|护理/.test(t))return '医药';
  if(/数学|统计|物理|天文|力学/.test(t))return '数理基础';
  if(/金融|经济|财政|经贸|工商管理|管理科学|会计|财务|电子商务|物流|工业工程/.test(t))return '经管';
  if(/法学|公安|马克思|政治|社会学/.test(t))return '法政公安';
  if(/中国语言|外国语言|新闻传播|历史|哲学|图书|戏剧|艺术/.test(t))return '文史语言新闻';
  if(/材料/.test(t))return '材料';
  if(/化学|化工|制药/.test(t))return '化工';
  if(/生物|食品|环境|生态|农学|林学|水产|动物|植物/.test(t))return '生物食品环境';
  if(/土木|建筑|交通|测绘|地理|地质|地球|海洋|矿业|安全/.test(t))return '土木建筑交通';
  if(/能源|核工程/.test(t))return '能源动力';
  if(/机械|车辆|航空航天|兵器/.test(t))return '机械车辆';
  if(/大类|试验|交叉/.test(t))return '试验班未细分';
  return t.replace(/类$/,'')||'其他未细分';
}
function groupBucketStats(g){
  const map=new Map();
  const add=(bucket,plan)=>{
    if(!bucket)return;
    const old=map.get(bucket)||{bucket,plan:0,count:0};
    old.plan+=Number(plan)||0;
    old.count+=1;
    map.set(bucket,old);
  };
  (g.majors||[]).forEach(m=>add(classBucket(m.majorClass||m.name),m.plan26||1));
  if(!map.size)(g.majorClasses||[]).forEach(c=>add(classBucket(c),1));
  return [...map.values()].sort((a,b)=>(b.plan-a.plan)||(b.count-a.count)||a.bucket.localeCompare(b.bucket,'zh-Hans-CN'));
}
function cooperationSuffix(g){
  const text=`${(g.tags||[]).join(' ')} ${g.remark||''} ${(g.majors||[]).map(m=>m.name).join(' ')}`;
  if(/中外合作|合作办学/.test(text))return '（中外合作）';
  if(/联合培养|双学位/.test(text))return '（联合培养）';
  return '';
}
function inferGroupName(g){
  const stats=groupBucketStats(g);
  const suffix=cooperationSuffix(g);
  if(!stats.length)return suffix.replace(/[（）]/g,'');
  const buckets=stats.map(x=>x.bucket);
  if(buckets.length===1)return `${buckets[0]}组${suffix}`;
  if(buckets.length<=4)return `${buckets.join('、')}复合组${suffix}`;
  return `${buckets.slice(0,4).join('、')}等混合组${suffix}`;
}
function groupDisplayName(s,g){return groupNamingMeta(s,g)?.name||inferGroupName(g);}
function groupDisplayTitleText(s,g){const name=groupDisplayName(s,g); return name?`${g.groupName} ${name}`:g.groupName;}
function groupTitleHTML(s,g){const name=groupDisplayName(s,g); return `${esc(g.groupName)}${name?` <span class="group-name-label">${esc(name)}</span>`:''}`;}
function normalizeAssassinRisk(raw,type){
  if(!raw)return null;
  if(Array.isArray(raw)){
    if(type==='group')return {tone:raw[0]||'green',label:raw[1]||'',level:raw[2]||'',reason:raw[3]||'',core:raw[4]||'',weak:raw[5]||'',edge:raw[6]||'',breakdown:raw[7]||'',clean:raw[8]||'',classes:raw[9]||''};
    return {tone:raw[0]||'green',label:raw[1]||'',level:raw[2]||'',reason:raw[3]||'',majorClass:raw[4]||'',normClass:raw[5]||'',core:raw[6]||'',distance:raw[7],heatDrop:raw[8],heatLevel:raw[9]};
  }
  return raw;
}
function assassinGroupMeta(s,g){
  const key=String(g?.groupCode||g?.schoolGroupCode||'');
  return normalizeAssassinRisk(ASSASSIN_GROUP_RISKS[key],'group');
}
function assassinMajorMeta(m){
  const keys=[m?.identityKey,`${m?.groupCode||''}+${m?.code||''}`].filter(Boolean).map(String);
  for(const k of keys){if(ASSASSIN_MAJOR_RISKS[k])return normalizeAssassinRisk(ASSASSIN_MAJOR_RISKS[k],'major');}
  return null;
}
function isRiskTone(t){return ['red','orange','yellow','blue','gray'].includes(String(t||''));}
function riskToneRank(t){return ({green:0,gray:1,blue:2,yellow:3,orange:4,red:5})[String(t||'green')]??0;}
function strongerRisk(a,b){
  if(!a)return b;
  if(!b)return a;
  if(Boolean(a.risk)!==Boolean(b.risk))return a.risk?a:b;
  return riskToneRank(b.tone)>riskToneRank(a.tone)?b:a;
}
function majorText(m){
  const d=DETAILS?.[m?.key]||{};
  return `${m?.baseName||''} ${m?.name||''} ${m?.majorClass||''} ${m?.discipline||''} ${d.name||''} ${d.undergraduateName||''} ${d.subjectMajor||''} ${d.majorClass||''} ${d.discipline||''}`;
}

function lectureTierMeta(m){
  const t=majorText(m);
  // 讲座口径：先区分“出口宽度/热度梯队”，再决定在信息类/新工科组里是否构成刺客风险。
  // 机械、光电、医工、航空航天、统计等属于二梯队宽口径，不能按土木/测绘/地质/食品等同级标红。
  if(/光电|光信息|光电子/.test(t))return {rank:2,label:'二梯队宽口径',bucket:'光电'};
  if(/生物医学工程|智能医学工程|医学信息工程|医工|医疗器械/.test(t))return {rank:2,label:'二梯队宽口径',bucket:'医工交叉'};
  if(/计算机|软件|网络空间|数据科学|人工智能|智能科学|信息安全|物联网|大数据/.test(t))return {rank:1,label:'一梯队宽口径',bucket:'计算机/AI'};
  if(/电子信息|通信|微电子|集成电路|电子科学|电气|自动化|机器人工程|智能制造|仪器|测控|智能感知/.test(t))return {rank:1,label:'一梯队宽口径',bucket:'电子电气自动化'};
  if(/机械|车辆|航空航天|飞行器|航天|航空/.test(t))return {rank:2,label:'二梯队宽口径',bucket:/机械|车辆/.test(t)?'机械':'航空航天'};
  if(/数学|信息与计算科学|物理|应用物理|统计/.test(t))return {rank:2,label:'二梯队理学基础',bucket:/统计/.test(t)?'统计':'数学/物理'};
  if(/临床医学|口腔医学|基础医学|医学影像|麻醉学|儿科学|眼视光医学|精神医学|放射医学/.test(t))return {rank:2,label:'二梯队医学',bucket:'医学'};
  if(/能源动力|能源与动力|新能源|储能|核工程|动力工程|船舶|海洋工程|兵器|武器|弹药|力学|工程力学|材料|冶金|高分子|无机非金属|管理科学与工程|信息管理与信息系统|石油|油气|交通运输|车辆工程|大气科学|化工|制药/.test(t))return {rank:3,label:'三梯队行业/窄口径',bucket:'三梯队行业方向'};
  if(/环境|生态|安全工程|消防|海洋科学|药学|测绘|遥感|地理信息|地理空间|地质|资源勘查|地球物理|食品|化学|应用化学|生物科学|生物技术|生物工程|土木|建筑|城乡规划|风景园林|矿业|采矿|农业|农学|林学|水产|动物|植物|轻工|纺织/.test(t))return {rank:4,label:'低热度/强行业限制',bucket:'低热度远缘方向'};
  if(/法学|汉语言|中国语言文学/.test(t))return {rank:1,label:'考公一梯队',bucket:'法汉'};
  if(/会计|财务管理|新闻传播|财政|税收|工商管理|经济|金融/.test(t))return {rank:2,label:'考公二梯队',bucket:'经管考公'};
  return {rank:0,label:'未归类',bucket:'其他'};
}
function isLectureTier1Major(m){return lectureTierMeta(m).rank===1&&/计算机|电子|电气|自动化|通信|集成电路|人工智能|软件|仪器|测控|智能/.test(majorText(m));}
function hasTier1InfoEngineeringCore(g){
  const majors=g?.majors||[];
  let corePlan=0,totalPlan=0,coreCount=0;
  majors.forEach(m=>{
    const w=num(m.plan26)||num(m.plan25)||1;
    totalPlan+=w;
    if(isLectureTier1Major(m)){corePlan+=w;coreCount+=1;}
  });
  const gt=groupText(g);
  return coreCount>=2||corePlan>=Math.max(8,totalPlan*0.28)||(/计算机|电子信息|电气|自动化|人工智能|机器人|通信|集成电路|新工科|智能|仪器|测控/.test(gt)&&coreCount>=1);
}

function isLectureTier2BroadCoreMajor(m){
  const tier=lectureTierMeta(m);
  return tier.rank===2&&/机械|光电|医工|航空航天|统计|医学/.test(tier.bucket||'');
}
function hasTier2BroadEngineeringCore(g){
  const majors=g?.majors||[];
  let corePlan=0,totalPlan=0,coreCount=0;
  majors.forEach(m=>{
    const w=num(m.plan26)||num(m.plan25)||1;
    totalPlan+=w;
    if(isLectureTier2BroadCoreMajor(m)){corePlan+=w;coreCount+=1;}
  });
  const gt=groupText(g);
  return coreCount>=1&&(corePlan>=Math.max(6,totalPlan*0.25)||/机械|光电|医工|航空航天|统计|医学/.test(gt));
}
function lowAcceptanceRiskCategory(m){
  const t=majorText(m);
  if(/土木|建筑|城乡规划|风景园林/.test(t))return {cat:'土木建筑类',tone:'red',label:'刺客'};
  if(/测绘|遥感|地理信息|地理空间|地质|资源勘查|地球物理|地球信息|矿业|采矿/.test(t))return {cat:'测绘地质类',tone:'red',label:'刺客'};
  if(/环境|生态|安全工程|消防|水利|水文|海洋科学|农业|农学|林学|植物|动物|水产|食品|轻工|纺织/.test(t))return {cat:'低接受度远缘方向',tone:'red',label:'刺客'};
  if(/材料|冶金|高分子|无机非金属|金属材料|化工|制药|化学|应用化学|生物科学|生物技术|生物工程/.test(t))return {cat:'材料化工生化类',tone:'orange',label:'异类刺客'};
  return null;
}
function lectureTierSoftensSourceRisk(m){
  const tier=lectureTierMeta(m);
  if(tier.rank!==2)return false;
  // 明确保留用户口径：机械/光电/医工/航空航天/统计/医学是二梯队宽口径或高难度专业，不能和土木、测绘、地质、食品等同级处理。
  return /机械|光电|医工|航空航天|统计|医学/.test(tier.bucket);
}
function groupText(g){
  return `${g?.groupName||''} ${g?.majorSummary||''} ${(g?.majorClasses||[]).join(' ')} ${(g?.tags||[]).join(' ')} ${(g?.majors||[]).map(m=>`${m.name||''} ${m.majorClass||''}`).join(' ')}`;
}
function isInfoNewEngineeringMajorText(t){
  return /计算机|软件|网络空间|数据科学|人工智能|智能科学|电子信息|通信|微电子|集成电路|光电|电子科学|电气|自动化|机器人工程|智能制造|信息安全|物联网|大数据/.test(t);
}
function hasInfoNewEngineeringCore(g){
  const majors=g?.majors||[];
  let corePlan=0,totalPlan=0,coreCount=0;
  majors.forEach(m=>{
    const w=num(m.plan26)||num(m.plan25)||1;
    const t=majorText(m);
    totalPlan+=w;
    if(isInfoNewEngineeringMajorText(t)){corePlan+=w;coreCount+=1;}
  });
  const gt=groupText(g);
  return coreCount>=2||corePlan>=Math.max(8,totalPlan*0.28)||(/计算机|电子信息|电气|自动化|人工智能|机器人|通信|集成电路|新工科|智能/.test(gt)&&coreCount>=1);
}
function strictRiskCategory(m){
  const t=majorText(m);
  const tier=lectureTierMeta(m);
  if(tier.rank===1)return null;
  // 二梯队内部要分开：机械/光电/医工/航空航天/统计不按刺客标红；数学/物理等理学基础放在信息类工科组里需要提示。
  if(tier.rank===2){
    if(/数学|物理/.test(tier.bucket))return {cat:'理学基础类',tone:'orange',label:'理学调剂'};
    return null;
  }
  if(/材料|冶金|高分子|无机非金属|金属材料/.test(t))return {cat:'材料类',tone:'orange',label:'异类刺客'};
  if(/能源动力|能源与动力|新能源|储能|核工程|动力工程|建筑环境与能源应用/.test(t))return {cat:'能源动力类',tone:'orange',label:'异类刺客'};
  if(/化学|应用化学|生物科学|地理科学|地理信息|地球物理|大气科学|海洋科学|心理学|力学/.test(t))return {cat:'理学/基础类',tone:'orange',label:'理学调剂'};
  if(tier.rank===3)return {cat:tier.bucket||'三梯队行业方向',tone:'orange',label:'异类刺客'};
  if(/测绘|遥感|地理空间|土木|建筑|城乡规划|地质|资源勘查|地球信息|矿业|采矿|安全工程|水利|水文|环境|生态|生物工程|食品|轻工|纺织|农业|林学|植物|动物|水产|化工|制药/.test(t))return {cat:'远缘低接受度方向',tone:'red',label:'刺客'};
  if(tier.rank===4)return {cat:tier.bucket||'低热度远缘方向',tone:'red',label:'刺客'};
  return null;
}
function strictContextRiskMeta(s,g,m){
  if(!g||!m)return null;
  if((g.majors||[]).length<=1)return null;
  const t=majorText(m);
  const detailHint='';
  if(hasTier1InfoEngineeringCore(g)){
    if(isInfoNewEngineeringMajorText(t))return null;
    const cat=strictRiskCategory(m);
    if(!cat)return null;
    return {risk:true,label:cat.label||(cat.tone==='red'?'刺客':'异类刺客'),type:'strict-assassin',tone:cat.tone,reason:`一梯队信息类/新工科主体专业组中夹入${cat.cat}。按讲座梯队口径，该方向与计算机、电子信息、电气、自动化等一梯队出口不一致，需要单独标注；机械、光电、医工、航空航天、统计等二梯队宽口径本身不按土木类同级标红，但组内远缘专业仍必须提示。${detailHint}`};
  }
  // V1.1.45：二梯队宽口径主体组也要做“组内最差专业”风控。机械不是土木，但机械组里夹土木/建筑/测绘/地质/环境/食品等，必须把这些远缘专业标出来。
  if(hasTier2BroadEngineeringCore(g)){
    if(isLectureTier2BroadCoreMajor(m))return null;
    const cat=lowAcceptanceRiskCategory(m);
    if(!cat)return null;
    return {risk:true,label:cat.label,type:'strict-assassin',tone:cat.tone,reason:`二梯队宽口径主体专业组中夹入${cat.cat}。机械、光电、医工、航空航天、统计、医学不等于土木/测绘/地质/食品等低接受度方向；本专业需要单独标注，不能被“整体偏冷组”或“机械土木复合组”掩盖。${detailHint}`};
  }
  return null;
}
function isColdMajor(m){
  const text=`${m.baseName||m.name||''} ${m.majorClass||''} ${m.discipline||''}`;
  if(hotMajorPattern.test(text)&&!/中外合作|地质|地球物理|测绘|地理空间|环境|化工|材料|生物|食品|土木|建筑/.test(text))return false;
  return coldMajorPattern.test(text);
}
function groupHotColdProfile(g){
  let hotPlan=0,coldPlan=0,totalPlan=0,hotCount=0,coldCount=0;
  (g.majors||[]).forEach(m=>{
    const w=num(m.plan26)||num(m.plan25)||1;
    const text=`${m.baseName||m.name||''} ${m.majorClass||''} ${m.discipline||''}`;
    const hot=hotMajorPattern.test(text)&&!isColdMajor(m);
    const cold=isColdMajor(m);
    totalPlan+=w;
    if(hot){hotPlan+=w;hotCount+=1;}
    if(cold){coldPlan+=w;coldCount+=1;}
  });
  const groupText=`${g.groupName||''} ${g.majorSummary||''} ${(g.majorClasses||[]).join(' ')} ${(g.tags||[]).join(' ')}`;
  const hasHotCore=hotCount>=2||hotPlan>=Math.max(8,totalPlan*0.3)||(/计算机|电子信息|电气|自动化|人工智能|机器人|通信|集成电路|医学|法学/.test(groupText)&&hotCount>0);
  return {hotPlan,coldPlan,totalPlan,hotCount,coldCount,total:(g.majors||[]).length,hasHotCore};
}
function majorRiskMeta(s,g,m){
  const meta=assassinMajorMeta(m);
  let base=null;
  if(meta){
    if(!isRiskTone(meta.tone))base={risk:false,label:'',type:'assassin-source',tone:meta.tone,reason:meta.reason||meta.level||''};
    else{
      const basis=[meta.reason,meta.core?`主体专业类：${meta.core}`:'',meta.normClass?`风险专业类：${meta.normClass}`:'',meta.distance?`距主体距离：${meta.distance}`:'',meta.heatDrop?`热度落差：${meta.heatDrop}`:''].filter(Boolean).join('；');
      base={risk:true,label:meta.label||'风险',type:'assassin-source',tone:meta.tone,reason:basis||meta.level||'刺客专业识别表标记'};
    }
  }else if(m?.risk){
    base={risk:true,label:'风险',type:'source',tone:'red',reason:'原始数据已标记为风险专业'};
  }else if(!ASSASSIN_RISK_AUTHORITATIVE&&isColdMajor(m)){
    const p=groupHotColdProfile(g);
    const total=p.total||0;
    const mixedHotCold=p.hasHotCore&&p.hotCount>0&&p.coldCount>0&&p.coldCount<total;
    if(mixedHotCold)base={risk:true,label:'刺客',type:'assassin',tone:'red',reason:'热门/强工科专业组内夹入相对冷门或接受度较低方向，填报时需按最差专业兜底'};
  }
  if(ASSASSIN_RISK_STRICT_V03&&meta){
    return base||{risk:false,label:'',type:'assassin-source',tone:'green',reason:'严格版 v0.3 未标为风险'};
  }
  if(base&&base.risk&&s&&g&&hasTier1InfoEngineeringCore(g)&&lectureTierSoftensSourceRisk(m)){
    const tier=lectureTierMeta(m);
    base={risk:false,label:'',type:'lecture-tier-calibrated',tone:'green',reason:`讲座梯队校正：${tier.bucket}属于${tier.label}，不能与土木、测绘、地质、食品等低热度远缘方向同级标红。`};
  }
  const strict=strictContextRiskMeta(s,g,m);
  const merged=strongerRisk(base||{risk:false,label:'',type:'',tone:'green',reason:''},strict);
  return merged||{risk:false,label:'',type:'',tone:'green',reason:''};
}
function majorRiskLabelHTML(meta){
  if(!meta||!meta.risk)return '';
  const toneCls=meta.tone?` risk-tone-${meta.tone}`:'';
  const cls=`risk-label${meta.type==='assassin'||meta.type==='assassin-source'||meta.type==='strict-assassin'?' assassin':''}${toneCls}`;
  return `<span class="${cls}" title="${esc(meta.reason||meta.label)}">${esc(meta.label||'风险')}</span>`;
}
function groupQuality(s,g){
  const mapped=assassinGroupMeta(s,g);
  const majors=g.majors||[];
  const riskMetas=majors.map(m=>majorRiskMeta(s,g,m)).filter(x=>x.risk);
  const strictCount=riskMetas.filter(x=>x.type==='strict-assassin').length;
  const strictRed=riskMetas.filter(x=>x.type==='strict-assassin'&&x.tone==='red').length;
  if(mapped){
    const title=[mapped.level,mapped.reason,mapped.core?`主体：${mapped.core}`:'',mapped.weak?`高危/中危：${mapped.weak}`:'',mapped.edge?`边缘：${mapped.edge}`:'',mapped.breakdown?`待拆解：${mapped.breakdown}`:'',mapped.classes?`构成：${mapped.classes}`:'',strictCount?`严格补充标注：按讲座梯队口径，信息类/新工科或二梯队宽口径主体中另有 ${strictCount} 个材料、能动、理学、土木测绘等远缘方向需要核对`:'' ].filter(Boolean).join('；');
    if(strictRed&&riskToneRank(mapped.tone)<5)return {tone:'red',label:`含刺客专业 ${strictRed} 个`,title};
    if(strictCount&&riskToneRank(mapped.tone)<4)return {tone:'orange',label:`含异类刺客 ${strictCount} 个`,title};
    if(riskToneRank(mapped.tone)>0&&riskMetas.length===0){
      const tier2=(majors||[]).map(lectureTierMeta).filter(x=>x.rank===2).map(x=>x.bucket).filter(Boolean);
      return {tone:'green',label:'梯队校正',title:`刺客表原有提示已按讲座梯队校正：${Array.from(new Set(tier2)).join('、')||'二梯队宽口径'}不与土木、测绘、地质、食品等低热度远缘方向同级标红。专业硕博点、学科评估等可在专业信息里查看。`};
    }
    return {tone:mapped.tone||'green',label:mapped.label||mapped.level||'专业组结构',title:title||'来自刺客专业识别表 v0.2'};
  }
  const riskCount=riskMetas.length;
  const assassinCount=riskMetas.filter(x=>x.type==='assassin'||x.type==='strict-assassin').length;
  const sourceRiskCount=riskMetas.filter(x=>x.type==='source').length;
  const coldCount=majors.filter(isColdMajor).length;
  const total=majors.length||0;
  const allCold=total>0&&(coldCount===total||(coldCount/total>=0.75&&assassinCount===0));
  if(allCold)return {tone:'yellow',label:'整体冷门',title:`整组以冷门/风险专业为主：${coldCount}/${total} 个冷门，${sourceRiskCount}/${total} 个原始风险`};
  if(assassinCount>0)return {tone:strictRed?'red':'orange',label:`含刺客专业 ${assassinCount} 个`,title:`组内有一梯队信息类/新工科或二梯队宽口径主体，也夹有材料、能动、理学、土木测绘等远缘低接受度专业：${assassinCount}/${total} 个。必须按最差专业兜底。`};
  if(riskCount>0)return {tone:'red',label:`含风险专业 ${riskCount} 个`,title:`组内夹有相对风险专业：${riskCount}/${total} 个`};
  return {tone:'green',label:ASSASSIN_RISK_AUTHORITATIVE?'未标风险':'干净组',title:ASSASSIN_RISK_AUTHORITATIVE?'刺客专业识别表与严格补充规则均未标记为风险组':'组内未发现风险或刺客专业，结构相对清爽'};
}
function groupQualityBadge(status){return `<span class="group-quality-badge ${status.tone}" title="${esc(status.title)}">${esc(status.label)}</span>`;}
function groupChangeKey(s,g){return keyGroup(s,g);}
function groupChangeData(s,g){return GROUP_CHANGES[groupChangeKey(s,g)]||null;}
function pushMapList(map,key,value){
  if(!map.has(key))map.set(key,[]);
  map.get(key).push(value);
}
function detailOf(m){return DETAILS[m.key]||{};}
function cleanMajorText(v){
  return normalize(String(v||'')
    .replace(/（[^）]*）|\([^)]*\)|\[[^\]]*\]|【[^】]*】/g,'')
    .replace(/专业|大类|类$/g,''));
}
function majorInfo(m){
  const d=detailOf(m);
  const majorClass=m.majorClass||d.majorClass||'';
  return {
    name:m.name||d.name||'',
    majorClass,
    discipline:m.discipline||d.discipline||'',
    undergraduateName:d.undergraduateName||'',
    subjectMajor:d.subjectMajor||'',
    bucket:classBucket(majorClass||m.name||d.undergraduateName),
    base:cleanMajorText(d.undergraduateName||m.name||d.name)
  };
}
function buildPredictionIndexes(){
  majorRefs=[];
  majorRefsBySchool=new Map();
  majorRefsByBucket=new Map();
  rankRefsBySubjectBatch=new Map();
  predictionCache=new Map();
  DB.forEach(s=>(s.groups||[]).forEach(g=>(g.majors||[]).forEach(m=>{
    const score=num(m.score25);
    if(score===null)return;
    const rank=num(m.rank25);
    const info=majorInfo(m);
    const ref={s,g,m,score,rank,school:s.name,subject:s.subject,batch:s.batch,level:String(s.level||''),groupName:g.groupName,...info};
    majorRefs.push(ref);
    pushMapList(majorRefsBySchool,`${s.subject}|${s.batch}|${s.name}`,ref);
    pushMapList(majorRefsByBucket,`${s.subject}|${s.batch}|${String(s.level||'')}|${info.bucket}`,ref);
    pushMapList(majorRefsByBucket,`${s.subject}|${s.batch}|*|${info.bucket}`,ref);
    if(rank!==null)pushMapList(rankRefsBySubjectBatch,`${s.subject}|${s.batch}`,{score,rank});
  })));
}
function splitGroupNames(v){
  return String(v||'').split(/[；;、,，/]+/).map(x=>x.trim()).filter(Boolean);
}
function changeSourceGroups(s,g){
  const d=groupChangeData(s,g);
  const names=new Set();
  if(!d)return names;
  splitGroupNames(d.group25).forEach(x=>names.add(x));
  ['add','in','remove','out'].forEach(k=>(d.details?.[k]||[]).forEach(item=>{
    splitGroupNames(item.from).forEach(x=>names.add(x));
    splitGroupNames(item.to).forEach(x=>names.add(x));
  }));
  return names;
}
function majorSimilarity(m,ref,sourceGroups){
  const info=majorInfo(m);
  let score=0;
  if(sourceGroups.has(ref.groupName))score+=70;
  if(info.base&&ref.base){
    if(info.base===ref.base)score+=90;
    else if(info.base.includes(ref.base)||ref.base.includes(info.base))score+=55;
  }
  const text=normalize(info.name);
  if(ref.base&&text.includes(ref.base))score+=30;
  if(info.majorClass&&info.majorClass===ref.majorClass)score+=25;
  if(info.bucket&&info.bucket===ref.bucket)score+=18;
  if(info.discipline&&info.discipline===ref.discipline)score+=8;
  const sm=normalize(info.subjectMajor), rm=normalize(ref.subjectMajor);
  if(sm&&rm&&(sm.includes(rm)||rm.includes(sm)))score+=15;
  return score;
}
function bestMajorReference(s,g,m){
  const sourceGroups=changeSourceGroups(s,g);
  const schoolRefs=majorRefsBySchool.get(`${s.subject}|${s.batch}|${s.name}`)||[];
  const info=majorInfo(m);
  const bucketRefs=majorRefsByBucket.get(`${s.subject}|${s.batch}|${String(s.level||'')}|${info.bucket}`)
    ||majorRefsByBucket.get(`${s.subject}|${s.batch}|*|${info.bucket}`)||[];
  const pick=(refs,minScore)=>{
    let best=null;
    refs.forEach(ref=>{
      const match=majorSimilarity(m,ref,sourceGroups);
      if(!best||match>best.match)best={ref,match};
    });
    return best&&best.match>=minScore?best:null;
  };
  const sourceRefs=schoolRefs.filter(ref=>sourceGroups.has(ref.groupName));
  return pick(sourceRefs,50)||pick(schoolRefs,72)||pick(bucketRefs,98);
}
function predictionAdjustment(m,g){
  const text=`${m.name||''} ${m.majorClass||''} ${(g.tags||[]).join(' ')} ${g.remark||''}`;
  const size=(g.majors||[]).length;
  let adj=0;
  const reasons=[];
  if(hotMajorPattern.test(text)&&!isColdMajor(m)){adj+=3; reasons.push('热门方向 +3');}
  if(/人工智能|计算机科学与技术|软件工程|集成电路|微电子|口腔医学|临床医学|法学/.test(text)){adj+=2; reasons.push('强需求专业 +2');}
  if(/至诚|拔尖|卓越|实验|试验|本博|八年|双学士|未来技术|创新班|书院/.test(text)){adj+=3; reasons.push('培养模式 +3');}
  if(size===1){adj+=2; reasons.push('专业单列 +2');}
  else if(size===2){adj+=1; reasons.push('小组单列 +1');}
  const plan=num(m.plan26)||num(g.plan26);
  if(plan!==null&&plan<=2){adj+=2; reasons.push('计划少 +2');}
  else if(plan!==null&&plan<=5){adj+=1; reasons.push('计划偏少 +1');}
  else if(plan!==null&&plan>=80){adj-=2; reasons.push('计划多 -2');}
  else if(plan!==null&&plan>=30){adj-=1; reasons.push('计划偏多 -1');}
  if(/中外合作|合作办学|学分互认|中澳|中美|中英|国际|境外|出国/.test(text)){adj-=8; reasons.push('合作/出国成本 -8');}
  if(isColdMajor(m)){adj-=4; reasons.push('冷门或风险方向 -4');}
  const dynRisk=majorRiskMeta(null,g,m);
  if(dynRisk.risk){adj-=2; reasons.push(`${dynRisk.label||'风险'} -2`);}
  return {adj:Math.max(-15,Math.min(12,adj)),reasons};
}
function estimateRankForScore(subject,batch,score,fallbackRank){
  const fallback=num(fallbackRank);
  const target=num(score);
  const arr=rankRefsBySubjectBatch.get(`${subject}|${batch}`)||[];
  if(target===null||!arr.length)return fallback;
  let best=null;
  arr.forEach(x=>{
    const sx=num(x.score), rx=num(x.rank);
    if(sx===null||rx===null)return;
    const dist=Math.abs(sx-target);
    if(!best||dist<best.dist)best={score:sx,rank:rx,dist};
  });
  return best?Math.round(best.rank):fallback;
}
function estimateScoreForRank(subject,batch,rank,fallbackScore){
  const fallback=num(fallbackScore);
  const target=num(rank);
  const arr=rankRefsBySubjectBatch.get(`${subject}|${batch}`)||[];
  if(target===null||!arr.length)return fallback;
  let best=null;
  arr.forEach(x=>{
    const sx=num(x.score), rx=num(x.rank);
    if(sx===null||rx===null)return;
    const dist=Math.abs(rx-target);
    if(!best||dist<best.dist)best={score:sx,rank:rx,dist};
  });
  return best?Math.round(best.score):fallback;
}
function groupPredictedRankAnchor(g){
  const gr=num(g.rank26Eq);
  if(gr!==null)return gr;
  const ranks=(g.majors||[]).map(m=>num(m.predictedRank26)).filter(x=>x!==null);
  return ranks.length?Math.max(...ranks):null;
}
function predictMajorScore(s,g,m){
  const predictedRank=num(m.predictedRank26);
  if(predictedRank!==null){
    const scoreByRank=estimateScoreForRank(s.subject,s.batch,predictedRank,null);
    if(scoreByRank!==null){
      return {score:scoreByRank,rank:predictedRank,confidence:'中',source:`当前行26预估位次 ${fmtNum(predictedRank)} 折算`,adjustment:'按位次折算，不再用同校最低组兜底'};
    }
  }
  const avg=num(m.avgScore3);
  if(avg!==null&&(m.avgYears||0)>=2){
    const adj=predictionAdjustment(m,g);
    const score=Math.round(avg+adj.adj);
    return {score,rank:estimateRankForScore(s.subject,s.batch,score,m.avgRank3),confidence:'中',source:`本专业三年均分 ${fmtNum(avg)}`,adjustment:adj.reasons.join('；')};
  }
  const best=bestMajorReference(s,g,m);
  if(!best)return null;
  const adj=predictionAdjustment(m,g);
  const score=Math.round(best.ref.score+adj.adj);
  const confidence=best.match>=145?'高':best.match>=95?'中':'低';
  return {
    score,
    rank:estimateRankForScore(s.subject,s.batch,score,best.ref.rank),
    confidence,
    source:`参考 ${best.ref.groupName}｜${best.ref.name} ${fmtNum(best.ref.score)}分`,
    adjustment:adj.reasons.join('；')
  };
}
function predictGroupScore(s,g){
  if(num(g.score25)!==null)return null;
  const cacheKey=keyGroup(s,g);
  if(predictionCache.has(cacheKey))return predictionCache.get(cacheKey);
  const scores=[];
  (g.majors||[]).forEach(m=>{
    const actual=num(m.score25);
    if(actual!==null){
      scores.push({score:actual,rank:num(m.rank25),confidence:'高',source:`${m.name} 25年真实分`,adjustment:''});
      return;
    }
    const pred=predictMajorScore(s,g,m);
    if(pred)scores.push(pred);
  });
  let result=null;
  if(scores.length){
    scores.sort((a,b)=>a.score-b.score);
    const floor=scores[0];
    const eq=num(g.score26Eq);
    let score=floor.score;
    if(eq!==null){
      score=Math.round((eq*0.7)+(floor.score*0.3));
      if(Math.abs(eq-floor.score)>18)score=Math.max(eq-12,Math.min(eq+8,score));
    }
    const rank=estimateRankForScore(s.subject,s.batch,score,floor.rank||g.rank26Eq);
    const confidence=scores.some(x=>x.confidence==='高')?'中高':scores.some(x=>x.confidence==='中')?'中':'低';
    const eqNote=eq!==null?`；26等效分参考 ${fmtNum(eq)}`:'';
    result={score,rank,confidence,reason:`按组内最低参考专业估算：${floor.source}${floor.adjustment?`；修正：${floor.adjustment}`:''}${eqNote}`};
  }else if(num(g.score26Eq)!==null){
    const score=Math.round(num(g.score26Eq));
    result={score,rank:num(g.rank26Eq),confidence:'中',reason:`使用现有 26 等效分参考 ${fmtNum(score)}`};
  }else{
    const rankAnchor=groupPredictedRankAnchor(g);
    const rankScore=estimateScoreForRank(s.subject,s.batch,rankAnchor,null);
    if(rankAnchor!==null&&rankScore!==null){
      result={score:rankScore,rank:rankAnchor,confidence:'中',reason:`使用当前行26预估位次 ${fmtNum(rankAnchor)} 折算分数；不再采用同校最低专业组兜底`};
    }else{
      const peerScores=(s.groups||[]).filter(x=>x!==g&&num(x.score25)!==null&&!/(中外合作|高收费)/.test(`${(x.tags||[]).join(' ')} ${x.majorSummary||''} ${x.remark||''}`)).map(x=>num(x.score25)).sort((a,b)=>a-b);
      if(peerScores.length){
        const idx=Math.max(0,Math.floor(peerScores.length*0.25));
        const score=Math.round(peerScores[idx]);
        result={score,rank:estimateRankForScore(s.subject,s.batch,score,null),confidence:'低',reason:`缺少直接专业锚点，使用同校普通专业组低位分参考 ${fmtNum(score)}；已排除中外合作/高收费组`};
      }
    }
  }
  predictionCache.set(cacheKey,result);
  return result;
}
function groupScoreEstimate(s,g){return num(g.score25)===null?predictGroupScore(s,g):null;}
function predictionBadgeHTML(s,g){
  const p=groupScoreEstimate(s,g);
  return p?`<span class="badge green" title="${esc(p.reason)}">预测分 ${esc(fmtNum(p.score))}｜${esc(p.confidence)}</span>`:'';
}
function groupScoreMiniHTML(s,g){
  const p=groupScoreEstimate(s,g);
  if(p)return `<div class="mini" title="${esc(p.reason)}"><b>${esc(fmtNum(p.score))}</b><span>预测分</span></div><div class="mini" title="${esc(p.reason)}"><b>${esc(fmtNum(p.rank))}</b><span>预测位次</span></div>`;
  return `<div class="mini"><b>${fmtNum(g.score25)}</b><span>25分</span></div><div class="mini"><b>${fmtNum(g.rank25)}</b><span>25位次</span></div>`;
}
function groupScoreLineHTML(s,g){
  const p=groupScoreEstimate(s,g);
  if(p)return `预测分 ${esc(fmtNum(p.score))}｜预测位次 ${esc(fmtNum(p.rank))} <span class="note-badge" title="${esc(p.reason)}">估</span>`;
  return `25分 ${fmtNum(g.score25)}｜25位次 ${fmtNum(g.rank25)}`;
}
function groupChangeButtonHTML(s,g,variant){
  const data=groupChangeData(s,g);
  const cls=`change-btn ${variant||''} ${data?'':'muted'}`.trim();
  const label=data&&data.advice==='重点核对'?'变迁*':'变迁';
  return `<button class="${cls}" type="button" data-change-key="${esc(groupChangeKey(s,g))}" data-change-title="${esc(`${s.name} ${groupDisplayTitleText(s,g)}`)}" title="${data?'查看 2025-2026 专业组变迁':'暂无普通批变迁数据'}">${label}</button>`;
}
function volunteerButtonHTML(s,g){
  const key=keyGroup(s,g);
  const selected=volunteerKeys.includes(key);
  const disabled=!selected&&volunteerKeys.length>=VOLUNTEER_LIMIT;
  const label=selected?'已加入志愿表':disabled?'志愿表已满':'加入志愿表';
  const title=selected?'再次点击：从志愿表移出该专业组，并清空本组已选专业':'点击：加入志愿表';
  const cls=`volunteer-add-btn ${selected?'selected':''}`.trim();
  return `<button class="${cls}" type="button" data-volunteer-key="${esc(key)}" title="${esc(title)}" ${disabled?'disabled':''}>${label}</button>`;
}
function clearMajorButtonHTML(s,g){
  const key=keyGroup(s,g);
  const count=selectedMajorOrder(key).length;
  return `<button class="anno-btn danger clear-major-btn" type="button" data-clear-major-group="${esc(key)}" ${count?'':'disabled'} title="只清空本专业组已选专业，不删除专业组">清空已选${count?` ${count}`:''}</button>`;
}
function percent(v){return typeof v==='number'?`${Math.round(v*1000)/10}%`:fmt(v);}
function diffText(a,b){return typeof a==='number'&&typeof b==='number'?formatSigned(a-b):'—';}
function createLayout(){
  document.body.className=[document.body.dataset.admin==='1'?'admin-page':'',state.compact?'compact-mode':''].filter(Boolean).join(' ');
  document.body.innerHTML=`
  <div class="app-shell">
    <header class="topbar">
      <div class="hero"><div class="brand"><h1>江苏省招生计划变化知识库</h1><p>基于 2026 在招数据与行级权威历史数据生成；院校内专业组按组内专业加权均分由高到低排列。</p></div><div class="top-actions"><div class="version">${VERSION}</div><button id="volunteerPanelBtn" class="header-toggle volunteer-toggle" type="button">志愿表 0/40</button><button id="compactBtn" class="header-toggle" type="button">${state.compact?'标准显示':'紧凑显示'}</button><button id="toggleHeaderBtn" class="header-toggle" type="button">收起头部</button></div></div>
      <div class="filters">
        <select id="batchFilter"><option value="">全部批次</option></select>
        <select id="subjectFilter"><option value="">全部科类</option></select>
        <button id="requirementBtn" class="filter-btn">选科要求</button>
        <button id="provinceBtn" class="filter-btn">全部省份</button>
        <button id="levelBtn" class="filter-btn">院校层次</button>
        <select id="roleFilter"><option value="">角色/客观标签</option></select>
        <select id="modeFilter"><option value="schools">全部院校</option><option value="groups">全部专业组</option></select>
        <button id="classBtn" class="filter-btn">全部专业大类</button>
        <button id="scoreBtn" class="filter-btn">目标分区间</button>
        <input id="searchInput" placeholder="搜索院校、专业组、专业、专业大类，例如：计算机类 / 南京邮电 / 中外合作" />
      </div>
    </header>
    <div class="layout"><aside class="sidebar"><div class="side-head"><strong>院校索引</strong><span id="resultMeta">正在加载数据</span></div><div id="schoolList" class="school-list"></div></aside><main id="main" class="main"></main></div>
    <div id="provincePanel" class="panel facet-panel"><div class="panel-head"><h3>地区筛选</h3><button class="close-btn" data-close="provincePanel">×</button></div><div class="panel-body"><div id="provincePanelBody"></div></div></div>
    <div id="levelPanel" class="panel facet-panel"><div class="panel-head"><h3>院校层次筛选</h3><button class="close-btn" data-close="levelPanel">×</button></div><div class="panel-body"><div id="levelPanelBody"></div></div></div>
    <div id="requirementPanel" class="panel facet-panel"><div class="panel-head"><h3>选科要求筛选</h3><button class="close-btn" data-close="requirementPanel">×</button></div><div class="panel-body"><div id="requirementPanelBody"></div></div></div>
    <div id="classPanel" class="panel facet-panel"><div class="panel-head"><h3>专业大类筛选</h3><button class="close-btn" data-close="classPanel">×</button></div><div class="panel-body"><div id="classPanelBody"></div></div></div>
    <div id="scorePanel" class="panel"><div class="panel-head"><h3>目标分区间筛选</h3><button class="close-btn" data-close="scorePanel">×</button></div><div class="panel-body"><div id="rangeSummary" class="range-summary"></div><div class="score-row"><label>目标分</label><input id="targetScoreRange" type="range" min="350" max="710" value="550"><input id="targetScoreInput" type="number" value="550"></div><div class="score-row"><label>下浮</label><input id="downRange" type="range" min="0" max="80" value="20"><input id="downInput" type="number" value="20"></div><div class="score-row"><label>上浮</label><input id="upRange" type="range" min="0" max="80" value="30"><input id="upInput" type="number" value="30"></div><div class="modal-actions"><button id="clearScoreBtn">清空分数筛选</button><button id="applyScoreBtn" class="save">应用区间</button></div></div></div>
    <div id="changePanel" class="panel change-panel"><div class="panel-head"><div><h3>专业组变迁</h3><p id="changePanelTitle" class="panel-subtitle"></p></div><button class="close-btn" data-close="changePanel">×</button></div><div id="changePanelBody" class="panel-body"></div></div>
    <div id="volunteerPanel" class="panel volunteer-panel"><div class="panel-head volunteer-panel-head"><div><h3>专业组专业表</h3><p id="volunteerPanelCount" class="panel-subtitle">已选 0 / 40 个专业组</p></div><div class="volunteer-head-actions"><button id="exportVolunteerBtn" class="save" type="button">导出 Excel</button><button class="close-btn" data-close="volunteerPanel">×</button></div></div><div class="panel-body volunteer-workbench"><div class="volunteer-sticky-shell"><div class="volunteer-toolbar volunteer-workbench-toolbar"><input id="volunteerSearchInput" type="search" placeholder="搜索院校、专业组、专业、专业类"><select id="volunteerFilterSelect"><option value="">全部专业组</option><option value="冲">只看冲</option><option value="稳">只看稳</option><option value="保">只看保</option><option value="垫">只看垫</option><option value="pending">只看待定</option><option value="emptyMajor">未选具体专业</option><option value="notFullMajor">专业未满 6 个</option><option value="fullMajor">已满 6 个专业</option></select><button id="resetVolunteerFilterBtn" type="button">清除筛选</button><button id="expandVolunteerBtn" type="button">一键展开</button><button id="fillVolunteerBtn" type="button">当前筛选补满</button><button id="clearVolunteerBtn" type="button">清空</button></div><div class="volunteer-table-head"><div>排序</div><div>院校专业组</div><div>已选专业</div><div>基础信息</div><div>操作</div></div></div><div id="volunteerList" class="volunteer-list volunteer-table-list"></div></div></div>
    <div id="annotationDrawer" class="annotation-drawer">
      <div class="annotation-head"><div><h3>批注</h3><p id="annotationObject">未选择批注对象</p></div><button id="closeAnnotationBtn" class="close-btn" type="button">×</button></div>
      <div class="annotation-body"><div id="giscusMount" class="giscus-mount"></div></div>
    </div>
    <div id="notePanel" class="note-panel"><h4>备注</h4><div id="notePanelText"></div></div>
    <div id="modalMask" class="modal-mask"><div id="modal" class="modal"></div></div>
    <div class="admin-dock"><button id="adminDockBtn">管理员备注</button></div><div id="adminMenu" class="admin-menu"><button id="loginBtn">登录数据库</button><button id="reloadNotesBtn">读取备注</button><button id="addSchoolNoteBtn">新增当前学校备注</button><button id="logoutBtn">退出登录</button><div class="context-hint">右键学校、专业组或专业行可编辑备注。</div></div>
    <button id="backTopBtn" class="back-top" type="button" title="" aria-label="向上">↑</button>
    <div class="footer">GitHub Pages 静态部署版 · 数据分片加载 · 公开页只读 / 管理员页可写备注</div>
  </div>`;
}
function unique(arr){return Array.from(new Set(arr.filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='')));}
function fillSelect(sel,vals){const el=$(sel); const first=el.options[0].outerHTML; el.innerHTML=first+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}
function initFilters(){
  const batches=unique(DB.map(s=>s.batch)).sort();
  const subjects=unique(DB.map(s=>s.subject)).sort();
  const roles=unique(DB.flatMap(s=>s.groups.flatMap(g=>g.tags||[]))).sort((a,b)=>String(a).localeCompare(String(b),'zh-Hans-CN'));
  fillSelect('#batchFilter',batches);
  fillSelect('#subjectFilter',subjects);
  fillSelect('#roleFilter',roles);
}
function schoolCountBy(field){const m=new Map(); DB.forEach(s=>{const key=String(s[field]??'').trim(); if(!isValidFacetValue(key))return; m.set(key,(m.get(key)||0)+1);}); return m;}

function collectSchoolAdmissionRules(s){
  const rules=[];
  const seen=new Set();
  (s?.groups||[]).forEach(g=>(g.majors||[]).forEach(m=>{
    const d=detailOf(m);
    const rule=String(d.admissionRule||'').trim();
    if(rule&&!seen.has(rule)){seen.add(rule);rules.push(rule);}
  }));
  if(!rules.length){
    const d=representativeDetailForSchool(s);
    const rule=String(d.admissionRule||'').trim();
    if(rule)rules.push(rule);
  }
  return rules;
}
function manualAdmissionPriorityHint(s){
  const name=String(s?.name||'');
  return MANUAL_ADMISSION_PRIORITY_SCHOOL_HINTS.find(x=>x.pattern.test(name))||null;
}
function admissionPriorityInfo(s){
  const cacheKey=keySchool(s);
  if(admissionPriorityCache.has(cacheKey))return admissionPriorityCache.get(cacheKey);
  const rules=collectSchoolAdmissionRules(s);
  const hits=[];
  const manual=manualAdmissionPriorityHint(s);
  if(manual)hits.push({rule:manual.rule,severity:manual.severity||'high',manual:true});
  rules.forEach(rule=>{
    const t=String(rule||'').replace(/\s+/g,'');
    if(!t)return;
    const hasPriority=/专业优先|专业志愿优先|专业志愿清|专业清|志愿优先|志愿清|先志愿[，,、]?后分数/.test(t);
    if(!hasPriority)return;
    const oldGaokaoOnly=/(未实行高考综合改革|非高考综合改革|传统高考|老高考|非平行志愿|非平行投档).{0,28}(专业优先|专业志愿清|志愿优先|志愿清)/.test(t)
      && /(高考综合改革|新高考|平行志愿|江苏).{0,36}分数优先/.test(t);
    const artOnly=/(普通类|普通专业).{0,16}分数优先.{0,36}(艺术|体育|艺体|广播电视编导).{0,36}(专业优先|专业志愿优先|志愿优先)/.test(t);
    const partial=/(中外合作|艺术|体育|艺体|第一专业志愿|部分专业|广播电视编导|特殊专业|单列专业)/.test(t) || oldGaokaoOnly || artOnly;
    hits.push({rule,severity:partial?'partial':'high'});
  });
  const high=hits.some(x=>x.severity==='high');
  const info=hits.length?{
    severity:high?'high':'partial',
    label:high?'专业优先':'部分专业优先',
    rules:[...new Set(hits.map(x=>x.rule))],
    title:`录取规则提示：${high?'该校存在专业优先/专业清类规则，专业顺序风险高':'该校存在部分专业或特定情形专业优先规则，需核对章程'}。${hits[0]?.rule||''}`
  }:null;
  admissionPriorityCache.set(cacheKey,info);
  return info;
}
function admissionPriorityBadge(s,compact=false){
  const info=admissionPriorityInfo(s);
  if(!info)return '';
  return `<span class="admission-priority-badge ${info.severity}" title="${esc(info.title)}">⚠ ${esc(compact?info.label:info.label+'录取')}</span>`;
}
function admissionPriorityAlertHTML(s){
  const info=admissionPriorityInfo(s);
  if(!info)return '';
  const sample=info.rules[0]||'';
  return `<div class="admission-rule-alert ${info.severity}"><b>录取规则红色提示：${esc(info.label)}</b><span>${esc(sample)}</span></div>`;
}

function schoolFacetValues(s){
  const cacheKey=keySchool(s);
  if(schoolFacetCache.has(cacheKey))return schoolFacetCache.get(cacheKey);
  const d=representativeDetailForSchool(s);
  const values=new Set();
  const add=v=>{const t=String(v??'').trim(); if(isValidFacetValue(t))values.add(t);};
  add(s.level);
  const text=`${s.level||''} ${d.schoolTags||''} ${d.firstClass||''} ${d.schoolLevel||''} ${d.schoolType||''} ${d.publicPrivate||''} ${d.administration||''}`;
  const is985=/985/.test(text);
  const is211=/211/.test(text);
  const isDoubleFirst=/双一流/.test(text);
  const hasBaoyan=/保研资格|推免资格|推荐免试|免试研究生|保研/.test(text)||Number(d.baoyanRate)>0;
  const isPublic=/公办/.test(text);
  const isPrivate=/民办/.test(text);
  if(is985)add('985');
  if(is211)add('211');
  if(isDoubleFirst)add('双一流');
  if(hasBaoyan&&!is985&&!is211&&!isDoubleFirst)add('保研双非');
  if(isPublic)add('公办');
  if(isPrivate)add('民办');
  if(isPublic&&!is985&&!is211&&!isDoubleFirst&&!hasBaoyan)add('普通公办');
  if(/中外合作办学机构|中外合作大学|港中深|昆山杜克|西交利物浦|宁波诺丁汉|上海纽约/.test(text))add('中外合作办学机构');
  const priorityInfo=admissionPriorityInfo(s);
  if(priorityInfo){add('专业优先'); if(priorityInfo.severity==='partial')add('部分专业优先');}
  const st=String(d.schoolType||'').trim();
  if(st){add(st.endsWith('类')?st:`${st}类`);}
  ['综合类','理工类','师范类','医药类','财经类','政法类','农林类','军事类'].forEach(v=>{if(text.includes(v.replace('类',''))||text.includes(v))add(v);});
  ['电力','邮电','交通','水利','航空航天','兵器','石油'].forEach(v=>{if(text.includes(v))add(v);});
  schoolFacetCache.set(cacheKey,values);
  return values;
}
function schoolFacetCounts(){const m=new Map(); DB.forEach(s=>schoolFacetValues(s).forEach(v=>m.set(v,(m.get(v)||0)+1))); return m;}
function schoolMatchesLevelFacet(s){if(!state.selectedLevels.size)return true; const vals=schoolFacetValues(s); return [...state.selectedLevels].some(v=>vals.has(v));}
function groupCountBy(field){const m=new Map(); DB.forEach(s=>s.groups.forEach(g=>{const key=String(g[field]??'').trim(); if(!isValidFacetValue(key))return; m.set(key,(m.get(key)||0)+1);})); return m;}
function bindEvents(){
  ['batchFilter','subjectFilter','roleFilter','modeFilter'].forEach(id=>$('#'+id).addEventListener('change',e=>{state[id.replace('Filter','')]=e.target.value; if(id==='modeFilter')state.mode=e.target.value; applyFilters();}));
  $('#searchInput').addEventListener('input',e=>{state.q=e.target.value; applyFilters();});
  $('#provinceBtn').addEventListener('click',()=>{buildProvincePanel();openPanel('provincePanel')});
  $('#levelBtn').addEventListener('click',()=>{buildLevelPanel();openPanel('levelPanel')});
  $('#requirementBtn').addEventListener('click',()=>{buildRequirementPanel();openPanel('requirementPanel')});
  $('#classBtn').addEventListener('click',()=>{buildClassPanel();openPanel('classPanel')});
  $('#scoreBtn').addEventListener('click',()=>{updateRangeSummary();openPanel('scorePanel')});
  $('#volunteerPanelBtn').addEventListener('click',()=>{renderVolunteerPanel();openPanel('volunteerPanel')});
  $('#fillVolunteerBtn').addEventListener('click',fillVolunteerFromCurrentFilters);
  $('#exportVolunteerBtn').addEventListener('click',exportVolunteerXlsx);
  $('#clearVolunteerBtn').addEventListener('click',clearVolunteers);
  $('#volunteerSearchInput')?.addEventListener('input',e=>{volunteerSearchQuery=e.target.value;renderVolunteerPanel();});
  $('#volunteerFilterSelect')?.addEventListener('change',e=>{volunteerFilterMode=e.target.value;renderVolunteerPanel();});
  $('#resetVolunteerFilterBtn')?.addEventListener('click',()=>{volunteerSearchQuery='';volunteerFilterMode='';const q=$('#volunteerSearchInput');if(q)q.value='';const f=$('#volunteerFilterSelect');if(f)f.value='';renderVolunteerPanel();});
  $('#expandVolunteerBtn')?.addEventListener('click',()=>{
    volunteerAllExpanded=!volunteerAllExpanded;
    if(volunteerAllExpanded){
      volunteerVisibleEntries().forEach(x=>volunteerExpandedKeys.add(x.key));
    }else{
      volunteerExpandedKeys.clear();
    }
    renderVolunteerPanel({skipCapture:true});
  });
  $('#compactBtn').addEventListener('click',toggleCompact);
  $('#toggleHeaderBtn').addEventListener('click',toggleHeader);
  $('#backTopBtn').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  $('#closeAnnotationBtn').addEventListener('click',closeAnnotationDrawer);
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closePanel(b.dataset.close)));
  bindScoreInputs();
  $('#modalMask').addEventListener('click',e=>{if(e.target.id==='modalMask')closeModal();});
  $('#adminDockBtn')?.addEventListener('click',()=>$('#adminMenu').classList.toggle('open'));
  $('#loginBtn')?.addEventListener('click',showLoginModal);
  $('#reloadNotesBtn')?.addEventListener('click',fetchNotes);
  $('#logoutBtn')?.addEventListener('click',()=>{auth={accessToken:'',user:null}; alert('已退出当前前端会话');});
  $('#addSchoolNoteBtn')?.addEventListener('click',()=>{const s=getActiveSchool(); if(s)showNoteEditor('schools',keySchool(s),`${s.name}｜学校备注`);});
}
function bindScoreInputs(){
  const pairs=[['targetScoreRange','targetScoreInput'],['downRange','downInput'],['upRange','upInput']];
  pairs.forEach(([r,i])=>{const rr=$('#'+r), ii=$('#'+i); rr.addEventListener('input',()=>{ii.value=rr.value;updateRangeSummary()}); ii.addEventListener('input',()=>{rr.value=ii.value;updateRangeSummary()});});
  $('#applyScoreBtn').addEventListener('click',()=>{const target=+$('#targetScoreInput').value, down=+$('#downInput').value, up=+$('#upInput').value;state.scoreRange={target,down,up,min:target-down,max:target+up};$('#scoreBtn').textContent=`分数 ${target-down}—${target+up}`;closePanel('scorePanel');applyFilters();});
  $('#clearScoreBtn').addEventListener('click',()=>{state.scoreRange=null;$('#scoreBtn').textContent='目标分区间';closePanel('scorePanel');applyFilters();});
}
function updateRangeSummary(){const t=+$('#targetScoreInput').value||0,d=+$('#downInput').value||0,u=+$('#upInput').value||0;$('#rangeSummary').textContent=`目标分：${t}｜下浮${d}｜上浮${u}｜区间${t-d}—${t+u}｜含新增组预测分`;}
function openPanel(id){const panel=$('#'+id);if(panel)panel.classList.add('open');if(id==='volunteerPanel')document.body.classList.add('volunteer-workbench-open');}
function closePanel(id){const panel=$('#'+id);if(panel)panel.classList.remove('open');if(id==='volunteerPanel')document.body.classList.remove('volunteer-workbench-open');}
function toggleHeader(){
  const collapsed=document.body.classList.toggle('header-collapsed');
  $('#toggleHeaderBtn').textContent=collapsed?'展开头部':'收起头部';
}
function toggleCompact(){
  state.compact=!state.compact;
  document.body.classList.toggle('compact-mode',state.compact);
  $('#compactBtn').textContent=state.compact?'标准显示':'紧凑显示';
}
function isValidFacetValue(v){
  const t=String(v??'').trim();
  if(!t)return false;
  if(t.includes('#REF'))return false;
  if(/^#(VALUE|N\/A|DIV\/0|NAME|NULL|NUM)!?$/i.test(t))return false;
  return true;
}
function countGet(counterMap,key){return counterMap&&typeof counterMap.get==='function'?(counterMap.get(key)||0):0;}
function selectedSummary(defaultText,setRef,unit){
  const arr=[...setRef];
  if(!arr.length)return defaultText;
  return arr.length===1?arr[0]:`${arr[0]} +${arr.length-1}`;
}
function groupsFromOrderedItems(items,counts,groupDefs,otherTitle='其他'){
  const itemSet=new Set(items);
  const used=new Set();
  const out=[];
  groupDefs.forEach(def=>{
    const arr=(def.items||[]).filter(x=>itemSet.has(x)&&countGet(counts,x)>0);
    arr.forEach(x=>used.add(x));
    if(arr.length)out.push({title:def.title,items:arr});
  });
  const other=items.filter(x=>!used.has(x));
  if(other.length)out.push({title:otherTitle,items:other});
  return out;
}
function renderFacetPanel(opts){
  const {panelId,bodyId,title,searchPlaceholder,groups,counts,setRef,buttonUpdater,clearLabel}=opts;
  const body=document.getElementById(bodyId);
  if(!body){console.error('筛选面板容器不存在：',bodyId);return;}
  const draft=new Set([...setRef]);
  const groupPayloads=groups.map(g=>g.items||[]);
  body.innerHTML=`
    <div class="facet-top">
      <div class="facet-help">先在面板内勾选，最后点“应用筛选”；支持搜索、分组全选和单项取消。</div>
      <div class="facet-selected" data-facet-selected></div>
      <input class="facet-search" type="search" placeholder="${esc(searchPlaceholder||'搜索选项')}">
    </div>
    <div class="facet-section-list">
      ${groups.map((g,idx)=>`<section class="facet-section" data-facet-section>
        <div class="facet-section-head"><h4>${esc(g.title)} <span>${(g.items||[]).length}</span></h4><div><button type="button" data-facet-group-select="${idx}">全选</button><button type="button" data-facet-group-clear="${idx}">清空</button></div></div>
        <div class="facet-grid">${(g.items||[]).map(v=>`<label class="facet-option" data-facet-item data-search="${esc(v)}"><input type="checkbox" data-facet-value value="${esc(v)}" ${draft.has(v)?'checked':''}><span>${esc(v)}</span><em>${countGet(counts,v)}</em></label>`).join('')}</div>
      </section>`).join('')}
    </div>
    <div class="facet-footer"><button type="button" data-facet-clear>${esc(clearLabel||'清空全部')}</button><button type="button" data-facet-cancel>取消</button><button type="button" class="save" data-facet-apply>应用筛选</button></div>`;
  const cbs=()=>Array.from(body.querySelectorAll('input[data-facet-value]'));
  function syncChecks(){
    cbs().forEach(cb=>{cb.checked=draft.has(cb.value); cb.closest('.facet-option')?.classList.toggle('checked',cb.checked);});
    const selected=body.querySelector('[data-facet-selected]');
    const arr=[...draft];
    selected.innerHTML=arr.length?`<div class="facet-selected-title">已选 ${arr.length} 项</div><div class="facet-selected-chips">${arr.map(v=>`<button type="button" data-facet-remove="${esc(v)}">${esc(v)} ×</button>`).join('')}</div>`:`<div class="facet-selected-empty">尚未选择，默认不过滤。</div>`;
    selected.querySelectorAll('[data-facet-remove]').forEach(btn=>btn.addEventListener('click',()=>{draft.delete(btn.dataset.facetRemove);syncChecks();}));
  }
  function filterOptions(){
    const q=normalize(body.querySelector('.facet-search')?.value||'');
    body.querySelectorAll('[data-facet-item]').forEach(el=>{
      const show=!q||normalize(el.dataset.search||el.textContent).includes(q);
      el.style.display=show?'':'none';
    });
    body.querySelectorAll('[data-facet-section]').forEach(sec=>{
      const any=Array.from(sec.querySelectorAll('[data-facet-item]')).some(el=>el.style.display!=='none');
      sec.style.display=any?'':'none';
    });
  }
  cbs().forEach(cb=>cb.addEventListener('change',()=>{if(cb.checked)draft.add(cb.value);else draft.delete(cb.value);syncChecks();}));
  body.querySelectorAll('[data-facet-group-select]').forEach(btn=>btn.addEventListener('click',()=>{(groupPayloads[+btn.dataset.facetGroupSelect]||[]).forEach(v=>draft.add(v));syncChecks();filterOptions();}));
  body.querySelectorAll('[data-facet-group-clear]').forEach(btn=>btn.addEventListener('click',()=>{(groupPayloads[+btn.dataset.facetGroupClear]||[]).forEach(v=>draft.delete(v));syncChecks();filterOptions();}));
  body.querySelector('[data-facet-clear]').addEventListener('click',()=>{draft.clear();syncChecks();filterOptions();});
  body.querySelector('[data-facet-cancel]').addEventListener('click',()=>closePanel(panelId));
  body.querySelector('[data-facet-apply]').addEventListener('click',()=>{setRef.clear();draft.forEach(v=>setRef.add(v));buttonUpdater();closePanel(panelId);applyFilters();});
  body.querySelector('.facet-search').addEventListener('input',filterOptions);
  syncChecks();
}
function buildProvincePanel(){
  const counts=schoolCountBy('province');
  const items=Array.from(counts.keys()).sort((a,b)=>(counts.get(b)-counts.get(a))||a.localeCompare(b,'zh-Hans-CN'));
  const groups=groupsFromOrderedItems(items,counts,provinceRegionGroups,'其他地区');
  renderFacetPanel({panelId:'provincePanel',bodyId:'provincePanelBody',title:'地区筛选',searchPlaceholder:'搜索省份，如 江苏 / 浙江 / 黑龙江',groups,counts,setRef:state.selectedProvinces,buttonUpdater:updateProvinceButton,clearLabel:'清空地区筛选'});
}
function buildLevelPanel(){
  const counts=schoolFacetCounts();
  const items=Array.from(counts.keys()).sort((a,b)=>{
    const order=levelFacetGroups.flatMap(g=>g.items);
    const ai=order.indexOf(a), bi=order.indexOf(b);
    if(ai>=0&&bi>=0)return ai-bi;
    if(ai>=0)return -1; if(bi>=0)return 1;
    return (counts.get(b)-counts.get(a))||String(a).localeCompare(String(b),'zh-Hans-CN');
  });
  const groups=groupsFromOrderedItems(items,counts,levelFacetGroups,'其他层次');
  renderFacetPanel({panelId:'levelPanel',bodyId:'levelPanelBody',title:'院校层次筛选',searchPlaceholder:'搜索层次，如 985 / 211 / 双一流 / 保研双非 / 普通公办',groups,counts,setRef:state.selectedLevels,buttonUpdater:updateLevelButton,clearLabel:'清空院校层次'});
}
function buildRequirementPanel(){
  const counts=groupCountBy('requirement');
  const order=['不限','化学','生物','化和生','政治','地理','政和地','生和地'];
  const items=Array.from(counts.keys()).sort((a,b)=>{
    const ai=order.indexOf(a), bi=order.indexOf(b);
    if(ai>=0&&bi>=0)return ai-bi;
    if(ai>=0)return -1;
    if(bi>=0)return 1;
    return (counts.get(b)-counts.get(a))||String(a).localeCompare(String(b),'zh-Hans-CN');
  });
  const groups=groupsFromOrderedItems(items,counts,[{title:'常用要求',items:['不限','化学','生物']},{title:'组合要求',items:['化和生','政和地','生和地']},{title:'其他要求',items:['政治','地理']}],'其他选科');
  renderFacetPanel({panelId:'requirementPanel',bodyId:'requirementPanelBody',title:'选科要求筛选',searchPlaceholder:'搜索选科要求，如 化学 / 不限',groups,counts,setRef:state.selectedRequirements,buttonUpdater:updateRequirementButton,clearLabel:'清空选科要求'});
}
function CounterLike(){this.m=new Map();this.add=k=>this.m.set(k,(this.m.get(k)||0)+1);this.keys=()=>this.m.keys();this.get=k=>this.m.get(k)||0;}
function buildClassPanel(){
  const counts=new CounterLike();
  DB.forEach(s=>s.groups.forEach(g=>(g.majorClasses||[]).forEach(c=>counts.add(c))));
  const byDisc={};
  [...counts.keys()].forEach(c=>{let disc='其他'; DB.some(s=>s.groups.some(g=>g.majors.some(m=>{if(m.majorClass===c){disc=m.discipline||'其他';return true}return false;}))); (byDisc[disc]||(byDisc[disc]=[])).push(c);});
  const groups=disciplineOrder.map(d=>{let arr=byDisc[d]||[]; arr.sort((a,b)=>{let ai=hotOrder.indexOf(a),bi=hotOrder.indexOf(b); if(ai<0)ai=999;if(bi<0)bi=999; if(ai!==bi)return ai-bi; return (counts.get(b)-counts.get(a))||a.localeCompare(b,'zh-Hans-CN');}); return {title:d,items:arr};}).filter(g=>g.items.length);
  renderFacetPanel({panelId:'classPanel',bodyId:'classPanelBody',title:'专业大类筛选',searchPlaceholder:'搜索专业类，如 计算机 / 电子信息 / 土木',groups,counts,setRef:state.selectedClasses,buttonUpdater:updateClassButton,clearLabel:'清空专业大类'});
}
function updateProvinceButton(){const n=state.selectedProvinces.size; $('#provinceBtn').textContent=selectedSummary('全部省份',state.selectedProvinces,'省份');}
function updateLevelButton(){const n=state.selectedLevels.size; $('#levelBtn').textContent=selectedSummary('院校层次',state.selectedLevels,'院校层次');}
function updateRequirementButton(){const n=state.selectedRequirements.size; $('#requirementBtn').textContent=selectedSummary('选科要求',state.selectedRequirements,'选科要求');}
function updateClassButton(){const n=state.selectedClasses.size; $('#classBtn').textContent=selectedSummary('全部专业大类',state.selectedClasses,'专业大类');}
function groupMatchesSearch(s,g,q){if(!q)return true; const nq=normalize(q); if(normalize(s.name+s.province+s.city+s.subject+s.batch).includes(nq))return true; if(normalize(g.groupName+groupDisplayName(s,g)+g.requirement+(g.tags||[]).join('')+(g.majorClasses||[]).join('')+g.majorSummary).includes(nq))return true; return g.majors.some(m=>normalize(m.name+m.majorClass+m.discipline+m.code).includes(nq));}
function groupMatchesScore(s,g){
  if(!state.scoreRange)return true;
  const scores=[];
  if(num(g.score25)!==null)scores.push(num(g.score25));
  g.majors.forEach(m=>{if(num(m.score25)!==null)scores.push(num(m.score25));});
  const p=groupScoreEstimate(s,g);
  if(p&&num(p.score)!==null)scores.push(num(p.score));
  return scores.some(sc=>sc>=state.scoreRange.min&&sc<=state.scoreRange.max);
}
function groupMatchesClass(g){if(!state.selectedClasses.size)return true; return (g.majorClasses||[]).some(c=>state.selectedClasses.has(c));}
function groupMatchesRequirement(g){if(!state.selectedRequirements.size)return true; return state.selectedRequirements.has(String(g.requirement||'').trim());}

function groupWeightedMajorScore(g){
  let sum=0, weight=0, count=0;
  (g.majors||[]).forEach(m=>{
    const score=num(m.score25);
    if(score===null)return;
    let w=num(m.plan25);
    if(w===null||w<=0)w=num(m.admit25);
    if(w===null||w<=0)w=num(m.plan26);
    if(w===null||w<=0)w=1;
    sum+=score*w; weight+=w; count+=1;
  });
  if(weight>0)return {score:Math.round(sum/weight*10)/10,weight,count};
  const fallback=num(g.score25);
  return fallback!==null?{score:fallback,weight:0,count:0,fallback:true}:null;
}
function groupWeightedMajorScoreValue(g){
  const x=groupWeightedMajorScore(g);
  return x&&num(x.score)!==null?num(x.score):-1;
}
function groupWeightedMajorBadge(g){
  const x=groupWeightedMajorScore(g);
  if(!x)return '<span class="tag muted">组内加权均分 —</span>';
  const title=x.fallback?'专业分缺失时以专业组投档线兜底':'按组内各专业 25 年最低分 × 25 计划人数加权';
  return `<span class="tag group-weighted-score" title="${esc(title)}">组内加权均分 ${fmtNum(x.score)}</span>`;
}
function sortGroupsByWeightedMajorScore(groups){
  return [...groups].sort((a,b)=>{
    const aw=groupWeightedMajorScoreValue(a), bw=groupWeightedMajorScoreValue(b);
    if(bw!==aw)return bw-aw;
    const ar=num(a.rank25)??1e9, br=num(b.rank25)??1e9;
    if(ar!==br)return ar-br;
    const as=num(a.score25)??-1, bs=num(b.score25)??-1;
    if(bs!==as)return bs-as;
    return String(a.groupName||a.displayCode||'').localeCompare(String(b.groupName||b.displayCode||''),'zh-Hans-CN');
  });
}
function applyFilters(){
  const result=[]; const q=state.q;
  DB.forEach(s=>{
    if(state.batch&&s.batch!==state.batch)return;
    if(state.subject&&s.subject!==state.subject)return;
    if(state.selectedProvinces.size&&!state.selectedProvinces.has(s.province))return;
    if(!schoolMatchesLevelFacet(s))return;
    const groups=s.groups.filter(g=>{if(state.role&&!(g.tags||[]).includes(state.role))return false; if(!groupMatchesRequirement(g))return false; if(!groupMatchesScore(s,g))return false; if(!groupMatchesClass(g))return false; if(!groupMatchesSearch(s,g,q))return false; return true;});
    const visibleGroups=sortGroupsByWeightedMajorScore(groups);
    if(visibleGroups.length){result.push({...s,visibleGroups});}
  });
  result.sort(schoolSort);
  state.filtered=result;
  if(!result.some(s=>s.id===state.activeSchoolId)) state.activeSchoolId=result[0]?.id||null;
  render();
}
function schoolSort(a,b){
  const aw=a.weightedScore??-1,bw=b.weightedScore??-1; if(bw!==aw)return bw-aw;
  const as=Math.max(...a.visibleGroups.map(g=>g.score25||-1)),bs=Math.max(...b.visibleGroups.map(g=>g.score25||-1)); if(bs!==as)return bs-as;
  const ar=Math.min(...a.visibleGroups.map(g=>g.rank25||1e9)),br=Math.min(...b.visibleGroups.map(g=>g.rank25||1e9)); if(ar!==br)return ar-br;
  return a.name.localeCompare(b.name,'zh-Hans-CN');
}
function majorSortByThreeYear(a,b){
  const as=a.avgScore3??-1, bs=b.avgScore3??-1;
  if(bs!==as)return bs-as;
  const ar=a.avgRank3??1e9, br=b.avgRank3??1e9;
  if(ar!==br)return ar-br;
  const s25a=a.score25??-1, s25b=b.score25??-1;
  if(s25b!==s25a)return s25b-s25a;
  const r25a=a.rank25??1e9, r25b=b.rank25??1e9;
  if(r25a!==r25b)return r25a-r25b;
  return String(a.code||'').localeCompare(String(b.code||''),'zh-Hans-CN');
}
function render(){renderSidebar(); if(state.mode==='groups')renderGroupMode(); else renderSchoolMode();}
function renderSidebar(){
  const totalGroups=state.filtered.reduce((a,s)=>a+s.visibleGroups.length,0);
  $('#resultMeta').textContent=`${state.filtered.length} 所院校｜${totalGroups} 个专业组`;
  $('#schoolList').innerHTML=state.filtered.map(s=>`<div class="school-item ${s.id===state.activeSchoolId?'active':''} ${admissionPriorityInfo(s)?'priority-admission-school':''}" data-school-id="${s.id}" data-note-scope="schools" data-note-key="${esc(keySchool(s))}"><div class="name">${esc(s.name)}${admissionPriorityBadge(s,true)}${noteBadge('schools',keySchool(s))}</div><div class="meta"><span>${esc(s.province)}</span><span>${esc(s.subject)}</span><span>${esc(s.batch)}</span><span>${s.visibleGroups.length}组</span></div><div class="score-pill">加权均分 ${fmtNum(s.weightedScore)}</div></div>`).join('');
  $$('.school-item').forEach(el=>el.addEventListener('click',()=>{state.activeSchoolId=el.dataset.schoolId;render();}));
  bindNoteHoverAndContext();
}
function getActiveSchool(){return state.filtered.find(s=>s.id===state.activeSchoolId)||state.filtered[0]||null;}
function renderSchoolMode(){const s=getActiveSchool(); if(!s){$('#main').innerHTML='<div class="empty">没有匹配数据，请调整筛选条件。</div>';return;} $('#main').innerHTML=schoolHTML(s,s.visibleGroups,true); bindDynamic();}
function renderGroupMode(){
  const groups=[]; state.filtered.forEach(s=>s.visibleGroups.forEach(g=>groups.push([s,g])));
  const limit=120; const shown=groups.slice(0,limit);
  $('#main').innerHTML=`<div class="school-header"><div class="school-title"><h2>专业组视图</h2><span class="badge green">当前显示 ${shown.length} / ${groups.length} 组</span></div><div class="badges"><span class="badge">按院校加权均分排序</span><span class="badge">分数筛选含新增组预测分</span></div></div>`+shown.map(([s,g])=>groupSectionHTML(s,g)).join('')+(groups.length>limit?`<div class="empty">为保证浏览器性能，当前展示前 ${limit} 个专业组；可以继续缩小筛选条件。</div>`:'');
  bindDynamic();
}
function schoolHTML(s,groups,withCards){
  const plan26=groups.reduce((a,g)=>a+(g.plan26||0),0);
  const plan25=groups.reduce((a,g)=>a+(g.plan25||0),0);
  const planDiff=plan26-plan25;
  return `<section class="school-header" data-note-scope="schools" data-note-key="${esc(keySchool(s))}"><div class="school-title"><div class="school-title-main"><h2>${esc(s.name)} ${admissionPriorityBadge(s)}</h2><button class="school-info-link" type="button" data-school-info="${esc(keySchool(s))}">院校基础信息 ▾</button></div>${noteBadge('schools',keySchool(s))}<button class="anno-btn" data-annotation-scope="schools" data-annotation-key="${esc(keySchool(s))}" data-annotation-title="${esc(s.name)}｜院校批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="schools" data-annotation-key="${esc(keySchool(s))}" data-annotation-title="${esc(s.name)}｜院校批注">新增批注</button></div><div class="badges"><span class="badge">${esc(s.province)}</span><span class="badge">${esc(s.subject)}</span><span class="badge">${esc(s.batch)}</span><span class="badge green">当前显示 ${groups.length} 组</span></div>${admissionPriorityAlertHTML(s)}<div class="summary-grid"><div class="metric"><b>${fmtNum(s.weightedScore)}</b><span>院校加权平均分</span></div><div class="metric"><b>${fmtNum(s.weightedRank)}</b><span>加权平均位次</span></div><div class="metric"><b>${plan26}</b><span>2026 显示计划</span></div><div class="metric"><b class="${signedClass(planDiff)}">${formatSigned(planDiff)}</b><span>较 2025 计划变化</span></div></div></section>${withCards?`<div class="group-cards">${groups.map(g=>groupCardHTML(s,g)).join('')}</div>`:''}${groups.map(g=>groupSectionHTML(s,g)).join('')}`;
}
function groupCardHTML(s,g){
  const planDiff=(g.plan26||0)-(g.plan25||0);
  const topTags=[...(g.tags||[]).slice(0,3),...(g.majorClasses||[]).slice(0,3)];
  const quality=groupQuality(s,g);
  const title=groupDisplayTitleText(s,g);
  return `<article class="group-card group-quality-${quality.tone}" data-scroll="${g.id}" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}" title="${esc(quality.title)}"><div class="group-card-head"><h3>${groupTitleHTML(s,g)}${noteBadge('groups',keyGroup(s,g))}</h3>${groupChangeButtonHTML(s,g,'card')}</div><div class="grid">${groupScoreMiniHTML(s,g)}<div class="mini"><b>${g.majors.length}</b><span>专业数</span></div></div><div class="tag-row">${groupQualityBadge(quality)}${groupWeightedMajorBadge(g)}${admissionPriorityBadge(s,true)}${predictionBadgeHTML(s,g)}${planDeltaBadge(planDiff)}${topTags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="anno-actions">${volunteerButtonHTML(s,g)}${clearMajorButtonHTML(s,g)}<button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">新增批注</button></div></article>`;
}
function groupSectionHTML(s,g){
  const planDiff=(g.plan26||0)-(g.plan25||0);
  const quality=groupQuality(s,g);
  const title=groupDisplayTitleText(s,g);
  return `<section id="${g.id}" class="group-section group-quality-${quality.tone}" data-note-scope="groups" data-note-key="${esc(keyGroup(s,g))}" title="${esc(quality.title)}"><div class="group-head"><div class="group-head-main"><h3>${groupTitleHTML(s,g)}${noteBadge('groups',keyGroup(s,g))}</h3><p>${esc(s.name)}｜再选：${esc(g.requirement||'—')}｜${groupScoreLineHTML(s,g)}｜26计划 ${fmt(g.plan26)}｜较25年 ${formatSigned(planDiff)} ${planDiff===0?'':`<span class="${signedClass(planDiff)}">(${formatSigned(planDiff)})</span>`}</p><div class="tag-row">${groupQualityBadge(quality)}${groupWeightedMajorBadge(g)}${admissionPriorityBadge(s,true)}${predictionBadgeHTML(s,g)}${(g.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')} ${(g.majorClasses||[]).slice(0,8).map(c=>`<span class="badge">${esc(c)}</span>`).join('')} ${planDeltaBadge(planDiff)}</div><div class="anno-actions">${volunteerButtonHTML(s,g)}${clearMajorButtonHTML(s,g)}<button class="anno-btn" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">查看批注</button><button class="anno-btn primary" data-annotation-scope="groups" data-annotation-key="${esc(keyGroup(s,g))}" data-annotation-title="${esc(s.name)} ${esc(title)}｜专业组批注">新增批注</button></div></div>${groupChangeButtonHTML(s,g,'section')}</div><div class="table-wrap"><table><thead><tr><th>专业志愿</th><th>代码</th><th>专业名称</th><th>专业类</th><th>26计划/变化</th><th>25分/位次</th><th>三年均分/位次</th></tr></thead><tbody>${[...g.majors].sort(majorSortByThreeYear).map(m=>majorRowHTML(s,g,m)).join('')}</tbody></table></div></section>`;
}
function majorRowHTML(s,g,m){
  const avgYears=m.avgYears&&m.avgYears<3?`<br><span class="muted">${m.avgYears}年均值</span>`:'';
  const groupKey=keyGroup(s,g);
  const order=selectedMajorIndex(groupKey,m.key);
  const checked=order>=0;
  const riskMeta=majorRiskMeta(s,g,m);
  const riskToneClass=riskMeta.tone?`risk-tone-${riskMeta.tone}`:'';
  return `<tr class="${riskMeta.risk?'risk-row':''} ${riskToneClass} ${checked?'major-selected-row':''}" title="${riskMeta.risk?esc(riskMeta.reason):''}" data-note-scope="majors" data-note-key="${esc(keyMajor(m))}"><td class="major-select-cell"><label class="major-select-box" title="勾选后会自动加入该专业组，并按勾选顺序生成专业 1-6"><input type="checkbox" data-main-major-check="${esc(groupKey)}" value="${esc(m.key)}" ${checked?'checked':''}>${checked?`<span class="major-order-badge">${order+1}</span>`:'<span class="major-order-placeholder"></span>'}</label></td><td>${esc(m.code)}</td><td class="major-name"><span class="major-name-text">${esc(m.name)}</span>${majorRiskLabelHTML(riskMeta)}${noteBadge('majors',keyMajor(m))}<button class="anno-mini" data-annotation-scope="majors" data-annotation-key="${esc(keyMajor(m))}" data-annotation-title="${esc(s.name)} ${esc(groupDisplayTitleText(s,g))} ${esc(m.name)}｜专业批注">批注</button></td><td>${esc(m.majorClass||'其他')}<br><span class="muted">${esc(m.discipline||'其他')}</span></td><td>${fmt(m.plan26)} / ${planChangeInline(m.planChange)}</td><td>${fmtNum(m.score25)} / ${fmtNum(m.rank25)}</td><td>${fmtNum(m.avgScore3)} / ${fmtNum(m.avgRank3)}${avgYears}</td></tr>`;
}
function bindDynamic(){
  $$('[data-scroll]').forEach(el=>el.addEventListener('click',()=>document.getElementById(el.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));
  bindVolunteerButtons();
  bindClearMajorGroupButtons();
  bindMainMajorChecks();
  bindGroupChangeButtons();
  bindSchoolInfoButtons();
  bindAnnotationButtons();
  bindNoteHoverAndContext();
}
function noteBadge(scope,key){return notes[scope]&&notes[scope][key]?` <span class="note-badge">备注</span>`:'';}
function bindMajorDetailButtons(){/* V1.1.49：专业详情点击功能已取消 */}
function bindNoteHoverAndContext(){
  $$('[data-note-scope]').forEach(el=>{
    el.onmouseenter=()=>{const n=notes[el.dataset.noteScope]?.[el.dataset.noteKey]; if(n)showNotePanel(n);};
    el.onmouseleave=()=>hideNotePanel();
    if(document.body.dataset.admin==='1'){
      el.oncontextmenu=e=>{e.preventDefault(); showNoteEditor(el.dataset.noteScope,el.dataset.noteKey,`${labelScope(el.dataset.noteScope)}｜${el.dataset.noteKey}`);};
    }
  });
}
function labelScope(s){return s==='schools'?'学校备注':s==='groups'?'专业组备注':'专业备注';}
function showNotePanel(text){$('#notePanelText').textContent=text;$('#notePanel').classList.add('open');}
function hideNotePanel(){$('#notePanel').classList.remove('open');}
function validInfoValue(v){return !(v===undefined||v===null||v===''||v==='/'||v==='—');}
function infoPairHTML([k,v]){return validInfoValue(v)?`<dt>${esc(k)}</dt><dd>${esc(fmtNum(v))}</dd>`:'';}
function infoSectionHTML(title,pairs,extraClass=''){
  const body=pairs.map(infoPairHTML).join('');
  if(!body)return '';
  return `<section class="info-section ${extraClass}"><h4>${esc(title)}</h4><dl class="kv info-kv">${body}</dl></section>`;
}
function findSchoolByKey(key){return DB.find(s=>keySchool(s)===key)||state.filtered.find(s=>keySchool(s)===key)||null;}
function representativeDetailForSchool(s){
  for(const g of (s?.groups||[])){
    for(const m of (g.majors||[])){
      const d=DETAILS[m.key];
      if(d)return d;
    }
  }
  return {};
}
function schoolInfoPairs(s,d={}){const priority=admissionPriorityInfo(s); return [
  ['院校名称',d.school||s?.name],['录取规则风险',priority?`${priority.label}｜${priority.rules[0]||''}`:''],['所在省份',d.province||s?.province],['所在城市',d.city||s?.city],['城市层级',d.cityLevelTag],['院校代码',d.schoolCode],['院校标签',d.schoolTags||d.firstClass],['院校层次',d.schoolLevel||s?.level],['隶属单位',d.administration],['院校类型',d.schoolType],['公私性质',d.publicPrivate],['本科/专科',d.bachelorSpecialty],['保研率',d.baoyanRate],['学校软科排名',d.schoolRank],['转专业政策',d.transferPolicy],['硕士点数量',d.schoolMasterCount],['硕士点',d.masterPrograms],['博士点数量',d.schoolDoctorCount],['博士点',d.doctorPrograms],['录取规则',d.admissionRule],['招生章程',d.recruitChapter]
];}
function groupInfoPairs(d={}){return [
  ['专业组',d.group],['院校专业组代码',d.groupCode||d.schoolGroupCode],['专业组显示代码',d.displayCode||d.rawGroupCode],['科类',d.subject],['批次',d.batch],['计划类别',d.planCategory],['再选要求',d.subjectRequirement],['26专业组计划',d.groupPlan26],['组内专业数',d.groupMajorCount],['专业组干净度',d.groupCleanliness],['专业组25最低分',d.groupScore25],['专业组25最低位次',d.groupRank25],['专业组原始专业明细',d.rawGroupMajors]
];}
function majorBasePairs(d={}){return [
  ['专业代码',d.code],['专业全称',d.majorFullName||d.name],['本科专业名称',d.undergraduateName],['专业备注',d.majorRemark],['专业层次',d.majorLevel],['专业类',d.majorClass],['学科门类',d.discipline],['学科专业',d.subjectMajor],['选科要求',d.subjectRequirement],['学制',d.duration||d.degreeYears],['学费',d.tuition],['是否新增',d.isNew],['专业水平标签',d.majorLevelTags],['软科评级',d.softRating],['软科专业排名',d.softRank||d.majorRank],['学科评估',d.disciplineEvaluation||d.disciplineEval4||d.disciplineEval5],['专业硕士点',d.majorMasterPrograms],['专业博士点',d.majorDoctorPrograms],['相似度/来源说明',d.similarity||d.sourceRule]
];}
function admissionInfoPairs(d={}){return [
  ['2026计划',d.plan26],['26预估位次',d.predictedRank26],['2025计划',d.plan25],['2025录取人数',d.admit25],['2025最高分',d.max25],['2025最高位次',d.maxRank25],['2025最低分',d.score25],['2025最低位次',d.rank25],['2025旧批次',d.oldBatch25],['2024计划',d.plan24],['2024录取人数',d.admit24],['2024最高分',d.max24],['2024最高位次',d.maxRank24],['2024最低分',d.score24],['2024最低位次',d.rank24],['2024旧批次',d.oldBatch24],['2023计划',d.plan23],['2023录取人数',d.admit23],['2023最高分',d.max23],['2023最高位次',d.maxRank23],['2023最低分',d.score23],['2023最低位次',d.rank23],['2023旧批次',d.oldBatch23],['三年平均分',d.avgScore3],['三年平均位次',d.avgRank3],['均值年份数',d.avgYears]
];}
function findMajorContext(majorKey,groupKey){
  const rec=groupKey?getGroupRecord(groupKey):null;
  if(rec){
    const m=(rec.g.majors||[]).find(x=>x.key===majorKey);
    if(m)return {s:rec.s,g:rec.g,m};
  }
  for(const s of DB){
    for(const g of (s.groups||[])){
      const m=(g.majors||[]).find(x=>x.key===majorKey);
      if(m)return {s,g,m};
    }
  }
  return null;
}
function majorRiskDetailPairs(s,g,m){
  const meta=majorRiskMeta(s,g,m);
  const tier=lectureTierMeta(m);
  const quality=groupQuality(s,g);
  return [
    ['专业热度梯队',tier.label],
    ['梯队分类',tier.bucket],
    ['刺客/异类提示',meta.risk?`${meta.label||'风险专业'}｜${meta.tone||''}`:'未标注为刺客专业'],
    ['风险原因',meta.reason],
    ['专业组结构风险',quality?`${quality.label}｜${quality.title}`:''],
  ];
}
function bindSchoolInfoButtons(){
  $$('[data-school-info]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault(); e.stopPropagation();
    const s=findSchoolByKey(btn.dataset.schoolInfo);
    if(s)showSchoolInfo(s);
  }));
}
function showSchoolInfo(s){
  const d=representativeDetailForSchool(s);
  const subtitle=[s.province,s.city,s.subject,s.batch].filter(Boolean).join('｜');
  $('#modal').innerHTML=`<h3>${esc(s.name)}｜院校基础信息</h3><div class="modal-body"><div class="info-subtitle">${esc(subtitle)}｜本弹层只放学校层面的信息。</div>${infoSectionHTML('院校基础信息',schoolInfoPairs(s,d),'school-info-section')}<div class="modal-actions"><button onclick="document.getElementById('modalMask').classList.remove('open')">关闭</button></div></div>`;
  openModal();
}
function fallbackMajorDetail(ctx,schoolKey,groupKey){
  if(!ctx)return {};
  const s=ctx.s||{};
  const g=ctx.g||{};
  const m=ctx.m||{};
  return {
    school:s.name, group:g.groupName, groupCode:g.groupCode, displayCode:g.displayCode,
    identityKey:m.identityKey||`${m.groupCode||g.groupCode||''}+${m.code||''}`,
    sourceExcelRow:m.sourceExcelRow, sourceRule:m.sourceRule,
    province:s.province||g.province, city:s.city||g.city, subject:s.subject||g.subject, batch:s.batch||g.batch,
    schoolTags:Array.isArray(g.tags)?g.tags.join('/'):(s.tags||''), schoolLevel:s.level, publicPrivate:s.publicPrivate,
    baoyanRate:s.baoyanRate, schoolRank:s.schoolRank,
    schoolCode:s.schoolCode, schoolGroupCode:g.groupCode, rawGroupCode:g.displayCode,
    name:m.name, code:m.code, majorFullName:m.name, undergraduateName:m.baseName,
    majorRemark:m.remark, majorClass:m.majorClass, discipline:m.discipline,
    subjectRequirement:m.subjectRequirement||g.requirement, duration:m.duration, tuition:m.tuition,
    isNew:m.isNew, predictedRank26:m.predictedRank26,
    plan26:m.plan26, plan25:m.plan25, admit25:m.admit25, max25:m.max25, maxRank25:m.maxRank25, score25:m.score25, rank25:m.rank25,
    plan24:m.plan24, admit24:m.admit24, max24:m.max24, maxRank24:m.maxRank24, score24:m.score24, rank24:m.rank24,
    plan23:m.plan23, admit23:m.admit23, max23:m.max23, maxRank23:m.maxRank23, score23:m.score23, rank23:m.rank23,
    avgScore3:m.avgScore3, avgRank3:m.avgRank3, avgYears:m.avgYears,
    groupPlan26:g.plan26, groupMajorCount:g.groupMajorCount, groupCleanliness:g.groupCleanliness,
    groupScore25:g.score25, groupRank25:g.rank25, rawGroupMajors:g.rawGroupMajors
  };
}
function mergedMajorDetail(key,ctx){
  DETAILS=window.MAJOR_DETAILS||DETAILS||{};
  return Object.assign({}, fallbackMajorDetail(ctx), DETAILS[key]||{});
}
function showDetail(key,schoolKey,groupKey){
  const ctx=findMajorContext(key,groupKey);
  const d=mergedMajorDetail(key,ctx);
  const schoolNote=notes.schools[schoolKey]||'';
  const groupNote=notes.groups[groupKey]||'';
  const majorNote=notes.majors[key]||'';
  const heading=d.name||ctx?.m?.name||'专业信息';
  const riskSection=ctx?infoSectionHTML('专业风险与梯队提示',majorRiskDetailPairs(ctx.s,ctx.g,ctx.m),'major-risk-info-section'):'';
  $('#modal').innerHTML=`<h3>${esc(heading)}</h3><div class="modal-body"><div class="info-subtitle">点击专业名称查看硕博点、学科评估、软科评级、招生录取数据与风险提示。<br>身份键：${esc(d.identityKey||key)}｜数据源行：${esc(d.sourceExcelRow||'')}</div>${riskSection}${infoSectionHTML('院校基础信息',schoolInfoPairs(null,d),'school-info-section')}${infoSectionHTML('专业组基础信息',groupInfoPairs(d),'group-info-section')}${infoSectionHTML('专业基础信息',majorBasePairs(d),'major-info-section')}${infoSectionHTML('招生录取数据',admissionInfoPairs(d),'admission-info-section')}<div class="badges">${schoolNote?`<span class="note-badge">学校备注</span>`:''}${groupNote?`<span class="note-badge">专业组备注</span>`:''}${majorNote?`<span class="note-badge">专业备注</span>`:''}</div>${noteBlock('学校备注',schoolNote)}${noteBlock('专业组备注',groupNote)}${noteBlock('专业备注',majorNote)}<div class="modal-actions"><button onclick="document.getElementById('modalMask').classList.remove('open')">关闭</button></div></div>`;
  openModal();
}
function noteBlock(title,text){return text?`<section class="metric" style="margin-top:12px"><b style="font-size:14px">${esc(title)}</b><span style="white-space:pre-wrap;color:#33443a">${esc(text)}</span></section>`:'';}
function openModal(){const mask=$('#modalMask'); if(mask)mask.classList.add('open');}
function closeModal(){const mask=$('#modalMask'); if(mask)mask.classList.remove('open');}

function buildGroupIndex(){
  groupIndex=new Map();
  DB.forEach(s=>(s.groups||[]).forEach(g=>groupIndex.set(keyGroup(s,g),{s,g})));
  buildPredictionIndexes();
  volunteerKeys=[...new Set(volunteerKeys)].filter(k=>groupIndex.has(k)).slice(0,VOLUNTEER_LIMIT);
  volunteerKeys.forEach(ensureVolunteerSelection);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
}
function getGroupRecord(key){return groupIndex.get(key)||null;}
function sortedMajors(g){return [...(g.majors||[])].sort((a,b)=>{const ar=majorRiskMeta(null,g,a).risk,br=majorRiskMeta(null,g,b).risk; if(Boolean(ar)!==Boolean(br))return ar?1:-1; return majorSortByThreeYear(a,b);});}
function defaultMajorKeys(g){return sortedMajors(g).slice(0,MAX_MAJOR_PER_GROUP).map(m=>m.key);}
function uniqueValidMajorKeys(keys,g){
  const valid=new Set((g.majors||[]).map(m=>m.key));
  const out=[];
  (Array.isArray(keys)?keys:[]).forEach(k=>{
    if(valid.has(k)&&!out.includes(k)&&out.length<MAX_MAJOR_PER_GROUP)out.push(k);
  });
  return out;
}
function ensureVolunteerSelection(key){
  const rec=getGroupRecord(key);
  if(!rec)return;
  volunteerMajorKeys[key]=uniqueValidMajorKeys(volunteerMajorKeys[key],rec.g);
  if(!volunteerMeta[key])volunteerMeta[key]={strategy:'',obey:'是',note:''};
}
function ensureVolunteerGroupForMajor(key){
  if(!groupIndex.has(key))return false;
  if(!volunteerKeys.includes(key)){
    if(volunteerKeys.length>=VOLUNTEER_LIMIT){alert(`志愿表最多 ${VOLUNTEER_LIMIT} 个专业组。`);return false;}
    volunteerKeys.push(key);
  }
  ensureVolunteerSelection(key);
  return true;
}
function selectedMajorOrder(key){
  const rec=getGroupRecord(key);
  return rec?uniqueValidMajorKeys(volunteerMajorKeys[key],rec.g):[];
}
function selectedMajorIndex(key,majorKey){return selectedMajorOrder(key).indexOf(majorKey);}
function setMajorSelection(key,majorKey,checked){
  const rec=getGroupRecord(key);
  if(!rec)return false;
  let arr=selectedMajorOrder(key);
  if(checked){
    if(!ensureVolunteerGroupForMajor(key))return false;
    arr=selectedMajorOrder(key);
    if(!arr.includes(majorKey)){
      if(arr.length>=MAX_MAJOR_PER_GROUP){alert(`每个专业组最多只能选择 ${MAX_MAJOR_PER_GROUP} 个专业；请先取消一个已选专业，再选择新的专业。`);return false;}
      arr.push(majorKey);
    }
  }else{
    arr=arr.filter(k=>k!==majorKey);
  }
  volunteerMajorKeys[key]=arr;
  ensureVolunteerSelection(key);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  updateVolunteerUI();
  return true;
}
function setMajorSelectionBulk(key,majorKeys){
  if(!ensureVolunteerGroupForMajor(key))return false;
  const rec=getGroupRecord(key);
  if(!rec)return false;
  volunteerMajorKeys[key]=uniqueValidMajorKeys(majorKeys,rec.g);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  updateVolunteerUI();
  return true;
}
function clearMajorSelectionForGroup(key){
  const rec=getGroupRecord(key);
  if(!rec)return false;
  volunteerMajorKeys[key]=[];
  if(volunteerKeys.includes(key))ensureVolunteerSelection(key);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  updateVolunteerUI();
  return true;
}
function moveMajorSelection(key,majorKey,delta){
  const arr=selectedMajorOrder(key);
  const i=arr.indexOf(majorKey);
  const j=i+delta;
  if(i<0||j<0||j>=arr.length)return false;
  [arr[i],arr[j]]=[arr[j],arr[i]];
  volunteerMajorKeys[key]=arr;
  saveVolunteerMajorKeys();
  return true;
}
function updateVolunteerUI(){
  const count=volunteerKeys.length;
  const btn=$('#volunteerPanelBtn');
  if(btn)btn.textContent=`志愿表 ${count}/${VOLUNTEER_LIMIT}`;
  const countEl=$('#volunteerPanelCount');
  if(countEl)countEl.textContent=`已选 ${count} / ${VOLUNTEER_LIMIT} 个专业组`;
  $$('[data-volunteer-key]').forEach(btn=>{
    const selected=volunteerKeys.includes(btn.dataset.volunteerKey);
    const disabled=!selected&&volunteerKeys.length>=VOLUNTEER_LIMIT;
    btn.textContent=selected?'已加入志愿表':disabled?'志愿表已满':'加入志愿表';
    btn.title=selected?'再次点击：从志愿表移出该专业组，并清空本组已选专业':'点击：加入志愿表';
    btn.classList.toggle('selected',selected);
    btn.disabled=disabled;
  });
}
function addVolunteerKey(key){
  if(!groupIndex.has(key))return;
  if(!volunteerKeys.includes(key)){
    if(volunteerKeys.length>=VOLUNTEER_LIMIT){alert(`志愿表最多 ${VOLUNTEER_LIMIT} 个专业组。`);return;}
    volunteerKeys.push(key);
  }
  ensureVolunteerSelection(key);
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  updateVolunteerUI();
}
function removeVolunteerKey(key){
  volunteerKeys=volunteerKeys.filter(k=>k!==key);
  delete volunteerMajorKeys[key];
  delete volunteerMeta[key];
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  renderVolunteerPanel();
  updateVolunteerUI();
}
function toggleVolunteerKey(key){
  if(volunteerKeys.includes(key)){
    removeVolunteerKey(key);
    render();
    return;
  }
  addVolunteerKey(key);
}
function moveVolunteerKey(key,delta){
  const i=volunteerKeys.indexOf(key);
  const j=i+delta;
  if(i<0||j<0||j>=volunteerKeys.length)return;
  const arr=[...volunteerKeys];
  [arr[i],arr[j]]=[arr[j],arr[i]];
  volunteerKeys=arr;
  saveVolunteerKeys();
  renderVolunteerPanel();
  updateVolunteerUI();
}
function moveVolunteerKeyToPosition(key,rawPosition){
  const match=String(rawPosition||'').match(/\d+/);
  if(!match){alert('请输入目标序号，例如 10 或 第10。');return false;}
  const pos=Number(match[0]);
  if(!Number.isFinite(pos)||pos<1||pos>volunteerKeys.length){alert(`请输入 1-${volunteerKeys.length} 之间的序号。`);return false;}
  const i=volunteerKeys.indexOf(key);
  if(i<0)return false;
  const arr=[...volunteerKeys];
  const [item]=arr.splice(i,1);
  arr.splice(pos-1,0,item);
  volunteerKeys=arr;
  saveVolunteerKeys();
  renderVolunteerPanel();
  updateVolunteerUI();
  return true;
}
function moveVolunteerKeyByDrop(dragKey,targetKey,afterTarget){
  if(!dragKey||!targetKey||dragKey===targetKey)return false;
  if(!volunteerKeys.includes(dragKey)||!volunteerKeys.includes(targetKey))return false;
  const arr=volunteerKeys.filter(k=>k!==dragKey);
  const targetIndex=arr.indexOf(targetKey);
  if(targetIndex<0)return false;
  const insertIndex=targetIndex+(afterTarget?1:0);
  arr.splice(insertIndex,0,dragKey);
  volunteerKeys=arr;
  saveVolunteerKeys();
  renderVolunteerPanel();
  updateVolunteerUI();
  return true;
}
function bindVolunteerButtons(){
  $$('[data-volunteer-key]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      toggleVolunteerKey(btn.dataset.volunteerKey);
    };
  });
}
function bindClearMajorGroupButtons(){
  $$('[data-clear-major-group]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    const key=btn.dataset.clearMajorGroup;
    const count=selectedMajorOrder(key).length;
    if(!count)return;
    if(!confirm(`确认清空本专业组已选的 ${count} 个专业？\n不会删除专业组，只会把专业志愿清空。`))return;
    clearMajorSelectionForGroup(key);
    render();
    if($('#volunteerPanel')?.classList.contains('open'))renderVolunteerPanel();
  }));
}
function bindMainMajorChecks(){
  $$('[data-main-major-check]').forEach(cb=>{
    cb.addEventListener('click',e=>e.stopPropagation());
    cb.addEventListener('change',()=>{
      const ok=setMajorSelection(cb.dataset.mainMajorCheck,cb.value,cb.checked);
      if(!ok)cb.checked=!cb.checked;
      render();
      renderVolunteerPanel();
    });
  });
}
function fillVolunteerFromCurrentFilters(){
  for(const s of state.filtered){
    for(const g of s.visibleGroups){
      if(volunteerKeys.length>=VOLUNTEER_LIMIT)break;
      const key=keyGroup(s,g);
      if(!volunteerKeys.includes(key))addVolunteerKey(key);
    }
    if(volunteerKeys.length>=VOLUNTEER_LIMIT)break;
  }
  renderVolunteerPanel();
  updateVolunteerUI();
}
function clearVolunteers(){
  if(!volunteerKeys.length)return;
  if(!confirm('确定清空当前志愿表吗？'))return;
  volunteerKeys=[];
  volunteerMajorKeys={};
  volunteerMeta={};
  saveVolunteerKeys();
  saveVolunteerMajorKeys();
  saveVolunteerMeta();
  renderVolunteerPanel();
  updateVolunteerUI();
}
function selectedMajorsForKey(key){
  const rec=getGroupRecord(key);
  if(!rec)return [];
  const byKey=new Map((rec.g.majors||[]).map(m=>[m.key,m]));
  return selectedMajorOrder(key).map(k=>byKey.get(k)).filter(Boolean);
}
function volunteerSearchText(key,rec){
  if(!rec)return '';
  const {s,g}=rec;
  const meta=volunteerMeta[key]||{};
  const majorText=(g.majors||[]).map(m=>`${m.name||''} ${m.code||''} ${m.majorClass||''} ${m.discipline||''}`).join(' ');
  const selectedText=selectedMajorsForKey(key).map(m=>m.name||'').join(' ');
  return `${s.name||''} ${s.province||''} ${s.subject||''} ${s.batch||''} ${g.groupName||''} ${g.groupCode||''} ${groupDisplayName(s,g)||''} ${g.requirement||''} ${(g.tags||[]).join(' ')} ${meta.strategy||''} ${meta.note||''} ${selectedText} ${majorText}`;
}
function volunteerEntryMatches(key,rec){
  if(!rec)return false;
  const q=normalize(volunteerSearchQuery);
  if(q&&!normalize(volunteerSearchText(key,rec)).includes(q))return false;
  const mode=volunteerFilterMode;
  if(!mode)return true;
  const meta=volunteerMeta[key]||{};
  const selectedCount=selectedMajorOrder(key).length;
  if(['冲','稳','保','垫'].includes(mode))return meta.strategy===mode;
  if(mode==='pending')return !meta.strategy;
  if(mode==='emptyMajor')return selectedCount===0;
  if(mode==='notFullMajor')return selectedCount<MAX_MAJOR_PER_GROUP;
  if(mode==='fullMajor')return selectedCount>=MAX_MAJOR_PER_GROUP;
  return true;
}
function volunteerVisibleEntries(){
  return volunteerKeys.map((key,index)=>({key,index,rec:getGroupRecord(key)})).filter(x=>volunteerEntryMatches(x.key,x.rec));
}
function captureVolunteerExpandedState(){
  const list=$('#volunteerList');
  if(!list)return;
  $$('[data-volunteer-item]').forEach(row=>{
    const key=row.dataset.volunteerItem;
    const drawer=row.querySelector('.volunteer-edit-drawer');
    if(!key||!drawer)return;
    if(drawer.open)volunteerExpandedKeys.add(key);
    else if(!volunteerAllExpanded)volunteerExpandedKeys.delete(key);
  });
}
function keepVolunteerDrawerOpen(key){
  if(key)volunteerExpandedKeys.add(key);
}
function renderVolunteerPanel(options={}){
  const list=$('#volunteerList');
  if(!list)return;
  if(!options.skipCapture)captureVolunteerExpandedState();
  const visible=volunteerVisibleEntries();
  const countEl=$('#volunteerPanelCount');
  if(countEl)countEl.textContent=`已选 ${volunteerKeys.length} / ${VOLUNTEER_LIMIT} 个专业组｜当前显示 ${visible.length} 个`;
  const expandBtn=$('#expandVolunteerBtn');
  if(expandBtn)expandBtn.textContent=volunteerAllExpanded?'一键收回':'一键展开';
  if(!volunteerKeys.length){
    list.innerHTML='<div class="change-empty">还没有加入专业组。先按院校、地区、专业大类、分数段筛选，再点“当前筛选补满”，或在专业组卡片上点“加入志愿表”。</div>';
    updateVolunteerUI();
    return;
  }
  if(!visible.length){
    list.innerHTML='<div class="change-empty">当前志愿表中没有符合筛选条件的专业组。可以清除筛选后再查看完整志愿表。</div>';
    updateVolunteerUI();
    return;
  }
  list.innerHTML=visible.map(({key,index})=>volunteerRowHTML(key,index)).join('');
  bindVolunteerPanelControls();
  updateVolunteerUI();
}
function volunteerRowHTML(key,index){
  const rec=getGroupRecord(key);
  if(!rec)return '';
  const {s,g}=rec;
  ensureVolunteerSelection(key);
  const meta=volunteerMeta[key]||{};
  const majors=sortedMajors(g);
  const selectedOrder=selectedMajorOrder(key);
  const selectedMajors=selectedMajorsForKey(key);
  const planDiff=(g.plan26||0)-(g.plan25||0);
  const detailsOpen=(volunteerAllExpanded||volunteerExpandedKeys.has(key))?' open':'';
  const groupAlias=groupDisplayName(s,g)||'未命名';
  const poolFilter=volunteerMajorPoolFilter[key]||'all';
  const selectedList=selectedMajors.length?`<ol class="volunteer-major-strip">${selectedMajors.map((m,i)=>`<li class="volunteer-major-strip-item"><span class="major-order-badge">${i+1}</span><div class="volunteer-major-name"><b><span class="major-name-text">${esc(m.name)}</span>${majorRiskLabelHTML(majorRiskMeta(s,g,m))}</b><small>${esc(m.majorClass||'其他')}｜${fmt(m.plan26)}人｜${fmtNum(m.score25)}分</small></div><div class="volunteer-major-mini-actions"><button title="专业上移" data-major-move="${esc(key)}" data-major-key="${esc(m.key)}" data-delta="-1" ${i===0?'disabled':''}>↑</button><button title="专业下移" data-major-move="${esc(key)}" data-major-key="${esc(m.key)}" data-delta="1" ${i===selectedMajors.length-1?'disabled':''}>↓</button><button title="取消该专业" data-major-unselect="${esc(key)}" data-major-key="${esc(m.key)}">×</button></div></li>`).join('')}</ol>`:`<div class="volunteer-selected-empty-compact">尚未选择具体专业。展开专业池后勾选，系统会按勾选顺序生成第 1—6 专业。</div>`;
  const majorPicker=`<details class="major-picker volunteer-edit-drawer"${detailsOpen}><summary>专业池 ${majors.length} 个｜已选 ${selectedOrder.length} / ${MAX_MAJOR_PER_GROUP}</summary><div class="major-picker-actions compact"><select data-major-pool-filter="${esc(key)}"><option value="all" ${poolFilter==='all'?'selected':''}>全部专业</option><option value="selected" ${poolFilter==='selected'?'selected':''}>只看已选</option><option value="unselected" ${poolFilter==='unselected'?'selected':''}>只看未选</option></select><button data-major-preset="${esc(key)}" data-preset="none">清空专业</button></div><div class="major-picker-grid volunteer-major-grid compact-grid">${majors.map(m=>{const order=selectedOrder.indexOf(m.key);const isSelected=order>=0;const hidden=(poolFilter==='selected'&&!isSelected)||(poolFilter==='unselected'&&isSelected);const riskMeta=majorRiskMeta(s,g,m);return `<label class="major-check ${riskMeta.risk?'risk':''} ${riskMeta.tone?`risk-tone-${riskMeta.tone}`:''} ${isSelected?'selected':'unselected'}" title="${riskMeta.risk?esc(riskMeta.reason):''}" data-major-pool-state="${isSelected?'selected':'unselected'}" ${hidden?'style="display:none"':''}><input type="checkbox" data-major-check="${esc(key)}" value="${esc(m.key)}" ${isSelected?'checked':''}>${isSelected?`<span class="major-order-badge">${order+1}</span>`:'<span class="major-order-placeholder"></span>'}<b><span class="major-name-text">${esc(m.name)}</span></b>${majorRiskLabelHTML(riskMeta)}<small>${esc(m.majorClass||'其他')}｜${fmt(m.plan26)}人｜${fmtNum(m.score25)}分｜位次 ${fmtNum(m.rank25)}</small></label>`;}).join('')}</div></details>`;
  return `<article class="volunteer-item volunteer-table-row" data-volunteer-item="${esc(key)}">
    <div class="volunteer-order-col"><input class="volunteer-position-input" data-volunteer-position="${esc(key)}" value="${index+1}" title="输入目标序号，例如 10 或 第10" inputmode="numeric" aria-label="志愿序号"><span class="volunteer-drag-handle" data-volunteer-drag-handle="${esc(key)}" draggable="true" title="按住拖动调整专业组顺序">↕</span></div>
    <div class="volunteer-group-col"><div class="volunteer-group-title"><b>${esc(groupShortTitle(s,g))}</b></div><p>再选 ${esc(g.requirement||'—')}</p><p class="volunteer-group-alias">${esc(groupAlias)}</p></div>
    <div class="volunteer-major-col"><div class="volunteer-selected-summary"><div class="volunteer-col-caption">已选专业 <span>${selectedOrder.length}/${MAX_MAJOR_PER_GROUP}</span></div>${selectedList}</div>${majorPicker}</div>
    <div class="volunteer-data-col"><div class="volunteer-data-line emphasis">${groupScoreLineHTML(s,g)}</div><div class="volunteer-data-line">26计划 ${fmt(g.plan26)}｜较25 ${formatSigned(planDiff)}</div><div class="volunteer-mini-controls single"><label>定位<select data-volunteer-meta="${esc(key)}" data-field="strategy"><option value="">待定</option>${['冲','稳','保','垫'].map(v=>`<option value="${v}" ${meta.strategy===v?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="volunteer-obey-fixed">默认服从专业组内调剂</div><input class="volunteer-note-compact" data-volunteer-meta="${esc(key)}" data-field="note" value="${esc(meta.note||'')}" placeholder="备注"></div>
    <div class="volunteer-actions volunteer-action-col"><button class="icon-btn" title="上移" aria-label="上移" data-volunteer-move="${esc(key)}" data-delta="-1" ${index===0?'disabled':''}>↑</button><button class="icon-btn" title="下移" aria-label="下移" data-volunteer-move="${esc(key)}" data-delta="1" ${index===volunteerKeys.length-1?'disabled':''}>↓</button><button class="icon-btn danger" title="删除" aria-label="删除" data-volunteer-remove="${esc(key)}">×</button></div>
  </article>`;
}
function bindVolunteerPanelControls(){
  $$('.volunteer-edit-drawer').forEach(drawer=>drawer.addEventListener('toggle',()=>{
    const row=drawer.closest('[data-volunteer-item]');
    const key=row?.dataset.volunteerItem;
    if(!key)return;
    if(drawer.open)volunteerExpandedKeys.add(key);
    else if(!volunteerAllExpanded)volunteerExpandedKeys.delete(key);
  }));
  $$('[data-volunteer-remove]').forEach(btn=>btn.addEventListener('click',()=>removeVolunteerKey(btn.dataset.volunteerRemove)));
  $$('[data-volunteer-move]').forEach(btn=>btn.addEventListener('click',()=>moveVolunteerKey(btn.dataset.volunteerMove,Number(btn.dataset.delta)||0)));
  $$('[data-volunteer-position]').forEach(input=>{
    input.addEventListener('focus',()=>input.select());
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}});
    input.addEventListener('change',()=>{if(!moveVolunteerKeyToPosition(input.dataset.volunteerPosition,input.value))renderVolunteerPanel();});
  });
  bindVolunteerDragControls();
  $$('[data-volunteer-meta]').forEach(el=>el.addEventListener('input',()=>{const key=el.dataset.volunteerMeta; volunteerMeta[key]={...(volunteerMeta[key]||{}),[el.dataset.field]:el.value}; saveVolunteerMeta();}));
  $$('[data-major-pool-filter]').forEach(sel=>sel.addEventListener('change',()=>{const key=sel.dataset.majorPoolFilter; volunteerMajorPoolFilter[key]=sel.value||'all'; keepVolunteerDrawerOpen(key); renderVolunteerPanel();}));
  $$('[data-major-check]').forEach(cb=>cb.addEventListener('change',()=>{
    keepVolunteerDrawerOpen(cb.dataset.majorCheck);
    const ok=setMajorSelection(cb.dataset.majorCheck,cb.value,cb.checked);
    if(!ok)cb.checked=!cb.checked;
    renderVolunteerPanel();
    render();
  }));
  $$('[data-major-preset]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    const key=btn.dataset.majorPreset;
    keepVolunteerDrawerOpen(key);
    const rec=getGroupRecord(key);
    if(!rec)return;
    if(btn.dataset.preset==='none')setMajorSelectionBulk(key,[]);
    renderVolunteerPanel();
    render();
  }));
  $$('[data-major-move]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    keepVolunteerDrawerOpen(btn.dataset.majorMove);
    moveMajorSelection(btn.dataset.majorMove,btn.dataset.majorKey,Number(btn.dataset.delta)||0);
    renderVolunteerPanel();
    render();
  }));
  $$('[data-major-unselect]').forEach(btn=>btn.addEventListener('click',e=>{
    e.preventDefault();
    keepVolunteerDrawerOpen(btn.dataset.majorUnselect);
    setMajorSelection(btn.dataset.majorUnselect,btn.dataset.majorKey,false);
    renderVolunteerPanel();
    render();
  }));
  bindMajorDetailButtons();
}
function clearVolunteerDragMarks(){
  $$('[data-volunteer-item]').forEach(item=>item.classList.remove('dragging','drag-over','drop-after','drop-before'));
}
function bindVolunteerDragControls(){
  $$('[data-volunteer-drag-handle]').forEach(handle=>{
    handle.addEventListener('dragstart',e=>{
      volunteerDragKey=handle.dataset.volunteerDragHandle||'';
      if(e.dataTransfer){
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',volunteerDragKey);
      }
      const item=handle.closest('[data-volunteer-item]');
      if(item)item.classList.add('dragging');
    });
    handle.addEventListener('dragend',()=>{volunteerDragKey='';clearVolunteerDragMarks();});
  });
  $$('[data-volunteer-item]').forEach(item=>{
    item.addEventListener('dragover',e=>{
      const targetKey=item.dataset.volunteerItem;
      if(!volunteerDragKey||!targetKey||volunteerDragKey===targetKey)return;
      e.preventDefault();
      const rect=item.getBoundingClientRect();
      const after=e.clientY>rect.top+rect.height/2;
      item.classList.add('drag-over');
      item.classList.toggle('drop-after',after);
      item.classList.toggle('drop-before',!after);
    });
    item.addEventListener('dragleave',()=>item.classList.remove('drag-over','drop-after','drop-before'));
    item.addEventListener('drop',e=>{
      const targetKey=item.dataset.volunteerItem;
      if(!volunteerDragKey||!targetKey||volunteerDragKey===targetKey)return;
      e.preventDefault();
      const after=item.classList.contains('drop-after');
      const dragKey=volunteerDragKey;
      volunteerDragKey='';
      clearVolunteerDragMarks();
      moveVolunteerKeyByDrop(dragKey,targetKey,after);
    });
  });
}

function xlsCell(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function localDateStamp(d=new Date()){
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
}
function excelCell(v,style,opts={}){
  const isNum=typeof v==='number'&&Number.isFinite(v);
  const attrs=[];
  if(style)attrs.push(`ss:StyleID="${style}"`);
  if(opts.index)attrs.push(`ss:Index="${opts.index}"`);
  if(opts.mergeDown)attrs.push(`ss:MergeDown="${opts.mergeDown}"`);
  if(opts.mergeAcross)attrs.push(`ss:MergeAcross="${opts.mergeAcross}"`);
  return `<Cell${attrs.length?' '+attrs.join(' '):''}><Data ss:Type="${isNum?'Number':'String'}">${xlsCell(v)}</Data></Cell>`;
}
function excelCellSpec(spec,rowStyle){
  if(spec&&typeof spec==='object'&&!Array.isArray(spec)&&Object.prototype.hasOwnProperty.call(spec,'value')){
    return excelCell(spec.value,spec.style!==undefined?spec.style:rowStyle,spec);
  }
  return excelCell(spec,rowStyle);
}
function excelRow(row,style,opts={}){const attrs=[]; if(opts.height)attrs.push(`ss:Height="${opts.height}"`); return `<Row${attrs.length?' '+attrs.join(' '):''}>${row.map(v=>excelCellSpec(v,style)).join('')}</Row>`;}
function excelColumns(headers,widths=[]){return headers.map((h,i)=>`<Column ss:Index="${i+1}" ss:AutoFitWidth="0" ss:Width="${widths[i]||Math.min(Math.max(String(h).length*10,56),180)}"/>`).join('');}
function excelWorksheet(name,headers,rows,widths){
  return `<Worksheet ss:Name="${xlsCell(name)}"><Table>${excelColumns(headers,widths)}${excelRow(headers,'header')}${rows.map(r=>Array.isArray(r)?excelRow(r):excelRow(r.values,r.style)).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
}
function excelMetric(v){
  return v===null||v===undefined||v===''||Number.isNaN(v)?'':v;
}
function groupShortTitle(s,g){
  const school=String(s?.name||'').trim();
  const group=String(g?.groupName||'').trim();
  if(!group)return school;
  return group.includes(school)?group:`${school} ${group}`;
}
function groupExportInfo(s,g){
  const parts=[];
  const alias=groupDisplayName(s,g)||'';
  if(alias)parts.push(alias);
  if(g.requirement)parts.push(`再选 ${g.requirement}`);
  parts.push(`26计划 ${fmt(g.plan26)}`);
  parts.push(`25分 ${fmtNum(g.score25)}`);
  parts.push(`25位次 ${fmtNum(g.rank25)}`);
  return parts.filter(Boolean).join('｜');
}
function majorsForVolunteerExport(key,g){
  const selectedKeys=selectedMajorOrder(key);
  const selectedSet=new Set(selectedKeys);
  const byKey=new Map((g.majors||[]).map(m=>[m.key,m]));
  const selected=selectedKeys.map(k=>byKey.get(k)).filter(Boolean).map((m,i)=>({m,order:i+1,selected:true}));
  const unselected=sortedMajors(g).filter(m=>!selectedSet.has(m.key)).map(m=>({m,order:'',selected:false}));
  return selected.concat(unselected);
}
function exportVolunteerXlsx(){
  const invalid=[];
  for(let i=0;i<volunteerKeys.length;i++){
    const key=volunteerKeys[i];
    const rec=getGroupRecord(key);
    if(!rec)continue;
    const total=(rec.g.majors||[]).length;
    const required=Math.min(MAX_MAJOR_PER_GROUP,total);
    const selectedCount=selectedMajorOrder(key).length;
    if(required>0&&selectedCount!==required){
      invalid.push(`${i+1}. ${groupShortTitle(rec.s,rec.g)}：已选 ${selectedCount}/${required}`);
    }
  }
  if(invalid.length){
    alert(`导出前需要把每个专业组的专业填满：\n${invalid.slice(0,10).join('\n')}${invalid.length>10?'\n……':''}`);
    return;
  }
  const date=localDateStamp();
  const headers=['志愿序号','院校专业组代码','专业组','专业组信息','专业志愿序号','专业代码','专业名称','2026计划','25计划','25最低分','25最低位次','3年平均分','3年平均位次','定位','服从调剂','备注','选择状态'];
  const widths=[58,82,170,320,72,76,280,76,72,76,92,86,110,70,78,220,92];
  const valueOrBlank=v=>v===null||v===undefined||v===''||Number.isNaN(v)?'':v;
  const rows=[];
  for(let i=0;i<volunteerKeys.length;i++){
    const key=volunteerKeys[i];
    const rec=getGroupRecord(key);
    if(!rec)continue;
    const {s,g}=rec;
    const meta=volunteerMeta[key]||{};
    const majorItems=majorsForVolunteerExport(key,g);
    const items=majorItems.length?majorItems:[{m:null,order:'',selected:false}];
    const span=items.length;
    const merge=span>1?span-1:0;
    const selectedCount=selectedMajorOrder(key).length;
    const totalMajors=(g.majors||[]).length;
    const groupTitle=`${groupShortTitle(s,g)}（${selectedCount}/${totalMajors}）`;
    const groupInfo=groupExportInfo(s,g);
    items.forEach((item,idx)=>{
      const m=item.m;
      const selected=item.selected;
      const status=selected?`已选第${item.order}专业`:'未选';
      const majorSeqStyle=selected?'seq':'unselectedSeq';
      const majorTextStyle=selected?'body':'unselected';
      const majorNumStyle=selected?'num':'unselectedNum';
      const majorCells=[
        {value:m?item.order:'',style:majorSeqStyle,index:5},
        {value:m?(m.code||''):'',style:majorTextStyle},
        {value:m?(m.name||'未选择具体专业'):'未选择具体专业',style:majorTextStyle},
        {value:m?valueOrBlank(m.plan26):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.plan25):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.score25):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.rank25):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.avgScore3):'',style:majorNumStyle},
        {value:m?valueOrBlank(m.avgRank3):'',style:majorNumStyle}
      ];
      const statusCell={value:status,style:selected?'body':'unselectedStatus'};
      if(idx===0){
        rows.push([
          {value:i+1,style:'seq',mergeDown:merge},
          {value:g.groupCode||'',style:'body',mergeDown:merge},
          {value:groupTitle,style:'group',mergeDown:merge},
          {value:groupInfo,style:'groupInfo',mergeDown:merge},
          ...majorCells.map((c,n)=>n===0?{...c,index:undefined}:c),
          {value:meta.strategy||'待定',style:'seq',mergeDown:merge},
          {value:'是',style:'seq',mergeDown:merge},
          {value:meta.note||'',style:'note',mergeDown:merge},
          statusCell
        ]);
      }else{
        rows.push([...majorCells,{...statusCell,index:17}]);
      }
    });
  }
  if(!rows.length){
    alert('志愿表为空，暂无可导出的专业组。');
    return;
  }
  const thinBorder='<Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C8D6CC"/></Borders>';
  const columns=excelColumns(headers,widths);
  const title=`江苏本科志愿表｜已选 ${volunteerKeys.length} / ${VOLUNTEER_LIMIT} 专业组｜导出日期 ${date}`;
  const topRows=[
    excelRow([{value:title,style:'title',mergeAcross:headers.length-1}],null,{height:32}),
    excelRow(headers.map(h=>({value:h,style:'subheader'})),null,{height:30})
  ].join('');
  const body=rows.map(r=>excelRow(r,'body')).join('');
  const lastRow=rows.length+2;
  const lastCol=headers.length;
  const workbook=`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Created>${new Date().toISOString()}</Created><LastSaved>${new Date().toISOString()}</LastSaved></DocumentProperties>
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/>${thinBorder}</Style>
<Style ss:ID="title"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0A7C42" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="subheader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E8F1EC" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="group"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#173526"/><Interior ss:Color="#F3FBF6" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="groupInfo"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#173526"/><Interior ss:Color="#F3FBF6" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="body"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/>${thinBorder}</Style>
<Style ss:ID="seq"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1"/>${thinBorder}</Style>
<Style ss:ID="num"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10"/>${thinBorder}</Style>
<Style ss:ID="note"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#374151"/><Interior ss:Color="#FAFAFA" ss:Pattern="Solid"/>${thinBorder}</Style>
<Style ss:ID="unselected"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#B91C1C"/>${thinBorder}</Style>
<Style ss:ID="unselectedSeq"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>${thinBorder}</Style>
<Style ss:ID="unselectedNum"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#B91C1C"/>${thinBorder}</Style>
<Style ss:ID="unselectedStatus"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>${thinBorder}</Style>
</Styles>
<Worksheet ss:Name="志愿基础表"><Table>${columns}${topRows}${body}</Table><AutoFilter x:Range="R2C1:R${lastRow}C${lastCol}" xmlns="urn:schemas-microsoft-com:office:excel"/><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>2</SplitHorizontal><TopRowBottomPane>2</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>
</Workbook>`;
  const blob=new Blob(['\ufeff',workbook],{type:'application/vnd.ms-excel;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`江苏志愿基础表_${date}.xls`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
}

function bindGroupChangeButtons(){
  $$('[data-change-key]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      openGroupChange(btn.dataset.changeKey,btn.dataset.changeTitle);
    };
  });
}
function openGroupChange(key,title){
  $('#changePanelTitle').textContent=title||key;
  const data=GROUP_CHANGES[key];
  $('#changePanelBody').innerHTML=data?groupChangeHTML(data):`<div class="change-empty">暂无普通批 25-26 变迁数据。<br><span class="muted">当前变迁表主要覆盖普通类本科批；提前批或异常组可能未纳入。</span></div>`;
  openPanel('changePanel');
}
function metricTile(label,value,sub){
  return `<div class="change-metric"><b>${esc(fmt(value))}</b><span>${esc(label)}${sub?`｜${esc(sub)}`:''}</span></div>`;
}
function changeDetailLine(item){
  const parts=[];
  if(item.plan!==null&&item.plan!==undefined&&item.plan!=='')parts.push(`${item.plan}人`);
  if(item.type)parts.push(item.type);
  if(item.from)parts.push(`来源：${item.from}`);
  if(item.to)parts.push(`去向：${item.to}`);
  if(item.basis)parts.push(`依据：${item.basis}`);
  if(item.note||item.reason)parts.push(item.note||item.reason);
  return `<li><b>${esc(item.name||'未命名专业')}</b>${parts.length?`<br><span>${esc(parts.join('｜'))}</span>`:''}</li>`;
}
function changeDetailBlock(title,items){
  const list=(items||[]).slice(0,80);
  return `<section class="change-section"><h4>${esc(title)} <span class="muted">${(items||[]).length}</span></h4>${list.length?`<ol class="change-list">${list.map(changeDetailLine).join('')}</ol>${(items||[]).length>80?'<p class="muted">仅显示前 80 条。</p>':''}`:'<p class="muted">无</p>'}</section>`;
}
function groupChangeHTML(d){
  const planDiff=diffText(d.plan26,d.plan25);
  const majorDiff=diffText(d.majorCount26,d.majorCount25);
  const adviceClass=d.advice==='重点核对'?'warn':'';
  return `<div class="change-status-row"><span class="change-pill">${esc(d.status||'未标注状态')}</span><span class="change-pill ${adviceClass}">${esc(d.advice||'常规核对')}</span><span class="change-pill">置信度：${esc(fmt(d.confidence))}</span></div>
  <section class="change-section"><h4>数据口径</h4><p class="muted">${esc(d.sourceNote||'变迁层只解释专业组结构变化，不覆盖行级权威表中的分数、计划和专业基础信息。')}</p></section>
  <div class="change-compare"><div class="change-side"><span>2026 当前组</span><b>${esc(d.group26||'—')}</b><p>再选：${esc(fmt(d.require26))}｜专业 ${esc(fmt(d.majorCount26))}｜计划 ${esc(fmt(d.plan26))}</p></div><div class="change-side"><span>2025 对应组</span><b>${esc(d.group25||'—')}</b><p>再选：${esc(fmt(d.require25))}｜专业 ${esc(fmt(d.majorCount25))}｜计划 ${esc(fmt(d.plan25))}</p></div></div>
  <div class="change-metrics">${metricTile('计划变化',planDiff)}${metricTile('专业数变化',majorDiff)}${metricTile('综合相似度',percent(d.similarity))}${metricTile('26/25覆盖率',`${percent(d.cover26)} / ${percent(d.cover25)}`)}${metricTile('新增专业',d.addCount)}${metricTile('减少专业',d.removeCount)}${metricTile('拆入专业',d.inCount)}${metricTile('拆出专业',d.outCount)}</div>
  <section class="change-section"><h4>变化摘要</h4><p class="change-summary-text">${esc(d.summary||'无明显变化')}</p></section>
  ${changeDetailBlock('新增专业',d.details?.add)}
  ${changeDetailBlock('减少专业',d.details?.remove)}
  ${changeDetailBlock('拆入专业',d.details?.in)}
  ${changeDetailBlock('拆出专业',d.details?.out)}`;
}

function stableTerm(scope,key){
  return `js-plan-annotation::${scope}::${key}`;
}
function openAnnotation(payload){
  window.__currentAnnotation=payload;
  const {scope,key,title}=payload;
  const term=stableTerm(scope,key);
  $('#annotationObject').textContent=title;
  $('#annotationDrawer').classList.add('open');
  loadGiscus(term,title);
}
function closeAnnotationDrawer(){
  $('#annotationDrawer').classList.remove('open');
}
function giscusConfigured(){
  return !!(GISCUS_CONFIG.repo&&GISCUS_CONFIG.repoId&&GISCUS_CONFIG.category&&GISCUS_CONFIG.categoryId);
}
function loadGiscus(term,title){
  const mount=$('#giscusMount');
  mount.innerHTML='';
  if(!giscusConfigured()){
    mount.innerHTML=`<div class="giscus-config-tip"><h4>giscus 尚未配置</h4><p>请先到 giscus.app 为你的 GitHub 仓库生成配置，然后把 <code>repo</code>、<code>repoId</code>、<code>category</code>、<code>categoryId</code> 填入 app.js 顶部的 <code>GISCUS_CONFIG</code>。</p><p><b>当前批注绑定 term：</b></p><code>${esc(term)}</code><p class="muted">配置完成后，同一个学校、专业组或专业会稳定绑定到同一个 GitHub Discussion。</p></div>`;
    return;
  }
  const script=document.createElement('script');
  script.src='https://giscus.app/client.js';
  script.setAttribute('data-repo',GISCUS_CONFIG.repo);
  script.setAttribute('data-repo-id',GISCUS_CONFIG.repoId);
  script.setAttribute('data-category',GISCUS_CONFIG.category);
  script.setAttribute('data-category-id',GISCUS_CONFIG.categoryId);
  script.setAttribute('data-mapping','specific');
  script.setAttribute('data-term',term);
  script.setAttribute('data-strict','1');
  script.setAttribute('data-reactions-enabled','1');
  script.setAttribute('data-emit-metadata','0');
  script.setAttribute('data-input-position','top');
  script.setAttribute('data-theme',GISCUS_CONFIG.theme||'light');
  script.setAttribute('data-lang',GISCUS_CONFIG.lang||'zh-CN');
  script.setAttribute('crossorigin','anonymous');
  script.async=true;
  mount.appendChild(script);
}
function bindAnnotationButtons(){
  $$('[data-annotation-scope]').forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      openAnnotation({scope:btn.dataset.annotationScope,key:btn.dataset.annotationKey,title:btn.dataset.annotationTitle});
    };
  });
}

async function fetchNotes(){
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY){return;}
  try{const res=await fetch(`${SUPABASE_URL}/rest/v1/notes?select=scope,target_key,note`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken||SUPABASE_ANON_KEY}`}}); if(!res.ok)throw new Error(await res.text()); const rows=await res.json(); notes={schools:{},groups:{},majors:{}}; rows.forEach(r=>{if(notes[r.scope])notes[r.scope][r.target_key]=r.note;}); applyFilters();}
  catch(err){console.warn('读取备注失败',err);}
}
function showLoginModal(){
  $('#modal').innerHTML=`<h3>登录 Supabase 数据库</h3><div class="modal-body"><p class="muted">需要先在 app.js 中填写 Supabase URL 与 anon key，并在 Supabase 中配置 notes / admin_users 表与 RLS。</p><div class="score-row"><label>邮箱</label><input id="loginEmail" type="email" value="${esc(ADMIN_EMAIL)}" style="grid-column:span 2;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 10px"></div><div class="score-row"><label>密码</label><input id="loginPwd" type="password" style="grid-column:span 2;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 10px"></div><div class="modal-actions"><button onclick="document.getElementById('modalMask').classList.remove('open')">取消</button><button id="doLogin" class="save">登录</button></div></div>`;
  openModal(); $('#doLogin').addEventListener('click',loginSupabase);
}
async function loginSupabase(){
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY){alert('请先在 app.js 中填写 Supabase 配置。');return;}
  const email=$('#loginEmail').value, password=$('#loginPwd').value;
  try{const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})}); if(!res.ok)throw new Error(await res.text()); const data=await res.json(); auth.accessToken=data.access_token; auth.user=data.user; closeModal(); alert('登录成功'); fetchNotes();}
  catch(err){alert('登录失败：'+err.message);}
}
function showNoteEditor(scope,key,title){
  if(document.body.dataset.admin!=='1')return;
  const old=notes[scope]?.[key]||'';
  $('#modal').innerHTML=`<h3>${esc(title)}</h3><div class="modal-body edit-area"><textarea id="noteText" placeholder="输入文字备注；不支持图片备注。">${esc(old)}</textarea><div class="modal-actions"><button onclick="document.getElementById('modalMask').classList.remove('open')">关闭</button><button class="delete" id="deleteNote">删除</button><button class="save" id="saveNote">保存</button></div><div class="context-hint">scope：${esc(scope)}｜target_key：${esc(key)}</div></div>`;
  openModal();
  $('#saveNote').addEventListener('click',()=>saveNote(scope,key,$('#noteText').value));
  $('#deleteNote').addEventListener('click',()=>deleteNote(scope,key));
}
async function saveNote(scope,key,text){
  if(!text.trim()){await deleteNote(scope,key);return;}
  notes[scope][key]=text.trim();
  closeModal(); applyFilters();
  if(SUPABASE_URL&&SUPABASE_ANON_KEY&&auth.accessToken){try{await fetch(`${SUPABASE_URL}/rest/v1/notes?on_conflict=scope,target_key`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify({scope,target_key:key,note:text.trim(),created_by:auth.user?.id})});}catch(err){console.warn('保存备注失败',err);}}
}
async function deleteNote(scope,key){
  delete notes[scope][key];
  closeModal(); applyFilters();
  if(SUPABASE_URL&&SUPABASE_ANON_KEY&&auth.accessToken){try{await fetch(`${SUPABASE_URL}/rest/v1/notes?scope=eq.${encodeURIComponent(scope)}&target_key=eq.${encodeURIComponent(key)}`,{method:'DELETE',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`}});}catch(err){console.warn('删除备注失败',err);}}
}
function init(){
  buildGroupIndex();
  createLayout();
  initFilters();
  buildProvincePanel();
  buildLevelPanel();
  buildRequirementPanel();
  buildClassPanel();
  updateProvinceButton();
  updateLevelButton();
  updateRequirementButton();
  updateClassButton();
  bindEvents();
  updateVolunteerUI();
  applyFilters();
  fetchNotes();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
