const SEED = {"centers": [], "actions": [], "visits": [], "consultas": [], "reuniones": [], "bibliografia": [], "followupFields": ["Acta claustro adscripción", "Entrega programaciones", "Autorización agrupamientos flex.", "Autorizaciones matrícula simultánea", "Documentación PAC", "Horario prof. disp. horaria (PDH)", "Planes esp. repetidores/materias pendientes", "PGA", "DOC", "Memoria final"], "followup": {}, "followupNA": {}, "petitionsRequirements": [], "specials": {"EscolarizaciónExtraordinarias-B": {"headers": ["CENTRO", "Fecha sol", "Fecha res", "Alumnado", "Curso", "ED550C", "Firmada", "Motivo", "Origen", "Identidad", "Filiación", "Empadronamiento", "Documentación", "Vacantes", "Informe"], "rows": []}, "EscolarizaciónCursoInferior": {"headers": ["CENTRO", "Fecha sol", "Fecha res", "Alumnado", "De", "Para", "Motivo"], "rows": []}, "Protocolos_ProcCorrector": {"headers": ["Fecha", "Centro", "Protocolo", "Alumno", "Curso/edad", "Sexo del alumno/a", "Apertura del expediente", "Resolución del expediente", "Fiscalía", "Seguridad", "Servicios sociales/sanitarios", "Fecha informe en XIE", "Seguimiento"], "rows": []}, "EOE_At.Dom_Cambio mod_Flexibili": {"headers": ["Campo 1", "Centro", "Alumno/a", "Motivo", "Curso actual", "Comunicación al centro responsable", "Fecha resolución DT", "Horas semanales asignadas", "Fecha inicio at. domiciliaria", "Fecha fin at. domiciliaria", "Observaciones"], "rows": []}, "Prof. Prácticas": {"headers": ["CENTRO", "Docente", "Materia", "Tutor/a", "Visita", "Observaciones"], "rows": []}, "Dep. Orientación": {"headers": ["CENTRO", "Unidades", "Tipo", "PT", "PTC", "AL", "ALC", "Centro adscrito"], "rows": []}, "PAC - ILS": {"headers": ["CENTRO", "Auxiliar cuidador", "Alumnado", "Compartido", "Días asistencia"], "rows": []}, "Relixión": {"headers": ["CENTRO", "Religión católica (especialidad 701401)", "Columna 4", "Columna 5", "Columna 6", "Columna 7", "Columna 8", "Religión evangélica (701402)"], "rows": []}, "Actuacións": {"headers": ["Centro", "Fecha", "Modo de comunicación", "Asunto", "Descripción", "Finalizada"], "rows": []}, "Días no lectivos": {"headers": ["CENTRO", "Fecha", "Estado"], "rows": []}}};
let db=window.__BOOT_DATA__||JSON.parse(JSON.stringify(SEED));delete window.__BOOT_DATA__;
for(const k of ['centers','actions','visits','consultas'])if(!Array.isArray(db[k]))db[k]=[];if(!db.followup)db.followup={};if(!db.followupNA)db.followupNA={};if(!Array.isArray(db.followupFields))db.followupFields=[...SEED.followupFields];
if(!Array.isArray(db.petitionsRequirements))db.petitionsRequirements=[];
if(!db.specials||typeof db.specials!=='object')db.specials={};
if(!db.specials['Días no lectivos'])db.specials['Días no lectivos']={headers:['CENTRO','Fecha','Estado'],rows:[]};
// Normaliza denominaciones antiguas para que las actuaciones se vinculen con la ficha correcta del centro.
let normalizedCenters=false;
if(Array.isArray(db.actions)){
  db.actions.forEach(a=>{
    if(a.center==='IES Felix Muriel'){a.center='IES Félix Muriel'; normalizedCenters=true;}
    if(a.center==='CEIP Castelao'){a.center='CEIP Alfonso D. Rodríguez Castelao'; normalizedCenters=true;}
    if(a.center==='CEP Brea Segade'){a.center='CEP Xosé María Brea Segade'; normalizedCenters=true;}
    if(a.center==='CEIP Pumar-Urdilde'){a.center='CEIP de Pumar-Urdilde'; normalizedCenters=true;}
    if(a.center==='CEIP da Ramallosa'){a.center='CEIP A Ramallosa'; normalizedCenters=true;}
    if(a.center==='CPI Dodro'){a.center='CPI Eusebio Lorenzo Baleirón'; normalizedCenters=true;}
    if(a.center==='CPR Cluny'){a.center='CPR San José de Cluny'; normalizedCenters=true;}
  });
}
// Ajusta Escolarizaciones extraordinarias a la estructura v14 también para datos ya guardados en el navegador.
(function migrateExtraordinarySchooling(){
  const key='EscolarizaciónExtraordinarias-B';
  const m=db.specials&&db.specials[key];
  if(!m||!Array.isArray(m.headers)||!Array.isArray(m.rows)) return;
  const oldHeaders=[...m.headers];
  const remove=new Set(['Avance','Notas']);
  const keep=oldHeaders.map((h,i)=>({h,i})).filter(x=>!remove.has(x.h));
  let changed=keep.length!==oldHeaders.length;
  m.rows=m.rows.map(row=>{
    let r=keep.map(x=>row[x.i]??'');
    const ci=keep.findIndex(x=>x.h==='Centro');
    const fi=keep.findIndex(x=>x.h==='Fecha');
    if(ci>=0){
      const map={'CEIP Castelao':'CEIP Alfonso D. Rodríguez Castelao','CEIP da Ramallosa':'CEIP A Ramallosa'};
      if(map[r[ci]]){r[ci]=map[r[ci]];changed=true;}
    }
    if(fi>=0&&typeof r[fi]==='string'&&r[fi].includes('T')){r[fi]=r[fi].slice(0,10);changed=true;}
    return r;
  });
  m.headers=keep.map(x=>x.h);
  if(changed) normalizedCenters=true;
})();
function save(){if(window.__vaultPersist)window.__vaultPersist(db);}
const ORIENTATION_CATALOG_2026={};
function migrateSpecialTables(){
 if(!db.specials)return false;
 let changed=false;
 const pac=db.specials['PAC - ILS'];
 if(pac&&pac.headers?.[0]==='codcentro'){
  pac.legacyPacSnapshot={headers:[...pac.headers],rows:pac.rows.map(row=>[...row])};
  pac.rows=pac.rows.map(row=>[row[1]??'',row[5]??'',row[7]??'',row[6]??'','']);
  pac.headers=['CENTRO','PAC','Alumnado','Compartido','Días asistencia'];
  changed=true;
 }
 if(pac){const i=pac.headers?.indexOf('PAC');if(i>=0){pac.headers[i]='Auxiliar cuidador';changed=true;}}
 const extra=db.specials['EscolarizaciónExtraordinarias-B'];
 if(extra&&Array.isArray(extra.headers)){
  const names={'Centro':'CENTRO','Fecha':'Fecha sol','Alumno':'Alumnado','Curso solicitado':'Curso','Curso sol':'Curso','Centro origen':'Origen','Modelo ED550C':'ED550C','Firmada por ambos progenitores':'Firmada','Documentos de identidad':'Identidad','Documentos de filiación':'Filiación','Documentación justificativa':'Documentación'};
  extra.headers=extra.headers.map(h=>{if(names[h]){changed=true;return names[h]}return h});
  const dateIndex=extra.headers.indexOf('Fecha sol');
  if(dateIndex>=0&&!extra.headers.includes('Fecha res')){
   extra.headers.splice(dateIndex+1,0,'Fecha res');
   extra.rows.forEach(row=>row.splice(dateIndex+1,0,''));
   changed=true;
  }
 }
 const inferior=db.specials['EscolarizaciónCursoInferior'];
 if(inferior&&Array.isArray(inferior.headers)){
  const removeIndex=inferior.headers.indexOf('Columna 6');
  if(removeIndex>=0){
   inferior.legacyCursoInferiorSnapshot={headers:[...inferior.headers],rows:inferior.rows.map(row=>[...row])};
   inferior.headers.splice(removeIndex,1);
   inferior.rows.forEach(row=>row.splice(removeIndex,1));
   changed=true;
  }
  const centerIndex=inferior.headers.indexOf('CENTRO');
  if(centerIndex>=0&&!inferior.headers.includes('Fecha-sol')&&!inferior.headers.includes('Fecha sol')){
   inferior.headers.splice(centerIndex+1,0,'Fecha sol','Fecha res');
   inferior.rows.forEach(row=>row.splice(centerIndex+1,0,'',''));
   changed=true;
  }
  inferior.headers=inferior.headers.map(header=>{
   if(header==='CENTRO')return header;
   if(header==='Fecha-sol'||header==='Fecha-res'){
    changed=true;
    return header.replace('-',' ');
   }
   const renamed=header.charAt(0).toLocaleUpperCase('es')+header.slice(1).toLocaleLowerCase('es');
   if(renamed!==header)changed=true;
   return renamed;
  });
  const drop=inferior.headers.map((header,i)=>['Columna 7','Data comunicación a ie'].includes(header)?i:-1).filter(i=>i>=0);
  if(drop.length){
   inferior.legacyCursoInferiorRemovedColumns={headers:[...inferior.headers],rows:inferior.rows.map(row=>[...row])};
   drop.reverse().forEach(i=>{
    inferior.headers.splice(i,1);
    inferior.rows.forEach(row=>row.splice(i,1));
   });
   changed=true;
  }
 }
 const orientation=db.specials['Dep. Orientación'];
 if(orientation&&Array.isArray(orientation.headers)){
  const type=orientation.headers.indexOf('DO/OC/CC');
  if(type>=0){orientation.headers[type]='Tipo';changed=true;}
  const i=orientation.headers.indexOf('codcentro');
  if(i>=0){
   orientation.headers[i]='CENTRO';
   orientation.rows.forEach(row=>{const c=db.centers.find(center=>String(center.code)===String(row[i]??''));if(c)row[i]=c.name});
   changed=true;
  }
  const units=orientation.headers.indexOf('nº unidades');
  if(units>=0){orientation.headers[units]='Unidades';changed=true;}
  const alIndex=orientation.headers.indexOf('AL');
  orientation.headers=orientation.headers.map((header,i)=>{
   if(header==='Autorizados'){changed=true;return i<alIndex?'PTC':'ALC';}
   if(header==='PT AT.  PREFERENTE'){changed=true;return 'PTC';}
   if(header==='AL AT.  PREFERENTE'){changed=true;return 'ALC';}
   return header;
  });
  const orColumns=orientation.headers.map((header,i)=>/^O\s*R(?:\b|[-–])/i.test(header)?i:-1).filter(i=>i>=0);
  if(orColumns.length){
   orientation.legacyORColumns={headers:[...orientation.headers],rows:orientation.rows.map(row=>[...row])};
   orColumns.reverse().forEach(i=>{orientation.headers.splice(i,1);orientation.rows.forEach(row=>row.splice(i,1));});
   changed=true;
  }
 }
 const religion=db.specials['Relixión'];
 if(religion&&Array.isArray(religion.headers)){
  const code=religion.headers.indexOf('codcentro');
  if(code>=0){
   religion.legacyReligionSnapshot={headers:[...religion.headers],rows:religion.rows.map(row=>[...row])};
   religion.headers.splice(code,1);
   religion.rows.forEach(row=>row.splice(code,1));
   changed=true;
  }
  const center=religion.headers.findIndex(header=>header.trim()==='CENTRO');
  if(center>=0&&religion.headers[center]!=='CENTRO'){religion.headers[center]='CENTRO';changed=true;}
 }
 return changed;
}
function applyOrientationCatalog(){
 const m=db.specials?.['Dep. Orientación'];if(!m||m.catalog2026Applied)return false;
 const fields=['CENTRO','Unidades','PT','AL','PTC','ALC'];
 const indexes=fields.map(field=>m.headers.indexOf(field));if(indexes.some(i=>i<0))return false;
 const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9]/g,'');
 let matched=0;
 for(const [code,values] of Object.entries(ORIENTATION_CATALOG_2026)){
  const center=db.centers.find(c=>String(c.code)===code);if(!center)continue;
  let row=m.rows.find(r=>normalize(r[indexes[0]])===normalize(center.name)||String(r[indexes[0]]??'')===code);
  if(!row){row=Array(m.headers.length).fill('');m.rows.push(row);}
  row[indexes[0]]=center.name;
  values.forEach((value,i)=>{row[indexes[i+1]]=value});
  matched++;
 }
 if(!matched)return false;
 m.catalog2026Applied=true;
 m.catalog2026Source='Catalogo_Xorn_CO_26.pdf';
 return true;
}
const normalizedSpecialTables=migrateSpecialTables();
const catalogImported=applyOrientationCatalog();
if(normalizedCenters||normalizedSpecialTables||catalogImported)save();
