/* ======================= VERSIÓN 4.12: SUPERVISIONES =======================
   Apartado del menú principal con herramientas de supervisión. Cada herramienta es una página propia
   (carpeta «supervisiones») que se abre dentro de la aplicación en un marco y conserva su propia política
   de seguridad: el analizador del DOC bloquea cualquier conexión de red y lee el PDF solo en el equipo.
   La aplicación lee el resultado de la página (centro, código, recuento de comprobaciones y texto del
   escrito) cuando se pulsa «Pasar resultado a Seguimiento», y lo guarda dentro del archivo cifrado
   (db.supervisions), con la fecha en la columna de Seguimiento que corresponde.
   Para añadir otra supervisión en el futuro: su página en la carpeta «supervisiones», una entrada en
   SUPERVISION_TOOLS y, si hace falta, su función de lectura (read). */
const SUPERVISION_TOOLS=[
 {id:'doc',name:'Analizador do DOC',lang:'gl',file:'supervisiones/analizador-doc.html',field:'DOC',
  desc:'Revisión do Documento de organización do centro (PDF xerado por XADE): comprobacións por apartado, escrito ao centro e informe .odt.',
  read:supReadDoc}
];
function supTool(id){return SUPERVISION_TOOLS.find(t=>t.id===id)}
let supOpenTool='',supFrameState={loaded:false,passed:false};

