function centerDetail(id,tab=activeCenterTab){
 const c=db.centers.find(x=>x.id===id);if(!c)return;
 curCenterId=id;
 if(!['datos','dotacion','otros','ficha','actuaciones','notas','visitas','peticiones','seguimiento'].includes(tab))tab='datos';
 const allActs=db.actions.filter(a=>a.center===c.name);
 const pending=allActs.filter(a=>!a.finalizada).sort(actionOrder);
  const centerVisits=db.visits.filter(v=>v.center===c.name).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const centerRequests=db.petitionsRequirements.filter(x=>x.centerId===c.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const notes=db.centerNotes.filter(n=>n.centerId===c.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const field=(label,value)=>`<div><dt>${label}</dt><dd>${esc(value||'—')}</dd></div>`;
 const tabs=[['datos','Datos del centro'],['dotacion','Dotación'],['otros','Otros datos'],['ficha','Ficha oficial'],['actuaciones','Actuaciones'],['notas','Notas del centro'],['visitas','Visitas'],['seguimiento','Seguimiento documental'],['peticiones','Peticiones y requerimientos']];
 const cur=currentCourse(),inCur=x=>courseOf(x.date)===cur;
 const counts={actuaciones:pending.length,notas:notes.length,visitas:centerVisits.filter(v=>visitInCourse(v,cur)).length,peticiones:centerRequests.filter(inCur).length};
 const menuButtons=tabs.map(([key,label])=>`<button id="center-menu-${key}" class="center-menu-button" type="button" data-tab="${key}" aria-controls="center-panel-${key}" aria-pressed="${key===tab}" onclick="showCenterTab('${key}')">${label}${counts[key]?` <span class="menu-count" title="${key==='notas'?'Notas del centro':key==='actuaciones'?'Actuaciones sin finalizar':'Curso '+cur}">${counts[key]}</span>`:''}</button>`).join('');
 const leadership=(cls,label,value)=>`<div class="leadership-role ${cls}"><dt>${label}</dt><dd>${esc(value||'—')}</dd></div>`;
 const empty=(col,row)=>`<div class="leadership-empty" style="grid-column:${col};grid-row:${row}" aria-hidden="true"></div>`;
 const data=`<h3>Información del centro</h3><dl class="center-data-list">${field('Tipo',c.tipo)}${field('Código',c.code)}${field('Dirección postal',c.address)}${field('Concello',c.town)}${field('Teléfono',c.phone)}${field('Correo electrónico',c.email)}${field('Otro correo',c.email2)}</dl><h3>Equipo directivo</h3><dl class="center-leadership"><div class="leadership-role leadership-direction"><dt>Dirección</dt><dd>${esc(c.director||'—')}${c.directorExt?`<span class="dir-extra">Extensión: ${esc(c.directorExt)}</span>`:''}${c.directorMobile?`<span class="dir-extra">Móvil: <a href="tel:${esc(String(c.directorMobile).replace(/[^\d+]/g,''))}">${esc(c.directorMobile)}</a></span>`:''}${c.directorObs?`<span class="dir-extra dir-obs">${esc(c.directorObs)}</span>`:''}</dd></div>${leadership('leadership-primary','Jefatura de estudios · Primaria',c.headPrimary??c.head)}${leadership('leadership-secondary','Jefatura de estudios · Secundaria',c.headSecondary)}${leadership('leadership-adults','Jefatura de estudios · Adultos',c.headAdults)}${leadership('leadership-secretary','Secretaría',c.secretary)}${leadership('leadership-vice','Vicedirección',c.vice)}${empty(1,2)}${empty(1,3)}${empty(3,2)}${empty(3,3)}${empty(4,2)}${empty(4,3)}</dl><h3 class="after-block">Otro personal</h3><dl class="center-data-list">${field('Orientación',c.orientacion)}${field('Conserje',c.conserje)}</dl>`;
 const ev=(a,withFinish)=>`<div class="event${prioClass(a)}"><b>${date(a.date)}${a.mode?' · '+esc(a.mode):''} · ${a.finalizada?'Finalizada':'Pendiente'}${actionMeta(a)} ${prioPill(a)}</b><div><button type="button" class="subject-link" onclick="editAction('${a.id}')">${esc(a.subject||'(sin asunto)')}</button></div>${withFinish&&!a.finalizada?`<button class="btn small" onclick="finishActionFromCenter('${a.id}','${c.id}')">Marcar como finalizada</button>`:''}</div>`;
 const actions=`<h3>Actuaciones pendientes (${pending.length})</h3><div class="timeline">${pending.map(a=>ev(a,true)).join('')||'<div class="empty">No hay actuaciones pendientes en este centro.</div>'}</div><div id="centerActsCourse">${centerActsHTML(c)}</div>`;
 const notesHtml=`<div class="section-head"><h3>Notas del centro (${notes.length})</h3><button class="btn small primary" onclick="newCenterNote('${c.id}')">+ Añadir nota</button></div><div class="timeline">${notes.map(n=>`<div class="event note"><b>${n.date?date(n.date):'Sin fecha'}${n.title?' · '+esc(n.title):''}${n.source==='notion'?' · <span class="muted">Notion</span>':''}</b><div class="note-text">${esc(n.text)}</div><button class="btn small" onclick="editCenterNote('${n.id}','${c.id}')">Editar</button> <button class="btn small danger" aria-label="Eliminar nota" onclick="deleteCenterNote('${n.id}','${c.id}')">🗑️</button></div>`).join('')||'<div class="empty">Sin notas. Aquí puedes guardar comentarios y observaciones generales sobre el centro.</div>'}</div>`;
 const visits=`<div id="centerVisitsCourse">${centerVisitsHTML(c)}</div>`;
 const requests=`<h3>Peticiones y requerimientos (${centerRequests.length})</h3><div class="timeline">${centerRequests.map(x=>`<div class="event"><b>${esc(x.type)} · ${date(x.date)} · ${x.finalizada?'Finalizado':'Pendiente'}</b><div>${esc(x.subject)}</div><p>${esc(x.details||'')}</p><button class="btn small" type="button" onclick="editCenterRequest('${x.id}','${c.id}')">Editar</button> ${x.finalizada?'':`<button class="btn small" type="button" onclick="finishCenterRequest('${x.id}','${c.id}')">Marcar como finalizado</button>`}</div>`).join('')||'<div class="empty">No hay peticiones ni requerimientos registrados.</div>'}</div>`;
 const sec=(key,html)=>`<section id="center-panel-${key}" class="center-section" role="region" aria-labelledby="center-menu-${key}" data-tab="${key}" ${tab===key?'':'hidden'}>${html}</section>`;
 document.getElementById('main').innerHTML=`<header class="center-fixed-head"><div class="center-identity-row"><div class="center-identity"><h1>${esc(c.name)}</h1><span>${esc(c.town)}${c.code?' · código '+esc(c.code):''}</span></div><div class="center-head-actions"><button class="btn" onclick="nav('centros')">Volver</button><button class="btn" onclick="editCenter('${c.id}')">Editar datos</button><button class="btn primary" onclick="newActionForCenter('${c.id}')">+ Actuación</button><button class="btn primary" onclick="newCenterNote('${c.id}')">+ Nota</button><button class="btn primary" onclick="newVisitForCenter('${c.id}')">+ Visita</button><button class="btn primary" onclick="newCenterRequest('${c.id}','Petición')">+ Petición</button><button class="btn primary" onclick="newCenterRequest('${c.id}','Requerimiento')">+ Requerimiento</button></div></div></header><div class="panel center-workspace"><nav class="center-menu" aria-label="Secciones de la ficha">${menuButtons}</nav><div class="center-content" id="centerContent">${sec('datos',data)}${sec('dotacion',`<div id="centerDot">${centerDotTabHTML(c)}</div>`)}${sec('otros',centerOtrosHTML(c))}${sec('ficha',`<div id="centerFicha">${centerFichaHTML(c)}</div>`)}${sec('actuaciones',actions)}${sec('notas',notesHtml)}${sec('visitas',visits)}${sec('seguimiento',`<h3>Seguimiento</h3>${centerFollowupPanel(c)}`)}${sec('peticiones',requests)}</div></div>`;
 activeCenterTab=tab;
}

/* Versión 4.7: «Otros datos» del centro, justo debajo de «Datos del centro». Sin «Días no lectivos» y con el
   bloque «Comedor» (Gestión, Nº comensales, Observaciones), que se guarda en la ficha del centro (c.comedor). */
function centerOtrosHTML(c){
 return `<h3>Otros datos del centro</h3><div class="center-extra-grid">${centerComedorCard(c)}${centerSpecialCard(c,'Prof. Prácticas','Profesorado en prácticas')}${centerSpecialCard(c,'PAC - ILS','Personal auxiliar cuidador')}${centerSpecialCard(c,'Dep. Orientación','Departamento de orientación')}${centerSpecialCard(c,'Relixión','Religión')}${centerSpecialCard(c,'EscolarizaciónExtraordinarias-B','Escolarizaciones extraordinarias')}${centerSpecialCard(c,'EscolarizaciónCursoInferior','Escolarización curso inferior')}${centerSpecialCard(c,'EOE_At.Dom_Cambio mod_Flexibili','Atención educativa domiciliaria')}</div>`;
}
const COMEDOR_FIELDS=[['gestion','Gestión'],['comensales','Nº comensales'],['obs','Observaciones']];
function centerComedorCard(c){
 const d=(c.comedor&&typeof c.comedor==='object')?c.comedor:{},has=COMEDOR_FIELDS.some(([k])=>String(d[k]||'').trim());
 return `<div class="panel center-extra-card"><div class="panelhead"><h3>Comedor</h3><button class="btn small primary" type="button" onclick="editComedor('${esc(c.id)}')">${has?'Editar':'Añadir datos'}</button></div><div class="panelbody"><dl class="center-data-list">${COMEDOR_FIELDS.map(([k,l])=>`<div><dt>${l}</dt><dd class="note-text">${esc(d[k]||'—')}</dd></div>`).join('')}</dl></div></div>`;
}
function editComedor(cid){
 const c=db.centers.find(x=>x.id===cid);if(!c)return;
 const d=(c.comedor&&typeof c.comedor==='object')?c.comedor:{};
 openModal('Comedor · '+c.name,`<div class="formgrid"><div class="field"><label for="comGestion">Gestión</label><input id="comGestion" class="input" style="width:100%" value="${esc(d.gestion||'')}"></div><div class="field"><label for="comComensales">Nº comensales</label><input id="comComensales" class="input" style="width:100%" value="${esc(d.comensales||'')}"></div><div class="field full"><label for="comObs">Observaciones</label><textarea id="comObs" class="textarea">${esc(d.obs||'')}</textarea></div></div>`,()=>{
  const v=id=>document.getElementById(id).value.trim();
  const o={gestion:v('comGestion'),comensales:v('comComensales'),obs:document.getElementById('comObs').value.trim()};
  if(COMEDOR_FIELDS.some(([k])=>o[k]))c.comedor={...o,updatedAt:nowIso()};else delete c.comedor;
  save();closeModal();centerDetail(cid,'otros');
 });
}

/* ---------- Exportación CSV ---------- */
function actionsCsvRows(list){
 return [['Fecha actuación','Prioridad','Medio','Centro','Persona implicada','Asunto','Detalles','Actuación','Actualizaciones','Imágenes','PDF','Finalizada','Registrada','Última modificación'],
  ...list.map(x=>[x.date,PRIO_LABEL[x.priority]||'',x.mode,x.center,x.student,x.subject,x.details,x.action,(x.updates||[]).map(u=>`${u.date}: ${u.text}`).join(' | '),(x.images||[]).length||'',(x.pdfs||[]).map(m=>m.name).join(' | '),x.finalizada?'Sí':'No',x.createdAt||'',x.updatedAt||''])];
}
function csvBlob(rows){return new Blob(['\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n')],{type:'text/csv;charset=utf-8'})}
function exportFilteredActionsCSV(){download(csvBlob(actionsCsvRows(currentFilteredActions)),'registro-actuaciones-filtrado.csv')}
function exportCSV(kind){
 if(kind==='actions')return download(csvBlob(actionsCsvRows(db.actions)),'registro-actuaciones.csv');
 const rows=[['Centro',...db.followupFields.map(f=>'Documentos · '+f)],...followCenters().map(c=>[c.name,...db.followupFields.map(f=>followNA(c.id,f)?'N/A':(db.followup[c.id]?.[f]||''))])];
 download(csvBlob(rows),'seguimiento.csv');
}
