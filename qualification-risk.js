(function(){
'use strict';

const LEVEL_RANK={pass:0,info:1,pending:2,warning:3,block:4};
const LEVEL_TONE={pass:'green',info:'blue',pending:'yellow',warning:'orange',block:'red'};
const LEVEL_LABEL={pass:'资格通过',info:'资格提示',pending:'资格待核对',warning:'资格强提醒',block:'资格不符'};

function textOf(v){
  if(v===null||v===undefined)return '';
  if(Array.isArray(v))return v.map(textOf).filter(Boolean).join(' ');
  if(typeof v==='object')return Object.values(v).map(textOf).filter(Boolean).join(' ');
  return String(v).trim();
}
function hasText(v){return textOf(v)!=='';}
function num(v){
  const m=String(v??'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);
  return m?Number(m[0]):null;
}
function yesNo(v){
  const t=textOf(v);
  if(!t)return '';
  if(/^(是|接受|可以|愿意|合格|通过|有)$/i.test(t))return 'yes';
  if(/^(否|不接受|不可以|不愿意|不合格|未参加|无)$/i.test(t))return 'no';
  return t;
}
function firstValue(data,keys){
  for(const k of keys){
    if(hasText(data?.[k]))return data[k];
  }
  return '';
}
function normalizeStudent(student){
  const data=(student&&typeof student.intake_payload==='object'&&!Array.isArray(student.intake_payload))?student.intake_payload:{};
  return {
    language:textOf(student?.foreign_language||firstValue(data,['外语语种','高考语种','高考外语语种','外语'])),
    oral:yesNo(student?.oral_exam_status||firstValue(data,['外语口试','外语口试成绩','口语测试','英语口试'])),
    gender:textOf(student?.gender&&student.gender!=='未知'?student.gender:firstValue(data,['性别'])),
    political:textOf(student?.political_status||firstValue(data,['政治面貌','政治身份'])),
    fresh:textOf(student?.fresh_graduate_status||firstValue(data,['应届状态','应往届','考生类别'])),
    household:textOf(student?.household_region||firstValue(data,['户籍地','生源地','户口所在地'])),
    ethnicity:textOf(student?.ethnicity||firstValue(data,['民族'])),
    colorVision:textOf(student?.color_vision_status||firstValue(data,['色觉','色觉状态'])),
    height:num(student?.height_cm||firstValue(data,['身高','身高cm','身高_cm'])),
    budget:num(student?.annual_budget||firstValue(data,['年预算','预算上限','年预算上限'])),
    acceptEnglish:yesNo(student?.accept_english_teaching||firstValue(data,['是否接受全英文授课','接受全英文授课'])),
    acceptProcess:yesNo(student?.accept_interview_physical_test||firstValue(data,['是否接受政审体测面试','是否接受面试/体测/政审','接受面试体测政审'])),
    scores:{
      英语:num(student?.foreign_language_score||firstValue(data,['英语成绩','外语成绩','高考英语','英语'])),
      外语:num(student?.foreign_language_score||firstValue(data,['外语成绩','英语成绩','高考外语'])),
      数学:num(student?.math_score||firstValue(data,['数学成绩','数学'])),
      语文:num(student?.chinese_score||firstValue(data,['语文成绩','语文']))
    }
  };
}
function sourceText(ctx){
  const s=ctx.school||{}, g=ctx.group||{}, m=ctx.major||{}, d=ctx.details||{};
  return [
    s.name,s.level,s.schoolType,s.publicPrivate,
    g.groupName,g.groupCode,g.requirement,g.majorSummary,g.rawGroupMajors,(g.tags||[]).join(' '),
    m.name,m.majorClass,m.discipline,m.majorRemark,m.remark,m.note,m.rawGroupMajors,
    d.name,d.majorFullName,d.undergraduateName,d.majorRemark,d.majorClass,d.discipline,d.subjectMajor,d.recruitChapter,d.admissionRule,d.foreignCoopOtherInfo,d.foreignCoopTeachingLanguage,d.foreignCoopEvaluation,d.foreignCoopTuition,d.foreignCoopCampus
  ].map(textOf).filter(Boolean).join(' ');
}
function addScoreRules(text,rules){
  const re=/(英语|外语|数学|语文)(?:单科)?(?:成绩|分数)?(?:须|需|要求|不低于|不少于|达到|达|≥|>=|在)?\s*(?:不低于|不少于|达到|达|≥|>=)?\s*(\d{2,3})\s*分?/g;
  let match;
  while((match=re.exec(text))){
    const subject=match[1]==='外语'?'外语':match[1];
    rules.singleScores.push({subject,value:Number(match[2]),source:match[0]});
  }
}
function parseRules(text,ctx){
  const rules={language:null,singleScores:[],oral:false,gender:null,genderCaution:'',political:null,fresh:null,household:false,process:[],physical:{color:[],heightMin:null,vision:false,smell:false},warnings:[]};
  if(/只招英语|限英语|英语语种考生|外语语种.{0,8}英语/.test(text))rules.language={allowed:['英语'],severity:'block',source:'只招英语语种考生'};
  else if(/非英语.{0,8}慎报|建议英语|英语基础|入学后.{0,12}英语|全英文授课|英文授课/.test(text))rules.language={allowed:['英语'],severity:'warning',source:'英语授课或建议英语语种'};
  addScoreRules(text,rules);
  if(/外语口试|英语口试|口试.{0,8}合格/.test(text))rules.oral=true;
  if(/只招男生|只招男|仅招男/.test(text))rules.gender={allowed:['男'],source:'只招男生'};
  else if(/只招女生|只招女|仅招女/.test(text))rules.gender={allowed:['女'],source:'只招女生'};
  if(/女生慎报|男生慎报|性别比例|适合男生|适合女生/.test(text))rules.genderCaution='专业备注含性别倾向或慎报提示';
  if(/中共党员|共产党员/.test(text)&&/共青团员/.test(text))rules.political={allowed:['中共党员','预备党员','共青团员'],source:'需为中共党员或共青团员'};
  else if(/中共党员|共产党员/.test(text))rules.political={allowed:['中共党员','预备党员'],source:'需为中共党员'};
  else if(/共青团员/.test(text))rules.political={allowed:['共青团员','中共党员','预备党员'],source:'需为共青团员或党员'};
  if(/应届/.test(text)&&!/往届/.test(text))rules.fresh={allowed:['应届'],source:'应届生要求'};
  if(/户籍|生源地|地方专项|乡村教师|定向医学生|区域计划/.test(text))rules.household=true;
  ['面试','体测','政审','体检'].forEach(k=>{if(new RegExp(`须.{0,6}${k}|参加.{0,6}${k}|${k}.{0,4}合格`).test(text))rules.process.push(k);});
  if(/色盲.{0,6}(不予录取|限报|不宜|不能)|色觉异常/.test(text))rules.physical.color.push('色盲');
  if(/色弱.{0,6}(不予录取|限报|不宜|不能)/.test(text))rules.physical.color.push('色弱');
  const hm=text.match(/身高.{0,8}(?:不低于|不少于|达到|≥|>=)\s*(\d{3})\s*cm?/);
  if(hm)rules.physical.heightMin=Number(hm[1]);
  if(/裸眼视力|矫正视力|视力.{0,8}(?:4\.8|5\.0|不低于)/.test(text))rules.physical.vision=true;
  if(/嗅觉迟钝|嗅觉/.test(text))rules.physical.smell=true;
  const tuition=num(ctx.major?.tuition??ctx.details?.tuition);
  if(/全英文授课|英文授课/.test(text))rules.warnings.push('全英文授课，需确认学生接受度');
  if(tuition!==null&&tuition>10000)rules.warnings.push(`学费较高：${tuition} 元/年`);
  if(/中外合作|境外|出国|马来西亚|英国|澳大利亚|美国|加拿大/.test(text))rules.warnings.push('培养模式或地点特殊，需确认家庭接受度');
  return rules;
}
function evaluate(ctx={}){
  const student=normalizeStudent(ctx.student||{});
  const text=sourceText(ctx);
  const rules=parseRules(text,ctx);
  const issues=[];
  const add=(level,category,label,message,source)=>issues.push({level,tone:LEVEL_TONE[level],category,label,message,source:source||''});
  if(rules.language){
    if(!student.language)add('pending','language','语种待核对',`${rules.language.source}，学生外语语种未填。`,rules.language.source);
    else if(!rules.language.allowed.some(x=>student.language.includes(x)))add(rules.language.severity==='block'?'block':'warning','language','语种不符',`${rules.language.source}，当前学生外语语种为 ${student.language}。`,rules.language.source);
  }
  rules.singleScores.forEach(r=>{
    const score=student.scores[r.subject]??(r.subject==='外语'?student.scores.英语:null);
    if(score===null||score===undefined)add('pending','score','单科待核对',`${r.subject}单科要求 ≥${r.value}，学生${r.subject}成绩未填。`,r.source);
    else if(score<r.value)add('block','score','单科不符',`${r.subject}单科要求 ≥${r.value}，当前 ${score}。`,r.source);
  });
  if(rules.oral){
    if(!student.oral)add('pending','oral','口试待核对','专业要求外语口试，学生口试状态未填。','外语口试');
    else if(!/合格|通过|yes/i.test(student.oral))add('block','oral','口试不符',`专业要求外语口试合格，当前为 ${student.oral}。`,'外语口试');
  }
  if(rules.gender){
    if(!student.gender)add('pending','gender','性别待核对',`${rules.gender.source}，学生性别未填。`,rules.gender.source);
    else if(!rules.gender.allowed.includes(student.gender))add('block','gender','性别不符',`${rules.gender.source}，当前学生性别为 ${student.gender}。`,rules.gender.source);
  }else if(rules.genderCaution)add('warning','gender','性别提醒',rules.genderCaution,rules.genderCaution);
  if(rules.political){
    if(!student.political)add('pending','political','政治面貌待核对',`${rules.political.source}，学生政治面貌未填。`,rules.political.source);
    else if(!rules.political.allowed.some(x=>student.political.includes(x)))add('block','political','政治面貌不符',`${rules.political.source}，当前为 ${student.political}。`,rules.political.source);
  }
  if(rules.fresh){
    if(!student.fresh)add('pending','fresh','应往届待核对',`${rules.fresh.source}，学生应届状态未填。`,rules.fresh.source);
    else if(!rules.fresh.allowed.some(x=>student.fresh.includes(x)))add('block','fresh','应届状态不符',`${rules.fresh.source}，当前为 ${student.fresh}。`,rules.fresh.source);
  }
  if(rules.household){
    if(!student.household)add('pending','household','户籍待核对','专业或批次疑似有户籍/生源地/定向要求，学生户籍地未填。','户籍/生源地');
    else add('warning','household','户籍要求',`备注含户籍/生源地/定向要求，当前户籍信息：${student.household}，需人工核对。`,'户籍/生源地');
  }
  if(rules.process.length){
    if(!student.acceptProcess)add('pending','process','流程待核对',`需核对 ${rules.process.join('、')} 要求，学生是否接受/通过未填。`,rules.process.join('、'));
    else if(student.acceptProcess==='no')add('block','process','流程不符',`专业需要 ${rules.process.join('、')}，学生档案显示不接受或未通过。`,rules.process.join('、'));
    else add('info','process','特殊流程',`需要 ${rules.process.join('、')}，请按招生章程核对时间和材料。`,rules.process.join('、'));
  }
  if(rules.warnings.some(w=>/全英文/.test(w))&&student.acceptEnglish==='no'){
    add('warning','language','英文授课不接受','专业含全英文授课提示，学生档案显示不接受全英文授课。','全英文授课');
  }
  if(rules.physical.color.length){
    if(!student.colorVision)add('pending','physical','色觉待核对',`专业备注含 ${rules.physical.color.join('、')} 限制，学生色觉状态未填。`,'色觉限制');
    else if(rules.physical.color.some(x=>student.colorVision.includes(x)))add('block','physical','色觉不符',`专业备注含 ${rules.physical.color.join('、')} 限制，当前学生色觉：${student.colorVision}。`,'色觉限制');
  }
  if(rules.physical.heightMin){
    if(!student.height)add('pending','physical','身高待核对',`专业要求身高不低于 ${rules.physical.heightMin}cm，学生身高未填。`,'身高要求');
    else if(student.height<rules.physical.heightMin)add('block','physical','身高不符',`专业要求身高不低于 ${rules.physical.heightMin}cm，当前 ${student.height}cm。`,'身高要求');
  }
  if(rules.physical.vision)add('pending','physical','视力待核对','专业备注含视力要求，需结合学生裸眼/矫正视力核对。','视力要求');
  if(rules.physical.smell)add('pending','physical','嗅觉待核对','专业备注含嗅觉要求，需结合体检结果核对。','嗅觉要求');
  rules.warnings.forEach(w=>add('info','notice','资格提示',w,w));
  const worst=issues.reduce((acc,x)=>LEVEL_RANK[x.level]>LEVEL_RANK[acc]?x.level:acc,'pass');
  return {
    level:worst,
    tone:LEVEL_TONE[worst],
    label:issues[0]?.label||LEVEL_LABEL[worst],
    issues,
    summary:issues.map(x=>`${LEVEL_LABEL[x.level]}：${x.message}`).join('；'),
    rules
  };
}

window.QualificationRisk={evaluate,LEVEL_RANK,LEVEL_LABEL,LEVEL_TONE};
})();
