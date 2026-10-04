(()=>{
'use strict';
/* ================================================================
   Capa de seguridad y guardado del Registro de actuaciones
   - Cifrado AES-GCM 256 con clave derivada de la contraseña (PBKDF2-SHA256)
   - Archivo de datos .json cifrado, pensado para vivir en BoxAbalar
   - Chrome/Edge de escritorio: escritura directa en el archivo (File System Access)
   - iPhone / otros: copia cifrada en el dispositivo + «Guardar en BoxAbalar»
   ================================================================ */
const APP_VERSION='4.1 (04/10/2026)';
const APP_FILES_VERSION='4.1';
const FORMAT='registro-inspeccion-cifrado', FILE_VERSION=1, ITER=600000;
const DEFAULT_NAME='registro-inspeccion-cifrado.json';
const $=id=>document.getElementById(id);
const te=new TextEncoder(), td=new TextDecoder();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const b64=buf=>{let s='';const b=new Uint8Array(buf);for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const fmt=iso=>{if(!iso)return '—';const d=new Date(iso);return isNaN(d)?'—':d.toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})};
const hhmm=iso=>{const d=new Date(iso);return isNaN(d)?'':d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})};
const uuid=()=>crypto.randomUUID?crypto.randomUUID():b64(crypto.getRandomValues(new Uint8Array(16)));
function detectDevice(){const ua=navigator.userAgent;if(/iPhone/.test(ua))return 'iPhone';if(/iPad/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1))return 'iPad';if(/Macintosh/.test(ua))return 'Mac';if(/Windows/.test(ua))return 'Windows';if(/Android/.test(ua))return 'Android';return 'Otro equipo'}
const DEVICE=detectDevice();
const IS_IOS=DEVICE==='iPhone'||DEVICE==='iPad';
const CAN_FS=typeof window.showOpenFilePicker==='function'&&typeof window.showSaveFilePicker==='function';
const FILE_TYPES=[{description:'Registro cifrado',accept:{'application/json':['.json']}}];

