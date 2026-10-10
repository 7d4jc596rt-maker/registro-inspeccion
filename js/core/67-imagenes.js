/* =====================================================================
   Versión 4.2 · Imágenes de las actuaciones (desde la 4.3, también de las notas de reuniones)
   - Al añadirlas se reducen a IMG_MAX píxeles de lado mayor (JPEG) y se
     les quita la información de la cámara (fecha, ubicación…).
   - Dentro del archivo cifrado queda siempre una miniatura.
   - La imagen completa se guarda cifrada en la carpeta «Adjuntos» de
     BoxAbalar (un archivo .bin por imagen). Si el equipo no puede escribir
     en la carpeta (iPhone, Safari, carpeta sin vincular), la imagen completa
     viaja dentro del archivo cifrado hasta que el registro se abre en un
     ordenador con la carpeta vinculada, que la traslada.
   - Las imágenes se cifran con una clave propia (db.attKey) que va dentro
     del registro: así siguen sirviendo aunque cambies la contraseña.
   Versión 4.4 · PDF adjuntos a las actuaciones (a.pdfs)
   - Se guardan tal cual, sin reducir, cifrados con la misma clave que las imágenes,
     en la carpeta «Adjuntos» (un archivo .rpdf por PDF). No llevan miniatura.
   - Con la carpeta disponible, el PDF se escribe en «Adjuntos» en el momento de
     añadirlo (si se cancela el formulario, se borra). Sin carpeta (iPhone), viaja
     dentro del archivo cifrado, con un tamaño máximo menor, hasta que el registro
     se abre en un ordenador con la carpeta vinculada.
   ===================================================================== */
const IMG_MAX=1600, IMG_QUALITY=0.82, IMG_THUMB=320, IMG_THUMB_QUALITY=0.6;
const IMG_MAGIC=[82,73,65,49]; /* «RIA1» */
let formImages=[];
/* Versión 4.3: las notas de reuniones también llevan imágenes. Sus archivos usan la extensión «.rimg» para que un
   equipo que siga con la versión 4.2 en caché no los tome por archivos sin usar de las actuaciones. */
let imgFormExt='bin';
/* Versión 4.4: los PDF usan «.rpdf», por el mismo motivo */
const IMG_FILE_RE=/\.(bin|rimg|rpdf)$/i;
const PDF_MAX=30*1048576, PDF_MAX_EMBED=5*1048576;
let formPdfs=[], formPdfNew=[], formSeq=0;
let pdfViewState=null;
let imgBusy=null, imgAdding=0;
let imgKeyCache={raw:'',key:null};
let imgViewState=null;

function migrateV42(){
 for(const k of ['contacts','contactTags'])if(!Array.isArray(db[k]))db[k]=[];
 db.actions.forEach(a=>{
  if(a.priority&&!PRIO_LABEL[a.priority])a.priority=normPriority(a.priority);
  if('images' in a&&!Array.isArray(a.images))delete a.images;
 });
}

/* ---------- Utilidades ---------- */
function imgB64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s)}
function imgUnb64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function imgSafe(u){return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(u||''))?u:''}
function imgDataBytes(dataUrl){return imgUnb64(String(dataUrl).split(',')[1]||'')}
function imgSizeTxt(n){return n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB'}
function imgOwners(){return [...db.actions,...(Array.isArray(db.reuniones)?db.reuniones:[])]}
function imgAll(){const out=[];imgOwners().forEach(a=>(Array.isArray(a.images)?a.images:[]).forEach(m=>out.push(m)));return out}
function pdfAll(){const out=[];db.actions.forEach(a=>(Array.isArray(a.pdfs)?a.pdfs:[]).forEach(m=>out.push(m)));return out}
/* Todos los adjuntos cifrados (imágenes y PDF) y los de un registro concreto */
function attAll(){return [...imgAll(),...pdfAll()]}
function attOf(x){return [...(Array.isArray(x&&x.images)?x.images:[]),...(Array.isArray(x&&x.pdfs)?x.pdfs:[])]}
function imgCanFolder(){return !!(window.__vault&&window.__vault.canDir)}

/* ---------- Cifrado de los archivos de la carpeta ---------- */
async function imgCryptoKey(create){
 if(!db.attKey){if(!create)return null;db.attKey=imgB64(crypto.getRandomValues(new Uint8Array(32)))}
 if(imgKeyCache.raw!==db.attKey)imgKeyCache={raw:db.attKey,key:await crypto.subtle.importKey('raw',imgUnb64(db.attKey),'AES-GCM',false,['encrypt','decrypt'])};
 return imgKeyCache.key;
}
async function imgEncrypt(id,bytes){
 const key=await imgCryptoKey(true),iv=crypto.getRandomValues(new Uint8Array(12));
 const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},key,bytes));
 const out=new Uint8Array(16+ct.length);out.set(IMG_MAGIC,0);out.set(iv,4);out.set(ct,16);return out;
}
async function imgDecrypt(id,buf){
 const b=buf instanceof Uint8Array?buf:new Uint8Array(buf);
 if(b.length<33||IMG_MAGIC.some((v,i)=>b[i]!==v))throw new Error('El archivo no es una imagen cifrada de esta aplicación.');
 const key=await imgCryptoKey(false);if(!key)throw new Error('Este registro no tiene clave de imágenes.');
 return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:b.subarray(4,16),additionalData:new TextEncoder().encode(id)},key,b.subarray(16)));
}

