(function () {
  'use strict';

  window.MEDICAL_PREVIEW_DATA = {
    meta: {
      year: 2026,
      catalogCount: 883,
      title: '普通高校招生体检专业风险查询',
      officialTitle: '普通高等学校招生体检工作指导意见',
      officialUrl: 'https://www.moe.gov.cn/jyb_xxgk/gk_gbgg/moe_0/moe_9/moe_34/tnull_40.html',
      qaUrl: 'https://www.moe.gov.cn/jyb_xwfb/xw_zt/moe_357/2026/2026_zt08/',
      catalogUrl: 'https://www.moe.gov.cn/srcsite/A08/moe_1034/s3882/202604/t20260427_1434931.html',
      notice: '系统只做风险提示，不替代主检结论、高校招生章程或高校书面答复。'
    },
    groups: [
      { id: 'school', title: '学校可不予录取', subtitle: '指导意见第一部分', codes: ['11', '12', '13', '14', '15', '16'] },
      { id: 'restricted', title: '有关专业可不予录取', subtitle: '指导意见第二部分', codes: ['21', '22', '23', '24', '25'] },
      { id: 'special', title: '专项体检另行核对', subtitle: '内部扩展提醒', codes: ['26'] },
      { id: 'advisory', title: '不宜就读建议', subtitle: '指导意见第三部分', codes: ['31', '32', '33', '34', '35', '36', '37', '38', '39'] }
    ],
    codes: {
      '11': { level: 'school', label: '严重心脏病等', short: '严重心脏病、心肌病、高血压病', detail: '对应学校可以不予录取情形。实际结论以高考体检主检医生意见为准。', source: 'official' },
      '12': { level: 'school', label: '重症呼吸及肾病等', short: '重症支气管扩张、哮喘、恶性肿瘤、慢性肾炎、尿毒症', detail: '对应学校可以不予录取情形。实际结论以高考体检主检医生意见为准。', source: 'official' },
      '13': { level: 'school', label: '严重系统性疾病', short: '严重血液、内分泌、代谢系统疾病、风湿性疾病', detail: '对应学校可以不予录取情形。实际结论以高考体检主检医生意见为准。', source: 'official' },
      '14': { level: 'school', label: '重症神经或精神疾病', short: '重症或难治性癫痫、严重精神病等', detail: '对应学校可以不予录取情形。实际结论以高考体检主检医生意见为准。', source: 'official' },
      '15': { level: 'school', label: '慢性肝炎且肝功异常', short: '慢性肝炎且肝功能不正常', detail: '对应学校可以不予录取情形，指导意见列明的除外情况仍需由医疗机构判断。', source: 'official' },
      '16': { level: 'school', label: '结核病相关限制', short: '结核病相关体检结论', detail: '指导意见列有多项已稳定或已治愈的除外情形，不能只凭病名自行判断。', source: 'official' },
      '21': { level: 'restricted', label: '轻度色觉异常（色弱）', short: '化学、化工、药学、生物、医学、食品、农林、水产、心理等专业重点核对', detail: '官方专业范围之外，系统对材料、环境、建筑景观、纺织服装和设计等方向采用内部严格预警；最终以院校章程为准。', source: 'official+strict' },
      '22': { level: 'restricted', label: '色觉异常 II 度（色盲）', short: '包含色弱受限范围，并扩展至美术、设计、摄影、动画、地理、交通运输等', detail: '系统沿用色弱严格预警，并补充官方列明的色盲受限专业。', source: 'official+strict' },
      '23': { level: 'restricted', label: '单色识别异常', short: '包含色弱、色盲范围，并涉及经管、公共管理、图书档案及显示器颜色识别相关计算机专业', detail: '计算机类只在不能准确识别显示器颜色数码、字母的情形下提示，不能把普通色弱一刀切到全部计算机专业。', source: 'official' },
      '24': { level: 'restricted', label: '裸眼视力任一眼低于 5.0', short: '飞行技术、航海技术、消防工程、刑事科学技术、侦察等', detail: '专科相同或相近专业也需核对；军队、公安和民航等专项标准另行适用。', source: 'official' },
      '25': { level: 'restricted', label: '裸眼视力任一眼低于 4.8', short: '轮机工程、运动训练、武术与民族传统体育等', detail: '专科烹饪与营养、烹饪工艺等相近专业也需核对。', source: 'official' },
      '26': { level: 'special', label: '公安等专项体检提醒', short: '公安院校、公安专业及其他专项招生须按专项体检标准核对', detail: '这是系统扩展提醒，不是指导意见中的通用专业代码。军队、公安、飞行等招生应查询当年专项标准。', source: 'extension' },
      '31': { level: 'advisory', label: '主要脏器手术或病史', short: '地矿、水利、交通、能动、体育、海洋、大气、水产、测绘、环境、土木等不宜就读', detail: '属于就业与学习适应性建议，不能直接当作退档结论。', source: 'official' },
      '32': { level: 'advisory', label: '先心病术后或轻微缺损', short: '不宜就读范围参考代码 31', detail: '属于不宜就读建议，仍应结合学生实际情况和院校培养要求。', source: 'official' },
      '33': { level: 'advisory', label: '肢体残疾不继续恶化', short: '不宜就读范围参考代码 31', detail: '不影响专业学习且成绩达到要求时，高校不得仅因残疾拒绝录取；具体情况须逐校沟通。', source: 'official' },
      '34': { level: 'advisory', label: '矫正视力 4.8 且度数大于 400', short: '海洋、测控、核工程、生物医学工程、服装、飞行器制造等不宜就读', detail: '属于不宜就读建议，不能直接当作退档结论。', source: 'official' },
      '35': { level: 'advisory', label: '矫正视力 4.8 且度数大于 800', short: '地矿、水利、土建、材料、能动、化工、医学、测绘、交通、船舶、生物工程等不宜就读', detail: '属于不宜就读建议，不能直接当作退档结论。', source: 'official' },
      '36': { level: 'advisory', label: '一眼失明及另一眼高度矫正', short: '工学、农学、医学、法学及部分理学专业不宜就读', detail: '属于不宜就读建议，不能直接当作退档结论。', source: 'official' },
      '37': { level: 'advisory', label: '听力条件相关', short: '法学、外语、新闻、学前、音乐、土木、交通、动物、医学等不宜就读', detail: '属于不宜就读建议，学校补充要求必须在招生章程中公布。', source: 'official' },
      '38': { level: 'advisory', label: '嗅觉、口吃及外观体态相关', short: '教育、公安、外交、法学、新闻、音乐表演、表演等不宜就读', detail: '属于不宜就读建议，不能直接当作退档结论。', source: 'official' },
      '39': { level: 'advisory', label: '斜视、嗅觉迟钝、口吃', short: '医学类专业不宜就读', detail: '属于不宜就读建议，不能直接当作退档结论。', source: 'official' }
    }
  };
}());
