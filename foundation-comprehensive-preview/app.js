(function () {
  'use strict';

  const STORAGE_KEY = 'foundation-comprehensive-preview-data-v1';
  const ROLE_KEY = 'foundation-comprehensive-preview-role-v1';
  const PROFILE_KEY = 'foundation-comprehensive-preview-profile-v1';
  const MATERIAL_KEY = 'foundation-comprehensive-preview-materials-v1';
  const BASE_DATA = clone(window.PATHWAY_PREVIEW_DATA || { meta: {}, tracks: [], materials: [], comparison: [] });

  const roleCopy = {
    consultant: { label: '咨询师', scope: '显示公开解释、风险提示和内部咨询建议。' },
    public: { label: '家长/学生', scope: '显示流程、材料、适配提示和公开风险。' },
    admin: { label: '管理员', scope: '显示全部内容，并可在本地编辑流程字段。' }
  };

  const defaultProfile = {
    grade: 'top20', subject: 'physics', interest: 'basic', commitment: 'yes',
    evidence: 'basic', record: 'complete', communication: 'train'
  };

  const state = {
    data: loadData(),
    role: safeRead(ROLE_KEY) || 'consultant',
    view: 'overview',
    trackId: 'foundation',
    stageIndex: 0,
    profile: loadProfile(),
    materialTrack: 'all',
    materialDone: loadMaterialDone(),
    stageDone: { foundation: new Set(), comprehensive: new Set() },
    editorTrackId: 'foundation',
    editorStageIndex: 0
  };

  if (!roleCopy[state.role]) state.role = 'consultant';
  if (!getTrack(state.trackId)) state.trackId = state.data.tracks[0]?.id || '';

  const el = {
    app: document.getElementById('app'),
    policyYear: document.getElementById('policyYear'),
    policyRegion: document.getElementById('policyRegion'),
    policyStatus: document.getElementById('policyStatus'),
    currentRoleLabel: document.getElementById('currentRoleLabel'),
    roleScopeText: document.getElementById('roleScopeText'),
    profileGrade: document.getElementById('profileGrade'),
    pathwayOverview: document.getElementById('pathwayOverview'),
    trackContent: document.getElementById('trackContent'),
    materialTrack: document.getElementById('materialTrack'),
    materialSummary: document.getElementById('materialSummary'),
    materialList: document.getElementById('materialList'),
    comparisonTable: document.getElementById('comparisonTable'),
    portfolioAdvice: document.getElementById('portfolioAdvice'),
    editorTrack: document.getElementById('editorTrack'),
    editorStage: document.getElementById('editorStage'),
    editorSource: document.getElementById('editorSource'),
    editorForm: document.getElementById('editorForm'),
    editorSaveHint: document.getElementById('editorSaveHint'),
    toastRegion: document.getElementById('toastRegion')
  };

  init();

  function init() {
    el.policyYear.value = state.data.meta.year || '2026';
    el.profileGrade.value = state.profile.grade;
    el.materialTrack.value = state.materialTrack;
    bindEvents();
    renderPolicy();
    renderRole();
    renderProfileControls();
    renderOverview();
    renderTrack();
    renderMaterials();
    renderComparison();
    renderEditorControls();
    switchView('overview', null, false);
  }

  function bindEvents() {
    document.addEventListener('click', handleClick);

    el.policyYear.addEventListener('change', (event) => {
      state.data.meta.year = event.target.value;
      state.data.meta.status = event.target.value === '2026' ? 'pending' : 'framework';
      state.data.meta.statusText = event.target.value === '2026'
        ? '2026 院校简章与省级细则待逐项核对'
        : '历史机制复盘，不能替代 2026 正式文件';
      renderPolicy();
      renderTrack();
      showToast('已切换规则年份，年度细则状态同步更新。', 'warning');
    });

    el.profileGrade.addEventListener('change', (event) => {
      state.profile.grade = event.target.value;
      persistProfile();
      renderOverview();
      renderComparison();
    });

    el.materialTrack.addEventListener('change', (event) => {
      state.materialTrack = event.target.value;
      renderMaterials();
    });

    document.getElementById('exportChecklist').addEventListener('click', exportChecklist);
    document.getElementById('resetData').addEventListener('click', resetData);

    el.editorTrack.addEventListener('change', (event) => {
      state.editorTrackId = event.target.value;
      state.editorStageIndex = 0;
      renderEditorControls();
    });

    el.editorStage.addEventListener('change', (event) => {
      state.editorStageIndex = Number(event.target.value || 0);
      fillEditorForm();
    });

    el.editorForm.addEventListener('input', () => {
      el.editorSaveHint.textContent = '有未保存修改';
      el.editorSaveHint.classList.add('is-dirty');
    });
    el.editorForm.addEventListener('submit', saveEditor);
  }

  function handleClick(event) {
    const roleButton = event.target.closest('.role-button[data-role]');
    if (roleButton) {
      setRole(roleButton.dataset.role);
      return;
    }

    const navButton = event.target.closest('.nav-tab[data-view]');
    if (navButton) {
      switchView(navButton.dataset.view, navButton.dataset.track || null);
      return;
    }

    const profileButton = event.target.closest('[data-profile-key]');
    if (profileButton) {
      state.profile[profileButton.dataset.profileKey] = profileButton.dataset.value;
      persistProfile();
      renderProfileControls();
      renderOverview();
      renderComparison();
      return;
    }

    const materialInput = event.target.closest('[data-material-id]');
    if (materialInput) {
      if (materialInput.checked) state.materialDone.add(materialInput.dataset.materialId);
      else state.materialDone.delete(materialInput.dataset.materialId);
      persistMaterialDone();
      renderMaterials();
      return;
    }

    const action = event.target.closest('[data-action]');
    if (!action) return;
    switch (action.dataset.action) {
      case 'open-track':
        state.trackId = action.dataset.track;
        state.stageIndex = 0;
        switchView('track', state.trackId);
        break;
      case 'select-stage':
        state.stageIndex = Number(action.dataset.index || 0);
        renderTrack();
        break;
      case 'stage-done':
        toggleStageDone();
        break;
      case 'reset-profile':
        state.profile = clone(defaultProfile);
        persistProfile();
        el.profileGrade.value = state.profile.grade;
        renderProfileControls();
        renderOverview();
        renderComparison();
        showToast('学生画像已重置。');
        break;
      default:
        break;
    }
  }

  function setRole(role) {
    if (!roleCopy[role]) return;
    state.role = role;
    safeWrite(ROLE_KEY, role);
    if (role !== 'admin' && state.view === 'editor') state.view = 'overview';
    renderRole();
    renderOverview();
    renderTrack();
    switchView(state.view, null, false);
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

  function renderPolicy() {
    const meta = state.data.meta;
    el.policyRegion.textContent = meta.region || '江苏';
    el.policyStatus.className = `policy-status is-${meta.status || 'pending'}`;
    el.policyStatus.innerHTML = `<i aria-hidden="true"></i><div><strong>${escapeHtml(meta.statusText)}</strong><span>${escapeHtml(meta.sourceNote)}</span></div>`;
  }

  function switchView(view, trackId, scroll = true) {
    if (view === 'editor' && state.role !== 'admin') {
      showToast('规则编辑仅在管理员视角开放。', 'warning');
      view = 'overview';
    }
    if (trackId && getTrack(trackId)) {
      state.trackId = trackId;
      state.stageIndex = 0;
      renderTrack();
    }
    state.view = view;
    document.querySelectorAll('[data-view-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.viewPanel === view));
    document.querySelectorAll('.nav-tab[data-view]').forEach((button) => {
      const active = button.dataset.view === view && (!button.dataset.track || button.dataset.track === state.trackId);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    if (view === 'overview') renderOverview();
    if (view === 'track') renderTrack();
    if (view === 'materials') renderMaterials();
    if (view === 'compare') renderComparison();
    if (view === 'editor') renderEditorControls();
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
    el.app.focus({ preventScroll: true });
  }

  function renderProfileControls() {
    el.profileGrade.value = state.profile.grade;
    document.querySelectorAll('[data-profile-key]').forEach((button) => {
      const active = state.profile[button.dataset.profileKey] === button.dataset.value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderOverview() {
    el.pathwayOverview.innerHTML = state.data.tracks.map((track) => {
      const fit = calculateFit(track);
      const done = state.stageDone[track.id]?.size || 0;
      return `
        <article class="pathway-card accent-${escapeHtml(track.accent)}">
          <header><div><span>${escapeHtml(track.shortTitle)}</span><h2>${escapeHtml(track.title)}</h2></div><strong class="fit-score">${fit.score}</strong></header>
          <p>${escapeHtml(track.summary)}</p>
          <div class="fit-meter"><i style="width:${fit.score}%"></i></div>
          <div class="fit-result ${fit.level}"><strong>${escapeHtml(fit.label)}</strong><span>${escapeHtml(fit.description)}</span></div>
          <div class="fit-evidence">${fit.items.map((item) => `<span class="${item.pass ? 'is-pass' : 'is-missing'}">${item.pass ? '✓' : '!'} ${escapeHtml(item.label)}</span>`).join('')}</div>
          <div class="pathway-progress"><span>流程记录 ${done} / ${track.stages.length}</span><div><i style="width:${Math.round(done / track.stages.length * 100)}%"></i></div></div>
          ${state.role === 'public' ? '' : `<div class="internal-note"><strong>咨询提示</strong>${escapeHtml(track.consultantNote)}</div>`}
          <button class="button button-primary" type="button" data-action="open-track" data-track="${escapeHtml(track.id)}">进入${escapeHtml(track.shortTitle)}路径</button>
        </article>`;
    }).join('');
  }

  function calculateFit(track) {
    const items = (track.fitRules || []).map((rule) => {
      const value = state.profile[rule.key];
      return { label: rule.label, weight: rule.weight, pass: rule.passValues.includes(value) };
    });
    const score = items.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
    if (score >= 80) return { score, level: 'good', label: '可进入重点评估', description: '基础适配较好，下一步必须逐校核对当年报名条件和培养方案。', items };
    if (score >= 55) return { score, level: 'review', label: '需要补证与讨论', description: '存在可行基础，但仍有关键条件需要补充或与学生深入确认。', items };
    return { score, level: 'weak', label: '当前不建议直接推进', description: '当前画像与该路径的核心要求差距较大，先补充信息或保留普通批主方案。', items };
  }

  function renderTrack() {
    const track = getTrack(state.trackId);
    if (!track) {
      el.trackContent.innerHTML = '<div class="empty-state">暂无路径数据。</div>';
      return;
    }
    state.stageIndex = Math.min(Math.max(0, state.stageIndex), track.stages.length - 1);
    const stage = track.stages[state.stageIndex];
    const fit = calculateFit(track);
    const doneSet = state.stageDone[track.id] || new Set();
    el.trackContent.innerHTML = `
      <div class="track-heading accent-${escapeHtml(track.accent)}">
        <div><p class="eyebrow">${escapeHtml(track.shortTitle)} · 独立规则链</p><h1>${escapeHtml(track.title)}</h1><p>${escapeHtml(track.publicAnswer)}</p></div>
        <div class="track-fit"><span>学生适配提示</span><strong>${fit.score}</strong><small>${escapeHtml(fit.label)}</small></div>
      </div>
      <div class="track-layout">
        <aside class="timeline" aria-label="流程阶段">
          ${track.stages.map((item, index) => `
            <button type="button" class="timeline-step ${index === state.stageIndex ? 'is-active' : ''} ${doneSet.has(item.id) ? 'is-done' : ''}" data-action="select-stage" data-index="${index}">
              <span>${String(item.order).padStart(2, '0')}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.timing)}</small></div><i>${doneSet.has(item.id) ? '✓' : ''}</i>
            </button>`).join('')}
        </aside>
        <section class="stage-detail">
          <div class="stage-detail-head"><div><span>阶段 ${stage.order}</span><h2>${escapeHtml(stage.title)}</h2><p>${escapeHtml(stage.goal)}</p></div><button class="button ${doneSet.has(stage.id) ? 'button-selected' : 'button-secondary'}" type="button" data-action="stage-done">${doneSet.has(stage.id) ? '已完成记录' : '标记已完成'}</button></div>
          <dl class="stage-meta"><div><dt>负责人</dt><dd>${escapeHtml(stage.owner)}</dd></div><div><dt>时间口径</dt><dd>${escapeHtml(stage.timing)}</dd></div></dl>
          <div class="stage-columns"><article><h3>本阶段交付物</h3>${renderList(stage.outputs)}</article><article><h3>必须确认的问题</h3>${renderList(stage.questions)}</article></div>
          <div class="risk-banner"><strong>风险提示</strong><p>${escapeHtml(stage.warning)}</p></div>
          ${state.role === 'public' ? '' : `<div class="consultant-panel"><strong>内部讲解提示</strong><p>${escapeHtml(track.consultantNote)}</p></div>`}
        </section>
      </div>`;
  }

  function toggleStageDone() {
    const track = getTrack(state.trackId);
    const stage = track?.stages[state.stageIndex];
    if (!track || !stage) return;
    const doneSet = state.stageDone[track.id] || new Set();
    if (doneSet.has(stage.id)) doneSet.delete(stage.id);
    else doneSet.add(stage.id);
    state.stageDone[track.id] = doneSet;
    renderTrack();
    renderOverview();
    showToast(doneSet.has(stage.id) ? '阶段已记录为完成。' : '已取消完成标记。');
  }

  function renderMaterials() {
    const materials = state.data.materials.filter((item) => state.materialTrack === 'all' || item.tracks.includes(state.materialTrack));
    const done = materials.filter((item) => state.materialDone.has(item.id)).length;
    const required = materials.filter((item) => item.required).length;
    const requiredDone = materials.filter((item) => item.required && state.materialDone.has(item.id)).length;
    el.materialSummary.innerHTML = `
      <div><span>当前清单</span><strong>${materials.length}</strong><small>项材料</small></div>
      <div><span>已完成</span><strong>${done}</strong><small>项</small></div>
      <div><span>必需项进度</span><strong>${requiredDone}/${required}</strong><small>示例口径</small></div>
      <div class="material-meter"><span>整体进度 ${materials.length ? Math.round(done / materials.length * 100) : 0}%</span><div><i style="width:${materials.length ? Math.round(done / materials.length * 100) : 0}%"></i></div></div>`;
    el.materialList.innerHTML = materials.map((item) => `
      <label class="material-row ${state.materialDone.has(item.id) ? 'is-done' : ''}">
        <input type="checkbox" data-material-id="${escapeHtml(item.id)}" ${state.materialDone.has(item.id) ? 'checked' : ''}>
        <span class="material-category">${escapeHtml(item.category)}</span>
        <div><strong>${escapeHtml(item.title)}</strong><small>${item.tracks.map(trackName).join(' · ')}</small></div>
        <span>${escapeHtml(item.owner)}</span>
        <em>${item.required ? '关键项' : '按简章核对'}</em>
      </label>`).join('') || '<div class="empty-state">当前筛选没有材料。</div>';
  }

  function renderComparison() {
    const foundation = calculateFit(getTrack('foundation'));
    const comprehensive = calculateFit(getTrack('comprehensive'));
    el.comparisonTable.innerHTML = `
      <div class="comparison-head"><span>比较维度</span><strong>强基计划</strong><strong>综合评价</strong></div>
      ${state.data.comparison.map((row) => `<div class="comparison-row"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.foundation)}</span><span>${escapeHtml(row.comprehensive)}</span></div>`).join('')}
      <div class="comparison-row score-row"><strong>当前适配提示</strong><span>${foundation.score} · ${escapeHtml(foundation.label)}</span><span>${comprehensive.score} · ${escapeHtml(comprehensive.label)}</span></div>`;
    const best = foundation.score === comprehensive.score ? '两条路径都可继续核对' : foundation.score > comprehensive.score ? '当前画像更接近强基路径' : '当前画像更接近综合评价路径';
    el.portfolioAdvice.innerHTML = `<strong>${escapeHtml(best)}</strong><p>这是基于当前学生画像的内部试算，不是报名资格或录取概率。无论选择哪条路径，都必须保留完整普通批方案，并以当年官方文件逐校确认。</p>`;
  }

  function renderEditorControls() {
    if (!state.data.tracks.length) return;
    if (!getTrack(state.editorTrackId)) state.editorTrackId = state.data.tracks[0].id;
    el.editorTrack.innerHTML = state.data.tracks.map((track) => `<option value="${escapeHtml(track.id)}">${escapeHtml(track.shortTitle)}</option>`).join('');
    el.editorTrack.value = state.editorTrackId;
    const track = getTrack(state.editorTrackId);
    state.editorStageIndex = Math.min(Math.max(0, state.editorStageIndex), track.stages.length - 1);
    el.editorStage.innerHTML = track.stages.map((stage, index) => `<option value="${index}">${String(stage.order).padStart(2, '0')} ${escapeHtml(stage.title)}</option>`).join('');
    el.editorStage.value = String(state.editorStageIndex);
    fillEditorForm();
  }

  function fillEditorForm() {
    const track = getTrack(state.editorTrackId);
    const stage = track?.stages[state.editorStageIndex];
    if (!stage) return;
    ['title', 'owner', 'timing', 'goal', 'warning'].forEach((name) => {
      if (el.editorForm.elements[name]) el.editorForm.elements[name].value = stage[name] || '';
    });
    el.editorSource.innerHTML = `<strong>当前路径</strong><span>${escapeHtml(track.title)}</span><strong>阶段 ID</strong><span>${escapeHtml(stage.id)}</span><p>年度细则必须另行保留来源链接、文件日期和复核状态。</p>`;
    el.editorSaveHint.textContent = '当前内容已载入';
    el.editorSaveHint.classList.remove('is-dirty');
  }

  function saveEditor(event) {
    event.preventDefault();
    const track = getTrack(state.editorTrackId);
    const stage = track?.stages[state.editorStageIndex];
    if (!stage) return;
    const form = new FormData(el.editorForm);
    ['title', 'owner', 'timing', 'goal', 'warning'].forEach((name) => { stage[name] = String(form.get(name) || '').trim(); });
    safeWrite(STORAGE_KEY, JSON.stringify(state.data));
    el.editorSaveHint.textContent = `已保存 ${new Date().toLocaleTimeString('zh-CN')}`;
    el.editorSaveHint.classList.remove('is-dirty');
    renderTrack();
    showToast('流程内容已保存到当前浏览器。');
  }

  function resetData() {
    if (!window.confirm('确定恢复全部示例规则吗？当前浏览器中的编辑会被覆盖。')) return;
    state.data = clone(BASE_DATA);
    safeRemove(STORAGE_KEY);
    renderPolicy();
    renderOverview();
    renderTrack();
    renderMaterials();
    renderComparison();
    renderEditorControls();
    showToast('已恢复示例规则。');
  }

  function exportChecklist() {
    const materials = state.data.materials.filter((item) => state.materialTrack === 'all' || item.tracks.includes(state.materialTrack));
    const lines = [
      `强基综评材料清单｜${state.data.meta.region}｜${state.data.meta.year}`,
      `范围：${state.materialTrack === 'all' ? '全部路径' : trackName(state.materialTrack)}`,
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      '',
      ...materials.map((item, index) => `${index + 1}. [${state.materialDone.has(item.id) ? '已完成' : '待处理'}] ${item.title}｜${item.category}｜负责人：${item.owner}｜${item.required ? '关键项' : '按简章核对'}`),
      '',
      '提醒：本清单为工作底稿，院校年度材料字段和提交要求必须逐校核对。'
    ];
    downloadText(lines.join('\n'), `强基综评材料清单_${state.data.meta.year}_${timestamp()}.txt`);
    showToast('材料清单已导出。');
  }

  function getTrack(id) {
    return state.data.tracks.find((track) => track.id === id);
  }

  function trackName(id) {
    return getTrack(id)?.shortTitle || id;
  }

  function renderList(items) {
    return `<ul>${(items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function loadData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return parsed && Array.isArray(parsed.tracks) ? parsed : clone(BASE_DATA);
    } catch (_error) {
      return clone(BASE_DATA);
    }
  }

  function loadProfile() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY));
      return parsed && typeof parsed === 'object' ? { ...defaultProfile, ...parsed } : clone(defaultProfile);
    } catch (_error) {
      return clone(defaultProfile);
    }
  }

  function loadMaterialDone() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MATERIAL_KEY));
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (_error) {
      return new Set();
    }
  }

  function persistProfile() {
    safeWrite(PROFILE_KEY, JSON.stringify(state.profile));
  }

  function persistMaterialDone() {
    safeWrite(MATERIAL_KEY, JSON.stringify([...state.materialDone]));
  }

  function safeRead(key) {
    try { return localStorage.getItem(key); } catch (_error) { return null; }
  }

  function safeWrite(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_error) { return false; }
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (_error) { /* Preview storage is optional. */ }
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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
}());
