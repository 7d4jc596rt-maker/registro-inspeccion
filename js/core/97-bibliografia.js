/* =====================================================================
   Versión 4.3 · Módulo «Bibliografía»
   Artículos, libros, sentencias y otras lecturas sobre inspección, con los apuntes propios.
   db.bibliografia = [{id,seedId,titulo,anio,leido,publicadoEn,temas:[…],tipo,url,valoracion(0-3),
                       apuntes,documentos:[{nombre,descripcion}],creado,modificado,origen}]
   Los PDF no van en el archivo cifrado: solo su nombre. Los archivos viven en
   BoxAbalar › Registro › Documentos › Bibliografia.
   Al final del archivo: importación y exportación del paquete de notas de reuniones y bibliografía.
   ===================================================================== */
const BIBLIO_TIPOS=['Artículo','Libro','Caso práctico','Sentencia','Normativa','Informe'];
let biblioUi={q:'',tipo:'',pub:'',leido:'',val:'',temas:[],sort:'reciente',allTags:false};
const biblioSearchCache=new Map();

function bStars(n){n=Math.max(0,Math.min(3,Number(n)||0));return n?`<span class="b-stars" title="Valoración: ${n} de 3" aria-label="Valoración: ${n} de 3">${'★'.repeat(n)}<span class="off">${'★'.repeat(3-n)}</span></span>`:''}
function bAllTemas(list=db.bibliografia){
 const m=new Map();
 list.forEach(x=>(x.temas||[]).forEach(t=>{const k=cNorm(t);const o=m.get(k)||{tag:t,n:0};o.n++;m.set(k,o)}));
 return [...m.values()].sort((a,b)=>b.n-a.n||a.tag.localeCompare(b.tag,'es'));
}
function bValues(field,base=[]){return [...new Set([...base,...db.bibliografia.map(x=>x[field]).filter(Boolean)])]}
function bSearchText(x){
 const key=(x.modificado||x.creado||'')+'|'+(x.titulo||'').length+'|'+(x.apuntes||'').length;
 const c=biblioSearchCache.get(x.id);if(c&&c.key===key)return c.text;
 const text=cNorm([x.titulo,x.anio,x.publicadoEn,x.tipo,(x.temas||[]).join(' '),x.apuntes,x.url,(x.documentos||[]).map(d=>d.nombre+' '+(d.descripcion||'')).join(' ')].join(' '));
 biblioSearchCache.set(x.id,{key,text});return text;
}
function bMatch(x,ignoreTags){
 const u=biblioUi;
 if(u.tipo&&(u.tipo==='__none'?!!x.tipo:x.tipo!==u.tipo))return false;
 if(u.pub&&x.publicadoEn!==u.pub)return false;
 if(u.leido==='si'&&!x.leido)return false;
 if(u.leido==='no'&&x.leido)return false;
 if(u.leido==='apuntes'&&!String(x.apuntes||'').trim())return false;
 if(u.val==='0'&&x.valoracion)return false;
 if(u.val&&u.val!=='0'&&(Number(x.valoracion)||0)<Number(u.val))return false;
 if(!ignoreTags&&u.temas.length){const set=new Set((x.temas||[]).map(cNorm));if(!u.temas.every(t=>set.has(cNorm(t))))return false}
 if(u.q){const hay=bSearchText(x);if(!cNorm(u.q).split(/\s+/).filter(Boolean).every(w=>hay.includes(w)))return false}
 return true;
}
function toggleBTema(tag){
 const k=cNorm(tag),has=biblioUi.temas.some(t=>cNorm(t)===k);
 biblioUi.temas=has?biblioUi.temas.filter(t=>cNorm(t)!==k):[...biblioUi.temas,tag];
 filterBiblio();
}
function clearBiblioFilters(){biblioUi={q:'',tipo:'',pub:'',leido:'',val:'',temas:[],sort:biblioUi.sort,allTags:biblioUi.allTags};bibliografia()}
function filterByBTema(tag){biblioUi={q:'',tipo:'',pub:'',leido:'',val:'',temas:[tag],sort:biblioUi.sort,allTags:biblioUi.allTags};nav('bibliografia')}

