/* =====================================================================
   Versión 4.2 · Módulo «Contactos»
   Personas relacionadas con el trabajo: nombre, teléfono, correo,
   observaciones y etiquetas. Las etiquetas forman un árbol (carpetas y
   subcarpetas) que cuelga de la raíz «Todos los contactos».
   db.contactTags = [{id,name,parent}]   (parent '' = cuelga de la raíz)
   db.contacts    = [{id,name,phone,email,notes,tags:[idEtiqueta],createdAt,updatedAt}]
   ===================================================================== */
const CT_ROOT='Todos los contactos', CT_NONE='__none';
let contactsUi={q:'',tags:[],closed:{},treeOpen:null};
let contactFormTags=[];

/* ---------- Árbol de etiquetas ---------- */
function ctById(id){return db.contactTags.find(t=>t.id===id)||null}
function ctSort(a,b){return String(a.name).localeCompare(String(b.name),'es',{sensitivity:'base',numeric:true})}
function ctChildren(pid){return db.contactTags.filter(t=>(t.parent||'')===(pid||'')).sort(ctSort)}
function ctDesc(id){const out=[id];for(let i=0;i<out.length;i++)db.contactTags.forEach(t=>{if(t.parent===out[i]&&!out.includes(t.id))out.push(t.id)});return out}
function ctPath(id){const p=[];let t=ctById(id),g=0;while(t&&g++<60){p.unshift(t.name);t=t.parent?ctById(t.parent):null}return p.join(' › ')}
function ctFlat(pid='',depth=0,skip=null){let out=[];for(const t of ctChildren(pid)){if(skip&&skip.includes(t.id))continue;out.push({t,depth});out=out.concat(ctFlat(t.id,depth+1,skip))}return out}
/* Corrige datos incoherentes: padres que no existen, ciclos y etiquetas borradas que sigan en algún contacto */
function ctSanitize(){
 const ids=new Set(db.contactTags.map(t=>t.id));
 db.contactTags.forEach(t=>{if(t.parent&&(!ids.has(t.parent)||t.parent===t.id))t.parent='';if(typeof t.name!=='string')t.name=String(t.name??'')});
 db.contactTags.forEach(t=>{let p=t.parent?ctById(t.parent):null,g=0;while(p&&g++<60){if(p.id===t.id){t.parent='';break}p=p.parent?ctById(p.parent):null}});
 db.contacts.forEach(c=>{c.tags=Array.isArray(c.tags)?[...new Set(c.tags.filter(id=>ids.has(id)))]:[]});
}
function ctCount(id){
 if(id===CT_NONE)return db.contacts.filter(c=>!(c.tags||[]).length).length;
 const d=ctDesc(id);return db.contacts.filter(c=>(c.tags||[]).some(x=>d.includes(x))).length;
}

/* ---------- Filtro ---------- */
function ctSearchText(c){return normTxt([c.name,c.phone,String(c.phone||'').replace(/\D/g,''),c.email,c.notes,...(c.tags||[]).map(ctPath)].join(' '))}
function ctMatch(c){
 const words=normTxt(contactsUi.q).split(/\s+/).filter(Boolean);
 if(words.length){const hay=ctSearchText(c);if(!words.every(w=>hay.includes(w)))return false}
 for(const tag of contactsUi.tags){
  if(tag===CT_NONE){if((c.tags||[]).length)return false;continue}
  const d=ctDesc(tag);if(!(c.tags||[]).some(x=>d.includes(x)))return false;
 }
 return true;
}
function ctToggleTag(id){
 const i=contactsUi.tags.indexOf(id);
 if(i>=0)contactsUi.tags.splice(i,1);
 else{if(id===CT_NONE)contactsUi.tags=[CT_NONE];else contactsUi.tags=contactsUi.tags.filter(t=>t!==CT_NONE).concat(id)}
 ctRenderTree();ctRenderList();
}
function ctClearTags(){contactsUi.tags=[];ctRenderTree();ctRenderList()}
function ctClearFilters(){contactsUi.q='';contactsUi.tags=[];const i=document.getElementById('ctSearch');if(i)i.value='';ctRenderTree();ctRenderList()}
function ctFilterOnly(id){contactsUi.tags=[id];ctRenderTree();ctRenderList()}
function ctToggleNode(id){contactsUi.closed[id]=!contactsUi.closed[id];ctRenderTree()}