/* ---------- Almacén local (IndexedDB) ---------- */
const idb={db:null,
 async open(){try{this.db=await new Promise((res,rej)=>{const r=indexedDB.open('registro-inspeccion',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}catch(e){console.warn('IndexedDB no disponible',e);this.db=null}},
 req(mode,fn){if(!this.db)return Promise.resolve(undefined);return new Promise((res,rej)=>{try{const r=fn(this.db.transaction('kv',mode).objectStore('kv'));r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}).catch(e=>{console.warn(e);return undefined})},
 get(k){return this.req('readonly',s=>s.get(k))},
 set(k,v){return this.req('readwrite',s=>s.put(v,k))},
 del(k){return this.req('readwrite',s=>s.delete(k))}
};

/* ---------- Cifrado ---------- */
async function deriveKey(password,saltB64,iterations){
 const base=await crypto.subtle.importKey('raw',te.encode(password.normalize('NFC')),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:unb64(saltB64),iterations},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad=h=>te.encode([h.format,h.version,h.id,h.kdf.salt,h.kdf.iterations,h.rev,h.savedAt,h.device].join('|'));
async function seal(data,rev){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const h={format:FORMAT,version:FILE_VERSION,id:S.id,kdf:{name:'PBKDF2',hash:'SHA-256',iterations:S.iter,salt:S.salt},cipher:'AES-GCM-256',iv:b64(iv),rev,savedAt:new Date().toISOString(),device:DEVICE};
 const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(h)},S.key,te.encode(JSON.stringify(data)));
 h.data=b64(ct);return h;
}
async function unseal(h,key){
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(h.iv),additionalData:aad(h)},key,unb64(h.data));
 return JSON.parse(td.decode(pt));
}
function parseFile(text){
 let h;try{h=JSON.parse(text)}catch{throw new Error('El archivo elegido no es un registro cifrado de esta aplicación.')}
 if(!h||h.format!==FORMAT||!h.kdf||!h.data)throw new Error('El archivo elegido no es un registro cifrado de esta aplicación.');
 return h;
}

/* ---------- Estado ---------- */
const S={key:null,salt:null,iter:ITER,id:null,handle:null,name:DEFAULT_NAME,rev:0,baseRev:0,dirty:false,pending:false,
 saving:null,timer:null,lastSaved:null,lastDevice:null,error:'',needPerm:false,conflict:null,unlocked:false,remembered:false,
 autolock:15,lastActivity:Date.now(),dismissedRev:0,data:null,ui:{}};

async function saveCache(text,h,pending){
 await idb.set('cache',{text,id:h.id,rev:h.rev,baseRev:S.baseRev,pending,savedAt:h.savedAt,device:h.device,name:S.name});
}

/* ---------- Diálogo propio (por encima de la puerta y de la app) ---------- */
function dialog(title,body,buttons){
 return new Promise(resolve=>{
  $('vdlgTitle').textContent=title;$('vdlgBody').innerHTML=body;
  const foot=$('vdlgFoot');foot.innerHTML='';
  buttons.forEach((b,i)=>{const el=document.createElement('button');el.type='button';el.className='btn '+(b.cls||'');el.textContent=b.label;
   el.onclick=async()=>{if(b.run){el.disabled=true;let close;try{close=await b.run()}finally{el.disabled=false}if(close===false)return}
    $('vdlg').classList.remove('show');resolve(b.value??i)};foot.appendChild(el)});
  $('vdlg').classList.add('show');
  const first=$('vdlgBody').querySelector('input');(first||foot.lastElementChild)?.focus();
 });
}

/* ---------- Puerta de entrada ---------- */
function gate(html){$('gateBody').innerHTML=html}
function gateWorking(text){gate(`<div class="gate-working" role="status"><span class="spinner" aria-hidden="true"></span>${esc(text)}</div>`)}

async function startScreen(message='',isError=false){
 const handle=await idb.get('handle'), cache=await idb.get('cache');
 const remembered=await idb.get('key');
 const parts=[];
 if(message)parts.push(`<p class="gate-msg ${isError?'bad':''}">${esc(message)}</p>`);
 if(handle&&CAN_FS){
  parts.push(`<button class="btn primary gate-main" id="gOpenHandle">Abrir mi registro</button>
   <p class="gate-note">Archivo vinculado: <b>${esc(handle.name)}</b>${remembered?'. La contraseña está recordada en este equipo.':''}</p>`);
 }else{
  parts.push(`<button class="btn primary gate-main" id="gPick">${cache?'Abrir el archivo de BoxAbalar':'Abrir mi archivo de datos'}</button>
   <p class="gate-note">${IS_IOS?'Se abrirá la app Archivos, normalmente en la última carpeta que usaste. Si no, entra en BoxAbalar › Registro (o en Favoritos) y elige el archivo del registro.':'Elige el archivo cifrado del registro en tu carpeta de BoxAbalar.'}</p>`);
  if(cache)parts.push(`<button class="btn gate-secondary" id="gOpenCache">Usar la copia de este dispositivo</button>
   <p class="gate-note">Guardada el ${esc(fmt(cache.savedAt))}.${cache.pending?' <b>Tiene cambios que aún no están en BoxAbalar.</b>':' Si has trabajado después en otro equipo, abre mejor el archivo de BoxAbalar.'}</p>`);
 }
 parts.push(`<div class="gate-alt">${handle&&CAN_FS?'<button class="btn" id="gPick">Abrir otro archivo…</button>':''}<button class="btn" id="gNew">Crear un registro nuevo</button></div>`);
 gate(parts.join(''));
 $('gOpenHandle')&&($('gOpenHandle').onclick=()=>openStoredHandle(handle));
 $('gPick')&&($('gPick').onclick=pickFile);
 $('gOpenCache')&&($('gOpenCache').onclick=()=>openFromCache(cache));
 $('gNew').onclick=()=>createScreen();
 ($('gOpenHandle')||$('gPick'))?.focus();
}

async function openStoredHandle(handle){
 try{
  let p=await handle.queryPermission({mode:'readwrite'});
  if(p!=='granted')p=await handle.requestPermission({mode:'readwrite'});
  if(p!=='granted'){startScreen('Sin permiso no puedo leer ni guardar el archivo. Vuelve a pulsar «Abrir mi registro» y acepta el aviso del navegador.',true);return}
  gateWorking('Leyendo el archivo…');
  const file=await handle.getFile();
  await processText(await file.text(),{handle,name:handle.name});
 }catch(e){
  console.error(e);
  startScreen(e.name==='NotFoundError'?'No encuentro el archivo vinculado; quizá se ha movido o renombrado. Ábrelo de nuevo con «Abrir otro archivo…».':(e.message||'No se pudo abrir el archivo.'),true);
 }
}

async function pickFile(){
 if(CAN_FS){
  let handle;
  try{[handle]=await window.showOpenFilePicker({types:FILE_TYPES,excludeAcceptAllOption:false,id:'registro-inspeccion'})}catch(e){if(e.name!=='AbortError')startScreen(e.message,true);return}
  try{
   gateWorking('Leyendo el archivo…');
   const file=await handle.getFile();
   await processText(await file.text(),{handle,name:handle.name});
  }catch(e){console.error(e);startScreen(e.message||'No se pudo abrir el archivo.',true)}
  return;
 }
 const input=$('gFile');input.value='';
 input.onchange=async()=>{const f=input.files[0];if(!f)return;
  try{gateWorking('Leyendo el archivo…');await processText(await f.text(),{handle:null,name:f.name})}
  catch(e){console.error(e);startScreen(e.message||'No se pudo abrir el archivo.',true)}};
 input.click();
}

async function openFromCache(cache){
 try{gateWorking('Preparando la copia…');await processText(cache.text,{handle:null,name:cache.name||DEFAULT_NAME,fromCache:cache})}
 catch(e){console.error(e);startScreen(e.message,true)}
}

/* Decide qué versión abrir (archivo o copia local) y pide la contraseña si hace falta */
async function processText(text,src){
 let h=parseFile(text), baseRev=h.rev, pending=false;
 const cache=src.fromCache||await idb.get('cache');
 if(src.fromCache){baseRev=cache.baseRev;pending=cache.pending}
 else if(cache&&cache.id===h.id&&cache.pending&&cache.rev!==h.rev){
  const both=h.rev>cache.baseRev;
  const choice=await dialog('Hay dos versiones del registro',
   `<p>Este dispositivo tiene cambios del <b>${esc(fmt(cache.savedAt))}</b> que no llegaron al archivo.</p>
    <p>El archivo que has abierto se guardó el <b>${esc(fmt(h.savedAt))}</b> desde ${esc(h.device||'otro equipo')}.</p>
    ${both?'<div class="notice warn-notice">El archivo también ha cambiado desde otro equipo. Elijas lo que elijas, los cambios de la otra versión no se incorporarán. Si dudas, abre primero una y descarga una copia cifrada de la otra desde «Datos y seguridad».</div>':'<p>Los cambios de este dispositivo son posteriores al archivo.</p>'}`,
   [{label:'Abrir el archivo',value:'file'},{label:'Abrir los cambios de este dispositivo',cls:'primary',value:'cache'}]);
  if(choice==='cache'){const fileRev=h.rev;h=parseFile(cache.text);baseRev=fileRev;pending=true}
 }
 const remembered=await idb.get('key');
 if(remembered&&remembered.salt===h.kdf.salt&&remembered.id===h.id){
  try{const data=await unseal(h,remembered.key);return finishOpen({data,h,key:remembered.key,remember:undefined,src,baseRev,pending})}
  catch(e){console.warn('La llave recordada ya no sirve',e)}
 }
 passwordScreen(h,src,baseRev,pending);
}

function passwordScreen(h,src,baseRev,pending,error=''){
 gate(`<form id="gPwForm" class="gate-form" autocomplete="off">
  <p class="gate-msg">Archivo: <b>${esc(src.name)}</b><br><span class="muted">Guardado el ${esc(fmt(h.savedAt))} desde ${esc(h.device||'—')}</span></p>
  ${error?`<p class="gate-msg bad" role="alert">${esc(error)}</p>`:''}
  <label for="gPw">Contraseña</label>
  <input id="gPw" type="password" class="input" autocomplete="current-password" required>
  <label class="gate-check"><input id="gRemember" type="checkbox" ${IS_IOS?'':'checked'}> Recordar la contraseña en este equipo</label>
  <p class="gate-note">Márcalo solo en equipos donde uses tu propia sesión. Quien abra la aplicación en este navegador podrá ver el registro sin contraseña.</p>
  <div class="gate-alt"><button type="button" class="btn" id="gBack">Volver</button><button type="submit" class="btn primary">Desbloquear</button></div>
 </form>`);
 $('gBack').onclick=()=>startScreen();
 $('gPw').focus();
 $('gPwForm').onsubmit=async ev=>{
  ev.preventDefault();
  const pw=$('gPw').value, remember=$('gRemember').checked;
  gateWorking('Comprobando la contraseña…');
  try{
   const key=await deriveKey(pw,h.kdf.salt,h.kdf.iterations||ITER);
   let data;try{data=await unseal(h,key)}catch{return passwordScreen(h,src,baseRev,pending,'La contraseña no es correcta.')}
   await finishOpen({data,h,key,remember,src,baseRev,pending});
  }catch(e){console.error(e);passwordScreen(h,src,baseRev,pending,e.message||'No se pudo descifrar el archivo.')}
 };
}

async function finishOpen({data,h,key,remember,src,baseRev,pending}){
 Object.assign(S,{key,salt:h.kdf.salt,iter:h.kdf.iterations||ITER,id:h.id,rev:h.rev,baseRev,pending,handle:src.handle||null,
  name:src.name||DEFAULT_NAME,lastSaved:h.savedAt,lastDevice:h.device});
 if(src.handle)await idb.set('handle',src.handle);
 if(remember===true)await idb.set('key',{key,salt:S.salt,id:S.id});
 if(remember===false)await idb.del('key');
 S.remembered=!!(await idb.get('key'));
 if(!src.fromCache&&!pending)await saveCache(JSON.stringify(h),h,false);
 await boot(data);
 if(pending&&S.handle){S.dirty=true;S.data=data;scheduleFlush()}
}

/* ---------- Crear un registro nuevo ---------- */
function createScreen(error=''){
 gate(`<form id="gNewForm" class="gate-form" autocomplete="off">
  <p class="gate-msg">Vas a crear un registro vacío y cifrado.${CAN_FS?' Después elegirás dónde guardarlo: escoge tu carpeta de BoxAbalar.':' Quedará en este dispositivo hasta que lo guardes en BoxAbalar.'}</p>
  ${error?`<p class="gate-msg bad" role="alert">${esc(error)}</p>`:''}
  <label for="gPw1">Contraseña (mínimo 10 caracteres)</label>
  <input id="gPw1" type="password" class="input" autocomplete="new-password" minlength="10" required>
  <label for="gPw2">Repite la contraseña</label>
  <input id="gPw2" type="password" class="input" autocomplete="new-password" minlength="10" required>
  <label class="gate-check"><input id="gRemember" type="checkbox" ${IS_IOS?'':'checked'}> Recordar la contraseña en este equipo</label>
  <div class="notice warn-notice">Si olvidas la contraseña no hay forma de recuperar los datos. Apúntala en un lugar seguro.</div>
  <div class="gate-alt"><button type="button" class="btn" id="gBack">Volver</button><button type="submit" class="btn primary">Crear registro</button></div>
 </form>`);
 $('gBack').onclick=()=>startScreen();
 $('gPw1').focus();
 $('gNewForm').onsubmit=async ev=>{
  ev.preventDefault();
  const p1=$('gPw1').value,p2=$('gPw2').value,remember=$('gRemember').checked;
  if(p1.length<10)return createScreen('La contraseña debe tener al menos 10 caracteres.');
  if(p1!==p2)return createScreen('Las dos contraseñas no coinciden.');
  let handle=null;
  if(CAN_FS){
   try{handle=await window.showSaveFilePicker({suggestedName:DEFAULT_NAME,types:FILE_TYPES,id:'registro-inspeccion'})}
   catch(e){if(e.name==='AbortError')return createScreen('Elige dónde guardar el archivo para continuar.');console.warn(e)}
  }
  gateWorking('Creando el registro cifrado…');
  const salt=b64(crypto.getRandomValues(new Uint8Array(16)));
  const key=await deriveKey(p1,salt,ITER);
  Object.assign(S,{key,salt,iter:ITER,id:uuid(),rev:0,baseRev:0,pending:false,handle,name:handle?handle.name:DEFAULT_NAME});
  if(handle)await idb.set('handle',handle);else await idb.del('handle');
  if(remember)await idb.set('key',{key,salt,id:S.id});else await idb.del('key');
  S.remembered=remember;
  await boot(null);
  S.data=window.__coreGetDb();S.dirty=true;await flushNow();
 };
}

/* ---------- Arranque de la aplicación ---------- */
const CORE_FILES=["00-datos.js", "10-base-calendario.js", "20-centros-peticiones.js", "30-visitas.js", "40-seguimiento-otros-datos.js", "50-datos-importar-csv.js", "60-cursos-inicio-actuaciones.js", "65-pegar-actuacion.js", "70-centros.js", "75-dotacion-ficha.js", "80-centro-detalle-exportar.js", "85-importar-notion.js", "90-consultas.js", "92-copias-carpeta.js", "99-arranque.js"];
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=res;s.onerror=()=>rej(new Error('No se pudo cargar '+src));document.body.appendChild(s)})}
async function boot(data){
 S.dir=(await idb.get('dir'))||null;
 window.__BOOT_DATA__=data||null;
 try{for(const f of CORE_FILES)await loadScript('js/core/'+f+'?v='+APP_FILES_VERSION)}
 catch(e){console.error(e);gate('<p class="gate-msg bad">No se pudieron cargar los archivos de la aplicación ('+esc(e.message)+'). Comprueba la conexión o que se hayan subido todos los archivos de la carpeta «js».</p>');return}
 $('gate').hidden=true;$('appShell').hidden=false;S.unlocked=true;
 S.lastActivity=Date.now();setStatus();
 if(S.handle)checkPermission();
}