/* ---------- Reducción de tamaño ---------- */
function imgLoad(file){
 return new Promise((res,rej)=>{
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>res({im,url});
  im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('formato'))};
  im.src=url;
 });
}
function imgDraw(src,max){
 const w0=src.naturalWidth||src.width,h0=src.naturalHeight||src.height;
 if(!w0||!h0)throw new Error('formato');
 const k=Math.min(1,max/Math.max(w0,h0)),w=Math.max(1,Math.round(w0*k)),h=Math.max(1,Math.round(h0*k));
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(src,0,0,w,h);
 return c;
}
async function imgReduce(file){
 const {im,url}=await imgLoad(file);
 try{
  const c=imgDraw(im,IMG_MAX);
  const data=c.toDataURL('image/jpeg',IMG_QUALITY);
  const thumb=imgDraw(c,IMG_THUMB).toDataURL('image/jpeg',IMG_THUMB_QUALITY);
  if(!imgSafe(data)||!imgSafe(thumb))throw new Error('formato');
  return {w:c.width,h:c.height,data,thumb,size:Math.round((data.length-data.indexOf(',')-1)*3/4)};
 }finally{URL.revokeObjectURL(url)}
}

/* ---------- Formulario de la actuación ---------- */
/* withPdf: el formulario admite también PDF (solo las actuaciones) */
function imgFormBlock(ext,withPdf){
 imgFormExt=ext==='rimg'?'rimg':'bin';
 return `<div id="fImages" class="img-grid"></div>${withPdf?'<ul id="fPdfs" class="pdf-list" aria-label="PDF adjuntos" hidden></ul>':''}
 <div class="toolbar img-tools"><button type="button" class="btn" onclick="imgPick()">${withPdf?'Añadir imágenes o PDF…':'Añadir imágenes…'}</button><span id="fImgMsg" class="muted" role="status"></span></div>
 <p class="muted img-help">${withPdf?`Las imágenes se reducen automáticamente a ${IMG_MAX} píxeles de lado mayor. Los PDF se guardan tal cual, cifrados (hasta ${PDF_MAX/1048576} MB cada uno).`:`Se reducen automáticamente a ${IMG_MAX} píxeles de lado mayor.`} En el ordenador también puedes pegar una captura con Ctrl+V. Los cambios se aplican al pulsar «Guardar».</p>`;
}
function renderFormImages(){
 const box=document.getElementById('fImages');if(!box)return;
 const pbox=document.getElementById('fPdfs');
 const none=pbox?(formPdfs.length?'':'<p class="muted img-none">Sin imágenes ni PDF.</p>'):'<p class="muted img-none">Sin imágenes.</p>';
 box.innerHTML=formImages.map((m,i)=>`<figure class="img-thumb"><button type="button" class="img-open" onclick="imgView('${esc(m.id)}',true)" aria-label="Ver la imagen ${i+1}"><img src="${imgSafe(m.thumb)}" alt="Imagen ${i+1}${m.name?': '+esc(m.name):''}"></button>${m.data?`<span class="img-flag" title="La imagen completa va dentro del archivo cifrado hasta que se traslade a la carpeta «Adjuntos»">en el archivo</span>`:''}<button type="button" class="img-del" aria-label="Quitar la imagen ${i+1}" title="Quitar" onclick="imgRemoveForm('${esc(m.id)}')">×</button></figure>`).join('')||none;
 box.hidden=!box.innerHTML;
 if(pbox){
  pbox.innerHTML=formPdfs.map(m=>`<li class="pdf-item"><span class="pdf-ico" aria-hidden="true">PDF</span><span class="pdf-main"><button type="button" class="subject-link pdf-name" title="Abrir el PDF" onclick="pdfOpen('${esc(m.id)}',true)">${esc(m.name||'documento.pdf')}</button><span class="muted pdf-meta">${m.size?imgSizeTxt(m.size):''}${m.data?`${m.size?' · ':''}<span title="El PDF va dentro del archivo cifrado hasta que se traslade a la carpeta «Adjuntos»">en el archivo</span>`:''}</span></span><button type="button" class="pdf-del" aria-label="Quitar el PDF ${esc(m.name||'')}" title="Quitar" onclick="pdfRemoveForm('${esc(m.id)}')">×</button></li>`).join('');
  pbox.hidden=!formPdfs.length;
 }
}
function imgMsg(t){const e=document.getElementById('fImgMsg');if(e)e.textContent=t||''}
function imgPick(){
 const inp=document.createElement('input');inp.type='file';inp.accept=document.getElementById('fPdfs')?'image/*,application/pdf,.pdf':'image/*';inp.multiple=true;inp.hidden=true;document.body.appendChild(inp);
 inp.onchange=async()=>{const files=[...inp.files];inp.remove();await imgAddFiles(files)};
 inp.addEventListener('cancel',()=>inp.remove());
 inp.click();
}
function pdfIsFile(f){return !!f&&(f.type==='application/pdf'||/\.pdf$/i.test(f.name||''))}
async function imgAddFiles(files){
 const withPdf=!!document.getElementById('fPdfs'),seq=formSeq;
 files=files.filter(f=>f&&(pdfIsFile(f)||!f.type||f.type.startsWith('image/')));
 if(!files.length)return;
 const bad=[],notes=[];let done=0;imgAdding++;
 const btn=document.getElementById('modalSave');if(btn)btn.disabled=true;
 try{
  for(const f of files){
   if(seq!==formSeq)return; /* el formulario se cerró mientras se preparaban los archivos */
   imgMsg(`Preparando ${done+1} de ${files.length}…`);
   try{
    if(pdfIsFile(f)){
     const err=withPdf?await pdfAddFile(f,seq):`«${f.name||'documento.pdf'}»: aquí solo se pueden añadir imágenes.`;
     if(err)notes.push(err);
    }else{
     const r=await imgReduce(f),id=uid();
     if(seq!==formSeq)return;
     formImages.push({id,file:`${todayIso()}-${id}.${imgFormExt}`,name:String(f.name||'imagen').slice(0,120),w:r.w,h:r.h,size:r.size,thumb:r.thumb,data:r.data,addedAt:nowIso()});
     renderFormImages();
    }
   }catch(e){console.warn(e);bad.push(f.name||'archivo')}
   done++;
  }
 }finally{imgAdding--;if(btn&&!imgAdding)btn.disabled=false}
 if(seq!==formSeq)return;
 imgMsg([bad.length?`No se pudo leer: ${bad.join(', ')}. Usa JPG${withPdf?', PNG o PDF':' o PNG'}.`:'',...notes].filter(Boolean).join(' '));
}
function imgRemoveForm(id){formImages=formImages.filter(m=>m.id!==id);renderFormImages()}
document.addEventListener('paste',e=>{
 if(!document.getElementById('fImages')||!document.getElementById('modal').classList.contains('show'))return;
 const cd=e.clipboardData;if(!cd||!cd.files||!cd.files.length)return;
 if(cd.getData('text/plain'))return; /* texto copiado de un documento: se pega como texto */
 const withPdf=!!document.getElementById('fPdfs');
 const files=[...cd.files].filter(f=>f.type.startsWith('image/')||(withPdf&&pdfIsFile(f)));if(!files.length)return;
 e.preventDefault();imgAddFiles(files);
});

