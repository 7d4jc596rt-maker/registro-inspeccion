/* ======================= VERSIÓN 4.16: OTROS DATOS DEL CENTRO =======================
   1. «Personal auxiliar cuidador» (tabla 'PAC - ILS'): sin el nombre del cuidador ni el campo «Compartido».
      Columnas: CENTRO · Nº cuidadores · Cuidadores (resumen) · Nº alumnos · Horario.
      Cada registro guarda además, en m.cuidadores[fila], la lista de cuidadores: [{compartido,centro}].
      Los datos anteriores se conservan en m.legacyV416 dentro del archivo cifrado.
   2. «Alumnado en combinada» (tabla 'Combinada'): alumno, curso, informe del EOE (Sí/No),
      situación (En combinada / A la espera de plaza) y nombre del CEE.
   3. «Adaptaciones curriculares»: nº de AC en Infantil, Primaria y ESO, en la ficha del centro (c.adaptaciones).
   ===================================================================================== */
const PAC_KEY='PAC - ILS';
const PAC_HEADERS=['CENTRO','Nº cuidadores','Cuidadores','Nº alumnos','Horario'];
const COMB_KEY='Combinada';
const COMB_HEADERS=['CENTRO','Nombre del alumno','Curso','Informe del EOE','Situación','Nombre del CEE'];
const COMB_SITUACIONES=['En combinada','A la espera de plaza'];
const AC_FIELDS=[['infantil','Infantil'],['primaria','Primaria'],['eso','ESO']];

SPECIAL_LABELS[COMB_KEY]='Alumnado en combinada';
SPECIAL_GREEN.add(COMB_KEY);
SPECIAL_ORDER.splice(SPECIAL_ORDER.indexOf('EOE_At.Dom_Cambio mod_Flexibili')+1,0,COMB_KEY);

function migrateV416(){
 const S=db.specials;if(!S)return;
 if(!S[COMB_KEY])S[COMB_KEY]={headers:[...COMB_HEADERS],rows:[]};
 let pac=S[PAC_KEY];
 if(!pac){S[PAC_KEY]=pac={headers:[...PAC_HEADERS],rows:[],cuidadores:[]};}
 if(Array.isArray(pac.headers)&&pac.headers.join('|')!==PAC_HEADERS.join('|')&&!pac.headers.includes('Nº cuidadores')){
  const ix=h=>pac.headers.indexOf(h);
  const iC=Math.max(0,ix('CENTRO')),iN=ix('Auxiliar cuidador')>=0?ix('Auxiliar cuidador'):ix('PAC'),iA=ix('Alumnado'),iS=ix('Compartido'),iD=ix('Días asistencia');
  pac.legacyV416={headers:[...pac.headers],rows:pac.rows.map(r=>[...r])};
  const cares=[];
  pac.rows=pac.rows.map(r=>{
   const get=i=>i>=0?String(r[i]??'').trim():'';
   const names=get(iN).split(/\s*(?:[,;\/\n+]|\s+y\s+|\s+e\s+)\s*/i).filter(Boolean);
   const sh=get(iS),no=!sh||/^(no|non|n|-|—)$/i.test(sh),yes=/^(s[ií]|s|x|yes|compartido)$/i.test(sh);
   const list=names.map(()=>({compartido:!no,centro:(!no&&!yes)?sh.replace(/^s[ií][\s,:.-]*(con\s+)?/i,''):''}));
   cares.push(list);
   return [r[iC]??'',list.length?String(list.length):'',pacSummary(list),get(iA),get(iD)];
  });
  pac.headers=[...PAC_HEADERS];pac.cuidadores=cares;
 }
 if(!Array.isArray(pac.cuidadores))pac.cuidadores=[];
}
function pacSummary(list){
 return (list||[]).map((x,i)=>`Cuidador ${i+1}: ${x.compartido?'compartido'+(x.centro?' con '+x.centro:''):'no compartido'}`).join(' · ');
}

