/* ---------- Centros: tipo, PDF y notas ---------- */
function centros(){
 const tipos=[...new Set(db.centers.map(c=>c.tipo).filter(Boolean))].sort();
 document.getElementById('main').innerHTML=layout('Centros','Ficha básica y actividad asociada a cada centro',homeBtn()+`<button class="btn primary" onclick="newCenter()">+ Nuevo centro</button>`)+
 `<div class="toolbar"><input id="csearch" class="input" type="search" placeholder="Buscar centro o concello" oninput="filterCenters()"><select id="ctipo" class="select" onchange="filterCenters()"><option value="">Todos los tipos</option>${tipos.map(t=>`<option>${esc(t)}</option>`).join('')}</select><span id="ccount" class="pill"></span></div><div class="centergrid" id="centerGrid"></div>`;
 filterCenters();
}
function filterCenters(){
 const q=normTxt(document.getElementById('csearch')?.value||''),t=document.getElementById('ctipo')?.value||'';
 const cs=db.centers.filter(c=>!q||normTxt([c.name,c.town,c.code,c.email,c.director].join(' ')).includes(q)).filter(c=>!t||c.tipo===t).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const cc=document.getElementById('ccount');if(cc)cc.textContent=`${cs.length} ${cs.length===1?'centro':'centros'}`;
 document.getElementById('centerGrid').innerHTML=cs.map(c=>{
  return `<div class="center" role="button" tabindex="0" onclick="centerDetail('${c.id}','datos')" onkeydown="if(event.key==='Enter'){centerDetail('${c.id}','datos')}"><h3>${esc(c.name)}</h3><p>${esc(c.town||'Concello sin indicar')}</p><p class="center-mail">${esc(c.email||'Sin correo')}</p><p>${c.director?'Dirección: '+esc(c.director):'Dirección sin indicar'}</p></div>`}).join('')||'<div class="empty">No hay centros con esos criterios.</div>';
}
function centerForm(c){
 const f=(id,label,val,full=false,extra='')=>`<div class="field ${full?'full':''}"><label for="${id}">${label}</label><input class="input" style="width:100%" id="${id}" value="${esc(val||'')}" ${extra}></div>`;
 return `<div class="formgrid">
  ${f('cname','Nombre completo del centro',c.name,true,'placeholder="Por ejemplo: IES Antonio Fraguas Fraguas"')}
  <div class="field"><label for="ctipo2">Tipo</label><input class="input" style="width:100%" id="ctipo2" list="tiposList" value="${esc(c.tipo||'')}"><datalist id="tiposList">${APP_TIPOS.map(t=>`<option value="${t}">`).join('')}</datalist></div>
  ${f('ccode','Código',c.code)}${f('ctown','Concello',c.town)}${f('cphone','Teléfono',c.phone)}${f('cemail','Correo electrónico',c.email,false,'type="email"')}
  ${f('cemail2','Otro correo',c.email2,false,'type="email"')}
  ${f('caddress','Dirección postal',c.address,true)}
  <h4 class="field full form-sub">Equipo directivo</h4>
  ${f('cdirector','Director/a',c.director)}${f('cdirExt','Extensión (dirección)',c.directorExt,false,'inputmode="tel"')}
  ${f('cdirMobile','Móvil (dirección)',c.directorMobile,false,'type="tel" inputmode="tel"')}${f('csecretary','Secretario/a',c.secretary)}
  <div class="field full"><label for="cdirObs">Observaciones (dirección)</label><textarea class="textarea" id="cdirObs" style="min-height:70px">${esc(c.directorObs||'')}</textarea></div>
  ${f('cheadPrimary','Jefatura de estudios · Primaria',c.headPrimary??c.head)}${f('cheadSecondary','Jefatura de estudios · Secundaria',c.headSecondary)}
  ${f('cheadAdults','Jefatura de estudios · Adultos',c.headAdults)}${f('cvice','Vicedirección',c.vice)}
  <h4 class="field full form-sub">Otro personal</h4>
  ${f('corient','Orientación',c.orientacion)}${f('cconserje','Conserje',c.conserje)}
 </div>`;
}
function readCenterForm(){
 const v=id=>document.getElementById(id).value.trim();
 return {name:v('cname'),tipo:v('ctipo2'),code:v('ccode'),town:v('ctown'),phone:v('cphone'),email:v('cemail'),address:v('caddress'),director:v('cdirector'),secretary:v('csecretary'),headPrimary:v('cheadPrimary'),headSecondary:v('cheadSecondary'),headAdults:v('cheadAdults'),vice:v('cvice'),email2:v('cemail2'),directorExt:v('cdirExt'),directorMobile:v('cdirMobile'),directorObs:document.getElementById('cdirObs').value.trim(),orientacion:v('corient'),conserje:v('cconserje')};
}
function validCenter(d,selfId){
 if(!d.name){alert('Indica el nombre del centro.');return false}
 if(d.code&&db.centers.some(c=>String(c.code)===d.code&&c.id!==selfId)){alert('Ya existe otro centro con ese código.');return false}
 return true;
}
function newCenter(){
 openModal('Nuevo centro',centerForm({}),()=>{
  const d=readCenterForm();if(!validCenter(d,null))return;
  let id=d.code||uid();if(db.centers.some(c=>c.id===id))id=uid();
  db.centers.push({id,...d,caracteristicas:{}});db.followup[id]={};save();closeModal();centerDetail(id,'datos');
 });
}
function editCenter(id){
 const c=db.centers.find(x=>x.id===id);if(!c)return;const oldName=c.name;
 openModal('Editar ficha del centro',centerForm(c),()=>{
  const d=readCenterForm();if(!validCenter(d,id))return;
  Object.assign(c,d);
  if(oldName!==c.name){db.actions.forEach(a=>{if(a.center===oldName)a.center=c.name});db.visits.forEach(v=>{if(v.center===oldName)v.center=c.name})}
  save();closeModal();centerDetail(id);
 });
}
function noteForm(n){return `<div class="formgrid"><div class="field"><label for="ndate">Fecha</label><input id="ndate" type="date" class="input" style="width:100%" value="${esc(n.date||'')}"></div><div class="field"><label for="ntitle">Título</label><input id="ntitle" class="input" style="width:100%" value="${esc(n.title||'')}"></div><div class="field full"><label for="ntext">Nota</label><textarea id="ntext" class="textarea" style="min-height:220px">${esc(n.text||'')}</textarea></div></div>`}
function readNoteForm(){return {date:document.getElementById('ndate').value,title:document.getElementById('ntitle').value.trim(),text:document.getElementById('ntext').value}}
function newCenterNote(cid){
 const c=db.centers.find(x=>x.id===cid);if(!c)return;
 openModal('Nueva nota · '+c.name,noteForm({date:todayIso()}),()=>{const d=readNoteForm();if(!d.title&&!d.text.trim()){alert('Escribe un título o el texto de la nota.');return}db.centerNotes.push({id:uid(),centerId:cid,...d,createdAt:nowIso(),updatedAt:''});save();closeModal();centerDetail(cid,'notas')});
}
function editCenterNote(id,cid){
 const n=db.centerNotes.find(x=>x.id===id);if(!n)return;
 openModal('Editar nota',noteForm(n),()=>{Object.assign(n,readNoteForm(),{updatedAt:nowIso()});save();closeModal();centerDetail(cid,'notas')});
}
function deleteCenterNote(id,cid){if(!confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.'))return;db.centerNotes=db.centerNotes.filter(n=>n.id!==id);save();centerDetail(cid,'notas')}
function showCenterTab(tab){
 if(!['datos','caracteristicas','ficha','actuaciones','notas','visitas','peticiones','seguimiento','otros'].includes(tab))return;
 activeCenterTab=tab;
 document.querySelectorAll('.center-menu-button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
 document.querySelectorAll('.center-section').forEach(p=>{p.hidden=p.dataset.tab!==tab});
 const content=document.getElementById('centerContent');if(content)content.scrollTop=0;
}
/* ---------- Ficha: actuaciones y visitas por curso ---------- */
function centerActEvent(a,c){return `<div class="event"><b>${date(a.date)}${a.mode?' · '+esc(a.mode):''} · ${a.finalizada?'Finalizada':'Pendiente'}${actionMeta(a)}</b><div><button type="button" class="subject-link" onclick="editAction('${a.id}')">${esc(a.subject||'(sin asunto)')}</button></div>${!a.finalizada?`<button class="btn small" onclick="finishActionFromCenter('${a.id}','${c.id}')">Marcar como finalizada</button>`:''}</div>`}
function centerActsHTML(c){
 const all=db.actions.filter(a=>a.center===c.name),k=getCenterCourse(c.id,'act');
 const list=all.filter(a=>inCourse(a.date,k)).sort((a,b)=>((b.date||'')+(b.time||'')).localeCompare((a.date||'')+(a.time||'')));
 const label=k==='*'?'todos los cursos':'el curso '+k;
 return `<div class="section-head after-block"><h3 style="margin:0">Actuaciones ${k==='*'?'de todos los cursos':'del curso '+k} (${list.length})</h3></div>
 <div class="course-bar"><label for="cActCourse">Curso</label>${courseSelect('cActCourse',courseList(all.map(a=>a.date)),k,`setCenterCourse('${c.id}','act',this.value)`)}<span class="muted">${all.length} en total en este centro</span></div>
 <div class="timeline">${list.map(a=>centerActEvent(a,c)).join('')||`<div class="empty">No hay actuaciones en ${label}.</div>`}</div>
 ${all.length?`<button class="btn" onclick="registroForCenter(${esc(JSON.stringify(c.name))},'${k}')">Ver en el registro</button>`:''}`;
}
function centerVisitsHTML(c){
 const all=db.visits.filter(v=>v.center===c.name),k=getCenterCourse(c.id,'vis');
 const list=all.filter(v=>inCourse(v.date,k)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 return `<h3>Visitas ${k==='*'?'de todos los cursos':'del curso '+k} (${list.length})</h3>
 <div class="course-bar"><label for="cVisCourse">Curso</label>${courseSelect('cVisCourse',courseList(all.map(v=>v.date)),k,`setCenterCourse('${c.id}','vis',this.value)`)}<span class="muted">${all.length} en total en este centro</span></div>
 <div class="timeline">${list.map(v=>`<div class="event"><b>${date(v.date)}</b><div class="note-text">${esc(v.obs||v.notes||v.observations||'Visita al centro')}</div><button class="btn small" type="button" onclick="editVisitFromCenter('${v.id}','${c.id}')">Editar</button></div>`).join('')||`<div class="empty">No hay visitas en ${k==='*'?'ningún curso':'el curso '+k}.</div>`}</div>`;
}
function setCenterCourse(cid,kind,val){
 centerCourseSel[cid+'.'+kind]=val;const c=db.centers.find(x=>x.id===cid);if(!c)return;
 const box={act:'centerActsCourse',vis:'centerVisitsCourse',char:'centerChar',ficha:'centerFicha'}[kind],fn={act:centerActsHTML,vis:centerVisitsHTML,char:centerCharHTML,ficha:centerFichaHTML}[kind];
 const el=document.getElementById(box);if(el){el.innerHTML=fn(c);document.getElementById({act:'cActCourse',vis:'cVisCourse',char:'cCharCourse',ficha:'cFichaCourse'}[kind])?.focus()}
}

/* ---------- Ficha: características del centro por curso ---------- */
const CHAR_FIELDS=[['linea','Línea y unidades'],['alumnos','Nº alumnos'],['profesores','Nº profesores'],['transporte','Transporte'],['comedor','Comedor'],['pt','PT'],['al','AL'],['cuidadoras','Cuidadoras'],['varios','Varios']];
const CHAR_WIDE=new Set(['comedor','pt','al','cuidadoras','varios']);
function charHasData(o){return !!o&&CHAR_FIELDS.some(([k])=>String(o[k]||'').trim())}
function centerCharHTML(c){
 const store=c.caracteristicas||{};
 const kk=(()=>{const courses=[...new Set([currentCourse(),...Object.keys(store)])];let k=centerCourseSel[c.id+'.char']||(charHasData(store[currentCourse()])?currentCourse():(courses.sort().reverse().find(x=>charHasData(store[x]))||currentCourse()));if(k==='*'||!courses.includes(k))k=currentCourse();return k})();
 return centerCharBaseHTML(c)+centerDotHTML(c,kk);
}
function centerCharBaseHTML(c){
 const store=c.caracteristicas||{};
 const courses=[...new Set([currentCourse(),...Object.keys(store)])].sort().reverse();
 let k=centerCourseSel[c.id+'.char']||(charHasData(store[currentCourse()])?currentCourse():(courses.find(x=>charHasData(store[x]))||currentCourse()));if(k==='*'||!courses.includes(k))k=currentCourse();
 const d=store[k],prev=courses.filter(x=>x<k&&charHasData(store[x]))[0];
 const sel=`<select id="cCharCourse" class="select" aria-label="Curso escolar" onchange="setCenterCourse('${c.id}','char',this.value)">${courses.map(x=>`<option value="${x}" ${x===k?'selected':''}>Curso ${x}${x===currentCourse()?' (actual)':''}${charHasData(store[x])?'':' · sin datos'}</option>`).join('')}</select>`;
 const head=`<div class="section-head"><h3 style="margin:0">Características del centro · curso ${k}</h3><button class="btn small primary" onclick="editCharacteristics('${c.id}','${k}')">${charHasData(d)?'Editar':'Añadir datos'}</button></div><div class="course-bar"><label for="cCharCourse">Curso</label>${sel}</div>`;
 if(!charHasData(d))return head+`<div class="empty">No hay características registradas para el curso ${k}.${prev?` El último curso con datos es ${prev}; puedes consultarlo en el desplegable o partir de él al añadir los de este curso.`:''}</div>`;
 return head+`<dl class="center-data-list char-list">${CHAR_FIELDS.map(([f,l])=>`<div class="${CHAR_WIDE.has(f)?'char-wide':''}"><dt>${l}</dt><dd>${esc(d[f]||'—')}</dd></div>`).join('')}</dl>${d.source==='notion'?'<p class="muted" style="font-size:12px">Importado de Notion.</p>':''}`;
}
function charForm(k,d,prevK){
 return `<div class="formgrid"><div class="field"><label for="chCourse">Curso escolar</label><input id="chCourse" class="input" style="width:100%" value="${esc(k)}" placeholder="2026/27"></div>${prevK?`<div class="field" style="align-self:end"><button class="btn" type="button" onclick="fillCharFrom('${prevK}')">Copiar los datos de ${prevK}</button></div>`:''}
 ${CHAR_FIELDS.map(([f,l])=>`<div class="field ${CHAR_WIDE.has(f)?'full':''}"><label for="ch_${f}">${l}</label><textarea id="ch_${f}" class="textarea" style="min-height:${CHAR_WIDE.has(f)?90:44}px">${esc(d[f]||'')}</textarea></div>`).join('')}</div>`;
}
let charFormCenter=null;
function fillCharFrom(k){const c=charFormCenter,d=c?.caracteristicas?.[k];if(!d)return;if(CHAR_FIELDS.some(([f])=>document.getElementById('ch_'+f).value.trim())&&!confirm('Se sustituirá lo que has escrito en el formulario. ¿Continuar?'))return;CHAR_FIELDS.forEach(([f])=>{document.getElementById('ch_'+f).value=d[f]||''})}
function editCharacteristics(cid,k){
 const c=db.centers.find(x=>x.id===cid);if(!c)return;if(!c.caracteristicas)c.caracteristicas={};
 const d=c.caracteristicas[k]||{},prevK=Object.keys(c.caracteristicas).filter(x=>x<k&&charHasData(c.caracteristicas[x])).sort().reverse()[0];
 charFormCenter=c;
 openModal(`Características · ${c.name}`,charForm(k,d,charHasData(d)?'':prevK),()=>{
  const nk=normCourse(document.getElementById('chCourse').value);
  if(!nk){alert('Indica el curso con el formato 2026/27.');return}
  if(nk!==k&&charHasData(c.caracteristicas[nk])&&!confirm(`El curso ${nk} ya tiene datos. ¿Sustituirlos?`))return;
  const o={};CHAR_FIELDS.forEach(([f])=>{o[f]=document.getElementById('ch_'+f).value.trim()});o.updatedAt=nowIso();
  if(nk!==k)delete c.caracteristicas[k];
  if(charHasData(o))c.caracteristicas[nk]=o;else delete c.caracteristicas[nk];
  centerCourseSel[cid+'.char']=nk;save();closeModal();centerDetail(cid,'caracteristicas');
 });
}
