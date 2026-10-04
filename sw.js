/* Service worker del Registro de actuaciones · versión 4.1
   Guarda la aplicación (solo código, nunca datos) para poder abrirla sin conexión.
   La versión nueva se instala entera y empieza a usarse cuando se cierran todas las ventanas. */
const CACHE='registro-inspeccion-4.1';
const FILES=["./", "index.html", "css/app.css", "js/vault.js", "js/core/00-datos.js", "js/core/10-base-calendario.js", "js/core/20-centros-peticiones.js", "js/core/30-visitas.js", "js/core/40-seguimiento-otros-datos.js", "js/core/50-datos-importar-csv.js", "js/core/60-cursos-inicio-actuaciones.js", "js/core/65-pegar-actuacion.js", "js/core/70-centros.js", "js/core/75-dotacion-ficha.js", "js/core/80-centro-detalle-exportar.js", "js/core/85-importar-notion.js", "js/core/90-consultas.js", "js/core/92-copias-carpeta.js", "js/core/99-arranque.js", "manifest.webmanifest", "icon-180.png", "icon-512.png"];
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(new Request(f,{cache:'reload'})).catch(()=>{})))));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('registro-inspeccion-')&&k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch',e=>{
 const r=e.request;
 if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(caches.open(CACHE).then(async c=>{
  const hit=await c.match(r,{ignoreSearch:true});
  if(hit)return hit;
  try{const res=await fetch(r);if(res&&res.ok)c.put(r,res.clone());return res}
  catch(err){if(r.mode==='navigate'){const idx=await c.match('index.html');if(idx)return idx}throw err}
 }));
});