/* ---------- Guardado ---------- */
function persist(d){if(!S.key)return;S.data=d;S.dirty=true;setStatus();scheduleFlush()}
function scheduleFlush(){clearTimeout(S.timer);S.timer=setTimeout(()=>flushNow(),600)}
async function perm(ask){
 if(!S.handle)return false;
 const o={mode:'readwrite'};
 try{if(await S.handle.queryPermission(o)==='granted'){S.needPerm=false;return true}
  if(ask&&await S.handle.requestPermission(o)==='granted'){S.needPerm=false;return true}}catch(e){console.warn(e)}
 S.needPerm=true;return false;
}
async function checkPermission(){if(!(await perm(false)))setStatus()}
async function readHandleHeader(){try{const f=await S.handle.getFile();const t=await f.text();return t.trim()?parseFile(t):null}catch(e){if(e.name==='NotFoundError')return null;throw e}}
async function writeHandle(text){const w=await S.handle.createWritable();await w.write(text);await w.close()}

async function flushNow(opts={}){
 clearTimeout(S.timer);
 while(S.saving)await S.saving;
 if(!S.dirty&&!opts.force)return;
 S.saving=(async()=>{
  try{
   S.dirty=false;S.error='';
   const data=S.data||window.__coreGetDb();
   const rev=Math.max(S.rev,S.baseRev)+1;
   const h=await seal(data,rev);
   const text=JSON.stringify(h);
   await dailyBackup();
   let wrote=false;
   if(S.handle&&await perm(false)){
    if(!opts.force){
     const cur=await readHandleHeader();
     if(cur&&cur.id===S.id&&cur.rev!==S.baseRev){
      S.rev=rev;S.pending=true;S.conflict=cur;await saveCache(text,h,true);
      setStatus();showConflict();return;
     }
    }
    await writeHandle(text);wrote=true;S.baseRev=rev;S.conflict=null;
   }
   S.rev=rev;S.pending=!wrote;S.lastSaved=h.savedAt;S.lastDevice=h.device;
   await saveCache(text,h,S.pending);
   if(S.dir&&!S.conflict)folderBackup(text).catch(()=>{});
  }catch(e){console.error(e);S.dirty=true;S.error=e.message||String(e)}
 })();
 try{await S.saving}finally{S.saving=null;setStatus()}
}

