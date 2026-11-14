// 从旧版知识库（index.html + app.js）里，用旧版自己的函数把每所学校、每个专业组、每个专业的
// 展示结果算一遍，存成 JSON。新版只负责显示，不重新实现风险/命名/体检/特殊类型等规则，
// 这样新旧两版的判断结果完全一致。
// 用法：在仓库根目录起一个静态服务器（python3 -m http.server 8811），然后
//   node scripts/v2/extract-kb.js <输出文件> [index.html|specialty/index.html]
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..');
const OUT=process.argv[2]||'kb-raw.json';
const PAGE=process.argv[3]||'index.html';
const BASE=process.env.KB_BASE||'http://localhost:8811/';

(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage();
  // 旧版页面要登录才渲染；这里只读数据，用本地假会话，所有 Supabase 请求都在本地返回空。
  const exp=Math.floor(Date.now()/1000)+3600*5;
  const b64=s=>Buffer.from(JSON.stringify(s)).toString('base64url');
  const tok=b64({alg:'HS256'})+'.'+b64({sub:'u1',exp,role:'authenticated'})+'.x';
  await p.addInitScript(([tok,exp])=>{localStorage.setItem('js-plan-auth-v1',JSON.stringify({accessToken:tok,refreshToken:'r',expiresAt:exp,user:{id:'u1',email:'x@x'}}))},[tok,exp]);
  await p.route(/supabase\.co|\/sbapi\//,r=>{const u=r.request().url();let body='[]';
    if(/auth\/v1\/user/.test(u))body=JSON.stringify({id:'u1'});
    else if(/profiles/.test(u))body=JSON.stringify([{id:'u1',role:'admin',status:'active'}]);
    r.fulfill({status:200,contentType:'application/json',body});});
  await p.route(/giscus|github/,r=>r.abort());
  const dir=path.dirname(PAGE)==='.'?'':path.dirname(PAGE)+'/';
  await p.route(new RegExp(dir.replace('/','\\/')+'app\\.js(\\?|$)'),r=>{
    let src=fs.readFileSync(path.join(ROOT,dir,'app.js'),'utf8');
    src=src.replace(/\}\)\(\);\s*$/,'window.__ev=function(s){return eval(s)};\n})();');
    r.fulfill({status:200,contentType:'application/javascript',body:src});
  });
  p.on('pageerror',e=>console.error('pageerror',e.message));
  await p.goto(BASE+PAGE,{waitUntil:'load',timeout:300000});
  await p.waitForFunction(()=>!!window.__ev,null,{timeout:120000});
  await p.waitForTimeout(1500);
  const n=await p.evaluate(()=>window.__ev('DB.length'));
  console.log('schools entries',n);
  const out={meta:{},entries:[]};
  out.meta=await p.evaluate(()=>window.__ev(`({
    version:typeof VERSION!=='undefined'?VERSION:'',
    medCodes:typeof MEDICAL_CODE_META!=='undefined'?MEDICAL_CODE_META:{},
    labelsVersion:window.GROUP_LABELS_VERSION||'',
    riskVersion:window.ASSASSIN_RISK_VERSION||'',
    provinceRegionGroups:typeof provinceRegionGroups!=='undefined'?provinceRegionGroups:[],
    jsCityGroups:typeof JIANGSU_CITY_GROUPS!=='undefined'?JIANGSU_CITY_GROUPS:[],
    disciplineOrder:typeof disciplineOrder!=='undefined'?disciplineOrder:[],
    specialGroups:typeof specialTypeFacetGroups!=='undefined'?specialTypeFacetGroups:[],
    batches:(document.querySelector('#batchSelect')||document.querySelector('select'))?[...(document.querySelector('#batchSelect')||document.querySelector('select')).options].map(o=>[o.value,o.textContent]):[]
  })`));
  const CHUNK=60;
  for(let i=0;i<n;i+=CHUNK){
    const part=await p.evaluate(async([a,z])=>{
      const run=window.__ev(`(async function(a,z){
        const ar=x=>x?Array.from(x):[];
        const has=n=>{try{return typeof eval(n)==='function'}catch(e){return false}};
        const call=(n,...a)=>has(n)?eval(n)(...a):null;
        const pairs=list=>list.filter(([k,v])=>validInfoValue(v)).map(([k,v])=>[k,typeof v==='number'?v:String(v)]);
        const MED=Object.keys(typeof MEDICAL_CODE_META!=='undefined'?MEDICAL_CODE_META:{});
        const res=[];
        for(const s of DB.slice(a,z)){
          try{await call('ensureInlineMajorChangeSchool',s);}catch(e){}
          const d=representativeDetailForSchool(s);
          const pr=call('admissionPriorityInfo',s);
          const e={k:keySchool(s),name:s.name,prov:s.province,city:s.city,sub:s.subject,bat:s.batch,lv:s.level,
            ws:s.weightedScore,wr:s.weightedRank,region:call('displayRegionLabel',s)||s.city||'',facets:ar(call('schoolFacetValues',s)),
            levelText:call('schoolLevelDisplay',s,d)||'',
            priority:pr?{sev:pr.severity,label:pr.label,rules:pr.rules,title:pr.title}:null,
            info:pairs(schoolInfoPairs(s,d)),
            infoAddr:d.address||'',infoLevel:d.schoolLevel||'',infoPublic:d.publicPrivate||'',
            groups:[]};
          for(const g of s.groups||[]){
            const q=groupQuality(s,g);
            const naming=call('groupNamingMeta',s,g);
            const pred=call('groupScoreEstimate',s,g);
            const guide=call('batchGuideDef',s,g);
            const cg=call('inlineMajorChangeGroup',s,g);
            const majors=[...g.majors].sort(majorSortByThreeYear);
            const matches=cg?matchInlineMajorChangeRows(majors,cg):new Map();
            const gk=keyGroup(s,g);
            const ge={k:gk,id:g.id,code:g.groupCode,dc:g.displayCode,name:g.groupName,title:groupDisplayTitleText(s,g),
              req:g.requirement,p26:g.plan26,p25:g.plan25,s26e:g.score26Eq,r26e:g.rank26Eq,
              s25:g.score25,r25:g.rank25,s24:g.score24,r24:g.rank24,s23:g.score23,r23:g.rank23,
              summary:g.majorSummary,cls:g.majorClasses||[],tags:g.tags||[],remark:g.remark,
              q:[q.tone,q.label,q.title],
              naming:naming?{name:naming.name,simple:naming.simpleName,risk:naming.riskLevel,main:naming.mainDirection,riskMajor:naming.riskMajor}:null,
              spec:ar(call('groupSpecialTypeValues',s,g)),plan:call('groupPlanCategoryValues',s,g)||[],train:ar(call('groupTrainingModeValues',s,g)),zkKind:call('specialtyBatchKind',s,g)||'',
              guide:guide?{id:guide.id,channel:guide.channel,scope:guide.scope,title:guide.title,summary:guide.summary,ok:!!call('batchGuideEligibleForBatch',guide,s,g)}:null,
              pred:pred?{s:pred.score,r:pred.rank,c:pred.confidence,why:pred.reason}:null,
              anchor:call('groupRiskAnchorScore',s,g),wm:call('groupWeightedMajorScoreValue',g),
              coopN:call('foreignCoopCountForGroup',g)||0,
              cut26:cg&&cg.cutoff26&&num(cg.cutoff26.score)!==null?[num(cg.cutoff26.score),num(cg.cutoff26.rank)]:null,
              change:GROUP_CHANGES[groupChangeKey(s,g)]||null,
              majors:[],deleted:[]};
            for(const m of majors){
              const rk=majorRiskMeta(s,g,m);
              const coop=call('foreignCoopDetailForMajor',m);
              const dd=detailOf(m);
              const meds=MED.filter(c=>{try{return medicalRuleMatched(c,m)}catch(_){return false}});
              const dur=majorDurationShort(m.duration||dd.duration||dd.degreeYears);
              const fee=tuitionNumber(m.tuition||dd.tuition||dd.foreignCoopTuition);
              const tier=call('lectureTierMeta',m);
              ge.majors.push({key:m.key,id:m.identityKey,code:m.code,name:m.name,base:m.baseName,cls:m.majorClass,disc:m.discipline,
                p26:m.plan26,p25:m.plan25,pc:m.planChange,s25:m.score25,r25:m.rank25,s24:m.score24,s23:m.score23,
                a3:m.avgScore3,ar3:m.avgRank3,ay:m.avgYears,isNew:m.isNew||'',req:m.subjectRequirement||'',
                risk:rk&&rk.risk?[rk.tone,rk.label,rk.reason]:null,
                med:meds,dur:dur||'',fee:fee,tier:tier&&tier.label?[tier.rank,tier.label,tier.bucket]:null,
                chg:cg?inlineMajorChangeClass(m,matches.get(m),cg).replace('major-change-',''):'',
                coop:coop&&has('foreignCoopConcisePairs')?pairs(foreignCoopConcisePairs(coop)):null,
                q:{tuition:m.tuition||dd.tuition||'',lang:dd.foreignLanguage||dd.languageRequirement||'',remark:m.remark||dd.majorRemark||'',adm:dd.admissionRule||''}
              });
            }
            if(cg&&has('inlineMajorChangeDeletedRows'))ge.deleted=inlineMajorChangeDeletedRows(majors,matches,cg).map(r=>({name:r.name25||r.name,cls:r.category||'',p25:r.plan25,s25:r.score25,r25:r.rank25}));
            e.groups.push(ge);
          }
          res.push(e);
        }
        return res;
      })`);
      return run(a,z);
    },[i,Math.min(n,i+CHUNK)]);
    out.entries.push(...part);
    process.stdout.write(`\r${out.entries.length}/${n}`);
  }
  // 学校层面的“位置与宿舍生活信息”：每个校名一份
  const names=[...new Set(out.entries.map(e=>e.name))];
  out.life=await p.evaluate(names=>window.__ev(`(function(names){const o={};for(const n of names){const x=parentSchoolInfo(n);if(x)o[n]=x;}return o;})`)(names),names);
  console.log('\nlife matched',Object.keys(out.life).length,'/',names.length);
  fs.writeFileSync(OUT,JSON.stringify(out));
  console.log('written',OUT,(fs.statSync(OUT).size/1e6).toFixed(1),'MB');
  await b.close();
})();
