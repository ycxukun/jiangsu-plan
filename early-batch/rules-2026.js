(function () {
  'use strict';

  const TARGET_YEAR = 2026;
  const PROVINCE = '江苏';
  const NEEDS_OFFICIAL = 'needs_2026_official_verification';
  const SOURCE_CONFLICT = 'source_conflict_needs_2026_official_verification';
  const IMAGE_INCOMPLETE = 'source_image_incomplete_needs_official_text';
  const DATASET_NOTICE = '本资料层仅把用户提供的二手培训材料结构化为 2026 江苏研究清单。任何资格、日期、计划、体检、录取与履约结论，均须以江苏省教育考试院、主管部门和院校 2026 年正式文件为准。';

  const SOURCES = [
    {
      id: 'source-early-analysis',
      title: '提前批招生',
      localFileName: '提前批招生.md',
      sourceType: '用户提供的二手培训整理',
      year: TARGET_YEAR,
      sourceYear: '未标明；包含 2024—2025 历史信息与经验判断',
      province: PROVINCE,
      lineCount: 672,
      scope: '军校、公安、司法、五所特色院校、飞行技术、航海、小语种、师范定向、定向医学、港校及特殊专业的分析性材料',
      verificationStatus: NEEDS_OFFICIAL,
      conflictGroup: null,
      notice: '含大量就业率、降分、职业评价和经验性操作建议，不得直接当作 2026 官方招生规则。'
    },
    {
      id: 'source-jiangsu-summary',
      title: '江苏高考提前批次——全体系结构化汇总',
      localFileName: '# 江苏高考提前批次——全体系结构化汇总.md',
      sourceType: '用户提供的讲座结构化笔记',
      year: TARGET_YEAR,
      sourceYear: '未标明；含 2025 分数案例与讲座观点',
      province: PROVINCE,
      lineCount: 359,
      scope: '江苏提前批框架、其他类机会、警校军校观点、特殊专业、填报策略、体检代码与案例',
      verificationStatus: NEEDS_OFFICIAL,
      conflictGroup: null,
      notice: '讲座观点和个案不可替代江苏省教育考试院政策、招生计划和院校章程。'
    },
    {
      id: 'source-application-guide',
      title: '提前批报考指南',
      localFileName: '提前批报考指南.md',
      sourceType: '用户提供的二手报考指南',
      year: TARGET_YEAR,
      sourceYear: '未标明；具体日期仅作往年流程参考',
      province: PROVINCE,
      lineCount: 751,
      scope: '军校、公安、司法、航海、地方专项、乡村教师、定向医学生和其他院校的资格与流程整理',
      verificationStatus: NEEDS_OFFICIAL,
      conflictGroup: null,
      notice: '操作细节较多，但仍非 2026 官方文件；多张关键表格仅保留图片链接，文字信息不完整。'
    }
  ];

  const sourceById = Object.fromEntries(SOURCES.map((source) => [source.id, source]));

  function evidence(sourceId, sourceLines, options) {
    const source = sourceById[sourceId];
    const settings = options || {};
    return {
      year: TARGET_YEAR,
      sourceYear: settings.sourceYear || source.sourceYear,
      province: PROVINCE,
      sourceId,
      sourceTitle: source.title,
      sourceType: source.sourceType,
      sourceLines,
      verificationStatus: settings.verificationStatus || NEEDS_OFFICIAL,
      conflictGroup: settings.conflictGroup || null
    };
  }

  function category(id, label, summary, sourceId, sourceLines, children, options) {
    return {
      id,
      label,
      summary,
      children: children || [],
      ...evidence(sourceId, sourceLines, options)
    };
  }

  function rule(id, categoryId, topic, statement, value, sourceId, sourceLines, options) {
    const settings = options || {};
    return {
      id,
      categoryId,
      topic,
      statement,
      value,
      ruleKind: settings.ruleKind || 'candidate_rule',
      decisionEffect: settings.decisionEffect || 'verify',
      officialCheck: settings.officialCheck || '核对 2026 江苏省教育考试院、主管部门或院校正式文件。',
      caution: settings.caution || DATASET_NOTICE,
      ...evidence(sourceId, sourceLines, settings)
    };
  }

  function timeline(id, windowLabel, title, detail, categoryIds, sourceId, sourceLines, options) {
    const settings = options || {};
    return {
      id,
      window: windowLabel,
      title,
      detail,
      categoryIds,
      isReferenceWindow: true,
      officialDate: null,
      reminderState: 'awaiting_2026_notice',
      ...evidence(sourceId, sourceLines, settings)
    };
  }

  function conflict(id, title, claimA, claimB, handling, sourceId, sourceLines, options) {
    const settings = options || {};
    return {
      id,
      title,
      claims: [claimA, claimB],
      handling,
      severity: settings.severity || 'high',
      year: TARGET_YEAR,
      province: PROVINCE,
      sourceId,
      sourceType: '多份用户提供的二手材料',
      sourceLines,
      verificationStatus: SOURCE_CONFLICT,
      conflictGroup: id
    };
  }

  const CATEGORIES = [
    category('military', '军事院校', '军籍培养，涉及年龄、婚姻、特控线、政治考核、体检、体测、心理检测、面试与入校复检。', 'source-application-guide', '军校 L1-L78', []),
    category('public-security-judicial', '公安政法院校（专业）', '在同一提前批类别下，必须继续区分公安院校公安专业与中央司法警官学院司法行政警察类专业。', 'source-application-guide', '公安政法院校 L82-L280', [
      category('public-security', '公安院校公安专业', '资格、体检、体能、面试、政治考察和公安专业身份共同决定报考与联考路径。', 'source-application-guide', '公安院校 L88-L179', []),
      category('judicial-police', '中央司法警官学院司法行政警察类', '司法行政警察类专业有独立政治、身体、面试、体测与就业考试口径。', 'source-application-guide', '司法院校 L184-L280', [])
    ]),
    category('maritime', '航海院校（专业）', '航海技术、轮机工程、船舶电子电气工程具有辨色力、复视、身高和视力等专业要求。', 'source-application-guide', '航海院校 L284-L316', []),
    category('local-special', '地方专项计划', '面向江苏规定实施区域内符合农村户籍、连续户籍与学籍条件的考生。', 'source-application-guide', '地方专项 L320-L362', []),
    category('rural-teacher', '乡村教师定向培养', '江苏县域定向培养，实行本县报本县、协议培养、排名选岗和服务期约束。', 'source-application-guide', '乡村教师 L366-L421', []),
    category('rural-medical', '农村订单定向医学生', '县域定向招生、免费培养、全科规培和基层服务相结合，不应宣传为人人自动入编。', 'source-application-guide', '定向医学生 L425-L490', []),
    category('other', '其他院校', '包含党政特色院校、特殊专业、飞行技术、港校等；“其他”不等于没有附加条件。', 'source-application-guide', '其他院校 L492-L747', [
      category('other-government', '党政特色院校', '外交学院、国际关系学院、北京电子科技学院、中国消防救援学院和上海海关学院。', 'source-application-guide', '五所特色院校 L496-L706', []),
      category('other-marxism', '马克思主义理论', '部分院校在提前批安排马克思主义理论等专业。', 'source-application-guide', '马克思主义理论 L708-L712', []),
      category('other-language', '小语种', '录取、口试和转专业限制必须逐校核对。', 'source-early-analysis', '外语类 L423-L463', []),
      category('other-flight', '飞行技术', '必须在高考志愿前完成招飞报名和选拔资格。', 'source-early-analysis', '飞行技术 L365-L400', []),
      category('other-targeted', '核工程、军工及其他特殊培养', '协议单位、服务年限、费用、转专业与升学限制必须读取当年协议原文。', 'source-application-guide', '特殊培养 L726-L733', []),
      category('other-film', '戏剧影视文学／广播电视编导', '部分取消专业考试的专业可能按特殊要求放在提前批。', 'source-application-guide', '特殊培养 L733-L736', []),
      category('other-hong-kong', '港校提前批路径', '学校清单与招生方式在三份材料中冲突，必须以 2026 官方招生安排为准。', 'source-jiangsu-summary', '港澳院校 L16、L48、L215-L219', [], { conflictGroup: 'conflict-hong-kong-list', verificationStatus: SOURCE_CONFLICT })
    ])
  ];

  const RULES = [
    // 军校
    rule('military-unmarried', 'military', '基本资格', '报考军队院校的普通高中毕业生须未婚。', { maritalStatus: 'unmarried' }, 'source-application-guide', '军校／报考条件 L10-L16', { decisionEffect: 'candidate_block' }),
    rule('military-age', 'military', '基本资格', '材料列明年龄不低于 16 周岁、不超过 20 周岁。', { minAge: 16, maxAge: 20, cutoffDate: null }, 'source-application-guide', '军校／报考条件 L16', { decisionEffect: 'candidate_block' }),
    rule('military-score', 'military', '成绩门槛', '材料列明高考成绩须达到江苏特殊类型招生控制线。', { threshold: 'special_control_line' }, 'source-application-guide', '军校／报考条件 L18', { decisionEffect: 'candidate_block' }),
    rule('military-assessment', 'military', '政治与身体', '需政治考核、体质测试及军队体检标准合格。', { politicalReview: true, fitnessTest: true, medicalExam: true }, 'source-application-guide', '军校／报考条件 L21-L23', { decisionEffect: 'candidate_block' }),
    rule('military-psychology-interview', 'military', '心理与面试', '心理检测评估军队职业适应性；面试考察动机、形象、逻辑与表达，材料称结论当场公布并可当场复议。', { psychologicalTest: true, interview: true, onSiteReview: true }, 'source-application-guide', '军校／流程说明 L43-L49', { decisionEffect: 'candidate_block' }),
    rule('military-laser-six-months', 'military', '视力手术', '报考指南要求眼睛激光手术满半年并携带相关证明。', { minimumMonthsAfterLaserSurgery: 6, proofRequired: true }, 'source-application-guide', '军校／体检 L49-L51', { decisionEffect: 'candidate_block', conflictGroup: 'conflict-military-laser' }),
    rule('military-entry-review', 'military', '入学复查', '新生入校后仍须通过政治考核和身体复查，合格后取得学籍、军籍。', { entryPoliticalReview: true, entryMedicalReview: true }, 'source-application-guide', '军校／有关待遇 L56-L57', { decisionEffect: 'candidate_block' }),
    rule('military-no-internal-index', 'military', '防骗', '不存在所谓内部招生指标；任何收费承诺录取均应视为风险。', { internalQuota: false }, 'source-application-guide', '军校／谨防骗局 L70-L78', { ruleKind: 'safety_warning', decisionEffect: 'warn' }),
    rule('military-training-labels', 'military', '培养目标', '材料对是否继续使用“指挥／非指挥”分类存在冲突，产品只能展示 2026 招生专业备注中的培养目标。', { useOfficialTrainingGoalOnly: true }, 'source-application-guide', '军校 L1-L2；提前批招生 L23-L30', { conflictGroup: 'conflict-military-classification', verificationStatus: SOURCE_CONFLICT, decisionEffect: 'verify' }),

    // 公安院校
    rule('police-basic', 'public-security', '基本资格', '材料列明高中毕业、16—22 周岁、未婚，并需政治、身体和心理条件合格。', { minAge: 16, maxAge: 22, maritalStatus: 'unmarried', highSchoolGraduate: true }, 'source-application-guide', '公安院校／报考条件 L103-L108', { decisionEffect: 'candidate_block' }),
    rule('police-height', 'public-security', '身高', '材料列明男生 170cm 及以上、女生 160cm 及以上。', { maleMinCm: 170, femaleMinCm: 160 }, 'source-application-guide', '公安院校／体检 L111-L114', { decisionEffect: 'candidate_block' }),
    rule('police-bmi', 'public-security', 'BMI', '材料列明男生 BMI 17.3—27.3、女生 17.1—25.7。', { male: [17.3, 27.3], female: [17.1, 25.7] }, 'source-application-guide', '公安院校／体检 L115', { decisionEffect: 'candidate_block' }),
    rule('police-vision-color', 'public-security', '视力与色觉', '材料列明任何一眼裸眼视力 4.8 及以上，且无色盲、色弱。', { nakedVisionMin: 4.8, colorBlindAllowed: false, colorWeakAllowed: false }, 'source-application-guide', '公安院校／体检 L117-L120', { decisionEffect: 'candidate_block' }),
    rule('police-appearance', 'public-security', '外观与功能', '材料列出脊柱、膝内外翻、扁平足、瘢痕、静脉曲张、腋臭、斜视等检查项目。', { officialMedicalChecklistRequired: true }, 'source-application-guide', '公安院校／体检 L121', { decisionEffect: 'verify' }),
    rule('police-interview', 'public-security', '面试', '面试考察外貌体型、动机、协调反应、心理、表达、逻辑和理解能力。', { interview: true, dimensions: ['appearance', 'motivation', 'coordination', 'reaction', 'psychology', 'expression', 'logic'] }, 'source-application-guide', '公安院校／面试 L123-L125', { decisionEffect: 'candidate_block' }),
    rule('police-fitness-image-missing', 'public-security', '体能测评', '体能测评项目和标准在 Markdown 中仅有图片，不能据此写入具体阈值。', { fitnessTest: true, standardsAvailableInText: false }, 'source-application-guide', '公安院校／体能 L127-L130', { verificationStatus: IMAGE_INCOMPLETE, decisionEffect: 'verify', officialCheck: '读取 2026 江苏公安院校招生工作通知中的体能项目、次数和合格规则。' }),
    rule('police-female-plan', 'public-security', '性别计划', '材料写公安类专业女生不超过计划人数 15%，应按 2026 院校专业组计划逐项核验。', { femalePlanMaximumShare: 0.15 }, 'source-application-guide', '公安院校／体能说明 L132', { decisionEffect: 'verify' }),
    rule('police-professional-identity', 'public-security', '联考资格', '只能按“公安院校＋公安专业＋当届政策”核对公安联考资格，不能只凭学校名称判断。', { institutionTypeRequired: 'public_security_college', majorTypeRequired: 'public_security_major' }, 'source-application-guide', '公安院校／毕业就业 L166-L179', { decisionEffect: 'candidate_block' }),
    rule('police-category-exclusive', 'public-security', '志愿兼报', '材料称填报公安政法类院校志愿时不得兼报其他提前录取本科类别。', { mutuallyExclusiveWithOtherEarlyCategories: true }, 'source-application-guide', '公安院校／流程 L153', { decisionEffect: 'candidate_block' }),
    rule('police-admission-order', 'public-security', '录取方式', '材料称政治考察合格后执行“分数优先、遵循志愿”。', { mode: 'score_priority_follow_preferences' }, 'source-application-guide', '公安院校／流程 L157-L161', { decisionEffect: 'verify', conflictGroup: 'conflict-police-volunteer-mode' }),

    // 中央司法警官学院
    rule('judicial-basic', 'judicial-police', '基本资格', '材料列明应届、往届高考生均可，年龄不超过 22 周岁，未婚。', { maxAge: 22, freshGraduateRequired: false, maritalStatus: 'unmarried' }, 'source-application-guide', '司法院校／招生对象 L200-L201', { decisionEffect: 'candidate_block' }),
    rule('judicial-political-disqualifiers', 'judicial-police', '政治考察', '材料列出本人受刑事处罚、犯罪嫌疑未查清、参加邪教、吸毒盗窃等违法行为、家庭成员正在服刑等不合格情形。', { officialPoliticalReviewRequired: true, sensitiveDetailsShouldNotBeStoredInPublicUi: true }, 'source-application-guide', '司法院校／招生条件 L206-L221', { decisionEffect: 'candidate_block' }),
    rule('judicial-interview', 'judicial-police', '面试', '面试主要从报考动机、言语表达等方面判断是否适合人民警察工作。', { interview: true, dimensions: ['motivation', 'expression'] }, 'source-application-guide', '司法院校／招生条件 L223-L225', { decisionEffect: 'candidate_block' }),
    rule('judicial-vision', 'judicial-police', '视力与色觉', '报考指南写双侧裸眼视力不低于 4.7 且无色盲色弱；另一材料写 4.8，数值不能直接写成 2026 硬规则。', { nakedVisionMinFromGuide: 4.7, conflictingValue: 4.8, colorBlindAllowed: false, colorWeakAllowed: false }, 'source-application-guide', '司法院校 L227-L243；提前批招生 L94-L99', { decisionEffect: 'verify', conflictGroup: 'conflict-judicial-vision', verificationStatus: SOURCE_CONFLICT }),
    rule('judicial-height-weight-hearing', 'judicial-police', '身体条件', '材料列明男 170cm／50kg、女 160cm／45kg，两耳听力超过 3 米，并列出外观与疾病限制。', { maleMinCm: 170, femaleMinCm: 160, maleMinKg: 50, femaleMinKg: 45, hearingDistanceMeters: 3 }, 'source-application-guide', '司法院校／身体条件 L231-L243', { decisionEffect: 'candidate_block' }),
    rule('judicial-fitness-image-missing', 'judicial-police', '体能测评', '材料称三个项目全部测试、两个及以上达标为合格，但项目和阈值只在图片中。', { totalItems: 3, minimumPassedItems: 2, itemStandardsAvailableInText: false }, 'source-application-guide', '司法院校／体能 L245-L250', { verificationStatus: IMAGE_INCOMPLETE, decisionEffect: 'verify' }),
    rule('judicial-category-exclusive', 'judicial-police', '志愿兼报', '材料称填报该公安政法类别时不得兼报其他提前录取本科类别。', { mutuallyExclusiveWithOtherEarlyCategories: true }, 'source-application-guide', '司法院校／流程 L272', { decisionEffect: 'candidate_block' }),
    rule('judicial-professional-identity', 'judicial-police', '就业考试资格', '只能按江苏当年投放的司法行政警察类专业核验相应招警考试资格。', { eligibleMajorType: 'judicial_administration_police_major' }, 'source-application-guide', '司法院校／毕业就业 L279-L280', { decisionEffect: 'candidate_block' }),

    // 航海
    rule('maritime-navigation-health', 'maritime', '航海技术身体条件', '材料列明无色盲色弱、无复视、身高 160cm 以上；裸眼 4.7，或裸眼 4.0 且矫正 4.8。', { major: '航海技术', minHeightCm: 160, nakedVisionOptionA: 4.7, nakedVisionOptionB: 4.0, correctedVisionOptionB: 4.8, colorNormalRequired: true, diplopiaAllowed: false }, 'source-application-guide', '航海／身体条件 L289-L293', { decisionEffect: 'candidate_block' }),
    rule('maritime-engine-health', 'maritime', '轮机与船电身体条件', '材料列明无色盲色弱、无复视、身高 155cm 以上；裸眼 4.6，或裸眼 4.0 且矫正 4.6。', { majors: ['轮机工程', '船舶电子电气工程'], minHeightCm: 155, nakedVisionOptionA: 4.6, nakedVisionOptionB: 4.0, correctedVisionOptionB: 4.6, colorNormalRequired: true, diplopiaAllowed: false }, 'source-application-guide', '航海／身体条件 L294-L296', { decisionEffect: 'candidate_block' }),
    rule('maritime-school-specific-height', 'maritime', '院校差异', '材料明确各校身高要求可能不同，最终按招生章程。', { schoolSpecificRuleRequired: true }, 'source-application-guide', '航海／身体条件 L296', { decisionEffect: 'verify' }),
    rule('maritime-medical-report', 'maritime', '体检材料', '可按高校要求提交高考体检表；需单独体检时，应在录取前到二甲及以上医院完成。', { gaokaoMedicalFormPossible: true, separateHospitalMinimum: '二级甲等' }, 'source-application-guide', '航海／报考流程 L301-L310', { decisionEffect: 'task' }),
    rule('maritime-career-warning', 'maritime', '职业认知', '航海技术等以船员职业为主要方向，不等同于海洋科学、海洋技术或海洋工程研究方向。', { distinguishFrom: ['海洋科学', '海洋技术', '海洋工程'] }, 'source-early-analysis', '航海类 L407-L421', { ruleKind: 'career_warning', decisionEffect: 'warn' }),

    // 地方专项
    rule('local-special-region', 'local-special', '实施区域', '地方专项面向江苏规定实施区域内的农村和脱贫地区考生。', { officialImplementationRegionRequired: true }, 'source-application-guide', '地方专项 L320-L324', { decisionEffect: 'candidate_block' }),
    rule('local-special-hukou', 'local-special', '户籍条件', '本人及父母一方或法定监护人户籍须在实施区域农村，本人具有当地连续 3 年以上户籍。', { candidateAndGuardianRuralHukou: true, candidateLocalHukouYears: 3 }, 'source-application-guide', '地方专项／考生要求 L338-L344', { decisionEffect: 'candidate_block' }),
    rule('local-special-schooling', 'local-special', '学籍条件', '本人须具有户籍所在县高中连续 3 年学籍并实际就读。', { localHighSchoolEnrollmentYears: 3, actualAttendanceRequired: true }, 'source-application-guide', '地方专项／考生要求 L340-L345', { decisionEffect: 'candidate_block' }),
    rule('local-special-score', 'local-special', '成绩门槛', '材料列明须达到特殊类型招生控制线。', { threshold: 'special_control_line' }, 'source-application-guide', '地方专项／考生要求 L346', { decisionEffect: 'candidate_block' }),
    rule('local-special-prior-abandonment', 'local-special', '历史资格', '材料称自 2023 年起，曾被专项计划录取后放弃入学或退学者不再具备专项计划资格。', { priorSpecialPlanAbandonmentDisqualifies: true }, 'source-application-guide', '地方专项／考生要求 L348', { decisionEffect: 'verify' }),

    // 江苏乡村教师
    rule('teacher-county-match', 'rural-teacher', '县域资格', '实行本县报本县，户籍须在有定向培养计划的县（市、区）。', { householdCountyMustMatchPlanCounty: true }, 'source-application-guide', '乡村教师／政策问答 L386-L393', { decisionEffect: 'candidate_block' }),
    rule('teacher-agreements', 'rural-teacher', '协议', '入学前与县级教育局签定向就业协议，报到后与培养院校签定向培养协议。', { employmentAgreement: true, trainingAgreement: true }, 'source-application-guide', '乡村教师 L381、L391-L397', { decisionEffect: 'candidate_block' }),
    rule('teacher-no-hukou-major-change', 'rural-teacher', '培养限制', '培养期间不迁移户口、不变更户籍、不变更专业。', { moveHukouAllowed: false, changeHukouAllowed: false, changeMajorAllowed: false }, 'source-application-guide', '乡村教师／培养 L395-L399', { decisionEffect: 'warn' }),
    rule('teacher-qualification-loss', 'rural-teacher', '培养考核', '课程、处分、毕业学位和教师资格证不符合协议要求时，可能取消定向资格。', { courseAssessment: true, disciplineAssessment: true, degreeRequired: true, teacherCertificateRequired: true }, 'source-application-guide', '乡村教师／培养 L399', { decisionEffect: 'warn' }),
    rule('teacher-job-ranking', 'rural-teacher', '选岗', '材料称综合成绩按院校成绩 30%、教师资格笔试 30%、县区定向招聘考试 40% 计算并据此选岗。', { collegeScoreWeight: 0.3, teacherExamWeight: 0.3, countyRecruitmentWeight: 0.4 }, 'source-application-guide', '乡村教师／就业 L401-L403', { decisionEffect: 'verify' }),
    rule('teacher-fee-compensation', 'rural-teacher', '学费', '江苏乡村教师在读期间收费与普通学生相同，符合政策后补偿学费，不应写成入学即全免。', { tuitionFreeAtEnrollment: false, conditionalCompensation: true }, 'source-application-guide', '乡村教师／学费 L405-L407', { decisionEffect: 'warn' }),
    rule('teacher-service-years', 'rural-teacher', '服务期', '江苏乡村教师材料写连续服务满 5 年；不得与部属公费师范生 6 年口径混用。', { serviceYears: 5, programScope: '江苏乡村教师定向培养' }, 'source-application-guide', '乡村教师／服务期 L409-L411；提前批招生 L478-L486', { decisionEffect: 'warn', conflictGroup: 'conflict-teacher-programs' }),
    rule('teacher-postgraduate-restrictions', 'rural-teacher', '升学限制', '毕业前和服务期内原则上不得报考全日制高层次学历；非全日制报考需征得任教学校同意。', { fullTimePostgraduateAllowedDuringService: false, partTimeRequiresEmployerApproval: true }, 'source-application-guide', '乡村教师／升学 L413-L417', { decisionEffect: 'warn' }),
    rule('teacher-breach', 'rural-teacher', '违约责任', '未到岗或未完成服务期可能涉及限制考研、限制应聘江苏事业单位及违约金。', { graduateExamRestrictionPossible: true, jiangsuPublicInstitutionRestrictionPossible: true, penaltyPossible: true }, 'source-application-guide', '乡村教师／违约 L419-L421', { decisionEffect: 'warn' }),

    // 定向医学生
    rule('medical-county-match', 'rural-medical', '县域资格', '材料称有计划县区户籍的应届高中毕业生可报本县对应定向志愿，主要招农村生源并优先定岗县生源。', { freshGraduateRequired: true, householdCountyMustMatchPlanCounty: true, ruralCandidatesPreferred: true }, 'source-application-guide', '定向医学生／报名条件 L449-L456', { decisionEffect: 'candidate_block' }),
    rule('medical-service', 'rural-medical', '服务期', '毕业后到基层医疗卫生机构服务 6 年，主要为乡镇卫生院和村卫生室。', { serviceYears: 6, serviceUnits: ['乡镇卫生院', '村卫生室'] }, 'source-application-guide', '定向医学生／报名条件 L450-L456', { decisionEffect: 'warn' }),
    rule('medical-benefits', 'rural-medical', '培养待遇', '在校期间免学费、免住宿费、补助生活费，户籍保留原地。', { tuitionFree: true, accommodationFree: true, livingAllowance: true, hukouRemainsLocal: true }, 'source-application-guide', '定向医学生／培养政策 L458-L460', { decisionEffect: 'verify' }),
    rule('medical-residency-training', 'rural-medical', '规培', '毕业后参加 3 年全科住院医师规范化培训，材料称计入 6 年服务期。', { generalPracticeTrainingYears: 3, countsTowardService: true }, 'source-application-guide', '定向医学生／培养政策 L462', { decisionEffect: 'warn' }),
    rule('medical-staffing', 'rural-medical', '编制岗位', '材料称有条件地区提供的编制岗位最高不超过招生人数 80%，按考试考核招聘；未通过者安排村医岗位。', { maximumStaffedPositionShare: 0.8, automaticStaffedPosition: false, fallbackRole: '村医岗位' }, 'source-application-guide', '定向医学生／培养政策 L464-L465', { decisionEffect: 'warn', conflictGroup: 'conflict-medical-staffing', verificationStatus: SOURCE_CONFLICT }),
    rule('medical-breach-events', 'rural-medical', '违约情形', '课程、毕业、履约、服务期、规培和医师资格等均可能触发违约认定。', { officialAgreementTextRequired: true }, 'source-application-guide', '定向医学生／违约 L466-L480', { decisionEffect: 'warn' }),
    rule('medical-breach-consequences', 'rural-medical', '违约责任', '可能涉及返还补助、补缴费用、限制考研及省内公立医院招聘、记录不良信用。', { repaymentPossible: true, graduateExamRestrictionPossible: true, publicHospitalRestrictionPossible: true, creditRecordPossible: true }, 'source-application-guide', '定向医学生／违约 L482-L490', { decisionEffect: 'warn' }),

    // 其他类院校与专业
    rule('other-not-condition-free', 'other', '类别理解', '“其他院校”只是类别名称，不代表所有项目均无附加条件。', { conditionFreeByDefault: false }, 'source-application-guide', '其他院校 L492-L706', { decisionEffect: 'warn', conflictGroup: 'conflict-other-condition-free', verificationStatus: SOURCE_CONFLICT }),
    rule('diplomacy-language-health', 'other-government', '外交学院', '材料写英语口语合格，并列出发音、听力、面部特征等“不宜就读”条件。', { englishOralQualified: true, schoolSpecificHealthAdvice: true }, 'source-application-guide', '外交学院 L500-L515', { decisionEffect: 'verify' }),
    rule('diplomacy-political-review', 'other-government', '外交学院', '报考指南写需提交政治审查表，另一材料写不需要政审，不能自动判定。', { politicalReview: null }, 'source-application-guide', '外交学院 L517-L529；提前批招生 L205-L210', { decisionEffect: 'verify', conflictGroup: 'conflict-diplomacy-political-review', verificationStatus: SOURCE_CONFLICT }),
    rule('uir-basic', 'other-government', '国际关系学院', '材料列明不超过 22 周岁，政治面貌为党员或团员，家庭和主要社会关系需符合条件。', { maxAge: 22, politicalAffiliation: ['中共党员', '共青团员'], familyReview: true }, 'source-application-guide', '国际关系学院 L545-L550', { decisionEffect: 'candidate_block' }),
    rule('uir-health', 'other-government', '国际关系学院', '材料列明男 170cm、女 160cm，矫正视力 4.8 以上、无色盲色弱，并有入校体能训练与复查。', { maleMinCm: 170, femaleMinCm: 160, correctedVisionMin: 4.8, colorNormalRequired: true, entryFitnessTraining: true }, 'source-application-guide', '国际关系学院 L551-L555', { decisionEffect: 'candidate_block' }),
    rule('besti-basic', 'other-government', '北京电子科技学院', '材料列明应届生、党员或团员、不超过 20 周岁，外语语种为英语，并有家庭关系和境外经历要求。', { freshGraduateRequired: true, maxAge: 20, politicalAffiliation: ['中共党员（含预备党员）', '共青团员'], gaokaoLanguage: '英语', familyReview: true }, 'source-application-guide', '北京电子科技学院 L582-L595', { decisionEffect: 'candidate_block' }),
    rule('besti-admission', 'other-government', '北京电子科技学院', '材料称第一志愿、面试约 1:2、政审约 1:1、达到特控线，并综合培养单位要求录取。', { firstPreferencePriority: true, interviewRatio: '1:2', politicalReviewRatio: '1:1', threshold: 'special_control_line' }, 'source-application-guide', '北京电子科技学院 L596-L618', { decisionEffect: 'verify' }),
    rule('fire-basic', 'other-government', '中国消防救援学院', '材料称相关招生专业只招男生；应往届均可、不超过 22 周岁、达到特控线，并通过政治、体检、心理与面试。', { maleOnlyFromSource: true, freshGraduateRequired: false, maxAge: 22, threshold: 'special_control_line', politicalReview: true, medicalExam: true, psychologicalTest: true, interview: true }, 'source-application-guide', '消防救援学院 L627-L644', { decisionEffect: 'candidate_block' }),
    rule('fire-entry-review', 'other-government', '中国消防救援学院', '入学一个月内进行档案、政治和体格复核，不合格可能取消入学资格。', { entryReviewWithinMonths: 1, cancellationPossible: true }, 'source-application-guide', '消防救援学院 L660-L664', { decisionEffect: 'warn' }),
    rule('fire-employment', 'other-government', '中国消防救援学院', '毕业后需参加公务员考试择优录用为干部，未录用可按培养方向选择消防员或自主就业；不得写成包分配。', { automaticCadrePlacement: false, routes: ['公务员考试择优录用干部', '消防员', '自主就业'] }, 'source-application-guide', '消防救援学院 L666-L668', { decisionEffect: 'warn', conflictGroup: 'conflict-fire-employment', verificationStatus: SOURCE_CONFLICT }),
    rule('customs-health', 'other-government', '上海海关学院', '报考指南列出英语教学，以及男 168cm、女 158cm、矫正视力 4.8 和外观等建议条件；另一材料称无特殊体检。', { teachingLanguage: '英语', maleMinCmFromGuide: 168, femaleMinCmFromGuide: 158, correctedVisionMinFromGuide: 4.8 }, 'source-application-guide', '上海海关学院 L677-L699；提前批招生 L338-L343', { decisionEffect: 'verify', conflictGroup: 'conflict-customs-health', verificationStatus: SOURCE_CONFLICT }),
    rule('customs-employment', 'other-government', '上海海关学院', '报考指南只说明自主择业和海关专业岗位竞争相对较小；其他材料给出 1/3、86%—90% 等互相冲突比例，系统不得展示固定入编概率。', { automaticPlacement: false, fixedEmploymentRateAllowed: false }, 'source-application-guide', '上海海关学院 L701-L706；提前批招生 L327-L335；体系汇总 L84-L103', { decisionEffect: 'warn', conflictGroup: 'conflict-customs-employment', verificationStatus: SOURCE_CONFLICT }),
    rule('marxism-subject', 'other-marxism', '选科', '材料写马克思主义理论专业要求选考政治，必须按 2026 院校专业组计划确认。', { requiredSubjectFromSource: '政治' }, 'source-application-guide', '马克思主义理论 L708-L712', { decisionEffect: 'verify' }),
    rule('flight-preselection', 'other-flight', '前置选拔', '民航飞行技术需提前通过体检、背景调查和心理品质测试；另一材料还强调高三上学期约 9—11 月启动报名。', { priorMedicalExam: true, backgroundCheck: true, psychologicalTest: true, referenceRegistrationWindow: '高三上学期 9—11 月' }, 'source-application-guide', '飞行技术 L720-L724；提前批招生 L374-L398', { decisionEffect: 'candidate_block' }),
    rule('language-transfer', 'other-language', '转专业与调剂', '小语种是否要求口试、能否转专业、是否接受调剂必须逐校核对，不得把提前批当作进校后必能转专业的跳板。', { schoolSpecificOralExam: true, schoolSpecificTransferPolicy: true, schoolSpecificAdjustmentPolicy: true }, 'source-early-analysis', '外语类 L439-L463', { decisionEffect: 'warn' }),
    rule('targeted-agreement', 'other-targeted', '定向协议', '核工程、军工等定向培养必须保存协议单位、服务年限、资助、转专业与升学限制，所有字段以当年协议原文为准。', { agreementTextRequired: true, fixedServiceYearsAllowedBeforeVerification: false }, 'source-application-guide', '特殊培养 L726-L733；提前批招生 L596-L638', { decisionEffect: 'warn', conflictGroup: 'conflict-nuclear-service', verificationStatus: SOURCE_CONFLICT }),
    rule('film-special-route', 'other-film', '录取形式', '部分戏剧影视文学、广播电视编导取消专业考试后仍可能因学校特殊要求放在提前批，须按 2026 计划核对。', { artProfessionalExamMayBeCancelled: true, schoolSpecificPlacement: true }, 'source-application-guide', '特殊培养 L733-L736', { decisionEffect: 'verify' }),
    rule('hong-kong-list', 'other-hong-kong', '学校清单', '三份材料对香港中文大学、香港珠海学院、港中深、香港城市大学的提前批路径表述互相冲突。', { official2026ListRequired: true }, 'source-jiangsu-summary', '港澳院校 L16、L48、L215-L219；提前批招生 L569-L592；报考指南 L738-L742', { decisionEffect: 'verify', conflictGroup: 'conflict-hong-kong-list', verificationStatus: SOURCE_CONFLICT }),

    // 跨类别录取策略
    rule('ordinary-baseline-first', 'cross-category', '填报工作流', '先完成普通本科批可接受基线，再把提前批作为“做加法”的机会。', { ordinaryBatchBaselineRequired: true }, 'source-jiangsu-summary', '填报核心策略 L273-L284', { ruleKind: 'strategy_opinion', decisionEffect: 'guide' }),
    rule('early-admission-locks-later', 'cross-category', '批次影响', '一旦提前批正式录取，后续普通批不再参与；未录取才继续后续批次。', { admittedStopsLaterBatches: true, notAdmittedContinues: true }, 'source-early-analysis', '外语类风险 L439-L446；乡村教师指南 L387-L390', { decisionEffect: 'warn' }),
    rule('adjustment-not-automatic-safe', 'cross-category', '服从调剂', '不服从调剂可能避免被录取到不可接受专业，但退档或不录取后果须按院校专业组和正式投档规则判断，不能承诺“自动安全”。', { adjustmentChoiceRequiresGroupAnalysis: true, guaranteedSafeRejection: false }, 'source-jiangsu-summary', '服从调剂 L286-L311', { ruleKind: 'strategy_opinion', decisionEffect: 'warn', conflictGroup: 'conflict-rejection-flow' }),
    rule('medical-limit-can-affect-admission', 'cross-category', '体检限报', '讲座材料称体检受限不会导致退档，该绝对说法不得进入规则引擎；身体条件可能影响专业录取。', { physicalLimitNeverAffectsAdmission: false }, 'source-jiangsu-summary', '体检限报 L327-L342', { decisionEffect: 'warn', conflictGroup: 'conflict-medical-limit-withdrawal', verificationStatus: SOURCE_CONFLICT })
  ];

  const TIMELINE = [
    timeline('flight-autumn', '高三上学期 9—11 月', '招飞前置报名', '空军、海军或民航招飞通常需在高考出分前很久完成报名与初步选拔。', ['other-flight'], 'source-early-analysis', '飞行技术 L374-L398'),
    timeline('gaokao-registration', '11 月初', '高考报名与户籍核对', '乡村教师定向资格依赖高考报名时填写的户籍信息。', ['rural-teacher'], 'source-application-guide', '乡村教师／流程 L376-L381'),
    timeline('oral-exam', '3 月下旬参考', '外语口语考试', '有外语类或外交学院意向时，关注江苏口语考试当年通知。', ['other-language', 'other-government'], 'source-application-guide', '外交学院／流程 L517-L525'),
    timeline('local-special-materials', '4 月下旬参考', '地方专项户籍材料', '按中学及县区要求提交户籍等资格材料。', ['local-special'], 'source-application-guide', '地方专项／流程 L353-L358'),
    timeline('gaokao', '6 月 7—9 日参考', '普通高考', '以江苏省 2026 年考试安排为准。', ['all'], 'source-application-guide', '地方专项 L354-L356；定向医学生 L433-L436'),
    timeline('police-pre-registration', '6 月 15—19 日参考', '公安专业预报名', '登录当年指定信息采集系统填写预报名信息。', ['public-security'], 'source-application-guide', '公安院校／流程 L137-L140'),
    timeline('local-special-review', '6 月 20 日前参考', '地方专项审核公示', '设区市、县完成资格审核与公示。', ['local-special'], 'source-application-guide', '地方专项／流程 L358'),
    timeline('qualification-lines', '6 月 25 日前参考', '公安、司法资格线', '关注江苏考试院公布的面试、体检资格线。', ['public-security', 'judicial-police'], 'source-application-guide', '公安 L140；司法 L259'),
    timeline('judicial-political-review', '6 月 26 日前参考', '司法政治考察', '下载当年政治考察表并到规定单位办理。', ['judicial-police'], 'source-application-guide', '司法院校／流程 L256-L257'),
    timeline('judicial-assessment', '6 月 26—27 日参考', '司法面试体检体测', '携带合格政审材料参加面试、体检和体能测试。', ['judicial-police'], 'source-application-guide', '司法院校／流程 L261'),
    timeline('fire-assessment', '6 月 26—29 日参考', '消防综合考核', '参加政治、体格、心理及面试等考核。', ['other-government'], 'source-application-guide', '消防救援学院／流程 L646-L658'),
    timeline('police-assessment', '6 月 26—30 日参考', '公安面试体检体测', '携带当年通知要求的身份证件、户籍和成绩材料。', ['public-security'], 'source-application-guide', '公安院校／流程 L142'),
    timeline('early-batch-application', '6 月 28 日—7 月 2 日参考', '本科提前批志愿填报', '各类别均以江苏考试院 2026 志愿填报日程为准。', ['all'], 'source-application-guide', '公安 L153；司法 L272；航海 L302；地方专项 L360；乡村教师 L379；定向医学生 L436'),
    timeline('post-application-assessment', '7 月 2 日起参考', '查询结果与院校后续考核', '公安测评结果、北电科面试政审、海关面试体检等可能在填报后快速衔接。', ['public-security', 'other-government'], 'source-application-guide', '公安 L155；北电科 L600-L604；海关 L693-L697'),
    timeline('police-political-review', '7 月 3—12 日参考', '公安政治考察', '测评合格并填报公安专业后，按通知提交政治考察材料。', ['public-security'], 'source-application-guide', '公安院校／流程 L157'),
    timeline('admission', '7 月 8 日起参考', '提前批投档录取', '多类别材料均以该日作为往年投档参考，2026 日期须另行确认。', ['all'], 'source-application-guide', '公安 L159；航海 L310；地方专项 L362；乡村教师 L381；定向医学生 L440'),
    timeline('police-supplement', '7 月 12—13 日参考', '公安征求志愿', '仅作为往年参考；是否征集、计划数和资格以 2026 通知为准。', ['public-security'], 'source-application-guide', '公安院校／流程 L161'),
    timeline('agreements', '录取后一周／入学前参考', '签署定向协议', '乡村教师和定向医学生需在规定时间完成就业与培养协议。', ['rural-teacher', 'rural-medical'], 'source-application-guide', '乡村教师 L381；定向医学生 L442-L444'),
    timeline('entry-review', '入学后 1—3 个月参考', '入学资格复查', '军校、消防、海关等项目存在入校复查，不合格可能影响资格。', ['military', 'other-government'], 'source-application-guide', '军校 L57；消防 L662-L664；海关 L699')
  ];

  const CONFLICTS = [
    conflict('conflict-category-count', '江苏提前批类别数', '体系汇总称九大类别，并把体育、艺术列入。', '报考指南称本科提前批有七类。', '主树暂按报考指南的七类；体育、艺术作为并行入口，等待 2026 江苏考试院批次说明。', ['source-jiangsu-summary', 'source-application-guide'], '体系汇总 L19-L30；报考指南 L492-L494'),
    conflict('conflict-other-condition-free', '“其他院校”是否无条件', '体系汇总称“其他类不需要任何条件，直接填”。', '报考指南列出北电科、消防、国关、外交、海关等多项资格。', '不得给“免条件”标签；逐校逐专业组执行资格核验。', ['source-jiangsu-summary', 'source-application-guide'], '体系汇总 L35-L49；报考指南 L500-L706'),
    conflict('conflict-military-classification', '军校培养分类', '分析稿仍分指挥、非指挥和指技融合。', '报考指南称 2025 年起不再区分指挥、非指挥类别。', '只展示 2026 招生专业备注和培养目标。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L23-L30；报考指南 L1-L2'),
    conflict('conflict-military-laser', '军校激光手术期限', '分析稿称实际只要体检时视力达标。', '报考指南明确手术满半年并携带证明。', '禁止采用绕过建议；在官方 2026 文件发布前按半年高风险门槛提示。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L17-L20；报考指南 L49-L51', { severity: 'critical' }),
    conflict('conflict-political-review-simplification', '政审“查三代”简化', '分析稿多次用“查三代、直系亲属无刑事记录”概括。', '报考指南对不同项目列出不同政治考察依据与不合格事项。', '不得保存或输出统一“查几代”结论；按项目官方政治考察表自查。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L19、L59、L98；报考指南 L21、L106、L209-L221', { severity: 'critical' }),
    conflict('conflict-judicial-vision', '中央司法警官学院裸眼视力', '分析稿写双眼裸眼视力不低于 4.8。', '报考指南写双侧裸眼视力不低于 4.7。', '数值标为冲突，不参与自动判定，等待 2026 章程。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L94-L99；报考指南 L227-L243'),
    conflict('conflict-police-volunteer-mode', '公安志愿投档模式', '分析稿泛称大部分省份为顺序志愿。', '江苏报考指南写“分数优先、遵循志愿”。', '系统只采江苏 2026 专业组投档规则，不使用全国泛化结论。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L56；报考指南 L157-L161'),
    conflict('conflict-customs-employment', '上海海关学院入关比例', '分析稿称约 86%—90%。', '讲座汇总称仅约 1/3；报考指南不承诺比例。', '不显示固定入编率或包分配，只展示国考和岗位专业要求。', ['source-early-analysis', 'source-jiangsu-summary', 'source-application-guide'], '提前批招生 L327-L335；体系汇总 L84-L103；报考指南 L701-L706', { severity: 'critical' }),
    conflict('conflict-customs-health', '上海海关学院体检条件', '分析稿称无特殊体检。', '报考指南列身高、矫正视力、外观及面试体检政审流程。', '进入待核，不做自动资格结论。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L338-L343；报考指南 L677-L699'),
    conflict('conflict-fire-employment', '消防救援学院干部录用率', '分析稿称约 88%—90%。', '讲座称约 2/3，报考指南仅说明国考择优。', '不得展示固定比例或包就业；采用“国考择优＋消防员／自主就业”路径。', ['source-early-analysis', 'source-jiangsu-summary', 'source-application-guide'], '提前批招生 L132-L151；体系汇总 L221-L226；报考指南 L666-L668', { severity: 'critical' }),
    conflict('conflict-diplomacy-political-review', '外交学院政审', '分析稿写不需要政审。', '报考指南流程写需提交政治审查表。', '等待外交学院 2026 江苏招生要求，不做自动判断。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L205-L210；报考指南 L517-L529'),
    conflict('conflict-hong-kong-list', '港校提前批清单', '分析稿称只剩香港中文大学。', '体系汇总又出现香港珠海学院、港中深且随后否定港中深提前批；报考指南另称香港城市大学退出。', '不预置可推荐学校，必须读取 2026 江苏招生计划。', ['source-early-analysis', 'source-jiangsu-summary', 'source-application-guide'], '提前批招生 L569-L592；体系汇总 L16、L48、L215-L219；报考指南 L738-L742'),
    conflict('conflict-medical-staffing', '定向医学生是否人人有编', '分析稿和讲座用“有编有岗”概括。', '报考指南称编制岗位最高不超过招生人数 80%，未通过者安排村医。', '明确标记非自动入编，并读取定向县协议和招聘办法。', ['source-early-analysis', 'source-jiangsu-summary', 'source-application-guide'], '提前批招生 L544-L565；体系汇总 L258-L268；报考指南 L462-L465', { severity: 'critical' }),
    conflict('conflict-teacher-programs', '乡村教师与部属公费师范服务期', '分析稿讨论部属公费师范“4+2”和 6 年服务。', '江苏乡村教师指南写四年制本科和连续服务 5 年。', '拆成不同项目，严禁合并规则和待遇。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L465-L520；报考指南 L386-L421'),
    conflict('conflict-nuclear-service', '核定向服务期与证书说法', '分析稿称通常 6 年并有扣留证书等说法。', '报考指南称中核定向至少服务 5 年。', '只展示“需签协议”，服务期、证书、升学限制均等待 2026 协议原文。', ['source-early-analysis', 'source-application-guide'], '提前批招生 L596-L638；报考指南 L726-L731'),
    conflict('conflict-rejection-flow', '不服从调剂后的批次流转', '讲座称提前批退档会自动进入后续批次。', '不同退档原因、专业组与批次状态可能影响结果。', '仅解释一般批次关系，不作“自动安全”承诺。', ['source-jiangsu-summary'], '体系汇总 L286-L311'),
    conflict('conflict-medical-limit-withdrawal', '体检限报能否退档', '讲座给出“体检受限不会被退档”的绝对结论。', '院校章程和专业身体条件本身可能决定是否录取。', '删除绝对保证，按体检指导意见和院校章程逐专业核对。', ['source-jiangsu-summary'], '体系汇总 L327-L342', { severity: 'critical' })
  ];

  const RULE_INDEX = Object.fromEntries(RULES.map((item) => [item.id, item]));
  const CATEGORY_INDEX = {};
  const indexCategory = (item) => {
    CATEGORY_INDEX[item.id] = item;
    item.children.forEach(indexCategory);
  };
  CATEGORIES.forEach(indexCategory);

  window.EARLY_BATCH_RULES_2026 = {
    meta: {
      year: TARGET_YEAR,
      province: PROVINCE,
      version: '2026.07.12-secondary-source-baseline-r1',
      categoryCount: 7,
      sourceCount: SOURCES.length,
      verificationStatus: NEEDS_OFFICIAL,
      officialVerifiedAt: null,
      disclaimer: DATASET_NOTICE,
      decisionPolicy: '二手来源只能生成“研究候选、资格待核、风险提示和任务提醒”；不得生成官方资格确认、录取保证、固定降分或包分配结论。'
    },
    sources: SOURCES,
    categories: CATEGORIES,
    rules: RULES,
    timeline: TIMELINE,
    conflicts: CONFLICTS,
    ruleIndex: RULE_INDEX,
    categoryIndex: CATEGORY_INDEX
  };
})();
