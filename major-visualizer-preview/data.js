(function () {
  'use strict';

  const SOURCE_LIST = [
    {
      name: '专业详解.xlsx',
      purpose: '专业定义、通俗解释、招生规模参考与风险底稿'
    },
    {
      name: '大学专业课程.xlsx',
      purpose: '课程模块、核心课程与学科价值'
    },
    {
      name: '专业就业去向.xlsx',
      purpose: '职业赛道、代表单位、技能与职业痛点'
    },
    {
      name: '专业院校宝典.xlsx',
      purpose: '代表院校、学科平台与院校特色'
    },
    {
      name: '行业特色院校.xlsx',
      purpose: '行业背景和特色院校补充'
    },
    {
      name: '大学与专业简明指南.pdf',
      purpose: '专业代码、学位、规模与专业类口径校核'
    },
    {
      name: '专业大类详解',
      purpose: '专业类辨析、适配人群、误区与咨询框架'
    }
  ];

  const COURSE_TEMPLATES = {
    computer: [
      { name: '数学与逻辑底座', courses: ['高等数学', '线性代数', '离散数学', '概率论'], value: '决定算法理解深度和抽象建模能力。' },
      { name: '程序设计基础', courses: ['程序设计', '面向对象程序设计', '算法设计'], value: '把问题拆成可执行步骤，是后续所有方向的共同语言。' },
      { name: '系统核心', courses: ['数据结构', '计算机组成原理', '操作系统', '计算机网络'], value: '理解软件如何在硬件和网络上真正运行。' },
      { name: '数据与工程', courses: ['数据库系统', '软件工程', '编译原理', '分布式系统'], value: '从写单个程序走向构建稳定的大型系统。' },
      { name: '智能与前沿', courses: ['机器学习', '人工智能', '计算机视觉', '自然语言处理'], value: '在扎实计算机基础上进入智能算法与应用。' }
    ],
    software: [
      { name: '编程与算法', courses: ['程序设计', '数据结构', '算法分析', '设计模式'], value: '形成可维护、可复用的软件设计能力。' },
      { name: '软件工程方法', courses: ['需求工程', '软件体系结构', '软件测试', '项目管理'], value: '把个人编码变成团队协作的工程流程。' },
      { name: '系统基础', courses: ['操作系统', '计算机网络', '数据库系统', '计算机组成原理'], value: '避免只会调用框架，不理解系统边界。' },
      { name: '开发平台', courses: ['Web 开发', '移动开发', '云计算', 'DevOps'], value: '面向真实产品完成开发、部署和持续维护。' },
      { name: '质量与安全', courses: ['软件质量保证', '信息安全', '性能工程', '代码审查'], value: '提高复杂软件的可靠性、安全性与可扩展性。' }
    ],
    ai: [
      { name: '数学基石', courses: ['高等数学', '线性代数', '概率论', '最优化方法'], value: '模型训练和论文阅读的基础门槛。' },
      { name: '计算机基础', courses: ['程序设计', '数据结构', '操作系统', '数据库'], value: '保证算法能够被工程化实现，而不只停留在公式。' },
      { name: '机器学习核心', courses: ['机器学习', '深度学习', '模式识别', '强化学习'], value: '理解模型如何从数据中学习、泛化和决策。' },
      { name: '感知与语言', courses: ['计算机视觉', '自然语言处理', '语音识别', '知识图谱'], value: '覆盖当前人工智能的主要应用方向。' },
      { name: '工程与伦理', courses: ['大数据平台', '模型部署', '人工智能伦理', '数据治理'], value: '把算法放入真实业务，并处理安全与责任边界。' }
    ],
    electronic: [
      { name: '数学与物理', courses: ['高等数学', '线性代数', '大学物理', '复变函数'], value: '处理电路、波形和物理场的基础语言。' },
      { name: '电路底座', courses: ['电路分析', '模拟电子技术', '数字电子技术', '高频电子线路'], value: '理解电子设备内部信号产生、放大和转换。' },
      { name: '信号处理', courses: ['信号与系统', '数字信号处理', '随机信号分析', '图像处理'], value: '从噪声中提取和加工有用信息。' },
      { name: '硬件系统', courses: ['单片机原理', '嵌入式系统', 'FPGA', '电子系统设计'], value: '把电路、传感器和程序组成可工作的设备。' },
      { name: '工程实践', courses: ['电子工艺实习', 'PCB 设计', '综合课程设计', '专业实验'], value: '动手能力直接影响求职时的项目说服力。' }
    ],
    communication: [
      { name: '数学工具箱', courses: ['高等数学', '概率论', '复变函数', '随机过程'], value: '复变函数和概率工具是理解波与噪声的母语。' },
      { name: '电路基础', courses: ['电路分析', '模拟电子技术', '数字电子技术', '高频电子线路'], value: '支撑射频、终端和通信设备的硬件理解。' },
      { name: '信号系统', courses: ['信号与系统', '数字信号处理', '信息论', '编码理论'], value: '研究信息怎样被表示、压缩、保护和恢复。' },
      { name: '通信网络', courses: ['通信原理', '移动通信', '光纤通信', '计算机网络'], value: '理解从基站、光纤到核心网的信息传输链路。' },
      { name: '无线与工程', courses: ['电磁场与电磁波', '天线技术', '射频电路', '通信系统仿真'], value: '把理论落到真实无线系统和设备中。' }
    ],
    chip: [
      { name: '数理与物理', courses: ['高等数学', '大学物理', '量子力学导论', '固体物理'], value: '理解半导体材料和器件机理的基础。' },
      { name: '电路基础', courses: ['电路分析', '模拟电子技术', '数字电子技术', '信号与系统'], value: '连接器件物理与芯片功能设计。' },
      { name: '器件与工艺', courses: ['半导体物理', '半导体器件', '集成电路工艺', '微纳加工'], value: '理解芯片如何从材料走向制造。' },
      { name: '芯片设计', courses: ['数字集成电路', '模拟集成电路', 'EDA 技术', 'SoC 设计'], value: '完成逻辑、版图、验证与系统集成。' },
      { name: '封装与测试', courses: ['芯片封装', '集成电路测试', '可靠性', '专业实验'], value: '覆盖从晶圆到可用产品的后半段流程。' }
    ],
    electrical: [
      { name: '数学与工程基础', courses: ['高等数学', '线性代数', '大学物理', '工程制图'], value: '为电路、电磁场和电力系统建模打底。' },
      { name: '电路与电子', courses: ['电路理论', '模拟电子技术', '数字电子技术', '信号与系统'], value: '理解电能和控制信号在系统中的流动。' },
      { name: '电磁与电机', courses: ['工程电磁场', '电机学', '变压器原理', '电力电子技术'], value: '研究电能与机械能之间的转换。' },
      { name: '电力系统', courses: ['电力系统分析', '继电保护', '高电压技术', '电力系统自动化'], value: '对应电网规划、运行、保护和调度。' },
      { name: '新能源与控制', courses: ['新能源发电', '储能技术', '智能电网', '电气控制'], value: '连接传统强电、新能源和数字化电网。' }
    ],
    control: [
      { name: '数学建模', courses: ['高等数学', '线性代数', '复变函数', '微分方程'], value: '用数学描述动态系统如何随时间变化。' },
      { name: '电学与计算机', courses: ['电路分析', '模电数电', '程序设计', '微机原理'], value: '控制系统需要软硬件共同实现。' },
      { name: '控制理论', courses: ['自动控制原理', '现代控制理论', '系统辨识', '最优控制'], value: '判断系统是否稳定、快速、准确。' },
      { name: '感知与执行', courses: ['传感器技术', '电机与拖动', '运动控制', '嵌入式系统'], value: '让系统感知环境并驱动设备行动。' },
      { name: '智能系统', courses: ['机器人学', '机器视觉', '工业网络', '智能控制'], value: '面向工业自动化、机器人和智能装备。' }
    ],
    clinical: [
      { name: '自然科学基础', courses: ['医用物理', '基础化学', '医用生物学', '医学统计'], value: '构建现代医学所需的理化与数据基础。' },
      { name: '人体形态', courses: ['系统解剖学', '局部解剖学', '组织胚胎学', '病理学'], value: '建立人体结构和疾病变化的空间坐标。' },
      { name: '生命功能', courses: ['生理学', '生物化学', '免疫学', '病理生理学'], value: '理解人体如何运行以及疾病如何发生。' },
      { name: '诊断与治疗', courses: ['诊断学', '药理学', '影像诊断', '临床技能学'], value: '把基础医学知识转化为诊疗决策。' },
      { name: '临床轮转', courses: ['内科学', '外科学', '妇产科学', '儿科学'], value: '在医院场景中形成规范诊疗能力。' }
    ],
    dental: [
      { name: '医学基础', courses: ['人体解剖学', '生理学', '病理学', '药理学'], value: '口腔医学仍需完整的基础医学训练。' },
      { name: '口腔形态与材料', courses: ['口腔解剖生理学', '牙体形态学', '口腔材料学', '口腔生物学'], value: '理解牙齿、颌面结构与修复材料。' },
      { name: '口腔内科', courses: ['牙体牙髓病学', '牙周病学', '口腔黏膜病学', '儿童口腔医学'], value: '处理常见牙体、牙周和黏膜疾病。' },
      { name: '修复与正畸', courses: ['口腔修复学', '口腔正畸学', '种植学', '咬合学'], value: '对动手精细度、审美和长期方案设计要求高。' },
      { name: '外科与实习', courses: ['口腔颌面外科学', '影像诊断', '临床技能', '医院实习'], value: '在真实诊疗中建立操作规范和沟通能力。' }
    ],
    law: [
      { name: '法学理论', courses: ['法理学', '法律逻辑学', '法社会学', '法律方法'], value: '建立规则解释、价值判断和论证框架。' },
      { name: '公法体系', courses: ['宪法学', '行政法', '行政诉讼法', '国际公法'], value: '理解国家权力边界与公共治理规则。' },
      { name: '民商经济法', courses: ['民法', '商法', '经济法', '知识产权法'], value: '处理个人、企业和市场中的权利义务。' },
      { name: '刑事法律', courses: ['刑法', '刑事诉讼法', '证据法', '犯罪学'], value: '研究犯罪认定、程序保障与证据规则。' },
      { name: '法律实务', courses: ['法律文书', '模拟法庭', '律师实务', '法律检索'], value: '将法条、事实和证据组织成可执行方案。' }
    ],
    accounting: [
      { name: '会计基础', courses: ['基础会计', '中级财务会计', '高级财务会计', '成本会计'], value: '掌握复式记账和财务报表形成逻辑。' },
      { name: '财务决策', courses: ['财务管理', '企业价值评估', '管理会计', '资本运营'], value: '从记录数据走向经营分析和资源配置。' },
      { name: '审计风控', courses: ['审计学', '内部控制', '税法', '经济法'], value: '验证信息真实性并识别经营风险。' },
      { name: '数据与系统', courses: ['会计信息系统', 'Excel 建模', '数据库', '财务共享'], value: '适应财务数字化和自动化转型。' },
      { name: '证书与实践', courses: ['CPA 课程', '财务案例', '企业实习', '职业道德'], value: '岗位分层明显，证书和实务能力影响发展上限。' }
    ],
    mis: [
      { name: '管理基础', courses: ['管理学', '经济学', '会计学', '运营管理'], value: '理解组织流程和业务决策。' },
      { name: '计算机基础', courses: ['程序设计', '数据结构', '数据库', '计算机网络'], value: '保证能够和研发团队进行技术沟通。' },
      { name: '信息系统', courses: ['管理信息系统', '系统分析与设计', 'ERP 原理', '项目管理'], value: '把业务需求转化为信息化解决方案。' },
      { name: '数据分析', courses: ['统计学', '商业分析', '数据仓库', '数据可视化'], value: '利用数据支持经营与流程优化。' },
      { name: '数字化实践', courses: ['IT 咨询', '业务流程管理', '信息系统审计', '企业实习'], value: '适合企业数字化、产品和实施咨询方向。' }
    ]
  };

  const CAREER_TEMPLATES = {
    computer: [
      { name: '后端与平台研发', attribute: '研发·核心', work: '构建服务、数据库与高并发业务逻辑。', employers: '互联网平台、金融科技、企业软件', skills: 'Java/Go/C++、数据库、分布式系统', upside: '岗位面广，技术路径清楚。', risk: '技术迭代快，持续学习压力高。' },
      { name: '系统与基础设施', attribute: '研发·底层', work: '参与操作系统、云平台、数据库和网络基础设施。', employers: '云厂商、基础软件、研究机构', skills: 'C/C++、Linux、网络与体系结构', upside: '技术壁垒高，可积累长期能力。', risk: '岗位少且对学校、学历和基础要求高。' },
      { name: '数据与算法工程', attribute: '算法·数据', work: '处理数据、训练模型并完成业务部署。', employers: '科技公司、制造业、研究机构', skills: 'Python、机器学习、数据平台', upside: '可进入智能化和产业数字化方向。', risk: '核心算法岗普遍更看重研究生学历。' },
      { name: '安全与运维', attribute: '安全·稳定', work: '保障系统、网络和业务持续稳定运行。', employers: '政府信息中心、金融机构、云服务商', skills: 'Linux、网络安全、自动化运维', upside: '各行业均有需求。', risk: '部分岗位值班多，职业上限取决于技术深度。' }
    ],
    electronic: [
      { name: '硬件研发', attribute: '研发·硬件', work: '完成电路原理图、PCB、调试和可靠性验证。', employers: '通信设备、消费电子、汽车电子', skills: '模电数电、PCB、示波器与调试', upside: '工程经验可持续积累。', risk: '本科常从测试、助理研发起步。' },
      { name: '嵌入式开发', attribute: '软硬结合', work: '为芯片和设备编写底层驱动与控制程序。', employers: '智能硬件、汽车、工业控制', skills: 'C/C++、MCU、RTOS、接口协议', upside: '覆盖行业广，技术迁移性较强。', risk: '需要同时补硬件与编程，学习面宽。' },
      { name: '信号与算法', attribute: '算法·信号', work: '处理图像、音频、雷达或传感器信号。', employers: '雷达、视觉、医疗设备、安防', skills: 'DSP、MATLAB/Python、统计信号', upside: '专业壁垒高。', risk: '高质量岗位通常偏好硕士。' },
      { name: '测试与技术支持', attribute: '工程·交付', work: '负责产品测试、现场调试和客户技术支持。', employers: '电子制造、设备商、检测机构', skills: '仪器使用、故障定位、沟通', upside: '本科进入门槛相对友好。', risk: '出差或现场工作较多，需主动向研发升级。' }
    ],
    communication: [
      { name: '通信设备研发', attribute: '研发·设备', work: '研发基站、核心网、传输和终端通信模块。', employers: '华为、中兴、设备与芯片企业', skills: '通信原理、协议、C/C++', upside: '技术体系成熟，项目规模大。', risk: '强度与出差情况受岗位影响较大。' },
      { name: '运营商技术岗', attribute: '运营·网络', work: '承担网络规划、优化、运维和业务支撑。', employers: '移动、联通、电信、广电', skills: '网络规划、通信协议、数据分析', upside: '平台稳定、区域覆盖广。', risk: '部分岗位含营销指标，晋升节奏较慢。' },
      { name: '射频与天线', attribute: '研发·射频', work: '设计无线射频前端、天线和电磁兼容方案。', employers: '终端厂商、雷达、卫星通信', skills: '电磁场、高频电路、仿真工具', upside: '专业性强、经验价值高。', risk: '课程难度高，岗位集中于特定城市。' },
      { name: '网络与云通信', attribute: '软件·网络', work: '参与云网融合、网络协议和通信软件开发。', employers: '云厂商、网络设备、工业互联网', skills: '计算机网络、Linux、编程', upside: '可与计算机方向衔接。', risk: '需要主动补足软件工程能力。' }
    ],
    chip: [
      { name: '数字/模拟 IC 设计', attribute: '研发·设计', work: '完成芯片架构、逻辑、模拟电路和验证。', employers: '芯片设计公司、研究院', skills: 'Verilog、模拟电路、EDA', upside: '技术壁垒和发展上限高。', risk: '学历门槛高，研究生更有优势。' },
      { name: '器件与工艺', attribute: '研发·制造', work: '优化半导体器件、晶圆工艺和良率。', employers: '晶圆厂、设备材料企业', skills: '半导体物理、工艺、数据分析', upside: '产业需求稳定，国家投入大。', risk: '部分岗位需要洁净室和倒班。' },
      { name: '封装与测试', attribute: '工程·量产', work: '负责芯片封装方案、测试和可靠性。', employers: '封测企业、芯片公司', skills: '测试开发、可靠性、自动化', upside: '本科岗位相对更多。', risk: '不同岗位技术含量差异明显。' },
      { name: 'EDA 与应用支持', attribute: '软件·工具', work: '开发或应用芯片设计工具，协助客户完成设计。', employers: 'EDA 公司、芯片平台、IP 公司', skills: '编程、数字电路、工具链', upside: '连接软件和芯片，稀缺性较高。', risk: '既要懂电路又要懂软件，学习曲线陡。' }
    ],
    electrical: [
      { name: '电网运行与检修', attribute: '能源·公共事业', work: '负责变电、线路、调度、保护和营销服务。', employers: '国家电网、南方电网、地方能源集团', skills: '电力系统、继电保护、校招考试', upside: '区域岗位多，职业稳定性较强。', risk: '基层、值班和地域分配需要提前了解。' },
      { name: '电气设备研发', attribute: '研发·装备', work: '研发继保、变流器、开关和电机驱动设备。', employers: '南瑞、许继、思源、电气装备企业', skills: '电力电子、嵌入式、控制', upside: '技术与电网产业链结合紧密。', risk: '现场调试和出差较常见。' },
      { name: '新能源电力', attribute: '新能源·系统', work: '参与光伏、风电、储能和并网控制。', employers: '新能源开发商、逆变器、储能企业', skills: '电力电子、并网、储能系统', upside: '产业增长较快。', risk: '项目制明显，行业周期需关注。' },
      { name: '工业电气控制', attribute: '制造·自动化', work: '设计工厂配电、电机与自动化控制方案。', employers: '制造业、设计院、自动化公司', skills: 'PLC、电机、配电设计', upside: '实体产业普遍需要。', risk: '初期现场环境和薪资差异较大。' }
    ],
    control: [
      { name: '嵌入式与控制器', attribute: '研发·底层', work: '设计控制器硬件并开发底层驱动。', employers: '大疆、海康、工业自动化、汽车电子', skills: 'ARM/FPGA、C/C++、PCB', upside: '软硬结合、技术壁垒较高。', risk: '调试复杂，需要持续积累项目经验。' },
      { name: '运动控制算法', attribute: '算法·控制', work: '开发电机、机器人和装备的运动控制算法。', employers: '机器人、伺服、智能制造企业', skills: '控制理论、MATLAB、C++', upside: '核心岗位越做越有经验价值。', risk: '数学要求高，优质岗位偏好硕士。' },
      { name: '工业自动化', attribute: '工程·现场', work: '完成 PLC、产线、DCS 和工业网络集成。', employers: '自动化集成商、流程工业、制造企业', skills: 'PLC、现场总线、项目交付', upside: '行业需求稳定，就业面广。', risk: '现场调试、出差和项目节奏明显。' },
      { name: '机器人系统', attribute: '交叉·智能装备', work: '完成机器人感知、规划、控制和系统集成。', employers: '机器人企业、汽车、物流装备', skills: '机器人学、视觉、ROS、控制', upside: '方向前沿，适合跨学科学生。', risk: '本科需明确机械、控制或算法主攻方向。' }
    ],
    medical: [
      { name: '公立医院临床', attribute: '医疗·核心', work: '完成疾病诊断、治疗、手术或专科诊疗。', employers: '综合医院、专科医院', skills: '执业医师资格、临床规范、沟通', upside: '专业壁垒高，经验价值长期积累。', risk: '培养周期长，规培和学历门槛高。' },
      { name: '基层与公共医疗', attribute: '医疗·公共服务', work: '承担基层诊疗、健康管理和区域医疗服务。', employers: '县市医院、社区卫生中心', skills: '全科能力、公共卫生、沟通', upside: '区域需求稳定。', risk: '岗位地区、编制和收入差异较大。' },
      { name: '医学科研与教学', attribute: '科研·教育', work: '开展疾病机制、临床研究和医学教育。', employers: '高校、研究院、医院科研平台', skills: '研究设计、统计、论文与实验', upside: '可进入学术和创新医疗路径。', risk: '通常需要博士或长期深造。' },
      { name: '医药与器械', attribute: '产业·医学事务', work: '参与临床试验、医学事务、产品或培训。', employers: '药企、器械、CRO', skills: '临床知识、法规、沟通', upside: '医疗之外的产业路径。', risk: '岗位性质与临床医生差异大，应提前规划。' }
    ],
    dental: [
      { name: '口腔医院/科室', attribute: '医疗·口腔', work: '进行牙体、牙周、修复、正畸等诊疗。', employers: '公立医院、口腔专科医院', skills: '执业医师资格、精细操作、沟通', upside: '专业壁垒高，技术可长期积累。', risk: '公立岗位有限，学历和院校平台重要。' },
      { name: '民营口腔机构', attribute: '医疗·市场', work: '承担诊疗、客户沟通与长期维护。', employers: '连锁口腔、民营诊所', skills: '诊疗技术、沟通、服务管理', upside: '岗位较多，个人技术与口碑价值高。', risk: '机构质量差异大，绩效和合规需辨别。' },
      { name: '口腔技工与数字化', attribute: '技术·制造', work: '参与义齿、数字化修复和口腔设备应用。', employers: '义齿、数字口腔、器械企业', skills: 'CAD/CAM、材料、工艺', upside: '数字化发展快。', risk: '与临床医师路径不同，需确认专业与资质。' },
      { name: '科研与教学', attribute: '科研·教育', work: '研究口腔疾病、材料和临床技术。', employers: '高校、研究院、医院', skills: '科研设计、实验、论文', upside: '可形成专科影响力。', risk: '需要较长深造周期。' }
    ],
    law: [
      { name: '律师与律所', attribute: '法律·市场', work: '处理诉讼、非诉、合同和企业法律事务。', employers: '律师事务所、法律服务机构', skills: '法考、检索、写作、谈判', upside: '专业成长和收入上限较高。', risk: '前期案源和收入不稳定，头部机构门槛高。' },
      { name: '司法与公务员', attribute: '法律·公共部门', work: '进入法院、检察、行政执法和法制岗位。', employers: '法院、检察院、政府部门', skills: '法考、公考、规范写作', upside: '岗位职责清晰、稳定性较强。', risk: '考试竞争强，岗位有专业和资格限制。' },
      { name: '企业法务与合规', attribute: '法律·企业', work: '审核合同、管理合规、知识产权和风险。', employers: '企业、金融机构、平台公司', skills: '商法、合同、合规与行业知识', upside: '与产业结合紧密。', risk: '优质岗位通常要求经验、学历和行业理解。' },
      { name: '学术与政策研究', attribute: '研究·教育', work: '进行法学研究、政策分析与教学。', employers: '高校、智库、研究机构', skills: '研究方法、外语、论文写作', upside: '适合理论和公共政策兴趣。', risk: '深造周期长，岗位数量有限。' }
    ],
    accounting: [
      { name: '企业财务', attribute: '财务·经营', work: '负责核算、预算、分析、资金和税务。', employers: '各类企业、集团财务中心', skills: '会计准则、Excel、税务、分析', upside: '行业覆盖广，路径稳定。', risk: '基础核算自动化，需向分析和管理升级。' },
      { name: '审计与咨询', attribute: '专业服务', work: '审计报表、评估内控并提供财务咨询。', employers: '会计师事务所、咨询机构', skills: '审计、CPA、沟通、项目管理', upside: '成长快、行业认知广。', risk: '忙季强度高，证书要求明显。' },
      { name: '金融与风控', attribute: '金融·分析', work: '从事财务分析、授信、风险和资产管理支持。', employers: '银行、证券、保险、投资机构', skills: '财务报表、估值、风险模型', upside: '可连接财务与金融。', risk: '平台和学历影响较大。' },
      { name: '公共部门财会', attribute: '公共·稳定', work: '承担预算、核算、审计和财政管理。', employers: '机关事业单位、国企', skills: '政府会计、公考、审计', upside: '岗位稳定、规则清晰。', risk: '考试竞争和岗位限制需提前核查。' }
    ],
    mis: [
      { name: 'IT 咨询与实施', attribute: '咨询·数字化', work: '梳理业务流程并实施 ERP、CRM 等系统。', employers: '咨询公司、软件厂商、企业信息部', skills: '需求分析、ERP、SQL、项目管理', upside: '技术和业务结合，成长路径清楚。', risk: '出差和项目交付压力较大。' },
      { name: '产品与业务分析', attribute: '产品·分析', work: '研究用户、流程和数据并定义产品需求。', employers: '互联网、企业软件、数字化部门', skills: '原型、数据分析、沟通', upside: '适合复合型能力。', risk: '岗位竞争跨专业，需靠实习和作品证明。' },
      { name: '数据分析', attribute: '数据·经营', work: '建立指标、报表和商业分析模型。', employers: '零售、金融、制造、平台企业', skills: 'SQL、Python、BI、统计', upside: '各行业数字化均有需求。', risk: '课程不够技术化时必须主动补工具。' },
      { name: '企业信息化管理', attribute: '管理·系统', work: '管理系统选型、供应商、权限和信息安全。', employers: '集团信息部、制造与金融企业', skills: '信息系统、治理、沟通', upside: '理解企业全流程。', risk: '基础运维岗位上限有限，应向架构或管理发展。' }
    ]
  };

  const UNIVERSITY_TEMPLATES = {
    computer: [
      { name: '北京航空航天大学', province: '北京', city: '北京', level: 'top', strength: '计算机系统、软件与人工智能平台完整', note: '工科平台强，适合系统与工程方向。' },
      { name: '哈尔滨工业大学', province: '黑龙江', city: '哈尔滨', level: 'top', strength: '计算机、软件与人工智能学科基础强', note: '工程训练扎实，培养强度高。' },
      { name: '南京大学', province: '江苏', city: '南京', level: 'top', strength: '计算机科学、软件与人工智能', note: '理论与科研平台突出，分数要求高。' },
      { name: '东南大学', province: '江苏', city: '南京', level: 'top', strength: '计算机、网络与人工智能交叉', note: '工科平台和区域产业结合较好。' },
      { name: '北京邮电大学', province: '北京', city: '北京', level: 'feature', strength: '计算机与信息通信交叉', note: '行业认可度高，专业选择需看组内构成。' },
      { name: '南京邮电大学', province: '江苏', city: '南京', level: 'feature', strength: '计算机、通信和网络融合', note: '信息行业特色鲜明。' },
      { name: '杭州电子科技大学', province: '浙江', city: '杭州', level: 'feature', strength: '计算机与电子信息产业结合', note: '区域数字产业实习机会较多。' },
      { name: '江苏大学', province: '江苏', city: '镇江', level: 'local', strength: '计算机与制造业数字化', note: '省内综合选择，关注具体培养方向。' }
    ],
    electronic: [
      { name: '电子科技大学', province: '四川', city: '成都', level: 'top', strength: '电子科学、通信与集成电路', note: '电子信息领域平台完整。' },
      { name: '西安电子科技大学', province: '陕西', city: '西安', level: 'top', strength: '通信、电子、雷达与集成电路', note: '行业认可度高，方向集中。' },
      { name: '东南大学', province: '江苏', city: '南京', level: 'top', strength: '信息通信、电子科学与集成电路', note: '江苏省内头部平台。' },
      { name: '北京航空航天大学', province: '北京', city: '北京', level: 'top', strength: '电子信息与航空航天交叉', note: '适合硬件、信息系统与国防方向。' },
      { name: '南京理工大学', province: '江苏', city: '南京', level: 'feature', strength: '电子信息、控制与兵器信息系统', note: '行业特色和工程实践较强。' },
      { name: '南京邮电大学', province: '江苏', city: '南京', level: 'feature', strength: '通信、电子与集成电路', note: '信息通信行业特色突出。' },
      { name: '杭州电子科技大学', province: '浙江', city: '杭州', level: 'feature', strength: '电子、计算机与产业应用', note: '产业联系紧密。' },
      { name: '苏州大学', province: '江苏', city: '苏州', level: 'local', strength: '电子信息、光电与材料交叉', note: '地域产业强，需看具体学院。' }
    ],
    electrical: [
      { name: '西安交通大学', province: '陕西', city: '西安', level: 'top', strength: '电气工程、电力设备与能源系统', note: '电气传统强校，方向完整。' },
      { name: '华中科技大学', province: '湖北', city: '武汉', level: 'top', strength: '电气、电机与新能源', note: '科研和产业平台强。' },
      { name: '华北电力大学', province: '北京', city: '北京', level: 'feature', strength: '电力系统与能源行业', note: '电力行业特色最鲜明。' },
      { name: '南京航空航天大学', province: '江苏', city: '南京', level: 'feature', strength: '电气、航空电源与控制', note: '航空航天交叉特色。' },
      { name: '河海大学', province: '江苏', city: '南京', level: 'feature', strength: '电力系统、水电与新能源', note: '水利电力交叉明显。' },
      { name: '南京工程学院', province: '江苏', city: '南京', level: 'local', strength: '电力工程应用与行业培养', note: '应用导向鲜明，关注就业地域。' },
      { name: '江苏大学', province: '江苏', city: '镇江', level: 'local', strength: '电气与制造装备', note: '适合制造业电气控制方向。' }
    ],
    control: [
      { name: '清华大学', province: '北京', city: '北京', level: 'top', strength: '控制科学、自动化与智能系统', note: '理论和科研平台顶尖。' },
      { name: '上海交通大学', province: '上海', city: '上海', level: 'top', strength: '控制、机器人与智能制造', note: '工程与产业资源丰富。' },
      { name: '浙江大学', province: '浙江', city: '杭州', level: 'top', strength: '控制科学与智能系统', note: '控制学科平台强。' },
      { name: '东南大学', province: '江苏', city: '南京', level: 'top', strength: '控制、机器人与模式识别', note: '江苏省内头部选择。' },
      { name: '南京理工大学', province: '江苏', city: '南京', level: 'feature', strength: '控制、智能装备与国防应用', note: '工程项目和行业特色突出。' },
      { name: '江南大学', province: '江苏', city: '无锡', level: 'feature', strength: '控制与流程工业自动化', note: '轻工、食品和制造场景结合。' },
      { name: '江苏大学', province: '江苏', city: '镇江', level: 'local', strength: '自动化与智能制造', note: '制造业应用场景较多。' }
    ],
    medical: [
      { name: '北京协和医学院', province: '北京', city: '北京', level: 'top', strength: '临床医学与医学科研', note: '培养路径特殊，需逐年核对招生方式。' },
      { name: '复旦大学', province: '上海', city: '上海', level: 'top', strength: '临床医学与附属医院体系', note: '平台强，分数和培养要求高。' },
      { name: '上海交通大学', province: '上海', city: '上海', level: 'top', strength: '临床医学、口腔与附属医院', note: '临床资源丰富。' },
      { name: '南京医科大学', province: '江苏', city: '南京', level: 'feature', strength: '临床、口腔与公共卫生', note: '江苏医学教育和医院资源集中。' },
      { name: '苏州大学', province: '江苏', city: '苏州', level: 'local', strength: '临床医学与区域附属医院', note: '地域资源较好。' },
      { name: '徐州医科大学', province: '江苏', city: '徐州', level: 'feature', strength: '临床医学与麻醉特色', note: '专业特色和就业地域需结合。' },
      { name: '南通大学', province: '江苏', city: '南通', level: 'local', strength: '临床医学与区域医疗', note: '关注培养层次和附属医院。' }
    ],
    law: [
      { name: '中国政法大学', province: '北京', city: '北京', level: 'top', strength: '法学学科体系完整', note: '法律行业认可度高。' },
      { name: '华东政法大学', province: '上海', city: '上海', level: 'feature', strength: '法学与华东法律实务', note: '地域和行业资源较强。' },
      { name: '西南政法大学', province: '重庆', city: '重庆', level: 'feature', strength: '法学传统与实务培养', note: '法学特色院校。' },
      { name: '南京大学', province: '江苏', city: '南京', level: 'top', strength: '法学理论与综合大学平台', note: '适合复合学科和深造。' },
      { name: '苏州大学', province: '江苏', city: '苏州', level: 'local', strength: '法学与区域法律服务', note: '省内法学平台较强。' },
      { name: '南京师范大学', province: '江苏', city: '南京', level: 'local', strength: '法学、教育与公共事务', note: '综合选择，需看培养方向。' },
      { name: '江苏大学', province: '江苏', city: '镇江', level: 'local', strength: '法学与工科产业交叉', note: '适合企业法务方向观察。' }
    ],
    accounting: [
      { name: '厦门大学', province: '福建', city: '厦门', level: 'top', strength: '会计与财务管理传统强项', note: '学术和行业认可度高。' },
      { name: '上海财经大学', province: '上海', city: '上海', level: 'top', strength: '会计、金融与财经平台', note: '区位和行业资源强。' },
      { name: '中央财经大学', province: '北京', city: '北京', level: 'top', strength: '会计、财政与金融', note: '财经行业平台集中。' },
      { name: '南京大学', province: '江苏', city: '南京', level: 'top', strength: '会计与综合大学平台', note: '适合深造和复合发展。' },
      { name: '南京财经大学', province: '江苏', city: '南京', level: 'feature', strength: '会计、审计与区域财经', note: '财经特色鲜明。' },
      { name: '南京审计大学', province: '江苏', city: '南京', level: 'feature', strength: '审计、会计与风控', note: '审计行业特色突出。' },
      { name: '苏州大学', province: '江苏', city: '苏州', level: 'local', strength: '会计与区域产业结合', note: '区位较好，关注具体学院。' }
    ],
    mis: [
      { name: '清华大学', province: '北京', city: '北京', level: 'top', strength: '管理科学、信息系统与数据决策', note: '数理和管理交叉平台强。' },
      { name: '合肥工业大学', province: '安徽', city: '合肥', level: 'feature', strength: '管理科学与信息系统', note: '学科特色鲜明，偏工程管理。' },
      { name: '华中科技大学', province: '湖北', city: '武汉', level: 'top', strength: '信息管理、管理工程与产业数字化', note: '工科平台有利于技术化培养。' },
      { name: '南京大学', province: '江苏', city: '南京', level: 'top', strength: '信息管理、数据与管理交叉', note: '综合平台和深造资源强。' },
      { name: '东南大学', province: '江苏', city: '南京', level: 'top', strength: '管理科学与工程、数字化系统', note: '工科底色明显。' },
      { name: '南京理工大学', province: '江苏', city: '南京', level: 'feature', strength: '信息系统与工业管理', note: '适合制造业数字化场景。' },
      { name: '南京财经大学', province: '江苏', city: '南京', level: 'local', strength: '信息管理与财经数据应用', note: '偏财经业务场景。' }
    ]
  };

  const RAW_MAJORS = [
    {
      id: 'cs', code: '080901', name: '计算机科学与技术', discipline: '工学', category: '计算机类', duration: '四年', degree: '工学', scale: 7536,
      keywords: ['软硬通吃', '底层原理', '算法', '系统'], traits: ['数学', '编程', '深造'], accent: 'cyan', courseFamily: 'computer', careerFamily: 'computer', universityFamily: 'computer',
      academic: '研究计算机系统的设计与制造，以及算法、编程语言与信息处理机制，解决如何让机器计算得更快、更准、更智能的问题。',
      parent: '既学习计算机硬件怎样工作，也学习系统和算法怎样运行。它不是单纯学办公软件，而是理解并建造计算系统。',
      student: '你会大量写程序，也会学操作系统、网络、数据结构等底层课程。喜欢拆解问题、持续调试，比“会玩电脑”重要得多。',
      difficulty: { math: 82, physics: 48, coding: 96, experiment: 62, english: 72, graduate: 68 },
      suitable: ['喜欢逻辑推理和持续解决问题', '能接受长期写代码与调试', '愿意跟进快速变化的技术', '希望保留软件、系统、数据等多方向'],
      unsuitable: ['只因为“热门高薪”而选择', '明显排斥编程和长时间电脑工作', '希望课程轻松且知识更新慢', '缺少自主练习和项目积累意愿'],
      graduate: ['本科可进入开发、测试、运维等岗位', '系统、算法、安全等核心研发更看重研究生平台', '深造方向可选计算机系统、软件、人工智能、网络安全'],
      risks: ['行业红利趋于理性，初级岗位竞争加剧。', '优质岗位越来越看重算法基础、项目和实习，不是只看专业名称。', '技术更新快，需要形成持续学习习惯。', '长期伏案和高强度交付会带来健康管理问题。'],
      similar: ['software', 'ai', 'mis'],
      talkTrack: ['先问学生是否真正写过程序，而不是只问是否喜欢电脑。', '再区分想做应用开发、底层系统、数据算法还是安全。', '看学校时同时看学院平台、课程结构和城市实习资源。'],
      internalNote: '风险底稿来自《专业详解.xlsx》；对外讲解避免制造焦虑，重点强调能力分层、项目证明和持续学习。'
    },
    {
      id: 'software', code: '080902', name: '软件工程', discipline: '工学', category: '计算机类', duration: '四年', degree: '工学', scale: 4804,
      keywords: ['软件开发', '工程化', '系统架构', '团队协作'], traits: ['编程', '项目', '实践'], accent: 'blue', courseFamily: 'software', careerFamily: 'computer', universityFamily: 'computer',
      academic: '将系统化工程原理用于软件开发、运行和维护，关注如何高效、高质量地构建大型、复杂且可靠的软件系统。',
      parent: '可以理解为“盖软件大楼”：不仅写代码，还要做需求、架构、测试、部署和长期维护。',
      student: '课程比计算机科学更偏软件产品和工程流程。你需要既能写代码，也能与团队协作并对质量负责。',
      difficulty: { math: 68, physics: 28, coding: 98, experiment: 78, english: 72, graduate: 58 },
      suitable: ['喜欢把想法做成可使用的产品', '能接受大量编程和团队协作', '重视规范、质量和项目过程', '愿意持续学习开发框架和工具链'],
      unsuitable: ['只想学几个应用软件', '排斥代码审查和反复测试', '不愿承担项目交付压力', '希望技术栈多年不变化'],
      graduate: ['本科工程实践充分时可直接就业', '高端基础软件、架构和研发方向读研更有利', '可向软件工程、计算机技术、网络安全等方向深造'],
      risks: ['部分院校学费可能明显高于普通专业，应核查培养和收费。', '只会调用框架、缺少系统基础时，职业上限容易受限。', '技术栈迭代快，项目经验比课程名称更重要。', '与计算机科学高度重叠，择校时要看课程而非名称。'],
      similar: ['cs', 'ai', 'mis'],
      talkTrack: ['把“喜欢编程”进一步拆成喜欢算法、系统还是做产品。', '重点询问学校是否有真实项目、实习和工程实践。', '比较软件工程与计算机科学时，直接展示课程结构差异。'],
      internalNote: '需提醒家长核查软件工程收费标准，但不要默认所有学校均为高收费。'
    },
    {
      id: 'ai', code: '080717T', name: '人工智能', discipline: '工学', category: '电子信息类', duration: '四年', degree: '工学', scale: 3749,
      keywords: ['算法', '模型', '机器学习', '类脑'], traits: ['数学', '编程', '深造'], accent: 'purple', courseFamily: 'ai', careerFamily: 'computer', universityFamily: 'computer',
      academic: '利用计算机模拟、延伸和扩展人的智能，通过机器学习与深度学习，让计算机具备感知、推理和决策能力。',
      parent: '核心不是“会用 AI 工具”，而是用数学、算法和数据训练模型，让机器完成识别、预测与决策。',
      student: '如果你只喜欢生成式 AI 的效果，却不喜欢数学、编程和实验，这个专业可能并不适合。',
      difficulty: { math: 96, physics: 38, coding: 94, experiment: 72, english: 86, graduate: 94 },
      suitable: ['数学基础强并喜欢抽象建模', '愿意大量编程、读论文和做实验', '能够接受模型效果反复不稳定', '有较强深造意愿'],
      unsuitable: ['只因 ChatGPT 热门而选择', '明显排斥概率统计和线性代数', '只想学工具操作而不学原理', '希望本科毕业直接进入核心算法岗'],
      graduate: ['本科可进入数据、开发和应用工程岗位', '核心算法与研究岗位普遍偏好硕博', '可向机器学习、视觉、语言、机器人和数据科学深造'],
      risks: ['本科专业建设质量差异很大，应检查师资和计算机基础课程。', '核心算法岗位学历门槛高，本科就业常与计算机岗位重叠。', '热点变化快，不能依赖单一模型或工具。', '需要较强英语论文阅读能力。'],
      similar: ['cs', 'software', 'robotics'],
      talkTrack: ['先用数学、编程和深造意愿三项快速筛查。', '看学校时优先看计算机学科基础和实验平台，不只看是否新开 AI 专业。', '把“算法研究”与“AI 应用开发”两条路径讲清楚。'],
      internalNote: '对外避免“泡沫”“低端人才”等绝对表述；用岗位层次和学历门槛解释现实差异。'
    },
    {
      id: 'electronic', code: '080701', name: '电子信息工程', discipline: '工学', category: '电子信息类', duration: '四年', degree: '工学', scale: 4292,
      keywords: ['弱电', '信号', '电路板', '嵌入式'], traits: ['数学', '物理', '实验'], accent: 'amber', courseFamily: 'electronic', careerFamily: 'electronic', universityFamily: 'electronic',
      academic: '利用电子电路和现代电子技术进行信号获取、传输与处理，研发电子设备内部的芯片、电路和信息系统。',
      parent: '主要研究电子硬件和信号处理，例如电路板、传感器、雷达、手机和智能设备内部系统。',
      student: '模电、数电、信号、编程都要学，既要理解公式，也要拿仪器调电路，属于典型软硬结合专业。',
      difficulty: { math: 84, physics: 82, coding: 70, experiment: 92, english: 68, graduate: 80 },
      suitable: ['喜欢电子设备和动手调试', '数学物理基础较好', '能接受软硬件交叉学习', '愿意通过项目明确硬件、嵌入式或信号方向'],
      unsuitable: ['只想做纯软件且排斥电路', '动手耐心不足、讨厌排查故障', '希望本科课程非常聚焦单一方向', '不愿深造又只瞄准高端研发'],
      graduate: ['本科可从硬件测试、嵌入式、技术支持等岗位起步', '信号算法、芯片设计等方向读研优势明显', '可向电子科学、通信、集成电路和控制深造'],
      risks: ['专业口径宽，不同学校课程侧重差异较大。', '本科若没有项目容易出现“软硬都学、都不精”。', '高端研发岗较看重学历和平台。', '硬件调试和现场工作对耐心要求高。'],
      similar: ['communication', 'microelectronics', 'automation'],
      talkTrack: ['先区分学生喜欢电路硬件、信号算法还是嵌入式编程。', '查看目标院校学院归属和实验课比例。', '用通信工程、自动化和电子科学的课程差异做对比。'],
      internalNote: '电子信息类大类招生常在入学后分流，正式接入时需要同时展示分流规则。'
    },
    {
      id: 'communication', code: '080703', name: '通信工程', discipline: '工学', category: '电子信息类', duration: '四年', degree: '工学', scale: 3355,
      keywords: ['5G/6G', '基站', '网络', '传输'], traits: ['数学', '物理', '实验'], accent: 'cyan', courseFamily: 'communication', careerFamily: 'communication', universityFamily: 'electronic',
      academic: '研究信号的产生、传输、交换与处理，解决信息如何快速、准确、抗干扰地跨地点传递。',
      parent: '研究手机信号、光纤、基站和网络背后的传输原理，不等于毕业后只去营业厅或装宽带。',
      student: '你会同时面对概率、信号、电磁场、网络和编程。课程抽象，但能连接无线、网络和芯片多个方向。',
      difficulty: { math: 90, physics: 82, coding: 68, experiment: 82, english: 72, graduate: 80 },
      suitable: ['对无线、网络和信号传输好奇', '数学特别是概率与复变基础较好', '能接受抽象公式与工程实验并重', '愿意进入通信、网络或嵌入式方向'],
      unsuitable: ['把通信理解为营业厅销售', '排斥电磁场和概率课程', '不愿补编程和计算机网络', '不能接受部分岗位出差或值班'],
      graduate: ['本科可进入设备、网络优化、软件和运维岗位', '射频、算法和核心研发方向读研更有优势', '可向信息通信、电子科学、网络与信号处理深造'],
      risks: ['运营商、设备商和研发岗的工作性质差异很大。', '不同学校可能偏电路、网络、光通信或无线，应核课程。', '传统通信增长趋稳，需要与计算机或芯片能力结合。', '部分岗位出差、值班或项目交付强度较高。'],
      similar: ['electronic', 'integrated', 'cs'],
      talkTrack: ['把就业拆成运营商、设备商、研发和软件网络四类。', '要求学生接受信号课程抽象度，再讨论专业兴趣。', '择校时看信息与通信工程平台和城市产业。'],
      internalNote: '不要把“5G 红利已过”讲成行业没有机会，重点说明岗位结构和技术迁移。'
    },
    {
      id: 'microelectronics', code: '080704', name: '微电子科学与工程', discipline: '工学', category: '电子信息类', duration: '四年', degree: '理学或工学', scale: 774,
      keywords: ['芯片', '器件', '工艺', '半导体'], traits: ['数学', '物理', '实验', '深造'], accent: 'purple', courseFamily: 'chip', careerFamily: 'chip', universityFamily: 'electronic',
      academic: '研究微型电子器件和集成电路的设计、制造、封装与测试，重点理解半导体器件和工艺。',
      parent: '研究芯片怎样从半导体材料和晶圆工艺做出来，比电子信息工程更聚焦器件与制造。',
      student: '会接触固体物理、半导体器件和微纳工艺，数学物理要求高，实验和深造准备都很重要。',
      difficulty: { math: 91, physics: 98, coding: 66, experiment: 92, english: 78, graduate: 94 },
      suitable: ['物理和数学基础强', '对芯片器件、材料和制造过程感兴趣', '能接受实验和洁净室环境', '有明确读研意愿'],
      unsuitable: ['只被“芯片高薪”吸引', '排斥固体物理和器件课程', '只想做纯软件', '不能接受部分制造岗位倒班'],
      graduate: ['本科可进入制造、设备、测试和工艺支持', '器件研发和设计岗位普遍更看重研究生学历', '可向微电子、集成电路、材料和电子科学深造'],
      risks: ['学习难度高，物理和实验基础要求明显。', '芯片设计、制造、封测岗位差异很大。', '本科岗位可能集中在设备、工艺和测试。', '行业城市集中度较高，地域选择会受影响。'],
      similar: ['integrated', 'electronic', 'communication'],
      talkTrack: ['先讲清“偏器件与制造”这一核心定位。', '比较微电子和集成电路设计时，用课程和岗位流程图说明。', '核查学校是否有示范性微电子学院、实验平台和硕博点。'],
      internalNote: '院校矩阵正式版应接入“28 所示范微电子学院”等字段，当前只做功能样例。'
    },
    {
      id: 'integrated', code: '080710T', name: '集成电路设计与集成系统', discipline: '工学', category: '电子信息类', duration: '四年', degree: '工学', scale: 1102,
      keywords: ['芯片设计', 'EDA', '验证', 'SoC'], traits: ['数学', '物理', '编程', '深造'], accent: 'purple', courseFamily: 'chip', careerFamily: 'chip', universityFamily: 'electronic',
      academic: '专注微电子芯片的逻辑、架构、模拟电路设计和系统集成，是连接器件、设计工具与系统功能的专业。',
      parent: '更像“画芯片图纸并验证能否工作”，相较微电子科学与工程更偏芯片设计和 EDA 工具。',
      student: '数字电路、模拟电路、Verilog、EDA 和验证是核心。既要懂物理电路，也要能编程和调试。',
      difficulty: { math: 90, physics: 90, coding: 82, experiment: 88, english: 80, graduate: 96 },
      suitable: ['对数字电路、芯片架构和工具链感兴趣', '数学物理与编程能力均衡', '做事细致并能长期调试验证', '愿意读研进入设计或验证核心岗位'],
      unsuitable: ['只想学手机电脑使用', '排斥电路图和硬件描述语言', '不愿接受高强度项目周期', '希望本科课程轻松且就业地域不限'],
      graduate: ['本科可进入验证、版图、测试和应用工程', '核心 IC 设计和架构岗位通常偏好硕士以上', '可向集成电路、电子科学、计算机体系结构深造'],
      risks: ['专业建设质量和 EDA 实验资源差异很大。', '设计、验证、版图、工艺和封测不能混为一谈。', '核心设计岗学历和项目门槛高。', '产业集中在少数城市，地域约束较明显。'],
      similar: ['microelectronics', 'electronic', 'cs'],
      talkTrack: ['用芯片产业链先定位学生想做哪一段。', '重点看学校的设计课程、EDA 资源和企业项目。', '明确本科就业与研究生核心研发之间的差距。'],
      internalNote: '对外不要使用“低端工种”等贬义词，改用岗位环节、技术深度与成长路径。'
    },
    {
      id: 'electrical', code: '080601', name: '电气工程及其自动化', discipline: '工学', category: '电气类', duration: '四年', degree: '工学', scale: 7438,
      keywords: ['强电', '能源', '电网', '电机'], traits: ['数学', '物理', '实验'], accent: 'red', courseFamily: 'electrical', careerFamily: 'electrical', universityFamily: 'electrical',
      academic: '研究电能的产生、传输、分配和利用，覆盖发电、高压电网、电机、电力电子与自动化控制。',
      parent: '主要解决“电从哪里来、怎样安全送到、怎样高效使用”，与电子信息的弱电信号不同。',
      student: '电路、电机、电力系统、继电保护是核心。学校方向可能偏电网、电机、电力电子或新能源。',
      difficulty: { math: 84, physics: 90, coding: 54, experiment: 82, english: 62, graduate: 66 },
      suitable: ['物理和电学基础较好', '重视稳定行业或能源装备', '能接受实验、现场和规范要求', '愿意准备电网校招或工程能力'],
      unsuitable: ['只把专业等同于国家电网', '排斥强电、设备和现场环境', '不愿参加行业考试或工程实践', '只想做纯互联网软件'],
      graduate: ['本科可进入电网、设备、新能源和工业电气岗位', '高端研发、设计院和科研方向读研更有利', '可向电力系统、电机、电力电子、控制和新能源深造'],
      risks: ['进入电网并非自动结果，院校、考试、地区和岗位均影响录用。', '电网、设备厂、设计院和工厂岗位体验差异很大。', '部分岗位需要倒班、基层或现场工作。', '学校培养方向会明显影响就业口径。'],
      similar: ['automation', 'electronic', 'robotics'],
      talkTrack: ['先把强电与弱电区别讲清楚。', '再把电网、电气设备、新能源和工业控制四条路径拆开。', '核查目标院校的电气传统、行业校招范围和培养方向。'],
      internalNote: '避免把国家电网描述为唯一出路；用岗位结构和录用条件进行风险说明。'
    },
    {
      id: 'automation', code: '080801', name: '自动化', discipline: '工学', category: '自动化类', duration: '四年', degree: '工学', scale: 4001,
      keywords: ['控制', '反馈', '工业自动化', '软硬结合'], traits: ['数学', '编程', '实验'], accent: 'orange', courseFamily: 'control', careerFamily: 'control', universityFamily: 'control',
      academic: '研究自动控制原理与方法，通过软硬件结合使设备或生产过程按照目标自动运行。',
      parent: '给机器和生产线建立“感知、判断、执行”的闭环，让设备按要求稳定、准确地自动工作。',
      student: '数学建模、控制理论、电路、编程都要学。就业面宽，但需要尽早选定控制、嵌入式、工业或算法方向。',
      difficulty: { math: 92, physics: 72, coding: 76, experiment: 86, english: 66, graduate: 76 },
      suitable: ['喜欢动态系统和因果反馈', '数学与编程基础均衡', '愿意做软硬件实验和调试', '能主动确定细分方向'],
      unsuitable: ['希望专业只学一种技能', '排斥数学模型和电路实验', '不愿在本科期间做项目', '把自动化简单理解成机器人'],
      graduate: ['本科可进入工业自动化、嵌入式和测试交付', '控制算法、机器人和研究岗位读研更有优势', '可向控制科学、机器人、电子信息和计算机深造'],
      risks: ['课程面宽，缺少方向规划时容易博而不精。', '工业现场岗与算法研发岗工作环境差异明显。', '部分高端控制岗位数学门槛高。', '专业名称相同但学校行业背景差异大。'],
      similar: ['robotics', 'electrical', 'electronic'],
      talkTrack: ['让学生在控制算法、嵌入式、工业自动化和机器人中初选方向。', '看课程是否有控制理论、嵌入式、工业网络和项目实践。', '用“系统稳定性”解释自动化与计算机的差别。'],
      internalNote: '“万金油”只适合作为内部风险概念，对外应转化为“方向选择重要”。'
    },
    {
      id: 'robotics', code: '080803T', name: '机器人工程', discipline: '工学', category: '自动化类', duration: '四年', degree: '工学', scale: 2378,
      keywords: ['机器人', '本体', '感知', '运动控制'], traits: ['数学', '编程', '实验', '项目'], accent: 'orange', courseFamily: 'control', careerFamily: 'control', universityFamily: 'control',
      academic: '融合机械、电子、控制和计算机，研究机器人本体结构、感知系统、运动控制算法与系统集成。',
      parent: '机器人由机械身体、传感器、电路和控制程序共同组成，这个专业要把几部分连接起来。',
      student: '课程很跨学科，不能只停留在“都懂一点”。要通过项目明确主攻机械本体、控制、视觉或软件。',
      difficulty: { math: 88, physics: 78, coding: 84, experiment: 96, english: 68, graduate: 80 },
      suitable: ['喜欢搭建、编程和调试实体系统', '愿意跨机械、电路和控制学习', '有团队项目和竞赛兴趣', '能够尽早确定主攻技术方向'],
      unsuitable: ['只因机器人“酷”而选择', '排斥机械结构或电路', '不愿做长期调试和项目迭代', '期待本科毕业直接做前沿算法研究'],
      graduate: ['本科可进入系统集成、调试、自动化和嵌入式岗位', '机器人算法、感知和核心控制偏好研究生', '可向控制、机械、计算机视觉和人工智能深造'],
      risks: ['部分院校课程体系仍在建设，师资和实验条件差异大。', '企业招聘常按机械、控制、算法等具体能力选人。', '项目实践不足时，交叉优势难以体现。', '行业岗位地域和企业规模分化较大。'],
      similar: ['automation', 'ai', 'electronic'],
      talkTrack: ['先问学生想造机器人身体、神经还是大脑。', '考察学校实验室、竞赛、产业项目和控制学科基础。', '强调形成一项主技能，再利用交叉背景扩展。'],
      internalNote: '不要用“新瓶装旧酒”直接对外表述；改为检查课程成熟度和主攻方向。'
    },
    {
      id: 'clinical', code: '100201K', name: '临床医学', discipline: '医学', category: '临床医学类', duration: '五年起', degree: '医学', scale: 3319,
      keywords: ['诊断', '治疗', '手术', '执业医师'], traits: ['记忆', '实验', '深造', '责任'], accent: 'red', courseFamily: 'clinical', careerFamily: 'medical', universityFamily: 'medical',
      academic: '系统学习人体结构、病理生理和药理，掌握疾病预防、诊断、治疗与康复所需的临床技术和实践能力。',
      parent: '这是直接面向病人的医生培养路径，五年本科只是起点，还要实习、考试、规培并常伴随进一步深造。',
      student: '学习量大、训练周期长、责任重。真正适合的是愿意长期投入并能承受临床压力的人。',
      difficulty: { math: 48, physics: 45, coding: 18, experiment: 92, english: 82, graduate: 98 },
      suitable: ['有明确从医动机和服务意识', '记忆、理解和临床沟通能力较强', '家庭能支持较长培养周期', '能承受考试、值班和责任压力'],
      unsuitable: ['只因职业稳定或家长安排', '明显害怕血液、操作和临床环境', '无法接受长学制与规培', '抗压和沟通能力明显不足'],
      graduate: ['本科五年后需参加相关考试和住院医师规范化培训', '高水平医院普遍看重硕博和科研经历', '可按内科、外科、儿科、麻醉、影像等专科发展'],
      risks: ['培养周期长，投入产出应按十年维度评估。', '医院层次越高，学历、科研和规培要求越高。', '值班、沟通和医疗责任压力显著。', '不同学制和一体化培养路径必须逐校核对。'],
      similar: ['dental'],
      talkTrack: ['先确认从医动机，再讨论分数和院校。', '用时间轴展示本科、规培、研究生和独立执业。', '把医院平台、附属医院、学制和地域就业同时比较。'],
      internalNote: '对外避免“不到 30 岁不能赚钱”等绝对说法，使用完整培养路径和收入阶段解释。'
    },
    {
      id: 'dental', code: '100301K', name: '口腔医学', discipline: '医学', category: '口腔医学类', duration: '五年', degree: '医学', scale: 450,
      keywords: ['牙体牙髓', '修复', '正畸', '精细操作'], traits: ['记忆', '实验', '深造', '动手'], accent: 'green', courseFamily: 'dental', careerFamily: 'dental', universityFamily: 'medical',
      academic: '研究牙齿及口腔颌面部疾病的预防、诊断与治疗，培养取得医师资格后从事口腔临床工作的专业人才。',
      parent: '不仅是“看牙”，还包含牙体、牙周、修复、正畸、种植和颌面外科，对手部精细操作要求高。',
      student: '医学基础不能少，临床操作更精细。手感、耐心、审美和长期与患者沟通都很重要。',
      difficulty: { math: 35, physics: 36, coding: 12, experiment: 98, english: 72, graduate: 88 },
      suitable: ['动手精细、耐心和审美较好', '愿意与患者长期沟通', '能接受医学培养周期和资格考试', '重视技术长期积累'],
      unsuitable: ['明显手部操作能力弱或排斥口腔环境', '只因“高薪、少夜班”选择', '无法接受材料、器械和临床训练', '不愿核查医院与民营机构差异'],
      graduate: ['本科后需通过执业医师相关资格和规范化训练', '公立医院与专科发展常看重研究生学历', '可向修复、正畸、牙周、颌面外科等方向发展'],
      risks: ['公立医院岗位有限，民营机构质量差异大。', '技术、口碑与持续学习决定长期发展。', '对动手能力和临床沟通要求非常高。', '不能把行业宣传中的高收入当作普遍起点。'],
      similar: ['clinical'],
      talkTrack: ['安排学生评估精细操作、耐心和临床接受度。', '讲清公立医院、民营口腔和自主执业的不同路径。', '看院校时关注口腔专科平台、实习资源和学制。'],
      internalNote: '源材料对口腔收入表述偏乐观，预览已改为结构化机会与风险并列。'
    },
    {
      id: 'law', code: '030101K', name: '法学', discipline: '法学', category: '法学类', duration: '四年', degree: '法学', scale: 907,
      keywords: ['法律', '逻辑', '法考', '规则'], traits: ['阅读', '记忆', '表达', '深造'], accent: 'blue', courseFamily: 'law', careerFamily: 'law', universityFamily: 'law',
      academic: '研究法律规则、法律体系和法律精神，通过证据、解释与逻辑推理解决社会冲突和权利义务问题。',
      parent: '不只是背法条，更重要的是读材料、找证据、讲逻辑，并在程序规则下解决纠纷。',
      student: '阅读量、写作量和考试准备都很大。法考是重要门槛，但学校平台、实习和表达能力同样关键。',
      difficulty: { math: 18, physics: 5, coding: 12, experiment: 8, english: 78, graduate: 78 },
      suitable: ['喜欢阅读、论证和表达', '记忆力与逻辑组织能力较好', '能接受长期考试和实习积累', '对公共事务、商业规则或权益保护有兴趣'],
      unsuitable: ['只因为“不学数学”选择', '明显排斥大量阅读与写作', '不愿准备法考、公考或行业资格', '期待本科毕业自动成为律师或法官'],
      graduate: ['通过法律职业资格考试是多类法律岗位的重要门槛', '头部律所、高校和部分司法岗位更看重学历与学校平台', '可向民商、刑事、国际、知识产权、合规等方向发展'],
      risks: ['开设院校多，毕业生竞争强。', '法考是重要但不是唯一的就业决定因素。', '优质岗位看重院校、学历、实习、外语和写作。', '律师、公务员、法务的职业节奏和收入结构差异很大。'],
      similar: ['accounting', 'mis'],
      talkTrack: ['先问学生喜欢公共权力、商业规则还是争议解决。', '把法考、公考、律所和企业法务四条路径并列讲。', '择校时同时看法学平台、城市法律市场和实习资源。'],
      internalNote: '“考不过法考等于废纸”等表述不适合对外；应说明资格门槛和替代路径。'
    },
    {
      id: 'accounting', code: '120203K', name: '会计学', discipline: '管理学', category: '工商管理类', duration: '四年', degree: '管理学', scale: 2315,
      keywords: ['财务报表', '审计', '税务', '经营分析'], traits: ['数字', '规则', '证书', '实践'], accent: 'green', courseFamily: 'accounting', careerFamily: 'accounting', universityFamily: 'accounting',
      academic: '以货币为主要计量单位，对组织经济活动进行核算和监督，并通过财务信息反映经营成果与财务状况。',
      parent: '不只是记账，还包括报表、预算、税务、审计、内控和经营分析。基础核算正在自动化，高阶分析更重要。',
      student: '需要细致、守规则、理解业务并长期准备证书。Excel、数据分析和沟通能力会拉开差距。',
      difficulty: { math: 52, physics: 2, coding: 30, experiment: 18, english: 60, graduate: 52 },
      suitable: ['对数字、规则和经营活动敏感', '做事细致并愿意承担责任', '能接受证书学习和忙季节奏', '愿意补数据分析与信息系统能力'],
      unsuitable: ['只因“任何单位都需要会计”选择', '粗心且明显排斥规则核对', '不愿持续考证或升级技能', '只接受低压力、固定重复工作'],
      graduate: ['本科可进入企业财务、审计和公共部门财会', 'CPA、税务、审计和数据能力影响职业分层', '深造可选会计、审计、财务管理和金融'],
      risks: ['基础核算岗位受自动化影响明显。', '证书并不自动等于高薪，还需平台和实务经验。', '事务所忙季强度高，企业财务发展速度差异大。', '择校应看财经平台、实习和区域产业。'],
      similar: ['law', 'mis'],
      talkTrack: ['把核算、审计、财务分析和公共部门四条路径拆开。', '询问学生是否愿意长期考证并处理高责任数据。', '强调信息系统和数据分析是未来增量能力。'],
      internalNote: '避免“基础会计会被完全取代”的绝对判断，改为岗位结构升级。'
    },
    {
      id: 'mis', code: '120102', name: '信息管理与信息系统', discipline: '管理学', category: '管理科学与工程类', duration: '四年', degree: '工学或管理学', scale: 941,
      keywords: ['ERP', '业务流程', 'IT+管理', '数据分析'], traits: ['编程', '管理', '数据', '项目'], accent: 'cyan', courseFamily: 'mis', careerFamily: 'mis', universityFamily: 'mis',
      academic: '融合计算机与管理学，研究如何利用信息系统、数据和数字技术优化组织业务流程与管理效率。',
      parent: '培养既理解业务又能和技术团队沟通的人，常见场景是 ERP、企业数字化、产品和数据分析。',
      student: '课程横跨管理、数据库、编程和项目管理。要主动把自己做成“懂技术的业务人”或“懂业务的技术人”。',
      difficulty: { math: 62, physics: 8, coding: 66, experiment: 32, english: 62, graduate: 58 },
      suitable: ['对企业流程和数字化都有兴趣', '沟通、分析和技术学习较均衡', '愿意补 SQL、Python 或产品工具', '适合做跨部门协调和项目推进'],
      unsuitable: ['只想学纯计算机算法', '只想读轻松的泛管理专业', '不愿通过项目和实习形成主技能', '排斥沟通和需求分析'],
      graduate: ['本科可进入 IT 咨询、实施、产品、数据和企业信息化', '技术课程偏弱时需主动补编程、数据库和数据分析', '可向管理科学与工程、信息系统、商业分析和计算机深造'],
      risks: ['不同学校可能授工学或管理学学位，课程差异大。', '学习面宽，缺少主技能容易出现“两头不到岸”。', '招聘端常按产品、数据、实施等具体能力筛选。', '优先关注设置在工科学院或技术课程扎实的项目。'],
      similar: ['software', 'cs', 'accounting'],
      talkTrack: ['先判断学生更偏技术、产品、数据还是企业管理。', '看课程中编程、数据库、系统分析和实习的实际占比。', '比较软件工程时突出“业务流程与信息化”而非纯开发。'],
      internalNote: 'PDF 建议优先选择设在工科学院、技术课程更完整的信管专业；正式版需把学位类型列为筛选项。'
    }
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const majors = RAW_MAJORS.map((major) => ({
    ...clone(major),
    modules: clone(COURSE_TEMPLATES[major.courseFamily] || []),
    careers: clone(CAREER_TEMPLATES[major.careerFamily] || []),
    universities: clone(UNIVERSITY_TEMPLATES[major.universityFamily] || []),
    sourceNames: SOURCE_LIST.map((source) => source.name)
  }));

  window.MAJOR_PREVIEW_DATA = majors;
  window.MAJOR_PREVIEW_SOURCES = SOURCE_LIST;
  window.MAJOR_PREVIEW_VERSION = '2026.07.12-preview-3';
}());