async function showConflict(){
 const cur=S.conflict;if(!cur)return;
 const choice=await dialog('El archivo ha cambiado en otro equipo',
  `<p>Desde que abriste el registro, el archivo se guardó el <b>${esc(fmt(cur.savedAt))}</b> desde <b>${esc(cur.device||'otro equipo')}</b>.</p>
   <p>Tus cambios de ahora están a salvo en este equipo, pero todavía no se han escrito en el archivo.</p>
   <div class="notice warn-notice">Si sobrescribes, se perderá lo que se hizo en el otro equipo. Si cargas el archivo, se perderá lo que acabas de hacer aquí. Puedes descargar antes una copia cifrada de tus cambios.</div>`,
  [{label:'Descargar copia de mis cambios',run:async()=>{await downloadEncrypted('mis-cambios');return false}},
   {label:'Cargar el archivo',value:'load'},
   {label:'Sobrescribir con mis cambios',cls:'primary',value:'overwrite'}]);
 if(choice==='overwrite'){try{await bkAdd(JSON.stringify(cur),cur,'Versión del otro equipo, antes de sobrescribir')}catch(e){console.warn(e)}S.baseRev=Math.max(S.baseRev,cur.rev);S.conflict=null;S.dirty=true;await flushNow({force:true})}
 if(choice==='load'){try{const c=await idb.get('cache');if(c&&c.text)await bkAdd(c.text,parseFile(c.text),'Tus cambios, antes de cargar el archivo')}catch(e){console.warn(e)}await reloadFromFile()}
}