/* ---------- PDF del formulario de la actuación (versión 4.4) ---------- */
function pdfLooksOk(bytes){const n=Math.min(bytes.length,1024)-4;for(let i=0;i<n;i++)if(bytes[i]===37&&bytes[i+1]===80&&bytes[i+2]===68&&bytes[i+3]===70&&bytes[i+4]===45)return true;return false} /* «%PDF-» */
function pdfDropFile(file){try{Promise.resolve(window.__vault?.attDelete?.(file)).catch(e=>console.warn(e))}catch(e){console.warn(e)}}
/* Al abrir el formulario de una actuación */
function pdfFormStart(list){pdfFormDiscard();formPdfs=(Array.isArray(list)?list:[]).map(m=>({...m}))}
/* Al guardar: los PDF escritos durante esta edición se quedan */
function pdfFormKeep(){formPdfNew=[]}
/* Al cerrar cualquier formulario: se borran de «Adjuntos» los PDF añadidos que no se llegaron a guardar */
function pdfFormDiscard(){
 formSeq++;
 const files=formPdfNew;formPdfNew=[];
 if(!files.length)return;
 const used=new Set(attAll().map(m=>m.file));
 files.forEach(f=>{if(!used.has(f))pdfDropFile(f)});
}
/* Devuelve '' si se ha añadido, o el motivo por el que no */
async function pdfAddFile(f,seq){
 const name=String(f.name||'documento.pdf').slice(0,160);
 if(!f.size)return `«${name}» está vacío.`;
 let ready=false;try{ready=!!(await window.__vault?.attReady?.())}catch(e){console.warn(e)}
 if(f.size>(ready?PDF_MAX:PDF_MAX_EMBED))return ready
  ?`«${name}» ocupa ${imgSizeTxt(f.size)} y el máximo es ${PDF_MAX/1048576} MB.`
  :`«${name}» ocupa ${imgSizeTxt(f.size)}. En este equipo los PDF viajan dentro del archivo cifrado y el máximo es ${PDF_MAX_EMBED/1048576} MB: añádelo desde un ordenador con la carpeta de BoxAbalar vinculada y con permiso.`;
 const bytes=new Uint8Array(await f.arrayBuffer());
 if(!pdfLooksOk(bytes))return `«${name}» no es un PDF válido.`;
 const id=uid(),m={id,file:`${todayIso()}-${id}.rpdf`,name,size:bytes.length,addedAt:nowIso()};
 if(ready){
  try{await window.__vault.attWrite(m.file,await imgEncrypt(id,bytes));m.storedAt=nowIso()}
  catch(e){
   console.warn('No se pudo escribir el PDF en la carpeta',e);
   if(bytes.length>PDF_MAX_EMBED)return `No se pudo guardar «${name}» en la carpeta «Adjuntos». Comprueba en «Datos y seguridad» que la carpeta de BoxAbalar está vinculada y con permiso.`;
  }
 }
 if(seq!==formSeq){if(m.storedAt)pdfDropFile(m.file);return ''}
 if(m.storedAt)formPdfNew.push(m.file);else m.data='data:application/pdf;base64,'+imgB64(bytes);
 formPdfs.push(m);renderFormImages();
 return '';
}
function pdfRemoveForm(id){
 const m=formPdfs.find(p=>p.id===id);if(!m)return;
 formPdfs=formPdfs.filter(p=>p.id!==id);
 if(formPdfNew.includes(m.file)){formPdfNew=formPdfNew.filter(f=>f!==m.file);pdfDropFile(m.file)}
 renderFormImages();
}

