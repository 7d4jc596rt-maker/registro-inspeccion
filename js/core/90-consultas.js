/* =====================================================================
   Versión 4.0 · Módulo «Consultas y procedimientos»
   Fichas con tipo, etiquetas, normativa, documentos y fecha de revisión.
   Los documentos NO se guardan en el archivo cifrado: solo su nombre; los
   archivos viven en la carpeta «Documentos» de BoxAbalar (ver 88-copias).
   ===================================================================== */
const CONSULTA_TIPOS=['Consulta','Procedimiento','Criterio','Referencia'];
const CONSULTA_TIPO_AYUDA={Consulta:'Duda planteada y su respuesta',Procedimiento:'Pasos para tramitar algo',Criterio:'Criterio o postura que se aplica',Referencia:'Datos, plazos, enlaces o contactos'};
let consultasUi={q:'',tipo:'',rev:'',tags:[],sort:'titulo',allTags:false};
let consultaDocsForm=[];
const consultaSearchCache=new Map();

function cNorm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function cParseTags(str){
 const seen=new Set(),out=[];
 String(str||'').split(/[,;\n]/).forEach(t=>{t=t.replace(/\s+/g,' ').trim().slice(0,40);const k=cNorm(t);if(t&&!seen.has(k)){seen.add(k);out.push(t)}});
 return out;
}
function cAllTags(list=db.consultas){
 const m=new Map();
 list.forEach(x=>(x.etiquetas||[]).forEach(t=>{const k=cNorm(t);const o=m.get(k)||{tag:t,n:0};o.n++;m.set(k,o)}));
 return [...m.values()].sort((a,b)=>b.n-a.n||a.tag.localeCompare(b.tag,'es'));
}
function cDaysSince(iso){if(!iso)return null;const d=new Date(iso+'T00:00:00');return isNaN(d)?null:Math.floor((Date.now()-d.getTime())/86400000)}
function cRevPill(x){
 if(!x.revisado)return '<span class="pill warn" title="Nadie ha comprobado todavía esta ficha">Sin revisar</span>';
 const age=cDaysSince(x.revisado);
 return age!==null&&age>365?`<span class="pill warn" title="Revisada hace más de un año">Revisada ${date(x.revisado)} (antigua)</span>`:`<span class="pill ok">Revisada ${date(x.revisado)}</span>`;
}