async function reloadFromFile(){
 try{
  const f=await S.handle.getFile();const h=parseFile(await f.text());
  if(h.kdf.salt!==S.salt||h.id!==S.id){await idb.del('cache');location.reload();return}
  const data=await unseal(h,S.key);
  Object.assign(S,{rev:h.rev,baseRev:h.rev,pending:false,dirty:false,conflict:null,lastSaved:h.savedAt,lastDevice:h.device});
  await saveCache(JSON.stringify(h),h,false);
  window.__coreReplaceData(data);setStatus();
 }catch(e){console.error(e);S.error='No se pudo cargar el archivo: '+(e.message||e);setStatus()}
}

/* Al volver a la ventana, comprueba si otro equipo ha guardado una versión más reciente */
let focusBusy=false;
async function checkNewerOnFocus(){
 if(focusBusy||!S.unlocked||!S.handle||S.dirty||S.saving||S.conflict||$('vdlg').classList.contains('show'))return;
 focusBusy=true;
 try{
  if(!(await perm(false)))return setStatus();
  const cur=await readHandleHeader();
  if(cur&&cur.id===S.id&&cur.rev>S.baseRev&&cur.rev!==S.dismissedRev){
   const c=await dialog('Hay una versión más reciente',`<p>El registro se guardó el <b>${esc(fmt(cur.savedAt))}</b> desde <b>${esc(cur.device||'otro equipo')}</b>.</p><p>¿Quieres cargar esa versión? No tienes cambios sin guardar en esta ventana.</p>`,
    [{label:'Ahora no',value:'no'},{label:'Cargar la versión más reciente',cls:'primary',value:'yes'}]);
   if(c==='yes')await reloadFromFile();else S.dismissedRev=cur.rev;
  }
 }catch(e){console.warn(e)}finally{focusBusy=false}
}

/* ---------- Envío a BoxAbalar sin escritura directa (iPhone, Safari…) ---------- */
async function cacheText(){await flushNow();const c=await idb.get('cache');return c?.text||null}
async function exportToCloud(){
 if(CAN_FS&&!S.handle)return linkFile();
 const text=await cacheText();if(!text)return;
 const file=new File([text],S.name||DEFAULT_NAME,{type:'application/json'});
 if(navigator.canShare&&navigator.canShare({files:[file]})){
  try{await navigator.share({files:[file]});await markExported()}
  catch(e){if(e.name!=='AbortError'){console.warn(e);plainDownload(file,file.name);await markExported()}}
 }else{plainDownload(file,file.name);await markExported(true)}
}
async function markExported(downloaded){
 S.pending=false;S.baseRev=S.rev;
 const c=await idb.get('cache');if(c){c.pending=false;c.baseRev=S.rev;await idb.set('cache',c)}
 setStatus();
 if(downloaded)dialog('Archivo descargado','<p>El archivo cifrado se ha descargado. Muévelo a tu carpeta de BoxAbalar sustituyendo el anterior.</p>',[{label:'Entendido',cls:'primary'}]);
}
async function linkFile(){
 if(!CAN_FS)return exportToCloud();
 let handle;
 try{handle=await window.showSaveFilePicker({suggestedName:S.name||DEFAULT_NAME,types:FILE_TYPES,id:'registro-inspeccion'})}catch(e){if(e.name!=='AbortError')alert(e.message);return}
 S.handle=handle;S.name=handle.name;await idb.set('handle',handle);
 S.baseRev=Math.max(S.baseRev,S.rev);S.dirty=true;await flushNow({force:true});
 window.__coreRefreshDatos&&window.__coreRefreshDatos();
}

