/* ================= Añadidos de la versión web cifrada ================= */
function ensureShape(){
 if(!db||typeof db!=='object')db=JSON.parse(JSON.stringify(SEED));
 for(const k of ['centers','actions','visits','petitionsRequirements','consultas','contacts','contactTags'])if(!Array.isArray(db[k]))db[k]=[];
 if(!Array.isArray(db.followupFields))db.followupFields=[...SEED.followupFields];
 for(const k of ['followup','followupNA'])if(!db[k]||typeof db[k]!=='object')db[k]={};
 if(!db.specials||typeof db.specials!=='object')db.specials=JSON.parse(JSON.stringify(SEED.specials));
 if(!db.specials['Días no lectivos'])db.specials['Días no lectivos']={headers:['CENTRO','Fecha','Estado'],rows:[]};
 db.centers.forEach(c=>{if(!db.followup[c.id])db.followup[c.id]={}});
 migrateSpecialTables();applyOrientationCatalog();migrateV2();migrateV33();migrateV34();migrateV42();
 imgAutoTransfer();
}
window.__coreGetDb=()=>db;
window.__coreReplaceData=d=>{db=d;ensureShape();closeModal();nav('dashboard')};
window.__coreRefreshDatos=()=>{if(document.querySelector('.nav button[data-view="datos"].active'))datos()};