/* ---------- Lista ---------- */
function biblioCard(x){
 const temas=(x.temas||[]).map(t=>`<button type="button" class="tagchip mini" data-t="${esc(t)}" onclick="toggleBTema(this.dataset.t)">${esc(t)}</button>`).join('');
 const nd=(x.documentos||[]).length,snip=nSnippet(x.apuntes,biblioUi.q,220);
 const meta=[x.anio,x.publicadoEn,x.tipo].filter(Boolean).map(esc).join(' · ');
 return `<div class="qitem"><div class="qhead"><button type="button" class="subject-link qtitle" onclick="biblioView('${x.id}')">${esc(x.titulo||'(sin título)')}</button>${bStars(x.valoracion)}</div>
  ${meta?`<div class="b-meta">${meta}</div>`:''}
  ${snip?`<div class="qresumen"><b>Apuntes:</b> ${esc(snip)}</div>`:''}
  <div class="qmeta">${temas}${x.leido?'<span class="pill ok">Leído</span>':'<span class="pill warn">Sin leer</span>'}${nd?`<span class="muted" title="Documentos asociados">📎 ${nd}</span>`:''}</div></div>`;
}
function filterBiblio(){
 const u=biblioUi,base=db.bibliografia.filter(x=>bMatch(x,true)),shown=base.filter(x=>bMatch(x,false));
 const counts=bAllTemas(base),sel=new Set(u.temas.map(cNorm));
 const selTags=u.temas.map(t=>({tag:t,n:(counts.find(c=>cNorm(c.tag)===cNorm(t))||{n:0}).n}));
 const rest=counts.filter(c=>!sel.has(cNorm(c.tag)));
 const limit=u.allTags?rest.length:Math.max(0,18-selTags.length);
 const chips=[...selTags.map(c=>[c,true]),...rest.slice(0,limit).map(c=>[c,false])];
 const bar=document.getElementById('btagbar');
 if(bar)bar.innerHTML=chips.map(([c,on])=>`<button type="button" class="tagchip ${on?'on':''}" data-t="${esc(c.tag)}" onclick="toggleBTema(this.dataset.t)" aria-pressed="${on}">${esc(c.tag)}<small>${c.n}</small></button>`).join('')
  +(rest.length>limit?`<button type="button" class="tagchip more" onclick="biblioUi.allTags=true;filterBiblio()">Ver todos los temas (${rest.length-limit} más)</button>`:(u.allTags&&rest.length>18?`<button type="button" class="tagchip more" onclick="biblioUi.allTags=false;filterBiblio()">Mostrar menos</button>`:''));
 const byTitle=(a,b)=>String(a.titulo).localeCompare(String(b.titulo),'es');
 const byRecent=(a,b)=>String(b.anio||'').localeCompare(String(a.anio||''))||String(b.creado||'').localeCompare(String(a.creado||''))||byTitle(a,b);
 const sorted=[...shown].sort(u.sort==='titulo'?byTitle:u.sort==='valoracion'?(a,b)=>(Number(b.valoracion)||0)-(Number(a.valoracion)||0)||byRecent(a,b):byRecent);
 const filtered=u.q.trim()||u.tipo||u.pub||u.leido||u.val||u.temas.length;
 const c=document.getElementById('bcount');
 if(c)c.innerHTML=`${shown.length} de ${db.bibliografia.length} ${db.bibliografia.length===1?'ficha':'fichas'}${filtered?` · <button type="button" class="linklike" onclick="clearBiblioFilters()">Quitar filtros</button>`:''}`;
 const list=document.getElementById('blist');
 if(list)list.innerHTML=sorted.map(biblioCard).join('')||`<div class="empty">${db.bibliografia.length?'No hay fichas con esos filtros.':'Todavía no hay fichas. Pulsa «+ Nueva ficha» para añadir la primera o «Importar…» para traer las que tenías en Notion.'}</div>`;
}
function bibliografia(){
 const u=biblioUi,opt=(v,l,cur)=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(l)}</option>`;
 document.getElementById('main').innerHTML=layout('Bibliografía','Artículos y otras lecturas sobre inspección, con tus apuntes',
  homeBtn()+`<button class="btn" onclick="importPaqueteStart()">Importar…</button><button class="btn primary" onclick="newBiblio()">+ Nueva ficha</button>`)
  +`<div class="panel"><div class="panelbody">
  <div class="toolbar"><input id="bsearch" class="input" type="search" style="flex:1 1 240px" placeholder="Buscar en título, apuntes, temas y publicación…" aria-label="Buscar en la bibliografía" value="${esc(u.q)}" oninput="biblioUi.q=this.value;filterBiblio()">
   <select class="select" aria-label="Publicado en" onchange="biblioUi.pub=this.value;filterBiblio()"><option value="">Todas las publicaciones</option>${bValues('publicadoEn').sort((a,b)=>a.localeCompare(b,'es')).map(p=>opt(p,p,u.pub)).join('')}</select>
   <select class="select" aria-label="Tipo de publicación" onchange="biblioUi.tipo=this.value;filterBiblio()"><option value="">Todos los tipos</option>${bValues('tipo').sort((a,b)=>a.localeCompare(b,'es')).map(t=>opt(t,t,u.tipo)).join('')}${opt('__none','Sin tipo',u.tipo)}</select>
   <select class="select" aria-label="Lectura" onchange="biblioUi.leido=this.value;filterBiblio()"><option value="">Leídos y sin leer</option>${opt('si','Leídos',u.leido)}${opt('no','Sin leer',u.leido)}${opt('apuntes','Con apuntes',u.leido)}</select>
   <select class="select" aria-label="Valoración" onchange="biblioUi.val=this.value;filterBiblio()"><option value="">Cualquier valoración</option>${opt('3','★★★',u.val)}${opt('2','★★ o más',u.val)}${opt('1','★ o más',u.val)}${opt('0','Sin valorar',u.val)}</select>
   <select class="select" aria-label="Orden" onchange="biblioUi.sort=this.value;filterBiblio()">${opt('reciente','Más recientes primero',u.sort)}${opt('titulo','Ordenar por título',u.sort)}${opt('valoracion','Mejor valoradas primero',u.sort)}</select></div>
  <div id="btagbar" class="tagcloud" role="group" aria-label="Filtrar por temas"></div>
  <p id="bcount" class="muted" style="font-size:12px;margin:0 0 10px"></p>
  <div id="blist" class="qlist"></div></div></div>`;
 filterBiblio();
}

/* ---------- Ficha ---------- */
function biblioView(id){
 const x=db.bibliografia.find(b=>b.id===id);if(!x){bibliografia();return}
 const temas=(x.temas||[]).map(t=>`<button type="button" class="tagchip mini" data-t="${esc(t)}" onclick="filterByBTema(this.dataset.t)" title="Ver todas las fichas de este tema">${esc(t)}</button>`).join('');
 const url=/^https?:\/\//i.test(x.url||'')?`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a>`:esc(x.url||'');
 document.getElementById('main').innerHTML=layout(esc(x.titulo||'(sin título)'),[x.tipo,x.publicadoEn,x.anio].filter(Boolean).map(esc).join(' · ')||'Bibliografía',
  `<button class="btn" onclick="bibliografia()">← Volver a la lista</button><button class="btn" onclick="copyBiblio('${x.id}')">Copiar texto</button><button class="btn primary" onclick="editBiblio('${x.id}')">Editar</button>`)
  +`<div class="panel"><div class="panelbody qdetail">
  <div class="qmeta" style="margin-top:0">${x.leido?'<span class="pill ok">Leído</span>':'<span class="pill warn">Sin leer</span>'}${bStars(x.valoracion)}<button type="button" class="linklike" onclick="toggleBiblioLeido('${x.id}')">${x.leido?'Marcar como no leído':'Marcar como leído'}</button></div>
  ${temas?`<div class="qmeta">${temas}</div>`:''}
  <h3>Apuntes</h3>
  <div class="qbody nbody">${nFmt(x.apuntes)||'<p class="muted">Todavía no hay apuntes. Pulsa «Editar» para escribirlos.</p>'}</div>
  ${docsListHTML(x.documentos,'Bibliografia','abrirDocBiblio',x.id)}
  <h3>Datos de la publicación</h3>
  <dl class="center-data-list">
   <div><dt>Publicado en</dt><dd>${esc(x.publicadoEn||'—')}</dd></div>
   <div><dt>Año</dt><dd>${esc(x.anio||'—')}</dd></div>
   <div><dt>Tipo de publicación</dt><dd>${esc(x.tipo||'—')}</dd></div>
   <div><dt>Enlace</dt><dd>${url||'—'}</dd></div>
   <div><dt>Registro</dt><dd>Creada ${x.creado?dateTime(x.creado):'—'}${x.modificado?' · Modificada '+dateTime(x.modificado):''}${x.origen==='importada'?' · Importada de Notion':''}</dd></div>
  </dl>
  <div style="margin-top:18px"><button class="btn danger" onclick="deleteBiblio('${x.id}')">Eliminar ficha…</button></div>
  </div></div>`;
 window.scrollTo(0,0);const m=document.getElementById('main');if(m)m.scrollTop=0;
}
function abrirDocBiblio(id,i){const x=db.bibliografia.find(b=>b.id===id),d=x&&(x.documentos||[])[i];if(d)docOpenFrom('Bibliografia',d.nombre)}
function toggleBiblioLeido(id){const x=db.bibliografia.find(b=>b.id===id);if(!x)return;x.leido=!x.leido;x.modificado=nowIso();save();biblioView(id)}
function deleteBiblio(id){
 const x=db.bibliografia.find(b=>b.id===id);if(!x)return;
 if(!confirm(`¿Eliminar la ficha «${x.titulo}»? Esta acción no se puede deshacer. Los archivos de la carpeta «Documentos» no se borran.`))return;
 db.bibliografia=db.bibliografia.filter(b=>b.id!==id);save();bibliografia();
}
async function copyBiblio(id){
 const x=db.bibliografia.find(b=>b.id===id);if(!x)return;
 const t=[x.titulo,[x.tipo,x.publicadoEn,x.anio].filter(Boolean).join(' · '),(x.temas||[]).length?'Temas: '+x.temas.join(', '):'',x.url||'','',x.apuntes||''].filter((s,i)=>s||i===4).join('\n').replace(/\n{3,}/g,'\n\n').trim();
 try{await navigator.clipboard.writeText(t);alert('Texto copiado.')}catch{alert('El navegador no permitió copiar automáticamente.')}
}

/* ---------- Formulario ---------- */
function biblioForm(x={}){
 const known=bAllTemas().map(c=>`<button type="button" class="tagchip mini" data-t="${esc(c.tag)}" onclick="addBTemaToForm(this.dataset.t)">${esc(c.tag)}</button>`).join('');
 const val=Math.max(0,Math.min(3,Number(x.valoracion)||0));
 return `<div class="formgrid">
  <div class="field full"><label for="bftitulo">Título</label><input id="bftitulo" class="input" style="width:100%" value="${esc(x.titulo)}"></div>
  <div class="field"><label for="bfpub">Publicado en</label>${selOtro('bfpub',bValues('publicadoEn').sort((a,b)=>a.localeCompare(b,'es')),x.publicadoEn||'','Otra publicación…','— Sin indicar —')}</div>
  <div class="field"><label for="bftipo">Tipo de publicación</label>${selOtro('bftipo',bValues('tipo',BIBLIO_TIPOS),x.tipo||'','Otro tipo…','— Sin indicar —')}</div>
  <div class="field"><label for="bfanio">Año</label><input id="bfanio" class="input" style="width:100%" inputmode="numeric" maxlength="4" value="${esc(x.anio||(x.id?'':String(new Date().getFullYear())))}"></div>
  <div class="field"><label for="bfval">Valoración</label><select id="bfval" class="select" style="width:100%"><option value="0" ${val===0?'selected':''}>Sin valorar</option><option value="1" ${val===1?'selected':''}>★</option><option value="2" ${val===2?'selected':''}>★★</option><option value="3" ${val===3?'selected':''}>★★★</option></select></div>
  <div class="field full"><label class="gate-check"><input id="bfleido" type="checkbox" ${x.leido?'checked':''}> Leído</label></div>
  <div class="field full"><label for="bftemas">Temas (separados por comas)</label><input id="bftemas" class="input" style="width:100%" value="${esc((x.temas||[]).join(', '))}" placeholder="Régimen disciplinario, Evaluación">
   <div class="tagcloud pick" aria-label="Temas existentes: pulsa para añadir">${known||'<span class="muted" style="font-size:12px">Todavía no hay temas.</span>'}</div></div>
  <div class="field full"><label for="bfapuntes">Apuntes</label><textarea id="bfapuntes" class="textarea" style="min-height:300px">${esc(x.apuntes)}</textarea>
   <p class="muted" style="font-size:12px;margin:4px 0 0">${N_FORMAT_HELP}</p></div>
  <div class="field full"><label for="bfurl">Enlace (opcional)</label><input id="bfurl" class="input" style="width:100%" type="url" value="${esc(x.url)}" placeholder="https://…"></div>
  <div class="field full"><label>Documentos (PDF del artículo)</label>${docsFormBlock('Bibliografia',x.documentos)}</div>
 </div>`;
}
function addBTemaToForm(tag){
 const i=document.getElementById('bftemas');if(!i)return;
 const cur=cParseTags(i.value);if(!cur.some(t=>cNorm(t)===cNorm(tag)))cur.push(tag);
 i.value=cur.join(', ');
}
function readBiblioForm(){
 const v=id=>document.getElementById(id).value;
 const known=bAllTemas();
 return {titulo:v('bftitulo').replace(/\s+/g,' ').trim(),publicadoEn:selOtroRead('bfpub'),tipo:selOtroRead('bftipo'),anio:v('bfanio').trim(),valoracion:Number(v('bfval'))||0,leido:document.getElementById('bfleido').checked,
  temas:cParseTags(v('bftemas')).map(t=>(known.find(c=>cNorm(c.tag)===cNorm(t))||{tag:t}).tag),apuntes:v('bfapuntes').replace(/\s+$/,''),url:v('bfurl').trim(),documentos:docsFormRead()};
}
function validBiblio(d){
 if(!d.titulo){alert('Escribe un título.');document.getElementById('bftitulo').focus();return false}
 if(d.url&&!/^https?:\/\//i.test(d.url)){alert('El enlace debe empezar por https:// o http://.');document.getElementById('bfurl').focus();return false}
 return true;
}
function newBiblio(){
 openModal('Nueva ficha de bibliografía',biblioForm({}),()=>{
  const d=readBiblioForm();if(!validBiblio(d))return;
  const x={id:uid(),creado:nowIso(),modificado:'',origen:'',...d};
  db.bibliografia.push(x);save();closeModal();biblioView(x.id);
 });
 docsFormRender();
 setTimeout(()=>document.getElementById('bftitulo')?.focus(),50);
}
function editBiblio(id){
 const x=db.bibliografia.find(b=>b.id===id);if(!x)return;
 openModal('Editar ficha de bibliografía',biblioForm(x),()=>{
  const d=readBiblioForm();if(!validBiblio(d))return;
  Object.assign(x,d,{modificado:nowIso()});save();closeModal();biblioView(id);
 });
 docsFormRender();
}
function exportBiblioCSV(){
 if(!db.bibliografia.length){alert('No hay fichas que exportar.');return}
 const rows=[['Título','Año','Publicado en','Tipo de publicación','Temas','Leído','Valoración','Enlace','Documentos','Apuntes'],
  ...[...db.bibliografia].sort((a,b)=>String(b.anio||'').localeCompare(String(a.anio||''))||String(a.titulo).localeCompare(String(b.titulo),'es')).map(x=>[x.titulo,x.anio,x.publicadoEn,x.tipo,(x.temas||[]).join(', '),x.leido?'Sí':'No',x.valoracion||'',x.url,(x.documentos||[]).map(d=>d.nombre).join(' | '),x.apuntes])];
 download(csvBlob(rows),'bibliografia.csv');
}

/* =====================================================================
   Paquete de notas de reuniones y bibliografía (importar y exportar)
   Archivo JSON sin cifrar: { format:'registro-inspeccion-paquete', reuniones:[…], bibliografia:[…] }
   ===================================================================== */
function importPaqueteStart(){
 const i=document.createElement('input');i.type='file';i.accept='application/json,.json';i.hidden=true;document.body.appendChild(i);
 i.onchange=e=>{importPaqueteFile(e);setTimeout(()=>i.remove(),0)};
 i.addEventListener('cancel',()=>i.remove());
 i.click();
}
function paqueteImage(m,used){
 if(!m||typeof m!=='object'||!imgSafe(m.thumb))return null;
 let id=String(m.id||'').replace(/[^A-Za-z0-9_-]/g,'');
 if(!id||used.has(id))id=uid();used.add(id);
 const data=imgSafe(m.data),file=/^[A-Za-z0-9_.-]+\.(bin|rimg)$/.test(String(m.file||''))&&id===m.id?m.file:`${todayIso()}-${id}.rimg`;
 const o={id,file,name:String(m.name||'imagen').slice(0,120),w:Number(m.w)||0,h:Number(m.h)||0,size:Number(m.size)||0,thumb:m.thumb,addedAt:String(m.addedAt||nowIso())};
 if(data)o.data=data;
 return data||m.storedAt?o:null;
}
function importPaqueteFile(e){
 const f=e.target.files[0];if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
  let data;try{data=JSON.parse(r.result)}catch{alert('El archivo no es un JSON válido.');return}
  if(!data||data.format!=='registro-inspeccion-paquete'||(!Array.isArray(data.reuniones)&&!Array.isArray(data.bibliografia))){alert('Este archivo no es un paquete de notas de reuniones y bibliografía de esta aplicación (notas_reuniones_y_bibliografia_v4_3.json).');return}
  const str=v=>String(v??''),docs=l=>Array.isArray(l)?l.filter(d=>d&&d.nombre).map(d=>({nombre:str(d.nombre),descripcion:str(d.descripcion)})):[];
  const haveR=new Set(db.reuniones.flatMap(x=>[x.seedId,'usr-'+x.id]).filter(Boolean)),haveB=new Set(db.bibliografia.flatMap(x=>[x.seedId,'usr-'+x.id]).filter(Boolean));
  const allR=(data.reuniones||[]).filter(x=>x&&(x.titulo||x.contenido)),allB=(data.bibliografia||[]).filter(x=>x&&x.titulo);
  const newR=allR.filter(x=>!x.seedId||!haveR.has(x.seedId)),newB=allB.filter(x=>!x.seedId||!haveB.has(x.seedId));
  const skipped=allR.length-newR.length+allB.length-newB.length;
  if(!newR.length&&!newB.length){alert(`No hay nada nuevo: las ${allR.length} notas de reuniones y las ${allB.length} fichas de bibliografía del archivo ya estaban importadas.`);return}
  if(!confirm(`Se añadirán ${newR.length} ${newR.length===1?'nota de reunión':'notas de reuniones'} y ${newB.length} ${newB.length===1?'ficha':'fichas'} de bibliografía${skipped?` (se omiten ${skipped} ya importadas)`:''}. No se modifica nada de lo que ya tengas. ¿Continuar?`))return;
  const now=nowIso(),usedImg=new Set(imgAll().map(m=>m.id));
  newR.forEach(x=>{
   const fecha=/^\d{4}-\d{2}-\d{2}$/.test(str(x.fecha))?x.fecha:'',tipo=str(x.tipo).trim();
   db.reuniones.push({id:uid(),seedId:str(x.seedId),titulo:str(x.titulo).trim()||rAutoTitle(tipo,fecha),fecha,tipo,contenido:str(x.contenido),documentos:docs(x.documentos),
    images:(Array.isArray(x.images)?x.images:[]).map(m=>paqueteImage(m,usedImg)).filter(Boolean),creado:str(x.creado)||now,modificado:str(x.modificado),origen:'importada'});
  });
  newB.forEach(x=>{
   db.bibliografia.push({id:uid(),seedId:str(x.seedId),titulo:str(x.titulo).trim(),anio:str(x.anio).trim(),leido:!!x.leido,publicadoEn:str(x.publicadoEn).trim(),temas:cParseTags((Array.isArray(x.temas)?x.temas:[]).join(',')),
    tipo:str(x.tipo).trim(),url:str(x.url).trim(),valoracion:Math.max(0,Math.min(3,Number(x.valoracion)||0)),apuntes:str(x.apuntes),documentos:docs(x.documentos),creado:str(x.creado)||now,modificado:str(x.modificado),origen:'importada'});
  });
  save();imgAutoTransfer();
  const view=document.querySelector('.nav button[data-view].active')?.dataset.view;
  nav(view==='bibliografia'||(!newR.length&&newB.length)?'bibliografia':view==='datos'?'datos':'reuniones');
  alert(`Importadas ${newR.length} ${newR.length===1?'nota de reunión':'notas de reuniones'} y ${newB.length} ${newB.length===1?'ficha':'fichas'} de bibliografía.`);
 };
 r.readAsText(f);e.target.value='';
}
function exportPaqueteJSON(){
 if(!db.reuniones.length&&!db.bibliografia.length){alert('No hay notas de reuniones ni fichas de bibliografía que exportar.');return}
 if(!confirm('El archivo con las notas de reuniones y la bibliografía sale SIN CIFRAR y sin las imágenes. ¿Descargarlo igualmente?'))return;
 const out={format:'registro-inspeccion-paquete',version:1,generado:todayIso(),
  reuniones:db.reuniones.map(x=>({seedId:x.seedId||('usr-'+x.id),titulo:x.titulo,fecha:x.fecha,tipo:x.tipo,contenido:x.contenido,documentos:x.documentos||[],creado:x.creado||'',modificado:x.modificado||''})),
  bibliografia:db.bibliografia.map(x=>({seedId:x.seedId||('usr-'+x.id),titulo:x.titulo,anio:x.anio,leido:!!x.leido,publicadoEn:x.publicadoEn,temas:x.temas||[],tipo:x.tipo,url:x.url,valoracion:x.valoracion||0,apuntes:x.apuntes,documentos:x.documentos||[],creado:x.creado||'',modificado:x.modificado||''}))};
 download(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}),'notas-reuniones-y-bibliografia-sin-cifrar.json');
}
