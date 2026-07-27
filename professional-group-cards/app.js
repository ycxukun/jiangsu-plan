(() => {
  "use strict";

  const DATA_VERSION = "20260727-r1";
  const STATUS_ORDER = ["retained", "deleted", "added", "anomaly"];
  const STATUS_LABELS = {
    retained: "黑色延续",
    deleted: "灰色删减 / 转出",
    added: "绿色新增 / 转入",
    anomaly: "红色结构异常",
  };
  const state = {
    index: null,
    activeId: "",
    schoolCache: new Map(),
    chunkCache: new Map(),
  };

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[char],
    );
  const numberOrNull = (value) =>
    value === null || value === undefined || value === ""
      ? null
      : Number.isFinite(Number(value))
        ? Number(value)
        : null;
  const fmtNumber = (value) => {
    const number = numberOrNull(value);
    return number === null ? "—" : number.toLocaleString("zh-CN");
  };
  const fmtSigned = (value) => {
    const number = numberOrNull(value);
    if (number === null) return "—";
    if (number > 0) return `+${number.toLocaleString("zh-CN")}`;
    return number.toLocaleString("zh-CN");
  };
  const signedClass = (value) => {
    const number = numberOrNull(value);
    if (number === null || number === 0) return "zero";
    return number > 0 ? "positive" : "negative";
  };
  const fmtScoreRank = (score, rank) => {
    const parts = [];
    if (numberOrNull(score) !== null) parts.push(`${fmtNumber(score)}分`);
    if (numberOrNull(rank) !== null) parts.push(`${fmtNumber(rank)}位`);
    return parts.length ? parts.join(" / ") : "—";
  };
  const normalizeSearch = (value) =>
    String(value ?? "")
      .trim()
      .toLocaleLowerCase("zh-CN")
      .replace(/[\s（）()·]/g, "");
  const statusCountHTML = (status) =>
    STATUS_ORDER.map(
      (kind) =>
        `<span class="status-count ${kind}">${esc(STATUS_LABELS[kind])} ${fmtNumber(status?.[kind] ?? 0)}</span>`,
    ).join("");

  function currentIndexSchool() {
    return state.index?.schools.find(
      (school) => school.id === state.activeId,
    );
  }

  function schoolFromParam() {
    const value = new URLSearchParams(location.search).get("school");
    if (!value || !state.index) return null;
    const decoded = value.trim();
    return (
      state.index.schools.find(
        (school) => school.id === decoded || school.name === decoded,
      ) ?? null
    );
  }

  function updateRoute(school, replace = false) {
    const url = new URL(location.href);
    if (school) url.searchParams.set("school", school.name);
    else url.searchParams.delete("school");
    const method = replace ? "replaceState" : "pushState";
    history[method]({ school: school?.name ?? "" }, "", url);
  }

  function directorySchools() {
    if (!state.index) return [];
    const query = normalizeSearch($("#schoolSearch")?.value);
    const scope = $("#schoolScope")?.value ?? "current";
    return state.index.schools.filter((school) => {
      if (scope === "current" && school.oldOnly) return false;
      if (scope === "old-only" && !school.oldOnly) return false;
      return !query || normalizeSearch(school.name).includes(query);
    });
  }

  function renderDirectory() {
    const list = $("#schoolList");
    if (!list || !state.index) return;
    const schools = directorySchools();
    $("#directoryMeta").textContent =
      schools.length === state.index.schools.length
        ? `共 ${fmtNumber(schools.length)} 所，按2026最高投档分排序`
        : `当前找到 ${fmtNumber(schools.length)} 所院校`;
    if (!schools.length) {
      list.innerHTML =
        '<li class="list-empty">没有匹配的院校，请换一个关键词。</li>';
      return;
    }
    list.innerHTML = schools
      .map(
        (school) => `
          <li>
            <button
              class="school-button ${school.id === state.activeId ? "active" : ""} ${school.oldOnly ? "old-only" : ""}"
              type="button"
              data-school-id="${esc(school.id)}"
              aria-current="${school.id === state.activeId ? "true" : "false"}"
            >
              <span class="school-name">${esc(school.name)}</span>
              <span class="school-score">${school.oldOnly ? "25年停设" : `${fmtNumber(school.maxScore26)}分`}</span>
              <span class="school-meta">26组 ${fmtNumber(school.currentGroupCount)} · 物理 ${fmtNumber(school.physicsGroupCount)} / 历史 ${fmtNumber(school.historyGroupCount)} · 计划 ${fmtSigned(school.planDelta)}</span>
            </button>
          </li>`,
      )
      .join("");
  }

  function updateWelcome() {
    const totals = state.index?.totals;
    if (!totals) return;
    $("#welcomeSchools").textContent = fmtNumber(totals.schools);
    $("#welcomeGroups").textContent = fmtNumber(totals.currentGroups);
    $("#welcomePlanDelta").textContent = fmtSigned(totals.planDelta);
    $("#welcomeChanges").textContent = fmtNumber(
      (totals.status?.added ?? 0) + (totals.status?.deleted ?? 0),
    );
    const generated = new Date(state.index.generatedAt);
    const stamp = Number.isNaN(generated.getTime())
      ? "2026数据"
      : `网页整理 ${generated.toLocaleDateString("zh-CN")}`;
    $("#dataStamp").textContent =
      `${stamp} · ${fmtNumber(totals.schools)} 所院校 · ${fmtNumber(totals.currentGroups)} 个26专业组`;
  }

  async function loadChunk(bucket) {
    if (state.chunkCache.has(bucket)) {
      return state.chunkCache.get(bucket);
    }
    const promise = fetch(
      `./data/chunks/${encodeURIComponent(bucket)}.json?v=${DATA_VERSION}`,
      { credentials: "same-origin" },
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(`数据分块读取失败（${response.status}）`);
      }
      return response.json();
    });
    state.chunkCache.set(bucket, promise);
    try {
      return await promise;
    } catch (error) {
      state.chunkCache.delete(bucket);
      throw error;
    }
  }

  async function loadSchool(indexSchool) {
    if (state.schoolCache.has(indexSchool.id)) {
      return state.schoolCache.get(indexSchool.id);
    }
    const chunk = await loadChunk(indexSchool.bucket);
    const school = chunk?.schools?.[indexSchool.id];
    if (!school) {
      throw new Error("院校数据未在分块中找到");
    }
    state.schoolCache.set(indexSchool.id, school);
    return school;
  }

  function metricHTML(value, label, className = "") {
    return `<div class="summary-item"><b class="${className}">${esc(value)}</b><span>${esc(label)}</span></div>`;
  }

  function groupMetricHTML(value, label, className = "") {
    return `<div class="group-metric"><b class="${className}">${esc(value)}</b><span>${esc(label)}</span></div>`;
  }

  function majorRowHTML(row) {
    const sameName =
      row.name26 &&
      row.name25 &&
      normalizeSearch(row.name26) === normalizeSearch(row.name25);
    const oldName =
      row.name26 && row.name25 && !sameName
        ? `<span class="old-name">25年：${esc(row.name25)}</span>`
        : "";
    const riskBits = [row.risk, row.basis].filter(Boolean);
    const adviceTitle = row.advice ? ` title="${esc(row.advice)}"` : "";
    const riskCopy = riskBits.length
      ? `<span class="risk-copy"${adviceTitle}>${esc(riskBits.join("｜"))}</span>`
      : "";
    return `
      <tr class="major-row ${esc(row.statusKind)}">
        <td class="major-name">${esc(row.name || "未命名专业")}${oldName}</td>
        <td><span class="row-status">${esc(row.status)}</span></td>
        <td class="number-cell">${fmtNumber(row.plan26)}</td>
        <td class="number-cell">${fmtNumber(row.plan25)}</td>
        <td class="number-cell ${signedClass(row.planDelta)}">${fmtSigned(row.planDelta)}</td>
        <td class="number-cell">${esc(fmtScoreRank(row.score25, row.rank25))}</td>
        <td>${esc(row.category || "—")}${riskCopy}</td>
      </tr>`;
  }

  function groupCardHTML(group) {
    const title = group.retired
      ? `2025 ${group.group25 ?? "—"}组（2026未独立设置）`
      : `2026 ${group.group26 ?? "—"}组 → 2025 ${group.group25 ?? "新增"}组`;
    const requirementParts = [];
    if (group.requirement26) {
      requirementParts.push(`26再选：${group.requirement26}`);
    }
    if (
      group.requirement25 &&
      group.requirement25 !== group.requirement26
    ) {
      requirementParts.push(`25再选：${group.requirement25}`);
    }
    const coverage =
      group.group25 && !group.retired
        ? `${Math.round((group.coverage ?? 0) * 100)}%`
        : "—";
    const planDelta = group.plans?.delta;
    const sourcePlanDifferent =
      !group.retired &&
      numberOrNull(group.plans?.sourceGroupPlan26) !== null &&
      numberOrNull(group.plans?.sourceGroupPlan26) !==
        numberOrNull(group.plans?.plan26);
    const notes = [
      group.matchNote,
      group.plans?.comparison === "拆并组参考"
        ? "该组涉及拆分或合并，组计划增减仅作结构参考。"
        : "",
      sourcePlanDifferent
        ? `专业明细计划合计为${fmtNumber(group.plans.plan26)}，投档线表组计划为${fmtNumber(group.plans.sourceGroupPlan26)}；本页按专业明细统计。`
        : "",
    ].filter(Boolean);
    return `
      <article class="group-card ${group.retired ? "retired-group" : ""}">
        <div class="group-top">
          <div class="group-title">
            <h4>${esc(title)}</h4>
            <p>${esc(requirementParts.join("｜") || `再选：${group.requirement25 || "—"}`)}</p>
            <div class="group-badges">
              <span class="pill structure">${esc(group.structure)}</span>
              <span class="pill ${["低", "新增或低重合", "2025组未独立延续"].includes(group.matchConfidence) ? "low-confidence" : ""}">匹配 ${esc(group.matchConfidence || "—")}</span>
              <span class="pill">专业覆盖 ${esc(coverage)}</span>
              ${group.retired ? '<span class="pill retired">25年组保留追踪</span>' : ""}
            </div>
          </div>
          <div class="group-metrics">
            ${groupMetricHTML(
              `${fmtNumber(group.plans?.plan26)} / ${fmtNumber(group.plans?.plan25)}`,
              "26组计划 / 25组计划",
            )}
            ${groupMetricHTML(
              fmtSigned(planDelta),
              `计划增减 · ${group.plans?.comparison ?? "—"}`,
              signedClass(planDelta),
            )}
            ${groupMetricHTML(
              fmtScoreRank(group.cutoff26?.score, group.cutoff26?.rank),
              "26投档分 / 位次",
            )}
            ${groupMetricHTML(
              fmtScoreRank(group.baseline25?.score, group.baseline25?.rank),
              "25对应组最低分 / 位次",
            )}
          </div>
        </div>
        ${notes.length ? `<p class="group-note">${esc(notes.join(" "))}</p>` : ""}
        <div class="major-table-wrap">
          <table class="major-table">
            <colgroup><col><col><col><col><col><col><col></colgroup>
            <thead>
              <tr>
                <th>专业名称</th>
                <th>变化状态</th>
                <th>26计划</th>
                <th>25计划</th>
                <th>增减</th>
                <th>25专业最低分 / 位次</th>
                <th>专业类 / 风险提示</th>
              </tr>
            </thead>
            <tbody>${group.rows.map(majorRowHTML).join("")}</tbody>
          </table>
        </div>
      </article>`;
  }

  function subjectSectionHTML(section) {
    const currentGroups = section.groups.filter(
      (group) => !group.retired,
    ).length;
    const retiredGroups = section.groups.length - currentGroups;
    const className = section.subject === "物理" ? "physics" : "history";
    return `
      <section id="subject-${esc(section.subject)}" class="subject-section">
        <div class="subject-heading ${className}">
          <h3>${esc(section.subject)}类专业组</h3>
          <span>26组 ${fmtNumber(currentGroups)} · 25未独立延续 ${fmtNumber(retiredGroups)}</span>
        </div>
        <div class="group-stack">
          ${section.groups.map(groupCardHTML).join("")}
        </div>
      </section>`;
  }

  function sourceBoxHTML() {
    const sources = state.index?.sources ?? [];
    return `
      <div class="source-box">
        <b>数据与匹配口径：</b>${esc(state.index?.sourceNote ?? "")}
        ${sources.length ? `<br>来源：${sources.map((source) => esc(`${source.role}《${source.file}》`)).join("；")}` : ""}
      </div>`;
  }

  function renderSchool(school) {
    const summary = school.summary;
    const status = summary.status ?? {};
    const subjectNav = school.subjects
      .map(
        (section) =>
          `<a href="#subject-${esc(section.subject)}">${esc(section.subject)}类 · ${fmtNumber(section.groups.filter((group) => !group.retired).length)}组</a>`,
      )
      .join("");
    $("#schoolView").innerHTML = `
      <section class="school-masthead">
        <div class="school-title-row">
          <div>
            <p class="section-kicker">2026 专业组变化卡 · 物理类＋历史类</p>
            <h2>${esc(school.name)}</h2>
            <p class="school-subtitle">26专业组 ${fmtNumber(summary.currentGroupCount)}（物理 ${fmtNumber(summary.physicsGroupCount)} / 历史 ${fmtNumber(summary.historyGroupCount)}）｜25未独立延续组 ${fmtNumber(summary.retiredGroupCount)}｜打印时仅输出本校完整内容。</p>
          </div>
        </div>
        <div class="summary-ribbon">
          ${metricHTML(fmtNumber(summary.currentGroupCount), "2026专业组")}
          ${metricHTML(fmtNumber(summary.retiredGroupCount), "25未独立延续组")}
          ${metricHTML(fmtNumber(summary.plan26), "2026专业明细计划")}
          ${metricHTML(fmtNumber(summary.plan25), "2025专业明细计划")}
          ${metricHTML(
            fmtSigned(summary.planDelta),
            "全校计划增减",
            signedClass(summary.planDelta),
          )}
          ${metricHTML(
            summary.maxScore26 === null
              ? "—"
              : `${fmtNumber(summary.maxScore26)}分`,
            "2026最高投档分",
          )}
        </div>
        <div class="school-status-line">${statusCountHTML(status)}</div>
      </section>
      <nav class="subject-nav screen-only" aria-label="本科科类快捷定位">${subjectNav}</nav>
      ${school.subjects.map(subjectSectionHTML).join("")}
      ${sourceBoxHTML()}
    `;
    document.title = `${school.name}｜2026专业组变化卡｜知行学录`;
    $("#printButton").disabled = false;
    $("#mobileActiveSchool").textContent = school.name;
  }

  function renderLoadError(school, error) {
    $("#schoolView").innerHTML = `
      <div class="load-error">
        <h2>${esc(school.name)} 暂时没有加载成功</h2>
        <p>${esc(error?.message || "请刷新页面后重试。")}</p>
        <button id="retrySchool" class="primary-button" type="button">重新读取</button>
      </div>`;
    $("#retrySchool")?.addEventListener("click", () => {
      state.chunkCache.delete(school.bucket);
      state.schoolCache.delete(school.id);
      selectSchool(school.id, { updateHistory: false });
    });
  }

  function setDirectoryOpen(open) {
    $("#schoolDirectory")?.classList.toggle("open", open);
    document.body.classList.toggle("directory-open", open);
    $("#directoryToggle")?.setAttribute(
      "aria-expanded",
      open ? "true" : "false",
    );
  }

  async function selectSchool(
    schoolId,
    { updateHistory = true, replaceHistory = false, focus = true } = {},
  ) {
    const indexSchool = state.index?.schools.find(
      (school) => school.id === schoolId,
    );
    if (!indexSchool) return;
    state.activeId = indexSchool.id;
    renderDirectory();
    setDirectoryOpen(false);
    $("#printButton").disabled = true;
    $("#mobileActiveSchool").textContent = indexSchool.name;
    $("#schoolView").innerHTML =
      '<div class="loading-card"><span>正在整理这所学校的完整专业组卡…</span></div>';
    if (updateHistory) updateRoute(indexSchool, replaceHistory);
    try {
      const school = await loadSchool(indexSchool);
      if (state.activeId !== indexSchool.id) return;
      renderSchool(school);
      if (focus) {
        $("#schoolView").scrollIntoView({ block: "start" });
        $("#schoolView").focus({ preventScroll: true });
      }
    } catch (error) {
      if (state.activeId !== indexSchool.id) return;
      renderLoadError(indexSchool, error);
    }
  }

  function bindEvents() {
    $("#schoolSearch")?.addEventListener("input", renderDirectory);
    $("#schoolScope")?.addEventListener("change", renderDirectory);
    $("#schoolList")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-school-id]");
      if (button) selectSchool(button.dataset.schoolId);
    });
    $(".quick-schools")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-school-name]");
      if (!button) return;
      const school = state.index?.schools.find(
        (item) => item.name === button.dataset.schoolName,
      );
      if (school) selectSchool(school.id);
    });
    $("#printButton")?.addEventListener("click", () => {
      if (state.activeId) window.print();
    });
    $("#directoryToggle")?.addEventListener("click", () => {
      setDirectoryOpen(
        !$("#schoolDirectory")?.classList.contains("open"),
      );
    });
    $("#schoolView")?.addEventListener("click", () => {
      if (matchMedia("(max-width: 860px)").matches) {
        setDirectoryOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setDirectoryOpen(false);
    });
    window.addEventListener("popstate", () => {
      const school = schoolFromParam();
      if (school) {
        selectSchool(school.id, {
          updateHistory: false,
          focus: false,
        });
      }
    });
  }

  async function init() {
    bindEvents();
    try {
      const response = await fetch(
        `./data/index.json?v=${DATA_VERSION}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) {
        throw new Error(`院校目录读取失败（${response.status}）`);
      }
      state.index = await response.json();
      updateWelcome();
      renderDirectory();
      const requested = schoolFromParam();
      if (requested) {
        await selectSchool(requested.id, {
          updateHistory: false,
          replaceHistory: true,
          focus: false,
        });
      }
    } catch (error) {
      $("#dataStamp").textContent = "数据读取失败";
      $("#schoolView").innerHTML = `
        <div class="load-error">
          <h2>专业组卡数据暂时没有加载成功</h2>
          <p>${esc(error?.message || "请稍后刷新页面。")}</p>
        </div>`;
    }
  }

  init();
})();
