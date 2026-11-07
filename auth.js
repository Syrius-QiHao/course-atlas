(() => {
  'use strict';
  const config = window.PORTAL_AUTH_CONFIG || {};
  const callback = new URL('./', location.href).href;
  let sdk = null;
  let origin = '';
  let currentUser = null;
  let discovery = null;
  try {
    if (typeof config.appId === 'string' && config.appId.trim() && typeof config.domain === 'string' && config.domain.trim()) {
      const domain = new URL(config.domain);
      if (domain.protocol !== 'https:' || domain.username || domain.password) throw new Error('Invalid identity provider');
      origin = domain.origin;
      if (window.AuthingFactory?.Authing) sdk = new window.AuthingFactory.Authing({
        appId: config.appId.trim(), domain: origin, scope: config.scope || 'openid profile',
        redirectUri: callback, logoutRedirectUri: callback,
        redirectResponseMode: 'query', redirectToOriginalUri: false, useImplicitMode: false
      });
    }
  } catch { sdk = null; }
  function clearCallback() {
    const url = new URL(location.href);
    for (const key of ['code', 'state', 'error', 'error_description', 'session_state', 'iss']) url.searchParams.delete(key);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  async function getUser() {
    if (!sdk) return null;
    let login;
    const isCallback = sdk.isRedirectCallback();
    try { login = isCallback ? await sdk.handleRedirectCallback() : await sdk.getLoginState(); }
    catch {
      currentUser = null;
      throw new Error(isCallback ? '登录未完成，请重新点击登录。' : '暂时无法连接账号服务，请稍后重试。');
    } finally { if (isCallback) clearCallback(); }
    if (!login?.accessToken) { currentUser = null; return null; }
    // Verify the access token with the identity provider before showing a user.
    // Cached profile objects and decoded JWT payloads are never used as proof of login.
    try {
      if (!discovery) {
        const response = await fetch(origin + '/oidc/.well-known/openid-configuration', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error();
        discovery = await response.json();
      }
      const endpoint = new URL(discovery.userinfo_endpoint);
      if (endpoint.origin !== origin || endpoint.protocol !== 'https:') throw new Error();
      const response = await fetch(endpoint.href, { headers: { Authorization: 'Bearer ' + login.accessToken }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) { currentUser = null; if ([401, 403].includes(response.status)) return null; throw new Error(); }
      const user = await response.json();
      const id = user.sub;
      if (!id || (login.parsedIdToken?.sub && id !== login.parsedIdToken.sub)) throw new Error();
      currentUser = { id, username: user.username || user.preferred_username || user.nickname || user.name || '学习账号' };
      return currentUser;
    } catch { currentUser = null; throw new Error('暂时无法确认登录状态，请稍后重新登录。'); }
  }
  async function login() {
    if (!sdk) throw new Error('登录服务正在配置中，课程可以直接浏览。');
    await sdk.loginWithRedirect({ redirectUri: callback, originalUri: callback });
  }
  async function logout() {
    if (!sdk) return;
    currentUser = null;
    await sdk.logoutWithRedirect({ redirectUri: callback });
  }
  function favoritesKey() { return currentUser ? 'course-portal-favorites-v2:' + encodeURIComponent(config.appId) + ':' + encodeURIComponent(currentUser.id) : null; }
  function readFavorites() {
    const key = favoritesKey(); if (!key) return [];
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter(id => typeof id === 'string').slice(0, 100) : []; }
    catch { return []; }
  }
  function writeFavorites(ids) {
    const key = favoritesKey(); if (!key) throw new Error('请先登录。');
    try { localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(0, 100))); }
    catch { throw new Error('当前浏览器未允许保存收藏，请检查浏览器设置。'); }
    return readFavorites();
  }
  window.PortalAuth = { ready: !!sdk, getUser, login, logout, readFavorites, writeFavorites, accountUrl: origin ? origin + '/u' : '' };
})();