/* ---------- Formulario de «Personal auxiliar cuidador» ---------- */
let pacFormList=[];
function pacCarersHTML(){
 return pacFormList.map((x,i)=>`<div class="pac-row"><b>Cuidador ${i+1}</b><label><input type="checkbox" ${x.compartido?'checked':''} onchange="pacFormList[${i}].compartido=this.checked;document.getElementById('pacShared${i}').disabled=!this.checked;if(this.checked)document.getElementById('pacShared${i}').focus()"> Compartido</label><input id="pacShared${i}" class="input" list="pacCenters" placeholder="Centro con el que lo comparte" aria-label="Centro con el que comparte el cuidador ${i+1}" value="${esc(x.centro||'')}" ${x.compartido?'':'disabled'} oninput="pacFormList[${i}].centro=this.value"></div>`).join('')||'<p class="muted" style="font-size:12px;margin:0">Indica el número de cuidadores para registrar si cada uno es compartido.</p>';
}
function pacSetCount(v){
 const n=Math.max(0,Math.min(30,parseInt(v,10)||0));
 while(pacFormList.length<n)pacFormList.push({compartido:false,centro:''});
 pacFormList.length=n;
 document.getElementById('pacCarers').innerHTML=pacCarersHTML();
}
function pacEdit(rowIndex,centerId){
 const m=db.specials[PAC_KEY];if(!m)return;
 const isNew=rowIndex===null||rowIndex===undefined;
 const row=isNew?null:m.rows[rowIndex];if(!isNew&&!row)return;
 const center=db.centers.find(c=>c.id===centerId);
 const cur=row?String(row[0]??''):(center?.name||'');
 pacFormList=isNew?[]:JSON.parse(JSON.stringify(m.cuidadores?.[rowIndex]||[]));
 const n=row?(parseInt(row[1],10)||pacFormList.length):0;
 while(pacFormList.length<n)pacFormList.push({compartido:false,centro:''});
 const legacy=cur&&!db.centers.some(c=>c.name===cur)?`<option value="${esc(cur)}" selected>${esc(cur)} (dato anterior)</option>`:'';
 const body=`<div class="formgrid"><div class="field full"><label for="pacCenter">Centro</label><select id="pacCenter" class="select" style="width:100%"><option value="">— Seleccionar centro —</option>${legacy}${db.centers.map(c=>`<option value="${esc(c.name)}" ${c.name===cur?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="pacCount">Nº de cuidadores</label><input id="pacCount" type="number" min="0" max="30" class="input" style="width:100%" value="${n||''}" oninput="pacSetCount(this.value)"></div>
  <div class="field"><label for="pacAlumnos">Nº alumnos</label><input id="pacAlumnos" type="text" inputmode="numeric" class="input" style="width:100%" value="${esc(row?.[3]??'')}"></div>
  <div class="field full"><label>Cuidadores</label><div id="pacCarers" class="pac-list">${pacCarersHTML()}</div><datalist id="pacCenters">${db.centers.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist></div>
  <div class="field full"><label for="pacHorario">Horario</label><textarea id="pacHorario" class="textarea" rows="3">${esc(row?.[4]??'')}</textarea></div></div>`;
 openModal((isNew?'Añadir registro':'Editar registro')+' · Personal auxiliar cuidador',body,()=>{
  const list=pacFormList.map(x=>({compartido:!!x.compartido,centro:x.compartido?String(x.centro||'').trim():''}));
  const out=[document.getElementById('pacCenter').value,list.length?String(list.length):'',pacSummary(list),document.getElementById('pacAlumnos').value.trim(),document.getElementById('pacHorario').value.trim()];
  if(!Array.isArray(m.cuidadores))m.cuidadores=[];
  if(isNew){m.rows.push(out);m.cuidadores[m.rows.length-1]=list}else{m.rows[rowIndex]=out;m.cuidadores[rowIndex]=list}
  save();closeModal();if(centerId)centerDetail(centerId,'otros');else especiales();
 });
}
function pacCenterCard(c){
 const m=db.specials?.[PAC_KEY];if(!m)return '';
 const norm=v=>String(v??'').trim().toLocaleLowerCase('es');
 const rows=m.rows.map((row,index)=>({row,index})).filter(({row})=>norm(row[0])===norm(c.name));
 const entry=({row,index})=>{
  const list=m.cuidadores?.[index]||[];
  const carers=list.map((x,i)=>`<p class="pac-carer">Cuidador ${i+1}${x.compartido?`<span class="pill warn">Compartido${x.centro?' con '+esc(x.centro):''}</span>`:'<span class="pill ok">No compartido</span>'}</p>`).join('');
  return `<div class="center-extra-entry"><p><strong>Nº cuidadores:</strong> ${esc(row[1]||'—')}</p>${carers}<p><strong>Nº alumnos:</strong> ${esc(row[3]||'—')}</p><p><strong>Horario:</strong> ${row[4]?esc(row[4]).replace(/\n/g,'<br>'):'—'}</p><button class="btn small" type="button" onclick="editSpecialRecord('${PAC_KEY}',${index},'${c.id}')">Editar</button></div>`;
 };
 return `<div class="panel center-extra-card special-orange"><div class="panelhead"><h3>Personal auxiliar cuidador <span class="pill">${rows.length} ${rows.length===1?'registro':'registros'}</span></h3><button class="btn small primary" type="button" onclick="newSpecialRecord('${PAC_KEY}','${c.id}')">+ Registro</button></div><div class="panelbody">${rows.map(entry).join('')||'<div class="empty">No hay registros para este centro.</div>'}</div></div>`;
}

/* ---------- Adaptaciones curriculares ---------- */
function acCenterCard(c){
 const d=(c.adaptaciones&&typeof c.adaptaciones==='object')?c.adaptaciones:{};
 const has=AC_FIELDS.some(([k])=>String(d[k]??'').trim()!=='');
 const num=v=>{const t=String(v??'').trim();return /^\d+$/.test(t)?Number(t):0};
 const total=AC_FIELDS.reduce((s,[k])=>s+num(d[k]),0);
 const tile=(k,l)=>`<button class="orientation-tile" type="button" title="Editar ${l}" aria-label="Editar adaptaciones curriculares de ${l}" onclick="editAdaptaciones('${c.id}')"><span class="non-teaching-date"><span class="non-teaching-month">${l}</span><span class="non-teaching-number">${esc(String(d[k]??'').trim()||'—')}</span></span></button>`;
 return `<div class="panel center-extra-card special-orange"><div class="panelhead"><h3>Adaptaciones curriculares</h3><button class="btn small primary" type="button" onclick="editAdaptaciones('${c.id}')">${has?'Editar':'Añadir datos'}</button></div><div class="panelbody"><div class="orientation-tiles">${AC_FIELDS.map(([k,l])=>tile(k,l)).join('')}</div>${has?`<p class="ac-total">Total: <b>${total}</b> ${total===1?'adaptación':'adaptaciones'}${d.updatedAt?` · actualizado el ${date(d.updatedAt)}`:''}</p>`:''}</div></div>`;
}
function editAdaptaciones(cid){
 const c=db.centers.find(x=>x.id===cid);if(!c)return;
 const d=(c.adaptaciones&&typeof c.adaptaciones==='object')?c.adaptaciones:{};
 openModal('Adaptaciones curriculares · '+c.name,`<p class="muted" style="font-size:12px;margin-top:0">Número de adaptaciones curriculares (AC) en cada etapa. Deja en blanco las etapas que no tiene el centro.</p><div class="formgrid">${AC_FIELDS.map(([k,l])=>`<div class="field"><label for="ac_${k}">${l}</label><input id="ac_${k}" type="number" min="0" class="input" style="width:100%" value="${esc(d[k]??'')}"></div>`).join('')}</div>`,()=>{
  const o={};AC_FIELDS.forEach(([k])=>{o[k]=document.getElementById('ac_'+k).value.trim()});
  if(AC_FIELDS.some(([k])=>o[k]!==''))c.adaptaciones={...o,updatedAt:nowIso()};else delete c.adaptaciones;
  save();closeModal();centerDetail(cid,'otros');
 });
}

/* ---------- Alumnado en combinada: campos con opciones ---------- */
function combSelectField(header,prefix,i,value){
 const opts=header==='Informe del EOE'?['Sí','No']:COMB_SITUACIONES;
 const v=String(value??'');
 const extra=v&&!opts.includes(v)?`<option value="${esc(v)}" selected>${esc(v)}</option>`:'';
 return `<div class="field"><label for="${prefix}${i}">${esc(header)}</label><select id="${prefix}${i}" class="select" style="width:100%"><option value="" ${v?'':'selected'}>—</option>${extra}${opts.map(o=>`<option value="${esc(o)}" ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
}
