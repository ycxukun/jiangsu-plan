(function () {
  'use strict';

  window.GAOKAO_RULES_DATA = {
    meta: {
      productName: '高考规则讲解系统',
      region: '江苏',
      year: '2026',
      batch: '普通类',
      version: '2026.07 正式文件核对版',
      status: 'verified',
      statusText: '2026 核心规则已按省教育考试院正式文件核对',
      sourceNote: '已核对苏教考招〔2026〕16号、17号；院校招生章程、专业特殊要求和年度计划仍须逐校核验。',
      verifiedAt: '2026-07-12',
      versions: {
        '2026': {
          label: '2026 正式核对版',
          status: 'verified',
          statusText: '2026 核心规则已按省教育考试院正式文件核对',
          sourceNote: '已核对苏教考招〔2026〕16号、17号；院校招生章程、专业特殊要求和年度计划仍须逐校核验。',
          verifiedAt: '2026-07-12',
          documentNumbers: ['苏教考招〔2026〕16号', '苏教考招〔2026〕17号']
        },
        '2025': {
          label: '2025 历史复盘版',
          status: 'archived',
          statusText: '2025 历史规则，仅用于复盘比较',
          sourceNote: '历史版本不得替代2026年正式文件；切换后仅用于解释规则延续与变化。',
          verifiedAt: '2025-03-28',
          documentNumbers: ['苏教考〔2025〕2号']
        }
      },
      officialSources: [
        {
          id: 'volunteer-2026',
          year: '2026',
          title: '关于做好江苏省2026年高考志愿填报工作的通知',
          documentNo: '苏教考招〔2026〕16号',
          publishedAt: '2026-06-11',
          url: 'https://www.jseea.cn/webfile/index/index_zcwj/2026-06-11/7470371910333763584.html'
        },
        {
          id: 'admission-2026',
          year: '2026',
          title: '关于做好江苏省2026年普通高校招生录取工作的通知',
          documentNo: '苏教考招〔2026〕17号',
          publishedAt: '2026-07-02',
          url: 'https://www.jseea.cn/webfile/index/index_zcwj/2026-07-02/7478428169695924224.html'
        },
        {
          id: 'admission-2025',
          year: '2025',
          title: '江苏省2025年普通高等学校招生工作意见',
          documentNo: '苏教考〔2025〕2号',
          publishedAt: '2025-03-28',
          url: 'https://www.jseea.cn/webfile/index/index_zcwj/2025-03-28/7311371955653840896.html'
        }
      ]
    },
    scenes: [
      {
        id: 'parallel',
        order: 1,
        shortTitle: '平行志愿',
        title: '平行志愿如何检索',
        summary: '先按考生成绩与位次排队，再按该考生填报顺序逐个检索；遇到第一个可投专业组后，本轮检索结束。',
        status: 'verified',
        statusText: '已按2026录取文件核对',
        lastVerifiedAt: '2026-07-12',
        keyPoints: ['按分排序：先处理投档分更高、同分排序在前的考生', '遵循志愿：只按考生自己的院校专业组顺序检索', '一次投档：命中一个可投组后，本批平行志愿不再检索后续组'],
        risk: '“平行”不是多个志愿同时投档。档案投到某院校专业组后若被退档，不会再补投该批次后续院校专业组。',
        parentQuestion: '为什么我把某校放在后面，分数够了却没投进去？',
        publicAnswer: '因为系统先处理位次更靠前的考生；轮到你时，再按你的志愿顺序找第一个仍有计划且符合条件的专业组。',
        consultantNote: '现场先演示同一考生的志愿顺序，再切换两名考生说明“分数优先”。不要用“学校看到所有志愿”这类表述。',
        sourceRefs: [
          { sourceId: 'admission-2026', section: '三、投档规则（一）1.平行志愿投档办法', note: '按分排序、遵循志愿、一次投档及退档后不补投' },
          { sourceId: 'volunteer-2026', section: '一、志愿设置', note: '普通类各批次平行志愿及志愿数量' }
        ],
        simulator: {
          candidates: [
            { id: 'c1', name: '考生甲', score: 628, rank: 13200, volunteers: ['g1', 'g2', 'g3'] },
            { id: 'c2', name: '考生乙', score: 624, rank: 15700, volunteers: ['g2', 'g1', 'g3'] },
            { id: 'c3', name: '考生丙', score: 620, rank: 18300, volunteers: ['g1', 'g3', 'g2'] }
          ],
          groups: [
            { id: 'g1', code: 'A校 01组', plan: 1, occupied: 0, requirement: '物理+化学' },
            { id: 'g2', code: 'B校 03组', plan: 1, occupied: 0, requirement: '物理+不限' },
            { id: 'g3', code: 'C校 05组', plan: 2, occupied: 0, requirement: '物理+化学' }
          ]
        }
      },
      {
        id: 'group',
        order: 2,
        shortTitle: '院校专业组',
        title: '院校专业组是什么',
        summary: '院校专业组是新高考投档和填报的基本单位。同一学校可以拆成多个专业组，每个组有独立代码、选科要求、计划和组内专业。',
        status: 'verified',
        statusText: '已按2026填报文件核对',
        lastVerifiedAt: '2026-07-12',
        keyPoints: ['学校不是唯一志愿单位，同校多个组互相独立', '组内专业共享该组的选科与投档入口', '调剂一般发生在同一院校专业组内'],
        risk: '只看学校名称、不看专业组代码和组内专业，容易把不同要求、不同风险的组混在一起。',
        parentQuestion: '同一所大学为什么会出现好几个志愿？',
        publicAnswer: '因为学校会按选科要求、培养方向或专业结构拆成多个专业组。每个组都要单独判断能否报、愿不愿意接受组内专业。',
        consultantNote: '讲解时必须同时展示“学校 + 专业组代码 + 选科 + 组内专业”，不要只用组名推断。',
        ruleFacts: [
          { label: '本科提前批', value: '20个院校专业组' },
          { label: '本科/专科批', value: '各40个院校专业组' },
          { label: '每个专业组', value: '6个专业 + 1个服从调剂' }
        ],
        sourceRefs: [
          { sourceId: 'volunteer-2026', section: '一、志愿设置', note: '院校专业组是志愿填报基本单位，选科符合方可填报' },
          { title: '系统招生计划数据库', section: '学校—院校专业组—专业三级结构', note: '仅用于结构演示，正式代码与专业以当年计划专刊为准' }
        ],
        groups: [
          {
            id: 'nju-06', school: '示例大学', code: '06专业组', requirement: '物理+化学', plan: 38,
            label: '电子信息方向', majors: ['电子信息工程', '通信工程', '微电子科学与工程', '自动化']
          },
          {
            id: 'nju-07', school: '示例大学', code: '07专业组', requirement: '物理+不限', plan: 22,
            label: '经济管理方向', majors: ['金融学', '工商管理', '信息管理与信息系统']
          },
          {
            id: 'nju-08', school: '示例大学', code: '08专业组', requirement: '物理+化学', plan: 16,
            label: '医学方向', majors: ['临床医学', '口腔医学', '医学影像学']
          }
        ]
      },
      {
        id: 'process',
        order: 3,
        shortTitle: '投档流程',
        title: '从填报到录取发生了什么',
        summary: '考试院先按规则检索并把考生档案投到一个院校专业组，学校收到档案后再进行专业分配与录取审核。',
        status: 'verified',
        statusText: '已按2026录取文件核对',
        lastVerifiedAt: '2026-07-12',
        keyPoints: ['考试院负责检索和投档', '学校负责组内专业分配与录取审核', '投档成功不等于已经录取'],
        risk: '把“已投档”当作“已录取”，会忽略专业调剂、体检、单科成绩和招生章程等退档风险。',
        parentQuestion: '档案已经投到学校，是不是肯定录取？',
        publicAnswer: '不一定。学校还要按招生章程分配专业并检查资格。服从调剂且满足各项要求，通常能显著降低退档风险，但仍应核对章程。',
        consultantNote: '明确考试院和高校的职责边界。不要承诺“投档即录取”，要引导核对招生章程。',
        ruleFacts: [
          { label: '投档主体', value: '江苏省教育考试院' },
          { label: '专业分配', value: '招生高校按章程执行' },
          { label: '调档比例', value: '原则上控制在105%以内' }
        ],
        sourceRefs: [
          { sourceId: 'admission-2026', section: '一、录取体制', note: '高校负责、省教育考试院监督；考试院投档、高校按章程录取' },
          { sourceId: 'admission-2026', section: '五、录取工作有关要求（二）按时录取', note: '提档、阅档、审核、预录、退档等环节' }
        ],
        steps: [
          { owner: '考生', title: '提交志愿', detail: '按顺序提交院校专业组及组内专业志愿。', result: '形成有序志愿表' },
          { owner: '考试院', title: '资格与投档检索', detail: '按批次、科类、位次、志愿顺序和计划检索。', result: '未投出或投至一个专业组' },
          { owner: '高校', title: '专业分配', detail: '依据招生章程、专业志愿、成绩和调剂状态分配专业。', result: '拟录取专业或退档建议' },
          { owner: '考试院', title: '录取审核', detail: '审核高校提交的录取或退档结果。', result: '录取结果确认' }
        ]
      },
      {
        id: 'case',
        order: 4,
        shortTitle: '滑档与退档',
        title: '滑档和退档不是一回事',
        summary: '滑档是本轮没有投进任何院校专业组；退档是档案已经投到学校，但在专业分配或资格审核阶段被退回。',
        status: 'verified',
        statusText: '已按2026录取文件核对',
        lastVerifiedAt: '2026-07-12',
        keyPoints: ['滑档发生在考试院投档阶段', '退档发生在高校录取审核阶段', '两种风险的预防方法不同'],
        risk: '志愿整体过高容易滑档；不服从调剂、体检或单科条件不符容易退档。',
        parentQuestion: '分数过了学校投档线，为什么仍可能没有录取？',
        publicAnswer: '过线只说明具备投档可能。若组内所报专业已满且不服从调剂，或体检、单科、资格不符合章程，仍可能退档。',
        consultantNote: '用“档案有没有投出去”区分滑档与退档，再分别讲志愿梯度和章程核对。',
        sourceRefs: [
          { sourceId: 'admission-2026', section: '三、投档规则（一）1.平行志愿投档办法', note: '没有符合条件的院校专业组则不能投档；被退档后不再补投后续组' },
          { sourceId: 'admission-2026', section: '一、录取体制', note: '高校按招生章程决定录取与否及所录专业' },
          { sourceId: 'volunteer-2026', section: '四、志愿填报流程（一）填报准备', note: '须结合成绩、体检结论、家庭经济状况并查阅招生章程' }
        ],
        cases: [
          { id: 'balanced', title: '梯度合理 + 服从调剂', strategy: 'balanced', obey: true, qualified: true, outcome: '录取概率更稳', type: 'safe', detail: '志愿有梯度，命中可投组后，组内专业仍有可接受选择。' },
          { id: 'slide', title: '全部志愿定位过高', strategy: 'aggressive', obey: true, qualified: true, outcome: '可能滑档', type: 'slide', detail: '轮到考生时，所有志愿均无可投计划，档案没有投出。' },
          { id: 'withdraw', title: '专业已满 + 不服从调剂', strategy: 'balanced', obey: false, qualified: true, outcome: '可能退档', type: 'withdraw', detail: '档案已投到学校，但所报专业均满且拒绝组内调剂。' },
          { id: 'qualification', title: '资格或体检不符合', strategy: 'balanced', obey: true, qualified: false, outcome: '可能退档', type: 'withdraw', detail: '即使分数与调剂条件满足，仍可能因章程要求不符而退档。' }
        ]
      },
      {
        id: 'adjustment',
        order: 5,
        shortTitle: '专业调剂',
        title: '服从调剂到底调到哪里',
        summary: '专业调剂通常只在已投档的同一院校专业组内进行，不会跨学校，也不会自动跨到该校另一个专业组。',
        status: 'pending',
        statusText: '一般机制已核对，逐校章程待确认',
        lastVerifiedAt: '2026-07-12',
        keyPoints: ['先确认组内全部专业是否能接受', '已报专业满额时，服从调剂可扩大录取空间', '体检、单科和培养条件仍要符合'],
        risk: '把服从调剂理解成“校内任意专业”或“只会调到相近专业”都不准确。最差可接受专业必须在填报前看清。',
        parentQuestion: '勾选服从调剂，会不会调到别的学校或完全不相关的专业？',
        publicAnswer: '一般不会跨学校，也通常不跨院校专业组；但可能调到该组内你没有主动填报的其他专业，因此要先检查组内所有专业。',
        consultantNote: '现场让家长逐个标记“可接受/需谨慎/不能接受”，再讨论是否服从。正式结论以当年招生章程为准。',
        sourceRefs: [
          { sourceId: 'volunteer-2026', section: '一、志愿设置', note: '每个院校专业组设置专业志愿和专业服从调剂志愿' },
          { sourceId: 'admission-2026', section: '一、录取体制', note: '高校依据招生章程确定录取规则和所录专业' },
          { title: '目标院校当年招生章程', section: '专业录取与调剂条款', note: '必须逐校核对，不能用平台通用解释替代' }
        ],
        majors: [
          { id: 'm1', name: '计算机科学与技术', status: 'full', statusText: '竞争较满', defaultAccept: true },
          { id: 'm2', name: '软件工程', status: 'full', statusText: '竞争较满', defaultAccept: true },
          { id: 'm3', name: '信息安全', status: 'available', statusText: '仍有空间', defaultAccept: true },
          { id: 'm4', name: '物联网工程', status: 'available', statusText: '仍有空间', defaultAccept: false },
          { id: 'm5', name: '数字媒体技术', status: 'available', statusText: '仍有空间', defaultAccept: false }
        ]
      }
    ]
  };
})();
