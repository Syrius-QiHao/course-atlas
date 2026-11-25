(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const auth=window.PortalAuth,links=window.StudyLinks;
  const state={courses:window.PORTAL_COURSES||[],semesters:window.PORTAL_SEMESTERS||[],semester:'all',view:'all',page:'courses',search:'',user:null,favorites:[],checking:false};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  let toastTimer,accountReady=false;
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true},5000);}
  function courseUrl(course,hash){return links?.courseUrl(course,hash)||'';}
  function filteredCourses(){const q=state.search.trim().toLocaleLowerCase();return state.courses.filter(c=>(state.semester==='all'||c.semester===state.semester)&&(state.view!=='mine'||state.favorites.includes(c.id))&&(!q||[c.name,c.subtitle,...(c.tags||[])].join(' ').toLocaleLowerCase().includes(q)));}
  function isPrepared(c){return c.id==='disease-biology'||c.framework||!!courseUrl(c);}
  function courseCard(c){
    const url=courseUrl(c),saved=state.favorites.includes(c.id),featured=c.id==='disease-biology';
    const status=c.framework?(url?'内容整理中':'网址待接入'):(url?'已有学习内容':'未完待续');
    return `<article class="course-card ${featured?'featured':''}" data-course-id="${esc(c.id)}"><div class="course-top"><span class="course-kicker">${featured?'基础整合课程':'系统疾病课程'}</span><button class="favorite-button" type="button" data-favorite="${esc(c.id)}" aria-pressed="${saved}" aria-label="${saved?'取消收藏':'收藏'}${esc(c.name)}">${saved?'★':'☆'}</button></div><h4>${url?`<a href="${esc(url)}" data-visit="${esc(c.id)}">${esc(c.name)}</a>`:esc(c.name)}</h4><p>${esc(c.subtitle)}</p><div class="course-bottom"><span class="course-status">${status}</span>${url?`<a class="course-enter" href="${esc(url)}" data-visit="${esc(c.id)}">进入课程</a>`:`<button class="course-enter" type="button" data-course-info="${esc(c.id)}">查看安排</button>`}</div>${url&&(c.shortcuts||[]).length?`<nav class="course-shortcuts" aria-label="${esc(c.name)}快捷入口">${c.shortcuts.map(s=>`<a href="${esc(courseUrl(c,s.hash))}" data-visit="${esc(c.id)}">${esc(s.label)}</a>`).join('')}</nav>`:''}</article>`;
  }
  function renderSemesterTabs(){
    $('#semester-tabs').innerHTML=[{id:'all',name:'全部学期'},...state.semesters].map(s=>`<button type="button" data-semester="${esc(s.id)}" class="${s.id===state.semester?'active':''}" aria-pressed="${s.id===state.semester}">${esc(s.name)}</button>`).join('');
  }
  function renderCourses(){
    renderSemesterTabs();
    if(state.view==='mine'&&!state.user){$('#course-list').innerHTML='<div class="empty-state"><strong>把常用课程收在一起</strong><p>登录后点击课程旁的星标，即可加入“我的课程”。</p><button type="button" class="button" data-login>登录 / 注册</button></div>';return;}
    const list=filteredCourses(),prepared=list.filter(isPrepared),pending=list.filter(c=>!isPrepared(c));
    if(!list.length){$('#course-list').innerHTML=`<div class="empty-state"><strong>${state.search.trim()?'没有找到匹配的课程':state.view==='mine'?'当前学期还没有收藏课程':'本学期资料待补充'}</strong><p>${state.search.trim()?'可以换个关键词，或选择全部学期。':state.view==='mine'?'可切换学期，或回到课程目录点击星标。':'课程将随教学进度继续补充，未完待续。'}</p></div>`;return;}
    const groups=state.semesters.filter(s=>prepared.some(c=>c.semester===s.id));
    let html=state.view==='mine'?'<p class="mine-description">课程收藏保存在此浏览器，按学习账号区分。</p>':'';
    html+=groups.map(s=>`<section class="semester-group" aria-labelledby="term-${esc(s.id)}"><div class="semester-heading"><h3 id="term-${esc(s.id)}">${esc(s.name)}</h3><span>${s.id==='y3s1'?'系统疾病课程':'基础整合课程'}</span></div><div class="course-grid">${prepared.filter(c=>c.semester===s.id).map(courseCard).join('')}</div></section>`).join('');
    if(pending.length)html+=`<details class="future-courses" ${!prepared.length||state.search.trim()||state.view==='mine'?'open':''}><summary>其他课程 · 未完待续</summary>${state.semesters.filter(s=>pending.some(c=>c.semester===s.id)).map(s=>`<div class="future-group"><strong>${esc(s.name)}</strong><p>${pending.filter(c=>c.semester===s.id).map(c=>esc(c.name)).join(' · ')}</p></div>`).join('')}</details>`;
    $('#course-list').innerHTML=html;
  }
  const pageTitles={courses:['课程总入口','温医大整合课程','按学期找课程，从已有内容接着学。'],mine:['温医大整合课程','我的课程','把常用课程收在一起，随时回来学习。'],atlas:['共享医学资料','医学图谱','解剖、组织病理、影像与局解资料，集中查找。'],updates:['温医大整合课程','更新日志','查看各课程与共享资料的整理进度。']};
  function renderPage(focus=false){
    const page=state.page==='mine'?'courses':state.page;
    document.querySelectorAll('[data-page]').forEach(s=>{s.hidden=s.dataset.page!==page;});
    const meta=pageTitles[state.page];$('#page-eyebrow').textContent=meta[0];$('#page-title').textContent=meta[1];$('#page-description').textContent=meta[2];$('#search-label').hidden=!['courses','mine'].includes(state.page);
    document.querySelectorAll('[data-route]').forEach(a=>{if(a.dataset.route===state.page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    state.view=state.page==='mine'?'mine':'all';renderCourses();document.title=state.page==='courses'?'温医大整合课程':meta[1]+' · 温医大整合课程';
    if(focus){window.scrollTo({top:0,behavior:'auto'});$('#main').focus({preventScroll:true});}
  }
  function accountDialog(){if(!state.user){startLogin();return;}$('#account-name').textContent='当前账号 · '+state.user.username;$('#manage-account').href=auth.accountUrl;if(!$('#account-dialog').open)$('#account-dialog').showModal();}
  function applyRoute(focus=false){const key=location.hash.slice(1).split('?')[0]||'courses';state.page=key==='mine'?'mine':Object.hasOwn(pageTitles,key)?key:'courses';renderPage(focus);if(key==='account'&&accountReady)accountDialog();}
  function renderAccount(){$('#account-actions').innerHTML=state.user?`<button type="button" class="button account-button account-label" data-account>${esc(state.user.username)}</button>`:`<button class="button account-button" type="button" data-login ${state.checking?'disabled':''}>${state.checking?'确认登录中…':'登录 / 注册'}</button>`;}
  function recentVisits(){try{const rows=JSON.parse(localStorage.getItem('course-portal-recent-v1')||'[]');return Array.isArray(rows)?rows.filter(i=>i&&typeof i.id==='string'&&Number.isFinite(i.time)&&Math.abs(i.time)<8640000000000000).slice(0,3):[];}catch{return [];}}
  function renderRecent(){const rows=recentVisits().map(i=>({...i,course:state.courses.find(c=>c.id===i.id)})).filter(i=>i.course&&courseUrl(i.course));$('#recent-visits').innerHTML=rows.length?rows.map(i=>`<a class="recent-link" href="${esc(courseUrl(i.course))}" data-visit="${esc(i.id)}"><strong>${esc(i.course.name)}</strong><span>${esc(new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(new Date(i.time)))} · 此浏览器</span></a>`).join(''):'<p class="secondary">进入一门课程后，会在这里留下访问记录。</p>';}
  function recordVisit(id){if(!state.courses.some(c=>c.id===id&&courseUrl(c)))return;try{localStorage.setItem('course-portal-recent-v1',JSON.stringify([{id,time:Date.now()},...recentVisits().filter(i=>i.id!==id)].slice(0,3)));renderRecent();}catch{}}
  function resourceInfo(title,description){$('#resource-title').textContent=title;$('#resource-description').textContent=description;if(!$('#resource-dialog').open)$('#resource-dialog').showModal();}
  async function startLogin(){if(location.protocol==='file:'){toast('本地预览可浏览课程，登录请使用已发布的总网站。');return;}if(!auth?.ready){toast('登录组件未载入，请联网后刷新。课程入口仍可使用。');return;}try{await auth.login();}catch(e){toast(e.message||'暂时无法打开登录。');}}
  function favorite(id){if(!state.courses.some(c=>c.id===id))return;if(!state.user){try{sessionStorage.setItem('portal-pending-favorite',id);}catch{}startLogin();return;}const saved=state.favorites.includes(id);try{state.favorites=auth.writeFavorites(saved?state.favorites.filter(x=>x!==id):[...state.favorites,id]);renderCourses();toast(saved?'已取消课程收藏':'已加入我的课程 · 保存在此浏览器');}catch(e){toast(e.message||'暂时无法保存收藏。');}}
  async function refreshAccount(){
    if(state.checking||!auth)return;state.checking=!!auth.ready;renderAccount();
    try{state.user=await auth.getUser();state.favorites=auth.readFavorites();if(state.user){let pending;try{pending=sessionStorage.getItem('portal-pending-favorite');sessionStorage.removeItem('portal-pending-favorite');}catch{}if(state.courses.some(c=>c.id===pending)&&!state.favorites.includes(pending))state.favorites=auth.writeFavorites([...state.favorites,pending]);}}
    catch(e){state.user=null;state.favorites=[];toast(navigator.onLine===false?'当前离线，课程目录仍可查看。':e.message||'暂时无法确认账号。');}
    finally{state.checking=false;renderAccount();renderCourses();}
  }
  document.addEventListener('click',async event=>{
    const atlas=event.target.closest('[data-atlas]');if(atlas){const url=links?.url('atlas',atlas.dataset.atlas);if(url){atlas.href=url;}else{event.preventDefault();resourceInfo('医学图谱','图谱分类、目录和资源入口已整理，独立图谱站的网址尚待接入。');}return;}
    const term=event.target.closest('[data-semester]');if(term){if(term.dataset.semester==='all'||state.semesters.some(s=>s.id===term.dataset.semester)){state.semester=term.dataset.semester;renderCourses();}return;}
    const visit=event.target.closest('[data-visit]');if(visit){recordVisit(visit.dataset.visit);return;}
    const star=event.target.closest('[data-favorite]');if(star){favorite(star.dataset.favorite);return;}
    const course=event.target.closest('[data-course-info]');if(course){const c=state.courses.find(c=>c.id===course.dataset.courseInfo);if(c)resourceInfo(c.name,c.framework?'章节目录、课件来源和分类题库框架已准备，知识点正文及题目继续核对。':'本课程资料将随教学进度继续补充。');return;}
    if(event.target.closest('[data-login]')){startLogin();return;}
    if(event.target.closest('[data-account]')){if(state.checking){toast('正在确认登录状态，请稍候。');return;}accountDialog();return;}
    const close=event.target.closest('[data-close-dialog]');if(close){close.closest('dialog').close();return;}
    const logout=event.target.closest('[data-logout]');if(logout){logout.disabled=true;try{await auth.logout();state.user=null;state.favorites=[];$('#account-dialog').close();renderAccount();renderCourses();}catch(e){toast(e.message||'暂时无法退出。');}finally{logout.disabled=false;}}
  });
  $('#course-search').addEventListener('input',e=>{state.search=e.target.value;renderCourses();});
  window.addEventListener('hashchange',()=>applyRoute(true));
  window.addEventListener('pageshow',e=>{renderRecent();if(e.persisted)refreshAccount();});
  window.addEventListener('online',refreshAccount);
  window.addEventListener('storage',e=>{if(e.key==='course-portal-recent-v1')renderRecent();else if(e.key===null||e.key?.startsWith('authing-spa:1:6aef571a088cf3e3567dceec:'))refreshAccount();else if(e.key?.startsWith('course-portal-favorites-v2:')){state.favorites=auth?.readFavorites()||[];renderCourses();}});
  document.querySelectorAll('[data-atlas]').forEach(a=>{a.href=links?.url('atlas',a.dataset.atlas)||'#atlas';});
  applyRoute();renderRecent();renderAccount();refreshAccount().finally(()=>{accountReady=true;if(location.hash==='#account')accountDialog();});
})();
