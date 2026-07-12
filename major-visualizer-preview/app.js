(function () {
  'use strict';

  const STORAGE_KEY = 'major-visualizer-preview-data-v3';
  const ROLE_KEY = 'major-visualizer-preview-role-v1';
  const PAGE_SIZE = 48;
  const MAP_MAJOR_BATCH_SIZE = 24;
  const MAP_ZOOM_MIN = 0.65;
  const MAP_ZOOM_MAX = 2.4;
  const CATALOG_META = window.MAJOR_CATALOG_2026_META || {};
  const OFFICIAL_CATALOG = Array.isArray(window.MAJOR_CATALOG_2026) ? window.MAJOR_CATALOG_2026 : [];
  const EXPECTED_CATALOG = Object.freeze({ disciplines: 13, categories: 92, majors: 883, directMajors: 15 });
  const IDENTITY_FIELDS = Object.freeze([
    'id', 'code', 'name', 'disciplineCode', 'discipline', 'categoryCode', 'category',
    'officialNote', 'officialYear', 'flagLabels'
  ]);
  const IMPORT_STRING_FIELDS = Object.freeze([
    'id', 'code', 'name', 'disciplineCode', 'discipline', 'categoryCode', 'category',
    'officialNote', 'academic', 'accent', 'careerFamily', 'contentLevel', 'contentStatus',
    'courseFamily', 'degree', 'difficultyStatus', 'duration', 'internalNote', 'parent',
    'student', 'universityFamily'
  ]);
  const IMPORT_STRING_ARRAY_FIELDS = Object.freeze([
    'flagLabels', 'graduate', 'keywords', 'risks', 'similar', 'sourceNames', 'suitable',
    'talkTrack', 'traits', 'unsuitable'
  ]);
  const IMPORT_OBJECT_ARRAY_FIELDS = Object.freeze(['careers', 'modules', 'universities']);
  const IMPORT_ALLOWED_FIELDS = new Set([
    ...IMPORT_STRING_FIELDS,
    ...IMPORT_STRING_ARRAY_FIELDS,
    ...IMPORT_OBJECT_ARRAY_FIELDS,
    'difficulty', 'fieldCoverage', 'officialYear', 'scale'
  ]);
  const CONTENT_STATUSES = new Set(['curated', 'major', 'summary', 'class', 'catalog']);
  const BASE_DATA = buildCompleteMajors(OFFICIAL_CATALOG, window.MAJOR_PREVIEW_DATA || []);
  const SOURCE_DATA = window.MAJOR_PREVIEW_SOURCES || [];

  const roleCopy = {
    consultant: {
      label: '咨询师',
      scope: '可查看家长讲解、风险提示、咨询话术与内部备注。'
    },
    public: {
      label: '家长/学生',
      scope: '仅展示专业解释、学习内容、适配建议和公开风险提示。'
    },
    admin: {
      label: '管理员',
      scope: '可查看全部内容，并在本地编辑、导入和导出专业数据。'
    }
  };

  const state = {
    view: 'catalog',
    role: safeRead(ROLE_KEY) || 'consultant',
    majors: loadMajors(),
    selectedMajorId: 'cs',
    compareIds: [],
    trayCollapsed: false,
    filters: {
      search: '',
      discipline: '全部',
      category: '全部',
      contentStatus: '全部',
      traits: new Set(),
      sort: 'code',
      page: 1
    },
    matrix: {
      majorId: 'all',
      province: '全部',
      search: ''
    },
    map: {
      activeDisciplineCode: '',
      activeCategoryKey: '',
      selectedMajorId: '',
      visibleMajorCount: MAP_MAJOR_BATCH_SIZE,
      zoom: 1,
      viewX: 0,
      viewY: 0,
      baseViewWidth: 1600,
      baseViewHeight: 860,
      sceneWidth: 1600,
      sceneHeight: 860,
      needsFit: true,
      pendingFocusId: '',
      drag: null,
      dragMoved: false
    },
    editorMajorId: 'cs'
  };

  let currentMapTree = null;
  let currentMapLayout = null;

  if (!roleCopy[state.role]) state.role = 'consultant';
  if (!state.majors.some((major) => major.id === state.selectedMajorId)) {
    state.selectedMajorId = state.majors[0] ? state.majors[0].id : '';
  }

  const elements = {
    app: document.getElementById('app'),
    majorSearch: document.getElementById('majorSearch'),
    clearMajorSearch: document.getElementById('clearMajorSearch'),
    majorMapSearchResults: document.getElementById('majorMapSearchResults'),
    majorMapBreadcrumb: document.getElementById('majorMapBreadcrumb'),
    majorMapLayout: document.getElementById('majorMapLayout'),
    majorMapStage: document.getElementById('majorMapStage'),
    majorMapCanvas: document.getElementById('majorMapCanvas'),
    majorMapLinks: document.getElementById('majorMapLinks'),
    majorMapNodes: document.getElementById('majorMapNodes'),
    majorMapDetail: document.getElementById('majorMapDetail'),
    majorMapZoomLabel: document.getElementById('majorMapZoomLabel'),
    majorMapLevelLabel: document.getElementById('majorMapLevelLabel'),
    majorMapHint: document.getElementById('majorMapHint'),
    majorMapLiveStatus: document.getElementById('majorMapLiveStatus'),
    detailContent: document.getElementById('detailContent'),
    compareContent: document.getElementById('compareContent'),
    matrixMajor: document.getElementById('matrixMajor'),
    matrixProvince: document.getElementById('matrixProvince'),
    matrixSearch: document.getElementById('matrixSearch'),
    matrixRows: document.getElementById('matrixRows'),
    compareTray: document.getElementById('compareTray'),
    compareTrayItems: document.getElementById('compareTrayItems'),
    compareTrayHint: document.getElementById('compareTrayHint'),
    compareTrayToggle: document.getElementById('compareTrayToggle'),
    compareTabCount: document.getElementById('compareTabCount'),
    selectedCompareCount: document.getElementById('selectedCompareCount'),
    editorMajorSelect: document.getElementById('editorMajorSelect'),
    editorSourceCard: document.getElementById('editorSourceCard'),
    editorForm: document.getElementById('editorForm'),
    editorSaveHint: document.getElementById('editorSaveHint'),
    toastRegion: document.getElementById('toastRegion')
  };

  init();

  function init() {
    elements.majorSearch.value = state.filters.search;
    bindEvents();
    renderRole();
    renderSourceStatus();
    renderCatalogIntegrity();
    renderCatalog();
    renderMatrixControls();
    renderMatrix();
    renderCompare();
    renderTray();
    renderEditorControls();
    switchView('catalog', false);
  }

  function bindEvents() {
    document.addEventListener('click', handleDocumentClick);

    elements.majorSearch.addEventListener('input', (event) => {
      state.filters.search = event.target.value.trim();
      renderMajorMapSearchResults();
    });

    elements.majorSearch.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const firstResult = elements.majorMapSearchResults.querySelector('[data-action="map-search-major"]');
      if (!firstResult) return;
      event.preventDefault();
      focusMajorOnMap(firstResult.dataset.id);
    });

    elements.clearMajorSearch.addEventListener('click', clearMajorMapSearch);
    elements.majorMapCanvas.addEventListener('wheel', handleMapWheel, { passive: false });
    elements.majorMapCanvas.addEventListener('pointerdown', handleMapPointerDown);
    elements.majorMapCanvas.addEventListener('pointermove', handleMapPointerMove);
    elements.majorMapCanvas.addEventListener('pointerup', handleMapPointerUp);
    elements.majorMapCanvas.addEventListener('pointercancel', handleMapPointerUp);
    document.addEventListener('keydown', handleMapKeydown);
    window.matchMedia('(max-width: 760px)').addEventListener('change', () => {
      state.map.needsFit = true;
      renderCatalog();
    });
    document.getElementById('clearCompare').addEventListener('click', () => {
      state.compareIds = [];
      renderCatalog();
      renderCompare();
      renderTray();
      showToast('已清空专业对比。');
    });

    document.getElementById('openCompare').addEventListener('click', () => {
      if (state.compareIds.length < 2) {
        showToast('至少选择 2 个专业后再开始对比。', 'warning');
        return;
      }
      switchView('compare');
    });

    document.getElementById('closeCompareTray').addEventListener('click', () => {
      state.trayCollapsed = true;
      renderTray();
    });

    elements.compareTrayToggle.addEventListener('click', () => {
      state.trayCollapsed = false;
      renderTray();
    });

    elements.matrixMajor.addEventListener('change', (event) => {
      state.matrix.majorId = event.target.value;
      renderMatrixControls(false);
      renderMatrix();
    });

    elements.matrixProvince.addEventListener('change', (event) => {
      state.matrix.province = event.target.value;
      renderMatrix();
    });

    elements.matrixSearch.addEventListener('input', (event) => {
      state.matrix.search = event.target.value.trim();
      renderMatrix();
    });

    document.getElementById('clearMatrixFilters').addEventListener('click', () => {
      state.matrix = { majorId: 'all', province: '全部', search: '' };
      renderMatrixControls();
      renderMatrix();
    });

    elements.editorMajorSelect.addEventListener('change', (event) => {
      state.editorMajorId = event.target.value;
      fillEditorForm();
    });

    elements.editorForm.addEventListener('input', () => {
      elements.editorSaveHint.textContent = '有未保存修改';
      elements.editorSaveHint.classList.add('is-dirty');
    });

    elements.editorForm.addEventListener('submit', saveEditorForm);
    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('importData').addEventListener('change', importData);
    document.getElementById('resetData').addEventListener('click', resetData);
  }

  function handleDocumentClick(event) {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton && viewButton.classList.contains('main-tab')) {
      switchView(viewButton.dataset.view);
      return;
    }

    const roleButton = event.target.closest('.role-button[data-role]');
    if (roleButton) {
      setRole(roleButton.dataset.role);
      return;
    }

    const filterButton = event.target.closest('[data-filter-type]');
    if (filterButton) {
      applyCatalogFilter(filterButton);
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const id = actionButton.dataset.id;
    switch (actionButton.dataset.action) {
      case 'detail':
        state.selectedMajorId = id;
        renderDetail();
        switchView('detail');
        break;
      case 'compare-toggle':
        toggleCompare(id);
        break;
      case 'compare-remove':
        removeCompare(id);
        break;
      case 'similar-detail':
        state.selectedMajorId = id;
        renderDetail();
        switchView('detail');
        break;
      case 'catalog':
        switchView('catalog');
        break;
      case 'map-reset':
        resetMajorMap();
        break;
      case 'map-discipline':
        openMapDiscipline(actionButton.dataset.code);
        break;
      case 'map-category':
        openMapCategory(actionButton.dataset.key);
        break;
      case 'map-major':
        selectMajorOnMap(id);
        break;
      case 'map-search-major':
        focusMajorOnMap(id);
        break;
      case 'map-load-more':
        state.map.visibleMajorCount += MAP_MAJOR_BATCH_SIZE;
        renderCatalog();
        break;
      case 'map-zoom-in':
        zoomMajorMap(1.15);
        break;
      case 'map-zoom-out':
        zoomMajorMap(1 / 1.15);
        break;
      case 'map-detail-close':
        closeMajorMapDetail();
        break;
      case 'matrix-for-major':
        state.matrix.majorId = id;
        renderMatrixControls();
        renderMatrix();
        switchView('matrix');
        break;
      case 'catalog-page':
        state.filters.page = Math.max(1, Number(actionButton.dataset.page) || 1);
        renderCatalog();
        document.querySelector('.catalog-toolbar')?.scrollIntoView({ block: 'start', behavior: 'auto' });
        break;
      default:
        break;
    }
  }

  function setRole(role) {
    if (!roleCopy[role]) return;
    state.role = role;
    safeWrite(ROLE_KEY, role);
    renderRole();
    renderCatalog();
    renderCompare();
    if (state.view === 'detail') renderDetail();
    if (state.view === 'editor' && role !== 'admin') switchView('catalog');
    showToast(`已切换为${roleCopy[role].label}视角。`);
  }

  function renderRole() {
    document.body.dataset.role = state.role;
    document.querySelectorAll('[data-role]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.role === state.role);
      button.setAttribute('aria-pressed', String(button.dataset.role === state.role));
    });
    document.getElementById('currentRoleText').textContent = roleCopy[state.role].label;
    document.getElementById('roleScopeText').textContent = roleCopy[state.role].scope;
  }

  function switchView(view, scroll = true) {
    if (view === 'editor' && state.role !== 'admin') {
      showToast('内容编辑仅在管理员视角开放。', 'warning');
      view = 'catalog';
    }
    state.view = view;
    document.querySelectorAll('[data-view-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.viewPanel === view);
    });
    document.querySelectorAll('.main-tab').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });

    if (view === 'detail') renderDetail();
    if (view === 'compare') renderCompare();
    if (view === 'matrix') renderMatrix();
    if (view === 'editor') {
      renderEditorControls();
      fillEditorForm();
    }
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
    elements.app.focus({ preventScroll: true });
  }

  function renderSourceStatus() {
    const el = document.getElementById('sourceStatus');
    el.innerHTML = `
      <span><strong>${Number(CATALOG_META.disciplineCount || 0)}</strong> 个门类</span>
      <span><strong>${Number(CATALOG_META.categoryCount || 0)}</strong> 个专业类</span>
      <span><strong>${Number(CATALOG_META.majorCount || state.majors.length)}</strong> 个专业</span>
      <span><strong>${Number(CATALOG_META.majorDetailCount || 0)}</strong> 个专业级详解</span>
      <span><strong>${Number(CATALOG_META.classReferenceCount || 0)}</strong> 个专业类参考</span>
      <span><a href="${escapeHTML(CATALOG_META.officialNoticeUrl || '#')}" target="_blank" rel="noopener noreferrer">教育部目录 ${escapeHTML(CATALOG_META.year || '2026')} 年版</a></span>
    `;
  }

  function renderCatalogIntegrity() {
    const el = document.getElementById('catalogIntegrity');
    if (!el) return;
    const audit = auditCatalog(state.majors);
    const statusCounts = state.majors.reduce((counts, major) => {
      const status = String(major.contentStatus || 'catalog');
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
    const detailed = (statusCounts.curated || 0) + (statusCounts.major || 0) + (statusCounts.summary || 0);
    const classReference = statusCounts.class || 0;
    const catalogOnly = statusCounts.catalog || 0;
    el.className = `catalog-integrity ${audit.valid ? 'is-valid' : 'is-error'}`;
    el.innerHTML = `
      <div>
        <strong>${audit.valid ? `目录完整：${audit.majorCount} / ${EXPECTED_CATALOG.majors} 个专业` : '目录完整性异常，请停止使用'}</strong>
        <span>${audit.disciplineCount} 个门类 · ${audit.categoryCount} 个专业类 · ${audit.directMajorCount} 个交叉学科直列专业</span>
      </div>
      <div>
        <strong>讲解内容单独计算，不冒充目录完整度</strong>
        <small>专业级详解 ${detailed} 个 · 专业类参考 ${classReference} 个 · 仅目录待补 ${catalogOnly} 个${audit.valid ? '' : ` · 缺失 ${audit.missingCodes.length} · 重复 ${audit.duplicateCodes.length} · 身份冲突 ${audit.identityMismatches.length}`}</small>
      </div>
      <div class="catalog-integrity-links">
        <a href="${escapeHTML(CATALOG_META.officialNoticeUrl || '#')}" target="_blank" rel="noopener noreferrer">教育部通知</a>
        <a href="${escapeHTML(CATALOG_META.officialPdfUrl || '#')}" target="_blank" rel="noopener noreferrer">官方目录 PDF</a>
      </div>
    `;
  }

  function renderCatalogFilters() {
    const disciplineRows = [...new Map(state.majors.map((major) => [major.discipline, {
      name: major.discipline,
      code: major.disciplineCode || ''
    }])).values()].sort((a, b) => a.code.localeCompare(b.code, 'zh-CN'));
    const disciplines = [{ name: '全部', code: '' }, ...disciplineRows];
    elements.disciplineFilters.innerHTML = disciplines.map((item) => `
      <button class="filter-option ${state.filters.discipline === item.name ? 'is-active' : ''}"
              type="button"
              data-filter-type="discipline"
              data-value="${escapeHTML(item.name)}">
        <span>${item.code ? `${escapeHTML(item.code)} ` : ''}${escapeHTML(item.name)}</span>
        <small>${item.name === '全部' ? state.majors.length : state.majors.filter((major) => major.discipline === item.name).length}</small>
      </button>
    `).join('');

    const categoryMajors = state.filters.discipline === '全部'
      ? state.majors
      : state.majors.filter((major) => major.discipline === state.filters.discipline);
    const categoryRows = [...new Map(categoryMajors.map((major) => [
      `${major.categoryCode || 'direct'}|${major.category}`,
      { code: major.categoryCode || '', name: major.category }
    ])).values()].sort((a, b) => {
      if (!a.code && b.code) return 1;
      if (a.code && !b.code) return -1;
      return a.code.localeCompare(b.code, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN');
    });
    const allowedCategories = new Set(categoryRows.map((item) => item.name));
    if (state.filters.category !== '全部' && !allowedCategories.has(state.filters.category)) {
      state.filters.category = '全部';
    }
    const officialCategoryCount = categoryRows.filter((item) => item.code).length;
    const hasDirectMajors = categoryRows.some((item) => !item.code);
    elements.categoryFilter.innerHTML = `
      <option value="全部">全部专业类（${officialCategoryCount}）${hasDirectMajors ? '＋目录直列' : ''}</option>
      ${categoryRows.map((item) => {
        const count = categoryMajors.filter((major) => major.category === item.name).length;
        const label = item.code ? `${item.code} ${item.name}` : item.name;
        return `<option value="${escapeHTML(item.name)}">${escapeHTML(label)}（${count}）</option>`;
      }).join('')}
    `;
    elements.categoryFilter.value = state.filters.category;
    elements.contentStatusFilter.value = state.filters.contentStatus;

    const preferredTraits = ['数学', '编程', '物理', '实验', '深造', '项目', '阅读', '数字'];
    elements.traitFilters.innerHTML = preferredTraits.map((trait) => `
      <button class="filter-chip ${state.filters.traits.has(trait) ? 'is-active' : ''}"
              type="button"
              data-filter-type="trait"
              data-value="${escapeHTML(trait)}"
              aria-pressed="${state.filters.traits.has(trait)}">
        ${escapeHTML(trait)}
      </button>
    `).join('');
  }

  function applyCatalogFilter(button) {
    const type = button.dataset.filterType;
    const value = button.dataset.value;
    if (type === 'discipline') {
      state.filters.discipline = value;
      state.filters.category = '全部';
    } else if (type === 'trait') {
      if (state.filters.traits.has(value)) state.filters.traits.delete(value);
      else state.filters.traits.add(value);
    }
    state.filters.page = 1;
    renderCatalogFilters();
    renderCatalog();
  }

  function clearCatalogFilters() {
    state.filters.search = '';
    state.filters.discipline = '全部';
    state.filters.category = '全部';
    state.filters.contentStatus = '全部';
    state.filters.traits.clear();
    state.filters.sort = 'code';
    state.filters.page = 1;
    elements.majorSearch.value = '';
    elements.catalogSort.value = 'code';
    elements.contentStatusFilter.value = '全部';
    renderCatalogFilters();
    renderCatalog();
  }

  function getFilteredMajors() {
    const search = state.filters.search.toLowerCase();
    let result = state.majors.filter((major) => {
      const haystack = [major.name, major.code, major.discipline, major.category, ...(major.keywords || [])].join(' ').toLowerCase();
      const searchMatches = !search || haystack.includes(search);
      const disciplineMatches = state.filters.discipline === '全部' || major.discipline === state.filters.discipline;
      const categoryMatches = state.filters.category === '全部' || major.category === state.filters.category;
      const statusMatches = state.filters.contentStatus === '全部' || major.contentStatus === state.filters.contentStatus;
      const traitMatches = !state.filters.traits.size || [...state.filters.traits].every((trait) => (major.traits || []).includes(trait));
      return searchMatches && disciplineMatches && categoryMatches && statusMatches && traitMatches;
    });

    if (state.filters.sort === 'code') result.sort((a, b) => a.code.localeCompare(b.code, 'zh-CN'));
    if (state.filters.sort === 'default') result.sort((a, b) => contentStatusRank(a) - contentStatusRank(b) || a.code.localeCompare(b.code, 'zh-CN'));
    if (state.filters.sort === 'scale') result.sort((a, b) => numericSortValue(b.scale) - numericSortValue(a.scale) || a.code.localeCompare(b.code, 'zh-CN'));
    if (state.filters.sort === 'difficulty') result.sort((a, b) => numericSortValue(averageDifficulty(b)) - numericSortValue(averageDifficulty(a)) || a.code.localeCompare(b.code, 'zh-CN'));
    return result;
  }

  function renderCatalog() {
    currentMapTree = buildMajorMapTree(state.majors);
    normalizeMajorMapState(currentMapTree);
    currentMapLayout = buildMajorMapLayout(currentMapTree);

    document.getElementById('catalogResultCount').textContent = state.majors.length;
    document.getElementById('disciplineCount').textContent = currentMapTree.disciplines.length;
    document.getElementById('categoryCount').textContent = currentMapTree.officialCategoryCount;
    document.getElementById('contentReadyCount').textContent = state.majors.filter((major) => major.contentStatus !== 'catalog').length;

    renderMajorMapScene(currentMapLayout);
    renderMajorMapBreadcrumb(currentMapTree);
    renderMajorMapDetail(currentMapTree);
    renderMajorMapSearchResults();
    updateCompareCounters();
  }

  function buildMajorMapTree(majors) {
    const disciplineMap = new Map();
    const majorById = new Map();
    const pathByMajorId = new Map();
    const categoryByKey = new Map();

    [...majors].sort((a, b) => String(a.code).localeCompare(String(b.code), 'zh-CN')).forEach((major) => {
      const disciplineCode = String(major.disciplineCode || '').trim();
      let discipline = disciplineMap.get(disciplineCode);
      if (!discipline) {
        discipline = {
          id: `discipline-${disciplineCode}`,
          code: disciplineCode,
          name: major.discipline,
          categories: [],
          categoryMap: new Map(),
          majors: []
        };
        disciplineMap.set(disciplineCode, discipline);
      }

      const isDirect = !major.categoryCode;
      const categoryKey = isDirect
        ? `direct-${disciplineCode}`
        : `category-${String(major.categoryCode).trim()}`;
      let category = discipline.categoryMap.get(categoryKey);
      if (!category) {
        category = {
          id: categoryKey,
          key: categoryKey,
          code: isDirect ? '' : String(major.categoryCode).trim(),
          name: isDirect ? '目录直列专业' : major.category,
          isDirect,
          disciplineCode,
          majors: []
        };
        discipline.categoryMap.set(categoryKey, category);
        discipline.categories.push(category);
        categoryByKey.set(categoryKey, category);
      }

      category.majors.push(major);
      discipline.majors.push(major);
      majorById.set(major.id, major);
      pathByMajorId.set(major.id, { disciplineCode, categoryKey, isDirect });
    });

    const disciplines = [...disciplineMap.values()]
      .sort((a, b) => a.code.localeCompare(b.code, 'zh-CN'))
      .map((discipline) => {
        discipline.categories.sort((a, b) => {
          if (a.isDirect !== b.isDirect) return a.isDirect ? 1 : -1;
          return a.code.localeCompare(b.code, 'zh-CN') || a.name.localeCompare(b.name, 'zh-CN');
        });
        discipline.categories.forEach((category) => category.majors.sort((a, b) => a.code.localeCompare(b.code, 'zh-CN')));
        discipline.categoryCount = discipline.categories.filter((category) => !category.isDirect).length;
        discipline.majorCount = discipline.majors.length;
        delete discipline.categoryMap;
        return discipline;
      });

    return {
      disciplines,
      disciplineByCode: new Map(disciplines.map((discipline) => [discipline.code, discipline])),
      categoryByKey,
      majorById,
      pathByMajorId,
      officialCategoryCount: [...categoryByKey.values()].filter((category) => !category.isDirect).length
    };
  }

  function normalizeMajorMapState(tree) {
    const discipline = tree.disciplineByCode.get(state.map.activeDisciplineCode);
    if (!discipline) {
      state.map.activeDisciplineCode = '';
      state.map.activeCategoryKey = '';
      state.map.selectedMajorId = '';
      return;
    }

    const category = tree.categoryByKey.get(state.map.activeCategoryKey);
    if (!category || category.disciplineCode !== discipline.code) state.map.activeCategoryKey = '';

    const directCategory = discipline.categories.find((item) => item.isDirect);
    if (!state.map.activeCategoryKey && discipline.categories.length === 1 && directCategory) {
      state.map.activeCategoryKey = directCategory.key;
    }

    const selectedPath = tree.pathByMajorId.get(state.map.selectedMajorId);
    if (!selectedPath
      || selectedPath.disciplineCode !== state.map.activeDisciplineCode
      || selectedPath.categoryKey !== state.map.activeCategoryKey) {
      state.map.selectedMajorId = '';
    }
  }

  function buildMajorMapLayout(tree) {
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const discipline = tree.disciplineByCode.get(state.map.activeDisciplineCode);
    const category = tree.categoryByKey.get(state.map.activeCategoryKey);
    if (!discipline) return buildMajorMapOverviewLayout(tree, mobile);
    if (category) return buildMajorMapCategoryLayout(tree, discipline, category, mobile);
    return buildMajorMapDisciplineLayout(tree, discipline, mobile);
  }

  function buildMajorMapOverviewLayout(tree, mobile) {
    const nodes = [];
    const links = [];
    if (mobile) {
      const root = mapNode('root', 55, 22, 250, 88, {
        action: 'map-reset', eyebrow: '2026', label: '本科专业目录', meta: '13 门类 · 92 专业类 · 883 专业'
      });
      nodes.push(root);
      tree.disciplines.forEach((discipline, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const node = mapDisciplineNode(discipline, 15 + column * 175, 142 + row * 68, 155, 58);
        nodes.push(node);
        links.push(mapLink(root, node, discipline.code, 'vertical'));
      });
      return {
        mode: 'overview', mobile, width: 360, height: 630, baseViewWidth: 360, baseViewHeight: 630,
        nodes, links, levelLabel: '本科专业目录全景',
        hint: '点击门类节点，继续展开专业类与专业'
      };
    }

    const width = 1600;
    const height = 860;
    const root = mapNode('root', 675, 38, 250, 106, {
      action: 'map-reset', eyebrow: '2026', label: '本科专业目录', meta: '13 门类 · 92 专业类 · 883 专业'
    });
    nodes.push(root);
    const bands = [
      { codes: ['01', '02', '03', '04', '05', '06'], y: 210, nodeWidth: 190, gap: 42 },
      { codes: ['07', '08'], y: 390, nodeWidth: 210, gap: 150 },
      { codes: ['09', '10', '14'], y: 565, nodeWidth: 200, gap: 95 },
      { codes: ['12', '13'], y: 735, nodeWidth: 210, gap: 150 }
    ];
    bands.forEach((band) => {
      const totalWidth = band.codes.length * band.nodeWidth + (band.codes.length - 1) * band.gap;
      const startX = (width - totalWidth) / 2;
      band.codes.forEach((code, index) => {
        const discipline = tree.disciplineByCode.get(code);
        if (!discipline) return;
        const node = mapDisciplineNode(discipline, startX + index * (band.nodeWidth + band.gap), band.y, band.nodeWidth, 72);
        nodes.push(node);
        links.push(mapLink(root, node, discipline.code, 'vertical'));
      });
    });
    return {
      mode: 'overview', mobile, width, height, baseViewWidth: width, baseViewHeight: height,
      nodes, links, levelLabel: '本科专业目录全景',
      hint: '拖动地图 · 滚轮缩放 · 点击彩色门类逐层展开'
    };
  }

  function buildMajorMapDisciplineLayout(tree, discipline, mobile) {
    const categories = discipline.categories.filter((category) => !category.isDirect);
    const nodes = [];
    const links = [];
    if (mobile) {
      const root = mapNode('root', 15, 20, 155, 58, {
        action: 'map-reset', eyebrow: '2026', label: '本科专业目录', meta: '返回全景'
      });
      const disciplineNode = mapDisciplineNode(discipline, 190, 20, 155, 58, true);
      nodes.push(root, disciplineNode);
      links.push(mapLink(root, disciplineNode, discipline.code, 'horizontal', true));
      categories.forEach((category, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const node = mapCategoryNode(category, 15 + column * 175, 132 + row * 64, 155, 52, discipline.code);
        nodes.push(node);
        links.push(mapLink(disciplineNode, node, discipline.code, 'vertical', true));
      });
      const height = Math.max(640, 132 + Math.ceil(categories.length / 2) * 64 + 32);
      return {
        mode: 'discipline', mobile, width: 360, height, baseViewWidth: 360, baseViewHeight: Math.min(640, height),
        nodes, links,
        levelLabel: `${discipline.code} ${discipline.name} · ${discipline.categoryCount} 个专业类`,
        hint: '点击专业类，继续展开具体专业'
      };
    }

    const columns = Math.max(1, Math.ceil(categories.length / 11));
    const rows = Math.max(1, Math.ceil(categories.length / columns));
    const width = Math.max(1500, 720 + columns * 245 + 100);
    const height = Math.max(760, rows * 66 + 150);
    const centerY = height / 2;
    const root = mapNode('root', 48, centerY - 38, 180, 76, {
      action: 'map-reset', eyebrow: '2026', label: '本科专业目录', meta: '返回 13 门类'
    });
    const disciplineNode = mapDisciplineNode(discipline, 330, centerY - 45, 220, 90, true);
    nodes.push(root, disciplineNode);
    links.push(mapLink(root, disciplineNode, discipline.code, 'horizontal', true));
    categories.forEach((category, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const node = mapCategoryNode(category, 700 + column * 245, 74 + row * 66, 210, 52, discipline.code);
      nodes.push(node);
      links.push(mapLink(disciplineNode, node, discipline.code, 'horizontal', true));
    });
    return {
      mode: 'discipline', mobile, width, height, baseViewWidth: width, baseViewHeight: height,
      nodes, links,
      levelLabel: `${discipline.code} ${discipline.name} · ${discipline.categoryCount} 个专业类 · ${discipline.majorCount} 个专业`,
      hint: '点击专业类节点，继续展开具体专业'
    };
  }

  function buildMajorMapCategoryLayout(tree, discipline, category, mobile) {
    const visibleMajors = category.majors.slice(0, state.map.visibleMajorCount);
    const remaining = Math.max(0, category.majors.length - visibleMajors.length);
    const leafCount = visibleMajors.length + (remaining ? 1 : 0);
    const nodes = [];
    const links = [];

    if (mobile) {
      const root = mapNode('root', 15, 20, 155, 56, {
        action: 'map-reset', eyebrow: '2026', label: '本科专业目录', meta: '返回全景'
      });
      const disciplineNode = mapDisciplineNode(discipline, 190, 20, 155, 56, true);
      nodes.push(root, disciplineNode);
      links.push(mapLink(root, disciplineNode, discipline.code, 'horizontal', true));
      let parent = disciplineNode;
      let startY = 116;
      if (!category.isDirect) {
        const categoryNode = mapCategoryNode(category, 15, 104, 330, 58, discipline.code, true);
        nodes.push(categoryNode);
        links.push(mapLink(disciplineNode, categoryNode, discipline.code, 'vertical', true));
        parent = categoryNode;
        startY = 204;
      }
      visibleMajors.forEach((major, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const node = mapMajorNode(major, 15 + column * 175, startY + row * 60, 155, 50, discipline.code);
        nodes.push(node);
        links.push(mapLink(parent, node, discipline.code, 'vertical', major.id === state.map.selectedMajorId));
      });
      if (remaining) {
        const index = visibleMajors.length;
        const column = index % 2;
        const row = Math.floor(index / 2);
        const moreNode = mapNode('more', 15 + column * 175, startY + row * 60, 155, 50, {
          action: 'map-load-more', eyebrow: `还有 ${remaining} 个`, label: `继续显示 ${Math.min(MAP_MAJOR_BATCH_SIZE, remaining)} 个`,
          meta: '', branchCode: discipline.code
        });
        nodes.push(moreNode);
        links.push(mapLink(parent, moreNode, discipline.code, 'vertical'));
      }
      const height = Math.max(640, startY + Math.ceil(leafCount / 2) * 60 + 36);
      return {
        mode: category.isDirect ? 'direct' : 'category', mobile, width: 360, height,
        baseViewWidth: 360, baseViewHeight: Math.min(640, height), nodes, links,
        levelLabel: category.isDirect
          ? `${discipline.code} ${discipline.name} · ${category.majors.length} 个目录直列专业`
          : `${category.code} ${category.name} · ${category.majors.length} 个专业`,
        hint: remaining ? `已显示 ${visibleMajors.length} 个专业，可继续展开` : '点击专业节点，在地图旁查看详情'
      };
    }

    const columns = Math.max(1, Math.ceil(leafCount / 12));
    const rows = Math.max(1, Math.ceil(leafCount / columns));
    const majorStartX = category.isDirect ? 650 : 790;
    const width = Math.max(1500, majorStartX + columns * 225 + 90);
    const height = Math.max(760, rows * 62 + 150);
    const centerY = height / 2;
    const root = mapNode('root', 30, centerY - 34, 160, 68, {
      action: 'map-reset', eyebrow: '2026', label: '本科专业目录', meta: '返回全景'
    });
    const disciplineNode = mapDisciplineNode(discipline, 250, centerY - 40, 190, 80, true);
    nodes.push(root, disciplineNode);
    links.push(mapLink(root, disciplineNode, discipline.code, 'horizontal', true));
    let parent = disciplineNode;
    if (!category.isDirect) {
      const categoryNode = mapCategoryNode(category, 500, centerY - 36, 220, 72, discipline.code, true);
      nodes.push(categoryNode);
      links.push(mapLink(disciplineNode, categoryNode, discipline.code, 'horizontal', true));
      parent = categoryNode;
    }
    visibleMajors.forEach((major, index) => {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const node = mapMajorNode(major, majorStartX + column * 225, 72 + row * 62, 200, 50, discipline.code);
      nodes.push(node);
      links.push(mapLink(parent, node, discipline.code, 'horizontal', major.id === state.map.selectedMajorId));
    });
    if (remaining) {
      const index = visibleMajors.length;
      const column = Math.floor(index / rows);
      const row = index % rows;
      const moreNode = mapNode('more', majorStartX + column * 225, 72 + row * 62, 200, 50, {
        action: 'map-load-more', eyebrow: `还有 ${remaining} 个`, label: `继续显示 ${Math.min(MAP_MAJOR_BATCH_SIZE, remaining)} 个`,
        meta: '', branchCode: discipline.code
      });
      nodes.push(moreNode);
      links.push(mapLink(parent, moreNode, discipline.code, 'horizontal'));
    }
    return {
      mode: category.isDirect ? 'direct' : 'category', mobile, width, height,
      baseViewWidth: Math.min(width, 1700), baseViewHeight: Math.min(height, 900), nodes, links,
      levelLabel: category.isDirect
        ? `${discipline.code} ${discipline.name} · ${category.majors.length} 个目录直列专业`
        : `${category.code} ${category.name} · ${category.majors.length} 个专业`,
      hint: remaining ? `已显示 ${visibleMajors.length} 个专业，可继续展开` : '点击专业节点，在地图右侧查看详情'
    };
  }

  function mapNode(type, x, y, width, height, options) {
    return {
      type, x, y, width, height,
      id: options.id || `${type}-${x}-${y}`,
      action: options.action || '',
      eyebrow: options.eyebrow || '',
      label: options.label || '',
      meta: options.meta || '',
      branchCode: options.branchCode || '',
      dataId: options.dataId || '',
      dataCode: options.dataCode || '',
      dataKey: options.dataKey || '',
      selected: Boolean(options.selected),
      expanded: Boolean(options.expanded),
      status: options.status || ''
    };
  }

  function mapDisciplineNode(discipline, x, y, width, height, expanded = false) {
    const meta = discipline.categoryCount
      ? `${discipline.categoryCount} 类 · ${discipline.majorCount} 专业`
      : `${discipline.majorCount} 个目录直列专业`;
    return mapNode('discipline', x, y, width, height, {
      id: discipline.id,
      action: 'map-discipline',
      eyebrow: discipline.code,
      label: discipline.name,
      meta,
      branchCode: discipline.code,
      dataCode: discipline.code,
      expanded
    });
  }

  function mapCategoryNode(category, x, y, width, height, branchCode, expanded = false) {
    return mapNode('category', x, y, width, height, {
      id: category.key,
      action: 'map-category',
      eyebrow: category.code,
      label: category.name,
      meta: `${category.majors.length} 个专业`,
      branchCode,
      dataKey: category.key,
      expanded
    });
  }

  function mapMajorNode(major, x, y, width, height, branchCode) {
    return mapNode('major', x, y, width, height, {
      id: `map-major-${major.id}`,
      action: 'map-major',
      eyebrow: major.code,
      label: major.name,
      meta: '',
      branchCode,
      dataId: major.id,
      selected: major.id === state.map.selectedMajorId,
      status: major.contentStatus || 'catalog'
    });
  }

  function mapLink(from, to, branchCode, orientation = 'horizontal', active = false) {
    return { from, to, branchCode, orientation, active };
  }

  function renderMajorMapScene(layout) {
    elements.majorMapCanvas.setAttribute('viewBox', `0 0 ${layout.baseViewWidth} ${layout.baseViewHeight}`);
    elements.majorMapCanvas.setAttribute('data-mode', layout.mode);
    elements.majorMapLinks.innerHTML = layout.links.map(renderMajorMapLink).join('');
    elements.majorMapNodes.innerHTML = layout.nodes.map(renderMajorMapNode).join('');
    elements.majorMapLevelLabel.textContent = layout.levelLabel;
    elements.majorMapHint.textContent = layout.hint;

    state.map.sceneWidth = layout.width;
    state.map.sceneHeight = layout.height;
    state.map.baseViewWidth = layout.baseViewWidth;
    state.map.baseViewHeight = layout.baseViewHeight;
    if (state.map.needsFit) {
      state.map.zoom = 1;
      state.map.viewX = 0;
      state.map.viewY = 0;
      state.map.needsFit = false;
    }
    applyMajorMapViewBox();
    if (state.map.pendingFocusId) {
      focusMapNodeInViewport(state.map.pendingFocusId);
      state.map.pendingFocusId = '';
    }
  }

  function renderMajorMapNode(node) {
    const branchClass = node.branchCode ? ` branch-${escapeHTML(node.branchCode)}` : '';
    const selectedClass = node.selected ? ' is-selected' : '';
    const expandedClass = node.expanded ? ' is-expanded' : '';
    const statusClass = node.status ? ` status-${escapeHTML(node.status)}` : '';
    const attributes = [
      `data-action="${escapeHTML(node.action)}"`,
      node.dataId ? `data-id="${escapeHTML(node.dataId)}"` : '',
      node.dataCode ? `data-code="${escapeHTML(node.dataCode)}"` : '',
      node.dataKey ? `data-key="${escapeHTML(node.dataKey)}"` : '',
      ['discipline', 'category'].includes(node.type) ? `aria-expanded="${node.expanded}"` : ''
    ].filter(Boolean).join(' ');
    const ariaLabel = [node.eyebrow, node.label, node.meta].filter(Boolean).join(' ');
    return `
      <foreignObject x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" overflow="visible">
        <button xmlns="http://www.w3.org/1999/xhtml"
                class="major-map-node major-map-node-${escapeHTML(node.type)}${branchClass}${selectedClass}${expandedClass}${statusClass}"
                type="button" ${attributes} aria-label="${escapeHTML(ariaLabel)}">
          ${node.eyebrow ? `<span>${escapeHTML(node.eyebrow)}</span>` : ''}
          <strong>${escapeHTML(node.label)}</strong>
          ${node.meta ? `<small>${escapeHTML(node.meta)}</small>` : ''}
        </button>
      </foreignObject>
    `;
  }

  function renderMajorMapLink(link) {
    const from = link.from;
    const to = link.to;
    let path;
    if (link.orientation === 'vertical') {
      const startX = from.x + from.width / 2;
      const startY = from.y + from.height;
      const endX = to.x + to.width / 2;
      const endY = to.y;
      const midY = startY + (endY - startY) * 0.48;
      path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    } else {
      const forward = to.x >= from.x;
      const startX = forward ? from.x + from.width : from.x;
      const startY = from.y + from.height / 2;
      const endX = forward ? to.x : to.x + to.width;
      const endY = to.y + to.height / 2;
      const midX = startX + (endX - startX) * 0.5;
      path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    }
    return `<path class="major-map-link branch-${escapeHTML(link.branchCode)}${link.active ? ' is-active' : ''}" d="${path}" />`;
  }

  function renderMajorMapBreadcrumb(tree) {
    const discipline = tree.disciplineByCode.get(state.map.activeDisciplineCode);
    const category = tree.categoryByKey.get(state.map.activeCategoryKey);
    const parts = [
      `<button type="button" data-action="map-reset">本科专业目录</button>`
    ];
    if (discipline) {
      parts.push('<span aria-hidden="true">›</span>');
      parts.push(`<button type="button" data-action="map-discipline" data-code="${escapeHTML(discipline.code)}">${escapeHTML(discipline.code)} ${escapeHTML(discipline.name)}</button>`);
    }
    if (category && !category.isDirect) {
      parts.push('<span aria-hidden="true">›</span>');
      parts.push(`<span aria-current="page">${escapeHTML(category.code)} ${escapeHTML(category.name)}</span>`);
    }
    elements.majorMapBreadcrumb.innerHTML = parts.join('');
  }

  function renderMajorMapDetail(tree) {
    const major = tree.majorById.get(state.map.selectedMajorId);
    elements.majorMapDetail.hidden = !major;
    elements.majorMapLayout.classList.toggle('has-detail', Boolean(major));
    if (!major) {
      elements.majorMapDetail.innerHTML = '';
      return;
    }

    const selected = state.compareIds.includes(major.id);
    const publicRiskCount = state.role === 'public' ? 1 : 3;
    const isInternal = state.role !== 'public';
    const status = contentStatusLabel(major.contentStatus);
    elements.majorMapDetail.innerHTML = `
      <div class="major-map-detail-head">
        <div>
          <span>${escapeHTML(major.disciplineCode)} ${escapeHTML(major.discipline)} · ${major.categoryCode ? `${escapeHTML(major.categoryCode)} ${escapeHTML(major.category)} · ` : ''}${escapeHTML(major.code)}</span>
          <h2>${escapeHTML(major.name)}</h2>
        </div>
        <button class="icon-button" type="button" data-action="map-detail-close" aria-label="关闭专业详情">×</button>
      </div>
      <div class="major-map-detail-scroll">
        <div class="major-map-detail-status status-${escapeHTML(major.contentStatus || 'catalog')}">
          <strong>${escapeHTML(status)}</strong>
          <span>${escapeHTML(contentStatusDescription(major.contentStatus))}</span>
        </div>
        <dl class="major-map-detail-facts">
          <div><dt>学制</dt><dd>${escapeHTML(major.duration || '待补')}</dd></div>
          <div><dt>学位</dt><dd>${escapeHTML(major.degree || '待补')}</dd></div>
          <div><dt>规模参考</dt><dd>${formatNumber(major.scale)}</dd></div>
        </dl>
        <section>
          <span>一句话认识</span>
          <p>${escapeHTML(major.academic || '详细讲解待补。')}</p>
        </section>
        <section>
          <span>讲给家长</span>
          <p>${escapeHTML(major.parent || '详细讲解待补。')}</p>
        </section>
        <section>
          <span>讲给学生</span>
          <p>${escapeHTML(major.student || '详细讲解待补。')}</p>
        </section>
        <div class="major-map-detail-columns">
          <section>
            <span>更适合</span>
            ${renderMapDetailList((major.suitable || []).slice(0, 3), '适配建议待补。')}
          </section>
          <section>
            <span>需要谨慎</span>
            ${renderMapDetailList((major.unsuitable || []).slice(0, 3), '谨慎事项待补。')}
          </section>
        </div>
        <section class="major-map-risk-section">
          <span>报考前确认</span>
          ${renderMapDetailList((major.risks || []).slice(0, publicRiskCount), '风险提示待补。')}
        </section>
        ${isInternal ? `
          <section class="major-map-internal-section">
            <span>咨询师提示</span>
            ${renderMapDetailList((major.talkTrack || []).slice(0, 2), major.internalNote || '内部提示待补。')}
          </section>
        ` : ''}
      </div>
      <div class="major-map-detail-actions">
        <button class="button ${selected ? 'button-selected' : 'button-secondary'}" type="button" data-action="compare-toggle" data-id="${escapeHTML(major.id)}">${selected ? '已加入对比' : '加入对比'}</button>
        <button class="button button-secondary" type="button" data-action="matrix-for-major" data-id="${escapeHTML(major.id)}">院校矩阵</button>
        <button class="button button-primary" type="button" data-action="detail" data-id="${escapeHTML(major.id)}">打开完整讲解</button>
      </div>
    `;
  }

  function renderMapDetailList(items, fallback) {
    if (!items.length) return `<p>${escapeHTML(fallback)}</p>`;
    return `<ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
  }

  function renderMajorMapSearchResults() {
    const query = state.filters.search.trim().toLowerCase();
    elements.clearMajorSearch.hidden = !query;
    if (!query) {
      elements.majorMapSearchResults.hidden = true;
      elements.majorMapSearchResults.innerHTML = '';
      return;
    }

    const matches = state.majors.filter((major) => {
      const haystack = [major.name, major.code, major.discipline, major.category, ...(major.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(query);
    });
    const visible = matches.slice(0, 12);
    elements.majorMapSearchResults.hidden = false;
    elements.majorMapSearchResults.innerHTML = visible.length ? `
      <div class="major-map-search-result-head">找到 ${matches.length} 个专业</div>
      ${visible.map((major) => `
        <button type="button" data-action="map-search-major" data-id="${escapeHTML(major.id)}">
          <span>${escapeHTML(major.code)}</span>
          <strong>${escapeHTML(major.name)}</strong>
          <small>${escapeHTML(major.discipline)} · ${escapeHTML(major.category)}</small>
        </button>
      `).join('')}
      ${matches.length > visible.length ? `<div class="major-map-search-more">先显示前 ${visible.length} 条，继续输入可缩小范围</div>` : ''}
    ` : '<div class="major-map-search-empty">没有匹配的专业、代码或专业类</div>';
  }

  function clearMajorMapSearch(focus = true) {
    state.filters.search = '';
    elements.majorSearch.value = '';
    renderMajorMapSearchResults();
    if (focus) elements.majorSearch.focus();
  }

  function resetMajorMap() {
    state.map.activeDisciplineCode = '';
    state.map.activeCategoryKey = '';
    state.map.selectedMajorId = '';
    state.map.visibleMajorCount = MAP_MAJOR_BATCH_SIZE;
    state.map.needsFit = true;
    clearMajorMapSearch(false);
    renderCatalog();
    writeMajorMapStatus('已回到本科专业目录全景。');
  }

  function openMapDiscipline(code) {
    if (!currentMapTree) currentMapTree = buildMajorMapTree(state.majors);
    const discipline = currentMapTree.disciplineByCode.get(String(code || ''));
    if (!discipline) return;

    if (state.map.activeDisciplineCode === discipline.code) {
      if (state.map.activeCategoryKey && !currentMapTree.categoryByKey.get(state.map.activeCategoryKey)?.isDirect) {
        state.map.activeCategoryKey = '';
        state.map.selectedMajorId = '';
      } else {
        resetMajorMap();
        return;
      }
    } else {
      state.map.activeDisciplineCode = discipline.code;
      state.map.activeCategoryKey = '';
      state.map.selectedMajorId = '';
    }

    const directCategory = discipline.categories.find((category) => category.isDirect);
    if (discipline.categories.length === 1 && directCategory) state.map.activeCategoryKey = directCategory.key;
    state.map.visibleMajorCount = MAP_MAJOR_BATCH_SIZE;
    state.map.needsFit = true;
    renderCatalog();
    writeMajorMapStatus(`已展开 ${discipline.code} ${discipline.name}。`);
  }

  function openMapCategory(key) {
    if (!currentMapTree) return;
    const category = currentMapTree.categoryByKey.get(String(key || ''));
    if (!category) return;
    if (state.map.activeCategoryKey === category.key) {
      state.map.activeCategoryKey = '';
      state.map.selectedMajorId = '';
    } else {
      state.map.activeDisciplineCode = category.disciplineCode;
      state.map.activeCategoryKey = category.key;
      state.map.selectedMajorId = '';
    }
    state.map.visibleMajorCount = MAP_MAJOR_BATCH_SIZE;
    state.map.needsFit = true;
    renderCatalog();
    writeMajorMapStatus(state.map.activeCategoryKey ? `已展开 ${category.code} ${category.name}。` : `已收起 ${category.name}。`);
  }

  function selectMajorOnMap(id) {
    if (!currentMapTree?.majorById.has(id)) return;
    state.map.selectedMajorId = id;
    state.selectedMajorId = id;
    renderCatalog();
    const major = currentMapTree.majorById.get(id);
    writeMajorMapStatus(`已打开 ${major.code} ${major.name} 的地图详情。`);
  }

  function focusMajorOnMap(id) {
    if (!currentMapTree) currentMapTree = buildMajorMapTree(state.majors);
    const path = currentMapTree.pathByMajorId.get(id);
    const major = currentMapTree.majorById.get(id);
    const category = path ? currentMapTree.categoryByKey.get(path.categoryKey) : null;
    if (!path || !major || !category) return;
    const index = category.majors.findIndex((item) => item.id === id);
    state.map.activeDisciplineCode = path.disciplineCode;
    state.map.activeCategoryKey = path.categoryKey;
    state.map.selectedMajorId = id;
    state.selectedMajorId = id;
    state.map.visibleMajorCount = Math.max(MAP_MAJOR_BATCH_SIZE, Math.ceil((index + 1) / MAP_MAJOR_BATCH_SIZE) * MAP_MAJOR_BATCH_SIZE);
    state.map.needsFit = true;
    state.map.pendingFocusId = id;
    clearMajorMapSearch(false);
    renderCatalog();
    writeMajorMapStatus(`已定位到 ${major.code} ${major.name}。`);
  }

  function closeMajorMapDetail() {
    state.map.selectedMajorId = '';
    renderCatalog();
    writeMajorMapStatus('已关闭专业详情，地图位置保持不变。');
  }

  function applyMajorMapViewBox() {
    const viewWidth = state.map.baseViewWidth / state.map.zoom;
    const viewHeight = state.map.baseViewHeight / state.map.zoom;
    state.map.viewX = clampMapAxis(state.map.viewX, state.map.sceneWidth, viewWidth);
    state.map.viewY = clampMapAxis(state.map.viewY, state.map.sceneHeight, viewHeight);
    elements.majorMapCanvas.setAttribute('viewBox', `${state.map.viewX} ${state.map.viewY} ${viewWidth} ${viewHeight}`);
    elements.majorMapZoomLabel.value = `${Math.round(state.map.zoom * 100)}%`;
    elements.majorMapZoomLabel.textContent = `${Math.round(state.map.zoom * 100)}%`;
  }

  function clampMapAxis(value, sceneSize, viewSize) {
    if (viewSize >= sceneSize) return (sceneSize - viewSize) / 2;
    return Math.min(Math.max(0, value), sceneSize - viewSize);
  }

  function zoomMajorMap(factor, anchor = null) {
    if (!currentMapLayout) return;
    const oldZoom = state.map.zoom;
    const nextZoom = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, oldZoom * factor));
    if (Math.abs(nextZoom - oldZoom) < 0.001) return;
    const oldWidth = state.map.baseViewWidth / oldZoom;
    const oldHeight = state.map.baseViewHeight / oldZoom;
    const point = anchor || {
      x: state.map.viewX + oldWidth / 2,
      y: state.map.viewY + oldHeight / 2
    };
    const ratioX = oldWidth ? (point.x - state.map.viewX) / oldWidth : 0.5;
    const ratioY = oldHeight ? (point.y - state.map.viewY) / oldHeight : 0.5;
    const nextWidth = state.map.baseViewWidth / nextZoom;
    const nextHeight = state.map.baseViewHeight / nextZoom;
    state.map.zoom = nextZoom;
    state.map.viewX = point.x - ratioX * nextWidth;
    state.map.viewY = point.y - ratioY * nextHeight;
    applyMajorMapViewBox();
  }

  function handleMapWheel(event) {
    event.preventDefault();
    zoomMajorMap(event.deltaY < 0 ? 1.12 : 1 / 1.12, clientPointToMap(event.clientX, event.clientY));
  }

  function clientPointToMap(clientX, clientY) {
    const point = elements.majorMapCanvas.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = elements.majorMapCanvas.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
  }

  function handleMapPointerDown(event) {
    if (event.button !== 0 || event.target.closest?.('button')) return;
    const rect = elements.majorMapCanvas.getBoundingClientRect();
    state.map.drag = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      viewX: state.map.viewX,
      viewY: state.map.viewY,
      viewWidth: state.map.baseViewWidth / state.map.zoom,
      viewHeight: state.map.baseViewHeight / state.map.zoom,
      rectWidth: rect.width,
      rectHeight: rect.height
    };
    state.map.dragMoved = false;
    elements.majorMapCanvas.setPointerCapture(event.pointerId);
    elements.majorMapStage.classList.add('is-dragging');
  }

  function handleMapPointerMove(event) {
    const drag = state.map.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.clientX;
    const deltaY = event.clientY - drag.clientY;
    if (Math.hypot(deltaX, deltaY) > 4) state.map.dragMoved = true;
    state.map.viewX = drag.viewX - deltaX * (drag.viewWidth / Math.max(1, drag.rectWidth));
    state.map.viewY = drag.viewY - deltaY * (drag.viewHeight / Math.max(1, drag.rectHeight));
    applyMajorMapViewBox();
  }

  function handleMapPointerUp(event) {
    if (!state.map.drag || state.map.drag.pointerId !== event.pointerId) return;
    if (elements.majorMapCanvas.hasPointerCapture(event.pointerId)) elements.majorMapCanvas.releasePointerCapture(event.pointerId);
    state.map.drag = null;
    elements.majorMapStage.classList.remove('is-dragging');
  }

  function focusMapNodeInViewport(id) {
    const node = currentMapLayout?.nodes.find((item) => item.dataId === id);
    if (!node) return;
    state.map.zoom = Math.max(1, Math.min(1.2, MAP_ZOOM_MAX));
    const viewWidth = state.map.baseViewWidth / state.map.zoom;
    const viewHeight = state.map.baseViewHeight / state.map.zoom;
    state.map.viewX = node.x + node.width / 2 - viewWidth * 0.68;
    state.map.viewY = node.y + node.height / 2 - viewHeight * 0.5;
    applyMajorMapViewBox();
  }

  function handleMapKeydown(event) {
    if (event.key !== 'Escape' || state.view !== 'catalog') return;
    if (state.filters.search) {
      clearMajorMapSearch();
      return;
    }
    if (state.map.selectedMajorId) {
      closeMajorMapDetail();
      return;
    }
    if (state.map.activeCategoryKey) {
      const category = currentMapTree?.categoryByKey.get(state.map.activeCategoryKey);
      if (category?.isDirect) resetMajorMap();
      else openMapCategory(state.map.activeCategoryKey);
      return;
    }
    if (state.map.activeDisciplineCode) resetMajorMap();
  }

  function writeMajorMapStatus(message) {
    elements.majorMapLiveStatus.textContent = message;
  }

  function renderCatalogPagination(pageCount, total) {
    if (!total || pageCount <= 1) {
      elements.catalogPagination.innerHTML = '';
      elements.catalogPagination.hidden = true;
      return;
    }
    elements.catalogPagination.hidden = false;
    const current = state.filters.page;
    const pages = new Set([1, pageCount, current - 2, current - 1, current, current + 1, current + 2]);
    const pageList = [...pages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
    const pageButtons = [];
    pageList.forEach((page, index) => {
      if (index > 0 && page - pageList[index - 1] > 1) pageButtons.push('<span class="pagination-gap">…</span>');
      pageButtons.push(`
        <button type="button" class="pagination-button ${page === current ? 'is-active' : ''}"
                data-action="catalog-page" data-page="${page}" ${page === current ? 'aria-current="page"' : ''}>${page}</button>
      `);
    });
    elements.catalogPagination.innerHTML = `
      <div class="pagination-summary">共 ${total} 个专业，每页 ${PAGE_SIZE} 个</div>
      <div class="pagination-controls">
        <button type="button" class="pagination-button" data-action="catalog-page" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>上一页</button>
        ${pageButtons.join('')}
        <button type="button" class="pagination-button" data-action="catalog-page" data-page="${current + 1}" ${current === pageCount ? 'disabled' : ''}>下一页</button>
      </div>
    `;
  }

  function renderMajorCard(major) {
    const selected = state.compareIds.includes(major.id);
    const average = averageDifficulty(major);
    const publicRisks = (major.risks || []).slice(0, state.role === 'public' ? 1 : 2);
    return `
      <article class="major-card accent-${escapeHTML(major.accent || 'green')} status-${escapeHTML(major.contentStatus || 'catalog')}">
        <div class="major-card-topline">
          <span>${major.categoryCode ? `${escapeHTML(major.categoryCode)} ` : ''}${escapeHTML(major.category)}</span>
          <span>${escapeHTML(major.code)}</span>
        </div>
        <div class="major-card-status-row">
          <span class="content-status status-${escapeHTML(major.contentStatus || 'catalog')}">${escapeHTML(contentStatusLabel(major.contentStatus))}</span>
          ${(major.flagLabels || []).map((label) => `<span class="catalog-flag">${escapeHTML(label)}</span>`).join('')}
        </div>
        <div class="major-card-heading">
          <div>
            <h2>${escapeHTML(major.name)}</h2>
            <p>${escapeHTML(major.parent)}</p>
          </div>
          <span class="difficulty-score ${average === null ? 'is-pending' : ''}" title="${average === null ? '学习特征待补' : '六项学习特征平均值'}">${average === null ? '—' : average}</span>
        </div>
        <div class="tag-row">
          ${(major.keywords || []).slice(0, 4).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
        </div>
        <div class="major-card-facts">
          <span><small>学制</small><strong>${escapeHTML(major.duration)}</strong></span>
          <span><small>学位</small><strong>${escapeHTML(major.degree)}</strong></span>
          <span><small>规模参考</small><strong>${formatNumber(major.scale)}</strong></span>
        </div>
        <div class="major-card-risk">
          <strong>${major.contentStatus === 'catalog' ? '目录已核对，讲解待补' : '需要提前确认'}</strong>
          <span>${publicRisks.map((risk) => escapeHTML(shorten(risk, 34))).join('；')}</span>
        </div>
        <div class="major-card-actions">
          <button class="button button-primary" type="button" data-action="detail" data-id="${escapeHTML(major.id)}">打开讲解</button>
          <button class="button ${selected ? 'button-selected' : 'button-secondary'}"
                  type="button"
                  data-action="compare-toggle"
                  data-id="${escapeHTML(major.id)}"
                  aria-pressed="${selected}">
            ${selected ? '已加入对比' : '加入对比'}
          </button>
        </div>
      </article>
    `;
  }

  function renderDisciplineChart(majors) {
    const chart = document.getElementById('disciplineChart');
    const counts = majors.reduce((map, major) => {
      map[major.discipline] = (map[major.discipline] || 0) + 1;
      return map;
    }, {});
    const max = Math.max(...Object.values(counts), 1);
    chart.innerHTML = Object.entries(counts).map(([name, count]) => `
      <div class="chart-row">
        <span>${escapeHTML(name)}</span>
        <div><i style="width:${Math.max(10, Math.round((count / max) * 100))}%"></i></div>
        <strong>${count}</strong>
      </div>
    `).join('') || '<span class="muted">无数据</span>';
  }

  function renderDetail() {
    const major = getMajor(state.selectedMajorId) || state.majors[0];
    if (!major) {
      elements.detailContent.innerHTML = '<div class="empty-state"><strong>暂无专业数据</strong></div>';
      return;
    }
    state.selectedMajorId = major.id;
    const selected = state.compareIds.includes(major.id);
    const similarMajors = (major.similar || []).map(getMajor).filter(Boolean);
    const isInternal = state.role !== 'public';

    elements.detailContent.innerHTML = `
      <div class="detail-heading-band accent-${escapeHTML(major.accent || 'green')}">
        <div class="detail-heading-actions">
          <button class="button button-secondary" type="button" data-action="catalog">返回专业地图</button>
          <div>
            <button class="button ${selected ? 'button-selected' : 'button-secondary'}" type="button" data-action="compare-toggle" data-id="${escapeHTML(major.id)}">
              ${selected ? '已加入对比' : '加入专业对比'}
            </button>
            <button class="button button-primary" type="button" data-action="matrix-for-major" data-id="${escapeHTML(major.id)}">查看院校矩阵</button>
          </div>
        </div>
        <div class="detail-status-banner status-${escapeHTML(major.contentStatus || 'catalog')}">
          <strong>${escapeHTML(contentStatusLabel(major.contentStatus))}</strong>
          <span>${escapeHTML(contentStatusDescription(major.contentStatus))}</span>
        </div>
        <div class="detail-identity">
          <div>
            <p class="eyebrow">${escapeHTML(major.discipline)} · ${escapeHTML(major.category)} · ${escapeHTML(major.code)}</p>
            <h1>${escapeHTML(major.name)}</h1>
            <p>${escapeHTML(major.academic)}</p>
          </div>
          <dl class="identity-facts">
            <div><dt>学制</dt><dd>${escapeHTML(major.duration)}</dd></div>
            <div><dt>授予学位</dt><dd>${escapeHTML(major.degree)}</dd></div>
            <div><dt>招生规模参考</dt><dd>${formatNumber(major.scale)}</dd></div>
          </dl>
        </div>
      </div>

      <section class="detail-band explanation-band">
        <div class="section-heading">
          <div><p class="eyebrow">先把话讲明白</p><h2>三种解释口径</h2></div>
          <span class="role-context">当前：${escapeHTML(roleCopy[state.role].label)}视角</span>
        </div>
        <div class="explanation-grid">
          <article><span>一句话定义</span><p>${escapeHTML(major.academic)}</p></article>
          <article><span>讲给家长</span><p>${escapeHTML(major.parent)}</p></article>
          <article><span>讲给学生</span><p>${escapeHTML(major.student)}</p></article>
        </div>
      </section>

      <section class="detail-band learning-band">
        <div class="section-heading">
          <div><p class="eyebrow">学习画像</p><h2>难度雷达与课程模块</h2></div>
          <span>分值用于相对比较，不代表录取难度</span>
        </div>
        <div class="learning-layout">
          <div class="radar-panel">
            ${hasDifficulty(major) ? `
              <canvas id="difficultyRadar" width="420" height="360" aria-label="${escapeHTML(major.name)}学习特征雷达图"></canvas>
              <div class="difficulty-bars">${renderDifficultyBars(major)}</div>
            ` : renderContentPlaceholder('学习特征待补', '当前只确认了官方目录身份，尚未用可靠课程资料生成难度画像。')}
          </div>
          <div class="course-modules">
            ${(major.modules || []).map((module, index) => `
              <article class="course-module">
                <span class="module-index">${String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>${escapeHTML(module.name)}</h3>
                  <p>${(module.courses || []).map((course) => `<span>${escapeHTML(course)}</span>`).join('')}</p>
                  <small>${escapeHTML(module.value)}</small>
                </div>
              </article>
            `).join('') || renderContentPlaceholder('课程模块待补', '后续按培养方案补充核心课程、课程价值和学习顺序。')}
          </div>
        </div>
      </section>

      <section class="detail-band fit-band">
        <div class="section-heading">
          <div><p class="eyebrow">适配判断</p><h2>什么样的学生更适合</h2></div>
        </div>
        <div class="fit-columns">
          <div class="fit-column is-good"><h3>更适合</h3>${renderBulletList(major.suitable)}</div>
          <div class="fit-column is-caution"><h3>需要谨慎</h3>${renderBulletList(major.unsuitable)}</div>
        </div>
      </section>

      <section class="detail-band career-band">
        <div class="section-heading">
          <div><p class="eyebrow">职业地图</p><h2>毕业后不是只有一条路</h2></div>
          <span>岗位内容比岗位名称更重要</span>
        </div>
        <div class="career-grid">
          ${(major.careers || []).map((career) => `
            <article class="career-item">
              <div><span>${escapeHTML(career.attribute)}</span><h3>${escapeHTML(career.name)}</h3></div>
              <p>${escapeHTML(career.work)}</p>
              <dl>
                <div><dt>常见平台</dt><dd>${escapeHTML(career.employers)}</dd></div>
                <div><dt>核心技能</dt><dd>${escapeHTML(career.skills)}</dd></div>
                <div><dt>机会</dt><dd>${escapeHTML(career.upside)}</dd></div>
                <div><dt>注意</dt><dd>${escapeHTML(career.risk)}</dd></div>
              </dl>
            </article>
          `).join('') || renderContentPlaceholder('职业地图待补', '目录收录不等于就业结论，职业方向需依据专业课程和行业资料单独核验。')}
        </div>
      </section>

      <section class="detail-band graduate-band">
        <div class="section-heading"><div><p class="eyebrow">深造与资格</p><h2>培养路径</h2></div></div>
        <div class="graduate-path">${(major.graduate || []).map((item, index) => `<div><span>${index + 1}</span><p>${escapeHTML(item)}</p></div>`).join('') || renderContentPlaceholder('培养路径待补', '深造方向、资格要求和培养年限需结合院校方案确认。')}</div>
      </section>

      <section class="detail-band university-band">
        <div class="section-heading">
          <div><p class="eyebrow">择校提示</p><h2>代表院校与平台差异</h2></div>
          <button class="button button-secondary" type="button" data-action="matrix-for-major" data-id="${escapeHTML(major.id)}">打开完整矩阵</button>
        </div>
        <div class="university-list">
          ${(major.universities || []).slice(0, 6).map((school) => `
            <article>
              <span class="school-level level-${escapeHTML(school.level)}">${levelText(school.level)}</span>
              <h3>${escapeHTML(school.name)}</h3>
              <p>${escapeHTML(school.strength)}</p>
              <small>${escapeHTML(school.province)} · ${escapeHTML(school.city)}｜${escapeHTML(school.note)}</small>
            </article>
          `).join('') || renderContentPlaceholder('代表院校待补', '院校专业设置和当年招生专业组将在正式数据关联后展示。')}
        </div>
      </section>

      <section class="detail-band risk-band">
        <div class="section-heading"><div><p class="eyebrow">风险确认</p><h2>报考前必须回答的问题</h2></div></div>
        <div class="risk-list">${(major.risks || []).map((risk, index) => `<div><span>${index + 1}</span><p>${escapeHTML(risk)}</p></div>`).join('')}</div>
      </section>

      ${isInternal ? `
        <section class="detail-band internal-band">
          <div class="section-heading"><div><p class="eyebrow">内部辅助</p><h2>咨询话术与内部备注</h2></div><span>家长/学生视角自动隐藏</span></div>
          <div class="internal-layout">
            <div><h3>建议讲解顺序</h3>${renderBulletList(major.talkTrack)}</div>
            <div><h3>内部备注</h3><p>${escapeHTML(major.internalNote || '暂无')}</p></div>
          </div>
        </section>
      ` : ''}

      <section class="detail-band similar-band">
        <div class="section-heading"><div><p class="eyebrow">不要望文生义</p><h2>相近专业怎么区分</h2></div></div>
        <div class="similar-list">
          ${similarMajors.map((similar) => `
            <button type="button" data-action="similar-detail" data-id="${escapeHTML(similar.id)}">
              <strong>${escapeHTML(similar.name)}</strong>
              <span>${escapeHTML(shorten(similar.parent, 56))}</span>
            </button>
          `).join('') || '<span class="muted">暂无相近专业</span>'}
        </div>
      </section>

      <details class="source-details">
        <summary>查看本专业内容来源</summary>
        ${renderFieldCoverage(major)}
        <div>${(major.sourceNames || []).map((name) => `<span>${escapeHTML(name)}</span>`).join('')}</div>
        <p>“专业级”表示资料按专业代码或专业名称精确命中；“专业类参考”只表示同一专业类的共性资料，不等同于该专业的独立结论。正式使用仍需复核院校培养方案和招生章程。</p>
      </details>
    `;

    if (hasDifficulty(major)) requestAnimationFrame(() => drawRadar(major));
  }

  function renderDifficultyBars(major) {
    return difficultyEntries(major).map(([key, label, value]) => `
      <div class="difficulty-bar-row" data-key="${key}">
        <span>${escapeHTML(label)}</span>
        <div><i style="width:${value}%"></i></div>
        <strong>${value}</strong>
      </div>
    `).join('');
  }

  function difficultyEntries(major) {
    const difficulty = major.difficulty || {};
    return [
      ['math', '数学', Number(difficulty.math || 0)],
      ['physics', '物理', Number(difficulty.physics || 0)],
      ['coding', '编程', Number(difficulty.coding || 0)],
      ['experiment', '实验/实操', Number(difficulty.experiment || 0)],
      ['english', '英语资料', Number(difficulty.english || 0)],
      ['graduate', '深造依赖', Number(difficulty.graduate || 0)]
    ];
  }

  function drawRadar(major) {
    const canvas = document.getElementById('difficultyRadar');
    if (!canvas) return;
    const parentWidth = canvas.parentElement.clientWidth || 420;
    const cssWidth = Math.min(430, Math.max(300, parentWidth - 8));
    const cssHeight = 340;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const center = { x: cssWidth / 2, y: cssHeight / 2 + 4 };
    const radius = Math.min(cssWidth, cssHeight) * 0.31;
    const entries = difficultyEntries(major);
    const pointsFor = (scale) => entries.map((_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2 / entries.length);
      return { x: center.x + Math.cos(angle) * radius * scale, y: center.y + Math.sin(angle) * radius * scale };
    });

    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 5; ring += 1) {
      const points = pointsFor(ring / 5);
      drawPolygon(ctx, points);
      ctx.strokeStyle = ring === 5 ? '#aab8b3' : '#dce5e2';
      ctx.stroke();
    }

    pointsFor(1).forEach((point) => {
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = '#dce5e2';
      ctx.stroke();
    });

    const dataPoints = entries.map((entry, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2 / entries.length);
      const scale = entry[2] / 100;
      return { x: center.x + Math.cos(angle) * radius * scale, y: center.y + Math.sin(angle) * radius * scale };
    });
    drawPolygon(ctx, dataPoints);
    ctx.fillStyle = 'rgba(24, 126, 105, 0.22)';
    ctx.fill();
    ctx.strokeStyle = '#187e69';
    ctx.lineWidth = 2;
    ctx.stroke();
    dataPoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#cf5c43';
      ctx.fill();
    });

    ctx.fillStyle = '#31413c';
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    entries.forEach((entry, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2 / entries.length);
      const labelRadius = radius + 28;
      const x = center.x + Math.cos(angle) * labelRadius;
      const y = center.y + Math.sin(angle) * labelRadius;
      ctx.fillText(`${entry[1]} ${entry[2]}`, x, y);
    });
  }

  function drawPolygon(ctx, points) {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
  }

  function renderCompare() {
    const majors = state.compareIds.map(getMajor).filter(Boolean);
    updateCompareCounters();
    if (majors.length < 2) {
      elements.compareContent.innerHTML = `
        <div class="compare-empty">
          <strong>还需要选择 ${2 - majors.length} 个专业</strong>
          <p>回到专业地图，点开专业节点后加入对比。一次最多比较 4 个。</p>
          <div>${majors.map((major) => `<span>${escapeHTML(major.name)}</span>`).join('')}</div>
          <button class="button button-primary" type="button" data-action="catalog">返回专业地图</button>
        </div>
      `;
      return;
    }

    const comparisonRows = [
      ['专业定位', (major) => major.parent],
      ['专业类', (major) => `${major.discipline} · ${major.category}`],
      ['学制 / 学位', (major) => `${major.duration} / ${major.degree}`],
      ['规模参考', (major) => formatNumber(major.scale)],
      ['数学要求', (major) => scoreWithLabel(major.difficulty?.math)],
      ['物理要求', (major) => scoreWithLabel(major.difficulty?.physics)],
      ['编程要求', (major) => scoreWithLabel(major.difficulty?.coding)],
      ['实验/实操', (major) => scoreWithLabel(major.difficulty?.experiment)],
      ['深造依赖', (major) => scoreWithLabel(major.difficulty?.graduate)],
      ['主要课程', (major) => (major.modules || []).slice(0, 3).map((module) => (module.courses || []).slice(0, 2).join('、')).join('；') || '待补'],
      ['职业锚点', (major) => (major.careers || []).map((career) => career.name).join('、') || '待补'],
      ['适合学生', (major) => (major.suitable || []).slice(0, 3).join('；') || '待补'],
      ['核心风险', (major) => (major.risks || []).slice(0, state.role === 'public' ? 2 : 3).join('；') || '待补']
    ];

    elements.compareContent.innerHTML = `
      <div class="compare-table-shell">
        <table class="compare-table">
          <thead>
            <tr>
              <th>比较维度</th>
              ${majors.map((major) => `
                <th>
                  <span>${escapeHTML(major.code)}</span>
                  <strong>${escapeHTML(major.name)}</strong>
                  <button class="icon-button" type="button" data-action="compare-remove" data-id="${escapeHTML(major.id)}" aria-label="从对比中移除${escapeHTML(major.name)}" title="移除">×</button>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${comparisonRows.map(([label, getter]) => `
              <tr>
                <th>${escapeHTML(label)}</th>
                ${majors.map((major) => `<td>${escapeHTML(String(getter(major) || '—'))}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="compare-advice">
        <strong>咨询提示</strong>
        <p>专业对比不是选“分数最高”的一个，而是判断学生能否承受课程、是否愿意走对应培养路径，以及目标院校能否提供真正需要的平台。</p>
      </div>
    `;
  }

  function toggleCompare(id) {
    if (!getMajor(id)) return;
    if (state.compareIds.includes(id)) {
      removeCompare(id);
      return;
    }
    if (state.compareIds.length >= 4) {
      showToast('一次最多比较 4 个专业，请先移除一个。', 'warning');
      return;
    }
    state.compareIds.push(id);
    renderCatalog();
    renderTray();
    if (state.view === 'detail') renderDetail();
    if (state.view === 'compare') renderCompare();
    showToast(`已加入“${getMajor(id).name}”。`);
  }

  function removeCompare(id) {
    state.compareIds = state.compareIds.filter((item) => item !== id);
    renderCatalog();
    renderTray();
    if (state.view === 'detail') renderDetail();
    if (state.view === 'compare') renderCompare();
  }

  function renderTray() {
    const count = state.compareIds.length;
    elements.compareTray.hidden = count === 0 || state.trayCollapsed;
    elements.compareTrayToggle.hidden = count === 0 || !state.trayCollapsed;
    elements.compareTrayToggle.querySelector('span').textContent = count;
    elements.compareTrayHint.textContent = count < 2 ? '再选 1 个即可比较' : `已选 ${count} / 4`;
    elements.compareTrayItems.innerHTML = state.compareIds.map((id, index) => {
      const major = getMajor(id);
      if (!major) return '';
      return `
        <div>
          <span>${index + 1}</span>
          <strong>${escapeHTML(major.name)}</strong>
          <button class="icon-button" type="button" data-action="compare-remove" data-id="${escapeHTML(id)}" aria-label="移除${escapeHTML(major.name)}" title="移除">×</button>
        </div>
      `;
    }).join('');
    updateCompareCounters();
  }

  function updateCompareCounters() {
    const count = state.compareIds.length;
    elements.compareTabCount.textContent = count;
    elements.selectedCompareCount.textContent = count;
  }

  function renderMatrixControls(refreshMajor = true) {
    if (refreshMajor) {
      elements.matrixMajor.innerHTML = `<option value="all">全部专业</option>${state.majors.map((major) => `<option value="${escapeHTML(major.id)}">${escapeHTML(major.name)}</option>`).join('')}`;
      elements.matrixMajor.value = state.matrix.majorId;
    }
    const rows = getMatrixRows(false);
    const provinces = ['全部', ...new Set(rows.map((row) => row.province))];
    if (!provinces.includes(state.matrix.province)) state.matrix.province = '全部';
    elements.matrixProvince.innerHTML = provinces.map((province) => `<option value="${escapeHTML(province)}">${escapeHTML(province)}</option>`).join('');
    elements.matrixProvince.value = state.matrix.province;
    elements.matrixSearch.value = state.matrix.search;
  }

  function getMatrixRows(applyFilters = true) {
    const majors = state.matrix.majorId === 'all' ? state.majors : state.majors.filter((major) => major.id === state.matrix.majorId);
    let rows = majors.flatMap((major) => (major.universities || []).map((school) => ({ ...school, majorId: major.id, majorName: major.name })));
    if (!applyFilters) return rows;
    const search = state.matrix.search.toLowerCase();
    rows = rows.filter((row) => {
      const provinceMatches = state.matrix.province === '全部' || row.province === state.matrix.province;
      const searchMatches = !search || [row.name, row.strength, row.note, row.majorName].join(' ').toLowerCase().includes(search);
      return provinceMatches && searchMatches;
    });
    rows.sort((a, b) => {
      const levelOrder = { top: 0, feature: 1, local: 2 };
      return (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9) || a.name.localeCompare(b.name, 'zh-CN');
    });
    return rows;
  }

  function renderMatrix() {
    const rows = getMatrixRows(true);
    elements.matrixRows.innerHTML = rows.map((row) => `
      <tr>
        <td><strong>${escapeHTML(row.name)}</strong><small>${escapeHTML(row.city)}</small></td>
        <td>${escapeHTML(row.province)}</td>
        <td><span class="school-level level-${escapeHTML(row.level)}">${levelText(row.level)}</span></td>
        <td><button type="button" class="table-link" data-action="detail" data-id="${escapeHTML(row.majorId)}">${escapeHTML(row.majorName)}</button></td>
        <td>${escapeHTML(row.strength)}</td>
        <td>${escapeHTML(row.note)}</td>
        <td><span class="status-badge">待年度匹配</span></td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="table-empty">没有匹配的院校记录。</td></tr>';
  }

  function renderEditorControls() {
    const current = state.majors.some((major) => major.id === state.editorMajorId) ? state.editorMajorId : state.majors[0]?.id;
    state.editorMajorId = current || '';
    elements.editorMajorSelect.innerHTML = state.majors.map((major) => `<option value="${escapeHTML(major.id)}">${escapeHTML(major.code)} ${escapeHTML(major.name)}</option>`).join('');
    elements.editorMajorSelect.value = state.editorMajorId;
    fillEditorForm();
  }

  function fillEditorForm() {
    const major = getMajor(state.editorMajorId);
    if (!major || !elements.editorForm) return;
    const values = {
      name: major.name,
      code: major.code,
      discipline: major.discipline,
      category: major.category,
      duration: major.duration,
      degree: major.degree,
      academic: major.academic,
      parent: major.parent,
      student: major.student,
      risks: (major.risks || []).join('\n'),
      talkTrack: (major.talkTrack || []).join('\n'),
      internalNote: major.internalNote || ''
    };
    Object.entries(values).forEach(([name, value]) => {
      const field = elements.editorForm.elements[name];
      if (field) field.value = value;
    });
    elements.editorSaveHint.textContent = '已载入当前数据';
    elements.editorSaveHint.classList.remove('is-dirty');
    elements.editorSourceCard.innerHTML = `
      <strong>${escapeHTML(major.name)}的数据来源</strong>
      <p>${(major.sourceNames || []).slice(0, 5).map((name) => `<span>${escapeHTML(name)}</span>`).join('')}</p>
      <small>编辑后仅保存到当前浏览器。本地预览确认后，再设计数据库字段和审核流程。</small>
    `;
  }

  function saveEditorForm(event) {
    event.preventDefault();
    const major = getMajor(state.editorMajorId);
    if (!major) return;
    const form = new FormData(elements.editorForm);
    const lineList = (value) => String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    ['duration', 'degree', 'academic', 'parent', 'student', 'internalNote'].forEach((key) => {
      major[key] = String(form.get(key) || '').trim();
    });
    major.risks = lineList(form.get('risks'));
    major.talkTrack = lineList(form.get('talkTrack'));
    if (major.contentStatus === 'catalog') major.contentStatus = 'summary';
    if (!saveMajors()) return;
    renderCatalogIntegrity();
    renderCatalog();
    renderMatrixControls();
    renderMatrix();
    elements.editorSaveHint.textContent = `已保存 ${formatTime(new Date())}`;
    elements.editorSaveHint.classList.remove('is-dirty');
    showToast(`“${major.name}”已保存到当前浏览器。`);
  }

  function exportData() {
    const payload = {
      version: window.MAJOR_PREVIEW_VERSION || 'preview',
      exportedAt: new Date().toISOString(),
      majors: state.majors
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `本科专业讲解面板_${fileTimestamp(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast('专业数据 JSON 已导出。');
  }

  async function importData(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const majors = Array.isArray(parsed) ? parsed : parsed.majors;
      if (!Array.isArray(majors) || majors.length === 0) throw new Error('文件中没有 majors 数组');
      const nextMajors = reconcileWithOfficial(majors, { rejectUnknown: true });
      const previousMajors = state.majors;
      state.majors = nextMajors;
      if (!saveMajors()) {
        state.majors = previousMajors;
        throw new Error('浏览器存储失败，请先缩小导入内容或导出备份');
      }
      state.editorMajorId = state.majors[0].id;
      state.selectedMajorId = state.majors[0].id;
      state.compareIds = [];
      renderSourceStatus();
      renderCatalogIntegrity();
      renderCatalog();
      renderMatrixControls();
      renderMatrix();
      renderCompare();
      renderTray();
      renderEditorControls();
      showToast(`已导入 ${majors.length} 条讲解覆盖，官方 ${state.majors.length} 个专业目录保持完整。`);
    } catch (error) {
      showToast(`导入失败：${error.message}`, 'error');
    } finally {
      event.target.value = '';
    }
  }

  function resetData() {
    if (!window.confirm('确定恢复全部示例数据吗？当前浏览器中的编辑将被覆盖。')) return;
    state.majors = clone(BASE_DATA);
    state.editorMajorId = state.majors[0]?.id || '';
    state.selectedMajorId = state.majors[0]?.id || '';
    state.compareIds = [];
    safeRemove(STORAGE_KEY);
    renderSourceStatus();
    renderCatalogIntegrity();
    renderCatalog();
    renderMatrixControls();
    renderMatrix();
    renderCompare();
    renderTray();
    renderEditorControls();
    showToast('已恢复教育部目录与本地讲解数据。');
  }

  function buildCompleteMajors(catalog, curated) {
    const officialRows = Array.isArray(catalog) ? clone(catalog) : [];
    const curatedRows = Array.isArray(curated) ? clone(curated) : [];
    if (!officialRows.length) return curatedRows.map((major) => ({ ...major, contentStatus: 'curated' }));

    const curatedByCode = new Map(curatedRows.map((major) => [String(major.code || ''), major]));
    const merged = officialRows.map((official) => {
      const rich = curatedByCode.get(String(official.code || ''));
      if (!rich) return official;
      curatedByCode.delete(String(official.code || ''));
      const merged = {
        ...official,
        ...rich,
        contentStatus: 'curated',
        sourceNames: [...new Set([...(official.sourceNames || []), ...(rich.sourceNames || [])])]
      };
      IDENTITY_FIELDS.forEach((key) => { merged[key] = cloneIfDefined(official[key]); });
      return merged;
    });
    if (curatedByCode.size) {
      console.warn('已忽略不在教育部2026目录中的讲解记录：', [...curatedByCode.keys()]);
    }
    return merged.sort((a, b) => String(a.code).localeCompare(String(b.code), 'zh-CN'));
  }

  function auditCatalog(majors) {
    const officialByCode = new Map(OFFICIAL_CATALOG.map((major) => [String(major.code || ''), major]));
    const codeCounts = majors.reduce((counts, major) => {
      const code = String(major.code || '');
      counts.set(code, (counts.get(code) || 0) + 1);
      return counts;
    }, new Map());
    const loadedByCode = new Map(majors.map((major) => [String(major.code || ''), major]));
    const duplicateCodes = [...codeCounts].filter(([, count]) => count > 1).map(([code]) => code);
    const missingCodes = [...officialByCode.keys()].filter((code) => !loadedByCode.has(code));
    const unknownCodes = [...loadedByCode.keys()].filter((code) => !officialByCode.has(code));
    const identityMismatches = [];
    loadedByCode.forEach((major, code) => {
      const official = officialByCode.get(code);
      if (!official) return;
      if (IDENTITY_FIELDS.some((key) => JSON.stringify(major[key]) !== JSON.stringify(official[key]))) {
        identityMismatches.push(code);
      }
    });
    const disciplineCount = new Set(majors.map((major) => major.disciplineCode).filter(Boolean)).size;
    const categoryCount = new Set(majors.map((major) => major.categoryCode).filter(Boolean)).size;
    const directMajorCount = majors.filter((major) => !major.categoryCode).length;
    const majorCount = majors.length;
    return {
      valid: majorCount === EXPECTED_CATALOG.majors
        && disciplineCount === EXPECTED_CATALOG.disciplines
        && categoryCount === EXPECTED_CATALOG.categories
        && directMajorCount === EXPECTED_CATALOG.directMajors
        && duplicateCodes.length === 0
        && missingCodes.length === 0
        && unknownCodes.length === 0
        && identityMismatches.length === 0,
      majorCount,
      disciplineCount,
      categoryCount,
      directMajorCount,
      duplicateCodes,
      missingCodes,
      unknownCodes,
      identityMismatches
    };
  }

  function reconcileWithOfficial(candidateMajors, options = {}) {
    const patches = Array.isArray(candidateMajors) ? candidateMajors : [];
    validateImportPatches(patches);
    const baseByCode = new Map(BASE_DATA.map((major) => [String(major.code || ''), major]));
    const patchByCode = new Map();
    const duplicateCodes = [];
    const unknownCodes = [];
    patches.forEach((patch) => {
      const code = String(patch && patch.code || '').trim();
      if (!code) return;
      if (!baseByCode.has(code)) {
        unknownCodes.push(code);
        return;
      }
      if (patchByCode.has(code)) duplicateCodes.push(code);
      patchByCode.set(code, patch);
    });
    if (duplicateCodes.length) throw new Error(`导入文件存在重复专业代码：${[...new Set(duplicateCodes)].slice(0, 8).join('、')}`);
    if (options.rejectUnknown && unknownCodes.length) throw new Error(`导入文件包含非2026官方目录专业：${[...new Set(unknownCodes)].slice(0, 8).join('、')}`);
    return BASE_DATA.map((base) => {
      const patch = patchByCode.get(String(base.code || ''));
      if (!patch) return clone(base);
      const merged = { ...clone(base), ...clone(patch) };
      IDENTITY_FIELDS.forEach((key) => { merged[key] = cloneIfDefined(base[key]); });
      return merged;
    });
  }

  function validateImportPatches(patches) {
    patches.forEach((patch, patchIndex) => {
      const label = `第 ${patchIndex + 1} 条专业记录`;
      if (!isPlainRecord(patch)) throw new Error(`${label}必须是 JSON 对象`);
      if (typeof patch.code !== 'string' || !patch.code.trim()) throw new Error(`${label}缺少字符串专业代码 code`);

      Object.entries(patch).forEach(([key, value]) => {
        if (!IMPORT_ALLOWED_FIELDS.has(key)) throw new Error(`${label}包含未知字段 ${key}`);
        if (IMPORT_STRING_FIELDS.includes(key)) {
          if (typeof value !== 'string') throw new Error(`${label}的 ${key} 必须是字符串`);
          return;
        }
        if (IMPORT_STRING_ARRAY_FIELDS.includes(key)) {
          validateStringArray(value, `${label}的 ${key}`);
          return;
        }
        if (IMPORT_OBJECT_ARRAY_FIELDS.includes(key)) {
          validateObjectArray(value, key, `${label}的 ${key}`);
          return;
        }
        if (key === 'officialYear') {
          if (!Number.isInteger(value)) throw new Error(`${label}的 officialYear 必须是整数`);
          return;
        }
        if (key === 'scale') {
          if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error(`${label}的 scale 必须是非负数字或 null`);
          return;
        }
        if (key === 'difficulty') {
          validateNumberRecord(value, ['math', 'physics', 'coding', 'experiment', 'english', 'graduate'], `${label}的 difficulty`, true);
          return;
        }
        if (key === 'fieldCoverage') {
          validateBooleanRecord(value, ['majorDetail', 'classDetail', 'courses', 'careers', 'universities'], `${label}的 fieldCoverage`);
        }
      });

      if (patch.contentStatus !== undefined && !CONTENT_STATUSES.has(patch.contentStatus)) {
        throw new Error(`${label}的 contentStatus 无效`);
      }
    });
  }

  function validateStringArray(value, label) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new Error(`${label} 必须是字符串数组`);
    }
  }

  function validateObjectArray(value, field, label) {
    if (!Array.isArray(value)) throw new Error(`${label} 必须是对象数组`);
    const schemas = {
      careers: { strings: ['name', 'attribute', 'work', 'employers', 'skills', 'upside', 'risk'], arrays: [] },
      modules: { strings: ['name', 'value'], arrays: ['courses'] },
      universities: { strings: ['name', 'province', 'city', 'level', 'strength', 'note'], arrays: [] }
    };
    const schema = schemas[field];
    const allowed = new Set([...(schema?.strings || []), ...(schema?.arrays || [])]);
    value.forEach((item, itemIndex) => {
      const itemLabel = `${label} 第 ${itemIndex + 1} 项`;
      if (!isPlainRecord(item)) throw new Error(`${itemLabel} 必须是对象`);
      Object.entries(item).forEach(([key, nestedValue]) => {
        if (!allowed.has(key)) throw new Error(`${itemLabel} 包含未知字段 ${key}`);
        if (schema.strings.includes(key) && typeof nestedValue !== 'string') throw new Error(`${itemLabel}的 ${key} 必须是字符串`);
        if (schema.arrays.includes(key)) validateStringArray(nestedValue, `${itemLabel}的 ${key}`);
      });
    });
  }

  function validateNumberRecord(value, allowedKeys, label, allowNull = false) {
    if (allowNull && value === null) return;
    if (!isPlainRecord(value)) throw new Error(`${label} 必须是对象${allowNull ? '或 null' : ''}`);
    Object.entries(value).forEach(([key, number]) => {
      if (!allowedKeys.includes(key)) throw new Error(`${label} 包含未知字段 ${key}`);
      if (!Number.isFinite(number) || number < 0 || number > 100) throw new Error(`${label}的 ${key} 必须是 0 到 100 的数字`);
    });
  }

  function validateBooleanRecord(value, allowedKeys, label) {
    if (!isPlainRecord(value)) throw new Error(`${label} 必须是对象`);
    Object.entries(value).forEach(([key, flag]) => {
      if (!allowedKeys.includes(key)) throw new Error(`${label} 包含未知字段 ${key}`);
      if (typeof flag !== 'boolean') throw new Error(`${label}的 ${key} 必须是布尔值`);
    });
  }

  function isPlainRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function contentStatusRank(major) {
    return ({ curated: 0, major: 1, summary: 1, class: 2, catalog: 3 })[major.contentStatus] ?? 4;
  }

  function contentStatusLabel(status) {
    return ({
      curated: '完整讲解',
      major: '专业级详解',
      summary: '基础详解',
      class: '专业类参考',
      catalog: '目录已收录·待补'
    })[status] || '目录已收录·待补';
  }

  function contentStatusDescription(status) {
    return ({
      curated: '已接入课程、学习特征、职业地图、适配建议和代表院校，可用于现场完整讲解。',
      major: '已按专业代码或专业名称精确命中本地详解资料；课程、职业和院校字段按明确专业类映射补充。',
      summary: '已与本地专业详解资料精确匹配，现有定义、通俗解释、规模和风险底稿可供初步讲解。',
      class: '官方专业身份已核对，当前讲解来自同一专业类的共性资料；不能代替该专业的独立培养方案。',
      catalog: '专业代码、名称、门类和专业类已按教育部目录核对；详细内容尚未完成可靠资料复核。'
    })[status] || '专业目录身份已核对，详细内容待补。';
  }

  function renderFieldCoverage(major) {
    const coverage = major.fieldCoverage || {};
    const fields = [
      ['majorDetail', '专业详解', ['curated', 'major', 'summary'].includes(major.contentStatus)],
      ['classDetail', '专业类资料', Boolean(major.categoryCode && major.contentStatus !== 'catalog')],
      ['courses', '课程', Boolean((major.modules || []).length)],
      ['careers', '职业', Boolean((major.careers || []).length)],
      ['universities', '院校', Boolean((major.universities || []).length)]
    ];
    return `
      <div class="source-coverage" aria-label="内容字段覆盖情况">
        ${fields.map(([key, label, fallback]) => {
          const ready = Boolean(coverage[key] || fallback);
          return `<span class="${ready ? 'is-ready' : 'is-pending'}">${escapeHTML(label)} · ${ready ? '已接入' : '待补'}</span>`;
        }).join('')}
      </div>
    `;
  }

  function hasDifficulty(major) {
    return averageDifficulty(major) !== null;
  }

  function renderContentPlaceholder(title, description) {
    return `<div class="content-placeholder"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(description)}</span></div>`;
  }

  function numericSortValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : -1;
  }

  function renderBulletList(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<div class="content-placeholder is-compact"><strong>待补</strong><span>需要结合课程与培养要求继续核验。</span></div>';
    }
    return `<ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`;
  }

  function averageDifficulty(major) {
    const values = Object.values(major.difficulty || {}).map(Number).filter(Number.isFinite);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  }

  function scoreWithLabel(score) {
    if (score === null || score === undefined || score === '') return '待补';
    const value = Number(score);
    if (!Number.isFinite(value)) return '待补';
    const label = value >= 85 ? '高' : value >= 65 ? '中高' : value >= 40 ? '中等' : '较低';
    return `${value} / 100（${label}）`;
  }

  function getMajor(id) {
    return state.majors.find((major) => major.id === id);
  }

  function levelText(level) {
    return ({ top: '头部平台', feature: '行业特色', local: '省内选择' })[level] || '代表院校';
  }

  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('zh-CN') : '—';
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
  }

  function fileTimestamp(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function shorten(value, length) {
    const text = String(value || '');
    return text.length > length ? `${text.slice(0, length)}…` : text;
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cloneIfDefined(value) {
    return value === undefined ? undefined : clone(value);
  }

  function loadMajors() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return clone(BASE_DATA);
      const parsed = JSON.parse(stored);
      const overrides = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.overrides) ? parsed.overrides : [];
      return overrides.length ? reconcileWithOfficial(overrides) : clone(BASE_DATA);
    } catch (error) {
      return clone(BASE_DATA);
    }
  }

  function saveMajors() {
    try {
      const baseByCode = new Map(BASE_DATA.map((major) => [String(major.code || ''), major]));
      const identityKeys = new Set(IDENTITY_FIELDS);
      const overrides = state.majors.map((major) => {
        const base = baseByCode.get(String(major.code || ''));
        if (!base) return null;
        const override = { code: base.code };
        Object.keys(major).forEach((key) => {
          if (identityKeys.has(key)) return;
          if (JSON.stringify(major[key]) !== JSON.stringify(base[key])) override[key] = cloneIfDefined(major[key]);
        });
        return Object.keys(override).length > 1 ? override : null;
      }).filter(Boolean);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, overrides }));
      return true;
    } catch (error) {
      showToast('浏览器存储失败，请先导出 JSON 备份。', 'error');
      return false;
    }
  }

  function safeRead(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function safeWrite(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* Ignore preview storage errors. */ }
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (error) { /* Ignore preview storage errors. */ }
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    elements.toastRegion.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 220);
    }, 2800);
  }
}());
