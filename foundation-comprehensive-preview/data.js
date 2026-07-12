(function () {
  'use strict';

  window.PATHWAY_PREVIEW_DATA = {
    meta: {
      region: '江苏',
      year: '2026',
      status: 'pending',
      statusText: '2026 院校简章与省级细则待逐项核对',
      sourceNote: '当前预览只讲通用机制。报名条件、入围规则、校测安排、综合成绩算法和招生专业必须以当年官方文件为准。'
    },
    tracks: [
      {
        id: 'foundation',
        shortTitle: '强基计划',
        title: '强基计划服务路径',
        accent: 'red',
        summary: '面向基础学科拔尖创新人才培养，重点判断长期学科兴趣、数理基础、培养路径接受度和校测准备能力。',
        publicAnswer: '强基不是普通批次的“降分捷径”。它更像一条长期培养通道：先确认学生是否真正愿意学基础学科，再看成绩、入围、校测和培养方案。',
        consultantNote: '先讲培养方向，再讲报名与分数。不要只用学校层次吸引家长，也不要把往年入围线当作当年承诺。',
        fitRules: [
          { key: 'interest', label: '基础学科兴趣', weight: 30, passValues: ['basic', 'research'] },
          { key: 'subject', label: '数理或人文基础', weight: 25, passValues: ['physics', 'history'] },
          { key: 'grade', label: '校内学业位置', weight: 25, passValues: ['top5', 'top10', 'top20'] },
          { key: 'commitment', label: '接受长期培养', weight: 20, passValues: ['yes'] }
        ],
        stages: [
          {
            id: 'fit', order: 1, title: '适配初筛', owner: '规划师 + 学生', timing: '高一至高三持续判断',
            goal: '确认学生对基础学科、科研训练和长期培养是否真正感兴趣。',
            outputs: ['学科兴趣证据', '成绩与位次趋势', '目标培养方向', '不适配原因记录'],
            questions: ['是否愿意把数学、物理、化学、生物、历史、哲学等基础学科作为长期主线？', '选择强基是因为培养方向，还是只因为学校名气？'],
            warning: '只看院校层次、不看专业和培养路径，是强基咨询中最常见的误区。'
          },
          {
            id: 'research', order: 2, title: '院校简章核对', owner: '规划师', timing: '当年简章发布后',
            goal: '逐校核对招生专业、选科、报名条件、入围方式、校测和培养退出机制。',
            outputs: ['目标院校清单', '简章核对表', '专业与选科匹配表', '年度变化记录'],
            questions: ['该校今年在江苏是否招生？', '目标专业和学生选科是否精确匹配？', '入围与校测规则是否发生变化？'],
            warning: '不同学校规则不能互相套用，往年简章只能用于变化对照。'
          },
          {
            id: 'signup', order: 3, title: '报名与确认', owner: '学生 + 家长', timing: '以当年系统通知为准',
            goal: '完成账号、报名、专业选择、材料提交和必要确认。',
            outputs: ['报名截图', '专业志愿确认', '材料提交回执', '家长确认记录'],
            questions: ['报名信息是否与学籍、证件一致？', '是否理解专业与培养方案？', '是否保存提交凭证？'],
            warning: '报名成功不等于获得入围资格，提交后仍要跟踪系统状态。'
          },
          {
            id: 'exam', order: 4, title: '入围与校测', owner: '学生 + 学科教练', timing: '高考后至校测阶段',
            goal: '跟踪入围结果，完成笔试、面试、体测或学校要求的其他环节。',
            outputs: ['入围结果', '校测安排', '交通住宿方案', '考试与材料清单'],
            questions: ['入围后是否按时确认？', '校测科目与形式是否已经按本校简章核实？', '是否预留行程冲突处理方案？'],
            warning: '校测形式和权重因校而异，不能用统一题型或统一权重代替学校简章。'
          },
          {
            id: 'admit', order: 5, title: '录取与培养确认', owner: '学生 + 家长 + 规划师', timing: '校测后至录取',
            goal: '复核综合成绩、录取结果、专业培养、转段与退出规则。',
            outputs: ['录取结果', '培养方案摘要', '关键限制确认', '后续学习建议'],
            questions: ['是否接受录取专业和长期培养安排？', '是否理解转专业、分流、退出等学校规则？'],
            warning: '录取后的培养与普通专业可能不同，必须在最终确认前讲清楚。'
          }
        ]
      },
      {
        id: 'comprehensive',
        shortTitle: '综合评价',
        title: '综合评价服务路径',
        accent: 'blue',
        summary: '围绕学业成绩、综合素质材料、院校报名条件、校测表现和高考成绩形成多维评价。',
        publicAnswer: '综评不是“材料越多越好”。先确认学校和学生是否匹配，再把成绩、活动、奖项、陈述和校测准备整理成一条可核验的成长主线。',
        consultantNote: '区分省内外、院校类别和年度口径。材料必须真实可核，不把普通参与经历包装成竞赛成果。',
        fitRules: [
          { key: 'record', label: '学业记录完整', weight: 30, passValues: ['complete'] },
          { key: 'grade', label: '校内学业位置', weight: 25, passValues: ['top5', 'top10', 'top20', 'top30'] },
          { key: 'evidence', label: '成长证据可核验', weight: 25, passValues: ['rich', 'basic'] },
          { key: 'communication', label: '表达与面试准备', weight: 20, passValues: ['ready', 'train'] }
        ],
        stages: [
          {
            id: 'archive', order: 1, title: '档案盘点', owner: '咨询师 + 规划师', timing: '尽早建立并持续更新',
            goal: '把学业、选科、活动、奖项、服务和成长记录放进统一学生档案。',
            outputs: ['成绩趋势', '选科记录', '活动与奖项证据', '学生陈述素材库'],
            questions: ['哪些经历有原始证明？', '材料是否与学生本人兴趣和专业方向一致？'],
            warning: '信息散落在聊天记录和家长手机里，会直接拖慢后续报名。'
          },
          {
            id: 'match', order: 2, title: '院校条件匹配', owner: '规划师', timing: '当年简章发布后',
            goal: '逐校核对报名条件、招生专业、材料要求、学校类别和录取办法。',
            outputs: ['可报名清单', '条件差距清单', '专业方向匹配', '时间冲突表'],
            questions: ['学生是否满足硬性报名条件？', '院校类别和录取规则是否已按当年文件确认？'],
            warning: '学校名称相似、往年条件相近，也不能跳过当年简章核对。'
          },
          {
            id: 'materials', order: 3, title: '材料组织与提交', owner: '学生 + 家长 + 规划师', timing: '报名窗口内',
            goal: '按学校字段逐项完成报名表、陈述、成绩、证明和签字盖章。',
            outputs: ['学校版材料包', '扫描件清单', '提交回执', '缺件复核记录'],
            questions: ['每份材料是否对应系统字段？', '是否存在模糊、过期、缺章或信息不一致？'],
            warning: '同一份材料不能不加核对地复制给所有学校。'
          },
          {
            id: 'assessment', order: 4, title: '初审与校测', owner: '学生 + 规划师', timing: '以学校通知为准',
            goal: '跟踪初审结果，准备面试、笔试、能力测试或学校要求的其他环节。',
            outputs: ['初审状态', '校测通知', '训练计划', '行程与证件清单'],
            questions: ['校测方式是否逐校确认？', '回答是否能够回到真实经历和专业动机？'],
            warning: '背模板不等于有效表达，面试内容必须能够经得起追问。'
          },
          {
            id: 'admission', order: 5, title: '结果与志愿衔接', owner: '规划师 + 学生', timing: '高考出分后至录取',
            goal: '核对入选资格、综合成绩、志愿填报要求和普通批方案衔接。',
            outputs: ['入选结果', '综合成绩记录', '志愿填报动作', '普通批备选方案'],
            questions: ['是否需要在指定批次或系统完成志愿确认？', '未入选时普通批方案是否仍然完整？'],
            warning: '综评方案不能替代普通批底盘，必须保留完整的普通批志愿方案。'
          }
        ]
      }
    ],
    materials: [
      { id: 'identity', category: '身份与学籍', title: '身份证件与学籍信息', tracks: ['foundation', 'comprehensive'], owner: '学生/家长', required: true },
      { id: 'scores', category: '学业成绩', title: '高中阶段成绩与年级位置', tracks: ['foundation', 'comprehensive'], owner: '学校/学生', required: true },
      { id: 'subjects', category: '选科信息', title: '高考选科与专业匹配记录', tracks: ['foundation', 'comprehensive'], owner: '规划师', required: true },
      { id: 'statement', category: '陈述材料', title: '个人陈述与专业动机', tracks: ['foundation', 'comprehensive'], owner: '学生', required: true },
      { id: 'awards', category: '奖项证书', title: '奖项、证书及原始证明', tracks: ['foundation', 'comprehensive'], owner: '学生/家长', required: false },
      { id: 'activities', category: '成长记录', title: '研究、实践、社团与公益活动记录', tracks: ['comprehensive'], owner: '学生', required: false },
      { id: 'recommendation', category: '学校材料', title: '学校盖章、推荐或证明材料', tracks: ['comprehensive'], owner: '高中学校', required: false },
      { id: 'exam-plan', category: '校测准备', title: '校测科目、形式与训练计划', tracks: ['foundation', 'comprehensive'], owner: '规划师/学生', required: true },
      { id: 'travel', category: '行程安排', title: '校测交通、住宿与时间冲突预案', tracks: ['foundation', 'comprehensive'], owner: '家长', required: false },
      { id: 'receipt', category: '提交凭证', title: '报名、确认与材料提交回执', tracks: ['foundation', 'comprehensive'], owner: '学生/家长', required: true },
      { id: 'backup', category: '方案衔接', title: '普通批备选志愿方案', tracks: ['foundation', 'comprehensive'], owner: '规划师', required: true }
    ],
    comparison: [
      { label: '核心判断', foundation: '是否适合基础学科长期培养', comprehensive: '学业与综合成长证据是否匹配院校要求' },
      { label: '材料重点', foundation: '报名信息、专业动机、校测准备', comprehensive: '成绩、陈述、活动奖项与可核验证明' },
      { label: '关键节点', foundation: '报名、入围、校测、综合成绩、录取', comprehensive: '报名、初审、校测、入选、志愿衔接' },
      { label: '主要风险', foundation: '只看名校、不接受专业与培养路径', comprehensive: '材料失真、条件误判、遗漏提交或普通批失守' },
      { label: '普通批关系', foundation: '必须同步保留普通批方案', comprehensive: '必须同步保留普通批方案' }
    ]
  };
}());