/* ---------- Descargas (PDF, CSV, copias) ---------- */
function plainDownload(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
async function deliver(blob,name){
 if(IS_IOS&&navigator.canShare){
  const f=new File([blob],name,{type:blob.type||'application/octet-stream'});
  if(navigator.canShare({files:[f]})){try{await navigator.share({files:[f]})}catch(e){if(e.name!=='AbortError')plainDownload(blob,name)}return}
 }
 plainDownload(blob,name);
}
async function downloadEncrypted(suffix='copia'){
 const text=await cacheText();if(!text)return;
 const d=new Date(),stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
 await deliver(new Blob([text],{type:'application/json'}),`registro-inspeccion-cifrado-${suffix}-${stamp}.json`);
}

/* ---------- Seguridad: contraseña, recordar, bloqueo ---------- */
async function changePassword(){
 await dialog('Cambiar la contraseña',
  `<div class="formgrid"><div class="field full"><label for="cpOld">Contraseña actual</label><input id="cpOld" type="password" class="input" autocomplete="current-password" style="width:100%"></div>
   <div class="field"><label for="cpNew">Nueva contraseña (mínimo 10 caracteres)</label><input id="cpNew" type="password" class="input" autocomplete="new-password" style="width:100%"></div>
   <div class="field"><label for="cpNew2">Repite la nueva contraseña</label><input id="cpNew2" type="password" class="input" autocomplete="new-password" style="width:100%"></div></div>
   <p id="cpErr" class="gate-msg bad" hidden></p>
   <p class="muted" style="font-size:12px">En tus otros equipos se te pedirá la nueva contraseña la próxima vez que abras el registro.</p>`,
  [{label:'Cancelar'},{label:'Cambiar contraseña',cls:'primary',run:async()=>{
   const err=m=>{$('cpErr').textContent=m;$('cpErr').hidden=false;return false};
   const old=$('cpOld').value,n1=$('cpNew').value,n2=$('cpNew2').value;
   if(n1.length<10)return err('La nueva contraseña debe tener al menos 10 caracteres.');
   if(n1!==n2)return err('Las dos contraseñas nuevas no coinciden.');
   const cache=await idb.get('cache');
   try{const k=await deriveKey(old,S.salt,S.iter);await unseal(parseFile(cache.text),k)}catch{return err('La contraseña actual no es correcta.')}
   const salt=b64(crypto.getRandomValues(new Uint8Array(16)));
   S.key=await deriveKey(n1,salt,ITER);S.salt=salt;S.iter=ITER;
   if(S.remembered)await idb.set('key',{key:S.key,salt,id:S.id});
   S.dirty=true;await flushNow();
   return true;
  }}]);
 window.__coreRefreshDatos&&window.__coreRefreshDatos();
}
async function setRemember(on){
 if(on)await idb.set('key',{key:S.key,salt:S.salt,id:S.id});else await idb.del('key');
 S.remembered=on;window.__coreRefreshDatos&&window.__coreRefreshDatos();
}
async function setUi(k,v){S.ui[k]=v;const s=(await idb.get('settings'))||{};s.ui=S.ui;await idb.set('settings',s)}
async function setAutolock(min){S.autolock=min;const s=(await idb.get('settings'))||{};s.autolock=min;await idb.set('settings',s)}
async function lock(){
 if(S.saving||S.dirty)await flushNow();
 if(S.dir){try{const t=(await idb.get('cache'))?.text;if(t)await folderBackup(t,true)}catch(e){console.warn(e)}}
 S.unlocked=false;location.reload();
}
['pointerdown','keydown','touchstart','wheel','scroll'].forEach(ev=>window.addEventListener(ev,()=>{S.lastActivity=Date.now()},{passive:true,capture:true}));
setInterval(()=>{if(S.unlocked&&S.autolock>0&&Date.now()-S.lastActivity>S.autolock*60000)lock()},15000);

/* ---------- Indicador de estado ---------- */
function setStatus(){
 const box=$('vaultStatus'),btn=$('vaultCloud');if(!box)return;
 let text='',cls='',action=null,label='';
 if(S.error){text='No se pudo guardar: '+S.error;cls='bad';action=()=>{S.dirty=true;flushNow()};label='Reintentar'}
 else if(S.conflict){text='El archivo cambió en otro equipo';cls='bad';action=showConflict;label='Resolver'}
 else if(S.saving||S.dirty){text='Guardando…'}
 else if(S.handle&&S.needPerm){text='Falta permiso para guardar en el archivo';cls='warn';action=async()=>{if(await perm(true)){S.dirty=true;await flushNow()}setStatus()};label='Permitir'}
 else if(S.handle){text=`Guardado en ${S.name} a las ${hhmm(S.lastSaved)}`;cls='ok'}
 else if(S.pending){text='Guardado en este dispositivo. Falta enviarlo a BoxAbalar.';cls='warn';action=exportToCloud;label=CAN_FS?'Vincular archivo':'Guardar en BoxAbalar'}
 else{text=S.lastSaved?`Registro al día (${hhmm(S.lastSaved)})`:'Registro abierto';cls='ok'}
 box.textContent=text;box.className='vault-status '+cls;
 if(action){btn.hidden=false;btn.textContent=label;btn.onclick=action}else btn.hidden=true;
}


/* ---------- Copias de seguridad automáticas (v4.0) ---------- */
const BK_MAX=10, BK_FILES=14, BK_FOLDER_EVERY=30*60*1000;
const pad2=n=>String(n).padStart(2,'0');
const dayKey=(d=new Date())=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const refreshDatos=()=>{window.__coreRefreshDatos&&window.__coreRefreshDatos()};
async function bkList(){const l=await idb.get('backups');return Array.isArray(l)?l:[]}
async function bkAdd(text,h,reason){
 try{
  const list=await bkList();
  list.unshift({at:new Date().toISOString(),day:dayKey(),rev:h.rev,device:h.device||'',reason,id:h.id,salt:(h.kdf&&h.kdf.salt)||'',text});
  while(list.length>BK_MAX)list.pop();
  await idb.set('backups',list);
 }catch(e){console.warn('No se pudo guardar la copia local',e)}
}
async function dailyBackup(){
 const today=dayKey();if(S.bkDay===today)return;S.bkDay=today;
 try{
  const list=await bkList();if(list.some(b=>b.day===today&&b.reason==='Inicio del día'))return;
  const c=await idb.get('cache');
  if(c&&c.text)await bkAdd(c.text,parseFile(c.text),'Inicio del día');
 }catch(e){console.warn(e)}
}

/* ---------- Carpeta «Registro» de BoxAbalar: copias y documentos (v4.0) ---------- */
const CAN_DIR=typeof window.showDirectoryPicker==='function';
async function dirPerm(ask){
 if(!S.dir)return false;const o={mode:'readwrite'};
 try{if(await S.dir.queryPermission(o)==='granted')return true;if(ask&&await S.dir.requestPermission(o)==='granted')return true}catch(e){console.warn(e)}
 return false;
}
async function folderBackup(text,force){
 if(!S.dir)return false;
 const today=dayKey(),now=Date.now();
 if(!force&&S.folderDay===today&&now-(S.lastFolderCopy||0)<BK_FOLDER_EVERY)return false;
 try{
  if(!(await dirPerm(false)))return false;
  const d=await S.dir.getDirectoryHandle('Copias',{create:true});
  const fh=await d.getFileHandle(`registro-inspeccion-${today}.json`,{create:true});
  const w=await fh.createWritable();await w.write(text);await w.close();
  S.lastFolderCopy=now;S.folderDay=today;S.lastFolderCopyAt=new Date().toISOString();
  const names=[];for await(const [n,h] of d.entries())if(h.kind==='file'&&/^registro-inspeccion-\d{4}-\d{2}-\d{2}\.json$/.test(n))names.push(n);
  names.sort();while(names.length>BK_FILES)await d.removeEntry(names.shift());
  return true;
 }catch(e){console.warn('Copia en la carpeta',e);return false}
}
async function dirStatus(){
 const st={can:CAN_DIR,linked:!!S.dir,name:S.dir?S.dir.name:'',ready:false,lastCopyAt:S.lastFolderCopyAt||null,copies:null};
 if(S.dir){
  st.ready=await dirPerm(false);
  if(st.ready){try{const d=await S.dir.getDirectoryHandle('Copias');let n=0;for await(const [k,h] of d.entries())if(h.kind==='file')n++;st.copies=n}catch{st.copies=0}}
 }
 return st;
}
async function linkDir(){
 if(!CAN_DIR){await dialog('No disponible','<p>Este navegador no permite vincular carpetas. Usa Chrome o Edge en el ordenador.</p>',[{label:'Entendido',cls:'primary'}]);return}
 let h;try{h=await window.showDirectoryPicker({id:'registro-carpeta',mode:'readwrite'})}catch(e){if(e.name!=='AbortError')alert(e.message);return}
 S.dir=h;await idb.set('dir',h);
 try{await h.getDirectoryHandle('Documentos',{create:true});await h.getDirectoryHandle('Copias',{create:true})}catch(e){console.warn(e)}
 const t=(await idb.get('cache'))?.text;if(t)await folderBackup(t,true);
 refreshDatos();
}
async function allowDir(){if(await dirPerm(true)){const t=(await idb.get('cache'))?.text;if(t)await folderBackup(t,true)}refreshDatos()}
async function unlinkDir(){
 const ok=await dialog('Desvincular la carpeta','<p>La aplicación dejará de escribir copias y de leer documentos en esa carpeta. No se borra nada de la carpeta.</p>',[{label:'Cancelar',value:false},{label:'Desvincular',cls:'primary',value:true}]);
 if(!ok)return;S.dir=null;await idb.del('dir');refreshDatos();
}
async function backupNow(){
 await flushNow({force:true});
 const c=await idb.get('cache');
 if(c&&c.text){await bkAdd(c.text,parseFile(c.text),'Copia manual');await folderBackup(c.text,true)}
 refreshDatos();
}
async function backupsMeta(){return (await bkList()).map((b,i)=>({i,at:b.at,reason:b.reason,device:b.device,rev:b.rev,bytes:(b.text||'').length}))}
async function downloadBackup(i){
 const b=(await bkList())[i];if(!b)return;
 const d=new Date(b.at);
 await deliver(new Blob([b.text],{type:'application/json'}),`registro-inspeccion-cifrado-copia-${dayKey(d)}-${pad2(d.getHours())}${pad2(d.getMinutes())}.json`);
}
async function restoreBackup(i){
 const b=(await bkList())[i];if(!b)return;
 let h,data;
 try{h=parseFile(b.text);data=await unseal(h,S.key)}
 catch{await dialog('No se puede restaurar aquí','<p>Esta copia se cifró con otra contraseña o está dañada. Descárgala y ábrela con «Cerrar y abrir otro archivo».</p>',[{label:'Entendido',cls:'primary'}]);return}
 const ok=await dialog('Restaurar copia',`<p>Se sustituirán <b>todos los datos actuales</b> por los de la copia del <b>${esc(fmt(b.at))}</b> (${esc(b.reason)}).</p><p>Antes se guarda una copia de los datos actuales.</p>`,[{label:'Cancelar',value:false},{label:'Restaurar',cls:'primary',value:true}]);
 if(!ok)return;
 try{const cur=(await idb.get('cache'))?.text;if(cur)await bkAdd(cur,parseFile(cur),'Antes de restaurar una copia')}catch(e){console.warn(e)}
 window.__coreReplaceData(data);S.data=window.__coreGetDb();S.dirty=true;await flushNow();
}

/* Documentos: los archivos viven en Registro/Documentos, fuera del archivo cifrado */
function openBlobFile(f){
 const url=URL.createObjectURL(f);
 const w=window.open(url,'_blank');
 if(!w)plainDownload(f,f.name);
 setTimeout(()=>URL.revokeObjectURL(url),120000);
}
function pickDoc(name){
 return new Promise(res=>{
  const inp=document.createElement('input');inp.type='file';inp.hidden=true;document.body.appendChild(inp);
  let done=false;const fin=r=>{if(done)return;done=true;inp.remove();res(r)};
  inp.onchange=()=>{const f=inp.files[0];if(!f)return fin({ok:false,cancel:true});openBlobFile(f);fin({ok:true,picked:f.name!==name?f.name:''})};
  inp.addEventListener('cancel',()=>fin({ok:false,cancel:true}));
  inp.click();
 });
}
async function docOpen(name){
 name=String(name||'').trim();
 if(!name)return {ok:false,msg:'El documento no tiene nombre.'};
 if(S.dir){
  try{
   if(await dirPerm(true)){
    const d=await S.dir.getDirectoryHandle('Documentos');
    const fh=await d.getFileHandle(name);
    openBlobFile(await fh.getFile());return {ok:true};
   }
  }catch(e){if(e.name!=='NotFoundError'&&e.name!=='TypeMismatchError')console.warn(e)}
 }
 return pickDoc(name);
}
async function docSave(file){
 if(!S.dir||!(await dirPerm(true)))throw new Error('Primero vincula la carpeta de BoxAbalar en «Datos y seguridad».');
 const d=await S.dir.getDirectoryHandle('Documentos',{create:true});
 const exists=async n=>{try{await d.getFileHandle(n);return true}catch{return false}};
 let name=file.name.replace(/[\\/:*?"<>|]/g,'_');
 if(await exists(name)){const m=name.match(/^(.*?)(\.[^.]*)?$/);let k=2,n2;do{n2=`${m[1]} (${k++})${m[2]||''}`}while(await exists(n2));name=n2}
 const fh=await d.getFileHandle(name,{create:true});const w=await fh.createWritable();await w.write(file);await w.close();
 return name;
}

/* ---------- API para la aplicación ---------- */
window.__vaultPersist=persist;
window.__vault={
 persist,deliver,exportToCloud,setUi,ui:(k,def)=>k in S.ui?S.ui[k]:def,linkFile,lock,changePassword,setRemember,setAutolock,downloadEncrypted,
 backups:backupsMeta,downloadBackup,restoreBackup,backupNow,dirStatus,linkDir,allowDir,unlinkDir,docOpen,docSave,
 saveNow:async()=>{S.dirty=true;await flushNow();window.__coreRefreshDatos&&window.__coreRefreshDatos()},
 info:()=>({name:S.name,linked:!!S.handle,canLink:CAN_FS,lastSaved:S.lastSaved,device:S.lastDevice,thisDevice:DEVICE,rev:S.rev,pending:S.pending,remembered:S.remembered,autolock:S.autolock,ios:IS_IOS,version:APP_VERSION})
};

window.addEventListener('beforeunload',e=>{if(S.unlocked&&(S.dirty||S.saving)){e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S.unlocked&&S.dirty)flushNow();if(document.visibilityState==='visible')checkNewerOnFocus()});
window.addEventListener('focus',checkNewerOnFocus);
$('vaultLock').onclick=lock;

/* ---------- Inicio ---------- */
(async()=>{
 if(!window.isSecureContext||!crypto.subtle){gate('<p class="gate-msg bad">Este navegador no permite el cifrado en esta página. Ábrela con Chrome o Edge, o desde su dirección https.</p>');return}
 await idb.open();
 const s=(await idb.get('settings'))||{};if(typeof s.autolock==='number')S.autolock=s.autolock;if(s.ui&&typeof s.ui==='object')S.ui=s.ui;
 $('appVersion')&&($('appVersion').textContent='Versión '+APP_VERSION);
 if(!idb.db&&IS_IOS)console.warn('Sin IndexedDB: la copia local no estará disponible');
 startScreen();
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Sin modo sin conexión',e));
})();
})();