/* ---------- Texto con formato sencillo ---------- */
function cInline(s){
 s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g,'$1<i>$2</i>');
 return s.replace(/(https?:\/\/[^\s<]*[^\s<.,;:)])/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
}
function cList(lines){
 let html='';const stack=[];
 for(const l of lines){
  const m=l.match(/^(\s*)([-•]|\d+[.)])\s+(.*)$/);if(!m)continue;
  const ind=m[1].replace(/\t/g,'  ').length,tag=/\d/.test(m[2])?'ol':'ul';
  while(stack.length&&ind<stack[stack.length-1].ind)html+='</li></'+stack.pop().tag+'>';
  if(!stack.length||ind>stack[stack.length-1].ind){html+='<'+tag+'><li>';stack.push({ind,tag})}else html+='</li><li>';
  html+=cInline(esc(m[3]));
 }
 while(stack.length)html+='</li></'+stack.pop().tag+'>';
 return html;
}
function cFmt(text){
 const lines=String(text||'').replace(/\r/g,'').split('\n');const out=[];let i=0;
 const isLi=l=>/^\s*([-•]|\d+[.)])\s+/.test(l),isTb=l=>/^\s*\|.*\|\s*$/.test(l),isHd=l=>/^#{2,3}\s+/.test(l);
 while(i<lines.length){
  const l=lines[i];
  if(!l.trim()){i++;continue}
  let m=l.match(/^(#{2,3})\s+(.*)$/);
  if(m){const n=m[1].length+1;out.push(`<h${n}>${cInline(esc(m[2]))}</h${n}>`);i++;continue}
  if(isTb(l)){
   const rows=[];while(i<lines.length&&isTb(lines[i])){rows.push(lines[i]);i++}
   const cells=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
   const body=rows.filter(r=>!/^\s*\|[\s:|-]+\|\s*$/.test(r)).map(cells);
   if(body.length)out.push(`<div class="tablewrap"><table class="table"><thead><tr>${body[0].map(c=>`<th>${cInline(esc(c))}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r=>`<tr>${r.map(c=>`<td>${cInline(esc(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
   continue;
  }
  if(isLi(l)){
   const items=[];
   while(i<lines.length&&lines[i].trim()&&(isLi(lines[i])||/^\s{2,}\S/.test(lines[i]))){
    if(isLi(lines[i]))items.push(lines[i]);else items[items.length-1]+=' '+lines[i].trim();
    i++;
   }
   out.push(cList(items));continue;
  }
  const para=[];
  while(i<lines.length&&lines[i].trim()&&!isLi(lines[i])&&!isTb(lines[i])&&!isHd(lines[i])){para.push(lines[i]);i++}
  out.push('<p>'+para.map(p=>cInline(esc(p))).join('<br>')+'</p>');
 }
 return out.join('');
}

/* ---------- Búsqueda y filtros ---------- */
function cSearchText(x){
 const key=(x.modificado||x.creado||'')+'|'+(x.titulo||'').length+'|'+(x.contenido||'').length;
 const c=consultaSearchCache.get(x.id);if(c&&c.key===key)return c.text;
 const text=cNorm([x.titulo,x.resumen,x.contenido,(x.normativa||[]).join(' '),(x.etiquetas||[]).join(' '),x.fuente,x.informacionDe,x.tipo,(x.documentos||[]).map(d=>d.nombre+' '+(d.descripcion||'')).join(' ')].join(' '));
 consultaSearchCache.set(x.id,{key,text});return text;
}
function cMatch(x,ignoreTags){
 const u=consultasUi;
 if(u.tipo&&x.tipo!==u.tipo)return false;
 if(u.rev==='sin'&&x.revisado)return false;
 if(u.rev==='rev'&&!x.revisado)return false;
 if(u.rev==='viejas'&&!(x.revisado&&(cDaysSince(x.revisado)||0)>365))return false;
 if(u.rev==='abiertas'&&!x.abierta)return false;
 if(!ignoreTags&&u.tags.length){const set=new Set((x.etiquetas||[]).map(cNorm));if(!u.tags.every(t=>set.has(cNorm(t))))return false}
 if(u.q){const hay=cSearchText(x);if(!cNorm(u.q).split(/\s+/).filter(Boolean).every(w=>hay.includes(w)))return false}
 return true;
}
function toggleCTag(tag){
 const k=cNorm(tag),has=consultasUi.tags.some(t=>cNorm(t)===k);
 consultasUi.tags=has?consultasUi.tags.filter(t=>cNorm(t)!==k):[...consultasUi.tags,tag];
 filterConsultas();
}
function clearConsultaFilters(){consultasUi={q:'',tipo:'',rev:'',tags:[],sort:consultasUi.sort,allTags:consultasUi.allTags};consultas()}
function filterByCTag(tag){consultasUi={q:'',tipo:'',rev:'',tags:[tag],sort:consultasUi.sort,allTags:consultasUi.allTags};nav('consultas')}
function consultaCard(x){
 const tags=(x.etiquetas||[]).map(t=>`<button type="button" class="tagchip mini" data-t="${esc(t)}" onclick="toggleCTag(this.dataset.t)">${esc(t)}</button>`).join('');
 const nd=(x.documentos||[]).length;
 return `<div class="qitem"><div class="qhead"><button type="button" class="subject-link qtitle" onclick="consultaView('${x.id}')">${esc(x.titulo||'(sin título)')}</button><span class="pill">${esc(x.tipo)}</span>${x.abierta?'<span class="pill warn">Duda abierta</span>':''}</div>
  ${x.resumen?`<div class="qresumen">${esc(x.resumen)}</div>`:''}
  <div class="qmeta">${tags}${cRevPill(x)}${nd?`<span class="muted" title="Documentos asociados">📎 ${nd}</span>`:''}</div></div>`;
}
function filterConsultas(){
 const base=db.consultas.filter(x=>cMatch(x,true));
 const shown=base.filter(x=>cMatch(x,false));
 const counts=cAllTags(base);
 const sel=new Set(consultasUi.tags.map(cNorm));
 const selTags=consultasUi.tags.map(t=>({tag:t,n:(counts.find(c=>cNorm(c.tag)===cNorm(t))||{n:0}).n}));
 const rest=counts.filter(c=>!sel.has(cNorm(c.tag)));
 const limit=consultasUi.allTags?rest.length:Math.max(0,22-selTags.length);
 const chips=[...selTags.map(c=>[c,true]),...rest.slice(0,limit).map(c=>[c,false])];
 const bar=document.getElementById('ctagbar');
 if(bar)bar.innerHTML=chips.map(([c,on])=>`<button type="button" class="tagchip ${on?'on':''}" data-t="${esc(c.tag)}" onclick="toggleCTag(this.dataset.t)" aria-pressed="${on}">${esc(c.tag)}<small>${c.n}</small></button>`).join('')
  +(rest.length>limit?`<button type="button" class="tagchip more" onclick="consultasUi.allTags=true;filterConsultas()">Ver todas (${rest.length-limit} más)</button>`:(consultasUi.allTags&&rest.length>22?`<button type="button" class="tagchip more" onclick="consultasUi.allTags=false;filterConsultas()">Mostrar menos</button>`:''));
 const sorted=[...shown].sort(consultasUi.sort==='reciente'?(a,b)=>(b.modificado||b.creado||'').localeCompare(a.modificado||a.creado||''):(a,b)=>String(a.titulo).localeCompare(String(b.titulo),'es'));
 const c=document.getElementById('ccount');
 const filtered=consultasUi.q||consultasUi.tipo||consultasUi.rev||consultasUi.tags.length;
 if(c)c.innerHTML=`${shown.length} de ${db.consultas.length} fichas${filtered?` · <button type="button" class="linklike" onclick="clearConsultaFilters()">Quitar filtros</button>`:''}`;
 const list=document.getElementById('clist');
 if(list)list.innerHTML=sorted.map(consultaCard).join('')||`<div class="empty">${db.consultas.length?'No hay fichas con esos filtros.':'Todavía no hay fichas. Pulsa «Importar consultas…» para traer las que he preparado, o «+ Nueva ficha».'}</div>`;
}
function consultas(){
 const u=consultasUi;
 document.getElementById('main').innerHTML=layout('Consultas y procedimientos','Criterios, respuestas y pasos de tramitación que vas recopilando',
  homeBtn()+`<button class="btn" onclick="importConsultasStart()">Importar consultas…</button><button class="btn primary" onclick="newConsulta()">+ Nueva ficha</button>`)
  +`<div class="panel"><div class="panelbody">
  <div class="toolbar"><input id="csearch" class="input" type="search" placeholder="Buscar en título, texto, normativa y etiquetas…" value="${esc(u.q)}" oninput="consultasUi.q=this.value;filterConsultas()">
   <select id="ctipo" class="select" onchange="consultasUi.tipo=this.value;filterConsultas()"><option value="">Todos los tipos</option>${CONSULTA_TIPOS.map(t=>`<option ${u.tipo===t?'selected':''}>${t}</option>`).join('')}</select>
   <select id="crev" class="select" onchange="consultasUi.rev=this.value;filterConsultas()"><option value="">Toda revisión</option><option value="sin" ${u.rev==='sin'?'selected':''}>Sin revisar</option><option value="rev" ${u.rev==='rev'?'selected':''}>Revisadas</option><option value="viejas" ${u.rev==='viejas'?'selected':''}>Revisadas hace más de un año</option><option value="abiertas" ${u.rev==='abiertas'?'selected':''}>Dudas abiertas</option></select>
   <select id="csort" class="select" onchange="consultasUi.sort=this.value;filterConsultas()"><option value="titulo" ${u.sort==='titulo'?'selected':''}>Ordenar por título</option><option value="reciente" ${u.sort==='reciente'?'selected':''}>Modificadas recientemente</option></select></div>
  <div id="ctagbar" class="tagcloud" role="group" aria-label="Filtrar por etiquetas"></div>
  <p id="ccount" class="muted" style="font-size:12px;margin:0 0 10px"></p>
  <div id="clist" class="qlist"></div></div></div>`;
 filterConsultas();
}

/* ---------- Ficha ---------- */
function consultaView(id){
 const x=db.consultas.find(c=>c.id===id);if(!x){consultas();return}
 const tags=(x.etiquetas||[]).map(t=>`<button type="button" class="tagchip mini" data-t="${esc(t)}" onclick="filterByCTag(this.dataset.t)" title="Ver todas las fichas con esta etiqueta">${esc(t)}</button>`).join('');
 const docs=(x.documentos||[]).map((d,i)=>`<li><button type="button" class="btn small" onclick="abrirDocConsulta('${x.id}',${i})">Abrir</button> <b>${esc(d.nombre)}</b>${d.descripcion?` · <span class="muted">${esc(d.descripcion)}</span>`:''}</li>`).join('');
 document.getElementById('main').innerHTML=layout(esc(x.titulo||'(sin título)'),`${esc(x.tipo)}${x.origen==='importada'?' · Importada de Notion':''}`,
  `<button class="btn" onclick="consultas()">← Volver a la lista</button><button class="btn" onclick="copyConsulta('${x.id}')">Copiar texto</button><button class="btn primary" onclick="editConsulta('${x.id}')">Editar</button>`)
  +`<div class="panel"><div class="panelbody qdetail">
  <div class="qmeta" style="margin-top:0"><span class="pill">${esc(x.tipo)}</span>${x.abierta?'<span class="pill warn">Duda abierta</span>':''}${cRevPill(x)}</div>
  ${tags?`<div class="qmeta">${tags}</div>`:''}
  ${x.resumen?`<div class="notice" style="margin:12px 0"><b>En resumen:</b> ${esc(x.resumen)}</div>`:''}
  <div class="qbody">${cFmt(x.contenido)||'<p class="muted">Sin contenido.</p>'}</div>
  ${(x.normativa||[]).length?`<h3>Normativa citada</h3><ul class="qnorm">${x.normativa.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}
  ${docs?`<h3>Documentos</h3><ul class="qdocs">${docs}</ul><p class="muted" style="font-size:12px">Los documentos están en la carpeta «Documentos» de BoxAbalar, fuera del archivo cifrado.</p>`:''}
  <h3>Origen y vigencia</h3>
  <dl class="center-data-list">
   ${x.fuente?`<div><dt>Fuente</dt><dd>${esc(x.fuente)}</dd></div>`:''}
   ${x.informacionDe?`<div><dt>Información de</dt><dd>${esc(x.informacionDe)}</dd></div>`:''}
   <div><dt>Revisión</dt><dd>${x.revisado?`Revisada el ${date(x.revisado)}`:'Sin revisar'} · <button type="button" class="linklike" onclick="markConsultaReviewed('${x.id}')">Marcar como revisada hoy</button>${x.revisado?` · <button type="button" class="linklike" onclick="unmarkConsultaReviewed('${x.id}')">Quitar la revisión</button>`:''}</dd></div>
   <div><dt>Registro</dt><dd>Creada ${x.creado?dateTime(x.creado):'—'}${x.modificado?' · Modificada '+dateTime(x.modificado):''}</dd></div>
  </dl>
  <div style="margin-top:18px"><button class="btn danger" onclick="deleteConsulta('${x.id}')">Eliminar ficha…</button></div>
  </div></div>`;
 window.scrollTo(0,0);const m=document.getElementById('main');if(m)m.scrollTop=0;
}
function markConsultaReviewed(id){const x=db.consultas.find(c=>c.id===id);if(!x)return;x.revisado=todayIso();x.modificado=nowIso();save();consultaView(id)}
function unmarkConsultaReviewed(id){const x=db.consultas.find(c=>c.id===id);if(!x)return;x.revisado='';x.modificado=nowIso();save();consultaView(id)}
function deleteConsulta(id){
 const x=db.consultas.find(c=>c.id===id);if(!x)return;
 if(!confirm(`¿Eliminar la ficha «${x.titulo}»? Esta acción no se puede deshacer.`))return;
 db.consultas=db.consultas.filter(c=>c.id!==id);save();consultas();
}
async function copyConsulta(id){
 const x=db.consultas.find(c=>c.id===id);if(!x)return;
 const t=[x.titulo,'('+x.tipo+')','',x.resumen,'',x.contenido,(x.normativa||[]).length?'\nNormativa:\n'+x.normativa.map(n=>'- '+n).join('\n'):'',x.fuente?'\nFuente: '+x.fuente:''].filter(s=>s!==undefined).join('\n').replace(/\n{3,}/g,'\n\n');
 try{await navigator.clipboard.writeText(t);alert('Texto copiado.')}catch{alert('El navegador no permitió copiar automáticamente.')}
}
async function abrirDocConsulta(id,i){
 const x=db.consultas.find(c=>c.id===id),d=x&&(x.documentos||[])[i];if(!d)return;
 if(!window.__vault?.docOpen){alert('No se puede abrir documentos en esta ventana.');return}
 const r=await window.__vault.docOpen(d.nombre);
 if(r&&r.cancel)return;
 if(r&&!r.ok)alert(r.msg||'No se pudo abrir el documento.');
 else if(r&&r.picked)alert(`Has abierto «${r.picked}», que no coincide con el nombre anotado («${d.nombre}»).`);
}

/* ---------- Formulario ---------- */
function consultaForm(x={}){
 consultaDocsForm=(x.documentos||[]).map(d=>({...d}));
 const known=cAllTags().map(c=>`<button type="button" class="tagchip mini" data-t="${esc(c.tag)}" onclick="addCTagToForm(this.dataset.t)">${esc(c.tag)}</button>`).join('');
 return `<div class="formgrid">
  <div class="field full"><label for="cftitulo">Título</label><input id="cftitulo" class="input" style="width:100%" value="${esc(x.titulo)}"></div>
  <div class="field"><label for="cftipo">Tipo</label><select id="cftipo" class="select">${CONSULTA_TIPOS.map(t=>`<option ${(x.tipo||'Consulta')===t?'selected':''} value="${t}">${t} — ${CONSULTA_TIPO_AYUDA[t]}</option>`).join('')}</select></div>
  <div class="field"><label for="cfrev">Fecha de la última revisión</label><div style="display:flex;gap:6px"><input id="cfrev" class="input" type="date" value="${esc(x.revisado||'')}" style="flex:1"><button type="button" class="btn small" onclick="document.getElementById('cfrev').value=todayIso()">Hoy</button></div></div>
  <div class="field full"><label for="cfresumen">Resumen (una o dos frases)</label><textarea id="cfresumen" class="textarea" style="min-height:70px">${esc(x.resumen)}</textarea></div>
  <div class="field full"><label for="cfcontenido">Contenido</label><textarea id="cfcontenido" class="textarea" style="min-height:300px">${esc(x.contenido)}</textarea>
   <p class="muted" style="font-size:12px;margin:4px 0 0">Formato: «## Título» para apartados, «- » para listas, «**negrita**», enlaces https://… y tablas con «|».</p></div>
  <div class="field full"><label for="cftags">Etiquetas (separadas por comas)</label><input id="cftags" class="input" style="width:100%" value="${esc((x.etiquetas||[]).join(', '))}" placeholder="Admisión, Plazos, Primaria">
   <div class="tagcloud pick" aria-label="Etiquetas existentes: pulsa para añadir">${known||'<span class="muted" style="font-size:12px">Todavía no hay etiquetas.</span>'}</div></div>
  <div class="field full"><label for="cfnormativa">Normativa citada (una por línea)</label><textarea id="cfnormativa" class="textarea" style="min-height:80px">${esc((x.normativa||[]).join('\n'))}</textarea></div>
  <div class="field full"><label>Documentos</label><div id="cfdocs"></div>
   <div class="toolbar" style="margin-top:6px"><button type="button" class="btn small" onclick="addConsultaDocFile()">Copiar un archivo a «Documentos»…</button><button type="button" class="btn small" onclick="addConsultaDocName()">Añadir solo el nombre</button></div>
   <p class="muted" style="font-size:12px;margin:4px 0 0">Los archivos no se guardan en el registro cifrado: van a la carpeta «Documentos» de BoxAbalar (hay que vincularla en «Datos y seguridad»), donde no están cifrados.</p></div>
  <div class="field"><label for="cffuente">Fuente</label><input id="cffuente" class="input" style="width:100%" value="${esc(x.fuente)}"></div>
  <div class="field"><label for="cfinfo">Información de (fecha o curso)</label><input id="cfinfo" class="input" style="width:100%" value="${esc(x.informacionDe)}" placeholder="p. ej. curso 2025/26"></div>
  <div class="field full"><label class="gate-check"><input id="cfabierta" type="checkbox" ${x.abierta?'checked':''}> Duda abierta / pendiente de aclarar</label></div>
 </div>`;
}
function addCTagToForm(tag){
 const i=document.getElementById('cftags');if(!i)return;
 const cur=cParseTags(i.value);if(!cur.some(t=>cNorm(t)===cNorm(tag)))cur.push(tag);
 i.value=cur.join(', ');
}
function readCDocsRaw(){return [...document.querySelectorAll('#cfdocs .cfdoc')].map(r=>({nombre:r.querySelector('.cfdn').value.trim(),descripcion:r.querySelector('.cfdd').value.trim()}))}
function readCDocs(){return readCDocsRaw().filter(d=>d.nombre)}
function renderCDocs(){
 const box=document.getElementById('cfdocs');if(!box)return;
 box.innerHTML=consultaDocsForm.map((d,i)=>`<div class="cfdoc"><input class="input cfdn" placeholder="nombre-del-archivo.pdf" value="${esc(d.nombre)}" aria-label="Nombre del archivo"><input class="input cfdd" placeholder="Descripción (opcional)" value="${esc(d.descripcion||'')}" aria-label="Descripción"><button type="button" class="btn small danger" aria-label="Quitar documento" onclick="removeConsultaDoc(${i})">🗑️</button></div>`).join('')||'<p class="muted" style="font-size:12px;margin:0">Sin documentos.</p>';
}
function addConsultaDocName(){consultaDocsForm=readCDocsRaw();consultaDocsForm.push({nombre:'',descripcion:''});renderCDocs();const r=[...document.querySelectorAll('#cfdocs .cfdn')].pop();if(r)r.focus()}
function removeConsultaDoc(i){consultaDocsForm=readCDocsRaw();consultaDocsForm.splice(i,1);renderCDocs()}
async function addConsultaDocFile(){
 if(!window.__vault?.docSave){alert('No se puede copiar archivos en esta ventana.');return}
 const st=await window.__vault.dirStatus();
 if(!st.linked){alert('Primero vincula la carpeta de BoxAbalar en «Datos y seguridad» › «Copias de seguridad y carpeta». Solo es posible en Chrome o Edge en el ordenador. Mientras tanto puedes usar «Añadir solo el nombre» y dejar el archivo tú mismo en BoxAbalar › Registro › Documentos.');return}
 const inp=document.createElement('input');inp.type='file';inp.hidden=true;document.body.appendChild(inp);
 inp.onchange=async()=>{
  const f=inp.files[0];inp.remove();if(!f)return;
  try{const name=await window.__vault.docSave(f);consultaDocsForm=readCDocsRaw();consultaDocsForm.push({nombre:name,descripcion:''});renderCDocs()}
  catch(e){alert(e.message||'No se pudo copiar el archivo.')}
 };
 inp.click();
}
function readConsultaForm(){
 const v=id=>document.getElementById(id).value;
 return {titulo:v('cftitulo').trim(),tipo:v('cftipo'),resumen:v('cfresumen').trim(),contenido:v('cfcontenido').replace(/\s+$/,''),
  normativa:v('cfnormativa').split('\n').map(s=>s.trim()).filter(Boolean),etiquetas:cParseTags(v('cftags')),documentos:readCDocs(),
  fuente:v('cffuente').trim(),informacionDe:v('cfinfo').trim(),revisado:v('cfrev'),abierta:document.getElementById('cfabierta').checked};
}
function newConsulta(prefill={}){
 openModal('Nueva ficha',consultaForm(prefill),()=>{
  const d=readConsultaForm();if(!d.titulo){alert('Escribe un título.');document.getElementById('cftitulo').focus();return}
  const x={id:uid(),creado:nowIso(),modificado:'',origen:'',...d};
  db.consultas.push(x);save();closeModal();consultaView(x.id);
 });
 renderCDocs();
}
function editConsulta(id){
 const x=db.consultas.find(c=>c.id===id);if(!x)return;
 openModal('Editar ficha',consultaForm(x),()=>{
  const d=readConsultaForm();if(!d.titulo){alert('Escribe un título.');document.getElementById('cftitulo').focus();return}
  Object.assign(x,d,{modificado:nowIso()});save();closeModal();consultaView(id);
 });
 renderCDocs();
}

/* ---------- Importar y exportar ---------- */
function importConsultasStart(){
 const i=document.createElement('input');i.type='file';i.accept='application/json,.json';i.hidden=true;document.body.appendChild(i);
 i.onchange=e=>{importConsultasFile(e);setTimeout(()=>i.remove(),0)};i.click();
}
function importConsultasFile(e){
 const f=e.target.files[0];if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
  let data;try{data=JSON.parse(r.result)}catch{alert('El archivo no es un JSON válido.');return}
  if(!data||data.format!=='consultas-inspeccion'||!Array.isArray(data.consultas)){alert('Este archivo no es un paquete de consultas de esta aplicación (consultas_iniciales_v4.json).');return}
  const have=new Set(db.consultas.map(c=>c.seedId).filter(Boolean));
  const nuevas=data.consultas.filter(c=>c&&c.titulo&&!have.has(c.seedId));
  const omitidas=data.consultas.length-nuevas.length;
  if(!nuevas.length){alert(`No hay fichas nuevas: las ${data.consultas.length} del archivo ya estaban importadas.`);return}
  if(!confirm(`Se añadirán ${nuevas.length} fichas${omitidas?` (se omiten ${omitidas} ya importadas)`:''}. No se modifica ninguna ficha existente. ¿Continuar?`))return;
  const now=nowIso();
  nuevas.forEach(c=>db.consultas.push({id:uid(),seedId:c.seedId||'',tipo:CONSULTA_TIPOS.includes(c.tipo)?c.tipo:'Referencia',titulo:String(c.titulo),resumen:String(c.resumen||''),contenido:String(c.contenido||''),
   normativa:Array.isArray(c.normativa)?c.normativa.map(String):[],etiquetas:cParseTags((c.etiquetas||[]).join(',')),documentos:Array.isArray(c.documentos)?c.documentos.filter(d=>d&&d.nombre).map(d=>({nombre:String(d.nombre),descripcion:String(d.descripcion||'')})):[],
   fuente:String(c.fuente||''),informacionDe:String(c.informacionDe||''),revisado:'',abierta:!!c.abierta,origen:'importada',creado:now,modificado:''}));
  save();consultasUi={q:'',tipo:'',rev:'',tags:[],sort:'titulo',allTags:false};nav('consultas');
  alert(`Importadas ${nuevas.length} fichas.`);
 };
 r.readAsText(f);e.target.value='';
}
function exportConsultasJSON(){
 if(!db.consultas.length){alert('No hay fichas que exportar.');return}
 if(!confirm('El archivo con las consultas sale SIN CIFRAR. ¿Descargarlo igualmente?'))return;
 const out={format:'consultas-inspeccion',version:1,generado:todayIso(),consultas:db.consultas.map(c=>({seedId:c.seedId||('usr-'+c.id),tipo:c.tipo,titulo:c.titulo,resumen:c.resumen,contenido:c.contenido,normativa:c.normativa||[],etiquetas:c.etiquetas||[],documentos:c.documentos||[],fuente:c.fuente||'',informacionDe:c.informacionDe||'',abierta:!!c.abierta}))};
 download(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}),'consultas-inspeccion-sin-cifrar.json');
}
