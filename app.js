(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const auth = window.PortalAuth;
  const state = { courses: window.PORTAL_COURSES || [], user: null, favorites: [], view: 'all', search: '', checking: false };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  let toastTimer;
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500); }
  function renderAccount() {
    $('#account-actions').innerHTML = state.user
      ? `<button class="account-button" type="button" data-open-account title="账号设置"><span class="avatar">${escape(Array.from(state.user.username)[0])}</span><span class="user-name">${escape(state.user.username)}</span></button><button class="logout-button" type="button" data-logout>退出</button>`
      : `<button class="login-button" type="button" data-open-auth ${state.checking ? 'disabled' : ''}>${state.checking ? '确认登录中…' : '登录 / 注册'} <span aria-hidden="true">↗</span></button>`;
  }
  const emblem = '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="39" stroke-dasharray="3 5"/><circle cx="60" cy="60" r="23"/><circle cx="60" cy="60" r="8"/><path d="M60 37V21M83 60h16M60 83v16M37 60H21M43 43 31 31M77 43l12-12M77 77l12 12M43 77 31 89"/><circle cx="60" cy="17" r="5"/><circle cx="103" cy="60" r="5"/><circle cx="60" cy="103" r="5"/><circle cx="17" cy="60" r="5"/><circle cx="28" cy="28" r="4"/><circle cx="92" cy="28" r="4"/><circle cx="92" cy="92" r="4"/><circle cx="28" cy="92" r="4"/></svg>';
  function courseCard(course) {
    const saved = state.favorites.includes(course.id);
    return `<article class="course-card"><div class="course-card-top"><div><div class="course-kicker"><span></span>${escape(course.category)} / INTEGRATED COURSE</div><h3><a href="${escape(course.url)}" data-visit="${escape(course.id)}">${escape(course.name)}</a></h3><p class="course-subtitle">${escape(course.subtitle)}</p><div class="course-tags">${course.tags.map(tag => `<span class="course-tag">${escape(tag)}</span>`).join('')}</div></div><div class="course-emblem">${emblem}</div></div><div class="course-bottom"><div class="course-features">${course.features.map(feature => `<span>${escape(feature)}</span>`).join('')}</div><div class="course-bottom-row"><a class="button course-enter" href="${escape(course.url)}" data-visit="${escape(course.id)}">进入课程 <span aria-hidden="true">↗</span></a><div class="course-shortcuts">${course.shortcuts.map(item => `<a href="${escape(course.url)}#${escape(item.hash)}" data-visit="${escape(course.id)}">${escape(item.label)}</a>`).join('')}</div><button class="favorite-button" type="button" data-favorite="${escape(course.id)}" aria-pressed="${saved}" aria-label="${saved ? '取消收藏' : '收藏'}${escape(course.name)}" title="${saved ? '已加入我的课程' : '加入我的课程'}">${saved ? '★' : '☆'}</button></div></div></article>`;
  }
  function renderCourses() {
    document.querySelectorAll('[data-view]').forEach(button => { const active = button.dataset.view === state.view; button.classList.toggle('active', active); if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(active)); });
    $('#courses-title').textContent = state.view === 'mine' ? '我的课程' : '选择一门课程';
    $('#courses-description').textContent = state.view === 'mine' ? '收藏保存在当前浏览器，按登录账号分别整理。' : '每一门整合课程，都有自己的学习空间。';
    if (state.view === 'mine' && !state.user) { $('#course-list').innerHTML = '<div class="empty-state"><strong>把常学的课程留在这里</strong>登录后，点击课程右下角的星标，即可加入「我的课程」。<br><button class="button button-dark" type="button" data-open-auth>登录 / 注册 →</button></div>'; return; }
    const term = state.search.trim().toLocaleLowerCase();
    const list = state.courses.filter(course => (state.view !== 'mine' || state.favorites.includes(course.id)) && (!term || [course.name, course.subtitle, course.category, ...course.tags, ...course.features].join(' ').toLocaleLowerCase().includes(term)));
    $('#course-list').innerHTML = list.length ? list.map(courseCard).join('') : term ? '<div class="empty-state"><strong>还没有找到这门课程</strong>试试课程名称，或「免疫」「发病学」等关键词。</div>' : '<div class="empty-state"><strong>还没有收藏课程</strong>回到「全部课程」，点亮课程右下角的星标。<br><button class="button button-dark" type="button" data-view="all">查看全部课程 →</button></div>';
  }
  function recentVisits() { try { const items = JSON.parse(localStorage.getItem('course-portal-recent-v1') || '[]'); return Array.isArray(items) ? items.filter(item => item && typeof item.id === 'string' && Number.isFinite(item.time) && Math.abs(item.time) < 8640000000000000).slice(0, 3) : []; } catch { return []; } }
  function renderRecent() {
    const items = recentVisits().map(item => ({ ...item, course: state.courses.find(course => course.id === item.id) })).filter(item => item.course);
    $('#recent-visits').innerHTML = items.length ? items.map(item => `<a class="recent-link" href="${escape(item.course.url)}" data-visit="${escape(item.course.id)}"><strong>${escape(item.course.name)} <span aria-hidden="true">↗</span></strong><span>上次访问 · ${escape(new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(item.time)))} · 此浏览器</span></a>`).join('') : '<p class="aside-empty">从一门课程开始，<br>下次回来更快找到它。</p>';
  }
  function recordVisit(id) { if (state.courses.some(course => course.id === id)) try { localStorage.setItem('course-portal-recent-v1', JSON.stringify([{ id, time: Date.now() }, ...recentVisits().filter(item => item.id !== id)].slice(0, 3))); } catch { /* Course links remain usable without browser storage. */ } }
  function pendingFavorite(id) { try { sessionStorage.setItem('portal-pending-favorite', id); } catch { /* Login is still available when the browser does not retain preferences. */ } }
  function takePendingFavorite() { try { const id = sessionStorage.getItem('portal-pending-favorite'); sessionStorage.removeItem('portal-pending-favorite'); return state.courses.some(course => course.id === id) ? id : null; } catch { return null; } }
  async function startLogin() { try { await auth.login(); } catch (error) { toast(error.message); } }
  function favorite(id) {
    if (!state.courses.some(course => course.id === id)) return;
    if (!state.user) { pendingFavorite(id); startLogin(); return; }
    const saved = state.favorites.includes(id);
    try { state.favorites = auth.writeFavorites(saved ? state.favorites.filter(value => value !== id) : [...state.favorites, id]); renderCourses(); toast(saved ? '已从我的课程中移除' : '已加入我的课程 · 保存在此浏览器'); }
    catch (error) { toast(error.message); }
  }
  document.addEventListener('click', async event => {
    const view = event.target.closest('[data-view]'); if (view) { event.preventDefault(); state.view = view.dataset.view; renderCourses(); $('#courses').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); return; }
    const visit = event.target.closest('[data-visit]'); if (visit) { recordVisit(visit.dataset.visit); return; }
    const login = event.target.closest('[data-open-auth]'); if (login) { await startLogin(); return; }
    const star = event.target.closest('[data-favorite]'); if (star) { favorite(star.dataset.favorite); return; }
    const close = event.target.closest('[data-close-dialog]'); if (close) { close.closest('dialog').close(); return; }
    const account = event.target.closest('[data-open-account]'); if (account && state.user) { $('#account-name').textContent = '当前账号 · ' + state.user.username; $('#manage-account').href = auth.accountUrl; $('#account-dialog').showModal(); return; }
    const logout = event.target.closest('[data-logout]'); if (logout) { logout.disabled = true; try { await auth.logout(); state.user = null; state.favorites = []; renderAccount(); renderCourses(); } catch (error) { toast(error.message); logout.disabled = false; } }
  });
  $('#course-search').addEventListener('input', event => { state.search = event.target.value; renderCourses(); });
  window.addEventListener('pageshow', event => { renderRecent(); if (event.persisted) refreshAccount(); });
  async function refreshAccount() {
    if (state.checking) return;
    state.checking = auth.ready; renderAccount();
    try { state.user = await auth.getUser(); state.favorites = auth.readFavorites(); const id = state.user ? takePendingFavorite() : null; if (id && !state.favorites.includes(id)) state.favorites = auth.writeFavorites([...state.favorites, id]); }
    catch (error) { state.user = null; state.favorites = []; toast(error.message); }
    finally { state.checking = false; renderAccount(); renderCourses(); }
  }
  renderCourses(); renderAccount(); renderRecent(); refreshAccount();
})();
