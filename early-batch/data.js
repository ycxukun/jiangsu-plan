(function () {
  'use strict';

  const RULES = window.EARLY_BATCH_RULES_2026;
  if (!RULES) {
    throw new Error('EARLY_BATCH_RULES_2026 must be loaded before EARLY_BATCH_GUIDE_DATA.');
  }

  const SOURCE_META = {
    year: 2026,
    province: '江苏',
    sourceId: 'source-application-guide',
    sourceType: '用户提供的二手报考指南与培训资料综合层',
    verificationStatus: 'needs_2026_official_verification',
    conflictGroup: null
  };

  const withEvidence = (data, overrides) => ({
    ...data,
    ...SOURCE_META,
    ...(overrides || {})
  });

  const KNOWLEDGE_TREE = [
    withEvidence({
      id: 'military',
      label: '军事院校',
      icon: '盾',
      summary: '用纪律、服役与组织分配换取军籍培养和职业保障。',
      decisionQuestion: '学生是否真心接受军队生活、长期服役、组织分配和入校复检？',
      ruleIds: ['military-unmarried', 'military-age', 'military-score', 'military-assessment', 'military-psychology-interview', 'military-laser-six-months', 'military-entry-review'],
      riskTags: ['体检复检', '政治考核', '长期服役', '组织分配'],
      destination: '军队院校培养与军官职业路径'
    }, { sourceLines: '报考指南／军校 L1-L78' }),
    withEvidence({
      id: 'public-security-judicial',
      label: '公安政法',
      icon: '警',
      summary: '学校名称不决定联考资格，必须进一步核对专业身份和培养方向。',
      decisionQuestion: '学生是否符合身体、体能、面试、政治条件，并接受公安或监所职业环境？',
      ruleIds: ['police-basic', 'police-height', 'police-bmi', 'police-vision-color', 'police-professional-identity', 'judicial-basic', 'judicial-political-disqualifiers', 'judicial-vision', 'judicial-professional-identity'],
      riskTags: ['专业身份', '性别计划', '体测', '政审', '基层工作'],
      destination: '公安联考／司法招警考试对应职业路径',
      children: [
        { id: 'public-security', label: '公安院校公安专业', ruleIds: ['police-professional-identity', 'police-admission-order'] },
        { id: 'judicial-police', label: '司法行政警察类', ruleIds: ['judicial-professional-identity', 'judicial-vision'] }
      ]
    }, { sourceLines: '报考指南／公安政法院校 L82-L280' }),
    withEvidence({
      id: 'maritime',
      label: '航海院校（专业）',
      icon: '航',
      summary: '身体门槛与长期出海职业接受度缺一不可。',
      decisionQuestion: '学生是否满足辨色力、复视、身高和视力要求，并接受船员生活？',
      ruleIds: ['maritime-navigation-health', 'maritime-engine-health', 'maritime-school-specific-height', 'maritime-career-warning'],
      riskTags: ['色觉', '视力', '长期出海', '专业辨析'],
      destination: '航运、船员及航海技术岗位'
    }, { sourceLines: '报考指南／航海 L284-L316' }),
    withEvidence({
      id: 'local-special',
      label: '地方专项',
      icon: '乡',
      summary: '核心不是分数，而是实施区域、农村户籍、连续户籍与连续学籍资格。',
      decisionQuestion: '本人、父母或监护人户籍以及三年学籍是否完全符合实施区域规则？',
      ruleIds: ['local-special-region', 'local-special-hukou', 'local-special-schooling', 'local-special-score', 'local-special-prior-abandonment'],
      riskTags: ['县域名单', '农村户籍', '三年户籍', '三年学籍'],
      destination: '江苏地方重点高校专项计划'
    }, { sourceLines: '报考指南／地方专项 L320-L362' }),
    withEvidence({
      id: 'rural-teacher',
      label: '乡村教师',
      icon: '师',
      summary: '本县报本县、协议培养、排名选岗、连续服务五年的江苏定向项目。',
      decisionQuestion: '学生是否真心愿意回本县乡村学校，并接受五年服务与升学限制？',
      ruleIds: ['teacher-county-match', 'teacher-agreements', 'teacher-no-hukou-major-change', 'teacher-job-ranking', 'teacher-service-years', 'teacher-postgraduate-restrictions', 'teacher-breach'],
      riskTags: ['本县报本县', '不变专业', '排名选岗', '五年服务', '违约'],
      destination: '户籍县区有编有岗的乡村学校'
    }, { sourceLines: '报考指南／乡村教师 L366-L421' }),
    withEvidence({
      id: 'rural-medical',
      label: '定向医学生',
      icon: '医',
      summary: '免费培养与基层服务绑定，编制岗位并非人人自动获得。',
      decisionQuestion: '学生是否接受乡镇卫生院／村医方向、三年全科规培和六年基层服务？',
      ruleIds: ['medical-county-match', 'medical-service', 'medical-benefits', 'medical-residency-training', 'medical-staffing', 'medical-breach-events', 'medical-breach-consequences'],
      riskTags: ['县域定向', '基层医疗', '六年服务', '规培', '非自动入编'],
      destination: '定向县基层医疗卫生机构'
    }, { sourceLines: '报考指南／定向医学生 L425-L490' }),
    withEvidence({
      id: 'other',
      label: '其他院校',
      icon: '拓',
      summary: '信息差最大的一类，但“其他”绝不等于不需要条件。',
      decisionQuestion: '目标到底是特色职业、特殊专业、名校机会还是国际化路径，代价是否可接受？',
      ruleIds: ['other-not-condition-free', 'diplomacy-language-health', 'uir-basic', 'besti-basic', 'fire-basic', 'customs-health', 'marxism-subject', 'flight-preselection', 'language-transfer', 'targeted-agreement', 'hong-kong-list'],
      riskTags: ['逐校资格', '专业锁定', '就业不保证', '前置报名', '来源冲突'],
      destination: '党政特色院校、特殊专业、招飞、定向培养与港校路径',
      children: [
        { id: 'government', label: '党政特色院校', ruleIds: ['diplomacy-political-review', 'uir-basic', 'besti-basic', 'fire-employment', 'customs-employment'] },
        { id: 'special-major', label: '特殊专业', ruleIds: ['marxism-subject', 'language-transfer', 'film-special-route'] },
        { id: 'flight', label: '飞行技术', ruleIds: ['flight-preselection'] },
        { id: 'targeted', label: '特殊定向培养', ruleIds: ['targeted-agreement'] },
        { id: 'hong-kong', label: '港校路径', ruleIds: ['hong-kong-list'] }
      ]
    }, { sourceLines: '报考指南／其他院校 L492-L747', conflictGroup: 'conflict-other-condition-free' })
  ];

  const STUDENT_PROFILE_SECTIONS = [
    withEvidence({
      id: 'academic',
      label: '成绩与选科',
      fields: [
        { id: 'score', label: '高考／模考分数', type: 'number' },
        { id: 'rank', label: '江苏位次', type: 'number' },
        { id: 'firstSubject', label: '首选科目', type: 'select', options: ['物理', '历史'] },
        { id: 'secondSubjects', label: '再选科目', type: 'multi-select', options: ['化学', '生物', '政治', '地理'] },
        { id: 'gaokaoLanguage', label: '高考外语语种', type: 'select' },
        { id: 'oralExamStatus', label: '外语口试', type: 'status', options: ['未报名', '已报名', '合格', '不合格', '待查'] }
      ]
    }, { sourceLines: '地方专项 L346；北电科 L594；外交学院 L509-L525' }),
    withEvidence({
      id: 'identity',
      label: '基本身份',
      fields: [
        { id: 'birthDate', label: '出生日期', type: 'date' },
        { id: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
        { id: 'maritalStatus', label: '婚姻状态', type: 'select', options: ['未婚', '其他'] },
        { id: 'graduationType', label: '应届／往届', type: 'select', options: ['应届', '往届'] },
        { id: 'politicalAffiliation', label: '政治面貌', type: 'select', options: ['中共党员', '中共预备党员', '共青团员', '群众', '其他'] }
      ]
    }, { sourceLines: '军校 L13-L23；公安 L103-L108；司法 L200-L201；北电科 L582-L595' }),
    withEvidence({
      id: 'hukou',
      label: '户籍与学籍',
      fields: [
        { id: 'hukouCity', label: '户籍设区市', type: 'text' },
        { id: 'hukouCounty', label: '户籍县（市、区）', type: 'text' },
        { id: 'ruralHukou', label: '是否属于实施区域农村户籍', type: 'tri-state' },
        { id: 'guardianRuralHukou', label: '父母一方／监护人是否符合农村户籍', type: 'tri-state' },
        { id: 'continuousHukouYears', label: '当地连续户籍年限', type: 'number' },
        { id: 'continuousEnrollmentYears', label: '本县高中连续学籍年限', type: 'number' },
        { id: 'actualAttendance', label: '是否实际连续就读', type: 'tri-state' }
      ]
    }, { sourceLines: '地方专项 L332-L348；乡村教师 L386-L393；定向医学生 L449-L456' }),
    withEvidence({
      id: 'health',
      label: '身体自查',
      fields: [
        { id: 'heightCm', label: '身高（cm）', type: 'number' },
        { id: 'weightKg', label: '体重（kg）', type: 'number' },
        { id: 'bmi', label: 'BMI', type: 'computed' },
        { id: 'leftNakedVision', label: '左眼裸眼视力', type: 'number' },
        { id: 'rightNakedVision', label: '右眼裸眼视力', type: 'number' },
        { id: 'leftCorrectedVision', label: '左眼矫正视力', type: 'number' },
        { id: 'rightCorrectedVision', label: '右眼矫正视力', type: 'number' },
        { id: 'colorVision', label: '色觉', type: 'select', options: ['正常', '色弱', '色盲', '待检查'] },
        { id: 'laserSurgeryDate', label: '眼睛激光手术日期', type: 'date' },
        { id: 'hearingStatus', label: '听力状态', type: 'status' },
        { id: 'medicalReviewStatus', label: '官方体检核验', type: 'status', options: ['未核验', '待复查', '合格', '不合格'] }
      ]
    }, { sourceLines: '军校 L49-L51；公安 L111-L121；司法 L227-L243；航海 L289-L296' }),
    withEvidence({
      id: 'preconditions',
      label: '前置资格',
      privacyNotice: '政治考察只保存办理状态，不在普通学生页面收集亲属犯罪、服刑或境外关系详情。',
      fields: [
        { id: 'politicalSelfCheck', label: '政治考察自查状态', type: 'status', options: ['未自查', '待咨询', '初步无异常', '需官方确认'] },
        { id: 'fitnessPreparation', label: '体能准备状态', type: 'status' },
        { id: 'flightSelectionStatus', label: '招飞选拔状态', type: 'status' },
        { id: 'localSpecialReview', label: '地方专项资格审核', type: 'status' },
        { id: 'agreementAcceptance', label: '是否接受定向协议', type: 'tri-state' }
      ]
    }, { sourceLines: '司法政审 L206-L221；飞行技术 L720-L724；地方专项 L353-L362' }),
    withEvidence({
      id: 'career',
      label: '长期接受度',
      fields: [
        { id: 'acceptMilitaryService', label: '接受军队生活与组织分配', type: 'scale' },
        { id: 'acceptPoliceWork', label: '接受公安／监所工作环境', type: 'scale' },
        { id: 'acceptSeaCareer', label: '接受长期出海', type: 'scale' },
        { id: 'acceptRuralTeaching', label: '接受回本县乡村任教', type: 'scale' },
        { id: 'acceptPrimaryCare', label: '接受基层医疗服务', type: 'scale' },
        { id: 'acceptServiceYears', label: '可接受服务年限', type: 'number' },
        { id: 'postgraduatePriority', label: '全日制升学优先级', type: 'scale' },
        { id: 'locationFreedomPriority', label: '城市与流动自由优先级', type: 'scale' }
      ]
    }, { sourceId: 'source-early-analysis', sourceType: '用户提供的二手培训整理', sourceLines: '军校 L43-L51；航海 L417-L421；师范 L513-L523；定向医学 L554-L567' })
  ];

  const ELIGIBILITY_STATES = [
    { id: 'matched-research', label: '符合二手资料口径', tone: 'positive', explanation: '只代表可进入研究清单，不代表官方资格已确认。' },
    { id: 'blocked-by-source', label: '按当前资料明显不符', tone: 'negative', explanation: '仍应对照 2026 正式文件，防止年份或项目口径变化。' },
    { id: 'missing-input', label: '缺少学生信息', tone: 'neutral', explanation: '补齐必要字段后再判断。' },
    { id: 'official-check', label: '必须官方核验', tone: 'warning', explanation: '来源冲突、规则缺失或属于逐校逐组条件。' }
  ];

  const CAREER_PATHS = [
    withEvidence({ id: 'organization-placement', label: '组织分配／军籍路径', guaranteeLevel: '组织规则约束，不等于自由择业', examples: ['军事院校'] }, { sourceLines: '军校 L56-L65' }),
    withEvidence({ id: 'special-recruitment-exam', label: '专业院校统一招录考试', guaranteeLevel: '须同时满足院校、专业、应届和当年招录政策', examples: ['公安联考对应路径', '司法行政警察招警路径'] }, { sourceLines: '公安 L166-L179；司法 L279-L280' }),
    withEvidence({ id: 'civil-service-competitive', label: '国考／公务员考试择优', guaranteeLevel: '考试择优，不包录用', examples: ['北京电子科技学院相关去向', '中国消防救援学院干部招录', '上海海关学院海关岗位'] }, { sourceLines: '北电科 L620-L622；消防 L666-L668；海关 L701-L706', conflictGroup: 'conflict-fire-employment' }),
    withEvidence({ id: 'contracted-service', label: '协议定向服务', guaranteeLevel: '就业地点和服务期受协议约束，编制需看项目具体规则', examples: ['乡村教师', '农村订单定向医学生', '核工程／军工定向'] }, { sourceLines: '乡村教师 L391-L421；定向医学生 L442-L490；特殊培养 L726-L731' }),
    withEvidence({ id: 'market-employment', label: '自主择业', guaranteeLevel: '无包分配承诺', examples: ['航海类', '外交学院／国际关系学院部分毕业生', '上海海关学院'] }, { sourceLines: '航海 L315-L316；国际关系学院 L565-L567；海关 L701-L706' })
  ];

  const VOLUNTEER_WORKFLOW = [
    withEvidence({ id: 'ordinary-baseline', order: 1, title: '先完成普通批基线', detail: '明确当前分数位次在普通批可接受的学校、专业和城市。', ruleIds: ['ordinary-baseline-first'] }, { sourceId: 'source-jiangsu-summary', sourceType: '用户提供的讲座结构化笔记', sourceLines: '填报策略 L273-L284' }),
    withEvidence({ id: 'eligibility-gate', order: 2, title: '逐类过资格门', detail: '先排除年龄、户籍、身体、选科、前置报名和协议接受度不匹配项目。', ruleIds: [] }, { sourceLines: '七类资格章节综合' }),
    withEvidence({ id: 'group-matrix', order: 3, title: '建立院校专业组矩阵', detail: '一行一个专业组，保存选科、性别、资格、计划、专业、调剂和就业路径。', ruleIds: [] }, { sourceLines: '公安 L153-L161；地方专项 L353-L362；北电科 L596-L618' }),
    withEvidence({ id: 'addition-test', order: 4, title: '判断是否真正做加法', detail: '只有提前批去向优于普通批基线且全部代价可接受时才保留。', ruleIds: ['ordinary-baseline-first', 'early-admission-locks-later'] }, { sourceId: 'source-jiangsu-summary', sourceType: '用户提供的讲座结构化笔记', sourceLines: '填报策略 L273-L284' }),
    withEvidence({ id: 'adjustment-review', order: 5, title: '逐组确认服从调剂', detail: '不套用“提前批不必服从”的统一结论，检查组内所有可调专业。', ruleIds: ['adjustment-not-automatic-safe'] }, { sourceId: 'source-jiangsu-summary', sourceType: '用户提供的讲座结构化笔记', sourceLines: '服从调剂 L286-L311', conflictGroup: 'conflict-rejection-flow' }),
    withEvidence({ id: 'archive-evidence', order: 6, title: '保存证据与确认记录', detail: '归档官方简章、江苏计划、体检结论、资格公示、协议和关键页面截图。', ruleIds: [] }, { sourceLines: '三份资料的流程章节综合' })
  ];

  const SOURCE_REVIEW_FIELDS = [
    'year',
    'province',
    'institution',
    'majorGroupCode',
    'major',
    'sourceId',
    'sourceType',
    'sourceLines',
    'verificationStatus',
    'conflictGroup',
    'officialUrl',
    'officialVerifiedAt',
    'verifiedBy'
  ];

  window.EARLY_BATCH_GUIDE_DATA = {
    meta: {
      year: 2026,
      province: '江苏',
      version: '2026.07.12-guide-data-r1',
      verificationStatus: 'needs_2026_official_verification',
      disclaimer: RULES.meta.disclaimer,
      displayPolicy: '页面可以显示二手资料原始口径与冲突，但默认使用“待官方核验”徽标；未经核验的固定分数、比例和就业率不得进入推荐排序。'
    },
    knowledgeTree: KNOWLEDGE_TREE,
    studentProfileSections: STUDENT_PROFILE_SECTIONS,
    eligibilityStates: ELIGIBILITY_STATES,
    careerPaths: CAREER_PATHS,
    volunteerWorkflow: VOLUNTEER_WORKFLOW,
    timeline: RULES.timeline,
    sources: RULES.sources,
    conflicts: RULES.conflicts,
    sourceReviewFields: SOURCE_REVIEW_FIELDS,
    brochureChecks: [
      withEvidence({ id: 'plan', title: '江苏 2026 招生计划', items: ['类别和院校专业组', '专业名称与计划数', '首选与再选科目', '性别限制', '县区或生源限制'] }, { sourceLines: '七类招生计划均待 2026 官方发布' }),
      withEvidence({ id: 'eligibility', title: '资格条件', items: ['年龄与应往届', '户籍与学籍', '政治考察办理状态', '前置报名资格', '外语及口试'] }, { sourceLines: '军校、公安、司法、地方专项、其他院校资格章节综合' }),
      withEvidence({ id: 'health', title: '身体与测试', items: ['身高体重 BMI', '裸眼与矫正视力', '色觉与复视', '体检标准', '体能项目与合格规则', '入校复检'] }, { sourceLines: '军校 L43-L57；公安 L111-L130；司法 L227-L250；航海 L289-L310' }),
      withEvidence({ id: 'admission', title: '投档录取', items: ['志愿模式', '是否类别互斥', '面试体检资格线', '政审顺序', '同分排序', '征求志愿'] }, { sourceLines: '公安 L137-L161；司法 L256-L275；北电科 L596-L618' }),
      withEvidence({ id: 'commitment', title: '培养、就业与协议', items: ['专业能否调整', '服务地点与年限', '规培或统一招录考试', '编制是否保证', '升学限制', '违约责任'] }, { sourceLines: '乡村教师 L395-L421；定向医学生 L458-L490；特殊培养 L726-L731' }),
      withEvidence({ id: 'conflict', title: '来源冲突', items: ['冲突组是否已关闭', '采用哪份官方文件', '核验人和时间', '历史口径是否已停用'] }, { sourceLines: '三份材料交叉审计', conflictGroup: 'multiple' })
    ],
    dataSchema: {
      schoolGroupFields: ['category', 'subCategory', 'institution', 'majorGroupCode', 'majorNames', 'subjectRequirements', 'genderLimit', 'planCount', 'hukouRegion', 'healthRules', 'interviewRequired', 'fitnessRequired', 'politicalReviewRequired', 'adjustmentPolicy', 'careerPath', 'serviceYears'],
      provenanceFields: SOURCE_REVIEW_FIELDS,
      recommendationExclusions: ['verificationStatus !== official_verified_2026', '存在未关闭 conflictGroup', '江苏计划为空', '学生硬门槛信息缺失', '体检或县域资格待核']
    }
  };
})();
