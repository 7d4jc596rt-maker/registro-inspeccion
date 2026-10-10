/* =====================================================================
   Versión 4.3 · Módulo «Notas reuniones»
   Notas de las juntas de inspectores y de otras reuniones.
   db.reuniones = [{id,seedId,titulo,fecha,tipo,contenido,documentos:[{nombre,descripcion}],
                    images:[…],creado,modificado,origen}]
   - El texto usa el formato sencillo de nFmt (definido aquí; lo usa también la bibliografía).
   - Las imágenes siguen el mismo sistema que las de las actuaciones (67-imagenes.js): desde la 4.6, sin cifrar,
     en BoxAbalar › Registro › Documentos › Reuniones.
   - Los documentos no van en el archivo cifrado: solo su nombre. Los archivos viven en
     BoxAbalar › Registro › Documentos › Reuniones.
   ===================================================================== */
const REUNION_TIPOS=['Xunta provincial','Xunta de sede','Inspectores EOI','Formación','Otra'];
let reunionesUi={q:'',tipo:'',curso:'*',open:{}};
const reunionSearchCache=new Map();

/* ---------- Texto con formato sencillo (notas largas) ----------
   «## Título» y «### Subtítulo», párrafos, listas con «- » o «1. » (con sublistas y párrafos sangrados
   dentro de una viñeta), «**negrita**», «*cursiva*», «---» como separador, tablas con «|»,
   enlaces https://… y direcciones de correo. */
