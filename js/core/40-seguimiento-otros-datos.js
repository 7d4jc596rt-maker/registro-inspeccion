let followSkipOpen=false;
function followCenters(){return db.centers.filter(c=>!c.sinSeguimiento)}
function followSkipPanel(){
 const byName=(a,b)=>String(a.name).localeCompare(String(b.name),'es');
 const out=db.centers.filter(c=>c.sinSeguimiento).sort(byName),rest=followCenters().sort(byName);
 return `<details id="followSkip" class="calendar-more follow-skip" ${followSkipOpen?'open':''} ontoggle="followSkipOpen=this.open"><summary>Centros sin seguimiento (${out.length})</summary>
  <p class="muted" style="font-size:12px;margin:10px 0 6px">No aparecen en esta pantalla ni en su exportación a CSV. Las fechas que tuvieran anotadas se conservan.</p>
  <ul class="follow-skip-list">${out.map(c=>`<li><span>${esc(c.name)}</span><button class="btn small" type="button" onclick="setFollowSkip('${esc(c.id)}',false)">Volver a incluir</button></li>`).join('')||'<li class="muted">Ninguno: se siguen todos los centros.</li>'}</ul>
  <div class="toolbar" style="margin:10px 0 0"><select id="followSkipAdd" class="select" aria-label="Centro que se quita del seguimiento"><option value="">— Quitar otro centro del seguimiento —</option>${rest.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select><button class="btn" type="button" onclick="const v=document.getElementById('followSkipAdd').value;if(v)setFollowSkip(v,true)">Quitar</button></div></details>`;
}
function setFollowSkip(id,on,fromCenter){
 const c=db.centers.find(x=>x.id===id);if(!c)return;
 if(on)c.sinSeguimiento=true;else delete c.sinSeguimiento;
 save();
 if(fromCenter)centerDetail(id,'seguimiento');else{followSkipOpen=true;seguimiento()}
}
function seguimiento(){
 const fields=db.followupFields,prev=document.getElementById('spend')?.value||'';
 document.getElementById('main').innerHTML=layout('Seguimiento','Control de documentación y tareas por centro',homeBtn()+`<button class="btn" onclick="exportCSV('followup')">Exportar CSV</button>`)+`<div class="panel"><div class="panelhead"><h2>Documentos</h2></div><div class="panelbody"><div class="toolbar"><select id="spend" class="select" aria-label="Filtrar por pendientes" onchange="renderFollowup()"><option value="">Todos</option><option value="pending" ${prev==='pending'?'selected':''}>Con pendientes</option><option value="done" ${prev==='done'?'selected':''}>Sin pendientes</option></select></div><div class="tablewrap"><table class="table"><thead><tr><th>Centro</th>${fields.map(f=>`<th>${esc(f)}</th>`).join('')}</tr></thead><tbody id="followRows"></tbody></table></div>${followSkipPanel()}</div></div>`;
 renderFollowup();
}
function followNA(cid,f){return !!(db.followupNA&&db.followupNA[cid]&&db.followupNA[cid][f])}
function renderFollowup(){let p=document.getElementById('spend')?.value||'',fields=db.followupFields;let cs=followCenters();document.getElementById('followRows').innerHTML=cs.map(c=>{let row=db.followup[c.id]||{};let pending=fields.some(f=>!followNA(c.id,f)&&!iso(row[f]));if(p==='pending'&&!pending)return '';if(p==='done'&&pending)return '';return `<tr><td><b>${esc(c.name)}</b></td>${fields.map(f=>{let na=followNA(c.id,f),hasDate=!!iso(row[f]),state=na?'na':(hasDate?'done':'pending');return `<td class="follow-cell ${state}"><input type="date" class="input" style="min-width:120px" value="${esc(iso(row[f]))}" data-cid="${esc(c.id)}" data-field="${encodeURIComponent(f)}" onchange="setFollowFromInput(this)" oninput="setFollowFromInput(this)" ${na?'disabled':''}><label class="na-toggle"><input type="checkbox" data-cid="${esc(c.id)}" data-field="${encodeURIComponent(f)}" onchange="setFollowNAFromInput(this)" ${na?'checked':''}> N/A</label></td>`}).join('')}</tr>`}).join('')||'<tr><td colspan="20" class="empty">No hay resultados.</td></tr>'}
function setFollowFromInput(input){if(!input)return;let cid=input.dataset.cid,f=decodeURIComponent(input.dataset.field||'');setFollow(cid,f,input.value,input)}
function setFollow(cid,f,val,input){if(!cid||!f)return;if(!db.followup[cid])db.followup[cid]={};db.followup[cid][f]=val||'';save();if(input&&input.parentElement&&!followNA(cid,f)){let has=!!val;input.parentElement.classList.toggle('done',has);input.parentElement.classList.toggle('pending',!has);input.parentElement.classList.remove('na')}}
function setFollowNAFromInput(input){if(!input)return;let cid=input.dataset.cid,f=decodeURIComponent(input.dataset.field||'');if(!db.followupNA)db.followupNA={};if(!db.followupNA[cid])db.followupNA[cid]={};db.followupNA[cid][f]=!!input.checked;save();let td=input.closest('.follow-cell'),dateInput=td?.querySelector('input[type=date]');if(dateInput)dateInput.disabled=!!input.checked;if(td){let has=!!(dateInput&&dateInput.value);td.classList.toggle('na',!!input.checked);td.classList.toggle('done',!input.checked&&has);td.classList.toggle('pending',!input.checked&&!has)}}
const SPECIAL_ORANGE=new Set(['Prof. Prácticas','PAC - ILS','Dep. Orientación','Relixión']);
const SPECIAL_PURPLE=new Set(['Días no lectivos']);
const NON_TEACHING_STATES=['Pendiente de envío','Pendiente de aprobación','Aprobado'];
function specialStatus(value){const state=NON_TEACHING_STATES.includes(value)?value:NON_TEACHING_STATES[0];return `<span class="pill ${state===NON_TEACHING_STATES[0]?'bad':state===NON_TEACHING_STATES[1]?'warn':'ok'}">${esc(state)}</span>`}
const SPECIAL_GREEN=new Set(['EscolarizaciónExtraordinarias-B','EscolarizaciónCursoInferior','EOE_At.Dom_Cambio mod_Flexibili','Protocolos_ProcCorrector']);
const SPECIAL_LABELS={
 'Dep. Orientación':'Departamento de orientación',
 'Relixión':'Religión',
 'Prof. Prácticas':'Profesorado en prácticas',
 'PAC - ILS':'Personal auxiliar cuidador',
 'EscolarizaciónExtraordinarias-B':'Escolarizaciones extraordinarias',
 'EscolarizaciónCursoInferior':'Escolarización curso inferior',
 'Protocolos_ProcCorrector':'Protocolos educativos',
 'EOE_At.Dom_Cambio mod_Flexibili':'Atención educativa domiciliaria',
 'Días no lectivos':'Días no lectivos',
 'Actuacións':'Actuaciones (tabla antigua)'
};
const SPECIAL_ORDER=['Prof. Prácticas','PAC - ILS','Dep. Orientación','Relixión','EscolarizaciónExtraordinarias-B','EscolarizaciónCursoInferior','EOE_At.Dom_Cambio mod_Flexibili','Protocolos_ProcCorrector','Días no lectivos'];
function specialLabel(k){return SPECIAL_LABELS[k]||k}
let activeSpecialSection='Prof. Prácticas';
function showSpecialSection(name){
 if(!db.specials?.[name]||name.trim()==='Profesorado-FALTAS')return;
 activeSpecialSection=name;
 document.querySelectorAll('.special-menu .center-menu-button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.special===name)));
 document.querySelectorAll('.special-section').forEach(section=>{section.hidden=section.dataset.special!==name});
 const content=document.getElementById('specialContent');if(content)content.scrollTop=0;
}
function especiales(){
 const entries=Object.entries(db.specials).filter(([name])=>name.trim()!=='Profesorado-FALTAS');
 entries.sort((a,b)=>{let ia=SPECIAL_ORDER.indexOf(a[0]),ib=SPECIAL_ORDER.indexOf(b[0]);ia=ia<0?999:ia;ib=ib<0?999:ib;return ia-ib});
 if(!entries.some(([name])=>name===activeSpecialSection))activeSpecialSection=entries[0]?.[0]||'';
 const menu=entries.map(([name,m],i)=>`<button id="special-menu-${i}" class="center-menu-button ${SPECIAL_ORANGE.has(name)?'special-orange':SPECIAL_GREEN.has(name)?'special-green':SPECIAL_PURPLE.has(name)?'special-purple':''}" type="button" data-special="${esc(name)}" aria-controls="special-panel-${i}" aria-pressed="${name===activeSpecialSection}" onclick='showSpecialSection(${JSON.stringify(name)})'>${esc(specialLabel(name))}<span class="pill">${m.rows.length}</span></button>`).join('');
 const panels=entries.map(([name,m],i)=>`<section id="special-panel-${i}" class="special-section" role="region" aria-labelledby="special-menu-${i}" data-special="${esc(name)}" ${name===activeSpecialSection?'':'hidden'}><div class="special-section-head"><h2>${esc(specialLabel(name))} <span class="pill">${m.rows.length} ${m.rows.length===1?'registro':'registros'}</span></h2><button class="btn small primary" onclick='newSpecialRecord(${JSON.stringify(name)})'>+ Añadir registro</button></div><div class="tablewrap"><table class="table"><thead><tr>${m.headers.map(h=>`<th>${esc(h)}</th>`).join('')}<th>Acciones</th></tr></thead><tbody>${m.rows.slice(0,100).map((r,ri)=>`<tr>${m.headers.map((_,i)=>`<td>${name==='Dep. Orientación'&&ORIENTATION_FIELDS.includes(m.headers[i])&&m.nonOccupied?.[ri]?.[m.headers[i]]&&String(r[i]??'').trim()?`<span class="orientation-cell non-occupied">${esc(r[i])}</span>`:name==='Días no lectivos'&&m.headers[i]==='Estado'?specialStatus(r[i]):name==='Días no lectivos'&&m.headers[i]==='Fecha'?esc(date(r[i])):esc(r[i]??'')}</td>`).join('')}<td><button class="btn small" onclick='editSpecialRecord(${JSON.stringify(name)},${ri})'>Editar</button> <button class="btn small danger" type="button" aria-label="Eliminar registro" title="Eliminar registro" onclick='deleteSpecialRecord(${JSON.stringify(name)},${ri})'>🗑️</button></td></tr>`).join('')||`<tr><td colspan="${Math.max(2,m.headers.length+1)}" class="empty">Sin registros.</td></tr>`}</tbody></table></div></section>`).join('');
 document.getElementById('main').innerHTML=layout('Otros datos','Registros complementarios y otros datos de seguimiento',homeBtn()+`<span class="pill">${entries.length} apartados</span>`)+`<div class="panel center-workspace special-workspace"><nav class="center-menu special-menu" aria-label="Apartados de otros datos">${menu}</nav><div class="center-content" id="specialContent">${panels}</div></div>`;
}
function specialRecordFields(name,m,row,prefix,centerId,rowIndex){
 const center=db.centers.find(c=>c.id===centerId);
 const codeIndex=m.headers.findIndex(h=>String(h||'').trim().toLocaleLowerCase('es')==='codcentro');
 const nameIndex=m.headers.findIndex(h=>String(h||'').trim().toLocaleLowerCase('es')==='centro');
 return m.headers.map((header,i)=>{
  const label=esc(header||('Campo '+(i+1)));
  let value=row?.[i]??'';
  if(center&&(!value)&&(i===codeIndex||i===nameIndex))value=i===codeIndex?center.code:center.name;
  if(i===codeIndex||i===nameIndex){
   const options=db.centers.map(c=>({value:String(i===codeIndex?c.code:c.name),label:c.name}));
   const selected=String(value);
   const legacy=selected&&!options.some(o=>o.value===selected)?`<option value="${esc(selected)}" selected>${esc(selected)} (dato anterior)</option>`:'';
   return `<div class="field ${m.headers.length>6?'':'full'}"><label for="${prefix}${i}">${label}</label><select id="${prefix}${i}" class="select" style="width:100%" onchange="syncSpecialCenter(this,'${prefix}',${codeIndex},${nameIndex})"><option value="" ${selected?'':'selected'}>— Seleccionar centro —</option>${legacy}${options.map(o=>`<option value="${esc(o.value)}" ${o.value===selected?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>`;
  }
  if(name==='Días no lectivos'&&header==='Estado'){return `<div class="field"><label for="${prefix}${i}">${label}</label><select id="${prefix}${i}" class="select" style="width:100%">${NON_TEACHING_STATES.map(state=>`<option value="${esc(state)}" ${state===(value||NON_TEACHING_STATES[0])?'selected':''}>${esc(state)}</option>`).join('')}</select></div>`;}
  if((name==='Días no lectivos'&&header==='Fecha')||(name==='Prof. Prácticas'&&String(header).trim().toLocaleLowerCase('es')==='visita')||(['EscolarizaciónExtraordinarias-B','EscolarizaciónCursoInferior'].includes(name)&&['Fecha sol','Fecha res'].includes(header))){
   const parsed=String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0]||'';
   return `<div class="field ${m.headers.length>6?'':'full'}"><label for="${prefix}${i}">${label}</label><input id="${prefix}${i}" type="date" class="input" style="width:100%" value="${esc(parsed)}"></div>`;
  }
  const mismatch=name==='Dep. Orientación'&&['Tipo','PT','PTC','AL','ALC'].includes(header)?`<label class="catalog-mismatch-check"><input type="checkbox" id="${prefix}mismatch_${header}" ${m.catalogMismatch?.[rowIndex]?.[header]?'checked':''}> No coincide con el catálogo</label>`:'';
  return `<div class="field ${m.headers.length>6?'':'full'}"><label for="${prefix}${i}">${label}</label><input id="${prefix}${i}" class="input" style="width:100%" value="${esc(value)}">${mismatch}</div>`;
 }).join('');
}
function readOrientationMismatch(prefix){return Object.fromEntries(['Tipo','PT','PTC','AL','ALC'].map(field=>[field,!!document.getElementById(prefix+'mismatch_'+field)?.checked]))}
function syncSpecialCenter(select,prefix,codeIndex,nameIndex){
 if(codeIndex<0||nameIndex<0)return;
 const c=db.centers.find(c=>String(c.code)===select.value||c.name===select.value);if(!c)return;
 const code=document.getElementById(prefix+codeIndex),name=document.getElementById(prefix+nameIndex);
 if(code)code.value=String(c.code);if(name)name.value=c.name;
}
function newSpecialRecord(name,centerId){
 const m=db.specials[name];if(!m)return;
 openModal('Añadir registro · '+specialLabel(name),`<div class="formgrid">${specialRecordFields(name,m,null,'sp_',centerId)}</div>`,()=>{
  m.rows.push(m.headers.map((_,i)=>document.getElementById('sp_'+i)?.value||''));
  if(name==='Dep. Orientación'){if(!Array.isArray(m.nonOccupied))m.nonOccupied=[];m.nonOccupied[m.rows.length-1]={};if(!Array.isArray(m.catalogMismatch))m.catalogMismatch=[];m.catalogMismatch[m.rows.length-1]=readOrientationMismatch('sp_');}
  save();closeModal();if(centerId)centerDetail(centerId,'otros');else especiales();
 });
}
function editSpecialRecord(name,rowIndex,centerId){
 const m=db.specials[name];if(!m||!m.rows[rowIndex])return;
 openModal('Editar registro · '+specialLabel(name),`<div class="formgrid">${specialRecordFields(name,m,m.rows[rowIndex],'spe_',centerId,rowIndex)}</div>`,()=>{
  m.rows[rowIndex]=m.headers.map((_,i)=>document.getElementById('spe_'+i)?.value||'');
  if(name==='Dep. Orientación'){if(!Array.isArray(m.catalogMismatch))m.catalogMismatch=[];m.catalogMismatch[rowIndex]=readOrientationMismatch('spe_');}
  save();closeModal();if(centerId)centerDetail(centerId,'otros');else especiales();
 });
}
function deleteSpecialRecord(name,rowIndex){
 const m=db.specials?.[name];if(!m||rowIndex<0||rowIndex>=m.rows.length)return;
 const row=m.rows[rowIndex];
 const summary=row.find(value=>value!==null&&value!==undefined&&String(value).trim())||'sin identificar';
 if(!confirm(`¿Eliminar este registro de «${specialLabel(name)}» (${String(summary).trim()})? Esta acción no se puede deshacer.`))return;
 m.rows.splice(rowIndex,1);if(name==='Dep. Orientación'){if(Array.isArray(m.nonOccupied))m.nonOccupied.splice(rowIndex,1);if(Array.isArray(m.catalogMismatch))m.catalogMismatch.splice(rowIndex,1);}save();especiales();
}
function openModal(title,body,onSave){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;document.getElementById('modal').classList.add('show');document.getElementById('modalSave').textContent='Guardar';document.getElementById('modalSave').onclick=onSave;const mb=document.querySelector('#modal .modalbox');if(mb)mb.scrollTop=0;document.getElementById('modalBody').scrollTop=0}
function closeModal(){document.getElementById('modal').classList.remove('show');if(typeof pdfFormDiscard==='function')pdfFormDiscard()}
function download(blob,name){if(window.__vault)return window.__vault.deliver(blob,name);let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
