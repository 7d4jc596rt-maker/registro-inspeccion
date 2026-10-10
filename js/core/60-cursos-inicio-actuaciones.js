/* ======================= VERSIÓN 2 ======================= */
const APP_TIPOS=['IES','CEIP','CPI','CRA','EEI','CPR','CFEA','CEE','CIFP','EOI','EPA','CMUS','CEEPI','EASD','Otro'];
const ACTION_MODES=['Correo electrónico','Teléfono','Presencial','REXEL','Otro'];
/* Versión 4.2: prioridad de las actuaciones (alta, media, baja o vacía) */
const PRIORITIES=[['alta','Alta'],['media','Media'],['baja','Baja']];
const PRIO_LABEL={alta:'Alta',media:'Media',baja:'Baja'};
function prioRank(a){return ({alta:0,media:1,baja:2})[a&&a.priority]??3}
/* Versión 4.3: orden común de Inicio, de la pantalla «Actuaciones» y de las pendientes de cada centro:
   primero por prioridad (alta, media, baja, sin prioridad) y después de la más antigua a la más reciente. */
function actionOrder(a,b){return prioRank(a)-prioRank(b)||((a.date||'')+(a.time||'')).localeCompare((b.date||'')+(b.time||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))}
function normPriority(v){const t=String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();if(/^(alta|alto|urgente|high|1)$/.test(t))return 'alta';if(/^(media|medio|normal|medium|2)$/.test(t))return 'media';if(/^(baja|bajo|low|3)$/.test(t))return 'baja';return ''}
function prioPill(a){const p=a&&a.priority;return PRIO_LABEL[p]?`<span class="prio prio-${p}" title="Prioridad ${PRIO_LABEL[p].toLowerCase()}">${PRIO_LABEL[p]}</span>`:''}
function prioClass(a){return PRIO_LABEL[a&&a.priority]?' prio-b-'+a.priority:''}
/* Versión 4.4: las actuaciones llevan también PDF adjuntos (a.pdfs), además de imágenes (a.images) */
function attCountTxt(a){const n=(a.images||[]).length,p=(a.pdfs||[]).length;return [n?`${n} ${n===1?'imagen':'imágenes'}`:'',p?`${p} PDF`:''].filter(Boolean).join(' · ')}
function imgCountMeta(a){const t=attCountTxt(a);return t?' · '+t:''}
/* Versión 4.4: una actuación finalizada no lleva prioridad, para que deje de salir marcada en los listados */
function markFinished(x){x.finalizada=true;x.priority='';x.updatedAt=nowIso()}
/* Tras guardar una actuación se vuelve a la pantalla desde la que se abrió */
let curCenterId='';
function afterActionSaved(){
 if(document.querySelector('.center-fixed-head')&&curCenterId&&db.centers.some(c=>c.id===curCenterId))return centerDetail(curCenterId);
 if(document.getElementById('actionRows'))return filterActions();
 const v=document.querySelector('.nav button[data-view].active')?.dataset.view;
 if(v==='dashboard')return dashboard();
 registro();
}
function nowIso(){return new Date().toISOString()}
function todayIso(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateTime(v){if(!v)return '—';const d=new Date(v);return isNaN(d)?esc(v):d.toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function localIso(d,t){if(!d)return '';const x=new Date(`${d}T${t||'00:00'}`);return isNaN(x)?'':x.toISOString()}
function stopEv(e){e.preventDefault();e.stopPropagation()}
/* ---------- Cursos escolares (1 de septiembre a 31 de agosto) ---------- */
function courseOf(v){
 if(!v)return '';
 let y,m;const x=String(v).match(/^(\d{4})-(\d{2})/);
 if(x){y=+x[1];m=+x[2]}else{const d=new Date(v);if(isNaN(d))return '';y=d.getFullYear();m=d.getMonth()+1}
 const s=m>=9?y:y-1;return `${s}/${String((s+1)%100).padStart(2,'0')}`;
}
function currentCourse(){return courseOf(todayIso())}
function normCourse(v){const m=String(v||'').trim().match(/^(\d{4})\s*[\/\-]\s*(\d{2}|\d{4})$/);if(!m)return '';const a=+m[1],b=+m[2]%100;return (a+1)%100===b?`${a}/${String(b).padStart(2,'0')}`:''}
function courseList(dates,extra=[]){return [...new Set([currentCourse(),...extra,...dates.map(courseOf)].filter(Boolean))].sort().reverse()}
function courseSelect(id,courses,sel,onchange){return `<select id="${id}" class="select" aria-label="Curso escolar" onchange="${onchange}">${courses.map(k=>`<option value="${k}" ${k===sel?'selected':''}>Curso ${k}${k===currentCourse()?' (actual)':''}</option>`).join('')}<option value="*" ${sel==='*'?'selected':''}>Todos los cursos</option></select>`}
function inCourse(v,course){return course==='*'||courseOf(v)===course}
const centerCourseSel={};
function getCenterCourse(cid,kind){return centerCourseSel[cid+'.'+kind]||currentCourse()}
function migrateV2(){
 if(!Array.isArray(db.centerNotes))db.centerNotes=[];
 db.centers.forEach(c=>{if(!c.caracteristicas||typeof c.caracteristicas!=='object')c.caracteristicas={}});
 db.actions.forEach(a=>{if(!Array.isArray(a.updates))a.updates=[];if(a.createdAt===undefined)a.createdAt='';if(a.updatedAt===undefined)a.updatedAt=''});
 db.centers.forEach(c=>{
  if(!c.tipo){const m=String(c.name||'').match(/^([A-Z]{2,6})\s/);if(m&&APP_TIPOS.includes(m[1]))c.tipo=m[1]}
  if('docUrl' in c)delete c.docUrl;
 });
}

/* Versión 3.3: Seguimiento documental. «Entrega programaciones» ocupa el lugar de «Autorización días no lectivos»
   y se eliminan definitivamente varios elementos con sus fechas y marcas N/A. */
const FOLLOW_REMOVED_V33=['Autorización días no lectivos','Solicitud material','Cierre app transporte escolar','Bolsas','Acceso público PROENS','Programas intervención PT/AL','Propuesta de títulos'];
function migrateV33(){
 if(db.migratedV33)return;
 const f=Array.isArray(db.followupFields)?db.followupFields:[];
 if(!f.includes('Entrega programaciones')){
  const i=f.indexOf('Autorización días no lectivos');
  if(i>=0)f.splice(i,0,'Entrega programaciones');else f.splice(Math.min(1,f.length),0,'Entrega programaciones');
 }
 db.followupFields=f.filter(x=>!FOLLOW_REMOVED_V33.includes(x));
 for(const store of [db.followup,db.followupNA])for(const row of Object.values(store||{}))if(row&&typeof row==='object')FOLLOW_REMOVED_V33.forEach(k=>{delete row[k]});
 db.migratedV33=true;
}

/* Versión 3.4: se retira el seguimiento de «Faltas profesorado» y se eliminan definitivamente sus fechas. */
function migrateV34(){if('teacherAbsenceDates' in db)delete db.teacherAbsenceDates}

/* Versión 4.3: Seguimiento documental.
   - «Horarios PT/AL/ATE» pasa a llamarse «Documentación PAC» y conserva sus fechas y marcas N/A.
   - Se retira «Listado NEAE» y se eliminan definitivamente sus fechas y marcas N/A.
   - Se marcan como «sin seguimiento» los centros que no hay que seguir: no salen en la pantalla «Seguimiento». */
const FOLLOW_SKIP_V43=[['','CPR FP Apetamcor DAC-AT'],['15033150','CPREX Semente Compostela'],['15033046','CPREX Montesosori Compostela'],['15032315','ESMU de Santiago de Compostela'],['15027575','EMUSPR Estudio'],['15015421','CPR Plurilingüe Juventud'],['15033186','CEMU Profesional Estudio'],['15001151','EMUSPR de Vedra'],['15013254','CFEA de Sergude']];
function migrateV43(){
 for(const k of ['reuniones','bibliografia'])if(!Array.isArray(db[k]))db[k]=[];
 if(db.migratedV43)return;
 const OLD='Horarios PT/AL/ATE',NEW='Documentación PAC',GONE='Listado NEAE';
 const f=Array.isArray(db.followupFields)?db.followupFields:[];
 const i=f.indexOf(OLD);
 if(i>=0){if(f.includes(NEW))f.splice(i,1);else f[i]=NEW}
 db.followupFields=f.filter(x=>x!==GONE);
 for(const store of [db.followup,db.followupNA])for(const row of Object.values(store||{})){
  if(!row||typeof row!=='object')continue;
  if(OLD in row){if(!row[NEW])row[NEW]=row[OLD];delete row[OLD]}
  delete row[GONE];
 }
 const key=v=>normTxt(v).replace(/[^a-z0-9]/g,'');
 db.centers.forEach(c=>{if(FOLLOW_SKIP_V43.some(([code,name])=>(code&&String(c.code??'').trim()===code)||key(c.name)===key(name)))c.sinSeguimiento=true});
 db.migratedV43=true;
}

/* Versión 4.4: se quita la prioridad a las actuaciones finalizadas (también a las que ya lo estaban, y a las que
   se finalicen desde un equipo que siga con una versión anterior en caché). */
function migrateV44(){
 db.actions.forEach(a=>{
  if(a.finalizada&&a.priority)a.priority='';
  if('pdfs' in a&&!Array.isArray(a.pdfs))delete a.pdfs;
 });
}

/* ---------- Inicio: bloques desplegables ---------- */
function homeBlock(key,title,headExtra,body){
 const open=window.__vault?.ui?window.__vault.ui('home.'+key,true)!==false:true;
 return `<details class="panel home-block" data-block="${key}" ${open?'open':''} ontoggle="homeBlockToggle(this)"><summary><span class="home-block-title">${title}</span>${headExtra}<span class="special-arrow" aria-hidden="true">▶</span></summary><div class="panelbody">${body}</div></details>`;
}
function homeBlockToggle(el){window.__vault?.setUi?.('home.'+el.dataset.block,el.open)}
function homeRequestsPanel(){
 const items=db.petitionsRequirements||[];
 const centerName=id=>db.centers.find(c=>c.id===id)?.name||'Centro no registrado';
 const body=`<div class="toolbar"><input id="homeRequestSearch" class="input" type="search" placeholder="Buscar por centro" aria-label="Buscar peticiones y requerimientos por centro" oninput="filterHomeRequests()"><label style="display:flex;align-items:center;gap:6px;font-size:13px"><input id="homeRequestPendingOnly" type="checkbox" onchange="filterHomeRequests()"> Solo pendientes</label></div><div class="home-request-list" id="homeRequestList">${[...items].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x=>`<div class="event home-request-row ${x.finalizada?'finalized':''}" data-finished="${!!x.finalizada}" data-center="${esc(centerName(x.centerId).toLocaleLowerCase('es'))}"><b>${esc(x.type||'Petición')} · ${date(x.date)} · ${x.finalizada?'Finalizado':'Pendiente'}</b><div><strong>${esc(centerName(x.centerId))}</strong> · ${esc(x.subject||'Sin asunto')}</div>${db.centers.some(c=>c.id===x.centerId)?`<button class="btn small" type="button" onclick="centerDetail('${x.centerId}','peticiones')">Ver ficha</button>`:''}</div>`).join('')||'<div class="empty">No hay peticiones ni requerimientos registrados.</div>'}</div><div id="homeRequestNoResults" class="empty" hidden>No hay resultados para ese centro.</div>`;
 return homeBlock('requests','Peticiones y requerimientos',`<span class="pill">${items.length} ${items.length===1?'registro':'registros'}</span>`,body);
}
function calendarBlock(){
 const html=calendarPanel();
 const head='<div class="panel"><div class="panelhead"><h2>Calendario de plazos · 2026/27</h2><button class="btn small primary" onclick="newManualDeadline()">+ Añadir plazo</button></div><div class="panelbody">';
 if(!html.startsWith(head)||!html.endsWith('</div></div>'))return html;
 return homeBlock('calendar','Calendario de plazos · 2026/27',`<button class="btn small primary" onclick="stopEv(event);newManualDeadline()">+ Añadir plazo</button>`,html.slice(head.length,-12));
}
function actionMeta(a){const n=(a.updates||[]).length;return (n?` · ${n} ${n===1?'actualización':'actualizaciones'}`:'')+imgCountMeta(a)}
function dashboard(){
 const pendingActions=db.actions.filter(x=>!x.finalizada).sort(actionOrder);
 const pending=pendingActions.length;
 const today=todayIso();
 const next=db.visits.filter(x=>x.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
 const last=db.visits.filter(x=>x.date&&x.date<today).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 const pendingRow=a=>`<div class="event pend-row${prioClass(a)}"><div class="pend-main"><b>${date(a.date)} · ${esc(a.center||'Sin centro')}${actionMeta(a)}</b><button type="button" class="subject-link" onclick="editAction('${a.id}')">${esc(a.subject||'(sin asunto)')}</button></div><div class="pend-side">${prioPill(a)}<button class="btn small" onclick="finishActionFromHome('${a.id}')">Finalizar</button></div></div>`;
 const prioGroups=[['alta','Prioridad alta'],['media','Prioridad media'],['baja','Prioridad baja'],['','Sin prioridad']].map(([p,label])=>[label,pendingActions.filter(a=>(PRIO_LABEL[a.priority]?a.priority:'')===p)]).filter(g=>g[1].length);
 const withHeads=prioGroups.length>1||(prioGroups.length===1&&prioGroups[0][0]!=='Sin prioridad');
 const go=v=>v==='registroPendientes'?'registroPending()':`nav('${v}')`;
 const card=(n,label,view)=>`<div class="card link" role="button" tabindex="0" onclick="${go(view)}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${go(view)}}"><div class="metric">${n}</div><div class="label">${label}</div></div>`;
 const visitRow=(v,pill)=>`<div class="kpi" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><b style="font-size:12px">${date(v.date)}</b><div class="muted" style="font-size:11px">${esc(v.center)}</div></div>${pill}</div>`;
 const visitsBody=`<h3 class="home-sub">Próximas visitas</h3>${next.map(v=>visitRow(v,`<span class="pill">${esc(v.month||'')}</span>`)).join('')||'<div class="empty">No hay visitas próximas.</div>'}<h3 class="home-sub" style="margin-top:18px">Últimas visitas realizadas</h3>${last.map(v=>visitRow(v,'<span class="pill ok">Realizada</span>')).join('')||'<div class="empty">No hay visitas realizadas.</div>'}`;
 const pendingBody=pending?`<p class="muted pend-note">Ordenadas por prioridad y, dentro de cada una, de la más antigua a la más reciente.</p>`+prioGroups.map(([label,items])=>`${withHeads?`<h3 class="home-sub pend-head">${label} <span class="pill">${items.length}</span></h3>`:''}<div class="timeline pend-list">${items.map(pendingRow).join('')}</div>`).join(''):'<div class="empty">No hay actuaciones pendientes.</div>';
 document.getElementById('main').innerHTML=layout('Inicio','Visión rápida de la actividad inspectora del curso 2026/27',`<button class="btn" onclick="pasteActionStart()">Pegar actuación de Claude</button><button class="btn primary" onclick="newAction()">+ Introducir actuación</button>`)+
 `<div class="cards cards1">${card(pending,'Actuaciones pendientes','registroPendientes')}</div>`+
 homeRequestsPanel()+
 `<div class="grid2 home-grid">`+
 homeBlock('visits','Visitas',`<button class="btn small" onclick="stopEv(event);nav('visitas')">Ver visitas</button>`,visitsBody)+
 homeBlock('pending','Actuaciones pendientes',`<span class="pill ${pending?'warn':''}">${pending}</span><button class="btn small" onclick="stopEv(event);registroPending()">Ver pendientes</button>`,pendingBody)+
 `</div>`+calendarBlock();
}

/* ---------- Registro de actuaciones ---------- */
function registro(){
 document.getElementById('main').innerHTML=layout('Registro de actuaciones','Consultas, comunicaciones, incidencias y actuaciones, por prioridad y antigüedad',homeBtn()+`<button class="btn" onclick="pasteActionStart()">Pegar actuación de Claude</button><button class="btn primary" onclick="newAction()">+ Nueva actuación</button>`)+`<div class="panel"><div class="panelbody"><div class="toolbar"><input id="rsearch" class="input" type="search" placeholder="Buscar asunto, centro, alumno, texto…" oninput="filterActions()"><select id="rtype" class="select" onchange="filterActions()"><option value="">Todos los medios</option>${ACTION_MODES.map(m=>`<option>${m}</option>`).join('')}<option value="__none">Sin especificar</option></select><select id="rstatus" class="select" onchange="filterActions()"><option value="">Todos los estados</option><option value="0" selected>Pendientes</option><option value="1">Finalizadas</option></select><select id="rprio" class="select" aria-label="Prioridad" onchange="filterActions()"><option value="">Todas las prioridades</option>${PRIORITIES.map(([v,l])=>`<option value="${v}">Prioridad ${l.toLowerCase()}</option>`).join('')}<option value="__none">Sin prioridad</option></select>${courseSelect('rcourse',courseList(db.actions.map(a=>a.date)),currentCourse(),'filterActions()')}<button class="btn" onclick="exportCSV('actions')">Exportar todo a CSV</button><button class="btn" onclick="exportFilteredActionsCSV()">Exportar resultados a CSV</button></div><p id="rcount" class="muted" style="font-size:12px;margin:0 0 8px"></p><div class="tablewrap"><table class="table"><thead><tr><th>Fecha</th><th>Prioridad</th><th>Medio</th><th>Centro</th><th>Persona implicada</th><th>Asunto</th><th>Actuación</th><th>Seguimiento</th><th>Estado</th><th></th></tr></thead><tbody id="actionRows"></tbody></table></div></div></div>`;
 filterActions();
}
function registroForCenter(name,course='*'){nav('registro');const i=document.getElementById('rsearch'),k=document.getElementById('rcourse'),st=document.getElementById('rstatus');if(st)st.value='';if(k)k.value=[...k.options].some(o=>o.value===course)?course:'*';if(i){i.value=name;filterActions()}}
function showAllCoursesPending(){const k=document.getElementById('rcourse');if(k)k.value='*';filterActions()}
function registroPending(){nav('registro');const s=document.getElementById('rstatus'),k=document.getElementById('rcourse');if(s)s.value='0';if(k)k.value='*';filterActions()}
function filterActions(){
 const q=normTxt(document.getElementById('rsearch')?.value||''),t=document.getElementById('rtype')?.value||'',s=document.getElementById('rstatus')?.value||'',k=document.getElementById('rcourse')?.value||'*',pr=document.getElementById('rprio')?.value||'';
 const a=db.actions.filter(x=>!q||normTxt([x.center,x.student,x.subject,x.details,x.action,...(x.updates||[]).map(u=>u.text)].join(' ')).includes(q))
  .filter(x=>!t||(t==='__none'?!x.mode:x.mode===t)).filter(x=>s===''||String(x.finalizada?1:0)===s).filter(x=>!pr||(pr==='__none'?!PRIO_LABEL[x.priority]:x.priority===pr)).filter(x=>inCourse(x.date,k))
  .sort(actionOrder);
 currentFilteredActions=a;
 const c=document.getElementById('rcount');if(c){const hid=(s==='0'&&k!=='*')?db.actions.filter(x=>!x.finalizada&&!inCourse(x.date,k)).length:0;c.innerHTML=`${a.length} ${a.length===1?'actuación':'actuaciones'}${k==='*'?'':' en el curso '+esc(k)}${a.length>1?' · ordenadas por prioridad y, dentro de cada una, de la más antigua a la más reciente':''}`+(hid?` · <button type="button" class="linklike" onclick="showAllCoursesPending()">Hay ${hid} pendiente${hid===1?'':'s'} de otros cursos: verlas</button>`:'');}
 document.getElementById('actionRows').innerHTML=a.map(x=>{
  const ups=x.updates||[],lastUp=ups.length?[...ups].sort((p,q)=>(q.date||'').localeCompare(p.date||''))[0]:null;
  return `<tr><td>${date(x.date)}</td><td>${prioPill(x)||'<span class="muted">—</span>'}</td><td>${esc(x.mode||'—')}</td><td><b>${esc(x.center)}</b></td><td>${esc(x.student)}</td><td><button type="button" class="subject-link" onclick="editAction('${x.id}')">${esc(x.subject||'(sin asunto)')}</button>${attCountTxt(x)?`<div class="muted img-count">${attCountTxt(x)}</div>`:''}</td><td><div class="clamp">${esc(x.action)}</div></td><td>${lastUp?`<span class="pill">${ups.length}</span><br><span class="muted">Última: ${date(lastUp.date)}</span>`:'<span class="muted">—</span>'}</td><td>${x.finalizada?'<span class="pill ok">Finalizada</span>':'<span class="pill warn">Pendiente</span>'}</td><td style="white-space:nowrap">${x.finalizada?'':`<button class="btn small" onclick="finishAction('${x.id}')">Finalizar</button> `}<button class="btn small danger" title="Eliminar actuación" aria-label="Eliminar actuación" onclick="deleteAction('${x.id}')">🗑️</button></td></tr>`}).join('')||'<tr><td colspan="10" class="empty">No hay resultados.</td></tr>';
}

/* ---------- Formulario de actuación: fechas e historial ---------- */
let formUpdates=[];
function actionForm(x={},warnings=[]){
 formUpdates=(x.updates||[]).map(u=>({...u}));
 formImages=(x.images||[]).map(m=>({...m}));
 pdfFormStart(x.pdfs);
 const centerKnown=!x.center||db.centers.some(c=>c.name===x.center);
 const meta=x.id?`<div class="meta-line">Registrada: ${x.createdAt?dateTime(x.createdAt):'sin dato'} · Última modificación: ${x.updatedAt?dateTime(x.updatedAt):'sin cambios'}${x.source==='notion'?' · Importada de Notion':''}</div>`:'<div class="meta-line">La fecha de registro se anotará automáticamente al guardar.</div>';
 return `${warnings.length?`<div class="notice warn-notice" style="margin:0 0 14px">${warnings.map(esc).join('<br>')}</div>`:''}${meta}
 <div class="formgrid" style="margin-top:12px">
  <div class="field"><label for="fdate">Fecha de la actuación</label><input id="fdate" class="input" type="date" value="${esc(x.date||todayIso())}"></div>
  <input id="ftime" type="hidden" value="${esc(x.time||'')}">
  <div class="field"><label for="fmode">Medio de comunicación</label><select id="fmode" class="select"><option value="" ${!x.mode?'selected':''}>Sin especificar</option>${ACTION_MODES.map(m=>`<option ${x.mode===m?'selected':''}>${m}</option>`).join('')}</select></div>
  <div class="field"><label for="fcenter">Centro</label><select id="fcenter" class="select"><option value="">— Sin centro —</option>${centerKnown?'':`<option value="${esc(x.center)}" selected>${esc(x.center)} (no registrado)</option>`}${[...db.centers].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`<option ${c.name===x.center?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="fstudent">Persona implicada</label><input id="fstudent" class="input" style="width:100%" value="${esc(x.student)}"></div>
  <div class="field"><label for="fsubject">Asunto</label><input id="fsubject" class="input" style="width:100%" value="${esc(x.subject)}"></div>
  <div class="field"><label for="fprio">Prioridad</label><select id="fprio" class="select prio-select" onchange="this.dataset.p=this.value" data-p="${PRIO_LABEL[x.priority]?x.priority:''}"><option value="" ${PRIO_LABEL[x.priority]?'':'selected'}>Sin prioridad</option>${PRIORITIES.map(([v,l])=>`<option value="${v}" ${x.priority===v?'selected':''}>${l}</option>`).join('')}</select><p id="fprioHint" class="muted prio-hint" hidden>Las actuaciones finalizadas no llevan prioridad.</p></div>
  <div class="field full"><label for="fdetails">Detalles</label><textarea id="fdetails" class="textarea">${esc(x.details)}</textarea></div>
  <div class="field full"><label for="faction">Actuación realizada / respuesta</label><textarea id="faction" class="textarea">${esc(x.action)}</textarea></div>
  <div class="field full"><label>Imágenes y PDF</label>${imgFormBlock('bin',true)}</div>
  <div class="field full"><label>Actualizaciones</label><div id="fUpdates" class="update-list"></div>
   <div class="update-add"><input id="fuDate" class="input" type="date" value="${todayIso()}" aria-label="Fecha de la actualización"><textarea id="fuText" class="textarea" placeholder="Qué ha cambiado: respuesta recibida, nueva gestión, cierre…" aria-label="Texto de la actualización"></textarea><button type="button" class="btn" onclick="addFormUpdate()">Añadir actualización</button></div></div>
  <div class="field full"><label class="gate-check"><input id="ffinal" type="checkbox" ${x.finalizada?'checked':''} onchange="prioSyncFinal()"> Actuación finalizada</label></div>
 </div>`;
}
function renderFormUpdates(){
 const box=document.getElementById('fUpdates');if(!box)return;
 box.innerHTML=[...formUpdates].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(u=>`<div class="update-item"><div><b>${date(u.date)}</b><div class="note-text">${esc(u.text)}</div></div><button type="button" class="btn small danger" aria-label="Eliminar actualización" onclick="removeFormUpdate('${u.id}')">🗑️</button></div>`).join('')||'<p class="muted" style="font-size:12px;margin:0 0 8px">Sin actualizaciones.</p>';
}
function addFormUpdate(){
 const t=document.getElementById('fuText'),d=document.getElementById('fuDate');
 if(!t.value.trim()){t.focus();return}
 formUpdates.push({id:uid(),date:d.value||todayIso(),text:t.value.trim(),createdAt:nowIso()});
 t.value='';renderFormUpdates();
}
function removeFormUpdate(id){if(!confirm('¿Eliminar esta actualización?'))return;formUpdates=formUpdates.filter(u=>u.id!==id);renderFormUpdates()}
/* Al marcar «Actuación finalizada» se quita la prioridad; si se desmarca sin haber guardado, se recupera la que tenía */
function prioSyncFinal(){
 const f=document.getElementById('ffinal'),s=document.getElementById('fprio'),h=document.getElementById('fprioHint');if(!f||!s)return;
 if(f.checked){if(s.value)s.dataset.prev=s.value;s.value='';s.disabled=true}
 else{s.disabled=false;if(s.dataset.prev){s.value=s.dataset.prev;delete s.dataset.prev}}
 s.dataset.p=s.value;if(h)h.hidden=!f.checked;
}
function readActionForm(){
 if(document.getElementById('fuText')?.value.trim())addFormUpdate();
 const v=id=>document.getElementById(id).value,fin=document.getElementById('ffinal').checked;
 return {date:v('fdate'),time:v('ftime'),mode:v('fmode'),center:v('fcenter'),student:v('fstudent'),subject:v('fsubject'),priority:fin?'':normPriority(v('fprio')),details:v('fdetails'),action:v('faction'),finalizada:fin,updates:formUpdates,images:formImages.map(m=>({...m})),pdfs:formPdfs.map(m=>({...m}))};
}
function newAction(prefill={},warnings=[]){
 openModal('Nueva actuación',actionForm(prefill,warnings),()=>{
  const data=readActionForm();
  db.actions.push({id:uid(),createdAt:nowIso(),updatedAt:'',...data});
  pdfFormKeep();save();closeModal();afterActionSaved();imgAfterSave([]);
 });
 renderFormUpdates();renderFormImages();prioSyncFinal();
}
function editAction(id){
 const x=db.actions.find(a=>a.id===id);if(!x)return;
 openModal('Actuación',actionForm(x),()=>{const before=attOf(x).map(m=>({...m}));Object.assign(x,readActionForm(),{updatedAt:nowIso()});pdfFormKeep();save();closeModal();afterActionSaved();imgAfterSave(before.filter(m=>!attOf(x).some(n=>n.id===m.id)))});
 renderFormUpdates();renderFormImages();prioSyncFinal();
}