/* ---------- Traslado a la carpeta «Adjuntos» ---------- */
async function imgTransferPending(){
 if(imgBusy)return imgBusy;
 imgBusy=(async()=>{
  const r={moved:0,failed:0,ready:false};
  try{
   if(!window.__vault||!window.__vault.attReady||!(await window.__vault.attReady()))return r;
   r.ready=true;
   for(const m of attAll()){
    if(!m.data)continue;
    try{
     if(!m.file)m.file=`${String(m.addedAt||nowIso()).slice(0,10)}-${m.id}.bin`;
     await window.__vault.attWrite(m.file,await imgEncrypt(m.id,imgDataBytes(m.data)));
     delete m.data;m.storedAt=nowIso();r.moved++;
    }catch(e){console.warn('No se pudo trasladar el adjunto',e);r.failed++}
   }
   if(r.moved)save();
  }catch(e){console.warn(e)}
  return r;
 })();
 try{return await imgBusy}finally{imgBusy=null}
}
function imgAutoTransfer(){setTimeout(()=>{imgTransferPending().then(r=>{if(r&&r.moved)window.__coreRefreshDatos&&window.__coreRefreshDatos()})},0)}
window.__coreDirReady=()=>{imgTransferPending().then(()=>{window.__coreRefreshDatos&&window.__coreRefreshDatos()})};
/* Tras guardar o eliminar una actuación: borra de la carpeta los archivos de las imágenes y los PDF quitados y traslada los nuevos */
async function imgAfterSave(removed){
 try{
  for(const m of removed||[]){if(m&&m.file&&!m.data&&!attAll().some(n=>n.file===m.file))await window.__vault?.attDelete?.(m.file)}
 }catch(e){console.warn(e)}
 await imgTransferPending();
}

