(() => {
  'use strict';
  const config = window.PORTAL_AUTH_CONFIG || {};
  const callback = config.redirectUri || new URL('./', location.href).href;
  const returnKey = 'course-auth-return-v1:' + config.appId;
  let sdk = null, origin = '', currentUser = null, session = null, discovery = null, inflight = null;
  try {
    if (typeof config.appId === 'string' && config.appId.trim() && typeof config.domain === 'string' && config.domain.trim()) {
      const domain = new URL(config.domain), redirect = new URL(callback);
      if (domain.protocol !== 'https:' || domain.username || domain.password || redirect.origin !== location.origin) throw new Error('Invalid identity provider');
      origin = domain.origin;
      if (window.AuthingFactory?.Authing) sdk = new window.AuthingFactory.Authing({
        appId: config.appId.trim(), domain: origin, scope: config.scope || 'openid profile',
        redirectUri: callback, logoutRedirectUri: callback,
        redirectResponseMode: 'query', redirectToOriginalUri: false, useImplicitMode: false
      });
    }
  } catch { sdk = null; }
  function safeTarget(value) {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin || url.username || url.password || !['/course-atlas/', '/disease-biology-class/'].some(path => url.pathname === path || url.pathname === path + 'index.html')) return null;
      for (const key of ['code', 'state', 'error', 'error_description', 'session_state', 'iss']) url.searchParams.delete(key);
      return url.href;
    } catch { return null; }
  }
  function clearCallback() {
    const url = new URL(location.href);
    for (const key of ['code', 'state', 'error', 'error_description', 'session_state', 'iss']) url.searchParams.delete(key);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  async function verifyUser() {
    if (!sdk) return null;
    let login;
    const isCallback = sdk.isRedirectCallback();
    try { login = isCallback ? await sdk.handleRedirectCallback() : await sdk.getLoginState(); }
    catch {
      currentUser = null; session = null;
      throw new Error(isCallback ? '登录未完成，请重新点击登录。' : '暂时无法连接账号服务，请稍后重试。');
    } finally { if (isCallback) clearCallback(); }
    if (!login?.accessToken) { currentUser = null; session = null; return null; }
    try {
      if (!discovery) {
        const response = await fetch(origin + '/oidc/.well-known/openid-configuration', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error();
        discovery = await response.json();
      }
      const endpoint = new URL(discovery.userinfo_endpoint);
      if (endpoint.origin !== origin || endpoint.protocol !== 'https:') throw new Error();
      const response = await fetch(endpoint.href, { headers: { Authorization: 'Bearer ' + login.accessToken }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) { currentUser = null; session = null; if ([401, 403].includes(response.status)) return null; throw new Error(); }
      const user = await response.json(), id = user.sub;
      if (typeof id !== 'string' || !id || (login.parsedIdToken?.sub && id !== login.parsedIdToken.sub)) throw new Error();
      currentUser = { id, username: user.username || user.preferred_username || user.nickname || user.name || '学习账号' };
      session = { user: { ...currentUser }, accessToken: login.accessToken, expiresAt: Number(login.expireAt) || 0 };
      if (isCallback) {
        let target;
        try { target = safeTarget(sessionStorage.getItem(returnKey)); sessionStorage.removeItem(returnKey); } catch {}
        if (target && target !== new URL('./', location.href).href) location.replace(target);
      }
      return { ...currentUser };
    } catch { currentUser = null; session = null; throw new Error('暂时无法确认登录状态，请稍后重新登录。'); }
  }
  function getUser() {
    if (!inflight) inflight = verifyUser().finally(() => { inflight = null; });
    return inflight;
  }
  async function login(returnTo) {
    if (!sdk) throw new Error('登录服务正在配置中，课程可以直接浏览。');
    try {
      const target = returnTo && safeTarget(returnTo);
      if (target) sessionStorage.setItem(returnKey, target); else sessionStorage.removeItem(returnKey);
    } catch { throw new Error('当前浏览器未允许临时保存登录信息，请检查浏览器设置。'); }
    await sdk.loginWithRedirect({ redirectUri: callback, originalUri: callback });
  }
  async function logout() {
    if (!sdk) return;
    currentUser = null; session = null;
    try { sessionStorage.removeItem(returnKey); } catch {}
    await sdk.logoutWithRedirect({ redirectUri: callback });
  }
  function favoritesKey() { return currentUser ? 'course-portal-favorites-v2:' + encodeURIComponent(config.appId) + ':' + encodeURIComponent(currentUser.id) : null; }
  function readFavorites() {
    const key = favoritesKey(); if (!key) return [];
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string').slice(0, 100) : []; } catch { return []; }
  }
  function writeFavorites(ids) {
    const key = favoritesKey(); if (!key) throw new Error('请先登录。');
    try { localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(0, 100))); } catch { throw new Error('当前浏览器未允许保存收藏，请检查浏览器设置。'); }
    return readFavorites();
  }
  window.PortalAuth = { ready: !!sdk, getUser, getSession: () => session ? { ...session, user: { ...session.user } } : null,
    login, logout, readFavorites, writeFavorites, accountUrl: origin ? origin + '/u' : '' };
})();