function nInline(s){
 s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
 s=s.replace(/(^|[^\w*])\*([^*\s](?:[^*]*[^*\s])?)\*(?![\w*])/g,'$1<i>$2</i>');
 s=s.replace(/(https?:\/\/[^\s<]*[^\s<.,;:)])/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
 s=s.replace(/(^|[\s(:;,])([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g,(m,p,e)=>`${p}<a href="mailto:${e}">${e}</a>`);
 return s;
}
const N_LI=/^(\s*)([-•*]|\d+[.)])\s+(.*)$/;
function nIsHd(l){return /^#{1,3}\s+\S/.test(l)}
function nIsTb(l){return /^\s*\|.*\|\s*$/.test(l)}
function nIsHr(l){return /^\s*-{3,}\s*$/.test(l)}
function nList(L,i){
 const items=[];let j=i,blank=false;
 while(j<L.length){
  const l=L[j];
  if(!l.trim()){
   let k=j+1;while(k<L.length&&!L[k].trim())k++;
   if(k<L.length&&(N_LI.test(L[k])||/^\s{2,}\S/.test(L[k]))){j=k;blank=true;continue}
   break;
  }
  const m=l.match(N_LI);
  if(m){items.push({ind:m[1].replace(/\t/g,'    ').length,tag:/\d/.test(m[2])?'ol':'ul',num:parseInt(m[2],10)||0,parts:[m[3]]});j++;blank=false;continue}
  if(nIsHd(l)||nIsTb(l)||nIsHr(l))break;
  const it=items[items.length-1];
  if(/^\s{2,}\S/.test(l)){if(blank)it.parts.push(l.trim());else it.parts[it.parts.length-1]+=' '+l.trim();j++;blank=false;continue}
  break;
 }
 let html='';const st=[];
 const open=it=>{html+=`<${it.tag}>`;st.push({ind:it.ind,tag:it.tag})};
 const closeTop=()=>{html+='</li></'+st.pop().tag+'>'};
 for(const it of items){
  while(st.length>1&&it.ind<st[st.length-1].ind&&it.ind<=st[st.length-2].ind)closeTop();
  if(!st.length)open(it);
  else if(it.ind>st[st.length-1].ind)open(it);
  else if(it.tag!==st[st.length-1].tag){closeTop();open(it)}
  else html+='</li>';
  const first=it.parts[0].replace(/^\[( |x|X)\]\s+/,(m,c)=>c===' '?'☐ ':'☑ ');
  html+=`<li${it.tag==='ol'&&it.num?` value="${it.num}"`:''}>`+nInline(esc(first))+it.parts.slice(1).map(p=>`<div class="li-cont">${nInline(esc(p))}</div>`).join('');
 }
 while(st.length)closeTop();
 return {html,end:j};
}
function nFmt(text){
 const L=String(text||'').replace(/\r/g,'').split('\n');const out=[];let i=0;
 while(i<L.length){
  const l=L[i];
  if(!l.trim()){i++;continue}
  if(nIsHr(l)){out.push('<hr>');i++;continue}
  const m=l.match(/^(#{1,3})\s+(.*)$/);
  if(m){const n=m[1].length<=2?3:4;out.push(`<h${n}>${nInline(esc(m[2].trim()))}</h${n}>`);i++;continue}
  if(nIsTb(l)){
   const rows=[];while(i<L.length&&nIsTb(L[i])){rows.push(L[i]);i++}
   const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
   const body=rows.filter(r=>!/^\s*\|[\s:|-]+\|\s*$/.test(r)).map(cells);
   if(body.length)out.push(`<div class="tablewrap"><table class="table"><thead><tr>${body[0].map(c=>`<th>${nInline(esc(c))}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r=>`<tr>${r.map(c=>`<td>${nInline(esc(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
   continue;
  }
  if(N_LI.test(l)){const r=nList(L,i);out.push(r.html);i=r.end;continue}
  const para=[];
  while(i<L.length&&L[i].trim()&&!N_LI.test(L[i])&&!nIsTb(L[i])&&!nIsHd(L[i])&&!nIsHr(L[i])){para.push(L[i].trim());i++}
  out.push('<p>'+para.map(p=>nInline(esc(p))).join('<br>')+'</p>');
 }
 return out.join('');
}
/* Texto sin marcas, para los resúmenes de las listas */
function nPlain(text){return String(text||'').replace(/^#{1,3}\s+(.*?)[\s:.]*$/gm,'$1:').replace(/^\s*([-•*]|\d+[.)])\s+/gm,'').replace(/^\s*-{3,}\s*$/gm,'').replace(/\*\*?/g,'').replace(/\s+/g,' ').trim()}
function nSnippet(text,q,len=190){
 const plain=nPlain(text);if(!plain)return '';
 let at=0;const w=cNorm(q).split(/\s+/).filter(Boolean)[0];
 if(w){let flat='';for(let i=0;i<plain.length;i++)flat+=(plain[i].normalize('NFD')[0]||plain[i]).toLowerCase();const k=flat.indexOf(w);if(k>60)at=k-60}
 const cut=plain.slice(at,at+len);
 return (at?'… ':'')+cut+(at+len<plain.length?' …':'');
}
const N_FORMAT_HELP='Formato: «## Título» para los apartados, «- » para listas, «1. » para listas numeradas, «**negrita**», «*cursiva*», «---» como separador y enlaces https://…';

/* ---------- Documentos asociados (comunes a las notas de reuniones y a la bibliografía) ---------- */
let docsForm=[],docsFormSub='';
function docsFormBlock(sub,docs){
 docsFormSub=sub;docsForm=(docs||[]).map(d=>({...d}));
 return `<div id="dfdocs"></div>
  <div class="toolbar" style="margin-top:6px"><button type="button" class="btn small" onclick="docsFormAddFile()">Copiar un archivo a «Documentos › ${esc(sub)}»…</button><button type="button" class="btn small" onclick="docsFormAddName()">Añadir solo el nombre</button></div>
  <p class="muted" style="font-size:12px;margin:4px 0 0">Los archivos no se guardan en el registro cifrado: van a BoxAbalar › Registro › Documentos › ${esc(sub)}, donde <b>no</b> están cifrados. En el registro solo queda su nombre.</p>`;
}
function docsFormRaw(){return [...document.querySelectorAll('#dfdocs .cfdoc')].map(r=>({nombre:r.querySelector('.cfdn').value.trim(),descripcion:r.querySelector('.cfdd').value.trim()}))}
function docsFormRead(){return docsFormRaw().filter(d=>d.nombre)}
function docsFormRender(){
 const box=document.getElementById('dfdocs');if(!box)return;
 box.innerHTML=docsForm.map((d,i)=>`<div class="cfdoc"><input class="input cfdn" placeholder="nombre-del-archivo.pdf" value="${esc(d.nombre)}" aria-label="Nombre del archivo"><input class="input cfdd" placeholder="Descripción (opcional)" value="${esc(d.descripcion||'')}" aria-label="Descripción"><button type="button" class="btn small danger" aria-label="Quitar documento" onclick="docsFormRemove(${i})">🗑️</button></div>`).join('')||'<p class="muted" style="font-size:12px;margin:0">Sin documentos.</p>';
}
function docsFormAddName(){docsForm=docsFormRaw();docsForm.push({nombre:'',descripcion:''});docsFormRender();const r=[...document.querySelectorAll('#dfdocs .cfdn')].pop();if(r)r.focus()}
function docsFormRemove(i){docsForm=docsFormRaw();docsForm.splice(i,1);docsFormRender()}
async function docsFormAddFile(){
 if(!window.__vault?.docSave){alert('No se puede copiar archivos en esta ventana.');return}
 const st=await window.__vault.dirStatus();
 if(!st.linked){alert(`Primero vincula la carpeta de BoxAbalar en «Datos y seguridad» › «Copias de seguridad y carpeta». Solo es posible en Chrome o Edge en el ordenador. Mientras tanto puedes usar «Añadir solo el nombre» y dejar el archivo tú mismo en BoxAbalar › Registro › Documentos › ${docsFormSub}.`);return}
 const inp=document.createElement('input');inp.type='file';inp.hidden=true;document.body.appendChild(inp);
 inp.onchange=async()=>{
  const f=inp.files[0];inp.remove();if(!f)return;
  try{const name=await window.__vault.docSave(f,docsFormSub);docsForm=docsFormRaw();docsForm.push({nombre:name,descripcion:''});docsFormRender()}
  catch(e){alert(e.message||'No se pudo copiar el archivo.')}
 };
 inp.addEventListener('cancel',()=>inp.remove());
 inp.click();
}
function docsListHTML(docs,sub,opener,id){
 if(!(docs||[]).length)return '';
 return `<h3>Documentos</h3><ul class="qdocs">${docs.map((d,i)=>`<li><button type="button" class="btn small" onclick="${opener}('${id}',${i})">Abrir</button> <b>${esc(d.nombre)}</b>${d.descripcion?` · <span class="muted">${esc(d.descripcion)}</span>`:''}</li>`).join('')}</ul><p class="muted" style="font-size:12px">Los documentos están en BoxAbalar › Registro › Documentos › ${esc(sub)}, fuera del archivo cifrado.</p>`;
}
async function docOpenFrom(sub,name){
 if(!window.__vault?.docOpen){alert('No se puede abrir documentos en esta ventana.');return}
 const r=await window.__vault.docOpen(name,sub);
 if(r&&r.cancel)return;
 if(r&&!r.ok)alert(r.msg||'No se pudo abrir el documento.');
 else if(r&&r.picked)alert(`Has abierto «${r.picked}», que no coincide con el nombre anotado («${name}»).`);
}

/* Desplegable con la opción «Otro…», que deja escribir un valor nuevo */
function selOtro(id,options,value,otherLabel='Otro…',emptyLabel=''){
 const opts=[...new Set(options.filter(Boolean))],known=!value||opts.includes(value);
 return `<select id="${id}" class="select" style="width:100%" onchange="selOtroToggle('${id}')">${emptyLabel?`<option value="" ${value?'':'selected'}>${esc(emptyLabel)}</option>`:''}${opts.map(o=>`<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o)}</option>`).join('')}<option value="__otro" ${known?'':'selected'}>${esc(otherLabel)}</option></select><input id="${id}Otro" class="input" style="width:100%;margin-top:6px" value="${known?'':esc(value)}" placeholder="Escríbelo aquí" aria-label="Otro valor" ${known?'hidden':''}>`;
}
function selOtroToggle(id){const s=document.getElementById(id),o=document.getElementById(id+'Otro');if(!s||!o)return;o.hidden=s.value!=='__otro';if(!o.hidden)o.focus()}
function selOtroRead(id){const s=document.getElementById(id);if(!s)return '';return (s.value==='__otro'?document.getElementById(id+'Otro').value:s.value).replace(/\s+/g,' ').trim()}

/* ---------- Utilidades de las notas ---------- */
function rFechaLarga(iso){
 const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return 'Sin fecha';
 const d=new Date(+m[1],+m[2]-1,+m[3]);
 const t=d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 return t.charAt(0).toUpperCase()+t.slice(1);
}
function rAutoTitle(tipo,fecha){
 const m=String(fecha||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
 return (tipo||'Reunión')+(m?` ${+m[3]}/${+m[2]}/${m[1].slice(2)}`:'');
}
function rTipos(){return [...new Set([...REUNION_TIPOS,...db.reuniones.map(r=>r.tipo).filter(Boolean)])]}
function rSorted(){return [...db.reuniones].sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')||String(b.creado||'').localeCompare(String(a.creado||'')))}
function rSearchText(x){
 const key=(x.modificado||x.creado||'')+'|'+(x.titulo||'').length+'|'+(x.contenido||'').length;
 const c=reunionSearchCache.get(x.id);if(c&&c.key===key)return c.text;
 const text=cNorm([x.titulo,x.tipo,date(x.fecha),x.contenido,(x.documentos||[]).map(d=>d.nombre+' '+(d.descripcion||'')).join(' ')].join(' '));
 reunionSearchCache.set(x.id,{key,text});return text;
}
function rMatch(x){
 const u=reunionesUi;
 if(u.tipo&&x.tipo!==u.tipo)return false;
 if(u.curso!=='*'&&courseOf(x.fecha)!==u.curso)return false;
 if(u.q){const hay=rSearchText(x);if(!cNorm(u.q).split(/\s+/).filter(Boolean).every(w=>hay.includes(w)))return false}
 return true;
}

/* ---------- Lista ---------- */
function reunionCard(x){
 const nd=(x.documentos||[]).length,ni=(x.images||[]).length,snip=nSnippet(x.contenido,reunionesUi.q);
 return `<div class="qitem"><div class="qhead"><button type="button" class="subject-link qtitle" onclick="reunionView('${x.id}')">${esc(x.titulo||'(sin título)')}</button>${x.tipo?`<span class="pill">${esc(x.tipo)}</span>`:''}<span class="muted r-date">${x.fecha?date(x.fecha):'Sin fecha'}</span></div>
  ${snip?`<div class="qresumen">${esc(snip)}</div>`:'<div class="qresumen muted">Sin texto.</div>'}
  ${nd||ni?`<div class="qmeta">${nd?`<span class="muted" title="Documentos asociados">📎 ${nd} ${nd===1?'documento':'documentos'}</span>`:''}${ni?`<span class="muted">${ni} ${ni===1?'imagen':'imágenes'}</span>`:''}</div>`:''}</div>`;
}
function reunionCourseToggle(el){reunionesUi.open[el.dataset.course]=el.open}
function filterReuniones(){
 const u=reunionesUi,shown=rSorted().filter(rMatch),filtered=!!(u.q.trim()||u.tipo||u.curso!=='*');
 const c=document.getElementById('rncount');
 if(c)c.innerHTML=`${shown.length} de ${db.reuniones.length} ${db.reuniones.length===1?'nota':'notas'}${filtered?` · <button type="button" class="linklike" onclick="clearReunionFilters()">Quitar filtros</button>`:''}`;
 const list=document.getElementById('rnlist');if(!list)return;
 if(!shown.length){list.innerHTML=`<div class="empty">${db.reuniones.length?'No hay notas con esos filtros.':'Todavía no hay notas. Pulsa «+ Nueva nota» para escribir la primera o «Importar…» para traer las que tenías en Notion.'}</div>`;return}
 const groups=new Map();
 shown.forEach(x=>{const k=courseOf(x.fecha)||'Sin fecha';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)});
 const keys=[...groups.keys()];
 list.innerHTML=keys.map((k,i)=>{
  const def=filtered||i<2,open=k in u.open&&!filtered?u.open[k]:def;
  return `<details class="r-course" data-course="${esc(k)}" ${open?'open':''} ontoggle="reunionCourseToggle(this)"><summary><span class="r-course-title">${k==='Sin fecha'?k:'Curso '+esc(k)}${k===currentCourse()?' (actual)':''}</span><span class="pill">${groups.get(k).length}</span><span class="special-arrow" aria-hidden="true">▶</span></summary><div class="qlist">${groups.get(k).map(reunionCard).join('')}</div></details>`}).join('');
}
function clearReunionFilters(){reunionesUi={q:'',tipo:'',curso:'*',open:reunionesUi.open};reuniones()}
function reuniones(){
 const u=reunionesUi,courses=[...new Set(db.reuniones.map(r=>courseOf(r.fecha)).filter(Boolean))].sort().reverse();
 if(u.curso!=='*'&&!courses.includes(u.curso))u.curso='*';
 document.getElementById('main').innerHTML=layout('Notas reuniones','Notas de las juntas de inspectores y de otras reuniones',
  homeBtn()+`<button class="btn" onclick="importPaqueteStart()">Importar…</button><button class="btn primary" onclick="newReunion()">+ Nueva nota</button>`)
  +`<div class="panel"><div class="panelbody">
  <div class="toolbar"><input id="rnsearch" class="input" type="search" style="flex:1 1 260px" placeholder="Buscar en el título y en el texto de las notas…" aria-label="Buscar en las notas de reuniones" value="${esc(u.q)}" oninput="reunionesUi.q=this.value;filterReuniones()">
   <select id="rntipo" class="select" aria-label="Tipo de reunión" onchange="reunionesUi.tipo=this.value;filterReuniones()"><option value="">Todos los tipos</option>${rTipos().map(t=>`<option ${u.tipo===t?'selected':''}>${esc(t)}</option>`).join('')}</select>
   <select id="rncurso" class="select" aria-label="Curso escolar" onchange="reunionesUi.curso=this.value;filterReuniones()"><option value="*">Todos los cursos</option>${courses.map(k=>`<option value="${k}" ${u.curso===k?'selected':''}>Curso ${k}${k===currentCourse()?' (actual)':''}</option>`).join('')}</select></div>
  <p id="rncount" class="muted" style="font-size:12px;margin:0 0 10px"></p>
  <div id="rnlist"></div></div></div>`;
 filterReuniones();
}

/* ---------- Nota ---------- */
function reunionView(id){
 const x=db.reuniones.find(r=>r.id===id);if(!x){reuniones();return}
 const order=rSorted().reverse(),pos=order.findIndex(r=>r.id===id),prev=order[pos-1],next=order[pos+1];
 const imgs=(x.images||[]).map((m,i)=>`<figure class="img-thumb"><button type="button" class="img-open" onclick="imgView('${esc(m.id)}')" aria-label="Ver la imagen ${i+1}"><img src="${imgSafe(m.thumb)}" alt="Imagen ${i+1}${m.name?': '+esc(m.name):''}"></button></figure>`).join('');
 document.getElementById('main').innerHTML=layout(esc(x.titulo||'(sin título)'),`${esc(x.tipo||'Reunión')} · ${esc(rFechaLarga(x.fecha))}`,
  `<button class="btn" onclick="reuniones()">← Volver a la lista</button><button class="btn" onclick="copyReunion('${x.id}')">Copiar texto</button><button class="btn primary" onclick="editReunion('${x.id}')">Editar</button>`)
  +`<div class="panel"><div class="panelbody qdetail">
  <div class="qbody nbody">${nFmt(x.contenido)||'<p class="muted">Sin texto.</p>'}</div>
  ${imgs?`<h3>Imágenes</h3><div class="img-grid">${imgs}</div>`:''}
  ${docsListHTML(x.documentos,'Reuniones','abrirDocReunion',x.id)}
  <div class="r-nav">${prev?`<button class="btn small" onclick="reunionView('${prev.id}')" title="${esc(prev.titulo)}">← Anterior: ${esc(prev.titulo)}</button>`:'<span></span>'}${next?`<button class="btn small" onclick="reunionView('${next.id}')" title="${esc(next.titulo)}">Siguiente: ${esc(next.titulo)} →</button>`:''}</div>
  <p class="meta-line" style="margin-top:16px">Creada ${x.creado?dateTime(x.creado):'—'}${x.modificado?' · Modificada '+dateTime(x.modificado):''}${x.origen==='importada'?' · Importada de Notion':''}</p>
  <div style="margin-top:14px"><button class="btn danger" onclick="deleteReunion('${x.id}')">Eliminar nota…</button></div>
  </div></div>`;
 window.scrollTo(0,0);const m=document.getElementById('main');if(m)m.scrollTop=0;
}
function abrirDocReunion(id,i){const x=db.reuniones.find(r=>r.id===id),d=x&&(x.documentos||[])[i];if(d)docOpenFrom('Reuniones',d.nombre)}
async function copyReunion(id){
 const x=db.reuniones.find(r=>r.id===id);if(!x)return;
 const t=`${x.titulo}\n${x.tipo||'Reunión'} · ${rFechaLarga(x.fecha)}\n\n${x.contenido||''}`;
 try{await navigator.clipboard.writeText(t);alert('Texto copiado.')}catch{alert('El navegador no permitió copiar automáticamente.')}
}
function deleteReunion(id){
 const x=db.reuniones.find(r=>r.id===id);if(!x)return;
 if(!confirm(`¿Eliminar la nota «${x.titulo}»? Esta acción no se puede deshacer.`))return;
 db.reuniones=db.reuniones.filter(r=>r.id!==id);save();reuniones();imgAfterSave(x.images||[]);
}

/* ---------- Formulario ---------- */
function reunionForm(x={}){
 formImages=(x.images||[]).map(m=>({...m}));
 const tipo=x.tipo||(x.id?'':REUNION_TIPOS[0]);
 return `<div class="formgrid">
  <div class="field"><label for="rffecha">Fecha de la reunión</label><input id="rffecha" class="input" type="date" style="width:100%" value="${esc(x.fecha||todayIso())}"></div>
  <div class="field"><label for="rftipo">Tipo de reunión</label>${selOtro('rftipo',rTipos(),tipo,'Otro tipo…')}</div>
  <div class="field full"><label for="rftitulo">Título</label><input id="rftitulo" class="input" style="width:100%" value="${esc(x.titulo)}" placeholder="Si lo dejas vacío se pone el tipo y la fecha: «Xunta provincial 7/10/26»"></div>
  <div class="field full"><label for="rfcontenido">Notas</label><textarea id="rfcontenido" class="textarea" style="min-height:340px">${esc(x.contenido)}</textarea>
   <p class="muted" style="font-size:12px;margin:4px 0 0">${N_FORMAT_HELP}</p></div>
  <div class="field full"><label>Imágenes</label>${imgFormBlock('rimg')}</div>
  <div class="field full"><label>Documentos</label>${docsFormBlock('Reuniones',x.documentos)}</div>
 </div>`;
}
function readReunionForm(){
 const v=id=>document.getElementById(id).value;
 const fecha=v('rffecha'),tipo=selOtroRead('rftipo');
 return {fecha,tipo,titulo:v('rftitulo').replace(/\s+/g,' ').trim()||rAutoTitle(tipo,fecha),contenido:v('rfcontenido').replace(/\s+$/,''),documentos:docsFormRead(),images:formImages.map(m=>({...m}))};
}
function newReunion(){
 openModal('Nueva nota de reunión',reunionForm({}),()=>{
  const d=readReunionForm();
  if(!d.contenido&&!d.images.length&&!d.documentos.length&&!confirm('La nota no tiene texto. ¿Guardarla igualmente?'))return;
  const x={id:uid(),creado:nowIso(),modificado:'',origen:'',...d};
  db.reuniones.push(x);save();closeModal();reunionView(x.id);imgAfterSave([]);
 });
 renderFormImages();docsFormRender();
 setTimeout(()=>document.getElementById('rfcontenido')?.focus(),50);
}
function editReunion(id){
 const x=db.reuniones.find(r=>r.id===id);if(!x)return;
 openModal('Editar nota de reunión',reunionForm(x),()=>{
  const before=(x.images||[]).map(m=>({...m}));
  Object.assign(x,readReunionForm(),{modificado:nowIso()});
  save();closeModal();reunionView(id);imgAfterSave(before.filter(m=>!x.images.some(n=>n.id===m.id)));
 });
 renderFormImages();docsFormRender();
}
