'use strict';
const CACHE='wmu-course-portal-20261123-v1';
const PREFIX='wmu-course-portal-';
const VERSION='20261123-pwa1';
const SCOPE=new URL(self.registration.scope);
const FILES=['./','index.html','styles.css?v='+VERSION,'app.js?v='+VERSION,'pwa.js?v='+VERSION,'courses.js?v='+VERSION,'auth.js?v='+VERSION,'auth-config.js?v='+VERSION,'vendor/axios-1.21.0.min.js','vendor/authing-web-5.1.22.js','favicon.svg','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
const URLS=FILES.map(path=>new URL(path,SCOPE).href);
const STATIC=new Set(URLS);
const INDEX=new URL('index.html',SCOPE).href;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  // Only this public portal shell is cached. Auth callbacks, API calls and other course sites stay on the network.
  if(request.method!=='GET'||url.origin!==SCOPE.origin||request.headers.has('authorization'))return;
  const navigation=request.mode==='navigate'&&(url.pathname===SCOPE.pathname||url.pathname===new URL('index.html',SCOPE).pathname);
  if(navigation){
    if(url.search)return;
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{const response=await fetch(request);if(response.ok){await cache.put(INDEX,response.clone()).catch(()=>{});return response}return await cache.match(INDEX)||response}
      catch{const saved=await cache.match(INDEX);return saved||new Response('当前离线，请联网后重新打开课程目录。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}
    })());return;
  }
  if(!STATIC.has(url.href)||url.pathname===SCOPE.pathname||url.href===INDEX)return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok&&response.type!=='opaque')await cache.put(request,response.clone()).catch(()=>{});return response})());
});
