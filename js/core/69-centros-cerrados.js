/* ======================= VERSIÓN 4.15: AVISO DE CENTROS CERRADOS =======================
   Con los datos de 69-dias-non-lectivos-datos.js (DNL_2026_27), la aplicación avisa los días en que
   alguno de tus centros (los de «Centros») está cerrado por:
   - un día no lectivo de libre disposición del centro, o
   - un festivo local que cae en día lectivo.
   El aviso aparece en una ventana al abrir la aplicación ese día (una vez por sesión) y en un bloque
   arriba del todo en Inicio, que también enseña los cierres de los próximos 14 días.
   El centro se busca por su código; si no lo tiene en la ficha, por el nombre. */
function dnlNorm(v){return String(v??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function dnlEntryFor(center){
 if(typeof DNL_2026_27==='undefined'||!center)return null;
 const code=String(center.code||'').trim();
 if(code){const e=DNL_2026_27.find(x=>x.c===code);if(e)return e}
 const n=dnlNorm(center.name);
 return n?DNL_2026_27.find(x=>dnlNorm(x.n)===n)||null:null;
}
function dnlMotivo(t,label){return t==='F'?`Festivo local${label?': '+label:''}`:'Día no lectivo de libre disposición del centro'}
/* Cierres de tus centros en una fecha (AAAA-MM-DD) */
function closedCentersOn(day){
 const out=[];
 (db.centers||[]).forEach(c=>{
  const e=dnlEntryFor(c);if(!e)return;
  e.d.filter(x=>x[0]===day).forEach(x=>out.push({center:c,motivo:dnlMotivo(x[1],x[2]),tipo:x[1]}));
 });
 return out.sort((a,b)=>String(a.center.name).localeCompare(String(b.center.name),'es'));
}
/* Cierres de los próximos días (sin contar hoy) */
function closedCentersNext(days=14){
 const out=[];
 for(let i=1;i<=days;i++){const d=addDaysIso(todayIso(),i);closedCentersOn(d).forEach(x=>out.push({...x,day:d}))}
 return out;
}
function dnlWeekday(day){const d=new Date(`${day}T12:00:00`);return isNaN(d)?'':d.toLocaleDateString('es-ES',{weekday:'long'})}
function closedRow(x,withDay){
 const c=x.center;
 return `<div class="event closed-row"><div class="pend-main"><b>${withDay?`${dnlWeekday(x.day)} ${date(x.day)} · `:''}<button type="button" class="subject-link" onclick="closeModal();centerDetail('${c.id}','datos')">${esc(c.name)}</button></b><span class="muted">${esc(x.motivo)}${c.town?' · '+esc(c.town):''}</span></div><div class="pend-side"><span class="pill ${x.tipo==='F'?'':'warn'}">${x.tipo==='F'?'Festivo local':'Libre disposición'}</span></div></div>`;
}
function closedHomeBlock(){
 const today=closedCentersOn(todayIso()),next=closedCentersNext(14);
 if(!today.length&&!next.length)return '';
 const todayHtml=today.length?`<h3 class="home-sub">Hoy, ${dnlWeekday(todayIso())} ${date(todayIso())}</h3><div class="timeline pend-list">${today.map(x=>closedRow(x,false)).join('')}</div>`:'';
 const nextHtml=next.length?`<h3 class="home-sub"${today.length?' style="margin-top:14px"':''}>Próximos 14 días</h3><div class="timeline pend-list">${next.map(x=>closedRow(x,true)).join('')}</div>`:'';
 if(today.length)return `<div class="panel closed-panel"><div class="panelhead"><h2>🏫&#xFE0E; ${today.length===1?'Centro cerrado hoy':'Centros cerrados hoy'} <span class="pill warn">${today.length}</span></h2></div><div class="panelbody">${todayHtml}${nextHtml}</div></div>`;
 return homeBlock('closed','Centros cerrados próximamente',`<span class="pill">${next.length}</span>`,`<p class="muted pend-note">Días no lectivos de libre disposición y festivos locales de tus centros.</p>${nextHtml}`);
}
/* Ventana al abrir la aplicación; «after» se ejecuta al cerrarla (p. ej., los avisos de actuaciones) */
let closedShownSession=false;
function closedOnStart(after){
 if(closedShownSession)return false;closedShownSession=true;
 const today=closedCentersOn(todayIso());if(!today.length)return false;
 openModal(today.length===1?'Hoy hay un centro cerrado':`Hoy hay ${today.length} centros cerrados`,`<p style="margin-top:0">${today.length===1?'Este centro está cerrado':'Estos centros están cerrados'} hoy, ${dnlWeekday(todayIso())} ${date(todayIso())}:</p><div class="timeline pend-list">${today.map(x=>closedRow(x,false)).join('')}</div><p class="muted" style="font-size:12px">El aviso sigue arriba del todo en Inicio durante todo el día.</p>`,()=>{closeModal();if(after)setTimeout(after,200)});
 document.getElementById('modalSave').textContent='Entendido';
 return true;
}
