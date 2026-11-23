(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  let installPrompt=null,waitingWorker=null,refreshing=false,installBusy=false,installed=false,updateRequested=false;
  const display=window.matchMedia('(display-mode: standalone)');
  const standalone=()=>display.matches||navigator.standalone===true;
  function updateStatus(){
    $('#offline-banner').hidden=navigator.onLine!==false;
    $('#install-status').textContent=standalone()?'已在 App 模式打开。':installed?'已添加，可以从桌面的温医课程图标打开。':installPrompt?'此浏览器支持安装，点击下方按钮添加。':'安卓和苹果均提供添加方式。';
  }
  function instructions(){
    if(standalone())return '<p>你已经从桌面以 App 模式打开，无需重复添加。</p>';
    if(installed)return '<p>已添加温医课程。回到设备桌面，找到图标即可打开。</p>';
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const apple='<h3>苹果 iPhone / iPad</h3><ol><li>在 Safari 中打开本网站。</li><li>点浏览器的分享按钮。</li><li>选择“添加到主屏幕”，确认名称后点“添加”。</li></ol>';
    const android='<h3>安卓手机</h3><ol><li>在 Chrome、Edge 等支持安装的浏览器中打开本网站。</li><li>打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。</li><li>按照手机提示确认添加。</li></ol>';
    return (ios?apple+android:android+apple)+'<p>电脑上也可通过 Edge 或 Chrome 菜单选择“安装应用”。若在微信等内置浏览器里，请先用系统浏览器打开。</p>';
  }
  async function install(){
    if(installBusy)return;
    $('#install-result').textContent='';
    if(installPrompt&&!standalone()){
      installBusy=true;const prompt=installPrompt;installPrompt=null;
      try{await prompt.prompt();const result=await prompt.userChoice;$('#install-result').textContent=result.outcome==='accepted'?'已接受安装请求，请按系统提示完成。':'本次未安装，之后可从浏览器菜单添加。'}
      catch{$('#install-result').textContent='暂时无法调起安装，请按下面步骤添加。'}
      finally{installBusy=false;updateStatus()}
    }
    $('#install-instructions').innerHTML=instructions();
    if(!$('#install-dialog').open)$('#install-dialog').showModal();
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;updateStatus()});
  window.addEventListener('appinstalled',()=>{installed=true;installPrompt=null;$('#install-result').textContent='已添加。可以从桌面的“温医课程”图标打开。';updateStatus()});
  window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);
  if(display.addEventListener)display.addEventListener('change',updateStatus);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-install]')){event.preventDefault();install()}
    if(event.target.closest('[data-apply-update]')&&waitingWorker){updateRequested=true;waitingWorker.postMessage({type:'SKIP_WAITING'})}
  });
  function offerUpdate(worker){waitingWorker=worker;$('#update-banner').hidden=false}
  function register(){
    if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
    navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>{
      if(registration.waiting)offerUpdate(registration.waiting);
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate(worker)})});
    }).catch(()=>{$('#install-status').textContent='暂时无法准备离线目录，可联网继续使用。'});
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!updateRequested||refreshing)return;refreshing=true;location.reload()});
  }
  window.addEventListener('load',register);updateStatus();
})();
