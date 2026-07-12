(function (root) {
  'use strict';

  function format(error, action) {
    const authAction = action || 'login';
    const raw = String(error && error.message ? error.message : error || '').trim();
    let payload = null;
    try { payload = JSON.parse(raw); } catch (_error) {}
    const code = String(payload && (payload.error_code || payload.code) || '').toLowerCase();
    const message = String(payload && (payload.msg || payload.message || payload.error_description) || raw).trim();
    const normalized = (code + ' ' + message).toLowerCase();

    if (normalized.includes('user_already_exists') || normalized.includes('already registered') || normalized.includes('already exists')) {
      return '该邮箱已经注册，请直接点击“登录工作台”；如果忘记密码，请使用“忘记密码”。';
    }
    if (normalized.includes('invalid_credentials') || normalized.includes('invalid login credentials')) {
      return '邮箱或密码错误。请检查后重新登录，忘记密码可使用“忘记密码”。';
    }
    if (normalized.includes('email_not_confirmed') || normalized.includes('email not confirmed')) {
      return '该邮箱尚未完成验证，请联系管理员确认账号状态。';
    }
    if (normalized.includes('signup_disabled') || normalized.includes('signups not allowed')) {
      return '当前未开放新账号注册，请联系管理员创建或启用账号。';
    }
    if (normalized.includes('over_email_send_rate_limit') || normalized.includes('rate limit')) {
      return '请求过于频繁，请稍后再试。';
    }
    if (normalized.includes('failed to fetch') || normalized.includes('network') || normalized.includes('abort')) {
      return '网络连接失败，请检查网络后重试。';
    }
    if (!message) return authAction === 'register' ? '注册失败，请稍后重试。' : '登录失败，请检查账号密码。';
    return message;
  }

  root.JIANGSU_AUTH_ERRORS = Object.freeze({ format: format });
})(typeof window !== 'undefined' ? window : globalThis);