/* ---------- Visor ---------- */
function imgFind(id,fromForm){
 if(fromForm&&document.getElementById('fImages'))return {list:formImages,i:formImages.findIndex(m=>m.id===id)};
 for(const a of imgOwners()){const i=(Array.isArray(a.images)?a.images:[]).findIndex(m=>m.id===id);if(i>=0)return {list:a.images,i}}
 return {list:[],i:-1};
}
function imgViewEnsure(){
 if(document.getElementById('imgView'))return;
 const d=document.createElement('div');d.id='imgView';d.className='imgview';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Imagen');
 d.innerHTML=`<div class="imgview-bar"><span id="imgViewInfo"></span><span class="imgview-actions"><button type="button" class="btn small" id="imgViewPrev" aria-label="Imagen anterior">‹</button><button type="button" class="btn small" id="imgViewNext" aria-label="Imagen siguiente">›</button><button type="button" class="btn small" id="imgViewDl">Descargar</button><button type="button" class="btn small primary" id="imgViewClose">Cerrar</button></span></div><div class="imgview-body" id="imgViewBody"><img id="imgViewImg" alt=""></div><div class="imgview-note" id="imgViewNote" hidden></div>`;
 document.body.appendChild(d);
 document.getElementById('imgViewClose').onclick=imgViewClose;
 document.getElementById('imgViewPrev').onclick=()=>imgViewStep(-1);
 document.getElementById('imgViewNext').onclick=()=>imgViewStep(1);
 document.getElementById('imgViewDl').onclick=imgViewDownload;
 document.getElementById('imgViewBody').onclick=e=>{if(e.target.id==='imgViewBody')imgViewClose()};
 document.addEventListener('keydown',e=>{
  if(!imgViewState)return;
  if(e.key==='Escape'){e.stopPropagation();imgViewClose()}
  if(e.key==='ArrowLeft')imgViewStep(-1);
  if(e.key==='ArrowRight')imgViewStep(1);
 },true);
}
function imgViewClose(){
 const v=document.getElementById('imgView');if(v)v.classList.remove('show');
 if(imgViewState&&imgViewState.url)URL.revokeObjectURL(imgViewState.url);
 imgViewState=null;
}
function imgViewStep(d){if(!imgViewState)return;const n=imgViewState.i+d;if(n<0||n>=imgViewState.list.length)return;imgViewShow(imgViewState.list,n)}
function imgView(id,fromForm){
 const {list,i}=imgFind(id,fromForm);if(i<0)return;
 imgViewEnsure();document.getElementById('imgView').classList.add('show');
 imgViewShow(list,i);
}
async function imgViewShow(list,i){
 if(imgViewState&&imgViewState.url)URL.revokeObjectURL(imgViewState.url);
 const m=list[i],st=imgViewState={list,i,url:'',blob:null,m};
 const img=document.getElementById('imgViewImg'),note=document.getElementById('imgViewNote'),dl=document.getElementById('imgViewDl');
 document.getElementById('imgViewInfo').textContent=`Imagen ${i+1} de ${list.length}${m.w&&m.h?` · ${m.w} × ${m.h}`:''}${m.size?` · ${imgSizeTxt(m.size)}`:''}`;
 document.getElementById('imgViewPrev').disabled=i===0;document.getElementById('imgViewNext').disabled=i===list.length-1;
 img.src=imgSafe(m.thumb);img.alt=m.name||`Imagen ${i+1}`;img.classList.add('is-thumb');
 note.hidden=true;note.innerHTML='';dl.disabled=true;
 const full=bytes=>{if(imgViewState!==st)return;st.blob=new Blob([bytes],{type:'image/jpeg'});st.url=URL.createObjectURL(st.blob);img.src=st.url;img.classList.remove('is-thumb');dl.disabled=false;note.hidden=true};
 try{
  if(m.data&&imgSafe(m.data))return full(imgDataBytes(m.data));
  const buf=m.file?await window.__vault?.attRead?.(m.file,true):null;
  if(imgViewState!==st)return;
  if(buf)return full(await imgDecrypt(m.id,buf));
 }catch(e){console.warn(e)}
 if(imgViewState!==st)return;
 note.hidden=false;
 note.innerHTML=`<p>Se muestra la <b>miniatura</b>. La imagen completa está cifrada en BoxAbalar › Registro › Adjuntos, en el archivo <b>${esc(m.file||'')}</b>${imgCanFolder()?'. En este equipo no se ha podido leer: comprueba en «Datos y seguridad» que la carpeta está vinculada y con permiso, y que BoxAbalar ha terminado de sincronizar.':', y este equipo no puede leer esa carpeta por sí solo.'}</p><button type="button" class="btn small" id="imgViewPick">Elegir ese archivo…</button>`;
 document.getElementById('imgViewPick').onclick=()=>imgViewPickFile(st);
}
function imgViewPickFile(st){
 const inp=document.createElement('input');inp.type='file';inp.hidden=true;document.body.appendChild(inp);
 inp.onchange=async()=>{
  const f=inp.files[0];inp.remove();if(!f||imgViewState!==st)return;
  try{
   const bytes=await imgDecrypt(st.m.id,new Uint8Array(await f.arrayBuffer()));
   st.blob=new Blob([bytes],{type:'image/jpeg'});st.url=URL.createObjectURL(st.blob);
   const img=document.getElementById('imgViewImg');img.src=st.url;img.classList.remove('is-thumb');
   document.getElementById('imgViewDl').disabled=false;document.getElementById('imgViewNote').hidden=true;
  }catch(e){alert(`Ese archivo no corresponde a esta imagen. Busca «${st.m.file}» en BoxAbalar › Registro › Adjuntos.`)}
 };
 inp.addEventListener('cancel',()=>inp.remove());
 inp.click();
}
function imgViewDownload(){
 const st=imgViewState;if(!st||!st.blob)return;
 const base=String(st.m.name||'imagen').replace(/\.[^.]*$/,'').replace(/[\\/:*?"<>|]/g,'_')||'imagen';
 download(st.blob,base+'.jpg');
}

/* ---------- Abrir un PDF (versión 4.4) ----------
   El PDF se descifra en memoria y se abre en otra pestaña (en el iPhone, con el menú de compartir).
   Si el navegador bloquea la pestaña, o en el iPhone, queda este panel con el botón para abrirlo. */
function pdfIos(){return !!(window.__vault?.info?.().ios)}
function pdfFind(id,fromForm){
 if(fromForm&&document.getElementById('fPdfs')){const m=formPdfs.find(p=>p.id===id);if(m)return m}
 return pdfAll().find(p=>p.id===id)||null;
}
function pdfFileName(m){const base=(String(m.name||'documento').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim()||'documento');return /\.pdf$/i.test(base)?base:base+'.pdf'}
function pdfViewEnsure(){
 if(document.getElementById('pdfView'))return;
 const d=document.createElement('div');d.id='pdfView';d.className='imgview pdfview';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Documento PDF');
 d.innerHTML=`<div class="imgview-bar"><span id="pdfViewInfo"></span><span class="imgview-actions"><button type="button" class="btn small" id="pdfViewOpen"></button><button type="button" class="btn small" id="pdfViewDl">Descargar</button><button type="button" class="btn small primary" id="pdfViewClose">Cerrar</button></span></div><div class="imgview-body" id="pdfViewBody"><div class="pdfview-card"><span class="pdf-ico big" aria-hidden="true">PDF</span><p id="pdfViewName" class="pdfview-name"></p><p id="pdfViewMsg" class="pdfview-msg" role="status"></p></div></div><div class="imgview-note" id="pdfViewNote" hidden></div>`;
 document.body.appendChild(d);
 document.getElementById('pdfViewClose').onclick=pdfViewClose;
 document.getElementById('pdfViewOpen').onclick=()=>{const st=pdfViewState;if(!st||!st.blob)return;if(pdfIos())download(st.blob,pdfFileName(st.m));else if(pdfViewOpenTab())pdfViewClose();else pdfViewMsg('El navegador no ha dejado abrir otra pestaña. Usa «Descargar».')};
 document.getElementById('pdfViewDl').onclick=()=>{const st=pdfViewState;if(st&&st.blob)download(st.blob,pdfFileName(st.m))};
 document.getElementById('pdfViewBody').onclick=e=>{if(e.target.id==='pdfViewBody')pdfViewClose()};
 document.addEventListener('keydown',e=>{if(pdfViewState&&e.key==='Escape'){e.stopPropagation();pdfViewClose()}},true);
}
function pdfViewMsg(t){const e=document.getElementById('pdfViewMsg');if(e)e.textContent=t||''}
function pdfViewRelease(){
 const st=pdfViewState;pdfViewState=null;
 if(st&&st.url){const u=st.url;if(st.opened)setTimeout(()=>URL.revokeObjectURL(u),600000);else URL.revokeObjectURL(u)}
}
function pdfViewClose(){const v=document.getElementById('pdfView');if(v)v.classList.remove('show');pdfViewRelease()}
function pdfViewOpenTab(){
 const st=pdfViewState;if(!st||!st.url)return false;
 let w=null;try{w=window.open(st.url,'_blank')}catch(e){console.warn(e)}
 if(w)st.opened=true;
 return !!w;
}
function pdfViewReady(st,bytes,auto){
 if(pdfViewState!==st)return;
 if(!pdfLooksOk(bytes)){pdfViewMsg('El archivo descifrado no es un PDF válido.');return}
 st.blob=new Blob([bytes],{type:'application/pdf'});st.url=URL.createObjectURL(st.blob);
 document.getElementById('pdfViewOpen').disabled=false;document.getElementById('pdfViewDl').disabled=false;
 document.getElementById('pdfViewNote').hidden=true;
 if(auto&&!pdfIos()&&pdfViewOpenTab())return pdfViewClose();
 pdfViewMsg(pdfIos()?'PDF listo. Pulsa «Abrir o guardar».':'PDF listo. Pulsa «Abrir en otra pestaña».');
}
async function pdfOpen(id,fromForm){
 const m=pdfFind(id,fromForm);if(!m)return;
 pdfViewEnsure();pdfViewRelease();
 const st=pdfViewState={m,blob:null,url:'',opened:false},ios=pdfIos();
 const open=document.getElementById('pdfViewOpen'),dl=document.getElementById('pdfViewDl'),note=document.getElementById('pdfViewNote');
 document.getElementById('pdfViewInfo').textContent=`Documento PDF${m.size?' · '+imgSizeTxt(m.size):''}`;
 document.getElementById('pdfViewName').textContent=m.name||'documento.pdf';
 open.textContent=ios?'Abrir o guardar':'Abrir en otra pestaña';open.disabled=true;dl.disabled=true;dl.hidden=ios;
 note.hidden=true;note.innerHTML='';pdfViewMsg('Preparando el PDF…');
 document.getElementById('pdfView').classList.add('show');
 try{
  if(m.data)return pdfViewReady(st,imgDataBytes(m.data),true);
  const buf=m.file?await window.__vault?.attRead?.(m.file,true):null;
  if(pdfViewState!==st)return;
  if(buf)return pdfViewReady(st,await imgDecrypt(m.id,buf),true);
 }catch(e){console.warn(e)}
 if(pdfViewState!==st)return;
 pdfViewMsg('En este equipo no se ha podido leer el PDF.');
 note.hidden=false;
 note.innerHTML=`<p>El PDF está cifrado en BoxAbalar › Registro › Adjuntos, en el archivo <b>${esc(m.file||'')}</b>${imgCanFolder()?'. Comprueba en «Datos y seguridad» que la carpeta está vinculada y con permiso, y que BoxAbalar ha terminado de sincronizar.':', y este equipo no puede leer esa carpeta por sí solo.'}</p><button type="button" class="btn small" id="pdfViewPick">Elegir ese archivo…</button>`;
 document.getElementById('pdfViewPick').onclick=()=>pdfViewPickFile(st);
}
function pdfViewPickFile(st){
 const inp=document.createElement('input');inp.type='file';inp.hidden=true;document.body.appendChild(inp);
 inp.onchange=async()=>{
  const f=inp.files[0];inp.remove();if(!f||pdfViewState!==st)return;
  try{pdfViewReady(st,await imgDecrypt(st.m.id,new Uint8Array(await f.arrayBuffer())),false)}
  catch(e){alert(`Ese archivo no corresponde a este PDF. Busca «${st.m.file}» en BoxAbalar › Registro › Adjuntos.`)}
 };
 inp.addEventListener('cancel',()=>inp.remove());
 inp.click();
}

/* ---------- Panel de «Datos y seguridad» ---------- */
async function imgPanelHTML(){
 const nImg=imgAll().length,nPdf=pdfAll().length;
 const all=attAll(),emb=all.filter(m=>m.data),embBytes=emb.reduce((s,m)=>s+Math.round(m.data.length*3/4),0);
 const ready=!!(window.__vault&&window.__vault.attReady&&await window.__vault.attReady());
 const names=ready?await window.__vault.attList():null;
 let extra='',nOrph=0;
 if(names){
  const refs=new Set(all.map(m=>m.file).filter(Boolean)),have=new Set(names);
  nOrph=names.filter(n=>IMG_FILE_RE.test(n)&&!refs.has(n)).length;
  const missing=all.filter(m=>!m.data&&m.file&&!have.has(m.file));
  extra=`<div><dt>Archivos en «Adjuntos»</dt><dd>${names.length}${nOrph?` · ${nOrph} que ya no usa ninguna actuación ni nota`:''}</dd></div>`+
   (missing.length?`<div><dt>Adjuntos sin su archivo</dt><dd><b>${missing.length}</b>: su archivo no está en la carpeta. Puede que BoxAbalar aún no haya terminado de sincronizar.</dd></div>`:'');
 }
 const where=!imgCanFolder()
  ?`En este equipo las imágenes y los PDF nuevos viajan dentro del archivo cifrado (los PDF, hasta ${PDF_MAX_EMBED/1048576} MB cada uno). Se trasladarán a la carpeta «Adjuntos» de BoxAbalar la próxima vez que abras el registro en un ordenador con la carpeta vinculada.`
  :ready?'Las imágenes completas y los PDF se guardan cifrados en la carpeta «Adjuntos» de BoxAbalar. Dentro del archivo del registro solo queda una miniatura de cada imagen y el nombre de cada PDF.'
  :'Para sacar las imágenes y los PDF del archivo del registro, vincula la carpeta de BoxAbalar (o dale permiso) en el bloque de arriba. Mientras tanto se guardan dentro del archivo cifrado.';
 return `<h3>Imágenes y PDF de las actuaciones y de las notas de reuniones</h3><p class="muted" style="font-size:12px">${where}</p>
  <dl class="center-data-list"><div><dt>Imágenes</dt><dd>${nImg}</dd></div>
  <div><dt>PDF</dt><dd>${nPdf}</dd></div>
  <div><dt>Dentro del archivo</dt><dd>${emb.length?`<b>${emb.length}</b> (${imgSizeTxt(embBytes)}), pendientes de trasladar`:'Ninguno'}</dd></div>${extra}</dl>
  ${(emb.length&&ready)||nOrph?`<div class="toolbar">${emb.length&&ready?`<button class="btn" onclick="imgTransferNow()">Trasladar ahora a la carpeta</button>`:''}${nOrph?`<button class="btn danger" onclick="imgCleanOrphans()">Eliminar ${nOrph===1?'el archivo':`los ${nOrph} archivos`} sin usar…</button>`:''}</div>`:''}`;
}
async function imgTransferNow(){
 const r=await imgTransferPending();
 if(r&&r.failed)alert(`No se ${r.failed===1?'pudo trasladar 1 adjunto. Sigue':`pudieron trasladar ${r.failed} adjuntos. Siguen`} a salvo dentro del archivo.`);
 window.__coreRefreshDatos&&window.__coreRefreshDatos();
}
async function imgCleanOrphans(){
 const names=await window.__vault?.attList?.();if(!names)return;
 const refs=new Set([...attAll().map(m=>m.file),...formPdfNew].filter(Boolean)),orphans=names.filter(n=>IMG_FILE_RE.test(n)&&!refs.has(n));
 if(!orphans.length)return;
 if(!confirm(`Se eliminarán de la carpeta «Adjuntos» ${orphans.length} ${orphans.length===1?'archivo que no usa':'archivos que no usa'} ninguna actuación ni nota de reunión de este registro.\n\nHazlo solo si este equipo tiene la versión más reciente del registro. ¿Continuar?`))return;
 for(const n of orphans)await window.__vault.attDelete(n);
 window.__coreRefreshDatos&&window.__coreRefreshDatos();
}
