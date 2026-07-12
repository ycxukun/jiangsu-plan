(function () {
  'use strict';

  const DATA = window.MEDICAL_PREVIEW_DATA || { meta: {}, groups: [], codes: {} };
  const CATALOG = Array.isArray(window.MAJOR_CATALOG_2026) ? window.MAJOR_CATALOG_2026 : [];
  const STORAGE_KEY = 'medical-restriction-preview-state-v1';
  const PAGE_SIZE = 12;
  const levelRank = { school: 4, restricted: 3, special: 3, advisory: 2, safe: 1 };
  const levelCopy = {
    school: { label: '学校层面风险', short: '全校风险', desc: '对应学校可以不予录取情形，应以主检结论为准。' },
    restricted: { label: '有关专业可不予录取', short: '录取受限', desc: '该专业触发体检受限提示，高校可依据规则和章程审核。' },
    special: { label: '专项体检另行核对', short: '专项体检', desc: '公安、军队、飞行等专项招生需按当年专门标准核对。' },
    advisory: { label: '不宜就读建议', short: '不宜就读', desc: '属于学习与就业适应性建议，不能直接当作退档结论。' },
    safe: { label: '当前代码未触发', short: '未触发', desc: '仍需查看目标院校招生章程中的补充规定。' }
  };
  const roleCopy = {
    consultant: { label: '咨询师', scope: '显示规则来源、内部严格预警和确认记录。' },
    public: { label: '家长/学生', scope: '显示公开代码解释、专业风险和核对动作。' },
    admin: { label: '管理员', scope: '显示全部内容，并可查看规则匹配审计。' }
  };

  const state = loadState();
  state.view = 'query';
  state.page = 1;
  state.search = '';
  state.discipline = '';
  state.riskFilter = 'risk';
  state.pendingMajor = null;
  if (!roleCopy[state.role]) state.role = 'consultant';

  const el = {
    app: document.getElementById('app'),
    currentRoleLabel: document.getElementById('currentRoleLabel'),
    roleScopeText: document.getElementById('roleScopeText'),
    navPlanCount: document.getElementById('navPlanCount'),
    codePicker: document.getElementById('codePicker'),
    activeCodeNote: document.getElementById('activeCodeNote'),
    summaryStrip: document.getElementById('summaryStrip'),
    searchInput: document.getElementById('searchInput'),
    disciplineFilter: document.getElementById('disciplineFilter'),
    riskFilter: document.getElementById('riskFilter'),
    resultCount: document.getElementById('resultCount'),
    resultContext: document.getElementById('resultContext'),
    resultGrid: document.getElementById('resultGrid'),
    pagination: document.getElementById('pagination'),
    codeGuide: document.getElementById('codeGuide'),
    planSummary: document.getElementById('planSummary'),
    planList: document.getElementById('planList'),
    auditSummary: document.getElementById('auditSummary'),
    auditTable: document.getElementById('auditTable'),
    riskDialog: document.getElementById('riskDialog'),
    dialogRiskLevel: document.getElementById('dialogRiskLevel'),
    dialogMajorName: document.getElementById('dialogMajorName'),
    dialogMajorMeta: document.getElementById('dialogMajorMeta'),
    dialogReasons: document.getElementById('dialogReasons'),
    riskAcknowledge: document.getElementById('riskAcknowledge'),
    confirmRiskAdd: document.getElementById('confirmRiskAdd'),
    toastRegion: document.getElementById('toastRegion')
  };

  init();

  function init() {
    populateDisciplines();
    bindEvents();
    renderRole();
    renderCodePicker();
    renderCodeGuide();
    renderQuery();
    renderPlan();
    renderAudit();
    switchView('query', false);
  }

  function bindEvents() {
    document.addEventListener('click', handleClick);
    el.searchInput.addEventListener('input', (event) => {
      state.search = event.target.value.trim();
      state.page = 1;
      renderResults();
    });
    el.disciplineFilter.addEventListener('change', (event) => {
      state.discipline = event.target.value;
      state.page = 1;
      renderResults();
    });
    el.riskFilter.addEventListener('change', (event) => {
      state.riskFilter = event.target.value;
      state.page = 1;
      renderResults();
    });
    el.riskAcknowledge.addEventListener('change', () => {
      el.confirmRiskAdd.disabled = !el.riskAcknowledge.checked;
    });
    el.confirmRiskAdd.addEventListener('click', confirmRiskSelection);
    document.getElementById('exportPlan').addEventListener('click', exportPlan);
    el.riskDialog.addEventListener('close', () => {
      state.pendingMajor = null;
      el.riskAcknowledge.checked = false;
      el.confirmRiskAdd.disabled = true;
    });
  }

  function handleClick(event) {
    const roleButton = event.target.closest('.role-button[data-role]');
    if (roleButton) {
      setRole(roleButton.dataset.role);
      return;
    }

    const navButton = event.target.closest('.nav-tab[data-view]');
    if (navButton) {
      switchView(navButton.dataset.view);
      return;
    }

    const codeButton = event.target.closest('[data-code]');
    if (codeButton) {
      toggleCode(codeButton.dataset.code);
      return;
    }

    const addButton = event.target.closest('[data-add-major]');
    if (addButton) {
      requestAddMajor(addButton.dataset.addMajor);
      return;
    }

    const removeButton = event.target.closest('[data-remove-major]');
    if (removeButton) {
      removeMajor(removeButton.dataset.removeMajor);
      return;
    }

    const pageButton = event.target.closest('[data-page]');
    if (pageButton) {
      state.page = Number(pageButton.dataset.page || 1);
      renderResults();
      document.querySelector('.query-workspace')?.scrollIntoView({ block: 'start' });
      return;
    }

    const action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'clear-codes') {
      state.codes.clear();
      persistState();
      state.page = 1;
      renderCodePicker();
      renderQuery();
      showToast('体检代码已清空。');
    }
    if (action.dataset.action === 'reset-filters') {
      state.search = '';
      state.discipline = '';
      state.riskFilter = 'risk';
      state.page = 1;
      el.searchInput.value = '';
      el.disciplineFilter.value = '';
      el.riskFilter.value = 'risk';
      renderResults();
    }
  }

  function setRole(role) {
    if (!roleCopy[role]) return;
    state.role = role;
    if (role !== 'admin' && state.view === 'audit') state.view = 'query';
    persistState();
    renderRole();
    switchView(state.view, false);
    showToast(`已切换为${roleCopy[role].label}视角。`);
  }

  function renderRole() {
    document.body.dataset.role = state.role;
    document.querySelectorAll('.role-button[data-role]').forEach((button) => {
      const active = button.dataset.role === state.role;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    el.currentRoleLabel.textContent = roleCopy[state.role].label;
    el.roleScopeText.textContent = roleCopy[state.role].scope;
  }

  function switchView(view, scroll = true) {
    if (view === 'audit' && state.role !== 'admin') view = 'query';
    state.view = view;
    document.querySelectorAll('[data-view-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.viewPanel === view));
    document.querySelectorAll('.nav-tab[data-view]').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    if (view === 'query') renderQuery();
    if (view === 'codes') renderCodeGuide();
    if (view === 'plan') renderPlan();
    if (view === 'audit') renderAudit();
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
    el.app.focus({ preventScroll: true });
  }

  function populateDisciplines() {
    const disciplines = [...new Set(CATALOG.map((major) => major.discipline).filter(Boolean))];
    el.disciplineFilter.innerHTML = '<option value="">全部门类</option>' + disciplines.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  }

  function renderCodePicker() {
    el.codePicker.innerHTML = DATA.groups.map((group) => `
      <section class="code-group level-${escapeHtml(group.id)}">
        <header><div><strong>${escapeHtml(group.title)}</strong><span>${escapeHtml(group.subtitle)}</span></div><em>${group.codes.filter((code) => state.codes.has(code)).length}/${group.codes.length}</em></header>
        <div>${group.codes.map((code) => {
          const item = DATA.codes[code];
          return `<button type="button" class="code-chip ${state.codes.has(code) ? 'is-active' : ''}" data-code="${code}" aria-pressed="${state.codes.has(code)}"><b>${code}</b><span>${escapeHtml(item.label)}</span></button>`;
        }).join('')}</div>
      </section>`).join('');
    renderActiveCodeNote();
  }

  function toggleCode(code) {
    if (!DATA.codes[code]) return;
    if (state.codes.has(code)) state.codes.delete(code);
    else state.codes.add(code);
    state.page = 1;
    persistState();
    renderCodePicker();
    renderQuery();
  }

  function renderActiveCodeNote() {
    const codes = [...state.codes];
    if (!codes.length) {
      el.activeCodeNote.innerHTML = '<strong>尚未选择</strong><p>请选择体检表上的结论代码。不要根据症状自行推导代码。</p>';
      return;
    }
    const sources = new Set(codes.map((code) => DATA.codes[code].source));
    el.activeCodeNote.innerHTML = `<strong>已选 ${codes.length} 项：${codes.join(' / ')}</strong><p>${sources.has('official+strict') ? '含内部严格预警扩展；' : ''}所有结果都需要结合目标院校招生章程复核。</p>`;
  }

  function renderQuery() {
    renderSummary();
    renderResults();
    el.navPlanCount.textContent = String(state.selected.length);
  }

  function renderSummary() {
    const counts = { school: 0, restricted: 0, special: 0, advisory: 0, safe: 0 };
    CATALOG.forEach((major) => { counts[riskForMajor(major).level] += 1; });
    const triggered = CATALOG.length - counts.safe;
    el.summaryStrip.innerHTML = `
      <div><span>当前代码</span><strong>${state.codes.size || 0}</strong><small>${state.codes.size ? [...state.codes].join(' / ') : '待选择'}</small></div>
      <div><span>触发专业</span><strong>${triggered}</strong><small>共 ${CATALOG.length} 个官方专业</small></div>
      <div class="tone-restricted"><span>录取/专项风险</span><strong>${counts.school + counts.restricted + counts.special}</strong><small>不可直接等同退档</small></div>
      <div class="tone-advisory"><span>不宜就读</span><strong>${counts.advisory}</strong><small>指导性建议</small></div>
      <div class="summary-meter"><span>风险覆盖 ${CATALOG.length ? Math.round(triggered / CATALOG.length * 100) : 0}%</span><div><i style="width:${CATALOG.length ? Math.round(triggered / CATALOG.length * 100) : 0}%"></i></div></div>`;
  }

  function renderResults() {
    let rows = CATALOG.map((major) => ({ major, risk: riskForMajor(major) }));
    const query = normalize(state.search);
    if (query) rows = rows.filter(({ major }) => normalize([major.name, major.code, major.category, major.discipline].join(' ')).includes(query));
    if (state.discipline) rows = rows.filter(({ major }) => major.discipline === state.discipline);
    if (state.riskFilter === 'risk') rows = rows.filter(({ risk }) => risk.level !== 'safe');
    else if (state.riskFilter !== 'all') rows = rows.filter(({ risk }) => risk.level === state.riskFilter);
    rows.sort((a, b) => (levelRank[b.risk.level] - levelRank[a.risk.level]) || String(a.major.code).localeCompare(String(b.major.code), 'zh-CN'));

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);
    el.resultCount.textContent = `${rows.length} 个专业`;
    el.resultContext.textContent = state.codes.size ? `依据代码 ${[...state.codes].join(' / ')} · 第 ${state.page}/${totalPages} 页` : '请选择体检代码后查看风险专业';

    if (!state.codes.size && state.riskFilter === 'risk' && !query) {
      el.resultGrid.innerHTML = '<div class="empty-state"><strong>先选择体检代码</strong><span>系统不会根据症状代替医生生成体检结论。</span></div>';
      el.pagination.innerHTML = '';
      return;
    }

    el.resultGrid.innerHTML = pageRows.map(({ major, risk }) => majorCard(major, risk)).join('') || '<div class="empty-state"><strong>没有匹配结果</strong><span>可清除筛选或切换为“全部专业”。</span></div>';
    renderPagination(totalPages);
  }

  function majorCard(major, risk) {
    const selected = state.selected.some((item) => item.id === major.id);
    const copy = levelCopy[risk.level];
    const sourceBadges = risk.hits.map((hit) => `<span class="source-badge source-${sourceTone(hit.source)}">${sourceLabel(hit.source)}</span>`).join('');
    return `
      <article class="major-card risk-${risk.level}">
        <header><div><span>${escapeHtml(major.code)}</span><h2>${escapeHtml(major.name)}</h2></div><strong>${escapeHtml(copy.short)}</strong></header>
        <p class="major-path">${escapeHtml(major.discipline)} · ${escapeHtml(major.category || '目录直列专业')}</p>
        <div class="risk-copy"><strong>${escapeHtml(copy.label)}</strong><p>${escapeHtml(risk.hits.length ? risk.hits.map((hit) => `代码${hit.code}：${hit.short}`).join('；') : copy.desc)}</p></div>
        <div class="major-sources">${sourceBadges || '<span class="source-badge source-safe">当前代码未触发</span>'}</div>
        <footer><span>${risk.hits.length ? `触发 ${risk.hits.map((hit) => hit.code).join('/')}` : '仍需查招生章程'}</span><button class="button ${selected ? 'button-selected' : risk.level === 'safe' ? 'button-secondary' : 'button-danger'}" type="button" data-add-major="${escapeHtml(major.id)}" ${selected ? 'disabled' : ''}>${selected ? '已加入清单' : risk.level === 'safe' ? '加入清单' : '查看警告并加入'}</button></footer>
      </article>`;
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      el.pagination.innerHTML = '';
      return;
    }
    const pages = pageWindow(state.page, totalPages);
    el.pagination.innerHTML = `
      <button type="button" data-page="${Math.max(1, state.page - 1)}" ${state.page === 1 ? 'disabled' : ''}>上一页</button>
      ${pages.map((page) => page === '…' ? '<span>…</span>' : `<button type="button" data-page="${page}" class="${page === state.page ? 'is-active' : ''}">${page}</button>`).join('')}
      <button type="button" data-page="${Math.min(totalPages, state.page + 1)}" ${state.page === totalPages ? 'disabled' : ''}>下一页</button>`;
  }

  function pageWindow(current, total) {
    const values = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2].filter((value) => value >= 1 && value <= total));
    const sorted = [...values].sort((a, b) => a - b);
    const result = [];
    sorted.forEach((value, index) => {
      if (index && value - sorted[index - 1] > 1) result.push('…');
      result.push(value);
    });
    return result;
  }

  function requestAddMajor(id) {
    if (state.selected.some((item) => item.id === id)) return;
    const major = CATALOG.find((item) => item.id === id);
    if (!major) return;
    const risk = riskForMajor(major);
    if (risk.level === 'safe') {
      addMajor(major, risk, false);
      return;
    }
    state.pendingMajor = { major, risk };
    const copy = levelCopy[risk.level];
    el.dialogRiskLevel.className = `dialog-level risk-${risk.level}`;
    el.dialogRiskLevel.textContent = copy.label;
    el.dialogMajorName.textContent = major.name;
    el.dialogMajorMeta.textContent = `${major.code} · ${major.discipline} · ${major.category || '目录直列专业'}`;
    el.dialogReasons.innerHTML = risk.hits.map((hit) => `<article><header><b>代码 ${hit.code}</b><span>${sourceLabel(hit.source)}</span></header><strong>${escapeHtml(hit.label)}</strong><p>${escapeHtml(hit.detail)}</p></article>`).join('');
    el.riskAcknowledge.checked = false;
    el.confirmRiskAdd.disabled = true;
    el.riskDialog.showModal();
  }

  function confirmRiskSelection() {
    if (!state.pendingMajor || !el.riskAcknowledge.checked) return;
    addMajor(state.pendingMajor.major, state.pendingMajor.risk, true);
    el.riskDialog.close();
  }

  function addMajor(major, risk, acknowledged) {
    state.selected.push({
      id: major.id,
      code: major.code,
      name: major.name,
      discipline: major.discipline,
      category: major.category || '目录直列专业',
      level: risk.level,
      codes: risk.hits.map((hit) => hit.code),
      acknowledged,
      acknowledgedAt: acknowledged ? new Date().toISOString() : ''
    });
    persistState();
    renderQuery();
    renderPlan();
    showToast(acknowledged ? '已记录风险确认并加入清单。' : '专业已加入清单。');
  }

  function removeMajor(id) {
    state.selected = state.selected.filter((item) => item.id !== id);
    persistState();
    renderQuery();
    renderPlan();
    showToast('已从清单移除。');
  }

  function renderCodeGuide() {
    el.codeGuide.innerHTML = DATA.groups.map((group) => `
      <section class="guide-section level-${escapeHtml(group.id)}">
        <header><div><span>${escapeHtml(group.subtitle)}</span><h2>${escapeHtml(group.title)}</h2></div><strong>${group.codes.length} 项</strong></header>
        <div>${group.codes.map((code) => {
          const item = DATA.codes[code];
          return `<article><b>${code}</b><div><strong>${escapeHtml(item.label)}</strong><p>${escapeHtml(item.short)}</p><small>${escapeHtml(item.detail)}</small></div><span class="source-badge source-${sourceTone(item.source)}">${sourceLabel(item.source)}</span></article>`;
        }).join('')}</div>
      </section>`).join('');
  }

  function renderPlan() {
    const counts = { school: 0, restricted: 0, special: 0, advisory: 0, safe: 0 };
    state.selected.forEach((item) => { counts[item.level] = (counts[item.level] || 0) + 1; });
    el.navPlanCount.textContent = String(state.selected.length);
    el.planSummary.innerHTML = `
      <div><span>已选专业</span><strong>${state.selected.length}</strong></div>
      <div class="tone-restricted"><span>录取/专项风险</span><strong>${counts.school + counts.restricted + counts.special}</strong></div>
      <div class="tone-advisory"><span>不宜就读</span><strong>${counts.advisory}</strong></div>
      <div><span>未触发</span><strong>${counts.safe}</strong></div>`;
    el.planList.innerHTML = state.selected.map((item, index) => `
      <article class="plan-row risk-${escapeHtml(item.level)}">
        <span class="plan-order">${index + 1}</span>
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.code)} · ${escapeHtml(item.discipline)} · ${escapeHtml(item.category)}</small></div>
        <span class="risk-pill">${escapeHtml(levelCopy[item.level].short)}</span>
        <div class="plan-confirm"><strong>${item.acknowledged ? '已阅读风险' : '未触发确认'}</strong><small>${item.acknowledgedAt ? new Date(item.acknowledgedAt).toLocaleString('zh-CN') : '加入时未触发当前代码'}</small></div>
        <span>${item.codes.length ? `代码 ${item.codes.join('/')}` : '无触发代码'}</span>
        <button class="icon-button" type="button" title="移除专业" aria-label="移除${escapeHtml(item.name)}" data-remove-major="${escapeHtml(item.id)}">×</button>
      </article>`).join('') || '<div class="empty-state"><strong>清单还是空的</strong><span>从专业查询页加入专业；风险专业必须先阅读警告。</span></div>';
  }

  function renderAudit() {
    const rows = Object.entries(DATA.codes).map(([code, item]) => {
      const matched = CATALOG.filter((major) => medicalRuleMatched(code, major)).length;
      return { code, item, matched };
    });
    const strict = rows.filter((row) => row.item.source === 'official+strict').length;
    const extension = rows.filter((row) => row.item.source === 'extension').length;
    el.auditSummary.innerHTML = `
      <div><span>规则代码</span><strong>${rows.length}</strong></div>
      <div><span>官方规则</span><strong>${rows.length - strict - extension}</strong></div>
      <div><span>含严格扩展</span><strong>${strict}</strong></div>
      <div><span>专项扩展</span><strong>${extension}</strong></div>`;
    el.auditTable.innerHTML = `
      <div class="audit-head"><span>代码</span><span>层级</span><span>规则说明</span><span>来源类型</span><span>匹配专业</span></div>
      ${rows.map(({ code, item, matched }) => `<div class="audit-row"><b>${code}</b><span>${escapeHtml(levelCopy[item.level].short)}</span><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.short)}</small></div><span class="source-badge source-${sourceTone(item.source)}">${sourceLabel(item.source)}</span><strong>${matched}</strong></div>`).join('')}`;
  }

  function riskForMajor(major) {
    const hits = [...state.codes].filter((code) => medicalRuleMatched(code, major)).map((code) => ({ code, ...DATA.codes[code] }));
    if (!hits.length) return { level: 'safe', hits: [] };
    const level = hits.reduce((worst, hit) => levelRank[hit.level] > levelRank[worst] ? hit.level : worst, 'safe');
    return { level, hits };
  }

  function medicalRuleMatched(code, major) {
    const text = [major.name, major.category, major.discipline].filter(Boolean).join(' ');
    if (/^1[1-6]$/.test(code)) return true;
    if (code === '21') return colorVisionStrict21(text, major);
    if (code === '22') return medicalRuleMatched('21', major) || /(美术|绘画|艺术设计|视觉传达|环境设计|产品设计|服装与服饰设计|摄影|动画|博物馆|文物与博物馆|应用物理|天文学|地理科学|应用气象|材料物理|矿物加工|资源勘查|资源勘探|冶金|无机非金属材料|交通运输|油气储运)/.test(text);
    if (code === '23') return medicalRuleMatched('22', major) || /(经济学类|经济学|财政|税收|金融|经贸|管理科学|信息管理|工程管理|工商管理|会计|财务管理|公共管理|行政管理|农业经济管理|图书|档案|计算机科学与技术|软件工程|网络工程|信息安全|数据科学|人工智能|智能科学)/.test(text);
    if (code === '24') return /(飞行技术|航海技术|消防工程|刑事科学技术|侦察|侦查|空中交通管制)/.test(text);
    if (code === '25') return /(轮机工程|运动训练|武术与民族传统体育|民族传统体育|烹饪与营养|烹饪工艺)/.test(text);
    if (code === '26') return /(公安学类|公安技术类|侦察|侦查|刑事科学|治安学|警务|警犬|禁毒|经济犯罪侦查|涉外警务|交通管理工程|网络安全与执法|安全防范工程|消防工程)/.test(text);
    if (['31', '32', '33'].includes(code)) return /(地矿|矿业|采矿|资源勘查|地质|水利|水文|交通运输|交通工程|能源动力|公安学|体育学|海洋科学|大气科学|水产|测绘|遥感|海洋工程|林业工程|武器|兵器|森林资源|环境科学|环境生态|生态学|旅游管理|草业科学|土木工程|消防工程|农业水利工程|农学|法医学|水土保持|荒漠化防治|动物科学)/.test(text);
    if (code === '34') return /(海洋技术|海洋科学|测控技术与仪器|核工程与核技术|生物医学工程|服装设计与工程|飞行器制造工程)/.test(text);
    if (code === '35') return /(地矿|矿业|采矿|资源勘查|水利|土建|土木|建筑|动物生产|动物科学|动物医学|水产|材料|能源动力|化工|制药|武器|兵器|农业工程|林业工程|植物生产|农学|园艺|植物保护|森林资源|环境生态|环境科学|环境工程|医学|心理学|安全工程|电子信息科学|材料科学|地质学|大气科学|地理科学|测绘工程|遥感|交通工程|交通运输|油气储运|船舶与海洋工程|生物工程|草业科学)/.test(text);
    if (code === '36') return /^(工学|农学|医学|法学)$/.test(major.discipline) || /(应用物理|应用化学|生物技术|地质学|生态学|环境科学|海洋科学|海洋技术|生物科学|应用心理)/.test(text);
    if (code === '37') return /(法学|外国语言|英语|日语|俄语|法语|德语|西班牙语|外交学|新闻学|侦察|侦查|学前教育|音乐学|录音艺术|土木工程|交通运输|动物科学|动物医学|医学)/.test(text);
    if (code === '38') return /(教育学|学前教育|特殊教育|公安学|外交学|法学|新闻学|音乐表演|表演)/.test(text);
    if (code === '39') return /(医学|临床医学|口腔医学|中医学|基础医学|法医学|医学技术|护理|药学)/.test(text);
    return false;
  }

  function colorVisionStrict21(text, major) {
    const base = /(化学|应用化学|化学生物学|分子科学|能源化学|化工|制药|药学|临床药学|中药学|生物科学|生物技术|生物信息|生物工程|生物制药|合成生物|生物医学工程|生物医学科学|医学|临床医学|口腔医学|基础医学|预防医学|法医学|医学技术|护理学|公安技术|地质|动物医学|动物科学|野生动物|心理学|应用心理|生态学|侦察|侦查|特种能源|烟火|考古|海洋科学|海洋技术|轮机工程|食品科学|食品质量|食品安全|轻化工程|林产化工|农学|园艺|植物保护|茶学|林学|园林|蚕学|农业资源|水产养殖|海洋渔业|材料类|材料科学|材料工程|材料化学|材料物理|高分子|复合材料|功能材料|新能源材料|储能材料|金属材料|无机非金属|冶金|矿物加工|环境工程|环境科学|过程装备|学前教育|特殊教育|体育教育|运动训练|运动人体科学|武术与民族传统体育)/;
    const strictExtension = /(建筑类|建筑学|城乡规划|风景园林|城市设计|历史建筑保护|智慧建筑|人居环境|建筑环境|景观|土木工程|给排水科学与工程|建筑电气|城市地下空间|智能建造|道路桥梁|铁道工程|纺织|服装设计|服装与服饰|非织造|丝绸|轻工类|包装工程|印刷工程|工业设计|产品设计|视觉传达|环境设计|数字媒体艺术|工艺美术|美术学|绘画|雕塑|摄影|动画|戏剧影视美术|陶瓷艺术设计|珠宝首饰设计)/;
    if (/机械类/.test(major.category) && !/(过程装备与控制工程|过程装备)/.test(text) && !/(服装|纺织|材料|高分子|复合材料|功能材料|金属材料|无机非金属|冶金|化工|制药|食品|环境|建筑|土木|景观|园林)/.test(major.name)) return false;
    if (/(计算机类|电子信息类)/.test(major.category) && !/(生物医学工程|医学信息工程|材料|化学|化工|制药|食品|环境|建筑|景观|园林|纺织|服装)/.test(major.name)) return false;
    return base.test(text) || strictExtension.test(text) || /^(化学|生物学|医学|农学)$/.test(major.discipline);
  }

  function sourceTone(source) {
    if (source === 'official+strict') return 'strict';
    if (source === 'extension') return 'extension';
    return 'official';
  }

  function sourceLabel(source) {
    if (source === 'official+strict') return '官方范围＋内部严格预警';
    if (source === 'extension') return '专项规则待核';
    return '国家指导意见';
  }

  function exportPlan() {
    if (!state.selected.length) {
      showToast('清单为空，暂无可导出内容。', 'warning');
      return;
    }
    const lines = [
      `体检风险专业确认清单｜${DATA.meta.year}`,
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `当前体检代码：${[...state.codes].join('/') || '未选择'}`,
      '',
      ...state.selected.map((item, index) => `${index + 1}. ${item.code} ${item.name}｜${levelCopy[item.level].label}｜触发代码：${item.codes.join('/') || '无'}｜${item.acknowledged ? `已确认 ${new Date(item.acknowledgedAt).toLocaleString('zh-CN')}` : '未触发确认'}`),
      '',
      DATA.meta.notice
    ];
    downloadText(lines.join('\n'), `体检风险专业确认清单_${timestamp()}.txt`);
    showToast('确认清单已导出。');
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return {
        role: parsed?.role || 'consultant',
        codes: new Set(Array.isArray(parsed?.codes) ? parsed.codes.filter((code) => DATA.codes[code]) : ['21']),
        selected: Array.isArray(parsed?.selected) ? parsed.selected : []
      };
    } catch (_error) {
      return { role: 'consultant', codes: new Set(['21']), selected: [] };
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: state.role, codes: [...state.codes], selected: state.selected }));
    } catch (_error) {
      /* Local persistence is optional in the standalone preview. */
    }
  }

  function downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function timestamp() {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    el.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3000);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }
}());
