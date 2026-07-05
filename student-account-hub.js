/*!
 * Student Account Hub
 * 用途：把顶部学生、账号、志愿表、退出登录聚合成一个“学生个人中心”入口。
 * 说明：本文件不侵入 app.js 内部私有函数，只复用页面上已有按钮与本地存储，便于安全回滚。
 */
(function(){
  'use strict';

  const AUTH_KEY = 'js-plan-auth-v1';
  const STUDENT_KEY = 'js-plan-current-student-v1';
  const HUB_ID = 'studentAccountHub';
  const BODY_OPEN_CLASS = 'student-account-menu-open';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  }[ch]));

  function readJSON(key, fallback=null){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(err){
      return fallback;
    }
  }

  function readAuth(){
    const data = readJSON(AUTH_KEY, {});
    return data && data.user ? data : { accessToken:'', refreshToken:'', user:null };
  }

  function currentStudentKey(auth){
    const userId = auth?.user?.id;
    return userId ? `${STUDENT_KEY}:${userId}` : STUDENT_KEY;
  }

  function readCurrentStudent(){
    const auth = readAuth();
    return readJSON(currentStudentKey(auth), null) || readJSON(STUDENT_KEY, null);
  }

  function normalizeSubjectChoices(values){
    const alias = {
      '化':'化学','化学':'化学',
      '生':'生物','生物':'生物',
      '政':'政治','政治':'政治','思想政治':'政治',
      '地':'地理','地理':'地理'
    };
    const raw = Array.isArray(values) ? values : String(values || '').split(/[，,、\s/+]+/);
    const out = [];
    raw.forEach(v => {
      const t = alias[String(v || '').trim()];
      if(t && !out.includes(t)) out.push(t);
    });
    return out;
  }

  function subjectTypeLabel(v){
    return (v === 'history' || v === '历史') ? '历史' : '物理';
  }

  function stageLabel(v){
    return (v === 'specialty' || v === '专科') ? '专科' : '本科';
  }

  function studentSubjectLine(student){
    if(!student) return '尚未选择学生';
    const choices = normalizeSubjectChoices(student.subject_choices || student.subjectChoices);
    return `${subjectTypeLabel(student.subject_type)}${choices.length ? '+' + choices.join('+') : '+未填再选'}`;
  }

  function medicalLine(student){
    const codes = Array.isArray(student?.medical_codes)
      ? student.medical_codes
      : String(student?.medical_codes || '').split(/[，,、\s/+]+/).filter(Boolean);
    return codes.length ? `体检${codes.join('/')}` : '体检未填';
  }

  function compactStudentSummary(student){
    if(!student) return '尚未选择当前学生';
    const parts = [
      studentSubjectLine(student),
      student.score ? `${student.score}分` : '分数未填',
      medicalLine(student)
    ];
    return parts.join('｜');
  }

  function detailStudentSummary(student){
    if(!student) return '尚未选择学生';
    const parts = [
      `${stageLabel(student.stage)}档案`,
      studentSubjectLine(student),
      student.score ? `${student.score}分` : '分数未填',
      student.rank ? `位次 ${student.rank}` : '位次未填',
      medicalLine(student)
    ];
    return parts.join('｜');
  }

  function emailShort(email){
    return String(email || '').split('@')[0] || '已登录账号';
  }

  function volunteerCountText(){
    const source = $('#volunteerPanelBtn');
    const text = source ? source.textContent.trim() : '';
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    if(match) return `${match[1]}/${match[2]}`;
    return '0/40';
  }

  function avatarText(student, auth){
    if(student?.name) return String(student.name).trim().slice(-1);
    if(auth?.user?.email) return emailShort(auth.user.email).slice(0,1).toUpperCase();
    return '学';
  }

  function sourceButton(id){
    return document.getElementById(id);
  }

  function clickSource(id){
    const btn = sourceButton(id);
    if(btn){
      btn.click();
      return true;
    }
    return false;
  }

  function hideSourceButtons(){
    ['studentPanelBtn','accountBtn','logoutHeaderBtn','volunteerPanelBtn'].forEach(id => {
      const el = sourceButton(id);
      if(el) el.classList.add('student-hub-source-hidden');
    });
  }

  function ensureHub(){
    const topActions = $('.top-actions');
    if(!topActions) return null;

    let hub = document.getElementById(HUB_ID);
    if(hub) return hub;

    hub = document.createElement('div');
    hub.id = HUB_ID;
    hub.className = 'student-account-hub';
    hub.innerHTML = `
      <button id="studentAccountTrigger" class="student-account-trigger" type="button" aria-expanded="false">
        <span id="studentAccountAvatar" class="student-avatar-badge">学</span>
        <span class="student-account-text">
          <b id="studentAccountTitle">登录/申请开通</b>
          <small id="studentAccountSubtitle">进入账号中心</small>
        </span>
        <span class="student-account-arrow">⌄</span>
      </button>
      <div id="studentHoverCard" class="student-hover-card" role="tooltip"></div>
      <div id="studentAccountMenu" class="student-account-menu" hidden>
        <div id="studentAccountMenuBody"></div>
      </div>
    `;

    const compactBtn = sourceButton('compactBtn');
    if(compactBtn && compactBtn.parentElement === topActions){
      topActions.insertBefore(hub, compactBtn);
    }else{
      topActions.appendChild(hub);
    }

    bindHubEvents();
    hideSourceButtons();
    return hub;
  }

  function hoverHTML(){
    const auth = readAuth();
    const student = readCurrentStudent();
    const logged = Boolean(auth.user);
    const count = volunteerCountText();

    if(!logged){
      return `
        <div class="student-hover-profile">
          <div class="student-hover-avatar">学</div>
          <div>
            <b>未登录</b>
            <span>登录后可查看学生、志愿表和账号信息</span>
          </div>
        </div>
        <div class="student-hover-grid">
          <div><b>账号状态</b><span>未登录</span></div>
          <div><b>志愿表</b><span>${esc(count)}</span></div>
        </div>`;
    }

    return `
      <div class="student-hover-profile">
        <div class="student-hover-avatar">${esc(avatarText(student, auth))}</div>
        <div>
          <b>${esc(student?.name || '未选择学生')}</b>
          <span>${esc(student ? '高考年份 2026 年' : '请先进入学生档案选择学生')}</span>
        </div>
      </div>
      <div class="student-hover-grid">
        <div><b>选科</b><span>${esc(student ? studentSubjectLine(student) : '未选择')}</span></div>
        <div><b>分数</b><span>${esc(student?.score ? `${student.score}分` : '未填')}</span></div>
        <div><b>位次</b><span>${esc(student?.rank || '未填')}</span></div>
        <div><b>体检</b><span>${esc(student ? medicalLine(student) : '未填')}</span></div>
        <div><b>志愿表</b><span>${esc(count)}</span></div>
        <div><b>账号</b><span>${esc(emailShort(auth.user.email))}</span></div>
      </div>`;
  }

  function menuHTML(){
    const auth = readAuth();
    const student = readCurrentStudent();
    const logged = Boolean(auth.user);
    const count = volunteerCountText();

    if(!logged){
      return `
        <div class="student-menu-profile">
          <div class="student-menu-avatar">学</div>
          <div class="student-menu-name">
            <b>登录/申请开通</b>
            <span>进入账号后可管理学生档案与志愿表</span>
          </div>
        </div>
        <div class="student-menu-list">
          <button type="button" class="student-menu-item primary" data-hub-action="login">
            <span>账号登录</span><small>使用管理员分配账号，或申请开通</small>
          </button>
        </div>`;
    }

    return `
      <div class="student-menu-profile">
        <div class="student-menu-avatar">${esc(avatarText(student, auth))}</div>
        <div class="student-menu-name">
          <b>${esc(student?.name || '未选择学生')}</b>
          <span>${esc(student ? `高考年份 2026 年｜${detailStudentSummary(student)}` : `账号：${auth.user.email || '已登录'}`)}</span>
        </div>
        <button class="student-menu-edit" type="button" data-hub-action="open-student-panel">编辑</button>
      </div>

      <div class="student-menu-card">
        <b>当前账号</b>
        <span>${esc(auth.user.email || '已登录')}</span>
      </div>

      <div class="student-menu-list">
        <button type="button" class="student-menu-item" data-hub-action="open-student-panel">
          <span>基本信息</span><small>学生档案、分数、位次、体检代码</small>
        </button>
        <button type="button" class="student-menu-item" data-hub-action="open-volunteer">
          <span>志愿表</span><small>当前 ${esc(count)}，查看和调整专业组</small>
        </button>
        <button type="button" class="student-menu-item" data-hub-action="open-requirement">
          <span>选科方案</span><small>按当前学生选科同步筛选</small>
        </button>
        <button type="button" class="student-menu-item disabled" data-hub-action="report" disabled>
          <span>测评报告</span><small>暂未接入</small>
        </button>
        <button type="button" class="student-menu-item" data-hub-action="open-account">
          <span>账号管理</span><small>查看账号与登录状态</small>
        </button>
        <button type="button" class="student-menu-item" data-hub-action="open-admin">
          <span>管理员后台</span><small>管理规划师与学生分配</small>
        </button>
        <button type="button" class="student-menu-item" data-hub-action="switch-account">
          <span>切换账号</span><small>退出当前账号后重新登录</small>
        </button>
        <button type="button" class="student-menu-item danger" data-hub-action="logout">
          <span>退出登录</span><small>退出前请确认志愿表已保存</small>
        </button>
      </div>`;
  }

  function renderHub(){
    const hub = ensureHub();
    if(!hub) return;

    hideSourceButtons();

    const auth = readAuth();
    const student = readCurrentStudent();
    const logged = Boolean(auth.user);
    const title = $('#studentAccountTitle');
    const subtitle = $('#studentAccountSubtitle');
    const avatar = $('#studentAccountAvatar');
    const hover = $('#studentHoverCard');
    const menuBody = $('#studentAccountMenuBody');

    if(title){
      title.textContent = logged ? (student?.name || '未选择学生') : '登录/申请开通';
    }
    if(subtitle){
      subtitle.textContent = logged
        ? (student ? compactStudentSummary(student) : `${emailShort(auth.user.email)}｜点击选择学生`)
        : '进入账号中心';
    }
    if(avatar){
      avatar.textContent = avatarText(student, auth);
      avatar.classList.toggle('empty', !student);
    }
    if(hover) hover.innerHTML = hoverHTML();
    if(menuBody) {
      menuBody.innerHTML = menuHTML();
      bindMenuActions();
    }
  }

  function isMenuOpen(){
    const menu = $('#studentAccountMenu');
    return Boolean(menu && !menu.hidden);
  }

  function openMenu(){
    const menu = $('#studentAccountMenu');
    const trigger = $('#studentAccountTrigger');
    if(!menu || !trigger) return;
    menu.hidden = false;
    trigger.setAttribute('aria-expanded','true');
    trigger.classList.add('active');
    document.body.classList.add(BODY_OPEN_CLASS);
    renderHub();
  }

  function closeMenu(){
    const menu = $('#studentAccountMenu');
    const trigger = $('#studentAccountTrigger');
    if(!menu || !trigger) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded','false');
    trigger.classList.remove('active');
    document.body.classList.remove(BODY_OPEN_CLASS);
  }

  function toggleMenu(){
    isMenuOpen() ? closeMenu() : openMenu();
  }

  function bindHubEvents(){
    const trigger = $('#studentAccountTrigger');
    if(trigger && !trigger.dataset.bound){
      trigger.dataset.bound = '1';
      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const logged = Boolean(readAuth().user);
        if(!logged){
          closeMenu();
          clickSource('accountBtn');
          return;
        }
        toggleMenu();
      });
    }

    document.addEventListener('click', event => {
      if(!event.target.closest(`#${HUB_ID}`)) closeMenu();
    }, { passive:true });

    document.addEventListener('keydown', event => {
      if(event.key === 'Escape') closeMenu();
    });
  }

  function bindMenuActions(){
    $$('[data-hub-action]').forEach(btn => {
      if(btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', event => {
        event.preventDefault();
        const action = btn.dataset.hubAction;
        if(btn.disabled) return;

        if(action === 'login'){
          closeMenu();
          clickSource('accountBtn');
          return;
        }

        if(action === 'open-student-panel'){
          closeMenu();
          if(!clickSource('studentPanelBtn')){
            window.location.href = './students/index.html';
          }
          return;
        }

        if(action === 'open-volunteer'){
          closeMenu();
          clickSource('volunteerPanelBtn');
          return;
        }

        if(action === 'open-requirement'){
          closeMenu();
          clickSource('requirementBtn');
          return;
        }

        if(action === 'open-account'){
          closeMenu();
          clickSource('accountBtn');
          return;
        }

        if(action === 'open-admin'){
          closeMenu();
          window.location.href = './admin-console.html';
          return;
        }

        if(action === 'switch-account'){
          closeMenu();
          clickSource('logoutHeaderBtn');
          setTimeout(() => {
            if(!readAuth().user) clickSource('accountBtn');
          }, 350);
          return;
        }

        if(action === 'logout'){
          closeMenu();
          clickSource('logoutHeaderBtn');
        }
      });
    });
  }

  function observeExistingButtons(){
    const observer = new MutationObserver(() => renderHub());
    ['accountBtn','studentPanelBtn','volunteerPanelBtn','logoutHeaderBtn'].forEach(id => {
      const el = sourceButton(id);
      if(el) observer.observe(el, { childList:true, subtree:true, attributes:true, characterData:true });
    });
  }

  function boot(){
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const ready = Boolean($('.top-actions'));
      if(ready){
        clearInterval(timer);
        renderHub();
        observeExistingButtons();
        window.addEventListener('storage', renderHub);
        setInterval(renderHub, 1200);
      }
      if(attempts > 80) clearInterval(timer);
    }, 100);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0));
  }else{
    setTimeout(boot, 0);
  }
})();
