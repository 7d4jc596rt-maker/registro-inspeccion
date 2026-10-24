/* Versión 4.11 · «Tabla correos»
   Tabla con el nombre de cada centro y su correo principal, para seleccionar varios
   correos, copiarlos y pegarlos como destinatarios de un correo electrónico.
   Filtro por tipo de centro (se pueden marcar varios tipos a la vez). */
let mailSel=new Set(), mailTipos=new Set(), mailSep='; ';
function mailCenters(){return db.centers.filter(c=>!mailTipos.size||mailTipos.has(c.tipo||'Sin tipo')).sort((a,b)=>a.name.localeCompare(b.name,'es'))}
function tablaCorreos(){
 const tipos=[...new Set(db.centers.map(c=>c.tipo||'Sin tipo'))].sort((a,b)=>a==='Sin tipo'?1:b==='Sin tipo'?-1:a.localeCompare(b,'es'));
 [...mailTipos].forEach(t=>{if(!tipos.includes(t))mailTipos.delete(t)});
 const valid=new Set(db.centers.filter(c=>String(c.email||'').trim()).map(c=>c.id));[...mailSel].forEach(id=>{if(!valid.has(id))mailSel.delete(id)});
 document.getElementById('main').innerHTML=layout('Tabla correos','Correo principal de cada centro. Marca los que necesites y pulsa «Copiar correos».',`<button class="btn" onclick="centros()">← Volver a Centros</button>`)+
 `<div class="mail-filter" role="group" aria-label="Filtrar por tipo de centro"><span class="mail-filter-label">Tipo de centro</span><button type="button" class="chip" data-tipo="" aria-pressed="${!mailTipos.size}" onclick="mailToggleTipo('')">Todos</button>${tipos.map(t=>`<button type="button" class="chip" data-tipo="${esc(t)}" aria-pressed="${mailTipos.has(t)}" onclick="mailToggleTipo(this.dataset.tipo)">${esc(t)}</button>`).join('')}</div>
 <div class="mail-bar"><button type="button" class="btn primary" id="mailCopyBtn" onclick="mailCopy()">Copiar correos</button><button type="button" class="btn" onclick="mailSelectAll(true)">Marcar todos los visibles</button><button type="button" class="btn" onclick="mailSelectAll(false)">Desmarcar todos</button><label class="mail-sep">Separador <select class="select" id="mailSep" onchange="mailSep=this.value;mailOut()"><option value="; " ${mailSep==='; '?'selected':''}>punto y coma ( ; )</option><option value=", " ${mailSep===', '?'selected':''}>coma ( , )</option></select></label><span id="mailCount" class="pill"></span></div>
 <div class="panel"><div class="tablewrap mail-wrap"><table class="table mail-table"><thead><tr><th class="mail-chk"><input type="checkbox" id="mailAll" aria-label="Marcar o desmarcar todos los visibles" onchange="mailSelectAll(this.checked)"></th><th>Centro</th><th>Correo electrónico</th></tr></thead><tbody id="mailRows"></tbody></table></div></div>
 <div class="field"><label for="mailOutBox">Correos seleccionados (también puedes copiarlos desde aquí)</label><textarea id="mailOutBox" class="textarea mail-out" readonly onfocus="this.select()"></textarea></div>`;
 mailRender();
}
function mailToggleTipo(t){
 if(!t)mailTipos.clear();else if(mailTipos.has(t))mailTipos.delete(t);else mailTipos.add(t);
 document.querySelectorAll('.mail-filter .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tipo?mailTipos.has(b.dataset.tipo):!mailTipos.size)));
 mailRender();
}
function mailRender(){
 const cs=mailCenters();
 document.getElementById('mailRows').innerHTML=cs.map(c=>{
  const m=String(c.email||'').trim(),on=mailSel.has(c.id);
  return `<tr class="mail-row${m?'':' no-mail'}${on?' sel':''}" ${m?`onclick="if(event.target.tagName!=='INPUT')mailToggle('${c.id}')"`:''}><td class="mail-chk"><input type="checkbox" ${on?'checked':''} ${m?'':'disabled'} aria-label="Seleccionar ${esc(c.name)}" onchange="mailToggle('${c.id}',this.checked)"></td><td><b>${esc(c.name)}</b>${c.tipo?'':' <span class="muted">· sin tipo</span>'}</td><td class="mail-addr">${m?esc(m):'<span class="muted">Sin correo registrado</span>'}</td></tr>`}).join('')||'<tr><td colspan="3" class="empty">No hay centros de ese tipo.</td></tr>';
 mailOut();
}
function mailToggle(id,val){
 const on=val===undefined?!mailSel.has(id):val;on?mailSel.add(id):mailSel.delete(id);
 const tr=[...document.querySelectorAll('#mailRows tr')].find(r=>r.querySelector(`input[onchange*="'${id}'"]`));
 if(tr){tr.classList.toggle('sel',on);tr.querySelector('input').checked=on}
 mailOut();
}
function mailSelectAll(on){mailCenters().filter(c=>String(c.email||'').trim()).forEach(c=>on?mailSel.add(c.id):mailSel.delete(c.id));mailRender()}
/* Solo se copian los seleccionados que están visibles con el filtro actual */
function mailList(){return mailCenters().filter(c=>mailSel.has(c.id)).map(c=>String(c.email).trim()).filter(Boolean)}
function mailOut(){
 const vis=mailCenters().filter(c=>String(c.email||'').trim()),list=mailList();
 const box=document.getElementById('mailOutBox');if(box)box.value=[...new Set(list)].join(mailSep);
 const cnt=document.getElementById('mailCount');if(cnt)cnt.textContent=`${list.length} de ${vis.length} seleccionados`;
 const all=document.getElementById('mailAll');if(all){all.checked=!!vis.length&&list.length===vis.length;all.indeterminate=!!list.length&&list.length<vis.length}
 const b=document.getElementById('mailCopyBtn');if(b)b.disabled=!list.length;
}
async function mailCopy(){
 const txt=document.getElementById('mailOutBox').value;if(!txt)return;
 let ok=false;
 try{await navigator.clipboard.writeText(txt);ok=true}catch(e){}
 if(!ok){const box=document.getElementById('mailOutBox');box.focus();box.select();box.setSelectionRange(0,txt.length);try{ok=document.execCommand('copy')}catch(e){}}
 const b=document.getElementById('mailCopyBtn');
 if(ok){const n=mailList().length;b.textContent=`✓ ${n} ${n===1?'correo copiado':'correos copiados'}`;setTimeout(()=>{if(b.isConnected)b.textContent='Copiar correos'},2500)}
 else alert('No se ha podido copiar automáticamente. Los correos están seleccionados en el cuadro de abajo: cópialos con Ctrl+C (Windows), Cmd+C (Mac) o «Copiar» (iPhone).');
}
