(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const auth = window.PortalAuth;
  const state = {courses:window.PORTAL_COURSES||[],semesters:window.PORTAL_SEMESTERS||[],semester:'all',view:'all',search:'',user:null,favorites:[],checking:false};
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  let toastTimer;
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true},5000)}
  function courseUrl(course,hash){
    if(!course?.url)return '';
    try{const url=new URL(course.url);if(url.protocol!=='https:'||url.origin!=='https://syrius-qihao.github.io'||url.username||url.password)return '';if(hash)url.hash=hash;return url.href}catch{return ''}
  }
  function filteredCourses(){const term=state.search.trim().toLocaleLowerCase();return state.courses.filter(c=>(state.semester==='all'||c.semester===state.semester)&&(state.view!=='mine'||state.favorites.includes(c.id))&&(!term||[c.name,c.subtitle,...c.tags].join(' ').toLocaleLowerCase().includes(term)))}
  function courseCard(c){
    const url=courseUrl(c),saved=state.favorites.includes(c.id);
    return `<article class="course-card" data-course-id="${esc(c.id)}"><div class="course-card-main"><div class="course-card-top"><span class="course-kicker">整合课程</span><span class="course-status${url?'':' pending'}">${url?'可进入学习':'资料待补'}</span></div><h4>${url?`<a href="${esc(url)}" data-visit="${esc(c.id)}">${esc(c.name)}</a>`:esc(c.name)}</h4><p>${esc(c.subtitle)}</p><div class="course-tags">${c.tags.map(t=>`<span class="course-tag">${esc(t)}</span>`).join('')}</div></div><div class="course-bottom">${url?`<a class="btn small" href="${esc(url)}" data-visit="${esc(c.id)}">进入课程</a><div class="course-shortcuts">${c.shortcuts.map(s=>`<a href="${esc(courseUrl(c,s.hash))}" data-visit="${esc(c.id)}">${esc(s.label)}</a>`).join('')}</div>`:'<div class="pending-features"><span>题库 · 待补</span><span>知识点 · 待补</span></div>'}<button class="favorite-button" type="button" data-favorite="${esc(c.id)}" aria-pressed="${saved}" aria-label="${saved?'取消收藏':'收藏'}${esc(c.name)}">${saved?'★':'☆'}</button></div></article>`;
  }
  function renderSemesterTabs(){
    $('#semester-tabs').innerHTML=[{id:'all',name:'全部学期'},...state.semesters].map(s=>`<button type="button" data-semester="${esc(s.id)}" class="${s.id===state.semester?'active':''}" aria-pressed="${s.id===state.semester}">${esc(s.name)}</button>`).join('');
  }
  function renderCourses(){
    document.querySelectorAll('[data-view]').forEach(el=>{const active=el.dataset.view===state.view;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active))});
    $('#courses-title').textContent=state.view==='mine'?'我的课程':'课程目录';
    $('#courses-description').textContent=state.view==='mine'?'按原账号保存课程收藏；收藏保存在当前浏览器。':'现有课程直接进入，待补资料保留位置。';
    renderSemesterTabs();
    if(state.view==='mine'&&!state.user){$('#course-list').innerHTML='<div class="empty-state"><strong>把常用课程收在一起</strong>登录后点亮课程右下角的星标，即可加入我的课程。<br><button type="button" class="btn" data-login>登录 / 注册</button></div>';return}
    const courses=filteredCourses();
    if(!courses.length&&(state.search.trim()||state.view==='mine')){$('#course-list').innerHTML=`<div class="empty-state"><strong>${state.search.trim()?'没有找到匹配的课程':'当前筛选下还没有收藏课程'}</strong>${state.search.trim()?'可以换个关键词，或选择全部学期。':'可切换学期，或回到全部课程点亮星标。'}</div>`;return}
    const semesters=state.semesters.filter(s=>state.semester==='all'||s.id===state.semester);
    $('#course-list').innerHTML=semesters.map(s=>{const list=courses.filter(c=>c.semester===s.id);if(state.search.trim()&&!list.length)return '';return `<section class="semester-group" aria-labelledby="term-${esc(s.id)}"><div class="semester-heading"><h3 id="term-${esc(s.id)}">${esc(s.name)}</h3><span>${list.length?list.length+' 门课程':'未完待续'}</span></div>${list.length?list.map(courseCard).join(''):'<div class="semester-empty">课程尚未添加，随教学进度继续整理。</div>'}</section>`}).join('');
  }
  function renderAccount(){
    $('#account-actions').innerHTML=state.user?`<button type="button" class="btn secondary small account-label" data-account>${esc(state.user.username)}</button>`:`<button class="btn small" type="button" data-login${state.checking?' disabled':''}>${state.checking?'确认登录中…':'登录 / 注册'}</button>`;
  }
  function recentVisits(){try{const items=JSON.parse(localStorage.getItem('course-portal-recent-v1')||'[]');return Array.isArray(items)?items.filter(i=>i&&typeof i.id==='string'&&Number.isFinite(i.time)&&Math.abs(i.time)<8640000000000000).slice(0,3):[]}catch{return []}}
  function renderRecent(){const items=recentVisits().map(i=>({...i,course:state.courses.find(c=>c.id===i.id)})).filter(i=>i.course&&courseUrl(i.course));$('#recent-visits').innerHTML=items.length?items.map(i=>`<a class="recent-link" href="${esc(courseUrl(i.course))}" data-visit="${esc(i.id)}"><strong>${esc(i.course.name)}</strong><span>上次访问 · ${esc(new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(new Date(i.time)))} · 此浏览器</span></a>`).join(''):'<p>进入一门课程后，下次回来可以从这里继续。</p>'}
  function recordVisit(id){if(!state.courses.some(c=>c.id===id&&courseUrl(c)))return;try{localStorage.setItem('course-portal-recent-v1',JSON.stringify([{id,time:Date.now()},...recentVisits().filter(i=>i.id!==id)].slice(0,3)))}catch{}}
  async function startLogin(){if(!auth?.ready){toast('登录组件未载入，请联网后刷新。课程入口仍可使用。');return}try{await auth.login()}catch(e){toast(e.message||'暂时无法打开登录，请稍后重试。')}}
  function favorite(id){
    if(!state.courses.some(c=>c.id===id))return;
    if(!state.user){try{sessionStorage.setItem('portal-pending-favorite',id)}catch{}startLogin();return}
    const saved=state.favorites.includes(id);
    try{state.favorites=auth.writeFavorites(saved?state.favorites.filter(x=>x!==id):[...state.favorites,id]);renderCourses();toast(saved?'已取消课程收藏':'已加入我的课程 · 保存在此浏览器')}catch(e){toast(e.message)}
  }
  async function refreshAccount(){
    if(state.checking||!auth)return;state.checking=!!auth.ready;renderAccount();
    try{state.user=await auth.getUser();state.favorites=auth.readFavorites();if(state.user){let pending;try{pending=sessionStorage.getItem('portal-pending-favorite');sessionStorage.removeItem('portal-pending-favorite')}catch{}if(state.courses.some(c=>c.id===pending)&&!state.favorites.includes(pending))state.favorites=auth.writeFavorites([...state.favorites,pending])}}
    catch(e){state.user=null;state.favorites=[];toast(navigator.onLine===false?'当前离线，课程目录仍可查看。':e.message||'暂时无法确认账号，请稍后重试。')}
    finally{state.checking=false;renderAccount();renderCourses()}
  }
  document.addEventListener('click',async event=>{
    const view=event.target.closest('[data-view]');if(view){event.preventDefault();state.view=view.dataset.view;renderCourses();$('#courses').scrollIntoView({behavior:'auto'});return}
    const term=event.target.closest('[data-semester]');if(term){if(term.dataset.semester==='all'||state.semesters.some(s=>s.id===term.dataset.semester)){state.semester=term.dataset.semester;renderCourses()}return}
    const visit=event.target.closest('[data-visit]');if(visit){recordVisit(visit.dataset.visit);return}
    if(event.target.closest('[data-login]')){startLogin();return}
    const star=event.target.closest('[data-favorite]');if(star){favorite(star.dataset.favorite);return}
    const close=event.target.closest('[data-close-dialog]');if(close){close.closest('dialog').close();return}
    if(event.target.closest('[data-account]')){if(!state.user){startLogin();return}$('#account-name').textContent='当前账号 · '+state.user.username;$('#manage-account').href=auth.accountUrl;$('#account-dialog').showModal();return}
    const logout=event.target.closest('[data-logout]');if(logout){logout.disabled=true;try{await auth.logout();state.user=null;state.favorites=[];$('#account-dialog').close();renderAccount();renderCourses()}catch(e){toast(e.message);logout.disabled=false}}
  });
  $('#course-search').addEventListener('input',event=>{state.search=event.target.value;renderCourses()});
  window.addEventListener('pageshow',event=>{renderRecent();if(event.persisted)refreshAccount()});
  window.addEventListener('online',refreshAccount);
  window.addEventListener('storage',event=>{if(event.key?.startsWith('authing-spa:1:6aef571a088cf3e3567dceec:'))refreshAccount()});
  renderCourses();renderRecent();renderAccount();refreshAccount();
})();
