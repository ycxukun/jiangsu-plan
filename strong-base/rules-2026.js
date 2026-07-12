(function(){
  'use strict';

  const ORIGINAL_NOTICE = '原稿口径，尚未完成 2026 官方简章与江苏分省计划复核；仅用于建立研究清单，不代表具备报名资格。';
  const checked = (sourceRefs, status='needs_official_plan') => ({
    status,
    year: 2026,
    province: '江苏',
    sourceType: '用户提供的培训原稿',
    lastVerified: '2026-07-12',
    sourceRefs,
    notice: ORIGINAL_NOTICE
  });

  window.STRONG_BASE_RULES_2026 = {
    meta: {
      year: 2026,
      province: '江苏',
      version: '2026.07.12-source-baseline-r1',
      schoolCount: 39,
      sourceCount: 6,
      disclaimer: '院校规则与江苏分省专业必须以学校 2026 官方招生简章、阳光高考和江苏省考试院公布信息为最终依据。',
      policy: '先核对年份、省份、选科、江苏计划、健康与语言限制，再进入策略比较。任何降分、转段或录取结果均不作保证。'
    },
    sources: [
      'source-2026-core','source-guide','source-interview','source-trend','source-choice','source-national'
    ],
    schools: [
      {
        id:'pku',name:'北京大学',city:'北京',region:'华北',tier:'清北',scoreBand:'690+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'高考成绩 6 倍入围；竞赛破格另行审核',
        formula:'综合成绩原稿口径：高考 85% + 笔试 10% + 面试 5%',multiplier:'6 倍',applicationMode:'专业组报名',
        majorTags:['基础学科','信息计算','应用物理','基础医学','文史哲'],
        sourceMajorDirections:['数学类（含信息与计算方向）','物理学类（含应用物理方向）','化学类','生物科学类','力学类','基础医学（八年制）','文史哲'],
        jiangsuMajors:[],transferPolicy:'原稿称本研衔接可申请关键交叉领域，入校后原则上不得转专业。',
        riskNotes:['理科笔试数理化强度高','专业组描述在原稿中有重叠冲突','必须按江苏计划核对具体专业'],
        fit:['basic','post-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-national'])
      },
      {
        id:'thu',name:'清华大学',city:'北京',region:'华北',tier:'清北',scoreBand:'690+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'高考成绩 6 倍入围；竞赛破格另行审核',
        formula:'综合成绩原稿口径：高考 85% + 笔试 10% + 面试 5%',multiplier:'6 倍',applicationMode:'全校多专业排序（原稿称最多 8 个）',
        majorTags:['基础学科','理工双学位','航空航天','新材料','文史哲'],
        sourceMajorDirections:['致理书院','未央书院','探微书院','行健书院','日新书院'],
        jiangsuMajors:[],transferPolicy:'书院培养与本研衔接方向须按当年培养方案逐项核对，不将研究生申请方向等同本科专业。',
        riskNotes:['数理化/数语史笔试门槛极高','书院分流与衔接方向并非无条件任选'],
        fit:['basic','post-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-national'])
      },
      {
        id:'ruc',name:'中国人民大学',city:'北京',region:'华北',tier:'华五人',scoreBand:'660+',
        testStage:'出分前',testMode:'初试 + 面试',entryRule:'原稿称初试筛选后按计划 4 倍进入复试',
        formula:'原稿称初试 60% + 面试 40%，综合成绩仍需以简章为准',multiplier:'4 倍',applicationMode:'按专业报名',
        majorTags:['数据计算','智能科学','文史哲'],sourceMajorDirections:['数据计算及应用（智能科学/数据智能）','汉语言文学（古文字）','历史学','哲学'],
        jiangsuMajors:[],transferPolicy:'原稿称部分方向直博导向，必须核对届别、培养方案和退出机制。',
        riskNotes:['出分前校测存在锁档决策风险','笔面合格线在原稿中口径不一'],fit:['new-engineering','humanities','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice'])
      },
      {
        id:'bit',name:'北京理工大学',city:'北京',region:'华北',tier:'中坚 985',scoreBand:'650+',
        testStage:'出分后',testMode:'仅面试（可能含专业追问）',entryRule:'原稿称高考成绩 + 数学单科 ×0.2，按 4 倍入围',
        formula:'加权入围；最终综合成绩与小破格有效范围待核',multiplier:'4 倍',applicationMode:'按专业报名',
        majorTags:['智能无人','机器人','微电子','力学','材料'],sourceMajorDirections:['数学与应用数学（机器人）','应用物理学（微电子）','智能无人系统技术','工程力学','材料科学与工程','化学'],
        jiangsuMajors:[],transferPolicy:'原稿称动态淘汰严格，挂科与退班后果需逐字核对官方培养办法。',
        riskNotes:['新工科方向可能与普通批倒挂','数学满分“小破格”不等于录取'],fit:['new-engineering','traditional-engineering','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'])
      },
      {
        id:'buaa',name:'北京航空航天大学',city:'北京',region:'华北',tier:'中坚 985',scoreBand:'650+',
        testStage:'出分前',testMode:'上机初试 + 面试',entryRule:'原稿称初试后按 5 倍进入复试，初试不计最终综合成绩',
        formula:'初试科目含数学、航空航天基础及专业科目，分值口径冲突',multiplier:'5 倍',applicationMode:'单专业报名',
        majorTags:['信息计算','应用物理','测控','航空航天','力学'],sourceMajorDirections:['信息与计算科学（智能）','应用物理学（电子）','测控技术与仪器（量子）','航空航天类','材料','力学'],
        jiangsuMajors:['应用物理学（电子科学方向，原稿提及）','测控技术与仪器（量子方向，原稿提及）'],transferPolicy:'理工衔接与研究生方向按培养方案核验。',
        riskNotes:['原稿明确称航空航天专业不对江苏招生','航空航天基础分值有 60 分/10 分冲突','出分前校测'],fit:['new-engineering','traditional-engineering','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'muc',name:'中央民族大学',city:'北京',region:'华北',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称高考成绩 6 倍入围',
        formula:'原稿称笔试 40% + 面试 60%，校考设合格线',multiplier:'6 倍',applicationMode:'按专业报名',
        majorTags:['历史','哲学','古文字'],sourceMajorDirections:['历史学','哲学','中国少数民族语言文学（古文字方向）'],
        jiangsuMajors:[],transferPolicy:'主要为人文基础学科长期培养。',
        riskNotes:['古文字具体语种与招生省份高度受限','必须先核江苏计划'],fit:['humanities','post-written','strict'],recommendable:true,verification:checked(['source-2026-core','source-interview'])
      },
      {
        id:'bnu',name:'北京师范大学',city:'北京',region:'华北',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称 5 倍并设超线门槛，部分单科高分可进入扩展范围',
        formula:'笔试与面试各 50% 的原稿口径待核',multiplier:'5 倍',applicationMode:'学科大类/专业报名',
        majorTags:['数学智能','物理','化生','文史哲'],sourceMajorDirections:['数学类（含智能方向）','物理学','化学','生物科学','历史学','哲学','汉语言文学'],
        jiangsuMajors:[],transferPolicy:'大类内方向分流和培养路径需核对。',
        riskNotes:['江苏计划少且专业可能打包','二次选拔风险'],fit:['basic','humanities','post-written','strict'],recommendable:true,verification:checked(['source-2026-core','source-choice'])
      },
      {
        id:'cau',name:'中国农业大学',city:'北京',region:'华北',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称 4 倍入围，数学高分在扩展倍数内可触发小破格',
        formula:'物理、化学、生物笔试与面试权重待官方核验',multiplier:'4 倍',applicationMode:'按专业报名',
        majorTags:['生物科学','生物育种','农学'],sourceMajorDirections:['生物科学','生物育种科学'],
        jiangsuMajors:[],transferPolicy:'以农业生命科学基础研究和育种方向为主。',
        riskNotes:['色弱色盲限制','不得只为 985 层次忽视真实农学生物兴趣'],fit:['basic','post-written','strict'],recommendable:true,verification:checked(['source-2026-core','source-choice'])
      },
      {
        id:'fdu',name:'复旦大学',city:'上海',region:'华东',tier:'华五人',scoreBand:'660+',
        testStage:'出分前',testMode:'初试笔试 + 复试面试',entryRule:'原稿称初试后按 3 倍进入复试，无高考单科加权',
        formula:'校测 150 分：笔试 100 + 面试 50；综合成绩高考 85% + 校测 15%',multiplier:'3 倍',applicationMode:'学科大类报名',
        majorTags:['信息计算','物理芯片','基础医学','化生','文史哲'],sourceMajorDirections:['数学与应用数学','信息与计算科学','物理学','化学','生物科学','基础医学','文史哲'],
        jiangsuMajors:[],transferPolicy:'原稿显示转段仍有硕士与博士不同去向，不可概括为全员强制直博。',
        riskNotes:['出分前锁档风险','初试难度高','跨工科统计属于历史样本'],fit:['basic','new-engineering','humanities','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice','source-trend'])
      },
      {
        id:'sjtu',name:'上海交通大学',city:'上海',region:'华东',tier:'华五人',scoreBand:'660+',
        testStage:'出分前',testMode:'笔试 + 面试',entryRule:'原稿称专业组笔试后按 4 倍入围面试',
        formula:'校测 150 分：笔试 100 + 面试 50；综合成绩高考 85% + 校测 15%',multiplier:'4 倍',applicationMode:'专业组报名',
        majorTags:['数学物理','生医工','船舶','材料','力学'],sourceMajorDirections:['数学','物理','生物医学工程','工程力学','船舶与海洋工程','材料科学与工程','化学生物医学'],
        jiangsuMajors:[],transferPolicy:'原稿历史转段数据显示直博比例高，但非“保证直博”；专业调整规则需按 2026 简章。',
        riskNotes:['出分前锁档风险','专业组和调剂后果','江苏各专业计划数需核'],fit:['basic','traditional-engineering','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice','source-trend'])
      },
      {
        id:'tongji',name:'同济大学',city:'上海',region:'华东',tier:'中坚 985',scoreBand:'650+',
        testStage:'出分前',testMode:'初试笔试 + 面试',entryRule:'原稿称按专业组初试并以 4 倍进入复试',
        formula:'组 1 数理、组 2 化学等科目口径待核',multiplier:'4 倍',applicationMode:'专业组报名',
        majorTags:['数学智能','物理芯片','力学','海洋','化生'],sourceMajorDirections:['数学与应用数学（智能）','应用物理学','工程力学','海洋科学','化学','生物技术'],
        jiangsuMajors:['数学类/智能方向（原稿提及）','应用物理学（原稿提及）'],transferPolicy:'原稿称部分专业直博导向和理工衔接较好，需按届别核验。',
        riskNotes:['原稿对竞赛破格出现“仅金牌”和“银牌免初试”直接冲突','江苏计划极少','出分前校测'],fit:['new-engineering','traditional-engineering','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'ecnu',name:'华东师范大学',city:'上海',region:'华东',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称理科按数学、文科按语文进行单科加权后 4 倍入围',
        formula:'理科高考 + 数学×0.5；文科高考 + 语文×0.5（原稿口径）',multiplier:'4 倍',applicationMode:'按专业报名',
        majorTags:['数学','物理','生物','哲学','古文字'],sourceMajorDirections:['数学与应用数学','物理学','生物科学','哲学','汉语言文学（古文字）'],
        jiangsuMajors:[],transferPolicy:'原稿观点称理工衔接有限，需用官方培养方案替代价值判断。',
        riskNotes:['动态淘汰与 AI 面试说法需核','留沪诉求可能抬高竞争'],fit:['basic','humanities','post-written','strict'],recommendable:true,verification:checked(['source-2026-core','source-choice'])
      },
      {
        id:'tju',name:'天津大学',city:'天津',region:'华北',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试（原稿口径）',entryRule:'按专业采用数学/物理/化学不同加权并约 5 倍入围',
        formula:'数学×0.4、物理/化学×0.6 等公式因专业而异',multiplier:'5 倍',applicationMode:'单专业报名',
        majorTags:['智能科学','合成生物','船舶','力学','能动'],sourceMajorDirections:['数学与应用数学（智能）','应用物理','化学','合成生物学','工程力学','能源与动力','船舶与海洋工程'],
        jiangsuMajors:['智能科学方向（原稿提及）','船舶与海洋工程（原稿提及）','合成生物学（原稿提及）'],transferPolicy:'部分工程方向与直博说法需按专业和届别拆分。',
        riskNotes:['不同专业公式不能混用','加权成绩与最终录取公式可能不同','培养考核要求严格'],fit:['new-engineering','traditional-engineering','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'nankai',name:'南开大学',city:'天津',region:'华北',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试（可能现场做题）',entryRule:'原稿称按专业对核心科目 1.5 口径加权后 5 倍入围',
        formula:'“1.5 倍”是总乘还是额外加权必须按官方公式核验',multiplier:'5 倍',applicationMode:'单专业报名',
        majorTags:['信息计算','数学','物理','化生','文史哲'],sourceMajorDirections:['信息与计算科学（人工智能）','数学','物理','化学','生物','历史','哲学'],
        jiangsuMajors:['信息与计算科学（原稿提及）'],transferPolicy:'信息与计算方向培养学院和转段路径须按 2026 方案核对。',
        riskNotes:['仅面试不等于不做题','加权公式易误读'],fit:['new-engineering','basic','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'nju',name:'南京大学',city:'南京',region:'华东',tier:'华五人',scoreBand:'660+',
        testStage:'出分前',testMode:'初试 + 复试面试',entryRule:'原稿称初试后按 3 倍进入复试；理科数理探究、文科阅读表达',
        formula:'南大考核 150 分：初试 50 + 复试 100；综合成绩高考 85% + 校测 15%',multiplier:'3 倍',applicationMode:'单专业报名',
        majorTags:['数学智能','信息计算','物理芯片','大气','文史哲'],sourceMajorDirections:['数学与应用数学（智能）','信息与计算科学','物理学（电子/天文/大气）','化学','生物','文史哲'],
        jiangsuMajors:['数学与应用数学（智能科学方向，原稿提及）','信息与计算科学（原稿提及）','物理学（电子科学方向，原稿提及）'],transferPolicy:'原稿称原则上不允许跨专业转段；应把招生专业、方向和转段申请分别展示。',
        riskNotes:['江苏本省竞争强','出分前锁档风险','专业名额与方向需按江苏计划'],fit:['new-engineering','basic','humanities','early-written','strict'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'seu',name:'东南大学',city:'南京',region:'华东',tier:'中坚 985',scoreBand:'650+',
        testStage:'出分前',testMode:'笔试 + 面试',entryRule:'原稿称按初试后 4 倍进入复试',
        formula:'校测原稿口径：笔试 100 + 面试 50',multiplier:'4 倍',applicationMode:'单专业报名',
        majorTags:['数学智能','物理电子','化学','哲学'],sourceMajorDirections:['数学（智能科学）','物理学（电子科学）','化学','哲学'],
        jiangsuMajors:['数学（智能科学方向，原稿提及）','物理学（电子科学方向，原稿提及）'],transferPolicy:'原稿历史样本显示理工衔接较宽，不能视为保证。',
        riskNotes:['出分前校测','色觉与体测要求','奖牌须与专业对应'],fit:['new-engineering','basic','early-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'xjtu',name:'西安交通大学',city:'西安',region:'西北',tier:'中坚 985',scoreBand:'650+',
        testStage:'出分前',testMode:'初试 + 复试',entryRule:'原稿称初试后按 4 倍进入复试',
        formula:'原稿称复试笔试与面试各 50%；最终公式待核',multiplier:'4 倍',applicationMode:'单专业报名',
        majorTags:['数学智能','储能','核工程','力学','能动'],sourceMajorDirections:['数学（智能科学）','物理学','生物','核工程','力学','材料','能源动力','储能','哲学'],
        jiangsuMajors:['数学（智能科学方向，原稿提及）','物理学类（原稿提及）','储能科学与工程（原稿提及）'],transferPolicy:'原稿称理工衔接较宽，但比例、直博要求和方向必须分届别核验。',
        riskNotes:['出分前校测','仅可填 1 个专业的原稿口径','体测要求'],fit:['new-engineering','traditional-engineering','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'nwafu',name:'西北农林科技大学',city:'杨凌',region:'西北',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称数学、生物各 0.5 加权后按 5 倍入围',
        formula:'数学×0.5 + 生物×0.5；单科高分扩展规则待核',multiplier:'5 倍',applicationMode:'按专业报名',
        majorTags:['生物育种','农学'],sourceMajorDirections:['生物育种科学'],
        jiangsuMajors:[],transferPolicy:'以农林生命科学长期培养为主。',
        riskNotes:['色弱色盲限制','地域和长期专业接受度','非改革省公式不同'],fit:['basic','interview-only','strict'],recommendable:true,verification:checked(['source-2026-core','source-choice'])
      },
      {
        id:'npu',name:'西北工业大学',city:'西安',region:'西北',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试（可能现场做题）',entryRule:'原稿称 4 倍入围并设总分门槛，数学高分有扩展规则',
        formula:'高考入围 + 校测面试；具体折算待核',multiplier:'4 倍',applicationMode:'多专业报名（原稿称可填 3 个）',
        majorTags:['航空航天','船舶','智能科学','材料'],sourceMajorDirections:['航空航天类','船舶与海洋工程','数学（智能）','物理','化学'],
        jiangsuMajors:['船舶与海洋工程（原稿提及）','航空航天类（需核江苏计划）','智能科学方向（原稿提及）'],transferPolicy:'原稿建议直接选择王牌工科，理工衔接历史观点需数据支撑。',
        riskNotes:['仅面试可能现场做题','体测不合格风险','地域与行业路径需明确'],fit:['traditional-engineering','new-engineering','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'hust',name:'华中科技大学',city:'武汉',region:'华中',tier:'中坚 985',scoreBand:'650+',
        testStage:'出分后',testMode:'仅面试（可能现场做题）',entryRule:'原稿称 6 倍入围，部分单科极高分有小破格',
        formula:'最终综合成绩与小破格有效范围待核',multiplier:'6 倍',applicationMode:'多专业报名、分专业入围',
        majorTags:['数学智能','物理芯片','生医','化生'],sourceMajorDirections:['数学与应用数学（智能）','物理学（电子科学）','化学','生物','基础医学','文史哲'],
        jiangsuMajors:['物理学（电子科学方向，原稿提及）'],transferPolicy:'研究生转段加权、接收学院与名额需官方验证。',
        riskNotes:['小破格不等于录取','仅面试可能板书做题','面试合格线'],fit:['new-engineering','basic','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'whu',name:'武汉大学',city:'武汉',region:'华中',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称高考成绩 5 倍入围',
        formula:'原稿称校测笔试和面试各 50%',multiplier:'5 倍',applicationMode:'单专业报名',
        majorTags:['数学智能','物理','化生医','地球物理','文史哲'],sourceMajorDirections:['数学与应用数学（智能）','物理','化学','生物','基础医学','地球物理','文史哲'],
        jiangsuMajors:['数学与应用数学（智能科学方向，原稿称江苏重点候选）'],transferPolicy:'专业锁定和转段范围按 2026 培养方案。',
        riskNotes:['原稿称体测任一项不合格可能淘汰，需逐字核','信息学笔试内容的专业适用范围'],fit:['new-engineering','basic','humanities','post-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'scu',name:'四川大学',city:'成都',region:'西南',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称部分理科按高考 + 数学×0.4 后 4 倍入围',
        formula:'原稿称笔试 300 + 面试 450，并设笔试合格线',multiplier:'4 倍',applicationMode:'按专业报名',
        majorTags:['信息计算','物理力学','化生医','文史哲'],sourceMajorDirections:['数学','信息与计算科学','物理','力学','化学','生物','基础医学','文史哲'],
        jiangsuMajors:[],transferPolicy:'原稿对转工难度的描述属于经验观点，应以实际接收方案和名额为准。',
        riskNotes:['加权只适用部分专业','笔试合格线','医学生命方向长期培养'],fit:['basic','new-engineering','post-written','balanced'],recommendable:true,verification:checked(['source-2026-core'])
      },
      {
        id:'uestc',name:'电子科技大学',city:'成都',region:'西南',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称高考 + 数学×0.2 后按 5 倍入围',
        formula:'单科满分扩展规则和竞赛通道取消说法待核',multiplier:'5 倍',applicationMode:'单专业报名',
        majorTags:['信息计算','集成电路','应用物理'],sourceMajorDirections:['信息与计算科学（计算机）','数理基础科学（集成电路）','应用物理学'],
        jiangsuMajors:['数理基础科学（集成电路方向，原稿提及）','信息与计算科学（原稿提及）'],transferPolicy:'培养学院和转段去向较明确，但仍需核对届别和条件。',
        riskNotes:['新工科热度高、降分可能很小','只能报 1 个的原稿口径','小破格不等于录取'],fit:['new-engineering','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'hnu',name:'湖南大学',city:'长沙',region:'华中',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称化学×2 + 其他科目后按 4 倍入围',
        formula:'化学单科极高分扩展规则待核',multiplier:'4 倍',applicationMode:'按专业报名',
        majorTags:['化学','应用化学','化学生物'],sourceMajorDirections:['化学','应用化学','化学生物学'],
        jiangsuMajors:['化学类（原稿称主要候选）'],transferPolicy:'原稿历史样本主要在化学化工学院内转段。',
        riskNotes:['色觉用词在不同年份由“不招”变“谨慎”，不可合并','专业接受度优先'],fit:['basic','interview-only','strict'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'nudt',name:'国防科技大学',city:'长沙',region:'华中',tier:'中坚 985',scoreBand:'待核',
        testStage:'待官方简章',testMode:'待官方简章',entryRule:'六份原稿只有零散信息，没有完整 2026 院校条目',
        formula:'不可据零散讲座内容生成公式',multiplier:'待核',applicationMode:'待核',
        majorTags:['数学','物理','力学','航空航天'],sourceMajorDirections:['仅有零散方向信息，不能作为招生计划'],
        jiangsuMajors:[],transferPolicy:'待补 2026 官方招生简章和江苏分省计划。',
        riskNotes:['当前数据不足，系统必须阻止资格判断与推荐'],fit:[],recommendable:false,
        verification:{status:'blocked',year:2026,province:'江苏',sourceType:'原稿信息不足',lastVerified:'2026-07-12',sourceRefs:['source-2026-core','source-national'],notice:'缺少完整 2026 条目与江苏计划，暂不可推荐。'}
      },
      {
        id:'csu',name:'中南大学',city:'长沙',region:'华中',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称 5 倍入围、专业志愿优先，数学高分只对第一志愿有扩展规则',
        formula:'最终综合成绩公式待核',multiplier:'5 倍',applicationMode:'多专业顺序志愿',
        majorTags:['信息计算','材料','数理化生'],sourceMajorDirections:['信息与计算科学','材料科学与工程','物理','化学','数学','生物'],
        jiangsuMajors:['信息与计算科学（原稿提及）'],transferPolicy:'原稿观点称转工受限，需用官方接收方向与名额替代。',
        riskNotes:['第一志愿顺位风险','数学高分不等于直接录取','体测与本科转专业限制'],fit:['new-engineering','basic','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'scut',name:'华南理工大学',city:'广州',region:'华南',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称按专业采用数学/物理/化学 0.4—0.6 加权后 5 倍入围',
        formula:'原稿称加权同时参与最终录取，必须逐专业核验',multiplier:'5 倍',applicationMode:'按专业报名',
        majorTags:['应用物理','数学','化学','生物'],sourceMajorDirections:['应用物理学（电子科学）','数学','化学','生物技术'],
        jiangsuMajors:['应用物理学（电子科学方向，原稿提及）'],transferPolicy:'原稿称存在第三/第五学期动态考核；具体淘汰强度需引用官方原文。',
        riskNotes:['专业公式不同','面试合格线','体测和动态管理'],fit:['new-engineering','basic','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'sysu',name:'中山大学',city:'广州',region:'华南',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称 5 倍入围，部分单科极高分有小破格',
        formula:'小破格和最终公式待核',multiplier:'5 倍',applicationMode:'学科大类报名',
        majorTags:['数学智能','物理力学','基础医学','生态药学','文史哲'],sourceMajorDirections:['数学（含智能）','物理','力学','化学','生物','生态','基础医学','药学','文史哲'],
        jiangsuMajors:['数学类（含智能方向，原稿提及）'],transferPolicy:'大类二次选拔和直博导向说法需按培养方案核验。',
        riskNotes:['打包专业可能二次分流','体测与色觉要求','小破格不等于录取'],fit:['new-engineering','basic','humanities','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'ouc',name:'中国海洋大学',city:'青岛',region:'华东',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称海洋类高考 + 数学×0.5 后按 3 倍入围',
        formula:'生物方向是否加权需分开处理，原稿称不享受数学加权',multiplier:'3 倍',applicationMode:'按专业报名',
        majorTags:['海洋科学','海洋技术','生物'],sourceMajorDirections:['海洋科学','海洋技术','生物科学'],
        jiangsuMajors:[],transferPolicy:'转段主要与海洋和生命方向关联。',
        riskNotes:['计划少','色觉限制','海洋类与生物类公式不可混用'],fit:['basic','interview-only','strict'],recommendable:true,verification:checked(['source-2026-core'])
      },
      {
        id:'sdu',name:'山东大学',city:'济南',region:'华东',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称数学/密码方向高考 + 数学×0.5 后按 5 倍入围',
        formula:'校测原稿口径笔试与面试各 50%，并设合格线',multiplier:'5 倍',applicationMode:'按专业报名',
        majorTags:['密码科学','数学智能','物理','化生医','文史哲'],sourceMajorDirections:['密码科学与技术','数学（智能）','物理','化学','生物','基础医学','文史哲'],
        jiangsuMajors:['密码科学与技术（原稿提及）'],transferPolicy:'原稿称无末位淘汰，但仍需核对动态管理和转段条件。',
        riskNotes:['2025 数学高分小破格与 2026 加权口径不同','密码方向数学要求高'],fit:['new-engineering','basic','post-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'dlut',name:'大连理工大学',city:'大连',region:'东北',tier:'中等 985',scoreBand:'640+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称数学/信计加数学 0.5，物理/力学加物理 0.2 后按 5 倍入围',
        formula:'加权因专业不同；面试设合格线',multiplier:'5 倍',applicationMode:'多专业顺序志愿',
        majorTags:['力学','信息计算','应用物理','应用化学'],sourceMajorDirections:['数学','信息与计算科学','应用物理','工程力学','应用化学','生物工程'],
        jiangsuMajors:['工程力学（原稿提及）','应用物理学（原稿提及）','应用化学（原稿称江苏新增）'],transferPolicy:'原稿统计称跨工科人数少，需用届别数据和分母核验。',
        riskNotes:['第一志愿优先','加权公式分专业','地域与长期培养接受度'],fit:['traditional-engineering','basic','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'neu',name:'东北大学',city:'沈阳',region:'东北',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称高考成绩 6 倍入围，无加权和小破格',
        formula:'综合成绩公式待官方简章',multiplier:'6 倍',applicationMode:'单专业报名',
        majorTags:['自动化'],sourceMajorDirections:['自动化'],
        jiangsuMajors:['自动化（原稿提及）'],transferPolicy:'原稿称直博导向，必须核对是否适用于所有学生及退出机制。',
        riskNotes:['热门王牌专业不一定降分','地域与长期发展','笔试内容待核'],fit:['new-engineering','post-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'hit',name:'哈尔滨工业大学',city:'哈尔滨',region:'东北',tier:'中坚 985',scoreBand:'650+',
        testStage:'出分后',testMode:'仅面试（可能现场做题）',entryRule:'原稿称（数学+物理）×1.2 + 其他科目后按 4 倍入围',
        formula:'入围加权与最终综合成绩需分开核对',multiplier:'4 倍',applicationMode:'按专业报名',
        majorTags:['数学智能','飞行器','智能装备','储能','核力学'],sourceMajorDirections:['数学与应用数学（AI）','应用物理','智能装备','飞行器','材料','力学','核工程','储能'],
        jiangsuMajors:[],transferPolicy:'原稿对纯数理力学“强制直博”和其他专业贯通培养的表述需按专业、届别核验。',
        riskNotes:['部分专业取消江苏招生的原稿提示','仅面试可能现场解题','地域与长学制'],fit:['new-engineering','traditional-engineering','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'])
      },
      {
        id:'zju',name:'浙江大学',city:'杭州',region:'华东',tier:'华五人',scoreBand:'660+',
        testStage:'出分前',testMode:'笔试 + 面试',entryRule:'原稿称初试后按 5 倍进入复试，部分专业数学单科加权',
        formula:'部分专业高考成绩 + 数学×0.5；校测公式待逐专业核',multiplier:'5 倍',applicationMode:'专业组报名',
        majorTags:['数学智能','物理电子','力学','医农','文史哲'],sourceMajorDirections:['数学（智能）','物理（电子/量子）','力学','化学','生物','基础医学','农学','文史哲'],
        jiangsuMajors:['数学与应用数学（智能方向，原稿提及）','物理学（电子科学方向，原稿提及）'],transferPolicy:'跨转名额、分流和培养学院按 2026 方案核对。',
        riskNotes:['出分前锁档风险','数学加权适用专业不能泛化','确认与诚信条款需引用官方原文'],fit:['new-engineering','basic','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'ustc',name:'中国科学技术大学',city:'合肥',region:'华东',tier:'华五人',scoreBand:'660+',
        testStage:'出分前',testMode:'数理笔试 + 面试',entryRule:'原稿 2026 口径称初试后按 4 倍进入复试',
        formula:'原稿称笔试 200 + 面试 70；综合成绩公式待核',multiplier:'4 倍',applicationMode:'全校多专业排序',
        majorTags:['量子','信息计算','物理电子','核工程','能动'],sourceMajorDirections:['数学','信息与计算科学','物理','量子信息','化学','生物','力学','核工程','地球物理','能源动力'],
        jiangsuMajors:['数学（智能科学方向，原稿提及）','量子信息科学（原稿提及）','物理学（电子科学方向，原稿提及）'],transferPolicy:'原稿称理工衔接较宽，但历届比例与接收名额应核源。',
        riskNotes:['2025/2026 入围倍数不同','物理笔试难度高','出分前校测'],fit:['new-engineering','basic','early-written','aggressive'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'xmu',name:'厦门大学',city:'厦门',region:'华东',tier:'中等 985',scoreBand:'640+',
        testStage:'出分前',testMode:'初试笔试 + 复试面试',entryRule:'原稿称专业组初试后按 4 倍进入复试',
        formula:'原稿称初试与复试各 50%；报名费与缴费节点需官网核',multiplier:'4 倍',applicationMode:'专业组报名',
        majorTags:['信息计算','电子科学','海洋','药学','文史哲'],sourceMajorDirections:['信息与计算科学（智能）','电子科学','海洋科学','药学','数理化生','文史哲'],
        jiangsuMajors:['信息与计算科学（原稿称 2026 普高可报）','电子科学方向（原稿提及）','化学方向（原稿提及）'],transferPolicy:'招生专业打包和研究生转段方向须区分。',
        riskNotes:['出分前锁档风险','专业组名额不透明的原稿提示','缴费节点早'],fit:['new-engineering','basic','humanities','early-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'jlu',name:'吉林大学',city:'长春',region:'东北',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'笔试 + 面试',entryRule:'原稿称 6 倍且设特招线上分数门槛，数学高分有小破格',
        formula:'笔试与面试分别设合格线，最终公式待核',multiplier:'6 倍',applicationMode:'学科大类/专业报名',
        majorTags:['数学智能','物理','化学','古文字考古'],sourceMajorDirections:['数学类（含智能）','物理学','化学','古文字/考古'],
        jiangsuMajors:['数学类（含智能方向，原稿提及）'],transferPolicy:'原稿称基础学科内转段为主；以接收学院和名额为准。',
        riskNotes:['英语授课要求的适用专业需核','地域与长期深造','小破格不等于录取'],fit:['basic','humanities','post-written','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'cqu',name:'重庆大学',city:'重庆',region:'西南',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称高考成绩 4 倍入围',
        formula:'综合成绩与面试合格线待官方核验',multiplier:'4 倍',applicationMode:'专业组报名',
        majorTags:['数学','物理','储能'],sourceMajorDirections:['数学','物理','储能科学与工程'],
        jiangsuMajors:['数学类（原稿提及）','物理学（原稿提及）','储能科学与工程（原稿提及）'],transferPolicy:'原稿称理工衔接较宽；比例属于非官方历史样本，不能承诺。',
        riskNotes:['转工比例需核源','专业组调剂','面试合格线'],fit:['new-engineering','traditional-engineering','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      },
      {
        id:'lzu',name:'兰州大学',city:'兰州',region:'西北',tier:'中下 985',scoreBand:'630+',
        testStage:'出分后',testMode:'仅面试',entryRule:'原稿称 2026 改为 6 倍入围，并对数学、物理、化学加权',
        formula:'数学×0.3 + 物理/化学×0.2 等按专业公式；单科高分扩展规则待核',multiplier:'6 倍',applicationMode:'按专业报名',
        majorTags:['核化工','数理化生','生态草业','文史'],sourceMajorDirections:['数学','物理','化学','生物','生态','草业','核化工与核燃料工程','文史'],
        jiangsuMajors:['核化工与核燃料工程（原稿称新增）'],transferPolicy:'纯理科与核工方向的培养出路差异大，必须分别判断。',
        riskNotes:['2025 提前校测与 2026 出分后口径不同','色觉限制多','地域与行业路径'],fit:['traditional-engineering','basic','interview-only','balanced'],recommendable:true,verification:checked(['source-2026-core','source-choice'],'source_checked')
      }
    ],
    interviews: [
      {schoolId:'thu',formats:['多对一','长材料阅读'],prep:'约 30 分钟材料阅读（往年回忆）',questions:['为什么选择强基计划？','结合材料分析中国新能源汽车产业的竞争力与不足。']},
      {schoolId:'pku',formats:['多对多','自由讨论'],prep:'抽题后限时思考与发言（往年回忆）',questions:['“出世”和“入世”哪一种态度更有利于科学创新？','网络热词是污染语言还是丰富语言？']},
      {schoolId:'fdu',formats:['多对一','板书解题'],prep:'按专业差异较大',questions:['天空为什么是蓝色？','用非化学方法分辨水、醋酸和盐水。','谈谈篮球运动轨迹中的数学问题。']},
      {schoolId:'sjtu',formats:['多对一','学术房/生活房'],prep:'自我介绍后连续追问',questions:['你经历过最大的挫折是什么？','某个数学理论能解决哪些实际问题？']},
      {schoolId:'zju',formats:['多对多','英语问答'],prep:'小组轮流或抢答',questions:['为什么选择这个专业？','用英语说明你如何应对生活中的困难。']},
      {schoolId:'nju',formats:['多对一','抽题板书'],prep:'按专业抽题',questions:['在 1—100 中选两个不重复的数，两数相邻的概率是多少？','解释康普顿效应。']},
      {schoolId:'ruc',formats:['多对一','限时计算'],prep:'数学/计算机方向二选一题型',questions:['解释冒泡排序的时间复杂度与操作过程。','完成一道抽象函数递推题。']},
      {schoolId:'ustc',formats:['无领导小组','材料讨论'],prep:'分组阅读材料后互相提问',questions:['围绕能源材料完成小组陈述与质询。','围绕天文望远镜材料回答对方小组问题。']},
      {schoolId:'xjtu',formats:['小组面试','辩论'],prep:'自我介绍、抽题与 3v3 辩论',questions:['如何理解一段马克思主义经典语句？','方言和普通话哪个更好？']},
      {schoolId:'neu',formats:['无领导小组'],prep:'门口准备后轮流发言和自由讨论',questions:['如何看待人工智能的利与弊？','怎样合理应用人工智能？']},
      {schoolId:'hit',formats:['多对一','现场做题'],prep:'约 10 分钟（往年回忆）',questions:['现场完成并讲解一道数学思维题。','你最喜欢的中国数学家是谁？']},
      {schoolId:'buaa',formats:['多对一','材料追问'],prep:'约 10—20 分钟（往年回忆）',questions:['航空发动机与汽车发动机有哪些差异？','你的竞赛经历带来了什么？']},
      {schoolId:'seu',formats:['多对一','选题讲解'],prep:'从多道题中选做并板书',questions:['分析一类胜局差达到指定数才结束的比赛概率。']},
      {schoolId:'whu',formats:['多对一','抽题板书'],prep:'按数学、医学、古文字等专业区分',questions:['为什么选择基础医学而不是临床医学？','解释你对古文字学训练的理解。']},
      {schoolId:'hust',formats:['多对一','准备室做题'],prep:'抽题后板书讲解',questions:['讲解一道数列题。','为什么参加竞赛训练但没有参赛？']},
      {schoolId:'xmu',formats:['多对一/群面','抽题'],prep:'专业差异明显',questions:['空间站中如何测量物体质量？','AI 的发展会怎样影响制药业？']},
      {schoolId:'tongji',formats:['多对一','专业追问'],prep:'年份和专业差异大',questions:['为什么选择同济与这个专业？','用专业知识解释一个工程现象。']},
      {schoolId:'sysu',formats:['多对一','综合追问'],prep:'以当年专业流程为准',questions:['你如何理解所报专业与国家战略需求的关系？']},
      {schoolId:'bit',formats:['多对一','专业问答'],prep:'可能含数理问题',questions:['如何理解智能无人系统的安全与伦理边界？']},
      {schoolId:'tju',formats:['多对一','专业问答'],prep:'仅面试不代表没有现场题',questions:['合成生物学与传统生物工程有什么区别？']},
      {schoolId:'nankai',formats:['多对一','现场追问'],prep:'可能暗含笔试式做题',questions:['请用一个例子说明数学模型如何帮助现实决策。']},
      {schoolId:'ecnu',formats:['多对一','综合素质'],prep:'AI 面试说法需官方核验',questions:['你如何证明自己愿意长期投入基础学科？']},
      {schoolId:'dlut',formats:['多对一','专业追问'],prep:'按专业准备数理基础',questions:['工程力学如何服务航空航天与先进制造？']},
      {schoolId:'nwafu',formats:['多对一','学科兴趣'],prep:'生物与育种方向',questions:['现代育种如何兼顾产量、生物多样性和安全？']},
      {schoolId:'uestc',formats:['多对一','数理与电子'],prep:'面试中可能现场做题',questions:['集成电路为什么需要扎实的数理基础？']},
      {schoolId:'cqu',formats:['多对一','综合追问'],prep:'储能/数理方向区分',questions:['比较不同储能技术的优势与限制。']},
      {schoolId:'lzu',formats:['多对一','专业与地域动机'],prep:'核工、生态等专业差异大',questions:['为什么愿意在兰州长期完成本研培养？']},
      {schoolId:'jlu',formats:['多对一','笔面结合'],prep:'部分课程可能涉及英语',questions:['请解释你对数学智能方向的理解。']},
      {schoolId:'scu',formats:['多对一','专业问答'],prep:'数理、医学、人文差异大',questions:['基础医学与临床医学的培养目标有何区别？']},
      {schoolId:'npu',formats:['多对一','现场做题'],prep:'航空航天与船舶方向',questions:['飞行器设计中为什么要重视材料、力学和控制的交叉？']},
      {schoolId:'hnu',formats:['多对一','化学专业'],prep:'化学基础与研究动机',questions:['你怎样判断自己愿意长期从事实验研究？']},
      {schoolId:'csu',formats:['多对一','专业追问'],prep:'材料与信息方向区分',questions:['材料性能与微观结构之间有什么联系？']},
      {schoolId:'muc',formats:['多对一/小组','人文阅读'],prep:'具体语种与专业不同',questions:['古文字研究如何服务中华文化传承？']},
      {schoolId:'ouc',formats:['多对一','海洋科学'],prep:'专业现象解释',questions:['海洋是否具有类似陆地的季节性变化？']},
      {schoolId:'nudt',formats:['站点式/多对一（往年回忆）'],prep:'当前 2026 流程待官方简章',questions:['请用数理知识解释一个国防科技中的工程问题。']}
    ]
  };
})();