function supervisiones(){
 supOpenTool='';
 const list=[...(db.supervisions||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 const centerName=id=>db.centers.find(c=>c.id===id)?.name||'Centro no registrado';
 const cards=SUPERVISION_TOOLS.map(t=>{const n=list.filter(s=>s.type===t.id).length;return `<div class="sup-card"><div class="sup-card-main"><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><p class="muted sup-card-meta">${n} ${n===1?'revisión pasada':'revisiones pasadas'} a Seguimiento · columna «${esc(t.field)}»</p></div><button class="btn primary" type="button" onclick="supOpen('${t.id}')">Abrir</button></div>`}).join('');
 const rows=list.map(s=>`<tr><td>${date(s.date)}</td><td><b>${esc(centerName(s.centerId))}</b></td><td>${esc(supTool(s.type)?.name||s.type)}</td><td>${supCountsHTML(s.counts)}</td><td>${s.nSel??'—'}</td><td style="white-space:nowrap"><button class="btn small" type="button" onclick="supView('${s.id}')">Ver</button> <button class="btn small danger" type="button" aria-label="Eliminar revisión" title="Eliminar revisión" onclick="supDelete('${s.id}')">🗑️</button></td></tr>`).join('');
 document.getElementById('main').innerHTML=layout('Supervisiones','Herramientas de supervisión que funcionan sin conexión dentro de la aplicación',homeBtn())+
 `<div class="panel"><div class="panelhead"><h2>Herramientas</h2></div><div class="panelbody"><div class="sup-cards">${cards}</div><p class="muted" style="font-size:12px;margin:12px 0 0">Los documentos se leen en este equipo: las herramientas bloquean cualquier conexión de red y no envían nada. Solo cuando pulses «Pasar resultado a Seguimiento» se guarda el resultado, cifrado, en tu archivo de datos.</p></div></div>`+
 `<div class="panel"><div class="panelhead"><h2>Revisiones pasadas a Seguimiento</h2><span class="pill">${list.length}</span></div><div class="panelbody"><div class="tablewrap"><table class="table"><thead><tr><th>Fecha</th><th>Centro</th><th>Supervisión</th><th>Resultado</th><th>Incidencias en el escrito</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">Todavía no has pasado ninguna revisión a Seguimiento.</td></tr>'}</tbody></table></div></div></div>`;
}
function supCountsHTML(c){
 if(!c)return '<span class="muted">—</span>';
 return `<span class="sup-counts"><span class="sc ok" title="Correctos">${c.ok??0} ✓</span><span class="sc av" title="Avisos">${c.av??0} avisos</span><span class="sc inc" title="Incumplimientos">${c.inc??0} incump.</span>${c.info?`<span class="sc info" title="Pendientes">${c.info} pend.</span>`:''}</span>`;
}

/* ---------- Herramienta abierta en un marco ---------- */
function supOpen(id){
 const t=supTool(id);if(!t)return;
 supOpenTool=id;supFrameState={loaded:false,passed:false};
 document.getElementById('main').innerHTML=`<div class="sup-bar"><button class="btn" type="button" onclick="supBack()">← Supervisiones</button><div class="sup-bar-title"><b>${esc(t.name)}</b><span class="muted" id="supVer"></span></div><button class="btn primary" type="button" id="supPass" onclick="supPassStart()">Pasar resultado a Seguimiento</button></div>
 <div class="sup-frame-wrap"><iframe id="supFrame" class="sup-frame" src="${esc(t.file)}?v=${esc(window.APP_FILES_VERSION||'')}" title="${esc(t.name)}" lang="${esc(t.lang||'es')}"></iframe></div>`;
 const f=document.getElementById('supFrame');
 f.addEventListener('load',()=>{
  try{
   const w=f.contentWindow,d=f.contentDocument;
   const v=(d.title.match(/v\s?(\d+[\w.]*)\s*$/i)||[])[1];document.getElementById('supVer').textContent=v?' · v'+v:'';
   /* La actividad dentro de la herramienta cuenta para el bloqueo automático por inactividad */
   ['pointerdown','keydown','touchstart','wheel','scroll'].forEach(ev=>w.addEventListener(ev,()=>window.__vault?.touch?.(),{passive:true,capture:true}));
   /* Saber si hay un DOC cargado sin pasar, para avisar antes de salir */
   w.addEventListener('change',e=>{if(e.target&&e.target.type==='file'&&e.target.files?.length){supFrameState.loaded=true;supFrameState.passed=false}},true);
   d.addEventListener('drop',()=>{supFrameState.loaded=true;supFrameState.passed=false},true);
  }catch(e){console.warn('Supervisiones: no se puede acceder a la herramienta',e)}
 });
}
function supLeaveOk(){
 if(!supOpenTool||!document.getElementById('supFrame')||!supFrameState.loaded||supFrameState.passed)return true;
 return confirm('Si sales ahora, se perderá el análisis que tienes abierto (no se guarda nada hasta que pulsas «Pasar resultado a Seguimiento»).\n\n¿Salir de todos modos?');
}
function supBack(){if(!supLeaveOk())return;supervisiones()}
/* Aviso al cambiar de apartado con un análisis sin pasar */
{const navOrig=nav;nav=function(view){if(!supLeaveOk())return;if(view!=='supervisiones')supOpenTool='';return navOrig(view)}}

/* Lectura del resultado del analizador del DOC a partir de su pantalla (elementos con identificador fijo) */
function supReadDoc(d){
 const txt=id=>(d.getElementById(id)?.textContent||'').replace(/\s+/g,' ').trim();
 const centro=txt('c-nome'),sub=txt('c-sub');
 const report=d.getElementById('report')?.value||'';
 if(!centro&&!sub&&!report.trim())return null;
 const n=k=>{const b=d.querySelector(`#counts .count.${k} b`);const x=b?parseInt(b.textContent,10):NaN;return isNaN(x)?0:x};
 const counts={ok:n('ok'),av:n('av'),inc:n('inc'),info:n('info')};
 const code=(sub.match(/\b\d{8}\b/)||[''])[0];
 const curso=((sub.match(/Curso\s+([0-9]{4}\s*[\/-]\s*[0-9]{2,4})/i)||[])[1]||'').replace(/\s+/g,'');
 const nSel=parseInt(txt('n-sel'),10);
 const ver=(d.title.match(/v\s?(\d+[\w.]*)\s*$/i)||[])[1]||'';
 return {centro,code,curso,counts,nSel:isNaN(nSel)?null:nSel,report:report.trim(),toolVersion:ver,detail:sub};
}
let supPending=null;
function supPassStart(msg){
 const t=supTool(supOpenTool),f=document.getElementById('supFrame');if(!t||!f)return;
 let r=null;try{r=t.read(f.contentDocument)}catch(e){console.warn(e)}
 /* V 4.13: si la petición llega del botón propio del analizador, se completan los datos con lo que envía */
 if(msg&&typeof msg==='object'){
  r=r||{counts:null,nSel:null,detail:''};
  if(!r.centro&&msg.center)r.centro=String(msg.center);
  if(!r.code&&msg.code)r.code=(String(msg.code).match(/\d{8}/)||[''])[0];
  if(!r.curso&&msg.course)r.curso=String(msg.course).replace(/\s+/g,'');
  if(typeof msg.report==='string'&&msg.report.trim())r.report=msg.report.trim();
  if(Array.isArray(msg.findings))r.findings=msg.findings.slice(0,600).map(x=>({section:String(x.section||''),title:String(x.title||''),text:String(x.text||'').slice(0,4000),severity:String(x.severity||''),selected:!!x.selected}));
 }
 if(!r||(!r.centro&&!r.code)){alert('Carga primero un DOC en el analizador y revisa las incidencias. Después pulsa «Pasar resultado a Seguimiento».');return}
 const c=(typeof matchCenter==='function')?matchCenter(r.centro,r.code):null;
 supPending={tool:t.id,...r};
 const sorted=[...db.centers].sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const cur=c?iso(db.followup?.[c.id]?.[t.field]||''):'';
 openModal('Pasar resultado a Seguimiento',`<p style="margin-top:0">Centro leído en el DOC: <b>${esc(r.centro||'sin nombre')}</b>${r.code?' · código '+esc(r.code):''}${r.curso?' · curso '+esc(r.curso):''}</p>
 ${c?'':'<div class="notice warn-notice" style="margin:0 0 12px">No encuentro ese centro entre los tuyos: elígelo en la lista.</div>'}
 <div class="formgrid">
  <div class="field full"><label for="supCenter">Centro</label><select id="supCenter" class="select" onchange="supPassCenterChanged()"><option value="">— Elige el centro —</option>${sorted.map(x=>`<option value="${esc(x.id)}" ${c&&x.id===c.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="supDate">Fecha de la revisión</label><input id="supDate" class="input" type="date" value="${todayIso()}"></div>
  <div class="field full"><label class="gate-check"><input id="supSetField" type="checkbox" ${cur?'':'checked'}> Anotar esta fecha en la columna «${esc(t.field)}» de Seguimiento</label><p id="supFieldNote" class="muted" style="font-size:12px;margin:4px 0 0">${supFieldNote(cur,t.field)}</p></div>
  <div class="field full"><label>Resultado</label><div>${supCountsHTML(r.counts)} <span class="muted" style="font-size:12px">· ${r.nSel??0} incidencias seleccionadas para el escrito</span></div></div>
  <div class="field full"><label for="supNotes">Observaciones (opcional)</label><textarea id="supNotes" class="textarea" placeholder="Por ejemplo: requerida corrección del horario de gardas; pendiente de nueva versión del DOC…"></textarea></div>
  <div class="field full"><details><summary>Texto del escrito al centro que se guardará</summary><pre class="sup-report">${esc(r.report||'(sin texto)')}</pre></details></div>
 </div><p class="muted" style="font-size:12px">Se guarda dentro de tu archivo cifrado. El PDF del DOC no se guarda.</p>`,supPassSave);
 document.getElementById('modalSave').textContent='Pasar a Seguimiento';
}
function supFieldNote(cur,field){return cur?`La columna «${esc(field)}» de este centro ya tiene la fecha ${date(cur)}. Si marcas la casilla, se sustituirá.`:`La columna «${esc(field)}» de este centro está vacía.`}
function supPassCenterChanged(){
 const t=supTool(supPending?.tool),id=document.getElementById('supCenter').value;if(!t)return;
 const cur=id?iso(db.followup?.[id]?.[t.field]||''):'';
 document.getElementById('supSetField').checked=!cur;
 document.getElementById('supFieldNote').innerHTML=id?supFieldNote(cur,t.field):'';
}
function supPassSave(){
 const p=supPending,t=supTool(p?.tool);if(!p||!t)return;
 const cid=document.getElementById('supCenter').value,d=document.getElementById('supDate').value||todayIso();
 if(!cid){alert('Elige el centro.');document.getElementById('supCenter').focus();return}
 if(!Array.isArray(db.supervisions))db.supervisions=[];
 db.supervisions.push({id:uid(),type:t.id,centerId:cid,date:d,curso:p.curso||courseOf(d),docCenter:p.centro,docCode:p.code,counts:p.counts,nSel:p.nSel,report:p.report,...(p.findings?{findings:p.findings}:{}),notes:document.getElementById('supNotes').value.trim(),tool:t.name+(p.toolVersion?' v'+p.toolVersion:''),createdAt:nowIso()});
 if(document.getElementById('supSetField').checked){
  if(!db.followup[cid])db.followup[cid]={};db.followup[cid][t.field]=d;
  if(db.followupNA?.[cid])db.followupNA[cid][t.field]=false;
 }
 save();closeModal();supFrameState.passed=true;supPending=null;
 const name=db.centers.find(c=>c.id===cid)?.name||'';
 supNotifyFrame('Gardado en Seguimento de '+name);
 const btn=document.getElementById('supPass');if(btn){btn.textContent='✓ Pasado a Seguimiento';setTimeout(()=>{if(btn.isConnected)btn.textContent='Pasar resultado a Seguimiento'},4000)}
 alert(`Resultado guardado en Seguimiento de ${name}.\n\nPuedes cargar otro DOC en el analizador o volver a «Supervisiones».`);
}

/* ---------- Revisiones guardadas: ver, copiar, eliminar ---------- */
function supView(id){
 const s=(db.supervisions||[]).find(x=>x.id===id);if(!s)return;
 const cname=db.centers.find(c=>c.id===s.centerId)?.name||'Centro no registrado';
 openModal(`${supTool(s.type)?.name||'Revisión'} · ${cname}`,`<p style="margin-top:0"><b>${date(s.date)}</b>${s.curso?' · curso '+esc(s.curso):''}${s.tool?' · <span class="muted">'+esc(s.tool)+'</span>':''}</p>
 <p>${supCountsHTML(s.counts)} <span class="muted" style="font-size:12px">· ${s.nSel??0} incidencias en el escrito</span></p>
 ${s.notes?`<h3 class="home-sub">Observaciones</h3><div class="md-view">${mdRender(s.notes)}</div>`:''}
 <h3 class="home-sub">Escrito al centro</h3><pre class="sup-report" id="supReportView">${esc(s.report||'(sin texto)')}</pre>
 <div class="toolbar"><button class="btn" type="button" onclick="supCopy('${s.id}')">Copiar el escrito</button><button class="btn danger" type="button" onclick="supDelete('${s.id}',true)">Eliminar esta revisión</button></div>`,closeModal);
 document.getElementById('modalSave').textContent='Cerrar';
}
async function supCopy(id){const s=(db.supervisions||[]).find(x=>x.id===id);if(!s)return;try{await navigator.clipboard.writeText(s.report||'');alert('Escrito copiado.')}catch{const el=document.getElementById('supReportView');if(el){const r=document.createRange();r.selectNodeContents(el);const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}alert('No se pudo copiar automáticamente: el texto ha quedado seleccionado.')}}
function supDelete(id,fromModal){
 const s=(db.supervisions||[]).find(x=>x.id===id);if(!s)return;
 const cname=db.centers.find(c=>c.id===s.centerId)?.name||'';
 if(!confirm(`¿Eliminar la revisión del ${date(s.date)}${cname?' de '+cname:''}?\n\nLa fecha anotada en Seguimiento no se borra. Esta acción no se puede deshacer.`))return;
 db.supervisions=db.supervisions.filter(x=>x.id!==id);save();
 if(fromModal)closeModal();
 supRefreshView();
}
function supRefreshView(){
 if(document.querySelector('.center-fixed-head')&&curCenterId)return centerDetail(curCenterId,'seguimiento');
 if(document.getElementById('followRows'))return renderFollowup();
 const v=document.querySelector('.nav button[data-view].active')?.dataset.view;
 if(v==='supervisiones'&&!document.getElementById('supFrame'))supervisiones();
}
/* Botón en la celda de Seguimiento con las revisiones de esa columna */
function followSupBtn(cid,field){
 const tools=SUPERVISION_TOOLS.filter(t=>t.field===field).map(t=>t.id);if(!tools.length)return '';
 const list=(db.supervisions||[]).filter(s=>s.centerId===cid&&tools.includes(s.type)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 if(!list.length)return '';
 const last=list[0],c=last.counts||{},cls=c.inc?'inc':c.av?'av':'ok';
 return `<button type="button" class="sup-cell-btn ${cls}" onclick="supView('${last.id}')" title="Ver la última revisión (${date(last.date)})">Revisión${list.length>1?' ('+list.length+')':''}</button>`;
}
/* Ficha del centro: lista de revisiones bajo la tabla de Seguimiento documental */
function supCenterList(c){
 const list=(db.supervisions||[]).filter(s=>s.centerId===c.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 if(!list.length)return '';
 return `<h3 style="margin-top:22px">Supervisiones</h3><div class="timeline">${list.map(s=>`<div class="event"><b>${date(s.date)} · ${esc(supTool(s.type)?.name||s.type)}</b><div>${supCountsHTML(s.counts)}</div>${s.notes?`<div class="muted" style="font-size:12px;margin-top:4px">${esc(mdPlain(s.notes)).slice(0,240)}</div>`:''}<button class="btn small" type="button" onclick="supView('${s.id}')">Ver</button></div>`).join('')}</div>`;
}

/* ---------- V 4.13: botón propio del analizador «Pegar análisis del DOC en la ficha del centro» ----------
   Desde la v243, el analizador muestra ese botón cuando se abre dentro de la aplicación y envía el análisis
   con postMessage. Solo se atiende si viene del marco de la herramienta abierta; abre el mismo diálogo que
   «Pasar resultado a Seguimiento», de modo que nada se guarda sin confirmarlo. */
function supNotifyFrame(message){
 try{const f=document.getElementById('supFrame');f?.contentWindow?.postMessage({type:'doc-analysis-save-status',message},'*')}catch(e){}
}
window.addEventListener('message',ev=>{
 const f=document.getElementById('supFrame');
 if(!f||ev.source!==f.contentWindow||ev.data?.type!=='save-doc-analysis'||supOpenTool!=='doc')return;
 if(document.getElementById('supCenter'))return; /* ya hay un diálogo abierto */
 supPassStart(ev.data);
});