function datos(){
 const v=window.__vault?.info?.()||{};
 const when=v.lastSaved?new Date(v.lastSaved).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'—';
 const specialsTotal=Object.values(db.specials).reduce((a,m)=>a+(m.rows?.length||0),0);
 const where=v.linked
  ?`Los cambios se guardan directamente en el archivo <b>${esc(v.name)}</b>. Si está en tu carpeta de BoxAbalar, el cliente de escritorio lo sincroniza con tus otros equipos.`
  :`En este dispositivo los cambios se guardan cifrados dentro del navegador. Para llevarlos a BoxAbalar pulsa «Guardar en BoxAbalar» y sustituye el archivo del registro.${v.pending?' <b>Ahora mismo hay cambios pendientes de enviar.</b>':''}`;
 const autolock=[5,10,15,30,60,0].map(m=>`<option value="${m}" ${m===v.autolock?'selected':''}>${m?m+' minutos':'Nunca'}</option>`).join('');
 document.getElementById('main').innerHTML=layout('Datos y seguridad','Archivo cifrado, copias, importación y exportación',homeBtn())+
 `<div class="grid2">
  <div class="panel"><div class="panelhead"><h2>Archivo de datos</h2></div><div class="panelbody">
   <div class="notice">${where}</div>
   <dl class="center-data-list" style="margin-top:10px">
    <div><dt>Archivo</dt><dd>${esc(v.name||'—')}</dd></div>
    <div><dt>Último guardado</dt><dd>${esc(when)}${v.device?' desde '+esc(v.device):''}</dd></div>
    <div><dt>Versión del archivo</dt><dd>${esc(v.rev??'—')}</dd></div>
    <div><dt>Este dispositivo</dt><dd>${esc(v.thisDevice||'—')}</dd></div>
   </dl>
   <div class="toolbar" style="margin-top:14px">
    <button class="btn primary" onclick="__vault.saveNow()">Guardar ahora</button>
    ${v.linked?'':v.canLink?`<button class="btn" onclick="__vault.linkFile()">Vincular archivo de BoxAbalar</button>`:`<button class="btn" onclick="__vault.exportToCloud()">Guardar en BoxAbalar</button>`}
    <button class="btn" onclick="__vault.downloadEncrypted()">Descargar copia cifrada</button>
    <button class="btn" onclick="__vault.lock()">Cerrar y abrir otro archivo</button>
   </div>
  </div></div>
  <div class="panel"><div class="panelhead"><h2>Seguridad</h2></div><div class="panelbody">
   <p>${v.remembered?'La contraseña está <b>recordada en este equipo</b>: al abrir el registro no se pide. Cualquiera que use tu sesión en este navegador podría verlo.':'La contraseña <b>no se recuerda</b> en este equipo: se pedirá cada vez que abras el registro.'}</p>
   <div class="toolbar">
    ${v.remembered?`<button class="btn" onclick="__vault.setRemember(false)">Dejar de recordarla aquí</button>`:`<button class="btn" onclick="__vault.setRemember(true)">Recordarla en este equipo</button>`}
    <button class="btn" onclick="__vault.changePassword()">Cambiar la contraseña</button>
   </div>
   <div class="field" style="margin-top:14px"><label for="autolockSel">Bloqueo automático tras un periodo sin uso</label>
    <select id="autolockSel" class="select" onchange="__vault.setAutolock(Number(this.value))">${autolock}</select></div>
   <p class="muted" style="font-size:12px">Al bloquearse, la aplicación guarda los cambios y vuelve a la pantalla de entrada.</p>
  </div></div>
 </div>
 <div id="backupPanel"></div>
 <div class="grid2">
  <div class="panel"><div class="panelhead"><h2>Importar</h2></div><div class="panelbody">
   <p><b>Desde Notion, carpeta completa</b> (recomendado). En Notion: menú «···» › Exportar › «Markdown y CSV» con «Incluir subpáginas». Descomprime el ZIP y elige aquí la carpeta resultante. Importa centros, personal, características por curso, actuaciones, visitas y notas. ${v.ios?'<b>Hazlo desde el ordenador</b>: el iPhone no permite elegir carpetas.':''}</p>
   <button class="btn primary" onclick="importNotionFolderStart()">Importar carpeta de Notion…</button>
   <button class="btn danger" onclick="deleteNotionImported()">Eliminar lo importado de Notion…</button>
   <p style="margin-top:16px"><b>Fichas oficiales de los centros.</b> En el generador de fichas, elige tu nombre y pulsa «Xerar todas as fichas (.zip)». Elige aquí ese ZIP (o una o varias fichas .odt sueltas). Cada ficha se guarda en su centro, por curso escolar, según el código. No modifica ningún otro dato.</p>
   <button class="btn primary" onclick="importFichasStart('')">Importar fichas oficiales…</button>
   <p style="margin-top:16px"><b>Consultas y procedimientos.</b> Elige el archivo <i>consultas_iniciales_v4.json</i> que acompaña a esta versión. Solo añade las fichas que aún no tengas; no modifica las existentes.</p>
   <button class="btn primary" onclick="importConsultasStart()">Importar consultas…</button>
   <p style="margin-top:16px"><b>Un CSV suelto.</b> Para tablas sencillas: podrás indicar qué columna corresponde a cada campo.</p>
   <button class="btn" onclick="importNotionStart()">Importar CSV…</button>
   <p style="margin-top:16px"><b>Desde la versión anterior.</b> Restaura una copia JSON guardada con la versión 30. Sustituye todos los datos actuales.</p>
   <button class="btn" onclick="document.getElementById('importFile').click()">Restaurar copia JSON…</button>
   <input id="importFile" type="file" accept="application/json,.json" hidden onchange="importJSON(event)">
   <input id="notionFile" type="file" accept=".csv,text/csv" hidden onchange="importNotionFile(event)">
   <input id="notionFolder" type="file" webkitdirectory multiple hidden onchange="importNotionFolderFiles(event)">
  </div></div>
  <div class="panel"><div class="panelhead"><h2>Exportar</h2></div><div class="panelbody">
   <div class="toolbar"><button class="btn" onclick="exportCSV('actions')">Actuaciones (CSV)</button><button class="btn" onclick="exportCSV('followup')">Seguimiento (CSV)</button><button class="btn" onclick="exportConsultasJSON()">Consultas (JSON)</button><button class="btn" onclick="exportContactsCSV()">Contactos (CSV)</button></div>
   <p class="muted" style="font-size:12px">Los CSV y la copia JSON salen <b>sin cifrar</b>. Guárdalos solo en ubicaciones seguras y bórralos cuando no los necesites.</p>
   <button class="btn" onclick="exportJSON()">Copia completa sin cifrar (JSON)</button>
  </div></div>
 </div>
 <div class="panel"><div class="panelhead"><h2>Contenido del registro</h2></div><div class="panelbody">
  <div class="cards cards6" style="margin-bottom:12px">
   <div class="card"><div class="metric">${db.actions.length}</div><div class="label">Actuaciones</div></div>
   <div class="card"><div class="metric">${db.centers.length}</div><div class="label">Centros</div></div>
   <div class="card"><div class="metric">${db.visits.length}</div><div class="label">Visitas</div></div>
   <div class="card"><div class="metric">${(db.centerNotes||[]).length}</div><div class="label">Notas de centros</div></div>
   <div class="card"><div class="metric">${db.consultas.length}</div><div class="label">Consultas y procedimientos</div></div>
   <div class="card"><div class="metric">${db.contacts.length}</div><div class="label">Contactos</div></div>
   <div class="card"><div class="metric">${specialsTotal}</div><div class="label">Registros en otros datos</div></div>
  </div>
  <button class="btn danger" onclick="resetData()">Vaciar el registro…</button>
  <p class="muted" style="font-size:12px;margin-top:14px">Versión de la aplicación: ${esc(v.version||'')}</p>
 </div></div>`;
 setTimeout(fillBackupPanel,0);
}

