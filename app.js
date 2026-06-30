function majorDetailKey(m){
  return [m.subject||'',m.batch||'',m.school||'',m.groupCode||'',String(m.code||'').padStart(2,'0')].join('|');
}
function detailForMajor(m){
  return MAJOR_DETAILS_BY_CODE[majorDetailKey(m)] || null;
}
/* version: 专业细分移动折叠版；重构专业组干净度：财会/数理/带电工科/医学等按同一报考逻辑判断；新增筛选栏一键折叠 */
const state = {batch:'',subject:'',province:'',provinces:[],level:'',levels:[],risk:'',majorClass:'',groupType:'',coopFilter:'',creditFilter:'',specialPathFilter:'',newSchoolFilter:'all',q:'',score:'',scoreUp:50,scoreDown:50,onlyNew:false,onlyStop:false,onlyCross:false,onlyHigh:false,usePredict:true,selected:null};
const $ = id => document.getElementById(id);
const fmt = v => (v===null || v===undefined || v==='') ? '—' : (typeof v==='number' ? v.toLocaleString('zh-CN') : v);
const delta = v => v>0 ? `<span class="delta-pos">+${v}</span>` : (v<0 ? `<span class="delta-neg">${v}</span>` : '0');
function esc(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function clampBand(v){let n=Number(v); if(!Number.isFinite(n)||n<0) return 0; return Math.min(50,n);}
function scoreActive(){const n=Number(state.score); return state.score!=='' && Number.isFinite(n);}
function scoreLow(){return Number(state.score)-clampBand(state.scoreDown);}
function scoreHigh(){return Number(state.score)+clampBand(state.scoreUp);}
function scoreBandText(){return scoreActive()? `${fmt(scoreLow())}–${fmt(scoreHigh())}分` : '';}
function scoreForFilter(g){
  const v = state.usePredict ? Number(g.filterScore) : Number(g.avgScore);
  return Number.isFinite(v) && v>0 ? v : NaN;
}
function scoreSourceLabel(g){
  if(state.usePredict && g.predUse && Number.isFinite(Number(g.filterScore))) return '模拟参考';
  return '25均分';
}
function predPill(g){
  if(!g.predUse) return '';
  const cls = g.predLevel==='up' ? 'blue' : (g.predLevel==='check' ? 'orange' : '');
  const range = (g.predLow!==null && g.predHigh!==null) ? `｜${fmt(g.predLow)}–${fmt(g.predHigh)}` : '';
  return `<span class="pill ${cls}">${esc(g.predLabel||'模拟参考')}${range}</span>`;
}
function iconSvg(dir){
  let path = '<circle cx="12" cy="12" r="8"></circle><path d="M8 12h8M12 8v8"></path>';
  if(/计算机|人工智能|电子|通信|集成/.test(dir)) path='<rect x="5" y="6" width="14" height="10" rx="2"></rect><path d="M9 20h6M12 16v4"></path>';
  else if(/电气|自动化|仪器/.test(dir)) path='<path d="M13 2L5 14h7l-1 8 8-12h-7l1-8z"></path>';
  else if(/医学|药学|护理|卫生|中医/.test(dir)) path='<path d="M12 4v16M4 12h16"></path><rect x="5" y="5" width="14" height="14" rx="3"></rect>';
  else if(/经济|管理|法学/.test(dir)) path='<path d="M4 19h16M6 16V8h4v8M14 16V5h4v11"></path>';
  else if(/教育|语言|文史|新闻/.test(dir)) path='<path d="M5 5h10a4 4 0 0 1 4 4v10H9a4 4 0 0 0-4-4V5z"></path>';
  else if(/材料|化学|环境|生物|食品/.test(dir)) path='<path d="M10 2v6l-5 9a3 3 0 0 0 3 5h8a3 3 0 0 0 3-5l-5-9V2"></path><path d="M8 14h8"></path>';
  else if(/机械|能源|土木|建筑|交通/.test(dir)) path='<circle cx="12" cy="12" r="3"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"></path>';
  else if(/数学|物理|统计|地理/.test(dir)) path='<path d="M4 17c4-10 12-10 16 0"></path><path d="M6 7h12M12 4v6"></path>';
  return `<span class="icon"><svg viewBox="0 0 24 24">${path}</svg></span>`;
}

function majorFullText(m){return `${m.name||''} ${m.majorClass||''} ${m.direction||''} ${m.remark||''} ${(m.labels||[]).join(' ')} ${(m.tags||[]).join(' ')}`;}
function cleanMajorNameForHot(text){return String(text||'').replace(/机械设计制造及其自动化/g,'机械设计制造').replace(/电气工程及其自动化/g,'电气工程');}
function isTeacherMajor(m){return /师范|公费师范|乡村教师|定向师范|未来教师计划|卓越教师|教师教育|教师专项/.test(`${m.name||''} ${m.remark||''}`);}
function catalogClass(m){return String(m.majorClass||'').replace(/\s/g,'');}
function majorCluster(m){
  const cls=catalogClass(m); const t=majorFullText(m); const n=cleanMajorNameForHot(t);
  // 第一原则：优先按源表“专业类”归类。名称只作为专业类缺失或医学类内部再细分的补充。
  if(/计算机类/.test(cls)) return '计算机类';
  if(/电子信息类/.test(cls)) return '电子信息类';
  if(/自动化类/.test(cls)) return '自动化类';
  if(/电气类/.test(cls)) return '电气类';
  if(/仪器类/.test(cls)) return '仪器类';
  if(/生物医学工程类/.test(cls)) return '医学技术类';
  if(/核工程类/.test(cls)) return '能源动力类';
  if(/大气科学类|海洋科学类/.test(cls)) return '测绘地理资源类';
  if(/心理学类/.test(cls)) return '法学社科类';
  if(/公安技术类|公安学类|司法技术类|司法执行类|法律实务类/.test(cls)) return '法学社科类';
  if(/铁道运输类|道路运输类|水上运输类|航空运输类|管道运输类|邮政类/.test(cls)) return '交通航空类';
  if(/公共服务类/.test(cls)) return '管理服务类';
  if(/文化服务类/.test(cls)) return '文史哲类';
  if(/机械类/.test(cls)) return '机械类';
  if(/能源动力类/.test(cls)) return '能源动力类';
  if(/材料类/.test(cls)) return '材料类';
  if(/化学类|化工与制药类/.test(cls)) return '化学化工类';
  if(/环境科学与工程类|安全科学与工程类/.test(cls)) return '环境安全类';
  if(/生物科学类|生物工程类|食品科学与工程类|轻工类|纺织类|植物生产类|自然保护与环境生态类|动物生产类|动物医学类|林学类|水产类|草学类|农业工程类/.test(cls)) return '生物食品农学类';
  if(/土木类|水利类/.test(cls)) return '土木水利类';
  if(/测绘类|地理科学类|地球物理学类|地质学类|地质类|矿业类/.test(cls)) return '测绘地理资源类';
  if(/建筑类/.test(cls)) return '建筑规划类';
  if(/交通运输类|海洋工程类|航空航天类|兵器类/.test(cls)) return '交通航空类';
  if(/数学类/.test(cls)) return '数学类';
  if(/统计学类/.test(cls)) return '统计类';
  if(/物理学类|天文学类/.test(cls)) return '物理类';
  if(/临床医学类/.test(cls)){
    if(/儿科学/.test(t)) return '儿科学提醒';
    if(/临床医学|麻醉学|医学影像学|眼视光医学|精神医学|放射医学/.test(t)) return '临床医学核心';
  if(/中医学|针灸推拿|中医骨伤|中西医临床/.test(t)) return '中医药类';
    return '临床医学相关';
  }
  if(/口腔医学类/.test(cls)) return '口腔医学类';
  if(/基础医学类/.test(cls)) return '基础医学类';
  if(/医学技术类/.test(cls)) return '医学技术类';
  if(/药学类|中药学类/.test(cls)) return '药学中药类';
  if(/中医学类|中西医结合类/.test(cls)) return '中医药类';
  if(/护理学类/.test(cls)) return '护理助产类';
  if(/公共卫生与预防医学类/.test(cls)) return '公共卫生类';
  if(/工商管理类/.test(cls) && /会计学|审计学|财务管理|资产评估/.test(t)) return '财会审计类';
  if(/财政学类|金融学类|经济学类|经济与贸易类/.test(cls)) return '经济金融类';
  if(/工商管理类|管理科学与工程类|电子商务类|物流管理与工程类|旅游管理类|公共管理类|工业工程类|农业经济管理类/.test(cls)) return '管理服务类';
  if(/法学类|政治学类|社会学类|公安学类|马克思主义理论类/.test(cls)) return '法学社科类';
  if(/中国语言文学类|历史学类|哲学类/.test(cls)) return '文史哲类';
  if(/外国语言文学类/.test(cls)) return '语言类';
  if(/新闻传播学类/.test(cls)) return '新闻传播类';
  if(/教育学类|体育学类/.test(cls) || isTeacherMajor(m)) return '教育师范类';
  if(/设计学类|美术学类|音乐与舞蹈学类|戏剧与影视学类|艺术学理论类/.test(cls)) return '艺体类';
  // 兜底：仅在专业类缺失时按名称识别。
  if(/计算机|软件工程|人工智能|数据科学|大数据|网络空间|信息安全|物联网|数字媒体技术|智能科学与技术/.test(n)) return '计算机类';
  if(/电子信息|电子与信息|通信工程|电子科学|微电子|集成电路|光电信息|信息工程|电磁场|电子封装/.test(n)) return '电子信息类';
  if(/电气工程|智能电网/.test(n)) return '电气类';
  if(/自动化|机器人工程|控制科学|轨道交通信号/.test(n)) return '自动化类';
  if(/测控|仪器|精密仪器/.test(n)) return '仪器类';
  if(/机械|车辆工程|智能制造|智能化制造|过程装备|工业设计|汽车服务/.test(t)) return '机械类';
  if(/地理空间信息|地理信息|测绘|遥感|土地整治|自然地理|人文地理|地理科学|地球物理|地质|勘查|资源勘查|矿业|采矿|矿物|大气科学|气象|智慧气象|防灾减灾|海洋资源与环境/.test(t)) return '测绘地理资源类';
  if(/建筑环境与能源应用工程|建筑电气与智能化|给排水|城市地下|道路桥梁|土木|智能建造|工程管理|工程造价|房地产|水利水电|港口航道|水文与水资源/.test(t)) return '土木水利类';
  if(/临床医学|麻醉学|医学影像学|眼视光医学|精神医学|放射医学/.test(t)) return '临床医学核心';
  if(/中医学|针灸推拿|中医骨伤|中西医临床/.test(t)) return '中医药类';
  if(/儿科学/.test(t)) return '儿科学提醒';
  if(/口腔医学/.test(t)) return '口腔医学类';
  if(/药学|中药/.test(t)) return '药学中药类';
  if(/护理|助产/.test(t)) return '护理助产类';
  if(/医学检验|康复治疗|医学技术/.test(t)) return '医学技术类';
  if(/预防医学|公共卫生|卫生检验/.test(t)) return '公共卫生类';
  if(/会计学|审计学|财务管理|资产评估/.test(t)) return '财会审计类';
  if(/新闻|传播|广告|网络与新媒体|编辑出版|广播电视/.test(t)) return '新闻传播类';
  if(/数学|统计学|物理|应用物理|信息与计算科学|数据计算|声学|天文学/.test(t)) return /统计/.test(t)?'统计类':(/物理|声学|天文/.test(t)?'物理类':'数学类');
  // 源表“专业类”为空、写“大类招生/其他”时，再按专业名称做必要兜底，避免无意义的“其他组”。
  if(/未来机器人|低空技术|航空航天|飞行器|船舶|海洋工程|兵器|武器|工程力学|理论与应用力学|力学/.test(t)){
    if(/机器人/.test(t)) return '自动化类';
    if(/力学/.test(t)) return '物理类';
    return '交通航空类';
  }
  if(/生物医学工程|康复工程|医疗器械|智能影像|临床工程/.test(t) || /生物医学工程类/.test(cls)) return '医学技术类';
  if(/交叉学科类/.test(cls)) return '其他小众类';
  if(/俄语|日语|德语|法语|西班牙语|葡萄牙语|意大利语|阿拉伯语|朝鲜语|罗马尼亚语|捷克语|商务英语|英语|翻译|语言学/.test(t)) return '语言类';
  if(/法学|政治学|国际政治|行政学|社会学|马克思|思想政治|公安|警务|侦查|治安|犯罪|警犬|出入境|安全防范|网络安全与执法|刑事科学技术|数据警务|海关检验检疫安全|消防救援/.test(t)) return '法学社科类';
  if(/国际经济|经济学|经济与贸易|金融|财政|国民经济/.test(t)) return '经济金融类';
  if(/工商管理|市场营销|人力资源|旅游管理|供应链|海关管理|海关稽查|公共管理|信息管理与信息系统|电子商务|工业工程|应急管理|养老管理/.test(t)) return '管理服务类';
  if(/汉语言|汉语|历史|哲学|中国古典|艺术史论|文科试验班|文物修复|戏剧影视文学/.test(t)) return '文史哲类';
  if(/材料|冶金|金属|高分子|无机非金属/.test(t)) return '材料类';
  if(/应用化学|化学工程|化工|制药工程/.test(t)) return '化学化工类';
  if(/环境科学|环境工程|生态学|环境科学与工程/.test(t)) return '环境安全类';
  if(/园林|农学|植物|动物|水产|食品|生物工程|生物制药|生物技术|生物科学|种子科学/.test(t)) return '生物食品农学类';
  if(/飞行技术|轮机工程|航海技术|交通运输|铁道|动车组|机车|高速铁路|民航/.test(t)) return '交通航空类';
  if(/核工程|核技术/.test(t)) return '能源动力类';
  if(/保密技术|信息安全|网络安全/.test(t)) return '计算机类';
  if(/应用心理学|心理学/.test(t)) return '法学社科类';
  return '其他小众类';
}
function clusterLabel(c){return ({'计算机类':'计算机类','电子信息类':'电子信息类','自动化类':'自动化类','电气类':'电气类','仪器类':'仪器类','机械类':'机械类','能源动力类':'能源动力类','材料类':'材料类','化学化工类':'化学/化工类','环境安全类':'环境/安全类','生物食品农学类':'生物/食品/农学类','土木水利类':'土木/水利类','测绘地理资源类':'测绘/地理/资源类','建筑规划类':'建筑/规划类','交通航空类':'交通/航空/航海类','数学类':'数学类','统计类':'统计类','物理类':'物理类','临床医学核心':'临床核心','儿科学提醒':'儿科学','口腔医学类':'口腔医学类','基础医学类':'基础医学类','医学技术类':'医学技术类','药学中药类':'药学/中药类','中医药类':'中医药类','护理助产类':'护理/助产类','公共卫生类':'公共卫生类','财会审计类':'财会审计类','经济金融类':'经济金融类','管理服务类':'管理服务类','法学社科类':'法学社科类','文史哲类':'文史哲类','语言类':'语言类','新闻传播类':'新闻传播类','教育师范类':'教育/师范类','艺体类':'艺体类','其他小众类':'其他小众类'}[c]||c);}
function domainOfCluster(c){
  if(['计算机类','电子信息类','自动化类','电气类','仪器类'].includes(c)) return '信息带电工科';
  if(['机械类','能源动力类'].includes(c)) return '传统工科';
  if(['材料类','化学化工类','环境安全类','生物食品农学类'].includes(c)) return '材料化工环境生物食品';
  if(['土木水利类','测绘地理资源类','建筑规划类','交通航空类'].includes(c)) return '土木测绘建筑交通';
  if(['数学类','统计类','物理类'].includes(c)) return '数理基础';
  if(['临床医学核心','儿科学提醒','口腔医学类','基础医学类','医学技术类','药学中药类','中医药类','护理助产类','公共卫生类'].includes(c)) return '医学药学';
  if(['财会审计类','经济金融类','管理服务类'].includes(c)) return '经管财会';
  if(['法学社科类','文史哲类','语言类','新闻传播类','教育师范类'].includes(c)) return '人文社科教育';
  if(['艺体类'].includes(c)) return '艺体';
  return '其他小众';
}
function unique(arr){return [...new Set(arr.filter(Boolean))];}
const HIGH_CLUSTERS=['计算机类','电子信息类','电气类','自动化类','临床医学核心','口腔医学类','财会审计类'];
const GOOD_CLUSTERS=['仪器类','法学社科类','统计类','数学类','经济金融类'];
const MID_CLUSTERS=['机械类','能源动力类','物理类','教育师范类','文史哲类','语言类'];
const LOW_CLUSTERS=['材料类','化学化工类','环境安全类','生物食品农学类','土木水利类','测绘地理资源类','建筑规划类','交通航空类','管理服务类','医学技术类','药学中药类','中医药类','护理助产类','公共卫生类','基础医学类','其他小众类'];
function clusterHeat(c){return ({'计算机类':96,'电子信息类':92,'电气类':90,'自动化类':86,'仪器类':72,'临床医学核心':98,'口腔医学类':97,'儿科学提醒':70,'财会审计类':84,'经济金融类':74,'法学社科类':74,'统计类':70,'数学类':66,'物理类':60,'教育师范类':62,'机械类':62,'能源动力类':54,'新闻传播类':48,'文史哲类':46,'语言类':43,'医学技术类':46,'药学中药类':44,'中医药类':45,'公共卫生类':42,'护理助产类':36,'管理服务类':38,'测绘地理资源类':34,'土木水利类':34,'材料类':32,'化学化工类':34,'环境安全类':30,'生物食品农学类':35,'建筑规划类':42,'交通航空类':50,'艺体类':40,'基础医学类':42,'其他小众类':35}[c]||40);}
function isHotMajor(m){return ['计算机类','电子信息类','电气类','自动化类','临床医学核心','口腔医学类'].includes(majorCluster(m));}
function isStableMajor(m){return ['财会审计类','经济金融类','法学社科类','统计类','数学类','教育师范类','仪器类'].includes(majorCluster(m));}
function isLowHeatMajor(m){return LOW_CLUSTERS.includes(majorCluster(m));}
const TARGET_SETS={
  '计算机纯':['计算机类'],
  '电子信息纯':['电子信息类'],
  '电气纯':['电气类'],
  '自动化纯':['自动化类'],
  '计算机电子信息':['计算机类','电子信息类'],
  '带电工科':['计算机类','电子信息类','自动化类','电气类','仪器类'],
  '带电工科机械':['计算机类','电子信息类','自动化类','电气类','仪器类','机械类'],
  '数理':['数学类','统计类','物理类'],
  '计算机数理':['计算机类','数学类','统计类'],
  '财会':['财会审计类'],
  '财会经金':['财会审计类','经济金融类'],
  '临床纯':['临床医学核心'],
  '临床相关':['临床医学核心','儿科学提醒'],
  '口腔纯':['口腔医学类'],
  '医学非临床':['医学技术类','药学中药类','中医药类','护理助产类','公共卫生类','基础医学类'],
  '材料化工环境生物食品':['材料类','化学化工类','环境安全类','生物食品农学类'],
  '土木测绘建筑':['土木水利类','测绘地理资源类','建筑规划类'],
  '传统工科':['机械类','能源动力类','交通航空类'],
  '法学人文':['法学社科类','文史哲类','语言类','新闻传播类','教育师范类'],
  '经管服务':['经济金融类','管理服务类'],
  '管理服务':['管理服务类'],
  '艺体':['艺体类']
};
function familyName(f){return ({'计算机纯':'计算机类','电子信息纯':'电子信息类','电气纯':'电气类','自动化纯':'自动化类','计算机电子信息':'计算机/电子信息','带电工科':'计算机/电子信息/电气/自动化','带电工科机械':'带电工科+机械','数理':'数理组','计算机数理':'计算机+数理','财会':'财会审计','财会经金':'财会经济','临床纯':'临床医学核心','临床相关':'临床医学相关','口腔纯':'口腔医学','医学非临床':'非临床医学类','材料化工环境生物食品':'材料化工环境生物食品','土木测绘建筑':'土木测绘建筑','传统工科':'传统工科','法学人文':'法学人文社科','经管服务':'经管服务','管理服务':'管理服务','艺体':'艺体'}[f]||f);}
function relationScore(a,b){
  if(a===b) return 100;
  const k=[a,b].sort().join('|');
  const map={
    '电子信息类|计算机类':86,'自动化类|计算机类':74,'电气类|计算机类':66,'仪器类|计算机类':68,'机械类|计算机类':52,'数学类|计算机类':62,'统计类|计算机类':68,'物理类|计算机类':56,
    '电子信息类|自动化类':82,'电子信息类|电气类':72,'仪器类|电子信息类':76,'机械类|电子信息类':54,'数学类|电子信息类':52,'统计类|电子信息类':56,'物理类|电子信息类':58,
    '电气类|自动化类':88,'仪器类|自动化类':78,'机械类|自动化类':72,'仪器类|电气类':68,'机械类|电气类':58,
    '机械类|能源动力类':66,'能源动力类|电气类':55,'能源动力类|自动化类':54,'材料类|机械类':46,'机械类|土木水利类':42,
    '数学类|统计类':90,'数学类|物理类':76,'物理类|统计类':68,
    '财会审计类|经济金融类':78,'管理服务类|财会审计类':45,'新闻传播类|财会审计类':18,'文史哲类|财会审计类':22,'语言类|财会审计类':20,
    '临床医学核心|儿科学提醒':68,'临床医学核心|口腔医学类':58,'临床医学核心|医学技术类':42,'临床医学核心|药学中药类':35,'临床医学核心|护理助产类':28,'临床医学核心|公共卫生类':38,'临床医学核心|中医药类':34,'临床医学核心|基础医学类':45,
    '儿科学提醒|口腔医学类':45,'医学技术类|药学中药类':62,'公共卫生类|药学中药类':52,'护理助产类|医学技术类':54,
    '材料类|化学化工类':82,'材料类|环境安全类':62,'化学化工类|环境安全类':76,'生物食品农学类|化学化工类':68,'生物食品农学类|环境安全类':66,
    '土木水利类|测绘地理资源类':72,'土木水利类|建筑规划类':70,'建筑规划类|测绘地理资源类':58,'交通航空类|土木水利类':48,
    '法学社科类|文史哲类':55,'文史哲类|语言类':72,'新闻传播类|文史哲类':66,'新闻传播类|语言类':58,'教育师范类|文史哲类':58,'教育师范类|语言类':55,
    '电子信息类|测绘地理资源类':26,'计算机类|测绘地理资源类':28,'自动化类|测绘地理资源类':24,'电气类|测绘地理资源类':20,
    '材料类|计算机类':20,'化学化工类|计算机类':18,'环境安全类|计算机类':16,'土木水利类|计算机类':18,'生物食品农学类|计算机类':18,
    '临床医学核心|计算机类':8,'口腔医学类|计算机类':8
  };
  if(map[k]!==undefined) return map[k];
  return domainOfCluster(a)===domainOfCluster(b)?48:18;
}
function pairwiseAvg(clusters){
  if(clusters.length<=1) return 100;
  let s=0,c=0; for(let i=0;i<clusters.length;i++) for(let j=i+1;j<clusters.length;j++){s+=relationScore(clusters[i],clusters[j]); c++;}
  return c?s/c:100;
}
function bestFamily(items){
  let best={name:'',set:[],inside:[],outside:[],insideCount:0,score:-1};
  for(const [name,set] of Object.entries(TARGET_SETS)){
    const inside=items.filter(x=>set.includes(x.c));
    const outside=items.filter(x=>!set.includes(x.c));
    const heat=inside.length?inside.reduce((s,x)=>s+clusterHeat(x.c),0)/inside.length:0;
    const avgRel=pairwiseAvg(unique(inside.map(x=>x.c)));
    const score=inside.length*100 + heat + avgRel - set.length*3;
    if(inside.length>best.insideCount || (inside.length===best.insideCount && score>best.score)) best={name,set,inside,outside,insideCount:inside.length,score,heat,avgRel};
  }
  return best;
}
function purityScore(items,best,riskCount,orange=false){
  const n=items.length||1;
  const clusters=unique(items.map(x=>x.c));
  const dominant=best.inside.length/n;
  const heatAvg=items.reduce((s,x)=>s+clusterHeat(x.c),0)/n;
  const rel=pairwiseAvg(clusters);
  let score=Math.round(0.30*heatAvg + 0.38*rel + 28*dominant - Math.max(0,clusters.length-1)*3 - riskCount*9 - (orange?10:0));
  return Math.max(15,Math.min(98,score));
}
function riskClassAgainstFamily(x,bf,items){
  const c=x.c, f=bf.name;
  const infoFamilies=['计算机纯','电子信息纯','电气纯','自动化纯','计算机电子信息','带电工科','带电工科机械'];
  const clinicalFamilies=['临床纯','临床相关','口腔纯'];
  const financeFamilies=['财会','财会经金'];
  const hasInfoCore=infoFamilies.includes(f);
  const highCoreCount=bf.inside.filter(y=>HIGH_CLUSTERS.includes(y.c)).length;
  const strongCore=bf.inside.length>=2 && (highCoreCount>=1 || ['数理','计算机数理','财会','财会经金'].includes(f));
  // 临床/口腔志向最严格：药学、护理、公卫、医技等不是普通临床的可替代项。
  if(clinicalFamilies.includes(f)){
    if(['药学中药类','医学技术类','护理助产类','公共卫生类','中医药类','基础医学类'].includes(c)) return 'danger';
    if(c==='儿科学提醒') return 'warn';
    return 'none';
  }
  // 信息、电子、电气、自动化主体组：只有明显远、低热方向才标刺客；机械/数理/仪器只作相邻或谨慎，不标刺客。
  if(hasInfoCore && strongCore){
    if(['材料类','化学化工类','环境安全类','生物食品农学类','土木水利类','测绘地理资源类','能源动力类'].includes(c)) return 'danger';
    if(['机械类','仪器类','数学类','统计类','物理类','交通航空类','建筑规划类','其他小众类'].includes(c)) return 'warn';
    return 'none';
  }
  // 财会审计主体：新闻、语言、文史、旅游管理等可能明显偏离；法学、经金只提示不标刺客。
  if(financeFamilies.includes(f)){
    if(['新闻传播类','语言类','文史哲类','建筑规划类'].includes(c)) return 'danger';
    if(c==='管理服务类'){
      const name=String(x.m&&x.m.name||'');
      if(/旅游|酒店|工程管理|工程造价|房地产|物业|会展|公共事业|行政管理|土地资源|养老|电子竞技/.test(name)) return 'danger';
      return 'warn';
    }
    if(['法学社科类','经济金融类'].includes(c)) return 'warn';
    return 'none';
  }
  // 数理主体中混入低热工科，可提醒；不轻易红。
  if(['数理','计算机数理'].includes(f)){
    if(['土木水利类','测绘地理资源类','材料类','化学化工类','环境安全类','生物食品农学类'].includes(c)) return 'danger';
    return 'warn';
  }
  return 'none';
}
function farMajorsAgainstFamily(items,bf){
  return bf.outside.filter(x=>riskClassAgainstFamily(x,bf,items)==='danger');
}
function warnMajorsAgainstFamily(items,bf){
  return bf.outside.filter(x=>riskClassAgainstFamily(x,bf,items)==='warn');
}
function groupAnalysis(g){
  const majors=g.majors||[];
  const items=majors.map(m=>({m,c:majorCluster(m),cls:catalogClass(m)}));
  const n=items.length;
  if(!n) return {kind:'yellow',cls:'risk-yellow',short:'待核对',label:'黄色｜待核对',score:0,note:'当前组缺少2026专业明细，先按人工核对处理',riskMajors:[],warnMajors:[],clusters:[]};
  const clusters=unique(items.map(x=>x.c));
  const domains=unique(clusters.map(domainOfCluster));
  const bf=bestFamily(items);
  const avgRel=pairwiseAvg(clusters);
  const lowCount=items.filter(x=>LOW_CLUSTERS.includes(x.c)).length;
  const allLow=lowCount===n;
  const allInBest=bf.outside.length===0;
  const hasClinical=clusters.includes('临床医学核心');
  const clinicalBad=['药学中药类','医学技术类','护理助产类','公共卫生类','中医药类','基础医学类'];
  const clinicalBadItems=items.filter(x=>clinicalBad.includes(x.c));
  const pediatricItems=items.filter(x=>x.c==='儿科学提醒');
  // 医学偏好更严格：临床志向下，药学/护理/公卫/医学技术都不是“近似可接受”。
  if(hasClinical && clinicalBadItems.length>0 && clinicalBadItems.length<=2){
    const sc=Math.min(70,Math.max(38,purityScore(items,bf,clinicalBadItems.length,false)));
    return {kind:'red',cls:'risk-red',short:`临床刺客 ${sc}`,label:`红色｜临床刺客混组｜${sc}分`,score:sc,note:`临床医学核心专业旁混入${clinicalBadItems.map(x=>clusterLabel(x.c)).join('、')}；对只想学临床的家庭来说需要重点回避`,riskMajors:clinicalBadItems.map(x=>x.m),warnMajors:[],clusters,domains,bestFamily:bf.name,avgRel};
  }
  if(hasClinical && pediatricItems.length>0 && clinicalBadItems.length===0){
    const sc=Math.min(82,Math.max(58,purityScore(items,bf,pediatricItems.length,false)));
    return {kind:'yellow',cls:'risk-yellow',short:`临床提醒 ${sc}`,label:`黄色｜临床相关提醒｜${sc}分`,score:sc,note:'临床医学与儿科学同组；儿科学虽属临床医学类，但很多家庭不等同于普通临床医学，需要单独提醒',riskMajors:[],warnMajors:pediatricItems.map(x=>x.m),clusters,domains,bestFamily:bf.name,avgRel};
  }
  if(allLow || (lowCount/n>=0.65 && !items.some(x=>HIGH_CLUSTERS.includes(x.c)))){
    const sc=purityScore(items,bf,0,false);
    return {kind:'yellow',cls:'risk-yellow',short:`整体一般 ${sc}`,label:`黄色｜整体一般｜${sc}分`,score:sc,note:'组内专业可能同类，但整体报考热度或就业认可度偏一般，不按绿色优质组处理',riskMajors:[],warnMajors:[],clusters,domains,bestFamily:bf.name,avgRel};
  }
  if(allInBest){
    const sc=purityScore(items,bf,0,false);
    if(['计算机纯','电子信息纯','电气纯','自动化纯','财会','临床纯','口腔纯'].includes(bf.name)){
      const s=Math.max(88,sc); return {kind:'excellent',cls:'risk-excellent',short:`高纯 ${s}`,label:`深绿｜高纯干净｜${s}分`,score:s,note:`组内专业基本属于${familyName(bf.name)}同一窄专业类/同一报考目标`,riskMajors:[],warnMajors:[],clusters,domains,bestFamily:bf.name,avgRel};
    }
    if(['计算机电子信息','带电工科','带电工科机械','数理','财会经金'].includes(bf.name)){
      const s=Math.max(72,Math.min(87,sc)); return {kind:'good',cls:'risk-good',short:`相邻 ${s}`,label:`浅绿｜相邻干净｜${s}分`,score:s,note:`组内专业属于${familyName(bf.name)}相邻方向，但不是单一纯专业组`,riskMajors:[],warnMajors:[],clusters,domains,bestFamily:bf.name,avgRel};
    }
    // 纯机械、纯法学人文等：结构干净，但不等同于高热好组。
    const s=Math.max(56,Math.min(78,sc));
    return {kind:'yellow',cls:'risk-yellow',short:`结构单一 ${s}`,label:`黄色｜结构单一但热度一般｜${s}分`,score:s,note:`组内专业同属${familyName(bf.name)}或相近方向，但从报考热度看不按绿色高价值组处理`,riskMajors:[],warnMajors:[],clusters,domains,bestFamily:bf.name,avgRel};
  }
  const far=farMajorsAgainstFamily(items,bf);
  const eligibleBase=['计算机纯','电子信息纯','电气纯','自动化纯','计算机电子信息','带电工科','带电工科机械','财会','财会经金','临床纯','临床相关','口腔纯','数理','计算机数理'];
  if(eligibleBase.includes(bf.name) && bf.inside.length>=Math.max(2,n-2) && far.length>=1 && far.length<=2 && bf.inside.length>far.length){
    const sc=Math.min(72,Math.max(35,purityScore(items,bf,far.length,false)));
    return {kind:'red',cls:'risk-red',short:`刺客 ${sc}`,label:`红色｜偏离主体｜${sc}分`,score:sc,note:`主体接近${familyName(bf.name)}，但混入${far.map(x=>clusterLabel(x.c)).join('、')}等明显远关系专业；只标真正不适合作为主体方向替代的专业`,riskMajors:far.map(x=>x.m),warnMajors:warnMajorsAgainstFamily(items,bf).map(x=>x.m),clusters,domains,bestFamily:bf.name,avgRel};
  }
  if(domains.length>=3 || clusters.length>=4 || avgRel<45){
    const sc=Math.min(64,Math.max(25,purityScore(items,bf,0,true)));
    return {kind:'orange',cls:'risk-orange',short:`大杂 ${sc}`,label:`橙色｜大杂混组｜${sc}分`,score:sc,note:`组内跨${domains.length}个报考逻辑，平均亲疏度${Math.round(avgRel)}；不宜只按前几个专业命名`,riskMajors:[],warnMajors:items.filter(x=>LOW_CLUSTERS.includes(x.c)).slice(0,2).map(x=>x.m),clusters,domains,bestFamily:bf.name,avgRel};
  }
  const warn=items.filter(x=>LOW_CLUSTERS.includes(x.c) || x.c==='儿科学提醒').slice(0,2).map(x=>x.m);
  const sc=Math.min(76,Math.max(45,purityScore(items,bf,warn.length,false)));
  return {kind:'yellow',cls:'risk-yellow',short:`一般 ${sc}`,label:`黄色｜整体一般｜${sc}分`,score:sc,note:`组内专业有一定相关性，但亲疏关系或家长接受度不够理想，平均亲疏度${Math.round(avgRel)}`,riskMajors:[],warnMajors:warn,clusters,domains,bestFamily:bf.name,avgRel};
}
function groupAssessment(g){return groupAnalysis(g);}
function hasHotCoreInGroup(g){
  return (g.majors||[]).some(x=>['计算机类','电子信息类','电气类','自动化类','临床医学核心','口腔医学类','财会审计类'].includes(majorCluster(x)));
}
function riskClusterSet(a){return unique((a.riskMajors||[]).map(x=>majorCluster(x)));}
function warnClusterSet(a){return unique((a.warnMajors||[]).map(x=>majorCluster(x)));}
function sameRiskDomain(c,clusters){return false;}
function majorRowRisk(m,g){
  const a=groupAnalysis(g);
  const c=majorCluster(m);
  const low=LOW_CLUSTERS.includes(c);
  const riskCs=riskClusterSet(a);
  const warnCs=warnClusterSet(a);
  const explicit=/高风险|错配|刺客/.test(`${m.risk||''} ${(m.auditNote||m.riskTip||'')} ${(m.labels||[]).join(' ')}`);
  // 绿色/浅绿必须绝对一致：组级干净，就不允许组内再出现红黄专业。
  if(a.kind==='excellent'||a.kind==='good') return '';
  // 红色刺客混组：风险专业按“专业类/同一风险域”统一标红，避免水利标了、土木不标。
  if(a.kind==='red'){
    if(a.riskMajors.includes(m) || riskCs.includes(c) || sameRiskDomain(c,riskCs)) return 'major-danger';
    return '';
  }
  // 橙色大杂混组：不轻易标红，但低热专业类应统一标黄，不能只标前两个。
  if(a.kind==='orange'){
    if(low || warnCs.includes(c) || sameRiskDomain(c,warnCs)) return 'major-warn';
    return '';
  }
  // 黄色组：如果有热门主体混入低热类，则低热类统一标黄；纯低热组不逐个大面积涂色。
  if(a.kind==='yellow'){
    if(warnCs.includes(c) || sameRiskDomain(c,warnCs)) return 'major-warn';
    if(hasHotCoreInGroup(g) && low) return 'major-warn';
    return '';
  }
  return '';
}
function majorRiskTags(m,g){
  const cls=majorRowRisk(m,g);
  if(cls==='major-danger') return ['偏离主体'];
  if(cls==='major-warn') return ['谨慎关注'];
  return [];
}
function tagClass(t){
  if(t==='偏离主体') return 'danger';
  if(t==='谨慎关注'||t==='需确认接受度') return 'warn';
  if(/属性变化|待核对|疑似新增/.test(String(t||''))) return 'audit';
  if(/计划/.test(String(t||''))) return 'plan';
  return '';
}
function clusterShort(c){return ({'计算机类':'计算机','电子信息类':'电子信息','自动化类':'自动化','电气类':'电气','仪器类':'仪器','机械类':'机械','能源动力类':'能动','材料类':'材料','化学化工类':'化工','环境安全类':'环境','生物食品农学类':'生物食品','土木水利类':'土木水利','测绘地理资源类':'测绘地理','建筑规划类':'建筑','交通航空类':'交通航空','数学类':'数学','统计类':'统计','物理类':'物理','临床医学核心':'临床','儿科学提醒':'儿科','口腔医学类':'口腔','基础医学类':'基础医','医学技术类':'医学技术','药学中药类':'药学中药','中医药类':'中医药','护理助产类':'护理','公共卫生类':'公卫','财会审计类':'财会审计','经济金融类':'经济金融','管理服务类':'管理服务','法学社科类':'法学社科','文史哲类':'文史哲','语言类':'语言','新闻传播类':'新闻传播','教育师范类':'师范教育','艺体类':'艺体','其他小众类':'其他'}[c]||c.replace(/类$/,''));}
function familyShortName(f){return ({'计算机纯':'计算机','电子信息纯':'电子信息','电气纯':'电气','自动化纯':'自动化','计算机电子信息':'计算机电子','带电工科':'带电工科','带电工科机械':'带电工科机械','数理':'数理','计算机数理':'计算机数理','财会':'财会审计','财会经金':'财会经济','临床纯':'临床医学','临床相关':'临床医学','口腔纯':'口腔医学','医学非临床':'药护医技','材料化工环境生物食品':'材料化工生物','土木测绘建筑':'土建测绘','传统工科':'机械能动交通','法学人文':'法学人文','经管服务':'经管服务','管理服务':'管理服务','艺体':'艺体'}[f]||familyName(f));}
function domainShort(d){return ({'信息带电工科':'带电工科','传统工科':'机械能动','材料化工环境生物食品':'材料化工生物','土木测绘建筑交通':'土建测绘','数理基础':'数理','医学药学':'医药','经管财会':'经管财会','人文社科教育':'人文师范','艺体':'艺体','其他小众':'其他'}[d]||d);}
function typeTagLabel(t){return t==='材料化工环境生物食品'?'材料/化工/环境/生物/食品':t;}
function typeTagsLabel(tags){return (tags||[]).map(typeTagLabel).join(' / ');}
function fitTitle(parts,suffix='组',sep=''){
  parts=unique(parts.filter(Boolean));
  if(!parts.length) return '待核对组';
  for(let n=parts.length;n>=1;n--){
    const t=parts.slice(0,n).join(sep)+(n<parts.length?'等':'')+suffix;
    if(t.length<=20) return t;
  }
  return (parts[0]+suffix).slice(0,20);
}
function clusterCountItems(items){
  const map={}; items.forEach(x=>{map[x.c]=(map[x.c]||0)+1;});
  return Object.entries(map).map(([c,count])=>({c,count,heat:clusterHeat(c)})).sort((a,b)=>b.count-a.count||b.heat-a.heat||clusterShort(a.c).localeCompare(clusterShort(b.c),'zh'));
}
function domainsByItems(items){
  const map={}; items.forEach(x=>{const d=domainOfCluster(x.c); map[d]=(map[d]||0)+1;});
  return Object.entries(map).map(([d,count])=>({d,count})).sort((a,b)=>b.count-a.count).map(x=>x.d);
}
function compactClusterList(items,maxN=4){return clusterCountItems(items).slice(0,maxN).map(x=>clusterShort(x.c));}
function titlePartsFromItems(items,maxN=5){
  const counts=clusterCountItems(items);
  const countMap=Object.fromEntries(counts.map(x=>[x.c,x.count]));
  const cs=counts.map(x=>x.c);
  const parts=[];
  const info=['计算机类','电子信息类','电气类','自动化类','仪器类'];
  const infoCs=cs.filter(c=>info.includes(c));
  if(infoCs.length>=3) parts.push('带电工科');
  else infoCs.forEach(c=>parts.push(clusterShort(c)));
  const math=['数学类','统计类','物理类'];
  const mathCs=cs.filter(c=>math.includes(c));
  if(mathCs.length>=2) parts.push('数理');
  else mathCs.forEach(c=>parts.push(clusterShort(c)));
  const med=['临床医学核心','儿科学提醒','口腔医学类','医学技术类','药学中药类','中医药类','护理助产类','公共卫生类','基础医学类'];
  const eng=['机械类','能源动力类','材料类','化学化工类','环境安全类','生物食品农学类','土木水利类','测绘地理资源类','建筑规划类','交通航空类'];
  const fin=['财会审计类','经济金融类','管理服务类'];
  const hum=['法学社科类','文史哲类','语言类','新闻传播类','教育师范类','艺体类','其他小众类'];
  [eng,med,fin,hum].flat().forEach(c=>{if(cs.includes(c)) parts.push(clusterShort(c));});
  // 按出现频次校正顺序：主体在前，但保留远房专业，不用“生化环材”大筐词。
  return unique(parts).sort((a,b)=>{
    const ca=cs.find(c=>clusterShort(c)===a) || (a==='带电工科'?'计算机类':(a==='数理'?'数学类':''));
    const cb=cs.find(c=>clusterShort(c)===b) || (b==='带电工科'?'计算机类':(b==='数理'?'数学类':''));
    return (countMap[cb]||0)-(countMap[ca]||0) || (clusterHeat(cb)-clusterHeat(ca));
  }).slice(0,maxN);
}
function lowGroupSpecificTitle(clusters){
  const cs=unique(clusters);
  if(cs.length===1) return clusterShort(cs[0])+'组';
  if(cs.every(c=>['材料类','化学化工类','环境安全类','生物食品农学类'].includes(c))) return fitTitle(cs.map(clusterShort),'组','、');
  if(cs.every(c=>['土木水利类','测绘地理资源类','建筑规划类','交通航空类'].includes(c))) return fitTitle(cs.map(clusterShort),'组','、');
  if(cs.every(c=>['医学技术类','药学中药类','中医药类','护理助产类','公共卫生类','基础医学类'].includes(c))) return fitTitle(cs.map(clusterShort),'组','、');
  if(cs.every(c=>['管理服务类','经济金融类','财会审计类'].includes(c))) return fitTitle(cs.map(clusterShort),'组','、');
  return null;
}
function groupDisplayTitle(g){
  const majors=g.majors||[]; const a=groupAnalysis(g);
  if(!majors.length) return (g.title||'待核对专业组').replace(/材料化工环境生物食品|生化环材|材化生食/g,'材料化工生物').slice(0,20);
  const items=majors.map(m=>({m,c:majorCluster(m),cls:catalogClass(m)}));
  const clusters=a.clusters||unique(items.map(x=>x.c));
  const specificLow=lowGroupSpecificTitle(clusters);
  if(majors.length===1) return clusterShort(majorCluster(majors[0]))+'组';
  if(a.kind==='excellent'){
    if(clusters.length===1) return clusterShort(clusters[0])+'组';
    return fitTitle(titlePartsFromItems(items,4),'组','、');
  }
  if(a.kind==='good'){
    const cs=clusterCountItems(items).map(x=>x.c);
    if(cs.every(c=>['计算机类','电子信息类'].includes(c))) return '计算机电子组';
    if(cs.every(c=>['电气类','自动化类','仪器类'].includes(c))) return fitTitle(cs.map(clusterShort),'组','、');
    return fitTitle(titlePartsFromItems(items,4),'组','、');
  }
  if(a.kind==='red'){
    const riskSet=unique((a.riskMajors||[]).map(m=>clusterShort(majorCluster(m))));
    const riskClusters=unique((a.riskMajors||[]).map(m=>majorCluster(m)));
    const baseItems=items.filter(x=>!riskClusters.includes(x.c));
    let baseParts=titlePartsFromItems(baseItems.length?baseItems:items,3);
    if(baseParts.length>=3 && baseParts.some(p=>['计算机','电子信息','电气','自动化','仪器'].includes(p))) baseParts=titlePartsFromItems(baseItems.length?baseItems:items,2);
    const base=baseParts.join('') || familyShortName(a.bestFamily||'主体');
    let t=`${base}混${riskSet.slice(0,2).join('、')}组`;
    if(t.length<=20) return t;
    t=`${base}混${riskSet[0]||'异类'}组`;
    if(t.length<=20) return t;
    return `${base}刺客组`.slice(0,20);
  }
  if(a.kind==='orange'){
    const parts=titlePartsFromItems(items,5);
    let t=fitTitle(parts,'大杂组','+');
    if(t.length<=20) return t;
    t=fitTitle(parts.slice(0,4),'大杂组','+');
    if(t.length<=20) return t;
    return fitTitle(parts.slice(0,3),'大杂组','+');
  }
  if(clusters.includes('临床医学核心') && clusters.includes('儿科学提醒')) return '临床混儿科提醒组';
  if(clusters.includes('临床医学核心') && clusters.some(c=>['药学中药类','医学技术类','护理助产类','公共卫生类','中医药类','基础医学类'].includes(c))) return '临床混非临床组';
  if(specificLow) return specificLow;
  return fitTitle(titlePartsFromItems(items,5),'组','、');
}



function textOfGroup(g){
  return [
    g.title,g.riskTip,g.elective,
    ...(g.importantTags||[]),...(g.typeTags||[]),
    ...(g.majors||[]).flatMap(m=>[m.name,m.remark,m.majorClass,m.direction,...(m.tags||[]),...(m.labels||[])]),
    ...(g.legacy||[]).flatMap(m=>[m.name,m.remark,m.majorClass,m.direction,...(m.tags||[])])
  ].filter(Boolean).join(' ');
}

function textOfMajorForAttr(m){
  return [m?.name,m?.remark,m?.majorClass,m?.direction,...(m?.tags||[]),...(m?.labels||[])].filter(Boolean).join(' ');
}
function textOfGroupForAttr(g){
  return [g?.title,g?.riskTip,g?.elective,...(g?.importantTags||[]),...(g?.typeTags||[]),...(g?.majors||[]).map(textOfMajorForAttr)].filter(Boolean).join(' ');
}
// 严格中外合作：只认明确“中外合作/合作办学/中外联合”等，不再把普通“中法/中德/中俄项目班/学院”误判为中外合作。
const COOP_STRICT_RE = /中外合作办学|中外合作|合作办学|中外联合培养|中外联合|中外合办/;
const CREDIT_STRICT_RE = /学分互认|国际本科学术互认|ISEC|SQA|中美学分互认/;
const JOINT_STRICT_RE = /联合培养|联合学士|双学士|双学位|本硕|本博|长学制/;
function groupHasCoop(g){ return COOP_STRICT_RE.test(textOfGroupForAttr(g)); }
function groupHasCredit(g){ return CREDIT_STRICT_RE.test(textOfGroupForAttr(g)); }
function groupHasJoint(g){ return JOINT_STRICT_RE.test(textOfGroupForAttr(g)); }
function groupHasSpecialPath(g){ return groupHasCoop(g) || groupHasCredit(g) || groupHasJoint(g); }
function groupMatchesSpecialPath(g){
  const v=state.specialPathFilter || '';
  if(!v) return true;
  if(v==='only') return groupHasSpecialPath(g);
  if(v==='exclude') return !groupHasSpecialPath(g);
  if(v==='coop') return groupHasCoop(g);
  if(v==='credit') return groupHasCredit(g);
  if(v==='joint') return groupHasJoint(g);
  return true;
}

/* 新增院校：严格名称名单。不要用 25计划/分数为空推断，避免浙江大学、天津大学等旧校误伤。 */
const RENAMED_SCHOOL_MAP = {'淮阴大学':'淮阴工学院'};
const EXPLICIT_NEW_SCHOOL_NAMES = new Set([
  '常州信息职业技术大学','江苏建筑职业技术大学','山西工程科技职业大学','成都航空职业技术大学','成都轻工职业技术大学','新疆交通职业技术大学','新疆工业职业技术大学','新疆理工职业大学','新疆天山职业技术大学','辽宁理工职业大学','兰州资源环境职业技术大学'
]);
function canonicalSchoolName(name){const n=String(name||'').trim(); return RENAMED_SCHOOL_MAP[n] || n;}
function isNewSchool(s){
  const name=String(s?.name||'').trim();
  if(!name) return false;
  if(RENAMED_SCHOOL_MAP[name]) return false;
  return EXPLICIT_NEW_SCHOOL_NAMES.has(name);
}
const EXACT_TOP_985 = new Set([
  '北京大学','清华大学','中国人民大学','北京航空航天大学','北京理工大学','中国农业大学','北京师范大学','中央民族大学','南开大学','天津大学','大连理工大学','东北大学','吉林大学','哈尔滨工业大学','复旦大学','同济大学','上海交通大学','华东师范大学','南京大学','东南大学','浙江大学','中国科学技术大学','厦门大学','山东大学','中国海洋大学','武汉大学','华中科技大学','湖南大学','中南大学','中山大学','华南理工大学','四川大学','重庆大学','电子科技大学','西安交通大学','西北工业大学','西北农林科技大学','兰州大学','国防科技大学','浙江大学医学院','复旦大学医学院','上海交通大学医学院'
]);
function schoolTierRank(s){
  if(isNewSchool(s)) return 99;
  const level=String(s.level||'');
  const name=String(s.name||'').trim();
  // 民办/独立学院优先拦截，避免“杭州电子科技大学信息工程学院”被“电子科技大学”误识别为985。
  if(/民办|独立学院/.test(level) || (/学院$/.test(name) && /信息工程学院|科技学院|城市学院|工商学院|职业学院/.test(name))) return 70;
  if(EXACT_TOP_985.has(name) || /985/.test(level)) return 10;
  if(/211|双一流|一流/.test(level)) return 20;
  if(/保研/.test(level)) return 30;
  if(/公办|省重点|普通公办/.test(level)) return 40;
  return 50;
}
function schoolTierLabel(s){
  if(isNewSchool(s)) return '新增/更名';
  const level=String(s.level||'');
  const r=schoolTierRank(s);
  if(r>=70) return '民办/独立';
  if(r<=10) return '985/顶尖';
  if(r<=20) return '211/双一流';
  if(r<=30) return '保研/强校';
  if(r<=40) return '普通公办';
  return level || '其他';
}
function selectedProvinceText(){
  const arr=state.provinces||[];
  if(!arr.length) return '全部省份';
  if(arr.length<=3) return arr.join('、');
  return `已选${arr.length}省`;
}
function setProvinceSelection(list){
  state.provinces=[...new Set((list||[]).filter(Boolean))];
  state.province='';
  const btn=$('provinceMultiBtn'); if(btn) btn.textContent=selectedProvinceText();
  document.querySelectorAll('#provinceGrid input[type="checkbox"]').forEach(cb=>{cb.checked=state.provinces.includes(cb.value);});
  state.selected=null; render();
}
function renderProvincePanel(provinces){
  const grid=$('provinceGrid');
  if(!grid) return;
  const source=(provinces&&provinces.length)?provinces:ALL_PROVINCES_STATIC; const blocks=(typeof provinceRegionBlocks==='function') ? provinceRegionBlocks(source) : [{name:'全部省份',provinces:source||[]}];
  grid.innerHTML=blocks.map(block=>`
    <div class="region-block">
      <div class="region-name">${esc(block.name)}</div>
      <div class="region-provinces">
        ${block.provinces.map(p=>`<label class="province-check"><input type="checkbox" value="${esc(p)}"> <span>${esc(p)}</span></label>`).join('')}
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('input').forEach(cb=>{
    cb.checked=(state.provinces||[]).includes(cb.value);
    cb.addEventListener('change',()=>{
      const vals=[...grid.querySelectorAll('input:checked')].map(x=>x.value);
      setProvinceSelection(vals);
    });
  });
}
const ALL_PROVINCES_STATIC = ["上海", "云南", "内蒙古", "北京", "吉林", "四川", "天津", "宁夏", "安徽", "山东", "山西", "广东", "广西", "新疆", "江苏", "江西", "河北", "河南", "浙江", "海南", "湖北", "湖南", "甘肃", "福建", "西藏", "贵州", "辽宁", "重庆", "陕西", "青海", "香港", "黑龙江"];
const ALL_LEVELS_STATIC = ["985", "211", "一流", "保研", "合办保研", "民办保研", "公办", "合办", "港校", "民办"];
function provinceRegionSorted(provinces){
  const set=new Set(provinces||[]);
  const out=[];
  PROVINCE_REGION_ORDER.forEach(region=>{
    region.provinces.forEach(p=>{ if(set.has(p)) out.push(p); });
  });
  const used=new Set(out);
  (provinces||[]).forEach(p=>{ if(!used.has(p)) out.push(p); });
  return out;
}
function provinceRegionBlocks(provinces){
  const set=new Set(provinces||[]);
  const blocks=[];
  PROVINCE_REGION_ORDER.forEach(region=>{
    const arr=region.provinces.filter(p=>set.has(p));
    if(arr.length) blocks.push({name:region.name, provinces:arr});
  });
  const used=new Set(blocks.flatMap(b=>b.provinces));
  const extra=(provinces||[]).filter(p=>!used.has(p));
  if(extra.length) blocks.push({name:'其他地区', provinces:extra});
  return blocks;
}
function selectedLevelText(){
  const arr=state.levels||[];
  if(!arr.length) return '全部层次';
  if(arr.length<=3) return arr.join('、');
  return `已选${arr.length}类`;
}
function setLevelSelection(list){
  state.levels=[...new Set((list||[]).filter(Boolean))];
  state.level='';
  const btn=$('levelMultiBtn');
  if(btn) btn.textContent=selectedLevelText();
  document.querySelectorAll('#levelGrid input[type="checkbox"]').forEach(cb=>{cb.checked=state.levels.includes(cb.value);});
  state.selected=null;
  render();
}
function levelPriority(x){
  const s=String(x||'');
  if(/985/.test(s)) return 1;
  if(/211/.test(s)) return 2;
  if(/双一流|一流/.test(s)) return 3;
  if(/保研/.test(s)) return 4;
  if(/公办|省重点|普通公办/.test(s)) return 5;
  if(/民办|独立学院/.test(s)) return 9;
  return 7;
}
function levelSorted(levels){
  return [...(levels||[])].sort((a,b)=>{
    const d=levelPriority(a)-levelPriority(b);
    if(d!==0) return d;
    return String(a).localeCompare(String(b),'zh-CN');
  });
}
function renderLevelPanel(levels){
  const grid=$('levelGrid');
  if(!grid) return;
  const source=(levels&&levels.length)?levels:ALL_LEVELS_STATIC; const arr=(typeof levelSorted==='function') ? levelSorted(source||[]) : [...(source||[])];
  grid.innerHTML=arr.map(x=>`<label class="level-check"><input type="checkbox" value="${esc(x)}"> <span>${esc(x)}</span></label>`).join('');
  grid.querySelectorAll('input').forEach(cb=>{
    cb.checked=(state.levels||[]).includes(cb.value);
    cb.addEventListener('change',()=>{
      const vals=[...grid.querySelectorAll('input:checked')].map(x=>x.value);
      setLevelSelection(vals);
    });
  });
}
function levelMatchesSchool(s){
  const arr=state.levels||[];
  if(!arr.length) return true;
  return arr.includes(s.level);
}


function isNewGroupStrict(g){
  // 新增专业组：优先采用数据库自带 isNewGroup；避免仅因 25 分/计划缺失误判旧校旧组。
  if(g && g.isNewGroup===true) return true;
  const hasSource = Array.isArray(g?.sourceContext) && g.sourceContext.length>0;
  const p25 = Number(g?.plan25||0);
  const p26 = Number(g?.plan26||0);
  // 更保守的兜底：没有来源组、25计划为0、26计划大于0，且组内绝大多数专业标记为疑似新增。
  const majors = g?.majors || [];
  const newMajors = majors.filter(m=>String(m.status||'').includes('新增')).length;
  if(!hasSource && p25<=0 && p26>0 && majors.length>0 && newMajors/majors.length>=0.8) return true;
  return false;
}
function schoolHasNewGroup(s){
  return (s.groups||[]).some(isNewGroupStrict);
}


function isTrueNewGroup(g){
  if(!isNewGroupStrict(g)) return false;
  const hasSource = Array.isArray(g?.sourceContext) && g.sourceContext.length>0;
  const p25 = Number(g?.plan25||0);
  return !hasSource && p25<=0;
}
function isReorgGroup(g){
  if(!g) return false;
  if(isTrueNewGroup(g)) return false;
  const hasSource = Array.isArray(g?.sourceContext) && g.sourceContext.length>0;
  const changed = Number(g?.newCount||0)>0 || Number(g?.stopCount||0)>0 || Number(g?.crossCount||0)>0 || Number(g?.movedOutCount||0)>0 || /重组|改名|拆分|合并|跨组|来源/.test(String(g?.riskTip||'')+' '+String(g?.title||''));
  return hasSource && changed;
}
function schoolHasTrueNewGroup(s){return (s.groups||[]).some(isTrueNewGroup);}
function schoolHasReorgGroup(s){return (s.groups||[]).some(isReorgGroup);}


function majorClassOfMajor(m){ return String(m?.majorClass || '').trim(); }
function groupHasMajorClass(g, cls){
  const c=String(cls||'').trim();
  if(!c) return true;
  return (g?.majors||[]).some(m=>majorClassOfMajor(m)===c);
}
function majorClassSorted(list){
  return [...new Set((list||[]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
}
function allMajorClasses(){
  const vals=[];
  (DB.schools||[]).forEach(s=>(s.groups||[]).forEach(g=>(g.majors||[]).forEach(m=>{
    const c=majorClassOfMajor(m); if(c) vals.push(c);
  })));
  return majorClassSorted(vals);
}

function schoolMatches(s){
  if(state.batch && s.batch!==state.batch) return false;
  if(state.subject && s.subject!==state.subject) return false;
  if(state.provinces && state.provinces.length && !state.provinces.includes(s.province)) return false;
  if(!levelMatchesSchool(s)) return false;
  let groups = s.groups.filter(groupMatchesBase);
  if(state.newSchoolFilter==='only' && !isNewSchool(s)) return false;
  if(state.newSchoolFilter==='newGroup' && !schoolHasNewGroup(s)) return false;
  if(state.newSchoolFilter==='trueNewGroup' && !schoolHasTrueNewGroup(s)) return false;
  if(state.newSchoolFilter==='reorgGroup' && !schoolHasReorgGroup(s)) return false;
  if(state.newSchoolFilter==='hide' && isNewSchool(s)) return false;
  if((scoreActive() || state.majorClass || state.groupType || state.specialPathFilter || state.risk || state.onlyNew || state.onlyStop || state.onlyCross || state.onlyHigh || state.q) && groups.length===0) return false;
  if(state.risk && !groups.some(g=>groupAssessment(g).kind===state.risk)) return false;
  if(state.onlyNew && !groups.some(g=>g.newCount>0)) return false;
  if(state.onlyStop && !groups.some(g=>g.stopCount>0 || g.legacyOnly)) return false;
  if(state.onlyCross && !groups.some(g=>g.crossCount>0 || g.movedOutCount>0)) return false;
  if(state.onlyHigh && !groups.some(g=>groupAssessment(g).kind==='red')) return false;
  if(state.q){
    const q=state.q.toLowerCase();
    const text=(s.name+' '+s.province+' '+s.level+' '+s.subject+' '+s.batch).toLowerCase();
    const hitSchool=text.includes(q);
    const hitGroup=s.groups.some(g=>(g.groupCode+' '+g.title+' '+g.elective).toLowerCase().includes(q));
    const hitMajor=s.groups.some(g=>g.majors.some(m=>(m.name+' '+(m.majorClass||'')+' '+(m.labels||[]).join(' ')).toLowerCase().includes(q)) || g.legacy.some(m=>m.name.toLowerCase().includes(q)));
    if(!hitSchool && !hitGroup && !hitMajor) return false;
  }
  return true;
}
function groupMatchesBase(g){
  if(scoreActive()){
    const v=scoreForFilter(g);
    if(!Number.isFinite(v) || v<=0) return false;
    if(v<scoreLow() || v>scoreHigh()) return false;
  }
  if(state.risk && groupAssessment(g).kind!==state.risk) return false;
  if(state.newSchoolFilter==='newGroup' && !isNewGroupStrict(g)) return false;
  if(state.newSchoolFilter==='trueNewGroup' && !isTrueNewGroup(g)) return false;
  if(state.newSchoolFilter==='reorgGroup' && !isReorgGroup(g)) return false;
  if(state.groupType && !(g.typeTags||[]).includes(state.groupType)) return false;
  if(state.majorClass && !groupHasMajorClass(g,state.majorClass)) return false;
  if(!groupMatchesSpecialPath(g)) return false;
  if(state.onlyNew && g.newCount<=0) return false;
  if(state.onlyStop && !(g.stopCount>0 || g.legacyOnly)) return false;
  if(state.onlyCross && !(g.crossCount>0 || g.movedOutCount>0)) return false;
  if(state.onlyHigh && groupAssessment(g).kind!=='red') return false;
  if(state.q){
    const q=state.q.toLowerCase();
    const hit=(g.school+' '+g.groupCode+' '+g.title+' '+g.elective+' '+g.riskTip).toLowerCase().includes(q) || g.majors.some(m=>(m.name+' '+(m.majorClass||'')+' '+(m.labels||[]).filter(t=>!['疑似新增','跨组调入'].includes(t)).join(' ')).toLowerCase().includes(q)) || g.legacy.some(m=>m.name.toLowerCase().includes(q));
    if(!hit) return false;
  }
  return true;
}
function visibleGroupsForSort(s){
  const groups=s.groups.filter(groupMatchesBase);
  return groups.length ? groups : s.groups;
}
function groupWeightForSchoolSort(g){
  const w = Number(g.plan26);
  return Number.isFinite(w) && w>0 ? w : 1;
}
function schoolSortScore(s){
  const groups=visibleGroupsForSort(s);
  let totalScore=0, totalWeight=0;
  groups.forEach(g=>{
    const v=scoreForFilter(g);
    if(Number.isFinite(v)&&v>0){
      const w=groupWeightForSchoolSort(g);
      totalScore += v*w;
      totalWeight += w;
    }
  });
  return totalWeight>0 ? totalScore/totalWeight : -Infinity;
}
function schoolScoreLabel(s){
  const v=schoolSortScore(s);
  return Number.isFinite(v) ? fmt(Math.round(v*10)/10) : '—';
}
function filteredSchools(){
  return DB.schools.filter(schoolMatches).sort((a,b)=>{
    if(state.q){
      const q=state.q.toLowerCase();
      const aExact=a.name.toLowerCase()===q ? 2 : (a.name.toLowerCase().includes(q) ? 1 : 0);
      const bExact=b.name.toLowerCase()===q ? 2 : (b.name.toLowerCase().includes(q) ? 1 : 0);
      if(aExact!==bExact) return bExact-aExact;
    }
    if(state.newSchoolFilter==='normal'){
      const an=isNewSchool(a), bn=isNewSchool(b);
      if(an!==bn) return an ? 1 : -1;
    }
    if(state.newSchoolFilter!=='only' && state.newSchoolFilter!=='all'){
      const tierDiff=schoolTierRank(a)-schoolTierRank(b);
      if(tierDiff!==0) return tierDiff;
    }
    if(state.newSchoolFilter==='normal'){
      const tierDiff=schoolTierRank(a)-schoolTierRank(b);
      if(tierDiff!==0) return tierDiff;
    }
    const scoreDiff=schoolSortScore(b)-schoolSortScore(a);
    if(Number.isFinite(scoreDiff) && Math.abs(scoreDiff)>1e-9) return scoreDiff;
    return a.name.localeCompare(b.name,'zh-CN');
  });
}

function bindStaticMultiPanels(){
  const pg=$('provinceGrid');
  if(pg && !pg.dataset.bound){
    pg.dataset.bound='1';
    pg.addEventListener('change',e=>{
      if(e.target && e.target.matches('input[type="checkbox"]')){
        const vals=[...pg.querySelectorAll('input:checked')].map(x=>x.value);
        setProvinceSelection(vals);
      }
    });
  }
  const lg=$('levelGrid');
  if(lg && !lg.dataset.bound){
    lg.dataset.bound='1';
    lg.addEventListener('change',e=>{
      if(e.target && e.target.matches('input[type="checkbox"]')){
        const vals=[...lg.querySelectorAll('input:checked')].map(x=>x.value);
        setLevelSelection(vals);
      }
    });
  }
}

function initOptions(){
  const majorClasses=allMajorClasses();
  if($('majorClassFilter')) $('majorClassFilter').innerHTML='<option value="">全部专业大类</option>'+majorClasses.map(x=>`<option>${esc(x)}</option>`).join('');
  const provinces=provinceRegionSorted(([...new Set(DB.schools.map(s=>s.province).filter(Boolean))]).length ? [...new Set(DB.schools.map(s=>s.province).filter(Boolean))] : ALL_PROVINCES_STATIC);
  const levels=levelSorted(([...new Set(DB.schools.map(s=>s.level).filter(Boolean))]).length ? [...new Set(DB.schools.map(s=>s.level).filter(Boolean))] : ALL_LEVELS_STATIC);
  if($('provinceFilter')) $('provinceFilter').innerHTML='<option value="">全部省份</option>'+provinces.map(x=>`<option>${esc(x)}</option>`).join('');
  $('levelFilter').innerHTML='<option value="">全部层次</option>'+levels.map(x=>`<option>${esc(x)}</option>`).join('');
  renderProvincePanel(provinces);
  renderLevelPanel(levels);
  simpleBindNotes(); applyNoteAdminMode(); rcBindNotes(); bindStaticMultiPanels();
}
function renderList(){
  const arr=filteredSchools(); $('listCount').textContent=`（${arr.length}）`;
  function item(s){
    const ns=isNewSchool(s);
    const ng=schoolHasNewGroup(s);
    return `<button class="school-item ${ns?'new-school':''} ${state.selected===s.id?'active':''}" onclick="selectSchool('${esc(s.id)}')"><div class="school-name">${esc(s.name)}</div><div class="school-meta"><span>${esc(s.province)}</span><span>${esc(s.subject)}</span><span>${esc(s.batch.replace('本科',''))}</span><span class="badge-mini">组${s.summary.groups}</span>${ng?'<span class="badge-mini">含新增专业组</span>':''}</div></button>`;
  }
  if(!arr.length){
    $('schoolList').innerHTML='<div class="empty">没有匹配院校</div>';
  }else if(state.newSchoolFilter==='normal'){
    const normal=arr.filter(s=>!isNewSchool(s));
    const newer=arr.filter(isNewSchool);
    const newGroup=arr.filter(s=>!isNewSchool(s) && schoolHasNewGroup(s));
    $('schoolList').innerHTML =
      (normal.length?`<div class="school-section-title">正常院校（${normal.length}）</div>`+normal.slice(0,1200).map(item).join(''):'')+
      (newer.length?`<div class="school-section-title">新增院校｜已沉底（${newer.length}）</div>`+newer.slice(0,1200).map(item).join(''):'')+
      (newGroup.length?`<div class="school-section-title new-group-section">含新增专业组的院校（${newGroup.length}）</div>`:'');
  }else{
    const title=state.newSchoolFilter==='only'?'新增院校':(state.newSchoolFilter==='newGroup'?'新增专业组':(state.newSchoolFilter==='trueNewGroup'?'真新增专业组':(state.newSchoolFilter==='reorgGroup'?'重组/改名专业组':'院校')));
    $('schoolList').innerHTML=`<div class="school-section-title">${title}（${arr.length}）</div>`+arr.slice(0,1200).map(item).join('');
  }
  if(!state.selected || !arr.some(s=>s.id===state.selected)) state.selected = arr[0]?.id || null;
}
function renderHome(){
  const st=DB.stats;
  $('main').innerHTML = `<section class="home"><div class="h1">知识库说明</div><p class="note">当前版本为“专业详情弹窗版”：专业组总览页只展示必要的计划变化、分数、位次与专业列表；新增院校采用严格学校名称名单识别，避免把浙江大学、天津大学等旧院校误判为新增；省份支持按大区多选，院校层次支持多选；新增“教育部专业大类”筛选，可按计算机类、电子信息类、临床医学类等直接定位包含该大类的专业组；中外合作、学分互认、联合培养等统一归入“中外合作/学分互认”筛选入口，具体属性进入专业详情查看。</p>
  <div class="version-note"><b>当前版本：</b>V16.4 Supabase备注版｜新增教育部专业大类筛选｜公开只读<br><b>功能回归检查：</b><div class="feature-check"><span>省份多选</span><span>层次多选</span><span>严格中外合作筛选</span><span>专业组短标签</span><span>只标刺客专业</span><span>新增/重组专业组筛选</span><span>专业详情弹窗</span><span>25→26计划变化</span><span>缓存版本参数</span><span>三年均分均位</span><span>人工备注系统</span></div></div><div class="kpis"><div class="kpi"><b>${fmt(st.schoolsUnique)}</b><span>覆盖学校</span></div><div class="kpi"><b>${fmt(st.groups)}</b><span>2026在招专业组</span></div><div class="kpi"><b>${fmt(st.majors26)}</b><span>2026专业记录</span></div><div class="kpi"><b>${fmt(st.highRiskGroups)}</b><span>高风险组</span></div><div class="kpi"><b>总览极简</b><span>只看计划/分数</span></div><div class="kpi"><b>点击专业</b><span>查看312明细</span></div></div>
  <div class="path"><b>建议使用路径：</b>选批次 → 选科类 → 输入目标分与上下浮动 → 默认先看正常院校 → 新增院校在左侧沉底或通过“只看新增院校”单独查看 → 先看专业组卡片中的“25均分、位次、计划25→26” → 再点击具体专业查看该专业的培养属性、学科实力与历史录取数据。</div>
  <div class="path"><b>页面展示原则：</b>专业组筛选与学校页不再堆叠“班型/属性不一致”等长提醒；如果需要看中外合作、拔尖/卓越/院士班、实验/试验班、硕博点、第四轮评估、第五轮A、一流/101、软科专业排名等信息，点击专业行右侧“详情”。空字段不展示。</div>
  <div class="path"><b>颜色说明：</b><div class="legend-line"><span class="plan-pill plan-up-big">大幅扩招</span><span class="plan-pill plan-up">扩招</span><span class="plan-pill plan-down">缩招</span><span class="plan-pill plan-down-big">大幅缩招</span><span class="pill blue">分数/位次</span><span class="major-risk-tag warn">橙色：相对冷门/需核对</span><span class="major-risk-tag danger">红色：组内刺客/高风险错配</span></div></div>
  </section>`;
}
function selectSchool(id){state.selected=id; render(); window.scrollTo({top:0,behavior:'smooth'})}
function findSchool(id){return DB.schools.find(s=>s.id===id)}
function groupAttributeTags(g){
  /*
    专业组总览只显示短标签；详情仍进专业弹窗。
    中外合作标签采用严格识别，避免把普通中法/中德/中俄/卓越工程师等误标为中外合作。
  */
  const text=textOfGroupForAttr(g);
  const tags=[];
  const add=(label,kind)=>{ if(!tags.some(x=>x.label===label)) tags.push({label,kind}); };

  if(groupHasCoop(g)) add('中外合作','coop');
  if(groupHasCredit(g)) add('学分互认','credit');
  if(groupHasJoint(g)) add('联合/双学位','credit');

  if(isTrueNewGroup(g)) add('真新增专业组','newgroup');
  else if(isReorgGroup(g)) add('重组/改名','reorg');

  if(/院士班|筑梦院士|正跃院士/.test(text)) add('院士班','elite');
  if(/拔尖|拔尖创新|拔尖基地|强基/.test(text)) add('拔尖','elite');
  if(/卓越班|卓越计划|卓越工程师/.test(text)) add('卓越','elite');
  if(/实验班|试验班/.test(text)) add('实验/试验班','elite');
  if(/创新班|复合创新班|AI复合创新|新文科复合创新|航空管理复合创新|长空创新/.test(text)) add('创新班','elite');
  if(/基地班|国家拔尖基地/.test(text)) add('基地班','elite');
  if(/英才/.test(text)) add('英才班','elite');
  if(/钱伟长/.test(text)) add('钱伟长班','elite');
  if(/未来技术|未来学院/.test(text)) add('未来技术','elite');
  if(/书院/.test(text)) add('书院制','elite');
  if(/产教融合|产业学院/.test(text)) add('产教融合','elite');
  if(/本博/.test(text)) add('本博','elite');
  if(/本硕/.test(text)) add('本硕','elite');
  if(/高收费|较高收费|收费标准/.test(text)) add('高收费','warn');
  if(/只招英语|英语考生|外语语种/.test(text)) add('语种限制','warn');
  if(/校区|异地校区|分校区/.test(text)) add('校区','warn');
  if(/公费师范|乡村教师|定向师范/.test(text)) add('师范专项','warn');
  return tags;
}

function visibleSpecialTags(g){
  return groupAttributeTags(g);
}
function groupAttrTagHtml(g){
  const tags=groupAttributeTags(g);
  if(!tags.length) return '';
  return `<div class="group-attr-line">${tags.map(t=>`<span class="group-attr-tag ${esc(t.kind||'')}">${esc(t.label)}</span>`).join('')}</div>`;
}
function tileTagHtml(tags){
  return (tags||[]).slice(0,5).map(t=>`<span class="tile-tag ${esc(t.kind||'')}">${esc(t.label||t)}</span>`).join('');
}
function planDeltaClass(pc){
  if(!pc) return 'plan-unknown';
  const old=Number(pc.oldPlan), cur=Number(pc.plan26), d=Number(pc.delta);
  if(!Number.isFinite(old) || !Number.isFinite(cur)) return 'plan-unknown';
  if(old===0 && cur>0) return 'plan-up-big';
  const ratio = old>0 ? Math.abs(d)/old : 0;
  const big = Math.abs(d)>=10 || ratio>=0.30;
  if(d>0) return big ? 'plan-up-big' : 'plan-up';
  if(d<0) return big ? 'plan-down-big' : 'plan-down';
  return 'plan-flat';
}
function planDeltaLabel(pc){
  if(!pc) return '计划待核对';
  const old=Number(pc.oldPlan), cur=Number(pc.plan26), d=Number(pc.delta);
  if(old===0 && cur>0) return `25无对照→${fmt(cur)}（+${fmt(cur)}）`;
  return `${fmt(old)}→${fmt(cur)}（${d>0?`+${fmt(d)}`:fmt(d)}）`;
}
function planCompact(pc,g){
  if(!pc) return '';
  const cls=planDeltaClass(pc);
  const title=esc(pc.basis||'严格班型属性核对后的计划对照');
  return `<span class="plan-pill ${cls}" title="${title}">计划 ${planDeltaLabel(pc)}</span>`;
}
function majorPlanCell(m){
  const p25=safeNum(m.plan25), p26=safeNum(m.plan26), d=p26-p25;
  const pc={oldPlan:p25,plan26:p26,delta:d,basis:'专业行25/26计划对照'};
  return `<div class="plan-cell">${planCompact(pc,null)}</div>`;
}
function compactScore(g){
  const a=[];
  if(g.avgScore) a.push(`25均分 ${fmt(g.avgScore)}`);
  if(g.avgRank) a.push(`位次 ${fmt(g.avgRank)}`);
  if(g.majorCount) a.push(`专业 ${fmt(g.majorCount)}`);
  return a.map(x=>`<span>${x}</span>`).join('');
}

const ANNO_STORAGE_KEY = 'jiangsu_plan_annotations_v1';
let ANNO_EDIT_MODE = false;
let ANNO_CURRENT_TARGET = null;
let ANNOTATIONS = loadLocalAnnotations();

function blankAnnotations(){ return {schools:{},groups:{},majors:{}}; }
function normalizeAnnotations(x){
  const b=blankAnnotations();
  if(!x || typeof x!=='object') return b;
  b.schools = (x.schools && typeof x.schools==='object') ? x.schools : {};
  b.groups = (x.groups && typeof x.groups==='object') ? x.groups : {};
  b.majors = (x.majors && typeof x.majors==='object') ? x.majors : {};
  return b;
}
function mergeAnnotations(base, override){
  const b=normalizeAnnotations(base), o=normalizeAnnotations(override);
  return {
    schools:{...b.schools,...o.schools},
    groups:{...b.groups,...o.groups},
    majors:{...b.majors,...o.majors}
  };
}
function loadLocalAnnotations(){
  try{
    const raw=localStorage.getItem(ANNO_STORAGE_KEY);
    return raw ? normalizeAnnotations(JSON.parse(raw)) : blankAnnotations();
  }catch(e){ return blankAnnotations(); }
}
function saveLocalAnnotations(){
  try{
    localStorage.setItem(ANNO_STORAGE_KEY, JSON.stringify(normalizeAnnotations(ANNOTATIONS)));
    setAnnoStatus('备注已保存到本机');
  }catch(e){ setAnnoStatus('保存失败：浏览器本地存储不可用'); }
}
function setAnnoStatus(text){
  const el=$('annoStatus'); if(!el) return;
  el.textContent=text||'';
  if(text) setTimeout(()=>{ if(el.textContent===text) el.textContent=''; }, 2800);
}
async function loadRemoteAnnotations(){
  let local=loadLocalAnnotations();
  try{
    const r=await fetch('annotations.json?v='+(typeof CACHE_VERSION!=='undefined'?CACHE_VERSION:Date.now()), {cache:'no-store'});
    if(r.ok){
      const remote=normalizeAnnotations(await r.json());
      ANNOTATIONS=mergeAnnotations(remote, local);
      render();
      setAnnoStatus('已读取线上备注');
    }
  }catch(e){}
}
function annotationSchoolKey(s){ return [s?.name||'',s?.subject||'',s?.batch||''].join('|'); }
function annotationGroupKey(g){ return [g?.school||'',g?.subject||'',g?.batch||'',g?.groupCode||''].join('|'); }
function annotationMajorKey(m){ return (typeof majorDetailKey==='function') ? majorDetailKey(m) : [m?.subject||'',m?.batch||'',m?.school||'',m?.groupCode||'',String(m?.code||'').padStart(2,'0')].join('|'); }
function getAnnotation(scope,key){
  const store=normalizeAnnotations(ANNOTATIONS);
  return (store[scope] && store[scope][key]) ? store[scope][key] : null;
}
function cleanAnnotation(obj){
  const note=String(obj?.note||'').trim();
  const images=(Array.isArray(obj?.images)?obj.images:String(obj?.images||'').split(/\n+/))
    .map(x=>String(x||'').trim()).filter(Boolean);
  return {note,images};
}
function hasAnnotation(a){ return !!(a && (String(a.note||'').trim() || (a.images||[]).length)); }
function annotationBox(scope,key,title,small=false){ return ''; }
function jsArg(x){ return JSON.stringify(String(x??'')); }
function openAnnotationEditor(scope,key,title){
  ANNO_CURRENT_TARGET={scope,key};
  const a=cleanAnnotation(getAnnotation(scope,key)||{});
  $('annoModalTitle').textContent=title||'编辑备注';
  $('annoNoteInput').value=a.note||'';
  $('annoImagesInput').value=(a.images||[]).join('\n');
  $('annoModal').classList.add('open');
}
function closeAnnotationEditor(){ $('annoModal').classList.remove('open'); ANNO_CURRENT_TARGET=null; }
function saveAnnotationFromModal(){
  if(!ANNO_CURRENT_TARGET) return;
  const {scope,key}=ANNO_CURRENT_TARGET;
  const obj=cleanAnnotation({note:$('annoNoteInput').value, images:$('annoImagesInput').value});
  ANNOTATIONS=normalizeAnnotations(ANNOTATIONS);
  if(!ANNOTATIONS[scope]) ANNOTATIONS[scope]={};
  if(hasAnnotation(obj)) ANNOTATIONS[scope][key]=obj;
  else delete ANNOTATIONS[scope][key];
  saveLocalAnnotations();
  closeAnnotationEditor();
  render();
}
function deleteAnnotationFromModal(){
  if(!ANNO_CURRENT_TARGET) return;
  const {scope,key}=ANNO_CURRENT_TARGET;
  ANNOTATIONS=normalizeAnnotations(ANNOTATIONS);
  if(ANNOTATIONS[scope]) delete ANNOTATIONS[scope][key];
  saveLocalAnnotations();
  closeAnnotationEditor();
  render();
}
function exportAnnotations(){
  const blob=new Blob([JSON.stringify(normalizeAnnotations(ANNOTATIONS),null,2)],{type:'application/json;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='annotations.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importAnnotationsFile(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const incoming=normalizeAnnotations(JSON.parse(reader.result));
      ANNOTATIONS=mergeAnnotations(ANNOTATIONS,incoming);
      saveLocalAnnotations();
      render();
      setAnnoStatus('备注导入成功');
    }catch(e){ setAnnoStatus('备注文件格式错误'); }
  };
  reader.readAsText(file,'utf-8');
}
function clearLocalAnnotations(){
  if(!confirm('确定清除本机保存的备注吗？线上 annotations.json 不会被删除。')) return;
  try{localStorage.removeItem(ANNO_STORAGE_KEY);}catch(e){}
  ANNOTATIONS=blankAnnotations();
  render();
  setAnnoStatus('本机备注已清除');
}



function setAnnotationEditMode(on){
  ANNO_EDIT_MODE=!!on;
  document.body.classList.toggle('anno-edit-mode', ANNO_EDIT_MODE);
  const btn=$('annoToggleEdit');
  if(btn){
    btn.classList.toggle('active', ANNO_EDIT_MODE);
    btn.textContent=ANNO_EDIT_MODE?'退出编辑':'编辑备注';
  }
}

function toggleAnnotationEditMode(){
  setAnnotationEditMode(!ANNO_EDIT_MODE);
  // 备注框已常驻 DOM，一般不需要 render；这里保留轻量刷新，确保切换学校后状态一致。
  try{ render(); setAnnotationEditMode(ANNO_EDIT_MODE); }catch(e){}
}
function bindAnnotationControlsSafe(){
  const byId=(id)=>document.getElementById(id);
  const edit=byId('annoToggleEdit');
  if(edit && !edit.dataset.boundAnno){
    edit.dataset.boundAnno='1';
    edit.addEventListener('click',e=>{e.preventDefault(); toggleAnnotationEditMode();});
  }
  const exp=byId('annoExportBtn');
  if(exp && !exp.dataset.boundAnno){
    exp.dataset.boundAnno='1';
    exp.addEventListener('click',e=>{e.preventDefault(); exportAnnotations();});
  }
  const imp=byId('annoImportBtn');
  if(imp && !imp.dataset.boundAnno){
    imp.dataset.boundAnno='1';
    imp.addEventListener('click',e=>{e.preventDefault(); const f=byId('annoFileInput'); if(f) f.click();});
  }
  const file=byId('annoFileInput');
  if(file && !file.dataset.boundAnno){
    file.dataset.boundAnno='1';
    file.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0]; if(f) importAnnotationsFile(f); e.target.value='';});
  }
  const clear=byId('annoClearBtn');
  if(clear && !clear.dataset.boundAnno){
    clear.dataset.boundAnno='1';
    clear.addEventListener('click',e=>{e.preventDefault(); clearLocalAnnotations();});
  }
  const close=byId('annoModalClose');
  if(close && !close.dataset.boundAnno){
    close.dataset.boundAnno='1';
    close.addEventListener('click',e=>{e.preventDefault(); closeAnnotationEditor();});
  }
  const modal=byId('annoModal');
  if(modal && !modal.dataset.boundAnno){
    modal.dataset.boundAnno='1';
    modal.addEventListener('click',e=>{if(e.target && e.target.id==='annoModal') closeAnnotationEditor();});
  }
  const save=byId('annoSaveBtn');
  if(save && !save.dataset.boundAnno){
    save.dataset.boundAnno='1';
    save.addEventListener('click',e=>{e.preventDefault(); saveAnnotationFromModal();});
  }
  const del=byId('annoDeleteBtn');
  if(del && !del.dataset.boundAnno){
    del.dataset.boundAnno='1';
    del.addEventListener('click',e=>{e.preventDefault(); deleteAnnotationFromModal();});
  }
}


/* === V13.3 简单备注系统：一个按钮直接新建备注 === */
const SIMPLE_NOTE_KEY = 'jiangsu_plan_annotations_v1';
let SIMPLE_NOTE_CURRENT = null;

function simpleBlankNotes(){return {schools:{},groups:{},majors:{}};}
function simpleNormNotes(x){
  const b=simpleBlankNotes();
  if(!x||typeof x!=='object') return b;
  b.schools=(x.schools&&typeof x.schools==='object')?x.schools:{};
  b.groups=(x.groups&&typeof x.groups==='object')?x.groups:{};
  b.majors=(x.majors&&typeof x.majors==='object')?x.majors:{};
  return b;
}
function simpleLoadNotes(){
  try{return simpleNormNotes(JSON.parse(localStorage.getItem(SIMPLE_NOTE_KEY)||'{}'));}catch(e){return simpleBlankNotes();}
}
function simpleSaveNotes(x){
  localStorage.setItem(SIMPLE_NOTE_KEY, JSON.stringify(simpleNormNotes(x)));
  SIMPLE_NOTES=simpleNormNotes(x);
}
let SIMPLE_NOTES = simpleLoadNotes();

function simpleStatus(t){
  const el=document.getElementById('simpleNoteStatus');
  if(!el) return;
  el.textContent=t||'';
  if(t) setTimeout(()=>{if(el.textContent===t) el.textContent='';},2500);
}
function simpleCurrentSchoolKey(){
  try{
    const s=state && state.selected ? findSchool(state.selected) : null;
    if(s) return [s.name||'',s.subject||'',s.batch||''].join('|');
  }catch(e){}
  return '';
}
function simpleOpenNote(scope,key){
  scope=scope||'schools';
  key=key||simpleCurrentSchoolKey()||'';
  SIMPLE_NOTE_CURRENT={scope,key};
  const store=simpleNormNotes(SIMPLE_NOTES);
  const old=(store[scope]&&store[scope][key])?store[scope][key]:{note:'',images:[]};
  document.getElementById('simpleNoteScope').value=scope;
  document.getElementById('simpleNoteKey').value=key;
  document.getElementById('simpleNoteText').value=old.note||'';
  document.getElementById('simpleNoteImages').value=(old.images||[]).join('\n');
  document.getElementById('simpleNoteModal').classList.add('open');
}
function simpleCloseNote(){document.getElementById('simpleNoteModal').classList.remove('open');}
function simpleCleanObj(note,imgs){
  const images=String(imgs||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  return {note:String(note||'').trim(),images};
}
function simpleSaveCurrentNote(){
  const scope=document.getElementById('simpleNoteScope').value||'schools';
  const key=document.getElementById('simpleNoteKey').value.trim();
  if(!key){alert('请填写备注对象 KEY / 关键词');return;}
  const obj=simpleCleanObj(document.getElementById('simpleNoteText').value,document.getElementById('simpleNoteImages').value);
  const store=simpleNormNotes(SIMPLE_NOTES);
  if(!store[scope]) store[scope]={};
  if(obj.note||obj.images.length) store[scope][key]=obj;
  else delete store[scope][key];
  simpleSaveNotes(store);
  try{ANNOTATIONS=store;}catch(e){}
  simpleCloseNote();
  simpleStatus('备注已保存');
  try{render();}catch(e){}
}
function simpleDeleteCurrentNote(){
  const scope=document.getElementById('simpleNoteScope').value||'schools';
  const key=document.getElementById('simpleNoteKey').value.trim();
  if(!key) return;
  const store=simpleNormNotes(SIMPLE_NOTES);
  if(store[scope]) delete store[scope][key];
  simpleSaveNotes(store);
  try{ANNOTATIONS=store;}catch(e){}
  simpleCloseNote();
  simpleStatus('备注已删除');
  try{render();}catch(e){}
}
function simpleExportNotes(){
  const blob=new Blob([JSON.stringify(simpleNormNotes(SIMPLE_NOTES),null,2)],{type:'application/json;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='annotations.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function simpleImportNotes(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const incoming=simpleNormNotes(JSON.parse(r.result));
      const cur=simpleNormNotes(SIMPLE_NOTES);
      const merged={schools:{...cur.schools,...incoming.schools},groups:{...cur.groups,...incoming.groups},majors:{...cur.majors,...incoming.majors}};
      simpleSaveNotes(merged);
      try{ANNOTATIONS=merged;}catch(e){}
      simpleStatus('备注已导入');
      try{render();}catch(e){}
    }catch(e){alert('备注文件格式错误');}
  };
  r.readAsText(file,'utf-8');
}
function simpleClearNotes(){
  if(!confirm('确定清空本机备注吗？')) return;
  localStorage.removeItem(SIMPLE_NOTE_KEY);
  SIMPLE_NOTES=simpleBlankNotes();
  try{ANNOTATIONS=SIMPLE_NOTES;}catch(e){}
  simpleStatus('本机备注已清空');
  try{render();}catch(e){}
}
function simpleNoteHtml(scope,key){ return ''; }
function simpleBindNotes(){
  const by=id=>document.getElementById(id);
  if(by('simpleNewNoteBtn')) by('simpleNewNoteBtn').onclick=()=>simpleOpenNote('schools',simpleCurrentSchoolKey());
  if(by('simpleExportNoteBtn')) by('simpleExportNoteBtn').onclick=simpleExportNotes;
  if(by('simpleImportNoteBtn')) by('simpleImportNoteBtn').onclick=()=>by('simpleNoteFile').click();
  if(by('simpleNoteFile')) by('simpleNoteFile').onchange=e=>{const f=e.target.files&&e.target.files[0]; if(f) simpleImportNotes(f); e.target.value='';};
  if(by('simpleClearNoteBtn')) by('simpleClearNoteBtn').onclick=simpleClearNotes;
  if(by('simpleNoteClose')) by('simpleNoteClose').onclick=simpleCloseNote;
  if(by('simpleSaveNote')) by('simpleSaveNote').onclick=simpleSaveCurrentNote;
  if(by('simpleDeleteNote')) by('simpleDeleteNote').onclick=simpleDeleteCurrentNote;
  if(by('simpleNoteModal')) by('simpleNoteModal').onclick=e=>{if(e.target.id==='simpleNoteModal') simpleCloseNote();};
}
try{document.addEventListener('DOMContentLoaded',simpleBindNotes);}catch(e){}


/* === V14 右键文字备注系统 === */
const RC_NOTE_STORAGE_KEY = 'jiangsu_plan_annotations_v1';
let RC_NOTE_TARGET = null;
let RC_NOTES = rcLoadNotes();

function rcBlankNotes(){return {schools:{},groups:{},majors:{}};}
function rcNormalizeNotes(x){
  const b=rcBlankNotes();
  if(!x||typeof x!=='object') return b;
  for(const scope of ['schools','groups','majors']){
    const src=(x[scope]&&typeof x[scope]==='object')?x[scope]:{};
    b[scope]={};
    for(const [k,v] of Object.entries(src)){
      if(typeof v==='string') b[scope][k]={note:v};
      else if(v&&typeof v==='object') b[scope][k]={note:String(v.note||'')};
    }
  }
  return b;
}
function rcLoadNotes(){try{return rcNormalizeNotes(JSON.parse(localStorage.getItem(RC_NOTE_STORAGE_KEY)||'{}'));}catch(e){return rcBlankNotes();}}
function rcSaveNotes(){localStorage.setItem(RC_NOTE_STORAGE_KEY,JSON.stringify(rcNormalizeNotes(RC_NOTES)));try{ANNOTATIONS=RC_NOTES;}catch(e){}}
function rcStatus(t){const el=$('rcNoteStatus');if(!el)return;el.textContent=t||'';if(t)setTimeout(()=>{if(el.textContent===t)el.textContent='';},2600)}
function rcNoteObj(scope,key){const s=rcNormalizeNotes(RC_NOTES);return s[scope]&&s[scope][key]?s[scope][key]:null}
function rcNoteText(scope,key){const o=rcNoteObj(scope,key);return o?String(o.note||'').trim():''}
function rcHasNote(scope,key){return !!rcNoteText(scope,key)}
function rcAttr(scope,key,title){return `data-note-scope="${esc(scope)}" data-note-key="${esc(key)}" data-note-title="${esc(title||'')}"`}
function rcBadge(scope,key){return rcHasNote(scope,key)?'<span class="note-badge">备注</span>':''}
function rcDetailNote(scope,key,label){const txt=rcNoteText(scope,key);return txt?`<div class="rc-detail-note"><b>${esc(label||'人工备注')}：</b>${esc(txt)}</div>`:''}
function rcOpenNote(scope,key,title){
  RC_NOTE_TARGET={scope,key,title};
  $('rcNoteTitle').textContent=title?`备注｜${title}`:'编辑备注';
  $('rcNoteSub').textContent=`层级：${scope==='schools'?'学校':scope==='groups'?'专业组':'专业'}｜对象已由右键位置自动绑定`;
  $('rcNoteText').value=rcNoteText(scope,key)||'';
  $('rcNoteModal').classList.add('open');
  setTimeout(()=>$('rcNoteText').focus(),30);
}
function rcCloseNote(){$('rcNoteModal').classList.remove('open');RC_NOTE_TARGET=null}
function rcSaveNote(){
  if(!RC_NOTE_TARGET)return;
  const {scope,key}=RC_NOTE_TARGET;
  const txt=String($('rcNoteText').value||'').trim();
  RC_NOTES=rcNormalizeNotes(RC_NOTES);
  if(!RC_NOTES[scope])RC_NOTES[scope]={};
  if(txt)RC_NOTES[scope][key]={note:txt}; else delete RC_NOTES[scope][key];
  rcSaveNotes();rcCloseNote();rcStatus('备注已保存');render();if(rcShouldAutoSyncGithub()) rcPushNotesToGithub(false);
}
function rcDeleteNote(){
  if(!RC_NOTE_TARGET)return;
  const {scope,key}=RC_NOTE_TARGET;
  RC_NOTES=rcNormalizeNotes(RC_NOTES);
  if(RC_NOTES[scope])delete RC_NOTES[scope][key];
  rcSaveNotes();rcCloseNote();rcStatus('备注已删除');render();if(rcShouldAutoSyncGithub()) rcPushNotesToGithub(false);
}
function rcExportNotes(){
  const blob=new Blob([JSON.stringify(rcNormalizeNotes(RC_NOTES),null,2)],{type:'application/json;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='annotations.json';a.click();URL.revokeObjectURL(a.href);
}
function rcImportNotes(file){
  const r=new FileReader();
  r.onload=()=>{try{
    const incoming=rcNormalizeNotes(JSON.parse(r.result)),cur=rcNormalizeNotes(RC_NOTES);
    RC_NOTES={schools:{...cur.schools,...incoming.schools},groups:{...cur.groups,...incoming.groups},majors:{...cur.majors,...incoming.majors}};
    rcSaveNotes();rcStatus('备注已导入');render();
  }catch(e){alert('备注文件格式错误')}};
  r.readAsText(file,'utf-8');
}
function rcClearNotes(){
  if(!confirm('确定清空本机备注吗？线上 annotations.json 不会被删除。'))return;
  localStorage.removeItem(RC_NOTE_STORAGE_KEY);RC_NOTES=rcBlankNotes();try{ANNOTATIONS=RC_NOTES;}catch(e){};rcStatus('本机备注已清空');render();
}
async function rcLoadRemoteNotes(){
  try{
    const r=await fetch('annotations.json?v='+(typeof CACHE_VERSION!=='undefined'?CACHE_VERSION:Date.now()),{cache:'no-store'});
    if(r.ok){
      const remote=rcNormalizeNotes(await r.json()),local=rcNormalizeNotes(RC_NOTES);
      RC_NOTES={schools:{...remote.schools,...local.schools},groups:{...remote.groups,...local.groups},majors:{...remote.majors,...local.majors}};
      rcSaveNotes();rcStatus('已读取线上备注');render();
    }
  }catch(e){}
}




function isNoteAdminMode(){
  try{
    const p=new URLSearchParams(location.search);
    const path=location.pathname.toLowerCase();
    return document.body.classList.contains('admin-page') || p.get('admin')==='1' || location.hash==='#admin' || path.endsWith('/admin.html') || path.endsWith('admin.html');
  }catch(e){return false;}
}
function applyNoteAdminMode(){
  const on=isNoteAdminMode();
  document.body.classList.toggle('note-admin-mode', on);
  try{ rcSetToolbarCollapsed(true); }catch(e){}
  return on;
}

function rcToggleToolbar(){
  const bar=$('rcNoteToolbar');
  const btn=$('rcToggleToolbarBtn');
  if(!bar) return;
  const collapsed=!bar.classList.contains('collapsed');
  bar.classList.toggle('collapsed', collapsed);
  if(btn){
    btn.textContent='管理员备注';
    btn.title=collapsed?'展开备注工具':'收起备注工具';
  }
}
function rcSetToolbarCollapsed(collapsed=true){
  const bar=$('rcNoteToolbar');
  const btn=$('rcToggleToolbarBtn');
  if(!bar) return;
  bar.classList.toggle('collapsed', !!collapsed);
  if(btn){
    btn.textContent='管理员备注';
    btn.title=collapsed?'展开备注工具':'收起备注工具';
  }
}


/* === V15 GitHub 在线保存 annotations.json === */
const RC_GH_SESSION_TOKEN_KEY='jiangsu_plan_github_token_session';
const RC_GH_CONFIG_KEY='jiangsu_plan_github_sync_config_v1';
function rcDefaultGhConfig(){
  return {owner:'ycxukun',repo:'jiangsu-plan',branch:'main',autoSync:true};
}
function rcLoadGhConfig(){
  let cfg=rcDefaultGhConfig();
  try{cfg={...cfg,...JSON.parse(localStorage.getItem(RC_GH_CONFIG_KEY)||'{}')};}catch(e){}
  cfg.token=sessionStorage.getItem(RC_GH_SESSION_TOKEN_KEY)||'';
  return cfg;
}
function rcSaveGhConfigFromForm(){
  const cfg={
    owner:String($('rcGhOwner').value||'ycxukun').trim(),
    repo:String($('rcGhRepo').value||'jiangsu-plan').trim(),
    branch:String($('rcGhBranch').value||'main').trim(),
    autoSync:!!$('rcGhAutoSync').checked
  };
  const token=String($('rcGhToken').value||'').trim();
  localStorage.setItem(RC_GH_CONFIG_KEY,JSON.stringify(cfg));
  if(token) sessionStorage.setItem(RC_GH_SESSION_TOKEN_KEY,token);
  rcStatus('GitHub连接设置已保存');
  rcCloseGhSettings();
}
function rcFillGhForm(){
  const cfg=rcLoadGhConfig();
  if($('rcGhOwner')) $('rcGhOwner').value=cfg.owner||'ycxukun';
  if($('rcGhRepo')) $('rcGhRepo').value=cfg.repo||'jiangsu-plan';
  if($('rcGhBranch')) $('rcGhBranch').value=cfg.branch||'main';
  if($('rcGhToken')) $('rcGhToken').value=cfg.token||'';
  if($('rcGhAutoSync')) $('rcGhAutoSync').checked=cfg.autoSync!==false;
}
function rcOpenGhSettings(){
  if(!isNoteAdminMode()){alert('请用 ?admin=1 管理员模式打开。');return;}
  rcFillGhForm();
  $('rcGhModal').classList.add('open');
}
function rcCloseGhSettings(){
  if($('rcGhModal')) $('rcGhModal').classList.remove('open');
}
function rcUtf8ToBase64(str){
  const bytes=new TextEncoder().encode(str);
  let bin='';
  bytes.forEach(b=>bin+=String.fromCharCode(b));
  return btoa(bin);
}
function rcBase64ToUtf8(b64){
  const bin=atob(String(b64||'').replace(/\s/g,''));
  const bytes=new Uint8Array([...bin].map(ch=>ch.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
}
async function rcGithubFetch(path, options={}){
  const cfg=rcLoadGhConfig();
  if(!cfg.token) throw new Error('没有 GitHub Token。请先点“连接GitHub”。');
  const url=`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}${path}`;
  const headers={
    'Accept':'application/vnd.github+json',
    'Authorization':'Bearer '+cfg.token,
    'X-GitHub-Api-Version':'2022-11-28',
    ...(options.headers||{})
  };
  const res=await fetch(url,{...options,headers});
  if(!res.ok){
    let msg='';
    try{msg=(await res.json()).message||'';}catch(e){msg=await res.text();}
    throw new Error(`GitHub请求失败 ${res.status}：${msg}`);
  }
  return res.json();
}
async function rcGetGithubAnnotationsFile(){
  const cfg=rcLoadGhConfig();
  try{
    return await rcGithubFetch(`/contents/annotations.json?ref=${encodeURIComponent(cfg.branch)}`,{method:'GET'});
  }catch(e){
    if(String(e.message||'').includes('404')) return null;
    throw e;
  }
}
async function rcPushNotesToGithub(manual=false){
  if(!isNoteAdminMode()) return;
  const cfg=rcLoadGhConfig();
  if(!cfg.token){
    if(manual) alert('请先点“连接GitHub”，填入 GitHub Token。');
    return;
  }
  rcStatus('正在同步到 GitHub...');
  const normalized=rcNormalizeNotes(RC_NOTES);
  const content=JSON.stringify(normalized,null,2);
  let sha=null;
  try{
    const old=await rcGetGithubAnnotationsFile();
    if(old && old.sha) sha=old.sha;
  }catch(e){
    rcStatus('读取线上备注失败');
    if(manual) alert(e.message||e);
    return;
  }
  try{
    await rcGithubFetch('/contents/annotations.json',{
      method:'PUT',
      body:JSON.stringify({
        message:'update annotations',
        content:rcUtf8ToBase64(content),
        branch:cfg.branch,
        ...(sha?{sha}:{})
      })
    });
    rcStatus('已同步到线上 annotations.json');
  }catch(e){
    rcStatus('同步失败');
    if(manual) alert(e.message||e);
  }
}
async function rcPullNotesFromGithub(){
  if(!isNoteAdminMode()) return;
  const cfg=rcLoadGhConfig();
  if(!cfg.token){alert('请先点“连接GitHub”，填入 GitHub Token。');return;}
  rcStatus('正在读取线上备注...');
  try{
    const f=await rcGetGithubAnnotationsFile();
    if(!f || !f.content){rcStatus('线上暂无 annotations.json');return;}
    const incoming=rcNormalizeNotes(JSON.parse(rcBase64ToUtf8(f.content)));
    const local=rcNormalizeNotes(RC_NOTES);
    RC_NOTES={
      schools:{...incoming.schools,...local.schools},
      groups:{...incoming.groups,...local.groups},
      majors:{...incoming.majors,...local.majors}
    };
    rcSaveNotes();
    rcStatus('已读取并合并线上备注');
    render();
  }catch(e){
    rcStatus('读取失败');
    alert(e.message||e);
  }
}
function rcShouldAutoSyncGithub(){
  const cfg=rcLoadGhConfig();
  return isNoteAdminMode() && cfg.autoSync!==false && !!cfg.token;
}


function rcCurrentSchoolNoteTarget(){
  try{
    const s=state && state.selected ? findSchool(state.selected) : null;
    if(s){
      return {
        scope:'schools',
        key:annotationSchoolKey(s),
        title:(s.name||'')+'｜'+(s.subject||'')+'｜'+(s.batch||'')
      };
    }
  }catch(e){}
  return null;
}
function rcOpenCurrentSchoolNote(){
  if(!isNoteAdminMode()){
    alert('请用 ?admin=1 管理员模式打开。');
    return;
  }
  const t=rcCurrentSchoolNoteTarget();
  if(!t){
    alert('请先在左侧选择一个学校，再新增备注。专业组/专业备注建议直接右键对应卡片或专业行。');
    return;
  }
  rcOpenNote(t.scope,t.key,t.title);
}

function rcBindNotes(){
  if($('rcNewCurrentSchoolNoteBtn')) $('rcNewCurrentSchoolNoteBtn').onclick=rcOpenCurrentSchoolNote;
  if($('sbLoginBtn')) $('sbLoginBtn').onclick=sbOpenLogin;
  if($('sbRefreshBtn')) $('sbRefreshBtn').onclick=()=>sbLoadNotesFromDatabase(true);
  if($('sbLogoutBtn')) $('sbLogoutBtn').onclick=sbLogout;
  if($('sbLoginCloseBtn')) $('sbLoginCloseBtn').onclick=sbCloseLogin;
  if($('sbDoLoginBtn')) $('sbDoLoginBtn').onclick=sbLogin;
  if($('sbLoginModal')) $('sbLoginModal').onclick=e=>{if(e.target.id==='sbLoginModal') sbCloseLogin();};

  if($('rcNewCurrentSchoolNoteBtn')) $('rcNewCurrentSchoolNoteBtn').onclick=rcOpenCurrentSchoolNote;

  if($('rcGithubSettingsBtn')) $('rcGithubSettingsBtn').onclick=rcOpenGhSettings;
  if($('rcPushGithubBtn')) $('rcPushGithubBtn').onclick=()=>rcPushNotesToGithub(true);
  if($('rcGhCloseBtn')) $('rcGhCloseBtn').onclick=rcCloseGhSettings;
  if($('rcGhSaveBtn')) $('rcGhSaveBtn').onclick=rcSaveGhConfigFromForm;
  if($('rcPullGithubBtn')) $('rcPullGithubBtn').onclick=rcPullNotesFromGithub;
  if($('rcGhModal')) $('rcGhModal').onclick=e=>{if(e.target.id==='rcGhModal') rcCloseGhSettings();};

  if($('rcToggleToolbarBtn')) $('rcToggleToolbarBtn').onclick=rcToggleToolbar;
  rcSetToolbarCollapsed(true);
  if($('rcExportNoteBtn'))$('rcExportNoteBtn').onclick=rcExportNotes;
  if($('rcImportNoteBtn'))$('rcImportNoteBtn').onclick=()=>$('rcNoteFile').click();
  if($('rcNoteFile'))$('rcNoteFile').onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)rcImportNotes(f);e.target.value=''};
  if($('rcClearNoteBtn'))$('rcClearNoteBtn').onclick=rcClearNotes;
  if($('rcNoteClose'))$('rcNoteClose').onclick=rcCloseNote;
  if($('rcSaveNoteBtn'))$('rcSaveNoteBtn').onclick=rcSaveNote;
  if($('rcDeleteNoteBtn'))$('rcDeleteNoteBtn').onclick=rcDeleteNote;
  if($('rcNoteModal'))$('rcNoteModal').onclick=e=>{if(e.target.id==='rcNoteModal')rcCloseNote()};
  document.addEventListener('contextmenu',e=>{
    if(!isNoteAdminMode()) return;
    if(e.target.closest('button,input,select,textarea,a'))return;
    const el=e.target.closest('[data-note-scope]');
    if(!el)return;
    e.preventDefault();rcOpenNote(el.dataset.noteScope,el.dataset.noteKey,el.dataset.noteTitle);
  });
  const tip=$('rcNoteFloat');
  const tipTitle=$('rcNoteFloatTitle');
  const tipContent=$('rcNoteFloatContent');
  let hoverEl=null;
  document.addEventListener('mouseover',e=>{
    const el=e.target.closest('[data-note-scope]');
    if(!el) return;
    const txt=rcNoteText(el.dataset.noteScope,el.dataset.noteKey);
    if(!txt) return;
    hoverEl=el;
    el.classList.add('note-hovering');
    if(tipTitle) tipTitle.textContent=el.dataset.noteTitle || '备注';
    if(tipContent) tipContent.textContent=txt;
    else if(tip) tip.textContent=txt;
    if(tip) tip.classList.add('open');
  });
  document.addEventListener('mouseout',e=>{
    if(!hoverEl) return;
    if(e.relatedTarget && hoverEl.contains(e.relatedTarget)) return;
    hoverEl.classList.remove('note-hovering');
    hoverEl=null;
    if(tip) tip.classList.remove('open');
  });
}
try{ANNOTATIONS=RC_NOTES;}catch(e){}
try{document.addEventListener('DOMContentLoaded',rcBindNotes)}catch(e){}

function renderSchool(){
  const s=findSchool(state.selected); if(!s) return renderHome();
  const groups=s.groups.filter(groupMatchesBase);
  const sum=s.summary;
  const groupNav=groups.map(g=>{const a=groupAssessment(g);const pc=planAudit(g);const gKey=annotationGroupKey(g);const gTitle=(g.school||'')+' '+(g.groupCode||'')+'组';return `<div class="group-tile ${g.bucket} ${a.cls} ${isNewGroupStrict(g)?'new-group-tile':''}" ${rcAttr('groups',gKey,gTitle)} onclick="document.getElementById('grp-${cssId(g.id)}').scrollIntoView({behavior:'smooth',block:'start'})"><div class="tile-top"><span class="group-code">${esc(g.groupCode)}组${rcBadge('groups',gKey)}</span><span class="tile-tags">${tileTagHtml(visibleSpecialTags(g))}</span></div><div class="group-name">${esc(groupDisplayTitle(g))}</div><div class="tile-metrics compact">${compactScore(g)}${planCompact(pc,g)}</div></div>`}).join('');
  const cards=groups.map(renderGroup).join('') || '<div class="empty">当前筛选下没有专业组。</div>';
  const scoreNote = scoreActive() ? `<span class="pill blue">分数段：${scoreBandText()}</span>` : '';
  const newGroupNote = state.newSchoolFilter==='newGroup' ? `<span class="pill new-group">只看新增专业组</span>` : '';
  const schoolAnno=annotationBox('schools', annotationSchoolKey(s), '学校备注：'+s.name);
  const newNote=isNewSchool(s)?`<div class="new-school-note"><b>新增院校：</b>该院校/科类/批次在当前库中缺少可直接继承的 2025 对照数据，默认在普通院校列表中沉底；分数、位次与计划变化仅作结构性参考，最终需回到官方计划书核对。</div>`:'';
  const simpleSchoolNote='';
  const schoolNoteKey=annotationSchoolKey(s);
  const schoolNoteTitle=s.name+'｜'+s.subject+'｜'+s.batch;
  $('main').innerHTML = `<section class="school-view"><div class="school-header" ${rcAttr('schools',schoolNoteKey,schoolNoteTitle)}><div><div class="school-title">${esc(s.name)}｜${esc(s.subject)}｜${esc(s.batch)}${rcBadge('schools',schoolNoteKey)}</div><div class="summary-line"><span class="pill">${esc(s.province)}${s.city?' · '+esc(s.city):''}</span><span class="pill">${esc(s.subject)}</span><span class="pill">${esc(s.batch)}</span><span class="pill">当前显示 ${groups.length} 组</span>${scoreNote}${newGroupNote}</div>${newNote}${schoolAnno}</div><div class="actions"><button class="btn" onclick="exportCSV()">导出CSV</button><button class="btn" onclick="window.print()">打印</button><button class="btn primary" onclick="renderHome()">首页</button></div></div><div class="group-nav">${groupNav}</div>${cards}</section>`;
}
function cssId(id){return id.replace(/[^a-zA-Z0-9一-龥_-]/g,'_')}

function isWeakMajorByText(m){
  const text=[m?.name,m?.majorClass,m?.direction,(m?.labels||[]).join(' '),(m?.tags||[]).join(' '),m?.remark].filter(Boolean).join(' ');
  // 这类专业在多数志愿场景中容易成为组内兜底/调剂风险项。这里只做颜色提醒，不替代最终人工判断。
  if(/护理学|康复治疗|助产|公共事业管理|健康服务与管理|劳动与社会保障|旅游管理|酒店管理|会展经济|电子商务|市场营销|工商管理|人力资源|物流管理|供应链管理|土地资源管理|社会工作|行政管理|政治学|哲学|宗教学|档案学|图书馆学|环境科学|环境工程|资源环境|材料|高分子|化学工程|化工|轻化工程|纺织|服装设计与工程|食品科学|食品质量|生物工程|生物技术|园艺|植物保护|水产|动物科学|动物医学|草业|林学|土木工程|给排水|建筑环境|城市地下|地质工程|采矿|矿物加工|安全工程|工程管理|房地产|测绘|遥感科学与技术|地理信息科学|海洋科学|船舶与海洋工程/.test(text)) return true;
  return false;
}

function isDangerMajorByText(m,g){
  // 仅保留为兜底函数，不参与主染色；绝不读取专业组标题，避免整组污染。
  const text=[m?.name,m?.majorClass,m?.direction,(m?.labels||[]).join(' '),(m?.tags||[]).join(' '),m?.remark].filter(Boolean).join(' ');
  if(/护理学|旅游管理|酒店管理|市场营销|工商管理|人力资源管理|公共事业管理|社会工作|环境工程|环境科学|材料科学|材料成型|高分子|化学工程|土木工程|给排水|建筑环境|地质工程|采矿|矿物加工|食品科学|生物工程|生物技术|水产|动物科学|草业|园艺|植物保护/.test(text)) return true;
  return false;
}

function majorVisualRisk(m,g){
  /*
    恢复早期正确口径：
    1. 不按专业名称全局扫色；
    2. 不把专业组标题合并到每个专业行判断；
    3. 只在“有好有坏”的专业组里，把偏离主体/低接受度的那几项挑出来；
    4. 正常的计算机、人工智能、电子信息、电气、自动化等主体专业不染色。
  */
  const cls = (typeof majorRowRisk==='function') ? majorRowRisk(m,g) : '';
  if(cls==='major-danger') return {level:'danger',tags:['组内刺客']};
  if(cls==='major-warn') return {level:'warn',tags:['谨慎关注']};
  return {level:'',tags:[]};
}

function majorRiskTagHtml(v){
  if(!v || !v.tags || !v.tags.length) return '';
  return `<div class="major-risk-tags">${v.tags.map(t=>`<span class="major-risk-tag ${v.level==='danger'?'danger':'warn'}">${esc(t)}</span>`).join('')}</div>`;
}


function parseNumLoose(v){
  if(v===null || v===undefined || v==='') return null;
  if(typeof v==='number') return Number.isFinite(v) ? v : null;
  const s=String(v).replace(/,/g,'').replace(/名|分/g,'').trim();
  if(!s || s==='—' || s==='-' || s==='无' || s==='暂无') return null;
  const m=s.match(/-?\d+(\.\d+)?/);
  if(!m) return null;
  const n=Number(m[0]);
  return Number.isFinite(n) ? n : null;
}
function avgNums(arr){
  const xs=(arr||[]).map(parseNumLoose).filter(x=>Number.isFinite(x) && x>0);
  if(!xs.length) return null;
  return Math.round(xs.reduce((a,b)=>a+b,0)/xs.length);
}
function majorDetailValue(d, keys){
  if(!d) return null;
  for(const k of keys){
    if(d[k]!==undefined && d[k]!==null && d[k]!=='') return d[k];
  }
  return null;
}
function threeYearMajorStats(m){
  const d=(typeof detailForMajor==='function') ? detailForMajor(m) : null;
  const s23=majorDetailValue(d,['2023最低分','2023分','2023录取分','2023专业最低分']) ?? m.score23 ?? m.minScore23;
  const s24=majorDetailValue(d,['2024最低分','2024分','2024录取分','2024专业最低分']) ?? m.score24 ?? m.minScore24;
  const s25=majorDetailValue(d,['2025最低分','2025分','2025录取分','2025专业最低分']) ?? m.score25 ?? m.minScore25;
  const r23=majorDetailValue(d,['2023最低位次','2023位次','2023专业最低位次']) ?? m.rank23 ?? m.minRank23;
  const r24=majorDetailValue(d,['2024最低位次','2024位次','2024专业最低位次']) ?? m.rank24 ?? m.minRank24;
  const r25=majorDetailValue(d,['2025最低位次','2025位次','2025专业最低位次']) ?? m.rank25 ?? m.minRank25;
  const scores=[s23,s24,s25].map(parseNumLoose).filter(x=>Number.isFinite(x) && x>0);
  const ranks=[r23,r24,r25].map(parseNumLoose).filter(x=>Number.isFinite(x) && x>0);
  return {
    avgScore: scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null,
    avgRank: ranks.length ? Math.round(ranks.reduce((a,b)=>a+b,0)/ranks.length) : null,
    scoreYears: scores.length,
    rankYears: ranks.length
  };
}
function avgCell(v, years, suffix=''){
  if(!v) return `<span class="avg-cell missing">—</span>`;
  return `<span class="avg-cell">${fmt(v)}${suffix}</span>${years && years<3 ? `<span class="avg-note">${years}年均值</span>` : ''}`;
}


function avgPairCell(avg3){
  const hasScore=avg3 && avg3.avgScore;
  const hasRank=avg3 && avg3.avgRank;
  if(!hasScore && !hasRank) return `<span class="avg-pair missing">—</span>`;
  const score=hasScore ? fmt(avg3.avgScore) : '—';
  const rank=hasRank ? fmt(avg3.avgRank) : '—';
  const years=Math.min(avg3.scoreYears||0, avg3.rankYears||0) || (avg3.scoreYears||avg3.rankYears||0);
  const note=(years && years<3) ? `<span class="avg-year-note">${years}年均值</span>` : '';
  return `<span class="avg-pair">${score} / ${rank}</span>${note}`;
}

function renderGroup(g){
  const legacyClass=g.legacyOnly?'legacy':'';
  const assess=groupAssessment(g);
  const pc=planAudit(g);
  const compactMeta=[compactScore(g), planCompact(pc,g)].filter(Boolean).join('');
  const groupAnno='';
  const groupNoteKey=annotationGroupKey(g);
  const groupNoteTitle=(g.school||'')+' '+(g.groupCode||'')+'组';
  const rows=g.majors.map((m,idx)=>{
    const vr=majorVisualRisk(m,g);
    const rowCls=vr.level==='danger'?'major-danger':(vr.level==='warn'?'major-warn':'');
    const scoreRank=(m.score25||m.rank25) ? `${m.score25?fmt(m.score25):'—'} / ${m.rank25?fmt(m.rank25):'—'}` : '—';
    const avg3=threeYearMajorStats(m);
    const majorAnno='';
    const majorNoteKey=annotationMajorKey(m);
    const majorNoteTitle=(m.school||g.school||'')+' '+(g.groupCode||'')+'组 '+(m.code||'')+' '+(m.name||'');
    return `<tr class="${rowCls}" ${rcAttr('majors',majorNoteKey,majorNoteTitle)}>
      <td>${esc(m.code||'—')}</td>
      <td><div class="major-name major-click" title="点击查看专业详情" onclick="openMajorDetail('${esc(g.id)}',${idx})">${iconSvg(m.direction)}${esc(m.name)}${majorRiskTagHtml(vr)}${rcBadge('majors',majorNoteKey)}</div>${majorAnno}</td>
      <td>${esc(m.majorClass||'—')}</td>
      <td>${majorPlanCell(m)}</td>
      <td>${scoreRank}</td>
      <td>${avgPairCell(avg3)}</td>
    </tr>`;
  }).join('');
  return `<article class="group-card ${g.bucket} ${assess.cls} ${legacyClass} ${isNewGroupStrict(g)?'new-group-card':''}" id="grp-${cssId(g.id)}" ${rcAttr('groups',groupNoteKey,groupNoteTitle)}><div class="group-head compact-head"><div class="group-head-main"><div><div class="group-title">${esc(g.groupCode)}组｜${esc(groupDisplayTitle(g))}${rcBadge('groups',groupNoteKey)}</div>${groupAttrTagHtml(g)}</div><div class="actions"><button class="btn" onclick="openEvo('${esc(g.id)}')">前世今生</button></div></div><div class="compact-line">${compactMeta}</div></div><div class="table-wrap"><table><thead><tr><th>代码</th><th>专业名称</th><th>专业类</th><th>25计划/变化</th><th>25分/位次</th><th>三年均分/位次</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">2026 当前批次未见在招专业。请查看前世今生核对。</td></tr>'}</tbody></table></div></article>`;
}
function render(){renderList(); if(state.selected) renderSchool(); else renderHome();}
function findGroup(id){for(const s of DB.schools) for(const g of s.groups) if(g.id===id) return g; return null;}
function findSchoolByGroup(group){return DB.schools.find(s=>s.groups.some(g=>g.id===group.id));}
function baseMajorNameStrict(name){
  return String(name||'')
    .replace(/（.*?）|\(.*?\)|\[.*?\]|【.*?】/g,'')
    .replace(/(专业|类|实验班|试验班|基地班|拔尖班|卓越班)$/g,'')
    .replace(/[\s,，;；。、/／\[\]【】（）()]/g,'')
    .trim();
}
function attrKeyStrict(name){
  const t=String(name||'');
  const a=[];
  if(/中外合作|合作办学|中外联合|中外/.test(t)) a.push('中外合作');
  if(/学分互认/.test(t)) a.push('学分互认');
  if(/联合培养|联合学士|双学士|双学位|本硕|本博|长学制/.test(t)) a.push('联合/双学位');
  if(/公费师范|乡村教师|定向师范|师范/.test(t)) a.push('师范');
  if(/院士班|筑梦院士|正跃院士/.test(t)) a.push('院士班');
  if(/卓越班|卓越计划/.test(t)) a.push('卓越班');
  if(/拔尖|拔尖创新/.test(t)) a.push('拔尖班');
  if(/基地班|国家拔尖基地/.test(t)) a.push('基地班');
  if(/英才/.test(t)) a.push('英才班');
  if(/创新班|复合创新班|AI复合创新|新文科复合创新|航空管理复合创新/.test(t)) a.push('创新班');
  if(/实验班|试验班/.test(t)) a.push('实验/试验班');
  if(/长空创新/.test(t)) a.push('长空创新班');
  if(/钱伟长/.test(t)) a.push('钱伟长班');
  if(/强基/.test(t)) a.push('强基');
  if(/未来技术/.test(t)) a.push('未来技术');
  return [...new Set(a)].sort().join('|');
}
function coreMajorName(name){
  const b=baseMajorNameStrict(name);
  const k=attrKeyStrict(name);
  return k ? `${b}§${k}` : b;
}
function displayCoreName(core){
  return String(core||'').split('§')[0];
}
function sourceGroupCodes(m){
  const s=String(m.sourceGroup||'');
  const found=[...s.matchAll(/\d{2}/g)].map(x=>x[0]);
  const uniq=unique(found);
  if(uniq.length) return uniq;
  if(/^\d{2}$/.test(s.trim())) return [s.trim()];
  if(m.plan25||m.score25||m.rank25) return [m.groupCode];
  return [];
}
function sourceGroupCode(m){
  return sourceGroupCodes(m)[0] || '';
}
function addOldRecord(map,code,m,via,weight){
  if(!code) return;
  if(!map.has(code)) map.set(code,{code,majors:[],via:new Set(),hasLegacy:false,hasSingle:false,hasMulti:false});
  const g=map.get(code);
  const key=coreMajorName(m.name)+'|'+(m.plan25||0)+'|'+(m.score25||0)+'|'+code;
  const existing=g.majors.find(x=>x._key===key);
  if(existing){
    existing._weight=Math.max(existing._weight||0,weight||0.5);
    existing._viaList=unique([...(existing._viaList||[existing._via]),via]);
  }else{
    g.majors.push({...m,_key:key,_via:via,_viaList:[via],_weight:weight||0.5});
  }
  g.via.add(via);
  if(via==='25旧记录') g.hasLegacy=true;
  if(via==='专业历史字段') g.hasSingle=true;
  if(via==='多来源提示') g.hasMulti=true;
}
function buildOldGroups(s){
  const map=new Map();
  (s.groups||[]).forEach(cg=>{
    // 旧组原始遗留记录优先，这是判断拆分/合并最可靠的线索。
    (cg.legacy||[]).forEach(m=>addOldRecord(map,m.groupCode,m,'25旧记录',1));
  });
  (s.groups||[]).forEach(cg=>{
    (cg.majors||[]).forEach(m=>{
      if(m.plan25||m.score25||m.rank25){
        const codes=sourceGroupCodes(m);
        if(codes.length===1) addOldRecord(map,codes[0],m,'专业历史字段',0.82);
        else codes.forEach(code=>addOldRecord(map,code,m,'多来源提示',0.42));
      }
    });
  });
  return [...map.values()].map(g=>{
    // 同一旧组内按专业核心名去重：保留权重最高的记录，避免同一专业从旧记录和历史字段重复计算。
    const byCore=new Map();
    (g.majors||[]).forEach(m=>{
      const c=coreMajorName(m.name);
      if(!c) return;
      const old=byCore.get(c);
      if(!old || (m._weight||0)>(old._weight||0)) byCore.set(c,m);
    });
    g.majors=[...byCore.values()];
    g.via=[...g.via];
    return g;
  }).sort((a,b)=>a.code.localeCompare(b.code,'zh-CN'));
}
function oldCoreMap(old){
  const mp=new Map();
  (old.majors||[]).forEach(m=>{const c=coreMajorName(m.name); if(c && !mp.has(c)) mp.set(c,m);});
  return mp;
}
function curCoreMap(g){
  const mp=new Map();
  (g.majors||[]).forEach(m=>{const c=coreMajorName(m.name); if(c && !mp.has(c)) mp.set(c,m);});
  return mp;
}
function groupSimilarity(cur,old){
  const curMap=curCoreMap(cur), oldMap=oldCoreMap(old);
  const curCores=[...curMap.keys()], oldCores=[...oldMap.keys()];
  const curClusters=unique((cur.majors||[]).map(majorCluster));
  const oldClusters=unique((old.majors||[]).map(majorCluster));
  const common=curCores.filter(x=>oldMap.has(x));
  const weightedCommon=common.reduce((a,c)=>a+(oldMap.get(c)._weight||0.5),0);
  const coreDen=Math.max(curCores.length,oldCores.length,1);
  const clusterCommon=curClusters.filter(x=>oldClusters.includes(x));
  const clusterDen=Math.max(curClusters.length,oldClusters.length,1);
  const sourceHit=(cur.sourceContext||[]).some(x=>x.code===old.code) ? 0.05 : 0;
  let score=Math.min(1, weightedCommon/coreDen*0.76 + clusterCommon.length/clusterDen*0.18 + sourceHit);
  // 只有多来源提示、没有旧组遗留记录或单一来源记录的候选，不让它压过真实旧组。
  if(!old.hasLegacy && !old.hasSingle && old.hasMulti) score=Math.min(score,0.45);
  return {score,common,curOnly:curCores.filter(x=>!oldMap.has(x)),oldOnly:oldCores.filter(x=>!curMap.has(x)),curClusters,oldClusters,clusterCommon,weightedCommon};
}
function bestOldGroupMatches(s,g){
  return buildOldGroups(s).map(og=>({old:og,sim:groupSimilarity(g,og)})).filter(x=>x.old.majors.length && x.sim.common.length).sort((a,b)=>b.sim.score-a.sim.score).slice(0,8);
}
function safeNum(x){const n=Number(x); return Number.isFinite(n)?n:0;}
function oldGroupPlanTotal(old){return (old?.majors||[]).reduce((a,m)=>a+safeNum(m.plan25),0);}
function rowPlan25Total(g){return (g?.majors||[]).reduce((a,m)=>a+safeNum(m.plan25),0);}
function contributionPlanForMatch(g,match,covered){
  const oldMap=oldCoreMap(match.old);
  return (g.majors||[]).reduce((sum,m)=>{
    const c=coreMajorName(m.name);
    if(!c || covered?.has(c) || !oldMap.has(c)) return sum;
    return sum + safeNum(m.plan26) * (oldMap.get(c)._weight||0.5);
  },0);
}
function pickSourceFlows(s,g){
  const matches=bestOldGroupMatches(s,g);
  const covered=new Set();
  const flows=[];
  // 按“能解释当前组多少计划 + 旧组证据可靠度”贪心覆盖，避免只显示单一最大相似组。
  for(let step=0; step<4; step++){
    const candidates=matches.map(m=>({m,score:contributionPlanForMatch(g,m,covered)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    if(!candidates.length) break;
    const chosen=candidates[0].m;
    const oldMap=oldCoreMap(chosen.old);
    const commonCores=(g.majors||[]).map(m=>coreMajorName(m.name)).filter(c=>c && !covered.has(c) && oldMap.has(c));
    if(!commonCores.length) break;
    commonCores.forEach(c=>covered.add(c));
    flows.push({match:chosen,cores:commonCores});
    if(covered.size>=curCoreMap(g).size) break;
  }
  if(!flows.length && matches[0]) flows.push({match:matches[0],cores:matches[0].sim.common||[]});
  return {flows,matches,covered};
}
function sourceFlowLabel(flow){
  const old=flow.match.old;
  const oldCores=[...oldCoreMap(old).keys()];
  const ratio=oldCores.length ? flow.cores.length/oldCores.length : 0;
  if(ratio>=0.75) return '主体来源｜整体平移';
  if(flow.cores.length>=2) return '部分调入';
  return '少量调入';
}
function sourceFlowTitle(flow){
  const names=flow.cores.slice(0,4).map(x=>displayCoreName(x).replace(/类$/,''));
  return names.join('、') + (flow.cores.length>4?'等':'');
}
function sourceFlowPlans(g,flow){
  const oldMap=oldCoreMap(flow.match.old);
  let p25=0,p26=0;
  (g.majors||[]).forEach(m=>{
    const c=coreMajorName(m.name);
    if(flow.cores.includes(c)){
      p26+=safeNum(m.plan26);
      const om=oldMap.get(c); if(om) p25+=safeNum(om.plan25);
    }
  });
  return {p25,p26,delta:p26-p25};
}
function planAudit(g){
  const plan26=safeNum(g.plan26);
  const plan25=safeNum(g.plan25);
  return {
    plan26,
    oldPlan:plan25,
    plan25,
    row25:rowPlan25Total(g),
    delta:plan26-plan25,
    basis:'严格班型属性核对后的专业组计划合计；中外合作/班型/双学位等属性不跨类继承。',
    confidence:plan25===0 && plan26>0 ? '25无对照/疑似新增' : '严格属性对照',
    confirmed:true,
    sim:null,
    oldCode:g.groupCode
  };
}
function planMini(pc){
  if(pc.oldPlan===null) return `25待核对→${fmt(pc.plan26)}`;
  return `${fmt(pc.oldPlan)}→${fmt(pc.plan26)}（${pc.delta>0?`+${pc.delta}`:pc.delta}）`;
}
function planMetric(pc){
  if(pc.oldPlan===null) return `<span title="${esc(pc.basis)}">25待核对 → ${fmt(pc.plan26)}</span>`;
  return `${fmt(pc.oldPlan)} → ${fmt(pc.plan26)} ${delta(pc.delta)}`;
}
function planBasisPill(pc){
  if(pc.oldPlan===null) return `<span class="pill orange" title="${esc(pc.basis)}">计划增减待核对</span>`;
  const cls=pc.delta===0?'green':(pc.delta>0?'blue':'orange');
  return `<span class="pill ${cls}" title="${esc(pc.basis)}">计划${fmt(pc.oldPlan)}→${fmt(pc.plan26)}（${pc.delta>0?`+${pc.delta}`:pc.delta}）</span>`;
}
function schoolPlanAudit(groups){
  const audits=(groups||[]).map(planAudit);
  const plan26=audits.reduce((a,x)=>a+safeNum(x.plan26),0);
  const valid=audits.filter(x=>x.oldPlan!==null);
  if(valid.length && valid.length===audits.length){
    const old=valid.reduce((a,x)=>a+safeNum(x.oldPlan),0);
    return `计划 ${fmt(old)} → ${fmt(plan26)}（${delta(plan26-old)}）`;
  }
  return `26计划 ${fmt(plan26)}｜25对照已核 ${valid.length}/${audits.length}组`;
}
function relationBadge(score){
  if(score>=0.55) return '<span class="pill green">相似度较高</span>';
  if(score>=0.28) return '<span class="pill orange">相似度中等｜待核对</span>';
  return '<span class="pill red">相似度低｜可能新增/重组</span>';
}
function oldGroupBrief(g,flow){
  const old=flow.match.old;
  const ps=sourceFlowPlans(g,flow);
  const majors=(old.majors||[]).slice(0,8).map(m=>`<span class="pill">${esc(displayCoreName(coreMajorName(m.name))||m.name)}</span>`).join('');
  return `<div class="path" style="margin-bottom:10px"><b>2025 ${esc(old.code)}组｜${sourceFlowLabel(flow)}</b><div class="summary-line" style="margin-top:8px"><span class="pill blue">调入：${esc(sourceFlowTitle(flow))}</span><span class="pill">对应计划：${fmt(ps.p25)}→${fmt(ps.p26)}（${ps.delta>0?`+${ps.delta}`:ps.delta}）</span></div><div class="summary-line" style="margin-top:8px">${majors}</div></div>`;
}
function currentSourceBadge(core,flows){
  const f=flows.find(x=>x.cores.includes(core));
  return f ? `<span class="pill blue">来自2025 ${esc(f.match.old.code)}组</span>` : '<span class="pill orange">来源待核对</span>';
}
function oldStatusBadge(core,flow){
  return flow.cores.includes(core) ? '<span class="pill green">进入今年本组</span>' : '<span class="pill orange">未进入今年本组</span>';
}

function isMeaningfulDetail(v,label){
  if(v===null||v===undefined||v==='') return false;
  const s=String(v).trim();
  if(!s || s==='-' || s==='—' || s==='0' || s==='0.0') return false;
  return true;
}
function fmtDetail(v,label){
  if(v===null||v===undefined||v==='') return '';
  if(label && label.includes('保研率') && typeof v==='number'){
    return (v<1 ? (v*100).toFixed(2)+'%' : v.toFixed(2)+'%');
  }
  if(typeof v==='number') return Number.isInteger(v) ? v.toLocaleString('zh-CN') : String(v);
  return String(v);
}
function propertyRowsFromMajor(m,d){
  const text=[m.name,d?.专业名称,(m.tags||[]).join(' '),(m.labels||[]).join(' ')].filter(Boolean).join(' ');
  const props=[];
  if(/中外合作|合作办学|中外联合|中外/.test(text)) props.push(['中外合作情况','中外合作办学']);
  if(/学分互认/.test(text)) props.push(['学分互认','是']);
  if(/联合培养/.test(text)) props.push(['联合培养','是']);
  if(/双学士|双学位|联合学士/.test(text)) props.push(['双学位/双学士','是']);
  if(/拔尖/.test(text)) props.push(['班型','拔尖班/拔尖创新班']);
  if(/卓越|院士|创新班|实验班|试验班|英才|基地班|长空创新|钱伟长/.test(text)){
    const arr=[];
    if(/卓越/.test(text)) arr.push('卓越班');
    if(/院士/.test(text)) arr.push('院士班');
    if(/创新班|长空创新/.test(text)) arr.push('创新班');
    if(/实验班|试验班/.test(text)) arr.push('实验/试验班');
    if(/英才/.test(text)) arr.push('英才班');
    if(/基地班/.test(text)) arr.push('基地班');
    if(/钱伟长/.test(text)) arr.push('钱伟长班');
    if(arr.length) props.push(['班型属性', unique(arr).join('、')]);
  }
  if(/师范|公费师范|乡村教师/.test(text)) props.push(['师范属性','是']);
  return props;
}
function sectionHTML(title, rows){
  const filtered=(rows||[]).filter(r=>isMeaningfulDetail(r[1],r[0]));
  if(!filtered.length) return '';
  return `<section class="detail-section"><h3>${esc(title)}</h3><table class="detail-table"><tbody>${filtered.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(fmtDetail(v,k))}</td></tr>`).join('')}</tbody></table></section>`;
}
function openMajorDetail(groupId, majorIndex){
  const g=findGroup(groupId); if(!g) return;
  const m=(g.majors||[])[majorIndex]; if(!m) return;
  const d=detailForMajor(m) || {};
  $('modalTitle').textContent=`${m.school}｜${g.groupCode}组｜${m.name}`;
  const planDelta=safeNum(m.plan26)-safeNum(m.plan25);
  const lead=[
    `<span class="detail-pill">${esc(m.subject||g.subject||'')}</span>`,
    `<span class="detail-pill">${esc(m.batch||g.batch||'')}</span>`,
    `<span class="detail-pill">${esc(g.groupCode)}组</span>`,
    `<span class="detail-pill">计划 ${fmt(safeNum(m.plan25))}→${fmt(safeNum(m.plan26))}（${planDelta>0?`+${fmt(planDelta)}`:fmt(planDelta)}）</span>`,
    (m.score25||m.rank25)?`<span class="detail-pill">25分/位次 ${m.score25?fmt(m.score25):'—'} / ${m.rank25?fmt(m.rank25):'—'}</span>`:''
  ].filter(Boolean).join('');
  const schoolForNote=findSchoolByGroup(g);
  const detailNotes=[
    schoolForNote ? rcDetailNote('schools', annotationSchoolKey(schoolForNote), '学校备注') : '',
    rcDetailNote('groups', annotationGroupKey(g), '专业组备注'),
    rcDetailNote('majors', annotationMajorKey(m), '专业备注')
  ].filter(Boolean).join('');
  const sections=[
    sectionHTML('培养属性', [
      ...propertyRowsFromMajor(m,d),
      ['专业名称', d['专业名称'] || m.name],
      ['本科专业名称', d['本科专业名称']],
      ['本科专业类', d['本科专业类'] || m.majorClass],
      ['研究生学科专业', d['研究生学科专业']],
      ['再选科目', d['再选科目'] || g.elective],
      ['学制', d['学制'] || m.years],
      ['学费', d['学费'] || m.tuition],
      ['专业录取规则', d['专业录取规则']]
    ]),
    sectionHTML('学科实力', [
      ['院校层次', d['院校层次'] || m.level],
      ['保研率', d['保研率']],
      ['软科学校排名', d['软科学校排名']],
      ['硕博点', d['硕博']],
      ['第四轮评估', d['第四轮评估']],
      ['第五轮A', d['第五轮A']],
      ['一流/101', d['一流/101']],
      ['软科专业排名', d['软科专业排名']]
    ]),
    sectionHTML('计划与录取', [
      ['2026计划', d['2026计划'] || m.plan26],
      ['2025计划', d['2025计划'] || m.plan25],
      ['2025录取', d['2025录取'] || m.admit25],
      ['2025最高分', d['2025最高分'] || m.max25],
      ['2025最低分', d['2025最低分'] || m.score25],
      ['2025最低位次', d['2025最低位次'] || m.rank25],
      ['2024计划', d['2024计划']],
      ['2024最低分', d['2024最低分']],
      ['2024最低位次', d['2024最低位次']],
      ['2023计划', d['2023计划']],
      ['2023最低分', d['2023最低分']],
      ['2023最低位次', d['2023最低位次']]
    ]),
    sectionHTML('其他信息', [
      ['省份', d['省份'] || m.province],
      ['城市', d['城市'] || m.city],
      ['院校专业组', d['院校专业组']],
      ['院校组代号', d['院校组代号']],
      ['专业代号', d['专业代号'] || m.code],
      ['志愿标注', d['志愿标注']],
      ['提前批类别', d['提前批类别']],
      ['去年辅助', d['去年辅助']],
      ['辅助', d['辅助']],
      ['来源表', d['__sheet']]
    ])
  ].filter(Boolean).join('');
  $('modalBody').innerHTML = `<div class="detail-lead">${lead}</div>${detailNotes}${sections || '<div class="empty">该专业暂无可展示明细。</div>'}`;
  $('modal').classList.add('open');
}

function openEvo(id){
  const g=findGroup(id); if(!g) return;
  const s=findSchoolByGroup(g);
  $('modalTitle').textContent=`${g.school}｜${g.groupCode}组｜${groupDisplayTitle(g)}｜前世今生`;
  const picked=s ? pickSourceFlows(s,g) : {flows:[],matches:[],covered:new Set()};
  const flows=picked.flows||[];
  const pc=planAudit(g);
  const sourceLine=flows.length ? flows.map(f=>`<span class="pill green">2025 ${esc(f.match.old.code)}组：${esc(sourceFlowLabel(f))}</span>`).join('') : '<span class="pill orange">未找到可靠来源组</span>';
  const flowBlocks=flows.length ? flows.map(f=>oldGroupBrief(g,f)).join('') : '<div class="path">未找到可用2025来源组。</div>';
  const oldSections=flows.map(f=>{
    const oldMajors=f.match.old.majors||[];
    const rows=oldMajors.map(m=>{const core=coreMajorName(m.name); return `<tr><td>${esc(f.match.old.code)}组</td><td>${esc(m.name)}</td><td>${oldStatusBadge(core,f)}</td><td>${fmt(m.plan25)}</td><td>${m.score25?fmt(m.score25):'—'} / ${m.rank25?fmt(m.rank25):'—'}</td></tr>`;}).join('');
    return rows;
  }).join('');
  const currentRows=(g.majors||[]).map(m=>{
    const core=coreMajorName(m.name);
    const rk=majorRowRisk(m,g);
    const riskMark = rk==='major-danger' ? '<span class="pill red">偏离主体</span>' : (rk==='major-warn' ? '<span class="pill orange">需确认接受度</span>' : '');
    return `<tr><td>${esc(m.name)}</td><td>${currentSourceBadge(core,flows)} ${riskMark}</td><td>${fmt(m.plan26)}</td><td>${m.score25?fmt(m.score25):'—'} / ${m.rank25?fmt(m.rank25):'—'}</td></tr>`;
  }).join('') || '<tr><td colspan="4">2026 本组未见在招专业</td></tr>';
  const evoNotes=[s ? rcDetailNote('schools', annotationSchoolKey(s), '学校备注') : '', rcDetailNote('groups', annotationGroupKey(g), '专业组备注')].filter(Boolean).join('');
  const summary = flows.length>1
    ? `这个组不是单一旧组平移，而是由 ${flows.map(f=>`2025 ${f.match.old.code}组`).join(' + ')} 组合而来。先看主体来源，再看哪些专业从其他旧组并入。`
    : (flows.length===1 ? `这个组主要对应 2025 ${flows[0].match.old.code}组。` : '未找到可靠旧组来源。');
  const scoreNote = flows.length>1 ? '<div class="path" style="margin-bottom:14px"><b>分数理解：</b>不能直接沿用单一旧组投档线理解。今年并入其他方向后，投档线可能被新并入专业影响；主体专业仍应看专业级历史分和组内加权均分。</div>' : '';
  $('modalBody').innerHTML=`
    ${evoNotes}
    <div class="path" style="margin-bottom:14px"><b>变化结论：</b>${esc(summary)}<div class="summary-line" style="margin-top:8px">${sourceLine}</div></div>
    <div class="path" style="margin-bottom:14px"><b>计划变化：</b><span class="pill">${pc.oldPlan===null?'25待核对':fmt(pc.oldPlan)} → ${fmt(pc.plan26)}${pc.delta!==null?`（${pc.delta>0?`+${pc.delta}`:pc.delta}）`:''}</span><span class="pill">口径：${esc(pc.confidence)}</span></div>
    ${scoreNote}
    ${flowBlocks}
    <div class="table-wrap" style="margin-bottom:14px"><table><thead><tr><th>2025组</th><th>2025专业</th><th>去向</th><th>25计划</th><th>25分/位次</th></tr></thead><tbody>${oldSections || '<tr><td colspan="5">没有可靠2025专业明细。</td></tr>'}</tbody></table></div>
    <div class="table-wrap"><table><thead><tr><th>2026本组专业</th><th>来源/提醒</th><th>26计划</th><th>25分/位次</th></tr></thead><tbody>${currentRows}</tbody></table></div>`;
  $('modal').classList.add('open');
}

function exportCSV(){
  const s=findSchool(state.selected); if(!s) return;
  const lines=[['学校','批次','科类','专业组','专业组名称','专业组类型','再选','组内颜色','专业匹配度','风险等级','25对照组计划','26组计划','组计划增减','组计划口径','25加权均分','模拟参考分','模拟区间','筛选分','模拟依据','专业代码','专业名称','专业类','标签','26专业计划','25专业计划','行级增减','25最低分','25最低位次','风险提示']];
  s.groups.forEach(g=>{
    if(!groupMatchesBase(g)) return;
    { const pc=planAudit(g); g.majors.forEach(m=>lines.push([s.name,s.batch,s.subject,g.groupCode,groupDisplayTitle(g),(g.typeTags||[]).map(typeTagLabel).join('|'),g.elective,groupAssessment(g).label,groupAssessment(g).score,g.riskLevel,pc.oldPlan??'待核对',pc.plan26,pc.delta??'待核对',pc.basis,g.avgScore||'',g.predScore||'',(g.predLow!==null&&g.predHigh!==null)?`${g.predLow}-${g.predHigh}`:'',scoreForFilter(g)||'',g.predBasis||'',m.code,m.name,m.majorClass||'',(m.labels||[]).join('|'),m.plan26,m.plan25,(m.plan26||0)-(m.plan25||0),m.score25||'',m.rank25||'',(m.auditNote||m.riskTip||'')])); }
  });
  const csv=lines.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${s.name}_${s.subject}_${s.batch}_专业组变化.csv`; a.click(); URL.revokeObjectURL(a.href);
}
['batch','subject','risk'].forEach(k=>{
  const id=k+'Filter'; const el=$(id); if(el) el.addEventListener('change',e=>{state[k]=e.target.value; state.selected=null; render();});
});
if($('majorClassFilter')) $('majorClassFilter').addEventListener('change',e=>{state.majorClass=e.target.value; state.selected=null; render();});
$('groupTypeFilter').addEventListener('change',e=>{state.groupType=e.target.value; state.selected=null; render();});
$('specialPathFilter').addEventListener('change',e=>{state.specialPathFilter=e.target.value; state.selected=null; render();});
$('newSchoolFilter').addEventListener('change',e=>{state.newSchoolFilter=e.target.value; state.selected=null; render();});
if($('coopFilter')) $('coopFilter').addEventListener('change',e=>{state.coopFilter=e.target.value; state.selected=null; render();});
if($('creditFilter')) $('creditFilter').addEventListener('change',e=>{state.creditFilter=e.target.value; state.selected=null; render();});

if($('provinceMultiBtn')){
  $('provinceMultiBtn').addEventListener('click',e=>{e.stopPropagation(); if(!$('provinceGrid').querySelector('input')) renderProvincePanel(ALL_PROVINCES_STATIC); $('provincePanel').classList.toggle('open');});
}
if($('provincePanelClose')) $('provincePanelClose').addEventListener('click',()=> $('provincePanel').classList.remove('open'));
if($('provinceSelectClear')) $('provinceSelectClear').addEventListener('click',()=> setProvinceSelection([]));
if($('provinceSelectJZH')) $('provinceSelectJZH').addEventListener('click',()=> setProvinceSelection(['江苏','浙江','上海']));
if($('provinceSelectJSD')) $('provinceSelectJSD').addEventListener('click',()=> setProvinceSelection(['江苏','浙江','上海','安徽','山东']));
document.querySelectorAll('.region-chip').forEach(chip=>{
  chip.addEventListener('click',()=>{
    const map={
      '发达地区':['北京','天津','上海','江苏','浙江','广东'],
      '华东':['上海','江苏','浙江','安徽','福建','江西','山东'],
      '长三角':['上海','江苏','浙江','安徽']
    };
    setProvinceSelection(map[chip.dataset.region]||[]);
  });
});
document.addEventListener('click',e=>{
  const panel=$('provincePanel'), btn=$('provinceMultiBtn');
  if(panel && panel.classList.contains('open') && !panel.contains(e.target) && e.target!==btn) panel.classList.remove('open');
});


if($('levelMultiBtn')){
  $('levelMultiBtn').addEventListener('click',e=>{
    e.stopPropagation();
    if(!$('levelGrid').querySelector('input')) renderLevelPanel(ALL_LEVELS_STATIC); $('levelPanel').classList.toggle('open');
  });
}
if($('levelPanelClose')) $('levelPanelClose').addEventListener('click',()=> $('levelPanel').classList.remove('open'));
if($('levelSelectClear')) $('levelSelectClear').addEventListener('click',()=> setLevelSelection([]));
if($('levelSelect985211')) $('levelSelect985211').addEventListener('click',()=>{
  const all=[...new Set(DB.schools.map(s=>s.level).filter(Boolean))];
  setLevelSelection(all.filter(x=>/985|211/.test(x)));
});
if($('levelSelectPublic')) $('levelSelectPublic').addEventListener('click',()=>{
  const all=[...new Set(DB.schools.map(s=>s.level).filter(Boolean))];
  setLevelSelection(all.filter(x=>/985|211|双一流|一流|保研|公办|省重点|普通公办/.test(x)));
});
document.addEventListener('click',e=>{
  const panel=$('levelPanel'), btn=$('levelMultiBtn');
  if(panel && panel.classList.contains('open') && !panel.contains(e.target) && e.target!==btn) panel.classList.remove('open');
});

$('searchBox').addEventListener('input',e=>{state.q=e.target.value.trim(); state.selected=null; render();});
$('scoreInput').addEventListener('input',e=>{state.score=e.target.value.trim(); state.selected=null; render();});
['scoreUp','scoreDown'].forEach(id=>$(id).addEventListener('change',e=>{const v=clampBand(e.target.value); e.target.value=v; state[id==='scoreUp'?'scoreUp':'scoreDown']=v; state.selected=null; render();}));
[['onlyNew','onlyNew'],['onlyStop','onlyStop'],['onlyCross','onlyCross'],['onlyHigh','onlyHigh'],['usePredict','usePredict']].forEach(([id,k])=>$(id).addEventListener('click',e=>{state[k]=!state[k]; e.target.classList.toggle('active',state[k]); state.selected=null; render();}));

const collapseBtn=$('filterCollapseBtn');
const topbarEl=document.querySelector('.topbar');
function setFilterCollapsed(collapsed){
  if(!topbarEl||!collapseBtn) return;
  topbarEl.classList.toggle('collapsed', !!collapsed);
  collapseBtn.textContent=collapsed?'展开筛选':'折叠筛选';
  collapseBtn.setAttribute('aria-expanded', collapsed?'false':'true');
  collapseBtn.setAttribute('aria-label', collapsed?'展开筛选区':'折叠筛选区');
  try{localStorage.setItem('filterCollapsed', collapsed?'1':'0')}catch(e){}
}
if(collapseBtn){
  collapseBtn.setAttribute('aria-controls','filtersPanel');
  const filtersPanel=document.querySelector('.filters');
  if(filtersPanel) filtersPanel.id='filtersPanel';
  let saved=false;
  try{saved=localStorage.getItem('filterCollapsed')==='1'}catch(e){}
  setFilterCollapsed(saved);
  collapseBtn.addEventListener('click',()=>{
    const collapsed=!(topbarEl&&topbarEl.classList.contains('collapsed'));
    setFilterCollapsed(collapsed);
  });
}

$('closeModal').onclick=()=>$('modal').classList.remove('open'); $('modal').onclick=e=>{if(e.target.id==='modal') $('modal').classList.remove('open');};
$('backTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'}); window.addEventListener('scroll',()=>$('backTop').classList.toggle('show',window.scrollY>300));

if($('annoToggleEdit')) $('annoToggleEdit').onclick=toggleAnnotationEditMode;
if($('annoExportBtn')) $('annoExportBtn').onclick=exportAnnotations;
if($('annoImportBtn')) $('annoImportBtn').onclick=()=>$('annoFileInput').click();
if($('annoFileInput')) $('annoFileInput').onchange=e=>{const f=e.target.files&&e.target.files[0]; if(f) importAnnotationsFile(f); e.target.value='';};
if($('annoClearBtn')) $('annoClearBtn').onclick=clearLocalAnnotations;
if($('annoModalClose')) $('annoModalClose').onclick=closeAnnotationEditor;
if($('annoModal')) $('annoModal').addEventListener('click',e=>{if(e.target.id==='annoModal') closeAnnotationEditor();});
if($('annoSaveBtn')) $('annoSaveBtn').onclick=saveAnnotationFromModal;
if($('annoDeleteBtn')) $('annoDeleteBtn').onclick=deleteAnnotationFromModal;

bindStaticMultiPanels(); bindAnnotationControlsSafe(); setAnnotationEditMode(false); initOptions(); const vb=$('versionBadge'); if(vb) vb.textContent=APP_VERSION; renderHome(); renderList(); loadRemoteAnnotations(); rcLoadRemoteNotes();












try{document.addEventListener('DOMContentLoaded',bindAnnotationControlsSafe);}catch(e){}







try{window.addEventListener('hashchange',applyNoteAdminMode);}catch(e){}
try{document.addEventListener('DOMContentLoaded',applyNoteAdminMode);}catch(e){}










/* === V16.1 Supabase 数据库备注强制版 === */
const SB_PROJECT_URL = "https://qnspmqsrbjcgrgpqkzgl.supabase.co";
const SB_REST_URL = "https://qnspmqsrbjcgrgpqkzgl.supabase.co/rest/v1";
const SB_AUTH_URL = "https://qnspmqsrbjcgrgpqkzgl.supabase.co/auth/v1";
const SB_PUBLISHABLE_KEY = "sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V";
const SB_ADMIN_EMAIL = "ycxukun@gmail.com";
const SB_SESSION_KEY = 'jiangsu_plan_supabase_session_v1';

function sbGetSession(){try{return JSON.parse(sessionStorage.getItem(SB_SESSION_KEY)||'null');}catch(e){return null;}}
function sbSetSession(s){if(s) sessionStorage.setItem(SB_SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SB_SESSION_KEY); document.body.classList.toggle('sb-logged-in', !!s);}
function sbAccessToken(){const s=sbGetSession(); return s&&s.access_token?s.access_token:'';}
function sbHeaders(auth=false){const token=auth?sbAccessToken():''; return {'apikey':SB_PUBLISHABLE_KEY,'Authorization':'Bearer '+(token||SB_PUBLISHABLE_KEY),'Content-Type':'application/json'};}
function sbOpenLogin(){if(!isNoteAdminMode()){alert('请打开 admin.html 管理员页。');return;} if($('sbEmailInput')) $('sbEmailInput').value=SB_ADMIN_EMAIL; if($('sbPasswordInput')) $('sbPasswordInput').value=''; $('sbLoginModal').classList.add('open'); setTimeout(()=>{try{$('sbPasswordInput').focus();}catch(e){}},30);}
function sbCloseLogin(){if($('sbLoginModal')) $('sbLoginModal').classList.remove('open');}
async function sbLogin(){
  const email=String($('sbEmailInput').value||'').trim(), password=String($('sbPasswordInput').value||'');
  if(!email||!password){alert('请输入邮箱和密码。');return;}
  rcStatus('正在登录 Supabase...');
  try{
    const r=await fetch(SB_AUTH_URL+'/token?grant_type=password',{method:'POST',headers:{'apikey':SB_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!r.ok){let msg='';try{const j=await r.json();msg=j.error_description||j.message||'';}catch(e){msg=await r.text();} throw new Error(msg||('登录失败：'+r.status));}
    const data=await r.json(); sbSetSession(data); sbCloseLogin(); rcStatus('数据库已登录'); await sbLoadNotesFromDatabase(true);
  }catch(e){rcStatus('登录失败');alert(e.message||e);}
}
function sbLogout(){sbSetSession(null);rcStatus('已退出数据库登录');}
function sbRowsToNotes(rows){const out=rcBlankNotes();(rows||[]).forEach(r=>{if(out[r.scope]&&r.target_key) out[r.scope][r.target_key]={note:String(r.note||'')};});return out;}
async function sbLoadNotesFromDatabase(manual=false){
  try{
    if(manual) rcStatus('正在读取数据库备注...');
    const r=await fetch(SB_REST_URL+'/notes?select=scope,target_key,note&order=updated_at.desc',{method:'GET',headers:sbHeaders(false)});
    if(!r.ok){let msg='';try{const j=await r.json();msg=j.message||'';}catch(e){msg=await r.text();} throw new Error(msg||('读取失败：'+r.status));}
    const remote=sbRowsToNotes(await r.json());
    RC_NOTES=remote; rcSaveNotes();
    if(manual) rcStatus('已读取数据库备注');
    render();
  }catch(e){if(manual) alert(e.message||e); rcStatus('数据库读取失败');}
}
async function sbUpsertNote(scope,key,note){
  if(!sbAccessToken()) throw new Error('尚未登录数据库。请先点“登录数据库”。');
  const r=await fetch(SB_REST_URL+'/notes?on_conflict=scope,target_key',{method:'POST',headers:{...sbHeaders(true),'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify({scope,target_key:key,note:String(note||'')})});
  if(!r.ok){let msg='';try{const j=await r.json();msg=j.message||'';}catch(e){msg=await r.text();} throw new Error(msg||('保存失败：'+r.status));}
  return r.json();
}
async function sbDeleteNote(scope,key){
  if(!sbAccessToken()) throw new Error('尚未登录数据库。请先点“登录数据库”。');
  const url=SB_REST_URL+'/notes?scope=eq.'+encodeURIComponent(scope)+'&target_key=eq.'+encodeURIComponent(key);
  const r=await fetch(url,{method:'DELETE',headers:{...sbHeaders(true),'Prefer':'return=minimal'}});
  if(!r.ok){let msg='';try{const j=await r.json();msg=j.message||'';}catch(e){msg=await r.text();} throw new Error(msg||('删除失败：'+r.status));}
}
async function rcSaveNote(){
  if(!RC_NOTE_TARGET)return;
  const {scope,key}=RC_NOTE_TARGET, txt=String($('rcNoteText').value||'').trim();
  RC_NOTES=rcNormalizeNotes(RC_NOTES); if(!RC_NOTES[scope]) RC_NOTES[scope]={};
  if(txt) RC_NOTES[scope][key]={note:txt}; else delete RC_NOTES[scope][key];
  rcSaveNotes(); rcCloseNote(); render();
  if(isNoteAdminMode()){try{await sbUpsertNote(scope,key,txt);rcStatus('备注已保存到数据库');await sbLoadNotesFromDatabase(false);}catch(e){rcStatus('数据库保存失败');alert(e.message||e);}}
}
async function rcDeleteNote(){
  if(!RC_NOTE_TARGET)return;
  const {scope,key}=RC_NOTE_TARGET;
  RC_NOTES=rcNormalizeNotes(RC_NOTES); if(RC_NOTES[scope]) delete RC_NOTES[scope][key];
  rcSaveNotes(); rcCloseNote(); render();
  if(isNoteAdminMode()){try{await sbDeleteNote(scope,key);rcStatus('备注已从数据库删除');await sbLoadNotesFromDatabase(false);}catch(e){rcStatus('数据库删除失败');alert(e.message||e);}}
}
try{document.addEventListener('DOMContentLoaded',()=>{applyNoteAdminMode(); sbSetSession(sbGetSession()); sbLoadNotesFromDatabase(false);});}catch(e){}




const HIDDEN_SCHOOL_BADGE_TEXT = new Set(['985','211','双一流','一流','顶尖','强校','保研','保研/强校','民办/独立','普通公办','公办','独立学院','民办','985/顶尖','211/双一流']);
function cleanSchoolDisplayBadges(){
  document.querySelectorAll('#schoolList .badge-mini,#schoolList span,.school-header .pill,.school-header span').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(HIDDEN_SCHOOL_BADGE_TEXT.has(t) || /^学校加权/.test(t) || /^院校加权/.test(t)) el.remove();
  });
}
try{document.addEventListener('DOMContentLoaded',()=>{cleanSchoolDisplayBadges(); const obs=new MutationObserver(()=>cleanSchoolDisplayBadges()); obs.observe(document.body,{childList:true,subtree:true});});}catch(e){}
