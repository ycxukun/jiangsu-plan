(() => {
  'use strict';

  const DATA = window.VOLUNTEER_SANDBOX_DATA || { meta: {}, groups: [] };
  const MAX_GROUPS = 40;
  const PAGE_SIZE = 6;
  const DEFAULT_CONFIG = { chongMax: 40, wenMax: 80 };
  const STORAGE = {
    draft: 'volunteer-sandbox-draft-v1',
    saved: 'volunteer-sandbox-saved-v1',
    config: 'volunteer-sandbox-risk-config-v1',
    confirmations: 'volunteer-sandbox-confirmations-v1'
  };
  const RISK_META = {
    chong: { text: '冲', desc: '较高风险' },
    wen: { text: '稳', desc: '中等风险' },
    bao: { text: '保', desc: '较低风险' }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const groupById = new Map(DATA.groups.map((group) => [group.id, group]));
  const storedDraft = readJSON(STORAGE.draft, {});
  const storedConfig = readJSON(STORAGE.config, DEFAULT_CONFIG);
  const storedConfirmations = readJSON(STORAGE.confirmations, []);
  const validIds = new Set(DATA.groups.map((group) => group.id));

  const state = {
    score: positiveNumber(storedDraft.score) || DATA.meta.sampleScore || 610,
    rank: positiveNumber(storedDraft.rank) || 25000,
    studentId: storedDraft.studentId || 'HSYDEMO001',
    studentName: storedDraft.studentName || '演示学生',
    avoidMajors: storedDraft.avoidMajors || '',
    selected: Array.isArray(storedDraft.selected) ? storedDraft.selected.filter((id) => validIds.has(id)).slice(0, MAX_GROUPS) : [],
    majors: sanitizeMajorSelections(storedDraft.majors),
    adjustments: sanitizeAdjustments(storedDraft.adjustments),
    confirmations: sanitizeConfirmations(storedConfirmations),
    riskFilter: 'all',
    search: '',
    sort: 'probability',
    page: 1,
    config: normalizeConfig(storedConfig),
    pendingWarningId: null,
    highlightedId: null,
    draggedId: null
  };

  const el = {
    dataNote: $('#dataNote'),
    studentId: $('#studentIdInput'),
    studentName: $('#studentNameInput'),
    score: $('#scoreInput'),
    rank: $('#rankInput'),
    avoidMajors: $('#avoidMajorsInput'),
    selectedTotal: $('#selectedTotal'),
    selectedBreakdown: $('#selectedBreakdown'),
    selectedChongBar: $('#selectedChongBar'),
    selectedWenBar: $('#selectedWenBar'),
    selectedBaoBar: $('#selectedBaoBar'),
    catalogBreakdown: $('#catalogBreakdown'),
    filterAllCount: $('#filterAllCount'),
    filterChongCount: $('#filterChongCount'),
    filterWenCount: $('#filterWenCount'),
    filterBaoCount: $('#filterBaoCount'),
    search: $('#searchInput'),
    sort: $('#sortSelect'),
    probabilityList: $('#probabilityList'),
    pageRange: $('#pageRange'),
    groupList: $('#groupList'),
    resultCount: $('#resultCount'),
    pagination: $('#pagination'),
    volunteerPanel: $('#volunteerPanel'),
    volunteerList: $('#volunteerList'),
    volunteerCount: $('#volunteerCount'),
    strategySelect: $('#strategySelect'),
    confirmationStrip: $('#confirmationStrip'),
    confirmationStatus: $('#confirmationStatus'),
    confirmationDetail: $('#confirmationDetail'),
    lastSaved: $('#lastSaved'),
    mobileVolunteerButton: $('#mobileVolunteerButton'),
    warningDialog: $('#warningDialog'),
    warningCopy: $('#warningCopy'),
    warningMajors: $('#warningMajors'),
    warningAcknowledge: $('#warningAcknowledge'),
    warningContinue: $('#warningContinue'),
    algorithmDialog: $('#algorithmDialog'),
    chongThreshold: $('#chongThresholdInput'),
    wenThreshold: $('#wenThresholdInput'),
    formulaCopy: $('#formulaCopy'),
    saveDialog: $('#saveDialog'),
    saveWarningCopy: $('#saveWarningCopy'),
    parentConfirmDialog: $('#parentConfirmDialog'),
    parentConfirmationSummary: $('#parentConfirmationSummary'),
    parentName: $('#parentNameInput'),
    parentRelation: $('#parentRelationSelect'),
    parentNote: $('#parentNoteInput'),
    parentRiskAcknowledge: $('#parentRiskAcknowledge'),
    parentAdjustmentAcknowledge: $('#parentAdjustmentAcknowledge'),
    submitParentConfirmation: $('#submitParentConfirmation'),
    confirmationHistoryDialog: $('#confirmationHistoryDialog'),
    confirmationHistoryList: $('#confirmationHistoryList'),
    toast: $('#toast')
  };

  initialize();

  function initialize() {
    el.studentId.value = state.studentId;
    el.studentName.value = state.studentName;
    el.score.value = state.score;
    el.rank.value = state.rank;
    el.avoidMajors.value = state.avoidMajors;
    el.dataNote.textContent = `${DATA.meta.previewGroups || DATA.groups.length} 个真实专业组样本 · ${DATA.meta.selectionRule || ''}`;
    bindEvents();
    render();
  }

  function bindEvents() {
    el.studentId.addEventListener('input', () => updateStudentField('studentId', el.studentId.value));
    el.studentName.addEventListener('input', () => updateStudentField('studentName', el.studentName.value));
    el.score.addEventListener('input', () => {
      state.score = positiveNumber(el.score.value) || 0;
      state.page = 1;
      saveDraft();
      render();
    });
    el.rank.addEventListener('input', () => updateStudentField('rank', positiveNumber(el.rank.value) || 0));
    el.avoidMajors.addEventListener('input', () => {
      state.avoidMajors = el.avoidMajors.value;
      saveDraft();
      renderBrowse();
      renderVolunteer();
      renderConfirmationStatus();
    });
    el.search.addEventListener('input', () => {
      state.search = el.search.value.trim().toLowerCase();
      state.page = 1;
      renderBrowse();
    });
    el.sort.addEventListener('change', () => {
      state.sort = el.sort.value;
      state.page = 1;
      renderBrowse();
    });

    $$('.filter-button').forEach((button) => button.addEventListener('click', () => {
      state.riskFilter = button.dataset.riskFilter;
      state.page = 1;
      $$('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
      renderBrowse();
    }));

    el.probabilityList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-probability-id]');
      if (button) highlightGroup(button.dataset.probabilityId);
    });

    el.groupList.addEventListener('click', (event) => {
      const action = event.target.closest('[data-group-action]');
      if (!action) return;
      const id = action.dataset.groupId;
      if (action.dataset.groupAction === 'add') requestAddGroup(id);
      if (action.dataset.groupAction === 'remove') removeGroup(id);
    });

    el.groupList.addEventListener('change', (event) => {
      const consent = event.target.closest('[data-adjustment-consent]');
      if (consent) {
        setAdjustmentConsent(consent.dataset.groupId, consent.checked);
        return;
      }
      const checkbox = event.target.closest('[data-major-id]');
      if (!checkbox) return;
      toggleMajor(checkbox.dataset.groupId, checkbox.dataset.majorId, checkbox.checked, checkbox);
    });

    el.pagination.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      renderBrowse();
      $('.group-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    el.volunteerList.addEventListener('click', (event) => {
      const action = event.target.closest('[data-volunteer-action]');
      if (!action) return;
      const id = action.dataset.groupId;
      if (action.dataset.volunteerAction === 'remove') removeGroup(id);
      if (action.dataset.volunteerAction === 'up') moveGroup(id, -1);
      if (action.dataset.volunteerAction === 'down') moveGroup(id, 1);
      if (action.dataset.volunteerAction === 'locate') locateSelectedGroup(id);
    });
    el.volunteerList.addEventListener('change', (event) => {
      const consent = event.target.closest('[data-volunteer-consent]');
      if (consent) setAdjustmentConsent(consent.dataset.groupId, consent.checked);
    });
    el.volunteerList.addEventListener('dragstart', (event) => {
      const item = event.target.closest('[data-volunteer-id]');
      if (!item) return;
      state.draggedId = item.dataset.volunteerId;
      item.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', state.draggedId);
    });
    el.volunteerList.addEventListener('dragover', (event) => {
      const item = event.target.closest('[data-volunteer-id]');
      if (!item || item.dataset.volunteerId === state.draggedId) return;
      event.preventDefault();
      item.classList.add('drag-target');
    });
    el.volunteerList.addEventListener('dragleave', (event) => event.target.closest('[data-volunteer-id]')?.classList.remove('drag-target'));
    el.volunteerList.addEventListener('drop', (event) => {
      const item = event.target.closest('[data-volunteer-id]');
      if (!item || !state.draggedId) return;
      event.preventDefault();
      reorderByDrop(state.draggedId, item.dataset.volunteerId);
    });
    el.volunteerList.addEventListener('dragend', () => {
      state.draggedId = null;
      $$('.volunteer-item').forEach((item) => item.classList.remove('dragging', 'drag-target'));
    });

    $('#strategyButton').addEventListener('click', generateStrategy);
    $('#parentConfirmButton').addEventListener('click', openParentConfirmation);
    $('#confirmationHistoryButton').addEventListener('click', openConfirmationHistory);
    $('#saveButton').addEventListener('click', () => savePlan(false));
    $('#forceSaveButton').addEventListener('click', (event) => {
      event.preventDefault();
      commitSave();
      el.saveDialog.close();
    });
    $('#exportButton').addEventListener('click', exportCsv);
    $('#resetButton').addEventListener('click', resetPlan);
    $('#algorithmButton').addEventListener('click', openAlgorithmDialog);
    $('#saveThresholdButton').addEventListener('click', applyThresholds);
    $('#restoreThresholdButton').addEventListener('click', () => {
      el.chongThreshold.value = DEFAULT_CONFIG.chongMax;
      el.wenThreshold.value = DEFAULT_CONFIG.wenMax;
      updateFormulaCopy(DEFAULT_CONFIG);
    });
    el.chongThreshold.addEventListener('input', previewFormula);
    el.wenThreshold.addEventListener('input', previewFormula);
    el.warningAcknowledge.addEventListener('change', () => {
      el.warningContinue.disabled = !el.warningAcknowledge.checked;
    });
    el.warningContinue.addEventListener('click', (event) => {
      event.preventDefault();
      if (!el.warningAcknowledge.checked || !state.pendingWarningId) return;
      addGroup(state.pendingWarningId);
      state.pendingWarningId = null;
      el.warningDialog.close();
    });
    [el.parentName, el.parentRiskAcknowledge, el.parentAdjustmentAcknowledge].forEach((control) => control.addEventListener('input', updateParentConfirmationButton));
    el.submitParentConfirmation.addEventListener('click', submitParentConfirmation);
    el.mobileVolunteerButton.addEventListener('click', () => el.volunteerPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function updateStudentField(field, value) {
    state[field] = value;
    saveDraft();
    renderConfirmationStatus();
  }

  function render() {
    renderSummary();
    renderBrowse();
    renderVolunteer();
    renderLastSaved();
    renderConfirmationStatus();
  }

  function renderSummary() {
    const catalogCounts = countRisks(DATA.groups);
    const selectedGroups = state.selected.map((id) => groupById.get(id)).filter(Boolean);
    const selectedCounts = countRisks(selectedGroups);
    el.selectedTotal.textContent = `已选 ${state.selected.length} / ${MAX_GROUPS}`;
    el.selectedBreakdown.textContent = `冲 ${selectedCounts.chong}｜稳 ${selectedCounts.wen}｜保 ${selectedCounts.bao}`;
    el.catalogBreakdown.textContent = `当前列表：冲 ${catalogCounts.chong}｜稳 ${catalogCounts.wen}｜保 ${catalogCounts.bao}`;
    el.filterAllCount.textContent = DATA.groups.length;
    el.filterChongCount.textContent = catalogCounts.chong;
    el.filterWenCount.textContent = catalogCounts.wen;
    el.filterBaoCount.textContent = catalogCounts.bao;
    const total = Math.max(1, state.selected.length);
    el.selectedChongBar.style.width = `${selectedCounts.chong / total * 100}%`;
    el.selectedWenBar.style.width = `${selectedCounts.wen / total * 100}%`;
    el.selectedBaoBar.style.width = `${selectedCounts.bao / total * 100}%`;
    el.mobileVolunteerButton.querySelector('b').textContent = state.selected.length;
  }

  function renderBrowse() {
    const groups = filteredGroups();
    const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageGroups = groups.slice(start, start + PAGE_SIZE);

    el.resultCount.textContent = `${groups.length} 个结果 · 第 ${state.page}/${totalPages} 页`;
    el.pageRange.textContent = groups.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, groups.length)}` : '0–0';
    el.probabilityList.innerHTML = pageGroups.length ? pageGroups.map(probabilityItemHtml).join('') : emptyHtml('没有符合条件的专业组');
    el.groupList.innerHTML = pageGroups.length ? pageGroups.map(groupCardHtml).join('') : emptyHtml('请调整搜索词或冲稳保筛选');
    el.pagination.innerHTML = paginationHtml(totalPages);
  }

  function renderVolunteer() {
    const groups = state.selected.map((id) => groupById.get(id)).filter(Boolean);
    el.volunteerCount.textContent = `${groups.length} / ${MAX_GROUPS}`;
    el.volunteerList.innerHTML = groups.length ? groups.map(volunteerItemHtml).join('') : `
      <div class="volunteer-empty"><strong>还没有选择专业组</strong><p>从中间卡片加入，或使用上方策略生成 20 组示例。</p></div>`;
  }

  function filteredGroups() {
    const search = state.search;
    const groups = DATA.groups.filter((group) => {
      const risk = riskState(group);
      if (state.riskFilter !== 'all' && risk.level !== state.riskFilter) return false;
      if (!search) return true;
      const haystack = [
        group.school, group.groupName, group.groupCode, group.majorSummary,
        ...(group.majorClasses || []), ...(group.majors || []).flatMap((major) => [major.name, major.baseName, major.majorClass])
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });

    return groups.sort((left, right) => {
      if (state.sort === 'school') return `${left.school}${left.displayCode}`.localeCompare(`${right.school}${right.displayCode}`, 'zh-CN');
      if (state.sort === 'score') return (positiveNumber(right.score25) || 0) - (positiveNumber(left.score25) || 0);
      return riskState(left).probability - riskState(right).probability;
    });
  }

  function probabilityItemHtml(group) {
    const risk = riskState(group);
    const order = state.selected.indexOf(group.id);
    return `<button class="probability-item risk-${risk.level}${order >= 0 ? ' selected' : ''}" type="button" data-probability-id="${escapeHtml(group.id)}">
      <span class="probability-value">${risk.probability}%</span>
      <span class="probability-copy"><b>${risk.text}｜${risk.desc}</b><small>${escapeHtml(group.school)} ${escapeHtml(group.displayCode || '')}</small></span>
      <span class="probability-state">${order >= 0 ? `第 ${order + 1} 志愿` : '未选'}</span>
    </button>`;
  }

  function groupCardHtml(group) {
    const risk = riskState(group);
    const order = state.selected.indexOf(group.id);
    const selected = order >= 0;
    const chosenMajors = selectedMajorIds(group.id);
    const adjustment = adjustmentAnalysis(group);
    const consent = adjustmentConsent(group.id);
    const history = historyEntries(group);
    const historyHtml = history.map((item) => `<div><span>${item.year}</span><b>${formatNumber(item.score)}</b><small>${state.score >= item.score ? '够到' : '未到'}</small></div>`).join('');
    const tags = [...(group.tags || []).slice(0, 4), ...(group.majorClasses || []).slice(0, 2)];
    const majors = (group.majors || []).map((major) => {
      const checked = chosenMajors.includes(major.key);
      const warning = major.risk || /色觉|色盲|色弱|视力|体检|听力|嗅觉|口吃/.test(`${major.name} ${major.remark || ''}`);
      return `<label class="major-option${warning ? ' warning' : ''}">
        <input type="checkbox" data-group-id="${escapeHtml(group.id)}" data-major-id="${escapeHtml(major.key)}" ${checked ? 'checked' : ''} ${selected ? '' : 'disabled'}>
        <span><b>${escapeHtml(major.code || '—')} ${escapeHtml(major.name)}</b><small>${escapeHtml(major.majorClass || '专业类待核')}｜26计划 ${formatNumber(major.plan26)}</small></span>
        ${warning ? '<em>体检提示</em>' : ''}
      </label>`;
    }).join('');

    return `<article class="group-card risk-${risk.level}${selected ? ' selected' : ''}${state.highlightedId === group.id ? ' highlighted' : ''}" id="group-${escapeHtml(group.id)}">
      <header class="group-card-header">
        <div><p>${escapeHtml(group.province)} · ${escapeHtml(group.subject)} · ${escapeHtml(group.requirement || '不限')}</p><h3>${escapeHtml(group.school)} ${escapeHtml(group.displayCode || '')}专业组</h3><span>${escapeHtml(group.majorSummary || group.groupName)}</span></div>
        <div class="risk-stamp risk-${risk.level}"><strong>${risk.probability}% ${risk.text}</strong><small>${risk.desc}</small></div>
      </header>
      <div class="group-card-body">
        <div class="history-block"><div class="history-heading"><b>近三年专业组最低分</b><span>够到 ${risk.reachable}/${history.length} 年</span></div><div class="history-grid">${historyHtml}</div></div>
        <dl class="group-facts">
          <div><dt>2026 计划</dt><dd>${formatNumber(group.plan26)}</dd></div>
          <div><dt>专业数</dt><dd>${formatNumber(group.groupMajorCount)}</dd></div>
          <div><dt>2025 位次</dt><dd>${formatNumber(group.rank25)}</dd></div>
        </dl>
        <div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}${group.medicalWarning ? '<span class="warning-tag">体检条件需核</span>' : ''}</div>
        <div class="adjustment-alert adjustment-${adjustment.tone}"><div><b>最差调剂结果</b><span>${escapeHtml(adjustment.title)}</span></div><small>${escapeHtml(adjustment.detail)}</small></div>
        <div class="group-actions">
          <button class="button ${selected ? 'button-secondary' : 'button-primary'}" type="button" data-group-action="${selected ? 'remove' : 'add'}" data-group-id="${escapeHtml(group.id)}">${selected ? `已加入 第 ${order + 1} 志愿` : '加入志愿表'}</button>
          <span>${selected ? `已选专业 ${chosenMajors.length}/6` : '加入后可调整专业顺序'}</span>
        </div>
        ${selected ? `<label class="consent-row"><input type="checkbox" data-adjustment-consent data-group-id="${escapeHtml(group.id)}" ${consent ? 'checked' : ''}><span>服从专业调剂</span><small>${consent ? '未录到所选专业时，可能调剂到组内其他专业' : '不服从调剂，存在退档风险'}</small></label>` : ''}
        <details class="major-details" ${selected && chosenMajors.length === 0 ? 'open' : ''}><summary>组内全部专业 ${group.majors.length} 个</summary><div class="major-grid">${majors}</div></details>
      </div>
    </article>`;
  }

  function volunteerItemHtml(group, index) {
    const risk = riskState(group);
    const majors = selectedMajors(group);
    const adjustment = adjustmentAnalysis(group);
    const consent = adjustmentConsent(group.id);
    return `<article class="volunteer-item risk-${risk.level}" draggable="true" data-volunteer-id="${escapeHtml(group.id)}">
      <div class="volunteer-order" aria-label="第 ${index + 1} 志愿">${index + 1}</div>
      <div class="volunteer-copy">
        <div><b>${escapeHtml(group.school)} ${escapeHtml(group.displayCode || '')}</b><span class="mini-risk risk-${risk.level}">${risk.text} ${risk.probability}%</span></div>
        <p>${escapeHtml(group.majorSummary || group.groupName)}</p>
        <small>${majors.length ? majors.map((major) => major.baseName || major.name).join('、') : '尚未选择专业'}</small>
        <div class="volunteer-adjustment adjustment-${adjustment.tone}"><b>${escapeHtml(adjustment.title)}</b><small>${escapeHtml(adjustment.detail)}</small></div>
        <label class="compact-consent"><input type="checkbox" data-volunteer-consent data-group-id="${escapeHtml(group.id)}" ${consent ? 'checked' : ''}><span>服从调剂</span></label>
      </div>
      <div class="volunteer-actions">
        <button type="button" title="上移" aria-label="上移" data-volunteer-action="up" data-group-id="${escapeHtml(group.id)}">↑</button>
        <button type="button" title="下移" aria-label="下移" data-volunteer-action="down" data-group-id="${escapeHtml(group.id)}">↓</button>
        <button type="button" title="定位" aria-label="定位原卡片" data-volunteer-action="locate" data-group-id="${escapeHtml(group.id)}">◎</button>
        <button type="button" title="删除" aria-label="删除" data-volunteer-action="remove" data-group-id="${escapeHtml(group.id)}">×</button>
      </div>
    </article>`;
  }

  function paginationHtml(totalPages) {
    if (totalPages <= 1) return '';
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
    return `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>上一页</button>
      ${pages.map((page) => `<button type="button" data-page="${page}" class="${page === state.page ? 'active' : ''}">${page}</button>`).join('')}
      <button type="button" data-page="${state.page + 1}" ${state.page === totalPages ? 'disabled' : ''}>下一页</button>`;
  }

  function requestAddGroup(id) {
    const group = groupById.get(id);
    if (!group || state.selected.includes(id)) return;
    if (state.selected.length >= MAX_GROUPS) {
      showToast(`普通批最多选择 ${MAX_GROUPS} 个专业组。`, 'error');
      return;
    }
    if (!group.medicalWarning) {
      addGroup(id);
      return;
    }
    state.pendingWarningId = id;
    el.warningAcknowledge.checked = false;
    el.warningContinue.disabled = true;
    el.warningCopy.textContent = `${group.school} ${group.displayCode || ''}专业组含有需要核对体检条件的专业。系统只提醒，不直接禁止选择。`;
    el.warningMajors.innerHTML = (group.warningMajorNames || []).map((name) => `<li>${escapeHtml(name)}</li>`).join('');
    el.warningDialog.showModal();
  }

  function addGroup(id) {
    const group = groupById.get(id);
    if (!group || state.selected.includes(id) || state.selected.length >= MAX_GROUPS) return;
    state.selected.push(id);
    if (!state.majors[id]?.length) state.majors[id] = group.majors.slice(0, 6).map((major) => major.key);
    state.adjustments[id] = { consent: true };
    saveDraft();
    render();
    showToast(`已加入第 ${state.selected.length} 志愿：${group.school}${group.displayCode || ''}`);
  }

  function removeGroup(id) {
    const index = state.selected.indexOf(id);
    if (index < 0) return;
    const group = groupById.get(id);
    state.selected.splice(index, 1);
    delete state.majors[id];
    delete state.adjustments[id];
    saveDraft();
    render();
    showToast(`已移除：${group?.school || '专业组'}`);
  }

  function moveGroup(id, delta) {
    const from = state.selected.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= state.selected.length) return;
    const [item] = state.selected.splice(from, 1);
    state.selected.splice(to, 0, item);
    saveDraft();
    render();
  }

  function reorderByDrop(fromId, targetId) {
    const from = state.selected.indexOf(fromId);
    const target = state.selected.indexOf(targetId);
    if (from < 0 || target < 0 || from === target) return;
    const [item] = state.selected.splice(from, 1);
    state.selected.splice(target, 0, item);
    saveDraft();
    render();
  }

  function toggleMajor(groupId, majorId, checked, checkbox) {
    if (!state.selected.includes(groupId)) return;
    const current = selectedMajorIds(groupId);
    if (checked && !current.includes(majorId)) {
      if (current.length >= 6) {
        checkbox.checked = false;
        showToast('每个专业组最多选择 6 个专业。', 'error');
        return;
      }
      current.push(majorId);
    }
    if (!checked) state.majors[groupId] = current.filter((id) => id !== majorId);
    else state.majors[groupId] = current;
    saveDraft();
    renderSummary();
    renderVolunteer();
    renderConfirmationStatus();
    const card = document.getElementById(`group-${groupId}`);
    const status = card?.querySelector('.group-actions span');
    if (status) status.textContent = `已选专业 ${state.majors[groupId].length}/6`;
    updateAdjustmentAlert(card, groupById.get(groupId));
  }

  function setAdjustmentConsent(groupId, consent) {
    if (!state.selected.includes(groupId)) return;
    state.adjustments[groupId] = { consent: Boolean(consent) };
    saveDraft();
    renderBrowse();
    renderVolunteer();
    renderConfirmationStatus();
  }

  function locateSelectedGroup(id) {
    state.riskFilter = 'all';
    state.search = '';
    el.search.value = '';
    $$('.filter-button').forEach((button) => button.classList.toggle('active', button.dataset.riskFilter === 'all'));
    const groups = filteredGroups();
    const index = groups.findIndex((group) => group.id === id);
    state.page = index >= 0 ? Math.floor(index / PAGE_SIZE) + 1 : 1;
    renderBrowse();
    highlightGroup(id);
  }

  function highlightGroup(id) {
    state.highlightedId = id;
    $$('.group-card').forEach((card) => card.classList.toggle('highlighted', card.id === `group-${id}`));
    const card = document.getElementById(`group-${id}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      if (state.highlightedId === id) {
        state.highlightedId = null;
        card?.classList.remove('highlighted');
      }
    }, 1800);
  }

  function generateStrategy() {
    if (state.selected.length && !window.confirm('策略生成会替换当前志愿表，是否继续？')) return;
    const strategies = {
      balanced: { label: '均衡型', ratios: { chong: 0.30, wen: 0.45, bao: 0.25 } },
      conservative: { label: '保守型', ratios: { chong: 0.20, wen: 0.40, bao: 0.40 } },
      progressive: { label: '进取型', ratios: { chong: 0.40, wen: 0.40, bao: 0.20 } }
    };
    const strategy = strategies[el.strategySelect.value] || strategies.balanced;
    const targetTotal = Math.min(20, DATA.groups.length, MAX_GROUPS);
    const buckets = { chong: [], wen: [], bao: [] };
    DATA.groups.forEach((group) => buckets[riskState(group).level].push(group));
    Object.values(buckets).forEach((bucket) => bucket.sort((left, right) => riskState(left).probability - riskState(right).probability));
    const targets = {
      chong: Math.round(targetTotal * strategy.ratios.chong),
      wen: Math.round(targetTotal * strategy.ratios.wen),
      bao: 0
    };
    targets.bao = targetTotal - targets.chong - targets.wen;
    const picked = [];
    ['chong', 'wen', 'bao'].forEach((level) => picked.push(...buckets[level].slice(0, targets[level])));
    ['wen', 'bao', 'chong'].forEach((level) => {
      for (const group of buckets[level]) {
        if (picked.length >= targetTotal) break;
        if (!picked.includes(group)) picked.push(group);
      }
    });
    state.selected = picked.map((group) => group.id);
    state.majors = Object.fromEntries(picked.map((group) => [group.id, group.majors.slice(0, 6).map((major) => major.key)]));
    state.adjustments = Object.fromEntries(picked.map((group) => [group.id, { consent: true }]));
    saveDraft();
    render();
    showToast(`已生成${strategy.label} 20 组方案。`);
  }

  function savePlan(force) {
    if (!state.selected.length) {
      showToast('请先选择至少 1 个专业组。', 'error');
      return;
    }
    const counts = countRisks(state.selected.map((id) => groupById.get(id)).filter(Boolean));
    const warnings = [];
    if (counts.bao < Math.max(2, Math.floor(state.selected.length * 0.2))) warnings.push('保类专业组偏少，方案保底性不足');
    if (counts.chong > Math.ceil(state.selected.length * 0.45)) warnings.push('冲类专业组占比偏高，可能影响录取稳定性');
    if (state.selected.some((id) => selectedMajorIds(id).length === 0)) warnings.push('部分专业组还没有选择具体专业');
    const adjustmentRisks = selectedAdjustmentRisks();
    if (adjustmentRisks.high.length) warnings.push(`${adjustmentRisks.high.length} 个专业组可能调剂到“不接受专业”`);
    if (adjustmentRisks.decline.length) warnings.push(`${adjustmentRisks.decline.length} 个专业组选择不服从调剂，存在退档风险`);
    if (warnings.length && !force) {
      el.saveWarningCopy.textContent = warnings.join('；') + '。';
      el.saveDialog.showModal();
      return;
    }
    commitSave();
  }

  function commitSave() {
    const savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE.saved, JSON.stringify({ ...draftPayload(), savedAt }));
    renderLastSaved();
    showToast('志愿表已保存，本页三处状态已同步。');
  }

  function renderLastSaved() {
    const saved = readJSON(STORAGE.saved, {});
    el.lastSaved.textContent = saved.savedAt ? `上次保存 ${new Date(saved.savedAt).toLocaleString('zh-CN', { hour12: false })}` : '尚未保存';
  }

  function exportCsv() {
    if (!state.selected.length) {
      showToast('志愿表为空，无法导出。', 'error');
      return;
    }
    const timestamp = compactTimestamp(new Date());
    const sheetNumber = `ZY${timestamp}`;
    const confirmation = validConfirmation();
    const headers = ['志愿序号', '志愿表号', '学号', '学生姓名', '导出时间', '院校', '专业组代码', '批次', '科类', '选科要求', '冲稳保', '录取概率', '2025最低分', '2024最低分', '2023最低分', '2026计划', '已选专业代码', '已选专业名称', '不接受专业关键词', '是否服从调剂', '最差调剂结果提示', '体检提醒', '家长确认状态', '确认人', '与学生关系', '确认时间', '确认记录号', '方案版本'];
    const rows = state.selected.map((id, index) => {
      const group = groupById.get(id);
      const risk = riskState(group);
      const majors = selectedMajors(group);
      const adjustment = adjustmentAnalysis(group);
      return [
        index + 1, sheetNumber, state.studentId, state.studentName, new Date().toLocaleString('zh-CN', { hour12: false }),
        group.school, group.groupCode, group.batch, group.subject, group.requirement, risk.text, `${risk.probability}%`,
        group.score25, group.score24, group.score23, group.plan26,
        majors.map((major) => major.code).join(' / '), majors.map((major) => major.name).join(' / '), state.avoidMajors,
        adjustmentConsent(id) ? '是' : '否', `${adjustment.title}；${adjustment.detail}`, group.medicalWarning ? '需核对院校章程' : '',
        confirmation ? '已确认' : state.confirmations.length ? '方案已变化，需重新确认' : '未确认', confirmation?.parentName || '', confirmation?.relation || '',
        confirmation ? new Date(confirmation.confirmedAt).toLocaleString('zh-CN', { hour12: false }) : '', confirmation?.id || '', planFingerprint()
      ];
    });
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${safeFilename(state.studentId)}_${safeFilename(state.studentName)}_${timestamp}_${sheetNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    showToast(`已导出 ${state.selected.length} 个专业组。`);
  }

  function resetPlan() {
    if (state.selected.length && !window.confirm('确定清空当前志愿方案吗？')) return;
    state.selected = [];
    state.majors = {};
    state.adjustments = {};
    saveDraft();
    render();
    showToast('志愿方案已清空。');
  }

  function openAlgorithmDialog() {
    el.chongThreshold.value = state.config.chongMax;
    el.wenThreshold.value = state.config.wenMax;
    updateFormulaCopy(state.config);
    el.algorithmDialog.showModal();
  }

  function previewFormula() {
    updateFormulaCopy({ chongMax: Number(el.chongThreshold.value), wenMax: Number(el.wenThreshold.value) });
  }

  function updateFormulaCopy(config) {
    el.formulaCopy.textContent = `冲：p < ${config.chongMax}%｜稳：${config.chongMax}% ≤ p < ${config.wenMax}%｜保：p ≥ ${config.wenMax}%`;
  }

  function applyThresholds(event) {
    event.preventDefault();
    const config = { chongMax: Number(el.chongThreshold.value), wenMax: Number(el.wenThreshold.value) };
    if (!Number.isFinite(config.chongMax) || !Number.isFinite(config.wenMax) || config.chongMax < 1 || config.wenMax > 99 || config.chongMax >= config.wenMax) {
      showToast('阈值无效：必须满足 1 ≤ 冲上限 < 稳上限 ≤ 99。', 'error');
      return;
    }
    state.config = config;
    localStorage.setItem(STORAGE.config, JSON.stringify(config));
    state.page = 1;
    el.algorithmDialog.close();
    render();
    showToast('冲稳保阈值已更新。');
  }

  function riskState(group) {
    const history = historyEntries(group);
    if (!history.length) return { level: 'chong', text: '待定', desc: '缺少历史', probability: 0, reachable: 0 };
    const margins = history.map((item) => state.score - item.score);
    const averageMargin = margins.reduce((sum, value) => sum + value, 0) / margins.length;
    const reachable = margins.filter((value) => value >= 0).length;
    const reachableRatio = reachable / margins.length;
    const logistic = 100 / (1 + Math.exp(-averageMargin / 6));
    const probability = Math.max(1, Math.min(99, Math.round(logistic * 0.65 + reachableRatio * 35)));
    const level = probability < state.config.chongMax ? 'chong' : probability < state.config.wenMax ? 'wen' : 'bao';
    return { level, ...RISK_META[level], probability, reachable };
  }

  function historyEntries(group) {
    return [
      { year: '2025', score: positiveNumber(group.score25) },
      { year: '2024', score: positiveNumber(group.score24) },
      { year: '2023', score: positiveNumber(group.score23) }
    ].filter((item) => item.score !== null);
  }

  function countRisks(groups) {
    return groups.reduce((counts, group) => {
      const level = riskState(group).level;
      counts[level] += 1;
      return counts;
    }, { chong: 0, wen: 0, bao: 0 });
  }

  function selectedMajorIds(groupId) {
    return Array.isArray(state.majors[groupId]) ? state.majors[groupId] : [];
  }

  function selectedMajors(group) {
    const ids = new Set(selectedMajorIds(group.id));
    return (group.majors || []).filter((major) => ids.has(major.key));
  }

  function adjustmentConsent(groupId) {
    return state.adjustments[groupId]?.consent !== false;
  }

  function avoidKeywords() {
    return String(state.avoidMajors || '').split(/[,，、;；\n]+/).map((word) => word.trim()).filter(Boolean);
  }

  function adjustmentAnalysis(group) {
    const selected = state.selected.includes(group.id);
    const selectedIds = new Set(selected ? selectedMajorIds(group.id) : group.majors.slice(0, 6).map((major) => major.key));
    const unselected = group.majors.filter((major) => !selectedIds.has(major.key));
    const consent = adjustmentConsent(group.id);
    if (selected && !consent) {
      return {
        tone: 'decline',
        title: '不服从调剂：存在退档风险',
        detail: '未录到已选专业时，学校可能按不服从专业调剂处理；最终以院校招生章程为准。',
        candidate: null,
        conflicts: []
      };
    }
    if (!unselected.length) {
      return {
        tone: 'safe',
        title: '组内专业已全部覆盖',
        detail: '当前所选专业已覆盖本组全部专业，没有额外的组内调剂去向。',
        candidate: null,
        conflicts: []
      };
    }
    const keywords = avoidKeywords();
    const conflicts = unselected.filter((major) => {
      const text = `${major.name || ''} ${major.baseName || ''} ${major.majorClass || ''} ${major.discipline || ''}`;
      return keywords.some((keyword) => text.includes(keyword));
    });
    if (conflicts.length) {
      const candidate = conflicts[0];
      return {
        tone: 'high',
        title: `可能调剂到不接受专业：${candidate.baseName || candidate.name}`,
        detail: `未选专业中有 ${conflicts.length} 个命中学生禁忌关键词；必须逐项核对并由家长确认。`,
        candidate,
        conflicts
      };
    }
    const scored = unselected.filter((major) => positiveNumber(major.score25) !== null).sort((left, right) => positiveNumber(left.score25) - positiveNumber(right.score25));
    const candidate = scored[0] || unselected[unselected.length - 1];
    const basis = positiveNumber(candidate?.score25) !== null ? `2025 专业最低分 ${candidate.score25}` : '按招生计划原顺序末位';
    return {
      tone: 'medium',
      title: `潜在调剂底线：${candidate?.baseName || candidate?.name || '待核对'}`,
      detail: `本组还有 ${unselected.length} 个未选专业；系统以${basis}示警，实际调剂规则以院校章程为准。`,
      candidate,
      conflicts: []
    };
  }

  function updateAdjustmentAlert(card, group) {
    if (!card || !group) return;
    const adjustment = adjustmentAnalysis(group);
    const alert = card.querySelector('.adjustment-alert');
    if (!alert) return;
    alert.className = `adjustment-alert adjustment-${adjustment.tone}`;
    alert.innerHTML = `<div><b>最差调剂结果</b><span>${escapeHtml(adjustment.title)}</span></div><small>${escapeHtml(adjustment.detail)}</small>`;
  }

  function selectedAdjustmentRisks() {
    return state.selected.reduce((summary, id) => {
      const group = groupById.get(id);
      if (!group) return summary;
      const analysis = adjustmentAnalysis(group);
      if (analysis.tone === 'high') summary.high.push({ group, analysis });
      if (analysis.tone === 'decline') summary.decline.push({ group, analysis });
      if (analysis.tone === 'medium') summary.medium.push({ group, analysis });
      return summary;
    }, { high: [], decline: [], medium: [] });
  }

  function planFingerprint() {
    const snapshot = {
      studentId: state.studentId,
      studentName: state.studentName,
      score: state.score,
      rank: state.rank,
      riskConfig: state.config,
      dataVersion: DATA.meta.generatedAt || 'preview-v1',
      avoidMajors: avoidKeywords(),
      groups: state.selected.map((id) => ({ id, majors: selectedMajorIds(id), consent: adjustmentConsent(id) }))
    };
    const text = JSON.stringify(snapshot);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `PLAN-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
  }

  function validConfirmation() {
    const fingerprint = planFingerprint();
    return [...state.confirmations].reverse().find((record) => record.studentId === state.studentId && record.fingerprint === fingerprint) || null;
  }

  function renderConfirmationStatus() {
    const button = $('#confirmationHistoryButton');
    const confirmButton = $('#parentConfirmButton');
    const studentRecords = state.confirmations.filter((record) => record.studentId === state.studentId);
    const current = validConfirmation();
    el.confirmationStrip.classList.remove('is-confirmed', 'is-stale');
    if (!state.selected.length) {
      el.confirmationStatus.textContent = '等待建立方案';
      el.confirmationDetail.textContent = '选择专业组后才能生成家长确认记录';
      confirmButton.disabled = true;
    } else if (current) {
      el.confirmationStrip.classList.add('is-confirmed');
      el.confirmationStatus.textContent = '家长已确认当前版本';
      el.confirmationDetail.textContent = `${current.parentName}（${current.relation}）· ${new Date(current.confirmedAt).toLocaleString('zh-CN', { hour12: false })} · ${current.fingerprint}`;
      confirmButton.disabled = false;
      confirmButton.textContent = '重新确认';
    } else if (studentRecords.length) {
      el.confirmationStrip.classList.add('is-stale');
      el.confirmationStatus.textContent = '方案已变化，需重新确认';
      el.confirmationDetail.textContent = `当前版本 ${planFingerprint()} 与最近确认版本不同`;
      confirmButton.disabled = false;
      confirmButton.textContent = '重新确认';
    } else {
      el.confirmationStatus.textContent = '家长未确认';
      el.confirmationDetail.textContent = `当前方案版本 ${planFingerprint()}`;
      confirmButton.disabled = false;
      confirmButton.textContent = '家长确认';
    }
    button.disabled = !studentRecords.length;
  }

  function openParentConfirmation() {
    if (!state.selected.length) {
      showToast('请先建立志愿方案。', 'error');
      return;
    }
    const counts = countRisks(state.selected.map((id) => groupById.get(id)).filter(Boolean));
    const adjustments = selectedAdjustmentRisks();
    el.parentConfirmationSummary.innerHTML = `
      <div><span>方案版本</span><b>${escapeHtml(planFingerprint())}</b></div>
      <div><span>志愿结构</span><b>冲 ${counts.chong}｜稳 ${counts.wen}｜保 ${counts.bao}</b></div>
      <div><span>调剂高风险</span><b>${adjustments.high.length} 组</b></div>
      <div><span>不服从调剂</span><b>${adjustments.decline.length} 组</b></div>`;
    const previous = [...state.confirmations].reverse().find((record) => record.studentId === state.studentId);
    el.parentName.value = previous?.parentName || '';
    el.parentRelation.value = previous?.relation || '父亲';
    el.parentNote.value = '';
    el.parentRiskAcknowledge.checked = false;
    el.parentAdjustmentAcknowledge.checked = false;
    updateParentConfirmationButton();
    el.parentConfirmDialog.showModal();
  }

  function updateParentConfirmationButton() {
    el.submitParentConfirmation.disabled = !el.parentName.value.trim() || !el.parentRiskAcknowledge.checked || !el.parentAdjustmentAcknowledge.checked;
  }

  function submitParentConfirmation(event) {
    event.preventDefault();
    if (el.submitParentConfirmation.disabled) return;
    const confirmedAt = new Date().toISOString();
    const counts = countRisks(state.selected.map((id) => groupById.get(id)).filter(Boolean));
    const adjustmentRisks = selectedAdjustmentRisks();
    const record = {
      id: `QR${compactTimestamp(new Date())}`,
      studentId: state.studentId,
      studentName: state.studentName,
      parentName: el.parentName.value.trim(),
      relation: el.parentRelation.value,
      note: el.parentNote.value.trim(),
      confirmedAt,
      fingerprint: planFingerprint(),
      selectedCount: state.selected.length,
      riskCounts: counts,
      adjustmentHighCount: adjustmentRisks.high.length,
      nonConsentCount: adjustmentRisks.decline.length,
      adjustmentWarnings: [...adjustmentRisks.high, ...adjustmentRisks.decline].map(({ group, analysis }) => `${group.school}${group.displayCode || ''}：${analysis.title}`)
    };
    state.confirmations.push(record);
    localStorage.setItem(STORAGE.confirmations, JSON.stringify(state.confirmations));
    localStorage.setItem(STORAGE.saved, JSON.stringify({ ...draftPayload(), savedAt: confirmedAt, confirmationId: record.id }));
    el.parentConfirmDialog.close();
    renderLastSaved();
    renderConfirmationStatus();
    showToast(`家长确认已记录：${record.id}`);
  }

  function openConfirmationHistory() {
    const currentFingerprint = planFingerprint();
    const records = state.confirmations.filter((record) => record.studentId === state.studentId).slice().reverse();
    el.confirmationHistoryList.innerHTML = records.length ? records.map((record) => {
      const current = record.fingerprint === currentFingerprint;
      return `<article class="confirmation-record${current ? ' current' : ''}"><header><div><b>${escapeHtml(record.id)}</b><span>${current ? '当前有效版本' : '历史版本'}</span></div><time>${new Date(record.confirmedAt).toLocaleString('zh-CN', { hour12: false })}</time></header><p>${escapeHtml(record.parentName)}（${escapeHtml(record.relation)}）确认 ${record.selectedCount} 个专业组；冲 ${record.riskCounts?.chong || 0}｜稳 ${record.riskCounts?.wen || 0}｜保 ${record.riskCounts?.bao || 0}；调剂高风险 ${record.adjustmentHighCount || 0} 组；不服从调剂 ${record.nonConsentCount || 0} 组。</p><small>${escapeHtml(record.fingerprint)}${record.note ? ` · 备注：${escapeHtml(record.note)}` : ''}</small></article>`;
    }).join('') : emptyHtml('暂无家长确认记录');
    el.confirmationHistoryDialog.showModal();
  }

  function draftPayload() {
    return {
      score: state.score,
      rank: state.rank,
      studentId: state.studentId,
      studentName: state.studentName,
      avoidMajors: state.avoidMajors,
      selected: state.selected,
      majors: state.majors,
      adjustments: state.adjustments
    };
  }

  function saveDraft() {
    localStorage.setItem(STORAGE.draft, JSON.stringify(draftPayload()));
  }

  function sanitizeMajorSelections(input) {
    if (!input || typeof input !== 'object') return {};
    const output = {};
    for (const [groupId, majorIds] of Object.entries(input)) {
      const group = groupById.get(groupId);
      if (!group || !Array.isArray(majorIds)) continue;
      const validMajorIds = new Set(group.majors.map((major) => major.key));
      output[groupId] = majorIds.filter((id) => validMajorIds.has(id)).slice(0, 6);
    }
    return output;
  }

  function sanitizeAdjustments(input) {
    if (!input || typeof input !== 'object') return {};
    const output = {};
    for (const [groupId, value] of Object.entries(input)) {
      if (!groupById.has(groupId)) continue;
      output[groupId] = { consent: value?.consent !== false };
    }
    return output;
  }

  function sanitizeConfirmations(input) {
    if (!Array.isArray(input)) return [];
    return input.filter((record) => record && typeof record === 'object' && record.id && record.studentId && record.fingerprint && record.confirmedAt).slice(-100);
  }

  function normalizeConfig(config) {
    const chongMax = Number(config?.chongMax);
    const wenMax = Number(config?.wenMax);
    if (!Number.isFinite(chongMax) || !Number.isFinite(wenMax) || chongMax < 1 || wenMax > 99 || chongMax >= wenMax) return { ...DEFAULT_CONFIG };
    return { chongMax, wenMax };
  }

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number.toLocaleString('zh-CN') : '—';
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  }

  function compactTimestamp(date) {
    const part = (value, size = 2) => String(value).padStart(size, '0');
    return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}${part(date.getMilliseconds(), 3)}`;
  }

  function safeFilename(value) {
    return String(value || '未命名').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function emptyHtml(copy) {
    return `<div class="empty-state"><strong>${escapeHtml(copy)}</strong></div>`;
  }

  let toastTimer = null;
  function showToast(copy, tone = 'success') {
    window.clearTimeout(toastTimer);
    el.toast.textContent = copy;
    el.toast.dataset.tone = tone;
    el.toast.classList.add('visible');
    toastTimer = window.setTimeout(() => el.toast.classList.remove('visible'), 2600);
  }
})();
