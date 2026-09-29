/* Registro de actuaciones · service worker · versión 3.1 (29/09/2026)
   Solo guarda en caché el código de la aplicación (nunca los datos).
   Estrategia: primero la red; si no hay conexión, la copia guardada. */
const CACHE='registro-inspeccion-3.1';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(FILES.map(f=>c.add(new Request(f,{cache:'reload'}))))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));
});
