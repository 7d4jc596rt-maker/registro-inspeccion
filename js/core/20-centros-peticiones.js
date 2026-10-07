let currentFilteredActions=[];
function finishAction(id){let x=db.actions.find(a=>a.id===id);if(!x)return;x.finalizada=true;x.updatedAt=new Date().toISOString();save();filterActions();}
function deleteAction(id){let x=db.actions.find(a=>a.id===id);if(!x)return;if(!confirm('¿Eliminar esta actuación? Esta acción no se puede deshacer.'))return;db.actions=db.actions.filter(a=>a.id!==id);save();filterActions();imgAfterSave(x.images||[]);}
function finishActionFromHome(id){let x=db.actions.find(a=>a.id===id);if(!x)return;x.finalizada=true;x.updatedAt=new Date().toISOString();save();dashboard();}
function homeBtn(){return `<button class="btn" onclick="nav('dashboard')">← Volver a Inicio</button>`}
let activeCenterTab='datos';
function centerRequestForm(x){return `<div class="formgrid"><div class="field"><label>Tipo</label><input class="input" value="${esc(x.type)}" readonly></div><div class="field"><label>Fecha</label><input id="requestDate" type="date" class="input" value="${esc(x.date||'')}"></div><div class="field full"><label>Asunto</label><input id="requestSubject" class="input" style="width:100%" value="${esc(x.subject||'')}"></div><div class="field full"><label>Detalles</label><textarea id="requestDetails" class="textarea">${esc(x.details||'')}</textarea></div><div class="field full"><label><input id="requestFinished" type="checkbox" ${x.finalizada?'checked':''}> Finalizado</label></div></div>`}
function newCenterRequest(cid,type){
 const c=db.centers.find(x=>x.id===cid);if(!c||!['Petición','Requerimiento'].includes(type))return;
 const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 openModal('Añadir '+type.toLowerCase()+' · '+c.name,centerRequestForm({type,date:today}),()=>{
  db.petitionsRequirements.push({id:uid(),centerId:cid,type,date:document.getElementById('requestDate').value,subject:document.getElementById('requestSubject').value.trim(),details:document.getElementById('requestDetails').value,finalizada:document.getElementById('requestFinished').checked});
  save();closeModal();centerDetail(cid,'peticiones');
 });
}
function editCenterRequest(id,cid){
 const item=db.petitionsRequirements.find(x=>x.id===id&&x.centerId===cid);if(!item)return;
 openModal('Editar '+item.type.toLowerCase(),centerRequestForm(item),()=>{
  Object.assign(item,{date:document.getElementById('requestDate').value,subject:document.getElementById('requestSubject').value.trim(),details:document.getElementById('requestDetails').value,finalizada:document.getElementById('requestFinished').checked});
  save();closeModal();centerDetail(cid,'peticiones');
 });
}
function finishCenterRequest(id,cid){
 const item=db.petitionsRequirements.find(x=>x.id===id&&x.centerId===cid);if(!item)return;
 item.finalizada=true;item.updatedAt=new Date().toISOString();save();centerDetail(cid,'peticiones');
}
function newActionForCenter(id){const c=db.centers.find(x=>x.id===id);if(c)newActionFor(c.name)}
const ORIENTATION_FIELDS=['PT','PTC','AL','ALC'];
function setOrientationNonOccupied(rowIndex,field,input){
 if(!ORIENTATION_FIELDS.includes(field))return;
 const m=db.specials?.['Dep. Orientación'];if(!m||!m.rows[rowIndex])return;
 if(!Array.isArray(m.nonOccupied))m.nonOccupied=[];
 if(!m.nonOccupied[rowIndex])m.nonOccupied[rowIndex]={};
 m.nonOccupied[rowIndex][field]=!!input.checked;save();
 const number=input.closest('p')?.querySelector('.orientation-number');
 if(number)number.classList.toggle('non-occupied',!!input.checked&&number.textContent.trim()!=='—');
}
function centerSpecialCard(c,key,title){
 const m=db.specials?.[key];if(!m)return `<div class="panel"><div class="panelbody">${esc(title)}: sin datos disponibles.</div></div>`;
 const aliases=key==='Prof. Prácticas'&&c.name==='CEIP Alfonso D. Rodríguez Castelao'?['CEIP ADR Castelao']:[];
 const norm=v=>String(v??'').trim().toLocaleLowerCase('es');
 const centerNames=[c.name,...aliases].map(norm);
 const centerColumn=key==='EOE_At.Dom_Cambio mod_Flexibili'?1:0;
 const rows=m.rows.map((row,index)=>({row,index})).filter(({row})=>centerNames.includes(norm(row[centerColumn]))||(key==='Dep. Orientación'&&String(row[0]??'').trim()===String(c.code)));
 if(key==='Días no lectivos'){
  const months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const tiles=rows.map(({row,index})=>{
   const raw=String(row[1]||''),match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
   const month=match?months[Number(match[2])-1]:null;
   const calendar=month?`<time class="non-teaching-date" datetime="${esc(raw)}" aria-label="${esc(date(raw))}"><span class="non-teaching-month">${month}</span><span class="non-teaching-number">${match[3]}</span></time>`:`<span class="non-teaching-date"><span class="non-teaching-month">FECHA</span><span class="non-teaching-number">—</span></span>`;
   return `<div class="non-teaching-day"><button class="non-teaching-edit" type="button" aria-label="Editar día no lectivo ${month?esc(date(raw)):'sin fecha'}" title="Editar día no lectivo" onclick="editSpecialRecord('Días no lectivos',${index},'${c.id}')">${calendar}</button>${specialStatus(row[2])}</div>`;
  }).join('');
  return `<div class="panel center-extra-card special-purple"><div class="panelhead"><h3>${esc(title)} <span class="pill">${rows.length} ${rows.length===1?'registro':'registros'}</span></h3><button class="btn small primary" type="button" onclick="newSpecialRecord('Días no lectivos','${c.id}')">+ Registro</button></div><div class="panelbody"><div class="non-teaching-days">${tiles||'<div class="empty">No hay registros para este centro.</div>'}</div></div></div>`;
 }
 if(key==='Dep. Orientación'){
  const fieldIndex=name=>m.headers.indexOf(name);
  const amount=value=>{const text=String(value??'').trim().replace(',','.');return /^\d+(?:\.\d+)?$/.test(text)?Number(text):0};
  const total=(full,shared)=>rows.reduce((sum,{row})=>sum+amount(row[fieldIndex(full)])+amount(row[fieldIndex(shared)])/2,0);
  const types=[...new Set(rows.flatMap(({row})=>String(row[fieldIndex('Tipo')]??'').toUpperCase().match(/\b(?:DO|OC|CC|OO)\b/g)||[]))];
  const mismatch=fields=>rows.some(({index})=>fields.some(field=>m.catalogMismatch?.[index]?.[field]));
  const tile=(label,value,fields)=>`<button class="orientation-tile ${mismatch(fields)?'catalog-mismatch':''}" type="button" aria-label="Editar ${label} del departamento de orientación" title="Editar ${label}" onclick="editCenterOrientation('${c.id}')"><span class="non-teaching-date"><span class="non-teaching-month">${label}</span><span class="non-teaching-number">${esc(value)}</span></span></button>`;
  const format=value=>Number.isInteger(value)?String(value):String(value).replace('.',',');
  return `<div class="panel center-extra-card special-orange"><div class="panelhead"><h3>${esc(title)} <span class="pill">${rows.length} ${rows.length===1?'registro':'registros'}</span></h3><button class="btn small primary" type="button" onclick="newSpecialRecord('Dep. Orientación','${c.id}')">+ Registro</button></div><div class="panelbody">${rows.length?`<div class="orientation-tiles">${tile('Tipo',types.join(' · ')||'—',['Tipo'])}${tile('PT',format(total('PT','PTC')),['PT','PTC'])}${tile('AL',format(total('AL','ALC')),['AL','ALC'])}</div>`:'<div class="empty">No hay registros para este centro.</div>'}</div></div>`;
 }
 return `<div class="panel center-extra-card ${SPECIAL_ORANGE.has(key)?'special-orange':SPECIAL_GREEN.has(key)?'special-green':SPECIAL_PURPLE.has(key)?'special-purple':''}"><div class="panelhead"><h3>${esc(title)} <span class="pill">${rows.length} ${rows.length===1?'registro':'registros'}</span></h3><button class="btn small primary" type="button" onclick="newSpecialRecord('${key}','${c.id}')">+ Registro</button></div><div class="panelbody">${rows.map(({row,index})=>`<div class="center-extra-entry">${m.headers.map((h,i)=>/^(centro|codcentro)$/i.test(String(h||'').trim())?'':key==='Dep. Orientación'&&ORIENTATION_FIELDS.includes(h)?`<p><strong>${esc(h)}:</strong> <span class="orientation-number ${m.nonOccupied?.[index]?.[h]&&String(row[i]??'').trim()?'non-occupied':''}">${esc(row[i]||'—')}</span><label class="non-occupied-toggle"><input type="checkbox" ${m.nonOccupied?.[index]?.[h]?'checked':''} onchange="setOrientationNonOccupied(${index},'${h}',this)"> No ocupado</label></p>`:row[i]===null||row[i]===undefined||String(row[i]).trim()===''?'':`<p><strong>${esc(h||'Campo '+(i+1))}:</strong> ${esc(row[i])}</p>`).join('')}<button class="btn small" type="button" onclick="editSpecialRecord('${key}',${index},'${c.id}')">Editar</button></div>`).join('')||'<div class="empty">No hay registros para este centro.</div>'}</div></div>`;
}
function editCenterOrientation(centerId){
 const center=db.centers.find(c=>c.id===centerId),m=db.specials?.['Dep. Orientación'];if(!center||!m)return;
 const matches=m.rows.map((row,index)=>({row,index})).filter(({row})=>String(row[0]??'').trim().toLocaleLowerCase('es')===center.name.trim().toLocaleLowerCase('es')||String(row[0]??'').trim()===String(center.code));
 if(matches.length===1){editSpecialRecord('Dep. Orientación',matches[0].index,centerId);return;}
 if(!matches.length)return;
 const body=`<p>Este centro tiene varios registros. Selecciona el que quieres editar:</p><div class="orientation-record-choice">${matches.map(({row,index},i)=>`<button class="btn" type="button" onclick="closeModal();editSpecialRecord('Dep. Orientación',${index},'${centerId}')">Registro ${i+1} · ${esc(row[m.headers.indexOf('Tipo')]||'Sin tipo')}</button>`).join('')}</div>`;
 openModal('Editar departamento de orientación',body,closeModal);
 document.getElementById('modalSave').textContent='Cerrar';
}
function centerFollowupPanel(c){
 let fields=db.followupFields||[],row=db.followup[c.id]||{};
 const documents=`<div class="tablewrap"><table class="table"><thead><tr><th>Centro</th>${fields.map(f=>`<th>${esc(f)}</th>`).join('')}</tr></thead><tbody><tr><td><b>${esc(c.name)}</b></td>${fields.map(f=>{let na=followNA(c.id,f),hasDate=!!iso(row[f]),state=na?'na':(hasDate?'done':'pending');return `<td class="follow-cell ${state}"><input type="date" class="input" style="min-width:120px" value="${esc(iso(row[f]))}" data-cid="${esc(c.id)}" data-field="${encodeURIComponent(f)}" onchange="setFollowFromInput(this)" oninput="setFollowFromInput(this)" ${na?'disabled':''}><label class="na-toggle"><input type="checkbox" data-cid="${esc(c.id)}" data-field="${encodeURIComponent(f)}" onchange="setFollowNAFromInput(this)" ${na?'checked':''}> N/A</label></td>`}).join('')}</tr></tbody></table></div>`;
 const skip=c.sinSeguimiento?`<div class="notice" style="margin-bottom:12px">Este centro está fuera del seguimiento: no aparece en la pantalla general «Seguimiento». <button class="linklike" type="button" onclick="setFollowSkip('${esc(c.id)}',false,true)">Volver a incluirlo</button></div>`:'';
 return `${skip}<div class="toolbar" style="margin-bottom:12px"><button class="btn small" onclick="nav('seguimiento')">Ver seguimiento general</button>${c.sinSeguimiento?'':`<button class="btn small" type="button" onclick="setFollowSkip('${esc(c.id)}',true,true)">Quitar este centro del seguimiento general</button>`}</div><h3>Documentos</h3>${documents}`;
}
function deleteActionFromCenter(aid,cid){let x=db.actions.find(a=>a.id===aid);if(!x)return;if(!confirm('¿Eliminar esta actuación? Esta acción no se puede deshacer.'))return;db.actions=db.actions.filter(a=>a.id!==aid);save();centerDetail(cid);imgAfterSave(x.images||[])}
function finishActionFromCenter(aid,cid){let x=db.actions.find(a=>a.id===aid);if(x){x.finalizada=true;x.updatedAt=new Date().toISOString();save();centerDetail(cid)}}
function newActionFor(center){newAction();setTimeout(()=>{let e=document.getElementById('fcenter');if(e)e.value=center},0)}
