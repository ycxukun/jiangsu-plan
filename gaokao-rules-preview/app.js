(function () {
  'use strict';

  const STORAGE_KEY = 'gaokao-rules-preview-data-v2';
  const ROLE_KEY = 'gaokao-rules-preview-role-v1';
  const BASE_DATA = clone(window.GAOKAO_RULES_DATA || { meta: {}, scenes: [] });

  const roleCopy = {
    consultant: { label: '咨询师', scope: '显示公开解释、风险提示和内部咨询话术。' },
    public: { label: '家长/学生', scope: '仅显示公开规则、案例和风险提示。' },
    admin: { label: '管理员', scope: '显示全部内容，并可在本地编辑规则与版本状态。' }
  };

  const state = {
    data: loadData(),
    role: safeRead(ROLE_KEY) || 'consultant',
    sceneId: 'parallel',
    visited: new Set(),
    editorSceneId: 'parallel',
    parallel: { candidateIndex: 0, step: 0, assignments: {} },
    groupId: 'nju-06',
    processStep: 0,
    caseInputs: { strategy: 'balanced', obey: true, qualified: true },
    adjustment: { accepted: new Set(['m1', 'm2', 'm3']), obey: true },
    editorOpen: false
  };

  if (!roleCopy[state.role]) state.role = 'consultant';
  if (!getScene(state.sceneId)) state.sceneId = state.data.scenes[0] ? state.data.scenes[0].id : '';

  const el = {
    mainTabs: document.getElementById('mainTabs'),
    sceneIndex: document.getElementById('sceneIndex'),
    sceneContent: document.getElementById('sceneContent'),
    visitedCount: document.getElementById('visitedCount'),
    currentRoleLabel: document.getElementById('currentRoleLabel'),
    roleScopeText: document.getElementById('roleScopeText'),
    policyYear: document.getElementById('policyYear'),
    policyRegion: document.getElementById('policyRegion'),
    policyBatch: document.getElementById('policyBatch'),
    policyStatus: document.getElementById('policyStatus'),
    app: document.getElementById('app'),
    editorView: document.getElementById('editorView'),
    editorSceneSelect: document.getElementById('editorSceneSelect'),
    editorSource: document.getElementById('editorSource'),
    editorForm: document.getElementById('editorForm'),
    editorSaveHint: document.getElementById('editorSaveHint'),
    toastRegion: document.getElementById('toastRegion')
  };

  init();

  function init() {
    el.policyYear.value = state.data.meta.year || '2026';
    bindEvents();
    renderPolicy();
    renderRole();
    visitScene(state.sceneId);
    renderNavigation();
    renderScene();
    renderEditorControls();
  }

  function bindEvents() {
    document.addEventListener('click', handleClick);

    el.policyYear.addEventListener('change', (event) => {
      state.data.meta.year = event.target.value;
      safeWrite(STORAGE_KEY, JSON.stringify(state.data));
      renderPolicy();
      renderNavigation();
      renderScene();
    });

    el.editorSceneSelect.addEventListener('change', (event) => {
      state.editorSceneId = event.target.value;
      fillEditorForm();
    });

    el.editorForm.addEventListener('input', () => {
      el.editorSaveHint.textContent = '有未保存修改';
      el.editorSaveHint.classList.add('is-dirty');
    });
    el.editorForm.addEventListener('submit', saveEditor);

    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('importData').addEventListener('change', importData);
    document.getElementById('resetData').addEventListener('click', resetData);
    document.getElementById('closeEditor').addEventListener('click', closeEditor);
    document.getElementById('exportBrief').addEventListener('click', exportBrief);
  }

  function handleClick(event) {
    const roleButton = event.target.closest('.role-button[data-role]');
    if (roleButton) {
      setRole(roleButton.dataset.role);
      return;
    }

    const sceneButton = event.target.closest('[data-scene-id]');
    if (sceneButton) {
      switchScene(sceneButton.dataset.sceneId);
      return;
    }

    if (event.target.closest('[data-open-editor]')) {
      openEditor();
      return;
    }

    const action = event.target.closest('[data-action]');
    if (!action) return;

    switch (action.dataset.action) {
      case 'parallel-reset':
        state.parallel = { candidateIndex: 0, step: 0, assignments: {} };
        renderSceneBody();
        break;
      case 'parallel-next':
        advanceParallel();
        break;
      case 'parallel-next-candidate':
        state.parallel.candidateIndex = Math.min(state.parallel.candidateIndex + 1, getScene('parallel').simulator.candidates.length - 1);
        state.parallel.step = 0;
        renderSceneBody();
        break;
      case 'group-select':
        state.groupId = action.dataset.id;
        renderSceneBody();
        break;
      case 'process-step':
        state.processStep = Number(action.dataset.index || 0);
        renderSceneBody();
        break;
      case 'process-next':
        state.processStep = (state.processStep + 1) % getScene('process').steps.length;
        renderSceneBody();
        break;
      case 'adjustment-toggle':
        toggleAccepted(action.dataset.id, action.checked);
        break;
      case 'mark-explained':
        visitScene(state.sceneId, true);
        break;
      default:
        break;
    }
  }

  function setRole(role) {
    if (!roleCopy[role]) return;
    state.role = role;
    safeWrite(ROLE_KEY, role);
    if (role !== 'admin' && state.editorOpen) closeEditor();
    renderRole();
    renderNavigation();
    renderScene();
  }

  function renderRole() {
    document.body.dataset.role = state.role;
    document.querySelectorAll('[data-role]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.role === state.role);
    });
    document.querySelectorAll('.role-admin-only').forEach((item) => {
      item.hidden = state.role !== 'admin';
    });
    el.currentRoleLabel.textContent = roleCopy[state.role].label;
    el.roleScopeText.textContent = roleCopy[state.role].scope;
  }

  function renderPolicy() {
    const meta = state.data.meta;
    const version = getPolicyVersion(meta.year);
    el.policyRegion.textContent = meta.region || '江苏';
    el.policyBatch.textContent = meta.batch || '普通类';
    const statusClass = version.status === 'verified' ? 'is-verified' : version.status === 'archived' ? 'is-archived' : 'is-pending';
    el.policyStatus.className = `policy-status ${statusClass}`;
    el.policyStatus.innerHTML = `
      <span class="status-dot" aria-hidden="true"></span>
      <div>
        <strong>${escapeHtml(version.statusText || '规则状态待确认')}</strong>
        <small>${escapeHtml(version.sourceNote || '')}${version.verifiedAt ? ` · 核对日期 ${escapeHtml(version.verifiedAt)}` : ''}</small>
      </div>`;
  }

  function renderNavigation() {
    const sceneButtons = state.data.scenes.map((scene) => `
      <button class="main-tab ${scene.id === state.sceneId && !state.editorOpen ? 'is-active' : ''}" type="button" data-scene-id="${scene.id}">${escapeHtml(scene.shortTitle)}</button>`).join('');
    const editorButton = state.role === 'admin'
      ? `<button class="main-tab admin-tab ${state.editorOpen ? 'is-active' : ''}" type="button" data-open-editor>规则编辑</button>`
      : '';
    el.mainTabs.innerHTML = sceneButtons + editorButton;

    el.sceneIndex.innerHTML = state.data.scenes.map((scene) => `
      <button class="scene-index-button ${scene.id === state.sceneId ? 'is-active' : ''} ${state.visited.has(scene.id) ? 'is-visited' : ''}" type="button" data-scene-id="${scene.id}">
        <span class="scene-number">${String(scene.order).padStart(2, '0')}</span>
        <span class="scene-index-copy"><strong>${escapeHtml(scene.shortTitle)}</strong><small>${escapeHtml(getSceneStatus(scene).text)}</small></span>
        <span class="scene-check" aria-label="已讲解">✓</span>
      </button>`).join('');
    el.visitedCount.textContent = String(state.visited.size);
  }

  function switchScene(id) {
    if (!getScene(id)) return;
    state.sceneId = id;
    state.editorOpen = false;
    el.app.hidden = false;
    el.editorView.hidden = true;
    visitScene(id);
    renderNavigation();
    renderScene();
    scrollToSection(document.getElementById('sceneWorkspace'));
  }

  function visitScene(id, notify) {
    state.visited.add(id);
    renderNavigation();
    if (notify) showToast('已加入本次讲解记录。');
  }

  function renderScene() {
    const scene = getScene(state.sceneId);
    if (!scene) {
      el.sceneContent.innerHTML = '<div class="empty-state">暂无规则场景。</div>';
      return;
    }
    const sceneStatus = getSceneStatus(scene);
    const version = getPolicyVersion(state.data.meta.year);
    const keyPoints = (scene.keyPoints || []).slice(0, 3);
    el.sceneContent.innerHTML = `
      <header class="scene-heading">
        <div>
          <p class="eyebrow">场景 ${String(scene.order).padStart(2, '0')} · ${escapeHtml(scene.shortTitle)}</p>
          <h1>${escapeHtml(scene.title)}</h1>
          <p class="scene-summary">${escapeHtml(scene.summary)}</p>
        </div>
        <div class="scene-meta">
          <span class="status-badge ${sceneStatus.status}">${escapeHtml(sceneStatus.text)}</span>
          <span class="scene-counter">${escapeHtml(state.data.meta.region)} · ${escapeHtml(version.label || `${state.data.meta.year}版`)}</span>
          ${scene.lastVerifiedAt ? `<span class="scene-counter">最近核对 ${escapeHtml(scene.lastVerifiedAt)}</span>` : ''}
          <button class="button button-secondary" type="button" data-action="mark-explained">标记已讲解</button>
        </div>
      </header>
      <div class="key-strip">
        ${keyPoints.map((point, index) => `<div class="key-item"><span>原则 ${index + 1}</span><strong>${escapeHtml(point)}</strong></div>`).join('')}
      </div>
      <div class="risk-banner"><strong>风险提示</strong><p>${escapeHtml(scene.risk)}</p></div>
      <div class="workspace-grid">
        <section class="interactive-panel">
          <div class="panel-heading"><strong>现场演示</strong><span>点击控件，按讲解节奏逐步推进</span></div>
          <div class="panel-body" id="sceneBody"></div>
        </section>
        <aside class="side-stack">
          <section class="question-panel">
            <h3>家长常问</h3>
            <div class="question">${escapeHtml(scene.parentQuestion)}</div>
            <p>${escapeHtml(scene.publicAnswer)}</p>
          </section>
          ${state.role === 'public' ? '' : `<section class="consultant-panel"><h3>内部讲解提示</h3><p>${escapeHtml(scene.consultantNote)}</p></section>`}
          <section class="source-panel">
            <h3>口径来源</h3>
            <ul>${renderSourceRefs(scene)}</ul>
          </section>
        </aside>
      </div>`;
    renderSceneBody();
  }

  function renderSceneBody() {
    const body = document.getElementById('sceneBody');
    if (!body) return;
    switch (state.sceneId) {
      case 'parallel': renderParallel(body); break;
      case 'group': renderGroup(body); break;
      case 'process': renderProcess(body); break;
      case 'case': renderCase(body); break;
      case 'adjustment': renderAdjustment(body); break;
      default: body.innerHTML = '';
    }
  }

  function renderParallel(body) {
    const scene = getScene('parallel');
    const candidates = scene.simulator.candidates;
    const groups = scene.simulator.groups;
    const current = candidates[state.parallel.candidateIndex] || candidates[0];
    const step = Math.min(state.parallel.step, current.volunteers.length);
    const assignment = state.parallel.assignments[current.id];
    const isFinished = Object.prototype.hasOwnProperty.call(state.parallel.assignments, current.id);
    const volunteerNodes = current.volunteers.map((groupId, index) => {
      const group = groups.find((item) => item.id === groupId);
      const assignedCount = Object.values(state.parallel.assignments).filter((value) => value === groupId).length;
      const remaining = Math.max(0, group.plan - assignedCount);
      let className = '';
      let status = `${remaining} 个计划可投`;
      if (index < step && assignment !== groupId) { className = 'is-skipped'; status = '无可投计划，继续检索'; }
      if (index === step && !isFinished) className = 'is-checking';
      if (assignment === groupId) { className = 'is-hit'; status = '命中，结束检索'; }
      if (assignment && assignment !== 'none' && index > current.volunteers.indexOf(assignment)) { className = 'is-skipped'; status = '命中后不再检索'; }
      if (assignment === 'none') { className = 'is-skipped'; status = '本轮未命中'; }
      return `<div class="path-node ${className}"><span class="path-order">${index + 1}</span><strong>${escapeHtml(group.code)}</strong><span>${escapeHtml(group.requirement)} · 计划 ${group.plan}</span><small>${escapeHtml(status)}</small></div>`;
    }).join('');

    const explanation = assignment && assignment !== 'none'
      ? `${current.name}在第 ${current.volunteers.indexOf(assignment) + 1} 个志愿命中 ${groups.find((g) => g.id === assignment).code}，本轮不再检索后续志愿。`
      : assignment === 'none'
        ? `${current.name}的所有志愿均未命中，本轮没有投出；仍视为已享受本批次平行志愿投档机会。`
        : `正在检索${current.name}的第 ${step + 1} 个志愿。系统不会同时向多个组投档。`;

    const canMoveNext = isFinished && state.parallel.candidateIndex < candidates.length - 1;

    body.innerHTML = `
      <div class="sim-controls">
        ${isFinished
          ? `<button class="button button-primary" type="button" data-action="parallel-next-candidate" ${canMoveNext ? '' : 'disabled'}>按位次处理下一位考生</button>`
          : '<button class="button button-primary" type="button" data-action="parallel-next">检索当前志愿</button>'}
        <button class="button button-secondary" type="button" data-action="parallel-reset">重新演示</button>
        <span class="sim-status">当前第 ${state.parallel.candidateIndex + 1} 位：${escapeHtml(current.name)} · ${current.score} 分 · 位次 ${current.rank}</span>
      </div>
      <div class="parallel-board">
        <div class="candidate-queue">
          ${candidates.map((candidate, index) => {
            const result = state.parallel.assignments[candidate.id];
            const done = Object.prototype.hasOwnProperty.call(state.parallel.assignments, candidate.id);
            const resultText = !done
              ? (index === state.parallel.candidateIndex ? '正在按位次处理' : index < state.parallel.candidateIndex ? '已处理' : '等待按位次处理')
              : result === 'none' ? '未投出' : `已投 ${groups.find((group) => group.id === result).code}`;
            return `<div class="candidate-card ${index === state.parallel.candidateIndex ? 'is-current' : ''} ${done ? 'is-done' : ''}"><strong>${index + 1}. ${escapeHtml(candidate.name)}</strong><span>${candidate.score} 分 · 位次 ${candidate.rank}</span><small>${escapeHtml(resultText)}</small></div>`;
          }).join('')}
        </div>
        <div class="capacity-board">${groups.map((group) => {
          const used = Object.values(state.parallel.assignments).filter((value) => value === group.id).length;
          return `<div><span>${escapeHtml(group.code)}</span><strong>剩余 ${Math.max(0, group.plan - used)} / ${group.plan}</strong></div>`;
        }).join('')}</div>
        <div class="volunteer-path">${volunteerNodes}</div>
        <div class="sim-explanation"><strong>当前判定</strong><span>${escapeHtml(explanation)}</span><small>正式规则：档案投出后若被退档，不会再补投本批次后续院校专业组。</small></div>
      </div>`;
  }

  function advanceParallel() {
    const scene = getScene('parallel');
    const current = scene.simulator.candidates[state.parallel.candidateIndex];
    if (!current || Object.prototype.hasOwnProperty.call(state.parallel.assignments, current.id)) return;
    const groupId = current.volunteers[state.parallel.step];
    if (!groupId) {
      state.parallel.assignments[current.id] = 'none';
      renderSceneBody();
      return;
    }
    const group = scene.simulator.groups.find((item) => item.id === groupId);
    const assignedCount = Object.values(state.parallel.assignments).filter((value) => value === groupId).length;
    if (assignedCount < group.plan) {
      state.parallel.assignments[current.id] = groupId;
    } else {
      state.parallel.step += 1;
      if (state.parallel.step >= current.volunteers.length) state.parallel.assignments[current.id] = 'none';
    }
    renderSceneBody();
  }

  function renderGroup(body) {
    const scene = getScene('group');
    const selected = scene.groups.find((group) => group.id === state.groupId) || scene.groups[0];
    body.innerHTML = `
      <div class="rule-fact-strip">${(scene.ruleFacts || []).map((fact) => `<div><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></div>`).join('')}</div>
      <div class="group-board">
        ${scene.groups.map((group) => `<button class="group-card ${group.id === selected.id ? 'is-active' : ''}" type="button" data-action="group-select" data-id="${group.id}">
          <div class="group-card-head"><strong>${escapeHtml(group.school)}</strong><span class="group-code">${escapeHtml(group.code)}</span></div>
          <h4>${escapeHtml(group.label)}</h4>
          <p>选科：${escapeHtml(group.requirement)} · 计划示例 ${group.plan}</p>
          <div class="major-list">${group.majors.map((major) => `<span>${escapeHtml(major)}</span>`).join('')}</div>
        </button>`).join('')}
      </div>
      <div class="group-result"><strong>当前选择：${escapeHtml(selected.school)} ${escapeHtml(selected.code)}</strong><br>这是一个独立志愿单位。调剂讨论只能先看该组内的 ${selected.majors.length} 个专业，不能把同校其他专业组自动算进来。</div>`;
  }

  function renderProcess(body) {
    const scene = getScene('process');
    body.innerHTML = `
      <div class="sim-controls"><button class="button button-primary" type="button" data-action="process-next">推进下一步</button><span class="sim-status">点击任一步骤可直接查看职责</span></div>
      <div class="rule-fact-strip">${(scene.ruleFacts || []).map((fact) => `<div><span>${escapeHtml(fact.label)}</span><strong>${escapeHtml(fact.value)}</strong></div>`).join('')}</div>
      <div class="process-flow">
        ${scene.steps.map((step, index) => `<button class="process-step ${index === state.processStep ? 'is-active' : ''}" type="button" data-action="process-step" data-index="${index}">
          <span class="process-step-index">${index + 1}</span><span class="process-owner">${escapeHtml(step.owner)}</span><h4>${escapeHtml(step.title)}</h4><p>${escapeHtml(step.detail)}</p><div class="process-result">结果：${escapeHtml(step.result)}</div>
        </button>`).join('')}
      </div>`;
  }

  function renderCase(body) {
    const scene = getScene('case');
    const match = scene.cases.find((item) => item.strategy === state.caseInputs.strategy && item.obey === state.caseInputs.obey && item.qualified === state.caseInputs.qualified)
      || (state.caseInputs.strategy === 'aggressive' ? scene.cases.find((item) => item.id === 'slide') : !state.caseInputs.qualified ? scene.cases.find((item) => item.id === 'qualification') : !state.caseInputs.obey ? scene.cases.find((item) => item.id === 'withdraw') : scene.cases[0]);
    body.innerHTML = `
      <div class="case-controls">
        <label>志愿梯度<select id="caseStrategy"><option value="balanced" ${state.caseInputs.strategy === 'balanced' ? 'selected' : ''}>有冲稳保梯度</option><option value="aggressive" ${state.caseInputs.strategy === 'aggressive' ? 'selected' : ''}>全部定位偏高</option></select></label>
        <label class="toggle-row"><input id="caseObey" type="checkbox" ${state.caseInputs.obey ? 'checked' : ''}>服从专业调剂</label>
        <label class="toggle-row"><input id="caseQualified" type="checkbox" ${state.caseInputs.qualified ? 'checked' : ''}>体检/单科/资格符合</label>
      </div>
      <div class="case-outcome ${match.type}"><span class="outcome-type">模拟结果</span><h3>${escapeHtml(match.outcome)}</h3><p>${escapeHtml(match.detail)}</p></div>
      <div class="case-definition"><div class="definition-item"><strong>滑档</strong><br>档案没有投进任何院校专业组，重点检查志愿梯度和可投范围。</div><div class="definition-item"><strong>退档</strong><br>档案已经投到学校后被退回，重点检查调剂、体检、单科和招生章程。</div></div>`;
    document.getElementById('caseStrategy').addEventListener('change', (event) => { state.caseInputs.strategy = event.target.value; renderSceneBody(); });
    document.getElementById('caseObey').addEventListener('change', (event) => { state.caseInputs.obey = event.target.checked; renderSceneBody(); });
    document.getElementById('caseQualified').addEventListener('change', (event) => { state.caseInputs.qualified = event.target.checked; renderSceneBody(); });
  }

  function renderAdjustment(body) {
    const scene = getScene('adjustment');
    const acceptedAvailable = scene.majors.filter((major) => major.status === 'available' && state.adjustment.accepted.has(major.id));
    const rejectedAvailable = scene.majors.filter((major) => major.status === 'available' && !state.adjustment.accepted.has(major.id));
    let resultClass = '';
    let resultText = '';
    if (!state.adjustment.obey) {
      resultClass = 'is-danger';
      resultText = '不服从调剂：当主动填报的专业都满额时，可能出现退档风险。';
    } else if (acceptedAvailable.length) {
      resultText = `服从调剂：当前仍有 ${acceptedAvailable.length} 个你标记为可接受的有余量专业，示例中录取空间更大。`;
    } else {
      resultClass = 'is-danger';
      resultText = `服从调剂，但剩余有空间的专业均被标记为不可接受：应重新评估该专业组，而不是只看热门专业。`;
    }
    body.innerHTML = `
      <div class="adjustment-board">
        <div class="adjustment-majors">
          ${scene.majors.map((major) => `<label class="adjustment-major"><input type="checkbox" data-action="adjustment-toggle" data-id="${major.id}" ${state.adjustment.accepted.has(major.id) ? 'checked' : ''}><strong>${escapeHtml(major.name)}</strong><span class="major-capacity ${major.status === 'full' ? 'full' : ''}">${escapeHtml(major.statusText)}</span></label>`).join('')}
        </div>
        <div class="adjustment-summary">
          <h3>该组最差可接受边界</h3>
          <label><input id="adjustmentObey" type="checkbox" ${state.adjustment.obey ? 'checked' : ''}>服从组内专业调剂</label>
          <div class="adjustment-result ${resultClass}">${escapeHtml(resultText)}</div>
          <p>当前不可接受但仍有空间：${rejectedAvailable.length ? rejectedAvailable.map((major) => major.name).join('、') : '无'}</p>
        </div>
      </div>`;
    document.getElementById('adjustmentObey').addEventListener('change', (event) => { state.adjustment.obey = event.target.checked; renderSceneBody(); });
  }

  function toggleAccepted(id, checked) {
    if (checked) state.adjustment.accepted.add(id);
    else state.adjustment.accepted.delete(id);
    renderSceneBody();
  }

  function openEditor() {
    if (state.role !== 'admin') return;
    state.editorOpen = true;
    el.app.hidden = true;
    el.editorView.hidden = false;
    renderNavigation();
    renderEditorControls();
    scrollToSection(el.editorView);
  }

  function closeEditor() {
    state.editorOpen = false;
    el.editorView.hidden = true;
    el.app.hidden = false;
    renderNavigation();
    renderScene();
    scrollToSection(document.getElementById('sceneWorkspace'));
  }

  function renderEditorControls() {
    if (!state.data.scenes.length) return;
    if (!getScene(state.editorSceneId)) state.editorSceneId = state.data.scenes[0].id;
    el.editorSceneSelect.innerHTML = state.data.scenes.map((scene) => `<option value="${scene.id}" ${scene.id === state.editorSceneId ? 'selected' : ''}>${String(scene.order).padStart(2, '0')} ${escapeHtml(scene.title)}</option>`).join('');
    fillEditorForm();
  }

  function fillEditorForm() {
    const scene = getScene(state.editorSceneId);
    if (!scene) return;
    ['title', 'status', 'summary', 'risk', 'parentQuestion', 'publicAnswer', 'consultantNote'].forEach((name) => {
      if (el.editorForm.elements[name]) el.editorForm.elements[name].value = scene[name] || '';
    });
    el.editorSource.innerHTML = `<strong>来源字段</strong><br>${(scene.sourceRefs || []).map((ref) => escapeHtml(sourceRefText(ref))).join('<br>')}<br><br><strong>场景 ID</strong><br>${escapeHtml(scene.id)}`;
    el.editorSaveHint.textContent = '当前内容已载入';
    el.editorSaveHint.classList.remove('is-dirty');
  }

  function saveEditor(event) {
    event.preventDefault();
    const scene = getScene(state.editorSceneId);
    if (!scene) return;
    const formData = new FormData(el.editorForm);
    ['title', 'status', 'summary', 'risk', 'parentQuestion', 'publicAnswer', 'consultantNote'].forEach((name) => {
      scene[name] = String(formData.get(name) || '').trim();
    });
    scene.statusText = statusText(scene.status);
    safeWrite(STORAGE_KEY, JSON.stringify(state.data));
    el.editorSaveHint.textContent = '已保存到当前浏览器';
    el.editorSaveHint.classList.remove('is-dirty');
    renderPolicy();
    renderNavigation();
    showToast('规则修改已保存。');
  }

  function exportData() {
    downloadJson(state.data, `高考规则讲解系统_${state.data.meta.year}_${timestamp()}.json`);
    showToast('规则数据已导出。');
  }

  function importData(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!parsed || !Array.isArray(parsed.scenes) || !parsed.meta) throw new Error('格式不正确');
        state.data = parsed;
        safeWrite(STORAGE_KEY, JSON.stringify(state.data));
        state.sceneId = state.data.scenes[0] ? state.data.scenes[0].id : '';
        state.editorSceneId = state.sceneId;
        renderPolicy();
        renderNavigation();
        renderEditorControls();
        showToast('规则数据已导入。');
      } catch (error) {
        showToast(`导入失败：${error.message}`, 'error');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function resetData() {
    if (!window.confirm('确定恢复示例规则数据？当前浏览器中的修改将被覆盖。')) return;
    state.data = clone(BASE_DATA);
    localStorage.removeItem(STORAGE_KEY);
    state.sceneId = state.data.scenes[0] ? state.data.scenes[0].id : '';
    state.editorSceneId = state.sceneId;
    renderPolicy();
    renderNavigation();
    renderEditorControls();
    showToast('已恢复示例规则数据。');
  }

  function exportBrief() {
    const visitedScenes = state.data.scenes.filter((scene) => state.visited.has(scene.id));
    const version = getPolicyVersion(state.data.meta.year);
    const content = [
      `高考规则讲解摘要｜${state.data.meta.region} ${state.data.meta.year}`,
      `版本状态：${version.statusText}`,
      `核对日期：${version.verifiedAt || '待核对'}`,
      `文件编号：${(version.documentNumbers || []).join('、') || '待补'}`,
      '',
      ...visitedScenes.flatMap((scene, index) => [
        `${index + 1}. ${scene.title}`,
        `核心解释：${scene.summary}`,
        `风险提示：${scene.risk}`,
        ''
      ]),
      `说明：${version.sourceNote}`
    ].join('\n');
    downloadText(content, `高考规则讲解摘要_${state.data.meta.year}_${timestamp()}.txt`);
    showToast(`已导出 ${visitedScenes.length} 个场景的讲解摘要。`);
  }

  function getScene(id) {
    return state.data.scenes.find((scene) => scene.id === id);
  }

  function getPolicyVersion(year) {
    const meta = state.data.meta || {};
    const versions = meta.versions || {};
    return versions[year] || {
      label: `${year || meta.year || '当前'} 工作版`,
      status: meta.status || 'pending',
      statusText: meta.statusText || '规则状态待确认',
      sourceNote: meta.sourceNote || '',
      verifiedAt: meta.verifiedAt || '',
      documentNumbers: []
    };
  }

  function getSceneStatus(scene) {
    if (String(state.data.meta.year) !== '2026') {
      return { status: 'archived', text: '历史规则复盘，不替代2026文件' };
    }
    return { status: scene.status || 'pending', text: scene.statusText || statusText(scene.status) };
  }

  function renderSourceRefs(scene) {
    const year = String(state.data.meta.year || '2026');
    const officialSources = state.data.meta.officialSources || [];
    const refs = (scene.sourceRefs || []).map((ref) => {
      if (typeof ref === 'string') return { title: ref };
      if (!ref || !ref.sourceId) return ref;
      const source = officialSources.find((item) => item.id === ref.sourceId);
      if (!source || String(source.year) !== year) return null;
      return Object.assign({}, source, ref, { title: source.title });
    }).filter(Boolean);

    if (!refs.some((ref) => ref.url)) {
      const fallback = officialSources.find((source) => String(source.year) === year);
      if (fallback) refs.unshift(Object.assign({}, fallback, { note: `${year}年度总口径来源` }));
    }

    return refs.map((ref) => {
      const title = escapeHtml(ref.title || '来源待补');
      const titleNode = ref.url
        ? `<a class="source-link" href="${escapeAttribute(ref.url)}" target="_blank" rel="noopener noreferrer">${title}</a>`
        : `<strong>${title}</strong>`;
      const meta = [ref.documentNo, ref.publishedAt, ref.section].filter(Boolean).map(escapeHtml).join(' · ');
      return `<li>${titleNode}${meta ? `<small>${meta}</small>` : ''}${ref.note ? `<span>${escapeHtml(ref.note)}</span>` : ''}</li>`;
    }).join('');
  }

  function sourceRefText(ref) {
    if (typeof ref === 'string') return ref;
    if (!ref) return '';
    const source = ref.sourceId
      ? (state.data.meta.officialSources || []).find((item) => item.id === ref.sourceId)
      : null;
    return [source && source.title, ref.title, ref.documentNo || (source && source.documentNo), ref.section, ref.note].filter(Boolean).join('｜');
  }

  function scrollToSection(section) {
    if (window.matchMedia('(max-width: 860px)').matches && section) {
      section.scrollIntoView({ block: 'start', behavior: 'auto' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function statusText(status) {
    if (status === 'verified') return '已按正式文件核对';
    if (status === 'archived') return '历史规则复盘';
    if (status === 'framework') return '机制框架可讲解';
    return '年度细则待核对';
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return clone(BASE_DATA);
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.scenes) || !parsed.meta) return clone(BASE_DATA);
      return parsed;
    } catch (_error) {
      return clone(BASE_DATA);
    }
  }

  function safeRead(key) {
    try { return localStorage.getItem(key); } catch (_error) { return null; }
  }

  function safeWrite(key, value) {
    try { localStorage.setItem(key, value); } catch (_error) { return false; }
    return true;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  function showToast(message, tone) {
    const item = document.createElement('div');
    item.className = `toast ${tone || ''}`.trim();
    item.textContent = message;
    el.toastRegion.appendChild(item);
    window.setTimeout(() => item.remove(), 3200);
  }

  function downloadJson(value, filename) {
    downloadBlob(JSON.stringify(value, null, 2), filename, 'application/json;charset=utf-8');
  }

  function downloadText(value, filename) {
    downloadBlob(value, filename, 'text/plain;charset=utf-8');
  }

  function downloadBlob(value, filename, type) {
    const url = URL.createObjectURL(new Blob([value], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function timestamp() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0'), String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0'), String(now.getSeconds()).padStart(2, '0')].join('');
  }
})();