/* ---------- Pantalla ---------- */
function ctPhonesHTML(v){
 const s=String(v||'').trim();if(!s)return '';
 return s.split(/\s*(?:[\/;,]|\s-\s)\s*/).filter(Boolean).map(p=>{const tel=p.replace(/[^\d+]/g,'');return tel.replace(/\D/g,'').length>=6?`<a href="tel:${esc(tel)}">${esc(p)}</a>`:esc(p)}).join(' · ');
}
function ctMailHTML(v){const s=String(v||'').trim();if(!s)return '';return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(s)?`<a href="mailto:${esc(s)}">${esc(s)}</a>`:esc(s)}
function ctNodeHTML(t,depth){
 const kids=ctChildren(t.id),on=contactsUi.tags.includes(t.id),closed=!!contactsUi.closed[t.id],n=ctCount(t.id);
 return `<li role="none"><div class="ct-node${on?' on':''}" style="--d:${depth}">
  ${kids.length?`<button type="button" class="ct-toggle" aria-label="${closed?'Desplegar':'Contraer'} ${esc(t.name)}" aria-expanded="${!closed}" onclick="ctToggleNode('${t.id}')">${closed?'▸':'▾'}</button>`:'<span class="ct-toggle" aria-hidden="true"></span>'}
  <button type="button" class="ct-name" role="treeitem" aria-pressed="${on}" title="${esc(ctPath(t.id))}" onclick="ctToggleTag('${t.id}')">${esc(t.name)}</button>
  <span class="ct-acts"><button type="button" title="Añadir una subetiqueta dentro de «${esc(t.name)}»" aria-label="Añadir una subetiqueta dentro de ${esc(t.name)}" onclick="newContactTag('${t.id}')">+</button><button type="button" title="Renombrar o mover" aria-label="Renombrar o mover ${esc(t.name)}" onclick="editContactTag('${t.id}')">✎</button><button type="button" title="Eliminar la etiqueta" aria-label="Eliminar la etiqueta ${esc(t.name)}" onclick="deleteContactTag('${t.id}')">🗑</button></span>
  <span class="ct-n">${n}</span></div>
  ${kids.length&&!closed?`<ul role="group">${kids.map(k=>ctNodeHTML(k,depth+1)).join('')}</ul>`:''}</li>`;
}
function ctRenderTree(){
 const box=document.getElementById('ctTree');if(!box)return;
 const none=ctCount(CT_NONE),anyOn=contactsUi.tags.length>0;
 box.innerHTML=`<ul class="ct-nodes" role="tree" aria-label="Etiquetas de contactos">
  <li role="none"><div class="ct-node root${anyOn?'':' on'}" style="--d:0"><span class="ct-toggle" aria-hidden="true"></span><button type="button" class="ct-name" role="treeitem" aria-pressed="${!anyOn}" onclick="ctClearTags()">${CT_ROOT}</button><span class="ct-acts always"><button type="button" title="Añadir una etiqueta" aria-label="Añadir una etiqueta" onclick="newContactTag('')">+</button></span><span class="ct-n">${db.contacts.length}</span></div>
   <ul role="group">${ctChildren('').map(t=>ctNodeHTML(t,1)).join('')}${none&&db.contactTags.length?`<li role="none"><div class="ct-node none${contactsUi.tags.includes(CT_NONE)?' on':''}" style="--d:1"><span class="ct-toggle" aria-hidden="true"></span><button type="button" class="ct-name" role="treeitem" aria-pressed="${contactsUi.tags.includes(CT_NONE)}" onclick="ctToggleTag('${CT_NONE}')">Sin etiqueta</button><span class="ct-n">${none}</span></div></li>`:''}</ul></li></ul>
  ${db.contactTags.length?'':'<p class="muted ct-hint">Todavía no hay etiquetas. Pulsa «+» para crear la primera; después podrás crear otras dentro de ella, como carpetas y subcarpetas.</p>'}`;
 const sum=document.getElementById('ctTreeSum');if(sum)sum.textContent=anyOn?`Etiquetas · ${contactsUi.tags.length} ${contactsUi.tags.length===1?'activa':'activas'}`:'Etiquetas';
}
function ctCardHTML(c){
 const tags=(c.tags||[]).map(id=>ctById(id)).filter(Boolean).sort((a,b)=>ctPath(a.id).localeCompare(ctPath(b.id),'es'));
 const phone=ctPhonesHTML(c.phone),mail=ctMailHTML(c.email);
 return `<article class="ct-card"><button type="button" class="subject-link ct-title" onclick="editContact('${c.id}')">${esc(c.name||'(sin nombre)')}</button>
  ${phone?`<div class="ct-line"><span class="ct-ico" aria-hidden="true">☎&#xFE0E;</span><span>${phone}</span></div>`:''}
  ${mail?`<div class="ct-line"><span class="ct-ico" aria-hidden="true">✉&#xFE0E;</span><span>${mail}</span></div>`:''}
  ${tags.length?`<div class="tagcloud ct-tags">${tags.map(t=>`<button type="button" class="tagchip mini" title="Filtrar por «${esc(ctPath(t.id))}»" onclick="ctFilterOnly('${t.id}')">${esc(ctPath(t.id))}</button>`).join('')}</div>`:''}
  ${c.notes?`<div class="ct-notes">${esc(c.notes)}</div>`:''}</article>`;
}
function ctRenderList(){
 const box=document.getElementById('ctList');if(!box)return;
 const list=db.contacts.filter(ctMatch).sort(ctSort);
 const filtered=!!(contactsUi.q.trim()||contactsUi.tags.length);
 const chips=contactsUi.tags.map(id=>`<button type="button" class="tagchip on" title="Quitar este filtro" onclick="ctToggleTag('${id}')">${esc(id===CT_NONE?'Sin etiqueta':ctPath(id))} ×</button>`).join('');
 const info=document.getElementById('ctInfo');
 if(info)info.innerHTML=`<span>${list.length} ${list.length===1?'contacto':'contactos'}${filtered?` de ${db.contacts.length}`:''}</span>${chips}${contactsUi.tags.length>1?'<span class="muted">Se muestran los que tienen todas las etiquetas marcadas.</span>':''}${filtered?'<button type="button" class="linklike" onclick="ctClearFilters()">Quitar filtros</button>':''}`;
 box.innerHTML=list.map(ctCardHTML).join('')||`<div class="empty">${db.contacts.length?'Ningún contacto coincide con el filtro.':'Todavía no hay contactos. Pulsa «+ Nuevo contacto» para añadir el primero.'}</div>`;
}
function contactos(){
 ctSanitize();
 contactsUi.tags=contactsUi.tags.filter(id=>id===CT_NONE||ctById(id));
 const wide=window.innerWidth>900,open=wide||contactsUi.treeOpen===true||(contactsUi.treeOpen===null&&contactsUi.tags.length>0);
 document.getElementById('main').innerHTML=layout('Contactos','Personas relacionadas con el trabajo, organizadas por etiquetas',homeBtn()+`<button class="btn" onclick="newContactTag('')">+ Etiqueta</button><button class="btn primary" onclick="newContact()">+ Nuevo contacto</button>`)+
 `<div class="panel ct-workspace">
   <details class="ct-side" ${open?'open':''} ontoggle="contactsUi.treeOpen=this.open"><summary id="ctTreeSum">Etiquetas</summary><div id="ctTree"></div></details>
   <div class="ct-main">
    <div class="toolbar"><input id="ctSearch" class="input" type="search" placeholder="Buscar por nombre, teléfono, correo u observaciones…" aria-label="Buscar contactos" value="${esc(contactsUi.q)}" oninput="contactsUi.q=this.value;ctRenderList()"></div>
    <div id="ctInfo" class="ct-info" role="status"></div>
    <div id="ctList" class="ct-list"></div>
   </div>
  </div>`;
 ctRenderTree();ctRenderList();
}

/* ---------- Etiquetas: crear, renombrar, mover y eliminar ---------- */
function ctParentOptions(sel,skip){
 return `<option value="" ${sel?'':'selected'}>${CT_ROOT} (raíz)</option>`+ctFlat('',0,skip).map(({t,depth})=>`<option value="${t.id}" ${t.id===sel?'selected':''}>${'   '.repeat(depth+1)}${esc(t.name)}</option>`).join('');
}
function ctTagForm(t,parent,skip){
 return `<div class="formgrid"><div class="field full"><label for="ctgName">Nombre de la etiqueta</label><input id="ctgName" class="input" style="width:100%" maxlength="60" value="${esc(t?t.name:'')}"></div>
  <div class="field full"><label for="ctgParent">Dentro de</label><select id="ctgParent" class="select" style="width:100%">${ctParentOptions(parent,skip)}</select></div></div>
  <p class="muted" style="font-size:12px">Las etiquetas funcionan como carpetas y subcarpetas. Al filtrar por una etiqueta se muestran también los contactos de las que tiene dentro.</p>`;
}
function ctReadTagForm(selfId){
 const name=document.getElementById('ctgName').value.replace(/\s+/g,' ').trim(),parent=document.getElementById('ctgParent').value;
 if(!name){alert('Escribe el nombre de la etiqueta.');document.getElementById('ctgName').focus();return null}
 if(db.contactTags.some(x=>x.id!==selfId&&(x.parent||'')===parent&&normTxt(x.name)===normTxt(name))){alert('Ya existe una etiqueta con ese nombre en ese mismo lugar.');return null}
 return {name,parent};
}
function ctAfterTagChange(){
 if(document.getElementById('ctTree')){ctRenderTree();ctRenderList()}
}
function newContactTag(parent){
 openModal('Nueva etiqueta',ctTagForm(null,parent&&ctById(parent)?parent:'',null),()=>{
  const d=ctReadTagForm('');if(!d)return;
  db.contactTags.push({id:uid(),name:d.name,parent:d.parent});
  if(d.parent)contactsUi.closed[d.parent]=false;
  save();closeModal();ctAfterTagChange();
 });
 setTimeout(()=>document.getElementById('ctgName')?.focus(),50);
}
function editContactTag(id){
 const t=ctById(id);if(!t)return;
 openModal('Etiqueta',ctTagForm(t,t.parent||'',ctDesc(id)),()=>{
  const d=ctReadTagForm(id);if(!d)return;
  t.name=d.name;t.parent=d.parent;
  save();closeModal();ctAfterTagChange();
 });
}
function deleteContactTag(id){
 const t=ctById(id);if(!t)return;
 const kids=db.contactTags.filter(x=>x.parent===id),used=db.contacts.filter(c=>(c.tags||[]).includes(id)),up=t.parent?ctById(t.parent):null;
 const msg=[`¿Eliminar la etiqueta «${t.name}»?`];
 if(kids.length)msg.push(`Sus ${kids.length===1?'subetiqueta pasará':kids.length+' subetiquetas pasarán'} a «${up?up.name:CT_ROOT}».`);
 if(used.length)msg.push(up?`${used.length===1?'El contacto que la tiene pasará':'Los '+used.length+' contactos que la tienen pasarán'} a «${up.name}».`:`${used.length===1?'El contacto que la tiene se quedará':'Los '+used.length+' contactos que la tienen se quedarán'} sin ella.`);
 msg.push('No se elimina ningún contacto.');
 if(!confirm(msg.join('\n')))return;
 kids.forEach(k=>{k.parent=t.parent||''});
 used.forEach(c=>{c.tags=[...new Set(c.tags.map(x=>x===id?(up?up.id:null):x).filter(Boolean))]});
 db.contactTags=db.contactTags.filter(x=>x.id!==id);
 contactsUi.tags=contactsUi.tags.filter(x=>x!==id);
 save();ctAfterTagChange();
}

/* ---------- Contactos: crear, editar y eliminar ---------- */
function ctRenderFormTags(){
 const box=document.getElementById('ctfTags');if(!box)return;
 box.innerHTML=ctFlat().map(({t,depth})=>`<label class="ct-check" style="--d:${depth}"><input type="checkbox" value="${t.id}" ${contactFormTags.includes(t.id)?'checked':''} onchange="ctFormTagToggle('${t.id}',this.checked)"> <span>${esc(t.name)}</span></label>`).join('')||'<p class="muted" style="font-size:12px;margin:4px">Todavía no hay etiquetas. Crea la primera aquí abajo.</p>';
 const sel=document.getElementById('ctfNewParent');if(sel){const v=sel.value;sel.innerHTML=ctParentOptions(ctById(v)?v:'',null)}
}
function ctFormTagToggle(id,on){contactFormTags=contactFormTags.filter(x=>x!==id);if(on)contactFormTags.push(id)}
function ctFormAddTag(){
 const inp=document.getElementById('ctfNewName'),parent=document.getElementById('ctfNewParent').value,name=inp.value.replace(/\s+/g,' ').trim();
 if(!name){inp.focus();return}
 let t=db.contactTags.find(x=>(x.parent||'')===parent&&normTxt(x.name)===normTxt(name));
 if(!t){t={id:uid(),name,parent};db.contactTags.push(t);save()}
 if(!contactFormTags.includes(t.id))contactFormTags.push(t.id);
 inp.value='';ctRenderFormTags();
}
function contactForm(c={}){
 contactFormTags=[...(c.tags||[])].filter(id=>ctById(id));
 const meta=c.id?`<div class="meta-line">Registrado: ${c.createdAt?dateTime(c.createdAt):'sin dato'} · Última modificación: ${c.updatedAt?dateTime(c.updatedAt):'sin cambios'}</div>`:'';
 return `${meta}<div class="formgrid" style="margin-top:12px">
  <div class="field full"><label for="ctfName">Nombre</label><input id="ctfName" class="input" style="width:100%" autocomplete="off" value="${esc(c.name)}"></div>
  <div class="field"><label for="ctfPhone">Teléfono</label><input id="ctfPhone" class="input" style="width:100%" type="tel" autocomplete="off" placeholder="Si hay varios, sepáralos con /" value="${esc(c.phone)}"></div>
  <div class="field"><label for="ctfEmail">Correo electrónico</label><input id="ctfEmail" class="input" style="width:100%" type="email" autocomplete="off" value="${esc(c.email)}"></div>
  <div class="field full"><label>Etiquetas</label><div id="ctfTags" class="ct-checks"></div>
   <div class="ct-newtag"><input id="ctfNewName" class="input" maxlength="60" placeholder="Nueva etiqueta" aria-label="Nombre de la nueva etiqueta" onkeydown="if(event.key==='Enter'){event.preventDefault();ctFormAddTag()}"><select id="ctfNewParent" class="select" aria-label="Dentro de"></select><button type="button" class="btn" onclick="ctFormAddTag()">Crear y marcar</button></div></div>
  <div class="field full"><label for="ctfNotes">Observaciones</label><textarea id="ctfNotes" class="textarea">${esc(c.notes)}</textarea></div>
  ${c.id?`<div class="field full"><button type="button" class="btn danger" onclick="deleteContact('${c.id}')">Eliminar contacto…</button></div>`:''}
 </div>`;
}
function readContactForm(){
 const v=id=>document.getElementById(id).value.trim();
 const name=v('ctfName').replace(/\s+/g,' ');
 if(!name){alert('Escribe el nombre del contacto.');document.getElementById('ctfName').focus();return null}
 if(document.getElementById('ctfNewName').value.trim())ctFormAddTag();
 return {name,phone:v('ctfPhone'),email:v('ctfEmail'),notes:document.getElementById('ctfNotes').value.replace(/\s+$/,''),tags:contactFormTags.filter(id=>ctById(id))};
}
function ctAfterContactChange(){if(document.getElementById('ctTree')){ctRenderTree();ctRenderList()}else nav('contactos')}
function newContact(){
 const preset=contactsUi.tags.filter(id=>id!==CT_NONE&&ctById(id));
 openModal('Nuevo contacto',contactForm({tags:preset}),()=>{
  const d=readContactForm();if(!d)return;
  db.contacts.push({id:uid(),createdAt:nowIso(),updatedAt:'',...d});
  save();closeModal();ctAfterContactChange();
 });
 ctRenderFormTags();
 setTimeout(()=>document.getElementById('ctfName')?.focus(),50);
}
function editContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;
 openModal('Contacto',contactForm(c),()=>{
  const d=readContactForm();if(!d)return;
  Object.assign(c,d,{updatedAt:nowIso()});
  save();closeModal();ctAfterContactChange();
 });
 ctRenderFormTags();
}
function deleteContact(id){
 const c=db.contacts.find(x=>x.id===id);if(!c)return;
 if(!confirm(`¿Eliminar el contacto «${c.name}»? Esta acción no se puede deshacer.`))return;
 db.contacts=db.contacts.filter(x=>x.id!==id);
 save();closeModal();ctAfterContactChange();
}

/* ---------- Exportación ---------- */
function exportContactsCSV(){
 const rows=[['Nombre','Teléfono','Correo electrónico','Etiquetas','Observaciones'],...[...db.contacts].sort(ctSort).map(c=>[c.name,c.phone,c.email,(c.tags||[]).map(ctPath).filter(Boolean).join(' | '),c.notes])];
 download(csvBlob(rows),'contactos.csv');
}