function exportJSON(){
 if(!confirm('La copia JSON contiene todos los datos SIN CIFRAR. ¿Quieres descargarla igualmente?'))return;
 download(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),'registro-inspeccion-sin-cifrar.json');
}
function importJSON(e){
 const f=e.target.files[0];e.target.value='';if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
  let data;try{data=JSON.parse(r.result)}catch{alert('El archivo no contiene una copia JSON válida.');return}
  if(data&&data.format==='registro-inspeccion-cifrado'){alert('Este archivo es un registro cifrado. Para abrirlo usa «Cerrar y abrir otro archivo».');return}
  if(!data||(!Array.isArray(data.actions)&&!Array.isArray(data.centers))){alert('El archivo no parece una copia de este registro.');return}
  if(!confirm('La copia sustituirá TODOS los datos actuales del registro. ¿Continuar?'))return;
  db=data;ensureShape();save();nav('dashboard');alert('Copia restaurada.');
 };
 r.readAsText(f);
}
function resetData(){
 if(!confirm('Se borrarán todos los centros, actuaciones, visitas y demás datos del registro. ¿Continuar?'))return;
 if(!confirm('Confirma de nuevo: el registro quedará vacío y el cambio se guardará en el archivo.'))return;
 db=JSON.parse(JSON.stringify(SEED));ensureShape();save();nav('dashboard');
}

