(function(){
  'use strict';

  window.STRONG_BASE_CORE = {
    version: '2026.07.12-r2',
    province: '江苏',
    year: 2026,
    stages: [
      {
        id: 'fit',
        label: '适配初筛',
        window: '现在起',
        description: '先建立普通批基线，再判断是否值得进入强基路径。',
        tasks: [
          {id:'profile',title:'完成学生强基画像',detail:'录入成绩趋势、单科优势、专业接受度、地域与风险边界。'},
          {id:'ordinary-baseline',title:'写清普通批基线',detail:'记录不走强基时可去的学校、可保的专业与可接受底线。'},
          {id:'major-boundary',title:'确认专业红线',detail:'明确拒绝专业、是否接受长期深造和本科阶段专业限制。'}
        ]
      },
      {
        id: 'brochure',
        label: '简章核对',
        window: '3 月—4 月',
        description: '只用目标校 2026 官方简章确认江苏计划和考试规则。',
        tasks: [
          {id:'jiangsu-plan',title:'核对江苏招生计划',detail:'确认目标专业在江苏投放、选科匹配、身体与语言限制。'},
          {id:'entry-formula',title:'核对入围公式',detail:'记录裸分、单科加权、小破格、竞赛破格和入围倍数。'},
          {id:'training-path',title:'核对培养与转段',detail:'区分招生专业、培养方向和研究生可申请方向。'}
        ]
      },
      {
        id: 'application',
        label: '报名确认',
        window: '4 月—6 月',
        description: '完成报名、材料、签字、缴费和高考后确认，不漏任何动作。',
        tasks: [
          {id:'account',title:'检查学信网账号与联系人',detail:'手机号可用，紧急联系人信息准确。'},
          {id:'submit',title:'完成院校与专业提交',detail:'核对专业顺序、调剂选项、破格身份和报名状态。'},
          {id:'signed-form',title:'下载并本人签署志愿表',detail:'仅在目标校要求时完成下载、本人签字和回传。'},
          {id:'confirm-pay',title:'完成校测确认与缴费',detail:'以目标校系统开放时间为准，保留成功页面截图。'}
        ]
      },
      {
        id: 'assessment',
        label: '入围校测',
        window: '6 月',
        description: '根据学校模式准备笔试、面试、体测和校测行程。',
        tasks: [
          {id:'ticket',title:'下载准考证并确认考点',detail:'同步交通、住宿、证件和考场要求。'},
          {id:'written',title:'完成笔试专项训练',detail:'按学校与专业对应科目训练，不用通用题库替代。'},
          {id:'interview',title:'完成至少 3 次模拟面试',detail:'覆盖自我介绍、材料追问、学术问题和压力追问。'},
          {id:'physical',title:'核对体测与健康要求',detail:'逐字保留官方简章中的要求强度。'}
        ]
      },
      {
        id: 'result',
        label: '录取培养',
        window: '6 月底起',
        description: '记录结果并再次确认专业锁定、动态分流与转段条件。',
        tasks: [
          {id:'result-record',title:'登记校测与录取结果',detail:'保留笔试、面试、体测和综合成绩记录。'},
          {id:'final-decision',title:'确认最终去向',detail:'录取前再次核对专业、培养学院、动态管理和长期路径。'},
          {id:'archive',title:'归档全部材料',detail:'将简章、报名截图、准考证和结果存入学生强基档案。'}
        ]
      }
    ],
    brochureChecks: [
      {id:'plan',title:'江苏招生计划',description:'2026 年、江苏省、选科组合、招生专业名称与计划数。',items:['该专业确实在江苏投放','首选与再选科目匹配','招生专业与培养方向已区分','计划数和专业组已记录']},
      {id:'entry',title:'入围与破格',description:'入围依据决定学生是否能进入校测。',items:['入围倍数','高考成绩计算口径','单科加权公式','小破格门槛与有效范围','竞赛破格奖项和专业对应']},
      {id:'assessment',title:'校测与综合分',description:'不同专业的笔试科目和权重可能不同。',items:['出分前或出分后校测','笔试/机试/面试形式','各部分满分与合格线','高考与校测权重','同分排序与体测作用']},
      {id:'application',title:'报名与确认',description:'把时间节点转成学生任务。',items:['报名起止','专业志愿数量与排序','是否允许调剂','材料与本人签字','确认/缴费/准考证时间']},
      {id:'training',title:'培养与转段',description:'允许申请不等于保证进入。',items:['本科培养学院','动态进出与淘汰','本科转专业限制','硕博转段条件','可申请方向与实际接收名额']},
      {id:'limits',title:'身体与其他限制',description:'保留“不得”“不宜”“谨慎”等官方原文强度。',items:['色弱/色盲/单色识别','视力与体测','外语语种与英语要求','诚信与放弃规则','其他专业专属限制']}
    ],
    mapBranches: {
      trend: [
        {id:'rising',label:'成绩持续走高',hint:'可评估提前校测的向上博弈，但仍需测算锁档风险。'},
        {id:'stable',label:'成绩相对稳定',hint:'可按普通批基线和专业接受度选择模式。'},
        {id:'volatile',label:'成绩波动较大',hint:'优先保留出分后决策空间。'}
      ],
      major: [
        {id:'new-engineering',label:'明确要新工科',hint:'关注智能、电子、自动化、储能等明牌方向，通常降分空间较小。'},
        {id:'basic',label:'热爱基础学科',hint:'可重点看数理化生与学校科研平台、长期深造。'},
        {id:'traditional-engineering',label:'接受传统工科',hint:'关注力学、航空航天、船舶、核、能源材料等方向。'},
        {id:'humanities',label:'文史哲方向',hint:'计划少、校测重阅读与表达，需真实学术积累。'}
      ],
      assessment: [
        {id:'early-written',label:'接受提前校测 + 强笔试',hint:'高风险高收益；一旦被强基录取，将不能再参加后续普通批投档。'},
        {id:'post-written',label:'偏好出分后 + 笔面试',hint:'先看高考结果，再决定是否参加校测。'},
        {id:'interview-only',label:'偏好出分后 + 仅面试',hint:'适合表达与综合素质更强的学生，但部分学校可能现场做题。'}
      ],
      risk: [
        {id:'strict',label:'低风险：专业与城市优先',hint:'只保留专业明确、地区接受、培养限制可承受的学校。'},
        {id:'balanced',label:'中风险：学校与专业平衡',hint:'允许适度跃升，但不以长期不喜欢的专业换学校。'},
        {id:'aggressive',label:'高风险：愿意向上冲刺',hint:'仍需通过健康、专业红线与长期培养接受度审核。'}
      ]
    },
    majorProfiles: [
      {id:'math',name:'数学与应用数学',group:'数学与计算',nature:'基础学科',study:'分析、代数、几何、概率与严密证明训练，抽象度和课程强度高。',route:'基础数学、应用数学、统计、算法等；能否衔接计算机取决于培养学院、课程与接收名额。',fit:'数学基础扎实、喜欢抽象推理、愿意长期深造。',risk:'不能把“可申请智能/计算方向”理解为本科就是计算机，也不能把历史转工个案当保证。'},
      {id:'information-computing',name:'信息与计算科学',group:'数学与计算',nature:'基础 + 交叉',study:'数学基础、数值计算、算法、程序设计与数据方法；不同学校培养学院差异巨大。',route:'数学、计算机、软件、人工智能、数据科学等，具体看是否单列及实际承办学院。',fit:'数学和编程都强，愿意辨别课程表而不是只看专业名称。',risk:'同名专业可能是纯数学方向，也可能由计算机/人工智能学院培养。'},
      {id:'mathematical-science',name:'数理基础科学',group:'数学与计算',nature:'基础 + 工程衔接',study:'强化数学、物理与工程基础，常以书院或实验班方式组织。',route:'可面向集成电路、电子、能源、软件等方向申请衔接。',fit:'数理都强、接受高强度基础训练并愿意延迟确定工程方向。',risk:'衔接方向、名额和直博要求必须按当届培养方案。'},
      {id:'intelligent-science',name:'智能科学方向',group:'数学与计算',nature:'新工科交叉',study:'数学、计算机系统、机器学习、知识表示、自然语言处理或机器人等。',route:'人工智能、计算机、软件、控制和数据方向。',fit:'数学与编程能力强，目标明确。',risk:'热度高，降分可能很小；“含智能方向”和“智能方向单列”不是一回事。'},
      {id:'data-computing',name:'数据计算及应用',group:'数学与计算',nature:'新工科交叉',study:'数学建模、数据结构、算法、统计学习、数据系统等。',route:'数据智能、人工智能、计算机与行业数据应用。',fit:'数学强、对数据和计算系统都有兴趣。',risk:'培养方向可能二次分流，需核对学院与课程。'},
      {id:'physics',name:'物理学',group:'物理与电子',nature:'基础学科',study:'力热光电、量子、统计物理与实验训练，对数学要求高。',route:'凝聚态、光学、量子、电子器件、材料、能动等。',fit:'数理基础好，能接受实验和长期研究。',risk:'“允许交叉”不等于一定进入芯片或电子方向。'},
      {id:'applied-physics',name:'应用物理 / 电子科学方向',group:'物理与电子',nature:'基础 + 新工科',study:'物理基础叠加半导体、器件、光电、微电子或信息课程。',route:'电子科学、集成电路、光学工程、量子技术。',fit:'喜欢硬件、芯片或光电，物理和数学都强。',risk:'需要确认方向是否单列、由谁培养、江苏是否投放。'},
      {id:'quantum',name:'量子信息科学',group:'物理与电子',nature:'前沿交叉',study:'量子力学、信息论、计算与精密实验。',route:'量子计算、量子通信、精密测量和电子信息。',fit:'数理与科研能力突出，愿意深造。',risk:'本科直接就业面较窄，优质岗位通常要求高学历。'},
      {id:'astro-geophysics',name:'天体物理 / 地球物理',group:'物理与电子',nature:'特色基础学科',study:'物理、数学、计算与观测/野外实践。',route:'天文、空间科学、地球科学、大气或信息技术交叉。',fit:'对自然现象和科研有真实兴趣。',risk:'行业路径相对集中，不能只因历史低分选择。'},
      {id:'mechanics',name:'工程力学',group:'空天与制造',nature:'传统工科基础',study:'理论力学、材料力学、流体、计算力学与工程建模。',route:'航空航天、机械、车辆、船舶、先进制造。',fit:'数理强、喜欢工程分析，接受长期技术路线。',risk:'学校所在学院决定行业资源；并非所有力学都能顺利转空天。'},
      {id:'chemistry',name:'化学',group:'化学与材料',nature:'基础学科',study:'无机、有机、分析、物化与长期实验训练。',route:'化学、材料、化工、能源、药物与计算化学。',fit:'真正喜欢实验和机理研究，能接受深造。',risk:'方向差异极大，讲座中的就业评价不能替代导师、方向和行业数据。'},
      {id:'applied-chemistry',name:'应用化学 / 化学生物学',group:'化学与材料',nature:'基础 + 应用',study:'化学基础叠加工程、生物或药学问题。',route:'化工、材料、生命健康、药学与交叉研究。',fit:'实验能力强，对具体应用问题有兴趣。',risk:'健康限制、实验强度和转段方向要逐专业核对。'},
      {id:'materials',name:'材料科学 / 高分子',group:'化学与材料',nature:'传统工科',study:'材料结构、性能、制备、表征与工艺。',route:'半导体、能源、航空复材、高分子、先进制造。',fit:'愿意把化学物理基础用于真实工程材料。',risk:'材料方向差异远大于专业名称，需看导师、实验室和产业。'},
      {id:'automation',name:'自动化',group:'控制与装备',nature:'新工科',study:'控制理论、电路、编程、嵌入式、信号与系统。',route:'工业控制、机器人、智能制造、汽车电子。',fit:'数理和编程均衡，喜欢系统工程。',risk:'热门王牌方向可能不降分甚至倒挂。'},
      {id:'unmanned',name:'智能无人系统 / 智能装备',group:'控制与装备',nature:'新工科',study:'控制、感知、算法、机械与系统集成。',route:'无人平台、机器人、国防科技与先进制造。',fit:'动手与系统思维强，接受多学科课程。',risk:'培养资源和方向名称更新快，必须看课程和实验平台。'},
      {id:'measurement',name:'测控技术与仪器',group:'控制与装备',nature:'传统工科 + 前沿',study:'传感、测量、信号、控制、光电与仪器系统。',route:'量子测量、精密仪器、自动化、电子信息。',fit:'物理和工程实践强，喜欢精密系统。',risk:'不同学校可能偏光电、仪器或量子，不能一概而论。'},
      {id:'aerospace',name:'航空航天类',group:'空天与制造',nature:'传统战略工科',study:'飞行器总体、结构、动力、控制、适航与材料。',route:'航空航天研究所、制造企业、国防与高端装备。',fit:'对行业有长期兴趣，接受地域和单位属性。',risk:'江苏是否投放、体检限制、行业周期与研究所路径均需确认。'},
      {id:'nuclear',name:'核工程类',group:'能源与海洋',nature:'传统战略工科',study:'核物理、反应堆、辐射防护、核材料或核化工。',route:'核电、核工业、研究院和能源央企。',fit:'物理化学基础好，接受行业集中度。',risk:'方向差异和身体限制需核；不要用“包分配”类说法。'},
      {id:'naval',name:'船舶与海洋工程',group:'能源与海洋',nature:'传统战略工科',study:'船体结构、流体、动力、海洋装备与控制。',route:'船舶制造、海工装备、水中兵器、交通运输。',fit:'接受工程现场和行业城市，力学基础好。',risk:'上交/天大/西工大等培养侧重不同。'},
      {id:'energy',name:'能源与动力工程',group:'能源与海洋',nature:'传统工科',study:'热力学、流体、动力机械、能源转换与控制。',route:'电力、动力装备、新能源、航空动力。',fit:'物理和工程基础好，接受实体产业。',risk:'热能、动力、制冷、发动机等方向差异大。'},
      {id:'storage',name:'储能科学与工程',group:'能源与海洋',nature:'新工科',study:'电化学、热储能、电力系统、材料与安全管理。',route:'电网侧储能、电池、热管理、能源系统。',fit:'物化基础好，对能源产业有兴趣。',risk:'新专业培养体系仍在发展，学校侧重点和就业岗位需核。'},
      {id:'ocean',name:'海洋科学 / 海洋技术',group:'能源与海洋',nature:'特色基础学科',study:'海洋物理、化学、生物、地质与观测技术。',route:'海洋科研、环境监测、装备与资源。',fit:'愿意从事观测、实验或科研，接受行业集中。',risk:'色觉和野外要求、就业区域与深造需求。'},
      {id:'biology',name:'生物科学 / 生物技术 / 生物工程',group:'生命与医学',nature:'基础 + 应用',study:'细胞、遗传、分子、生化、实验和计算生物。',route:'生命科学、生物医药、育种、生物工程。',fit:'真喜欢生命科学，实验耐心强，愿意长期深造。',risk:'不能以“转工科”作为主要承诺；家庭和学生要接受培养周期。'},
      {id:'synthetic-biology',name:'合成生物学',group:'生命与医学',nature:'前沿交叉',study:'生物学、工程设计、计算、化学与系统建模。',route:'生物制造、医药、材料、能源与食品。',fit:'生物、化学和工程思维都强。',risk:'产业仍在发展，具体平台、实验资源和研究方向很关键。'},
      {id:'basic-medicine',name:'基础医学 / 生物医学科学',group:'生命与医学',nature:'医学基础研究',study:'解剖、生理、生化、病理、免疫与科研训练。',route:'基础医学、生命科学、药学和转化医学。',fit:'想做医学科研而非直接临床诊疗。',risk:'基础医学不等于临床医学，通常需要长期深造。'},
      {id:'biomedical-engineering',name:'生物医学工程',group:'生命与医学',nature:'医工交叉',study:'电子、信号、成像、材料、仪器与医学基础。',route:'医疗器械、医学影像、生物传感和智能医疗。',fit:'物理、电子和生命科学均有兴趣。',risk:'同名专业可能偏电子、材料或生命，培养学院决定路径。'},
      {id:'breeding-ecology',name:'生物育种 / 草业 / 生态',group:'农林与生态',nature:'特色战略学科',study:'遗传育种、分子生物、生态系统、田间或野外实践。',route:'种业、农业科研、生态保护和相关公共部门。',fit:'真正接受农学、生态或育种长期路径。',risk:'健康限制、行业地域和深造要求，不适合作为只冲学校的盲选。'},
      {id:'humanities',name:'历史 / 哲学 / 古文字',group:'人文基础',nature:'基础人文学科',study:'原典阅读、语言、史料、逻辑、写作和研究方法。',route:'学术研究、教育、文化机构、公共部门等。',fit:'阅读写作积累深，有真实问题意识。',risk:'计划少、跨转法学财会等案例极少；不能只依赖面试表达。'}
    ],
    statementSections: [
      {id:'origin',title:'兴趣起点',prompt:'哪一次课程、阅读、实验或真实问题，让你开始关注这个学科？'},
      {id:'evidence',title:'能力证据',prompt:'用一段真实经历写清任务、行动、困难、结果与反思。'},
      {id:'reading',title:'学术积累',prompt:'读过什么、做过什么、理解了什么？避免只列书名和奖项。'},
      {id:'school',title:'学校匹配',prompt:'目标校的课程、实验室、培养方向如何对应你的问题意识？'},
      {id:'future',title:'未来问题',prompt:'你想继续研究或解决什么问题？为什么值得长期投入？'},
      {id:'proof',title:'证据与追问',prompt:'每个事实有哪些证书、作品、记录或老师能佐证？考官可能追问什么？'}
    ],
    sources: [
      {id:'source-2026-core',title:'26 年强基计划',kind:'2026 院校原稿',scope:'学生画像、报名流程、38 校规则、专业与转段观点',lines:3369,status:'需逐校官方核验',yuque:'https://www.yuque.com/u26507439/ufqnb5/tuoxug0apaidggik?singleDoc'},
      {id:'source-guide',title:'强基计划报考指南',kind:'政策与专业手册',scope:'政策原理、专业解读、适宜人群、文书与面试；院校规则主体为 2025 版',lines:2107,status:'不可直接当 2026 规则',yuque:'https://www.yuque.com/u26507439/ufqnb5/ig6l3olxsnxovvte?singleDoc'},
      {id:'source-interview',title:'强基计划面试全攻略',kind:'往年回忆与训练素材',scope:'35 校往年面试形式、题型示例与备考框架；系统题目均按训练目的改编',lines:384,status:'训练改编题，非 2026 真题',yuque:'https://www.yuque.com/u26507439/ufqnb5/srh0r7d68vhlhtrx?singleDoc'},
      {id:'source-trend',title:'2026年强基计划新风向解读专项讲座 · 结构化笔记',kind:'讲座观点',scope:'专业、平台校/跳板校、新工科与过程优化观点',lines:583,status:'经验判断非官方承诺',yuque:'https://www.yuque.com/u26507439/ufqnb5/udkqzfm3n73tam5a?singleDoc'},
      {id:'source-choice',title:'26 强基择校逻辑',kind:'顾问策略原稿',scope:'提前/非提前校测与江苏择校逻辑',lines:180,status:'需与官方简章对照',yuque:'https://www.yuque.com/u26507439/ufqnb5/ztbhhx7gx0bda8x0?singleDoc'},
      {id:'source-national',title:'强基计划全国讲座',kind:'全国培训讲座',scope:'39 校框架、专业与历史样本、清北华五等分层案例',lines:2349,status:'含 2025 规则与非官方统计',yuque:'https://www.yuque.com/u26507439/ufqnb5/zbesiiq8l6slzhzc?singleDoc'}
    ]
  };

  window.STRONG_BASE_CORE.majorProfiles = window.STRONG_BASE_CORE.majorProfiles.map(profile => ({
    ...profile,
    evidenceStatus: 'knowledge_synthesis',
    sourceRefs: ['source-guide', 'source-trend', 'source-national'],
    sourceNotice: '专业知识综合层：依据报考指南与讲座材料整理，不等同于任何学校的 2026 招生专业、江苏计划或培养承诺。'
  }));
})();
