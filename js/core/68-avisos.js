/* ======================= VERSIÓN 4.12: AVISOS DE LAS ACTUACIONES =======================
   Una actuación pendiente puede llevar una fecha de aviso (a.remindOn, AAAA-MM-DD).
   - Antes de esa fecha la actuación está «aplazada»: no sale entre las pendientes de Inicio, sino en el
     apartado «Aplazadas», con la fecha del aviso.
   - Desde esa fecha, la aplicación avisa: ventana al abrirla (una vez por sesión), bloque «Avisos» arriba
     del todo en Inicio y número junto a «Inicio» en el menú lateral.
   - El aviso se quita con «Quitar aviso» (la actuación sigue pendiente, sin fecha de aviso), se puede
     aplazar otra vez o desaparece al finalizar la actuación.
   - La aplicación avisa cuando está abierta: sin servidor no puede mandar notificaciones con ella cerrada. */
function remindOf(a){return a&&!a.finalizada?iso(a.remindOn||''):''}
function isPostponed(a){const r=remindOf(a);return !!r&&r>todayIso()}
function isReminderDue(a){const r=remindOf(a);return !!r&&r<=todayIso()}
function dueReminders(){return db.actions.filter(isReminderDue).sort((a,b)=>remindOf(a).localeCompare(remindOf(b))||actionOrder(a,b))}
function postponedActions(){return db.actions.filter(isPostponed).sort((a,b)=>remindOf(a).localeCompare(remindOf(b))||actionOrder(a,b))}
function addDaysIso(d,n){const x=new Date(`${d||todayIso()}T12:00:00`);x.setDate(x.getDate()+n);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function remindPill(a){
 const r=remindOf(a);if(!r)return '';
 return r>todayIso()?`<span class="remind-pill later" title="Aplazada: la aplicación avisará ese día">⏰&#xFE0E; Aviso ${date(r)}</span>`:`<span class="remind-pill due" title="Ha llegado la fecha del aviso">🔔&#xFE0E; Aviso ${r===todayIso()?'hoy':'desde '+date(r)}</span>`;
}
function migrateV412(){
 if(!Array.isArray(db.supervisions))db.supervisions=[];
 db.actions.forEach(a=>{if(a.finalizada&&a.remindOn)delete a.remindOn});
}
/* Campo del formulario de la actuación */
function remindField(x){
 const r=x.finalizada?'':iso(x.remindOn||'');
 return `<div class="field full remind-field"><label for="fremind">Aviso (aplazar la actuación hasta una fecha)</label>
  <div class="remind-row"><input id="fremind" class="input" type="date" value="${esc(r)}" min="${todayIso()}" onchange="remindHint()"><button type="button" class="btn small" onclick="remindQuick(1)">Mañana</button><button type="button" class="btn small" onclick="remindQuick(7)">+1 semana</button><button type="button" class="btn small" onclick="remindQuick(14)">+2 semanas</button><button type="button" class="btn small" onclick="remindQuick(0)">Sin aviso</button></div>
  <p id="fremindHint" class="muted remind-hint"></p></div>`;
}
function remindQuick(n){const i=document.getElementById('fremind');if(!i||i.disabled)return;i.value=n?addDaysIso(todayIso(),n):'';remindHint()}
function remindHint(){
 const i=document.getElementById('fremind'),h=document.getElementById('fremindHint'),f=document.getElementById('ffinal');if(!i||!h)return;
 const fin=!!f?.checked;i.disabled=fin;document.querySelectorAll('.remind-row .btn').forEach(b=>b.disabled=fin);
 if(fin){h.textContent='Las actuaciones finalizadas no llevan aviso.';return}
 const v=i.value;
 h.textContent=!v?'Sin aviso: la actuación aparece entre las pendientes desde hoy.':v>todayIso()?`Queda aplazada: no aparecerá entre las pendientes de Inicio hasta el ${date(v)}, día en que la aplicación te avisará.`:'La fecha ya ha llegado: la aplicación te avisará en cuanto guardes.';
}
/* Bloque «Avisos» de Inicio y apartado «Aplazadas» */
function remindRow(a){
 return `<div class="event pend-row remind-row-due${prioClass(a)}"><div class="pend-main"><b>${remindPill(a)} ${date(a.date)} · ${esc(a.center||'Sin centro')}</b><button type="button" class="subject-link" onclick="editAction('${a.id}')">${esc(a.subject||'(sin asunto)')}</button></div><div class="pend-side">${prioPill(a)}<button class="btn small" onclick="remindPostponeAsk('${a.id}')">Aplazar</button><button class="btn small" onclick="remindClear('${a.id}')">Quitar aviso</button></div></div>`;
}
function remindHomeBlock(){
 const due=dueReminders();if(!due.length)return '';
 return `<div class="panel remind-panel"><div class="panelhead"><h2>🔔&#xFE0E; Avisos de actuaciones <span class="pill warn">${due.length}</span></h2></div><div class="panelbody"><p class="muted pend-note">Actuaciones que habías aplazado y cuya fecha de aviso ya ha llegado. «Quitar aviso» las deja como pendientes normales.</p><div class="timeline pend-list">${due.map(remindRow).join('')}</div></div></div>`;
}
function postponedBody(list){
 return list.length?`<p class="muted pend-note">Ordenadas por la fecha del aviso. Hasta ese día no aparecen entre las pendientes.</p><div class="timeline pend-list">${list.map(a=>`<div class="event pend-row${prioClass(a)}"><div class="pend-main"><b>${remindPill(a)} ${date(a.date)} · ${esc(a.center||'Sin centro')}</b><button type="button" class="subject-link" onclick="editAction('${a.id}')">${esc(a.subject||'(sin asunto)')}</button></div><div class="pend-side">${prioPill(a)}<button class="btn small" onclick="remindPostponeAsk('${a.id}')">Cambiar fecha</button><button class="btn small" onclick="remindClear('${a.id}')">Quitar aviso</button></div></div>`).join('')}</div>`:'';
}
function remindRefresh(){
 remindNavBadge();
 if(document.getElementById('modal')?.classList.contains('show')&&document.getElementById('remindDlg'))remindOpenDialog(true);
 if(document.querySelector('.center-fixed-head')&&curCenterId)return centerDetail(curCenterId,'actuaciones');
 if(document.getElementById('actionRows'))return filterActions();
 dashboard();
}
function remindClear(id){const a=db.actions.find(x=>x.id===id);if(!a)return;delete a.remindOn;a.updatedAt=nowIso();save();remindRefresh()}
function remindSet(id,d){const a=db.actions.find(x=>x.id===id);if(!a||!d)return;a.remindOn=d;a.updatedAt=nowIso();save();remindRefresh()}
function remindPostponeAsk(id){
 const a=db.actions.find(x=>x.id===id);if(!a)return;
 const box=document.getElementById('vdlg');
 document.getElementById('vdlgTitle').textContent='Aplazar la actuación';
 document.getElementById('vdlgBody').innerHTML=`<p style="margin-top:0"><b>${esc(a.subject||'(sin asunto)')}</b>${a.center?'<br><span class="muted">'+esc(a.center)+'</span>':''}</p><div class="toolbar"><button class="btn" type="button" onclick="remindPick(1)">Mañana</button><button class="btn" type="button" onclick="remindPick(7)">+1 semana</button><button class="btn" type="button" onclick="remindPick(14)">+2 semanas</button><button class="btn" type="button" onclick="remindPick(30)">+1 mes</button></div><div class="field"><label for="remindNew">Otra fecha</label><input id="remindNew" class="input" type="date" min="${addDaysIso(todayIso(),1)}" value="${esc(isPostponed(a)?remindOf(a):addDaysIso(todayIso(),7))}"></div>`;
 document.getElementById('vdlgFoot').innerHTML=`<button class="btn" type="button" onclick="remindDlgClose()">Cancelar</button><button class="btn primary" type="button" onclick="remindPickSave('${a.id}')">Aplazar</button>`;
 box.classList.add('show');
}
function remindPick(n){const i=document.getElementById('remindNew');if(i)i.value=addDaysIso(todayIso(),n)}
function remindPickSave(id){const v=document.getElementById('remindNew')?.value;if(!v){alert('Elige la fecha del aviso.');return}if(v<=todayIso()){alert('Para aplazarla, la fecha tiene que ser posterior a hoy.');return}remindDlgClose();remindSet(id,v)}
function remindDlgClose(){document.getElementById('vdlg').classList.remove('show')}
/* Ventana de avisos al abrir la aplicación (una vez por sesión) y número en «Inicio» del menú */
let remindShownSession=false;
function remindOpenDialog(refresh){
 const due=dueReminders();
 if(!due.length){if(refresh)closeModal();return}
 openModal(`Tienes ${due.length} ${due.length===1?'aviso':'avisos'} de actuaciones`,`<div id="remindDlg"><p style="margin-top:0">Ha llegado la fecha de aviso de ${due.length===1?'esta actuación aplazada':'estas actuaciones aplazadas'}:</p><div class="timeline pend-list">${due.map(remindRow).join('')}</div><p class="muted" style="font-size:12px">Si cierras esta ventana, los avisos siguen arriba del todo en Inicio hasta que los quites, los aplaces o finalices la actuación.</p></div>`,closeModal);
 document.getElementById('modalSave').textContent='Entendido';
}
function remindOnStart(){if(remindShownSession)return;remindShownSession=true;remindNavBadge();if(dueReminders().length)setTimeout(()=>remindOpenDialog(),300)}
function remindNavBadge(){
 const b=document.querySelector('.nav button[data-view="dashboard"]');if(!b)return;
 let s=b.querySelector('.nav-badge');const n=dueReminders().length;
 if(!n){s?.remove();return}
 if(!s){s=document.createElement('span');s.className='nav-badge';b.appendChild(s)}
 s.textContent=n;s.title=`${n} ${n===1?'aviso':'avisos'} de actuaciones`;
}
/* Si la aplicación se queda abierta de un día para otro, comprueba los avisos al volver a ella */
let remindDay=todayIso();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')return;remindNavBadge();if(remindDay!==todayIso()){remindDay=todayIso();remindShownSession=false;remindOnStart();if(document.querySelector('.nav button[data-view="dashboard"].active')&&!document.getElementById('modal')?.classList.contains('show'))dashboard()}});