/* ----------------- Importación CSV (Notion) ----------------- */
function parseCSV(text){
 text=String(text).replace(/^\ufeff/,'');
 const first=text.split(/\r?\n/,1)[0]||'';
 const count=ch=>first.split(ch).length;
 const delim=count(';')>count(',')&&count(';')>=count('\t')?';':count('\t')>count(',')?'\t':',';
 const rows=[];let row=[],f='',q=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"'&&f==='')q=true;
  else if(c===delim){row.push(f);f=''}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}
  else f+=c;
 }
 if(f!==''||row.length){row.push(f);rows.push(row)}
 return rows.filter(r=>r.some(v=>String(v).trim()!==''));
}
const IMPORT_TARGETS={
 actions:{label:'Actuaciones',fields:[
  ['date','Fecha',['fecha','date','dia','creado','created','cuando']],
  ['time','Hora',['hora','time']],
  ['mode','Medio de comunicación',['medio','via','canal','modo','contacto','comunicacion']],
  ['center','Centro',['centro','center','colegio','instituto']],
  ['student','Persona implicada',['persona','implicad','alumn','estudiante','student']],
  ['subject','Asunto',['asunto','name','nombre','titulo','title','tema']],
  ['details','Detalles',['detalle','descripcion','notas','nota','observ','contenido','description']],
  ['action','Actuación realizada / respuesta',['actuacion','respuesta','accion','resolucion','medida']],
  ['finalizada','Finalizada',['finaliz','estado','status','hecho','done','complet','cerrad']]]},
 centers:{label:'Centros',fields:[
  ['tipo','Tipo',['tipo']],
  ['name','Nombre del centro',['nombre','centro','name']],
  ['code','Código',['codigo','code','cod']],
  ['town','Concello',['concello','ayuntamiento','municipio','localidad','town']],
  ['phone','Teléfono',['telefono','tlf','phone']],
  ['email','Correo electrónico',['correo','email','mail']],
  ['address','Dirección postal',['direccion','address','domicilio']],
  ['director','Director/a',['director']],
  ['secretary','Secretario/a',['secretar']]]},
 visits:{label:'Visitas',fields:[
  ['center','Centro',['centro','center','name','nombre']],
  ['date','Fecha',['fecha','date','dia']],
  ['obs','Observaciones',['observ','notas','nota','descripcion','detalle','motivo']]]}
};
const normTxt=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const cleanNotion=v=>String(v??'').replace(/\s*\((?:https?:\/\/|www\.notion)[^)]*\)/g,'').trim();
let notionImport=null;
function guessMapping(target,headers){
 const used=new Set(),map={};
 for(const [key,,syn] of IMPORT_TARGETS[target].fields){
  const i=headers.findIndex((h,idx)=>!used.has(idx)&&syn.some(s=>normTxt(h).includes(s)));
  if(i>=0){map[key]=i;used.add(i)}
 }
 return map;
}
function importNotionStart(){const i=document.getElementById('notionFile');i.value='';i.click()}
function importNotionFile(e){
 const f=e.target.files[0];if(!f)return;
 const r=new FileReader();
 r.onload=()=>{
  const rows=parseCSV(r.result);
  if(rows.length<2){alert('El CSV no tiene filas de datos.');return}
  const headers=rows[0].map(h=>String(h).trim());
  const hn=headers.map(normTxt);
  const target=hn.some(h=>h.includes('codigo'))&&!hn.some(h=>h.includes('asunto'))?'centers':'actions';
  notionImport={name:f.name,headers,rows:rows.slice(1),target,map:guessMapping(target,headers)};
  openModal('Importar '+f.name,notionImportBody(),runNotionImport);
  document.getElementById('modalSave').textContent='Importar';
 };
 r.readAsText(f,'utf-8');
}
function notionImportBody(){
 const n=notionImport;
 return `<p class="muted" style="margin-top:0">${n.rows.length} filas y ${n.headers.length} columnas. Indica a qué campo corresponde cada columna; lo que no asignes puede añadirse al texto de detalles.</p>
 <div class="field"><label for="niTarget">Importar como</label><select id="niTarget" class="select" onchange="notionSetTarget(this.value)">${Object.entries(IMPORT_TARGETS).map(([k,t])=>`<option value="${k}" ${k===n.target?'selected':''}>${t.label}</option>`).join('')}</select></div>
 <div id="niMap">${notionMapHTML()}</div>`;
}
function notionSetTarget(t){notionImport.target=t;notionImport.map=guessMapping(t,notionImport.headers);document.getElementById('niMap').innerHTML=notionMapHTML()}
function notionReadMap(){const m={};for(const [k] of IMPORT_TARGETS[notionImport.target].fields){const v=document.getElementById('ni_'+k)?.value;if(v!==undefined&&v!=='')m[k]=Number(v)}notionImport.map=m}
function notionMapHTML(){
 const n=notionImport,t=IMPORT_TARGETS[n.target];
 const sel=k=>`<select id="ni_${k}" class="select" style="width:100%" onchange="notionReadMap();document.getElementById('niPreview').innerHTML=notionPreviewHTML()"><option value="">— No importar —</option>${n.headers.map((h,i)=>`<option value="${i}" ${n.map[k]===i?'selected':''}>${esc(h||'Columna '+(i+1))}</option>`).join('')}</select>`;
 const opts=n.target==='centers'
  ?`<label class="gate-check"><input type="checkbox" id="niUpdate" checked> Completar los datos vacíos de los centros que ya existen</label>`
  :`<label class="gate-check"><input type="checkbox" id="niCreate" checked> Crear la ficha de los centros que no existan</label>
    <label class="gate-check"><input type="checkbox" id="niSkip" checked> Omitir filas que ya estén registradas (misma fecha, centro y asunto)</label>
    <label class="gate-check"><input type="checkbox" id="niExtra" checked> Añadir las columnas no asignadas al texto de ${n.target==='visits'?'observaciones':'detalles'}</label>`;
 return `<div class="formgrid" style="margin-top:12px">${t.fields.map(([k,label])=>`<div class="field"><label for="ni_${k}">${label}</label>${sel(k)}</div>`).join('')}</div>
  <div style="margin-top:12px;display:grid;gap:6px">${opts}</div>
  <h3 style="font-size:13px;color:var(--accent);margin:16px 0 6px">Vista previa (primeras filas)</h3><div id="niPreview">${notionPreviewHTML()}</div>`;
}
function notionPreviewHTML(){
 const n=notionImport,t=IMPORT_TARGETS[n.target];
 const cols=t.fields.filter(([k])=>n.map[k]!==undefined);
 if(!cols.length)return '<p class="muted">Asigna al menos una columna.</p>';
 const val=(row,k)=>{let v=cleanNotion(row[n.map[k]]);if(k==='date')v=parseDateAny(v)?date(parseDateAny(v)):v?'⚠ '+v:'';if(k==='finalizada')v=parseDone(v)?'Sí':'No';if(k==='mode')v=normMode(v)[0];return v};
 return `<div class="tablewrap" style="max-height:220px"><table class="table"><thead><tr>${cols.map(([,l])=>`<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${n.rows.slice(0,4).map(r=>`<tr>${cols.map(([k])=>`<td>${esc(String(val(r,k)).slice(0,90))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
 <p class="muted" style="font-size:11px">Una fecha marcada con ⚠ no se ha podido interpretar y quedará vacía.</p>`;
}
const MONTHS_ANY={enero:1,january:1,jan:1,ene:1,xaneiro:1,febrero:2,february:2,feb:2,febreiro:2,marzo:3,march:3,mar:3,abril:4,april:4,apr:4,abr:4,mayo:5,may:5,maio:5,junio:6,june:6,jun:6,xuno:6,julio:7,july:7,jul:7,xullo:7,agosto:8,august:8,aug:8,ago:8,septiembre:9,setiembre:9,september:9,sep:9,sept:9,set:9,setembro:9,octubre:10,october:10,oct:10,outubro:10,out:10,noviembre:11,november:11,nov:11,novembro:11,diciembre:12,december:12,dec:12,dic:12,decembro:12,dez:12};
function parseDateAny(raw){
 const s=normTxt(String(raw||'').split('→')[0]);if(!s)return '';
 const p=n=>String(n).padStart(2,'0');
 const ok=(y,m,d)=>{y=Number(y);m=Number(m);d=Number(d);return y>1900&&m>=1&&m<=12&&d>=1&&d<=31?`${y}-${p(m)}-${p(d)}`:''};
 let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return ok(m[1],m[2],m[3]);
 m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);if(m)return ok(m[3].length===2?'20'+m[3]:m[3],m[2],m[1]);
 m=s.match(/^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);if(m&&MONTHS_ANY[m[1]])return ok(m[3],MONTHS_ANY[m[1]],m[2]);
 m=s.match(/^(?:[a-z]+,?\s+)?(\d{1,2})\s+(?:de\s+)?([a-z]+)\.?,?\s+(?:de\s+)?(\d{4})/);if(m&&MONTHS_ANY[m[2]])return ok(m[3],MONTHS_ANY[m[2]],m[1]);
 return '';
}
function timeFrom(raw){
 const m=String(raw||'').split('→')[0].match(/(\d{1,2}):(\d{2})\s*([ap])?\.?\s*m?\.?/i);if(!m)return '';
 let h=Number(m[1]);const ap=(m[3]||'').toLowerCase();if(ap==='p'&&h<12)h+=12;if(ap==='a'&&h===12)h=0;
 return h<24?`${String(h).padStart(2,'0')}:${m[2]}`:'';
}
function parseDone(v){return /^(s[ií]|yes|true|1|x|✓|✔|hecho|done|finaliz|complet|terminad|cerrad|resuelt|listo)/i.test(normTxt(v).replace(/^[^a-z0-9✓✔]+/,''))||/^(✓|✔)/.test(String(v).trim())}
function normMode(v){
 const n=normTxt(v);if(!n)return ['',''];
 if(/correo|mail|e-mail/.test(n))return ['Correo electrónico',''];
 if(/telef|llamad|movil|tlf/.test(n))return ['Teléfono',''];
 if(/rexel/.test(n))return ['REXEL',''];
 if(/presen|visita|reunion|entrevista/.test(n))return ['Presencial',''];
 return ['Otro',String(v).trim()];
}
function runNotionImport(){
 notionReadMap();
 const n=notionImport,map=n.map,target=n.target;
 if(!Object.keys(map).length){alert('Asigna al menos una columna.');return}
 if(target==='centers'&&map.name===undefined){alert('Asigna la columna con el nombre del centro.');return}
 if(target==='visits'&&(map.center===undefined||map.date===undefined)){alert('Para importar visitas asigna al menos el centro y la fecha.');return}
 const chk=id=>!!document.getElementById(id)?.checked;
 const createCenters=chk('niCreate'),skipDup=chk('niSkip'),addExtra=chk('niExtra'),updateCenters=chk('niUpdate');
 const get=(row,k)=>map[k]===undefined?'':cleanNotion(row[map[k]]);
 const assigned=new Set(Object.values(map));
 const extraText=row=>addExtra?n.headers.map((h,i)=>!assigned.has(i)&&cleanNotion(row[i])?`${h}: ${cleanNotion(row[i])}`:'').filter(Boolean).join('\n'):'';
 let created=0,updated=0,skipped=0,newCenters=0,badDates=0;
 const findCenter=v=>{const k=normTxt(v);return db.centers.find(c=>normTxt(c.name)===k||(c.code&&normTxt(c.code)===k))};
 const resolveCenter=raw=>{
  const v=String(raw||'').split(/,\s*(?=[A-ZÁÉÍÓÚ])/)[0].trim();if(!v)return '';
  const c=findCenter(v);if(c)return c.name;
  if(createCenters){const id=uid();db.centers.push({id,code:'',tipo:'',name:v,town:'',phone:'',email:'',address:'',director:'',secretary:''});db.followup[id]={};newCenters++;return v}
  return v;
 };
 if(target==='centers'){
  for(const row of n.rows){
   const name=get(row,'name');if(!name){skipped++;continue}
   const code=get(row,'code');
   const ex=db.centers.find(c=>normTxt(c.name)===normTxt(name)||(code&&String(c.code)===code));
   const vals=Object.fromEntries(IMPORT_TARGETS.centers.fields.map(([k])=>[k,get(row,k)]));
   if(ex){if(updateCenters){let ch=false;for(const [k,v] of Object.entries(vals))if(v&&!ex[k]){ex[k]=v;ch=true}if(ch)updated++;else skipped++}else skipped++;continue}
   let id=code||uid();if(db.centers.some(c=>c.id===id))id=uid();
   const fullName=vals.tipo&&!normTxt(name).startsWith(normTxt(vals.tipo)+' ')?vals.tipo+' '+name:name;
   db.centers.push({id,code,name:fullName,tipo:vals.tipo,town:vals.town,phone:vals.phone,email:vals.email,address:vals.address,director:vals.director,secretary:vals.secretary});
   db.followup[id]={};created++;
  }
 }else if(target==='actions'){
  const seen=new Set(db.actions.map(a=>normTxt([a.date,a.center,a.subject].join('|'))));
  for(const row of n.rows){
   const rawDate=get(row,'date'),d=parseDateAny(rawDate);if(rawDate&&!d)badDates++;
   const [mode,modeNote]=normMode(get(row,'mode'));
   const subject=get(row,'subject'),center=resolveCenter(get(row,'center'));
   const details=[modeNote?`Medio indicado en Notion: ${modeNote}`:'',get(row,'details'),extraText(row)].filter(Boolean).join('\n\n');
   if(!subject&&!details&&!d){skipped++;continue}
   const key=normTxt([d,center,subject].join('|'));
   if(skipDup&&seen.has(key)){skipped++;continue}
   seen.add(key);
   db.actions.push({id:uid(),date:d,time:get(row,'time')||timeFrom(rawDate),mode,center,student:get(row,'student'),subject,details,action:get(row,'action'),finalizada:map.finalizada!==undefined&&parseDone(get(row,'finalizada')),createdAt:localIso(d,get(row,'time')||timeFrom(rawDate))||nowIso(),updatedAt:'',updates:[],source:'csv'});
   created++;
  }
 }else{
  const months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const seen=new Set(db.visits.map(v=>normTxt(v.date+'|'+v.center)));
  for(const row of n.rows){
   const rawDate=get(row,'date'),d=parseDateAny(rawDate);if(rawDate&&!d)badDates++;
   const center=resolveCenter(get(row,'center'));if(!center&&!d){skipped++;continue}
   const key=normTxt(d+'|'+center);if(skipDup&&seen.has(key)){skipped++;continue}seen.add(key);
   db.visits.push({id:uid(),center,date:d,month:d?months[Number(d.slice(5,7))-1]:'',obs:[get(row,'obs'),extraText(row)].filter(Boolean).join('\n\n')});
   created++;
  }
 }
 save();closeModal();
 alert(`Importación terminada.\n\nNuevos registros: ${created}${updated?`\nCentros completados: ${updated}`:''}${newCenters?`\nFichas de centro creadas: ${newCenters}`:''}${skipped?`\nFilas omitidas: ${skipped}`:''}${badDates?`\nFechas no reconocidas (quedaron vacías): ${badDates}`:''}`);
 nav(target==='actions'?'registro':target==='centers'?'centros':'visitas');
}
