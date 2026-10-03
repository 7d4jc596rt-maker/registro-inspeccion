/* ---------- Importación de la carpeta completa de Notion ---------- */
const stripNotionId=n=>String(n).replace(/\.(md|csv)$/i,'').replace(/_all$/i,'').replace(/\s+[0-9a-f]{32}$/i,'').trim();
const normTitle=s=>normTxt(s).replace(/[^a-z0-9]/g,'');
const baseName=p=>p.split('/').pop();
const dirName=p=>p.split('/').slice(0,-1).join('/');
function cleanNotionMd(text){
 let L=String(text).replace(/\r/g,'').split('\n'),title='';
 if(L[0]&&/^#\s+/.test(L[0])){title=L[0].replace(/^#\s+/,'').trim();L=L.slice(1)}
 while(L.length&&!L[0].trim())L.shift();
 const props={};let i=0;
 while(i<L.length&&i<30&&/^[^:\n\[\]]{1,40}:\s/.test(L[i])&&!/^https?:/i.test(L[i])){const m=L[i].match(/^([^:]{1,40}):\s*(.*)$/);props[normTxt(m[1])]=m[2].trim();i++}
 if(i&&(i===L.length||!L[i].trim()))L=L.slice(i);
 const body=L.filter(l=>!/^\s*\[[^\]]*\]\([^)]*\.(md|csv)\)\s*$/i.test(l))
  .map(l=>l.replace(/\[([^\]]*)\]\([^)]*\.(md|csv)\)/gi,'$1').replace(/\[([^\]]*)\]\((https?:[^)]*)\)/gi,'$1 ($2)'))
  .join('\n').replace(/\n{3,}/g,'\n\n').trim();
 return {title,props,body};
}
function colIndex(headers,names){
 const h=headers.map(x=>normTxt(x));
 for(const n of names){const i=h.indexOf(n);if(i>=0)return i}
 for(const n of names){const i=h.findIndex(x=>x.includes(n));if(i>=0)return i}
 return -1;
}
function importNotionFolderStart(){const i=document.getElementById('notionFolder');i.value='';i.click()}
async function importNotionFolderFiles(e){
 const files=[...e.target.files];if(!files.length)return;
 try{
  const plan=await buildNotionPlan(files);if(!plan)return;
  window.__notionPlan=plan;
  openModal('Importar carpeta de Notion',notionPlanHTML(plan),runNotionPlan);
  document.getElementById('modalSave').textContent='Importar';
 }catch(err){console.error(err);alert('No se pudo leer la carpeta: '+(err.message||err))}
}
/* --- Lectura de tablas Markdown de Notion (celdas que pueden ocupar varias líneas) --- */
function mdCell(v){return String(v||'').replace(/<br\s*\/?>/gi,'\n').replace(/\*\*/g,'').replace(/\\([\\*_|#\[\]()-])/g,'$1').split('\n').map(l=>l.trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim()}
function mdTableAt(L,i){
 const rows=[];let buf=null;
 for(;i<L.length;i++){
  const t=L[i].trim();
  if(buf===null){if(!t.startsWith('|'))break;buf=t}else buf+='\n'+L[i];
  const b=buf.trim();
  if(b.length>1&&b.endsWith('|')&&(b.match(/\|/g)||[]).length>=2){
   if(!/^\|[\s:|-]+\|$/.test(b.replace(/\n/g,''))){const cells=b.slice(1,-1).split('|').map(mdCell);rows.push(cells)}
   buf=null;
  }
 }
 if(buf!==null){const b=buf.trim().replace(/^\|/,'');rows.push(b.split('|').map(mdCell))}
 return {rows,end:i};
}
const COURSE_LINE=/^\s*(?:#+\s*)?(?:\*\*)?\s*(?:curso\s*)?(\d{4}\s*[\/-]\s*(?:\d{4}|\d{2}))\s*(?:\*\*)?\s*:?\s*$/i;
function charKey(label){
 const n=normTitle(label);
 if(!n)return '';
 if(n.startsWith('linea')||n.includes('unidades'))return 'linea';
 if(n.includes('alumn'))return 'alumnos';
 if(n.includes('profes'))return 'profesores';
 if(n.startsWith('transporte'))return 'transporte';
 if(n.startsWith('comedor'))return 'comedor';
 if(n==='ptyal'||n==='ptal'||n==='ptyals')return 'ptal';
 if(n==='pt')return 'pt';
 if(n==='al')return 'al';
 if(n.includes('cuidador'))return 'cuidadoras';
 if(n.startsWith('orientac'))return 'orientacion';
 if(n.startsWith('varios')||n.startsWith('otros'))return 'varios';
 return '';
}
function splitPtAl(v){
 const t=String(v||'');const m=t.match(/(^|\n)[\s•·*-]*AL\s*:/i);
 if(!m)return {pt:t.replace(/^\s*PT\s*:\s*/i,'').trim(),al:''};
 const at=m.index+m[1].length;
 return {pt:t.slice(0,at).replace(/^\s*PT\s*:\s*/i,'').trim(),al:t.slice(at).replace(/^[\s•·*-]*AL\s*:\s*/i,'').trim()};
}
/* Archivo «Características del centro…»: una tabla por curso y texto libre debajo */
function parseCharacteristicsMd(text){
 let L=String(text).replace(/\r/g,'').split('\n');
 if(L[0]&&/^#\s+/.test(L[0]))L=L.slice(1);
 const out={},order=[];let course='';
 const blk=k=>{if(!out[k]){out[k]={fields:{},text:[]};order.push(k)}return out[k]};
 for(let i=0;i<L.length;i++){
  const line=L[i],t=line.trim();
  const cm=t.match(COURSE_LINE);
  if(cm&&normCourse(cm[1])){course=normCourse(cm[1]);blk(course);continue}
  if(t.startsWith('|')){
   const {rows,end}=mdTableAt(L,i);i=end-1;const b=blk(course);
   for(const r of rows){
    if(r.length<2)continue;const label=r[0],val=r.slice(1).join(' | ').trim();if(!label||!val)continue;
    const k=charKey(label);
    if(k==='ptal'){const x=splitPtAl(val);if(x.pt)b.fields.pt=x.pt;if(x.al)b.fields.al=x.al}
    else if(k)b.fields[k]=b.fields[k]?b.fields[k]+'\n'+val:val;
    else b.fields.varios=(b.fields.varios?b.fields.varios+'\n':'')+label+': '+val;
   }
   continue;
  }
  if(/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(t))continue;
  blk(course).text.push(line.replace(/\*\*/g,'').replace(/\[([^\]]*)\]\([^)]*\.(md|csv)\)/gi,'$1'));
 }
 const res=[];
 for(const k of order){
  const b=out[k],txt=b.text.join('\n').replace(/\n{3,}/g,'\n\n').trim();
  if(!Object.keys(b.fields).length&&!txt)continue;
  res.push({course:k,fields:b.fields,text:txt});
 }
 const known=res.map(r=>r.course).filter(Boolean).sort();
 res.forEach(r=>{if(!r.course)r.course=known.length?known[known.length-1]:currentCourse()});
 return res;
}
/* Página del centro: propiedades, tabla «Personal» y a qué sección pertenece cada tabla enlazada */
function parseCenterPage(text,tipo){
 const L=String(text).replace(/\r/g,'').split('\n');
 const m=cleanNotionMd(text);
 const res={props:m.props,staff:{},otherStaff:[],sections:{},rest:''};
 let heading='';const keep=[];
 for(let i=0;i<L.length;i++){
  const t=L[i].trim();
  if(i===0&&/^#\s+/.test(t))continue;
  const h=t.match(/^#{1,6}\s+(.*)$/);if(h){heading=h[1];continue}
  const lk=[...t.matchAll(/\]\(([^)]+\.csv)\)/gi)];
  if(lk.length){for(const x of lk){let pth=x[1];try{pth=decodeURIComponent(pth)}catch(e){}const id=(pth.match(/([0-9a-f]{32})(?:_all)?\.csv$/i)||[])[1];if(id)res.sections[id.toLowerCase()]=normTitle(heading).includes('visita')?'visitas':'actuaciones'}continue}
  if(/^\[[^\]]*\]\([^)]*\.md\)$/i.test(t))continue;
  if(t.startsWith('|')){
   const {rows,end}=mdTableAt(L,i);i=end-1;
   const head=(rows[0]||[]).map(normTitle);
   if(head.some(x=>x.startsWith('cargo'))){
    const col=(names,def)=>{const j=head.findIndex(x=>names.some(n=>x.startsWith(n)));return j>=0?j:def};
    const iC=col(['cargo'],0),iN=col(['nombre'],1),iT=col(['telf','tel','ext'],-1),iM=col(['movil','mvil'],-1),iO=col(['obs'],-1);
    for(const r of rows.slice(1)){
     const g=j=>j>=0?(r[j]||'').trim():'';
     const role=normTitle(g(iC)),name=g(iN),tel=g(iT),mov=g(iM),obs=g(iO);
     if(!role)continue;
     if(role.startsWith('direct')){res.staff.director=name;res.staff.directorExt=tel.replace(/^\s*ext\.?\s*/i,'');res.staff.directorMobile=mov;res.staff.directorObs=obs;continue}
     const extra=[tel&&(/^\s*ext/i.test(tel)?tel:'tel. '+tel),mov&&'móvil '+mov,obs].filter(Boolean).join('; ');
     const val=name&&extra?`${name} (${extra})`:(name||extra);if(!val)continue;
     const key=role.startsWith('jefe')||role.startsWith('jefat')?(tipo==='IES'?'headSecondary':'headPrimary'):role.startsWith('secretar')?'secretary':role.startsWith('vicedir')?'vice':role.startsWith('orientac')||role.startsWith('orientador')?'orientacion':role.startsWith('conserj')?'conserje':'';
     if(key)res.staff[key]=val;else res.otherStaff.push(`${g(iC)}: ${val}`);
    }
    continue;
   }
   keep.push(...rows.map(r=>r.join(' · ')));continue;
  }
  if(/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(t))continue;
  keep.push(L[i]);
 }
 // quitar las líneas de propiedades del principio
 let k=keep;while(k.length&&(!k[0].trim()||/^[^:\n\[\]]{1,40}:\s/.test(k[0])))k=k.slice(1);
 res.rest=k.join('\n').replace(/\[([^\]]*)\]\([^)]*\.(md|csv)\)/gi,'$1').replace(/\n{3,}/g,'\n\n').trim();
 if(res.otherStaff.length)res.rest=(res.rest?res.rest+'\n\n':'')+'Otro personal (Notion):\n'+res.otherStaff.join('\n');
 return res;
}
const MONTHS_ES=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
async function buildNotionPlan(files){
 const map=new Map();files.forEach(f=>map.set(f.webkitRelativePath||f.name,f));
 const paths=[...map.keys()],depth=p=>p.split('/').length;
 const csvs=paths.filter(p=>/\.csv$/i.test(p));
 if(!csvs.length){alert('En esa carpeta no hay ningún CSV exportado de Notion.');return null}
 const minD=Math.min(...csvs.map(depth)),top=csvs.filter(p=>depth(p)===minD);
 const rootCsv=top.find(p=>/_all\.csv$/i.test(p))||top[0];
 const rootTitle=stripNotionId(baseName(rootCsv));
 const dbFolder=(dirName(rootCsv)?dirName(rootCsv)+'/':'')+rootTitle;
 const rows=parseCSV(await map.get(rootCsv).text());
 if(rows.length<2){alert('El CSV principal no tiene filas.');return null}
 const H=rows[0].map(h=>String(h).trim());
 const ci={tipo:colIndex(H,['tipo']),nombre:colIndex(H,['nombre','name']),code:colIndex(H,['codigo','cod','code']),town:colIndex(H,['localidad','concello','municipio','ayuntamiento','localid']),phone:colIndex(H,['telf','telefono','tlf','phone']),email:colIndex(H,['correo','email','mail']),email2:colIndex(H,['correo otro','otro correo','correo 2','email 2'])};
 if(ci.email2===ci.email)ci.email2=-1;
 if(ci.nombre<0)ci.nombre=0;
 const inside=paths.filter(p=>p.startsWith(dbFolder+'/'));
 const childDirs=[...new Set(inside.map(p=>p.slice(dbFolder.length+1).split('/')).filter(s=>s.length>1).map(s=>s[0]))];
 const plan={rootTitle,centers:[],attachments:0};
 const g=(r,i)=>i>=0?cleanNotion(r[i]??''):'';
 for(const r of rows.slice(1)){
  const title=g(r,ci.nombre);if(!title)continue;
  const tipo=g(r,ci.tipo),code=g(r,ci.code).replace(/\s/g,'');
  const entry={title,tipo,code,name:[tipo,title].filter(Boolean).join(' '),town:g(r,ci.town),phone:g(r,ci.phone),email:g(r,ci.email),email2:g(r,ci.email2),staff:{},chars:{},actions:[],visits:[],notes:[],include:!!(tipo||code)};
  const nt=normTitle(title);
  const dir=childDirs.find(d=>normTitle(d)===nt)||childDirs.find(d=>normTitle(d).startsWith(nt)||nt.startsWith(normTitle(d)));
  const pageMd=inside.find(p=>dirName(p)===dbFolder&&/\.md$/i.test(p)&&normTitle(stripNotionId(baseName(p)))===nt);
  let sections={};
  if(pageMd){
   const pg=parseCenterPage(await map.get(pageMd).text(),tipo);
   sections=pg.sections;entry.staff=pg.staff;
   if(!entry.email2)entry.email2=pg.props['correo otro']||pg.props['otro correo']||'';
   if(pg.rest)entry.notes.push({title:'Página del centro en Notion',date:'',text:pg.rest});
  }
  if(dir){
   const base=dbFolder+'/'+dir+'/';
   const own=inside.filter(p=>p.startsWith(base));
   plan.attachments+=own.filter(p=>!/\.(md|csv)$/i.test(p)).length;
   const mds=own.filter(p=>/\.md$/i.test(p)),used=new Set();
   const isChar=p=>normTitle(stripNotionId(baseName(p))).startsWith('caracteristicasdelcentro');
   // Características del centro, por curso
   for(const p of mds.filter(isChar)){
    used.add(p);
    for(const b of parseCharacteristicsMd(await map.get(p).text())){
     const f={...b.fields};
     if(f.orientacion){if(!entry.charOrient||b.course>entry.charOrient.course)entry.charOrient={course:b.course,v:f.orientacion};delete f.orientacion}
     if(Object.keys(f).length)entry.chars[b.course]={...(entry.chars[b.course]||{}),...f};
     if(b.text)entry.notes.push({title:`Características ${b.course} · observaciones`,date:'',text:b.text});
    }
   }
   let dbCsvs=own.filter(p=>/\.csv$/i.test(p));
   dbCsvs=dbCsvs.filter(p=>/_all\.csv$/i.test(p)||!dbCsvs.includes(p.replace(/\.csv$/i,'_all.csv')));
   for(const cp of dbCsvs){
    const csvId=((baseName(cp).match(/([0-9a-f]{32})(?:_all)?\.csv$/i)||[])[1]||'').toLowerCase();
    const dbT=normTitle(stripNotionId(baseName(cp))),rs=parseCSV(await map.get(cp).text());if(rs.length<2)continue;
    const kind=sections[csvId]||(dbT.includes('visita')?'visitas':'actuaciones');
    const h=rs[0].map(x=>String(x).trim()),iN=Math.max(0,colIndex(h,['nombre','name','asunto','titulo']));
    const iC=kind==='visitas'?(colIndex(h,['fecha','date'])>=0?colIndex(h,['fecha','date']):colIndex(h,['creado','created'])):colIndex(h,['creado','created','fecha','date']);
    const iT=colIndex(h,['etiquetas','tags']);
    for(const row of rs.slice(1)){
     const subj=cleanNotion(row[iN]??'');if(!subj&&!row.some(v=>String(v).trim()))continue;
     const created=iC>=0?cleanNotion(row[iC]):'',tags=iT>=0?cleanNotion(row[iT]):'';
     const extras=h.map((col,i)=>i!==iN&&i!==iC&&i!==iT&&cleanNotion(row[i])?`${col}: ${cleanNotion(row[i])}`:'').filter(Boolean);
     const cand=mds.filter(p=>!used.has(p)&&normTitle(stripNotionId(baseName(p)))===normTitle(subj));
     const md=(csvId&&cand.find(p=>dirName(p).toLowerCase().includes(csvId)))||cand.find(p=>normTitle(baseName(dirName(p))).startsWith(dbT))||cand[0];
     let body='';if(md){used.add(md);body=cleanNotionMd(await map.get(md).text()).body}
     const d=parseDateAny(created),t=timeFrom(created);
     if(kind==='visitas'){
      entry.visits.push({date:d,month:d?MONTHS_ES[Number(d.slice(5,7))-1]:'',obs:[subj,body,tags?'Etiquetas: '+tags:'',extras.join('\n')].filter(Boolean).join('\n\n')});
     }else{
      entry.actions.push({date:d,time:t,createdAt:localIso(d,t),subject:subj||'(sin título)',details:[body,tags?'Etiquetas: '+tags:'',extras.join('\n')].filter(Boolean).join('\n\n')});
     }
    }
   }
   for(const p of mds){
    if(used.has(p))continue;
    const m=cleanNotionMd(await map.get(p).text());
    if(!m.body&&!m.title)continue;
    const created=m.props['creado']||m.props['created']||m.props['fecha']||'';
    entry.notes.push({title:m.title||stripNotionId(baseName(p)),date:parseDateAny(created),text:m.body});
   }
  }
  if(!entry.staff.orientacion&&entry.charOrient)entry.staff.orientacion=entry.charOrient.v;
  delete entry.charOrient;
  plan.centers.push(entry);
 }
 if(!plan.centers.length){alert('No he encontrado centros en el CSV principal.');return null}
 return plan;
}
function notionPlanHTML(plan){
 const sum=k=>plan.centers.reduce((s,c)=>s+(Array.isArray(c[k])?c[k].length:Object.keys(c[k]).length),0);
 return `<p style="margin-top:0">Base de datos: <b>${esc(plan.rootTitle)}</b>. Se han encontrado <b>${plan.centers.length}</b> filas, <b>${sum('actions')}</b> actuaciones, <b>${sum('visits')}</b> visitas, <b>${sum('chars')}</b> cursos de características y <b>${sum('notes')}</b> notas.</p>
 <div class="notice" style="margin-bottom:12px">Las actuaciones se importan como <b>finalizadas</b>, con la fecha y hora de «Creado». Las visitas van al apartado de visitas y las características, a su apartado, un bloque por curso. Si un centro ya existe (mismo código), solo se rellenan los datos que estén vacíos y no se duplica nada de lo ya importado.${plan.attachments?(plan.attachments===1?' Hay 1 adjunto (imagen, PDF…) que no se importa.':` Hay ${plan.attachments} adjuntos (imágenes, PDF…) que no se importan.`):''}</div>
 <p class="muted" style="font-size:12px">Desmarca las filas que no sean centros.</p>
 <div class="tablewrap" style="max-height:48vh"><table class="table"><thead><tr><th></th><th>Centro</th><th>Código</th><th>Actuaciones</th><th>Visitas</th><th>Características</th><th>Notas</th><th>Estado</th></tr></thead><tbody>${plan.centers.map((c,i)=>{const ex=c.code&&db.centers.some(x=>String(x.code)===c.code);const ch=Object.keys(c.chars).sort().reverse();return `<tr><td><input type="checkbox" id="np_${i}" ${c.include?'checked':''} aria-label="Importar ${esc(c.name)}"></td><td><b>${esc(c.name)}</b><br><span class="muted">${esc(c.town)}</span></td><td>${esc(c.code||'—')}</td><td>${c.actions.length}</td><td>${c.visits.length}</td><td>${ch.length?esc(ch.join(', ')):'—'}</td><td>${c.notes.length}</td><td>${ex?'<span class="pill">Ya existe</span>':'<span class="pill ok">Nuevo</span>'}</td></tr>`}).join('')}</tbody></table></div>`;
}
const NOTION_CENTER_FIELDS=['tipo','town','phone','email','code','email2','director','directorExt','directorMobile','directorObs','headPrimary','headSecondary','secretary','vice','orientacion','conserje'];
function runNotionPlan(){
 const plan=window.__notionPlan;if(!plan)return;
 let nc=0,uc=0,na=0,nv=0,nch=0,nn=0,dup=0;
 plan.centers.forEach((e,i)=>{
  if(!document.getElementById('np_'+i)?.checked)return;
  const src={...e,...e.staff};
  let c=(e.code&&db.centers.find(x=>String(x.code)===e.code))||db.centers.find(x=>normTxt(x.name)===normTxt(e.name));
  if(!c){let id=e.code||uid();if(db.centers.some(x=>x.id===id))id=uid();c={id,name:e.name,address:'',caracteristicas:{}};NOTION_CENTER_FIELDS.forEach(k=>{c[k]=src[k]||''});db.centers.push(c);db.followup[id]={};nc++}
  else{let ch=false;for(const k of NOTION_CENTER_FIELDS)if(src[k]&&!String(c[k]||'').trim()){c[k]=src[k];ch=true}if(ch)uc++}
  if(!c.caracteristicas||typeof c.caracteristicas!=='object')c.caracteristicas={};
  for(const [k,f] of Object.entries(e.chars)){
   const cur=c.caracteristicas[k];
   if(!cur){c.caracteristicas[k]={...f,source:'notion',updatedAt:nowIso()};nch++;continue}
   let ch=false;for(const [fk,fv] of Object.entries(f))if(fv&&!String(cur[fk]||'').trim()){cur[fk]=fv;ch=true}
   if(ch)nch++;else dup++;
  }
  const seen=new Set(db.actions.filter(a=>a.center===c.name).map(a=>normTxt((a.date||'')+'|'+(a.time||'')+'|'+a.subject)));
  for(const a of e.actions){
   const k=normTxt((a.date||'')+'|'+(a.time||'')+'|'+a.subject);if(seen.has(k)){dup++;continue}seen.add(k);
   db.actions.push({id:uid(),date:a.date,time:a.time,mode:'',center:c.name,student:'',subject:a.subject,details:a.details,action:'',finalizada:true,createdAt:a.createdAt||nowIso(),updatedAt:'',updates:[],source:'notion'});na++;
  }
  const seenV=new Set(db.visits.filter(v=>v.center===c.name).map(v=>normTxt((v.date||'')+'|'+String(v.obs||'').slice(0,120))));
  for(const v of e.visits){
   const k=normTxt((v.date||'')+'|'+String(v.obs||'').slice(0,120));if(seenV.has(k)){dup++;continue}seenV.add(k);
   db.visits.push({id:uid(),center:c.name,date:v.date,month:v.month,obs:v.obs,source:'notion'});nv++;
  }
  const seenN=new Set(db.centerNotes.filter(n=>n.centerId===c.id).map(n=>normTxt(n.title+'|'+n.text.slice(0,200))));
  for(const n of e.notes){
   const k=normTxt(n.title+'|'+n.text.slice(0,200));if(seenN.has(k)){dup++;continue}seenN.add(k);
   db.centerNotes.push({id:uid(),centerId:c.id,date:n.date||'',title:n.title,text:n.text,createdAt:nowIso(),updatedAt:'',source:'notion'});nn++;
  }
 });
 save();closeModal();window.__notionPlan=null;
 alert(`Importación terminada.\n\nCentros nuevos: ${nc}${uc?`\nCentros completados: ${uc}`:''}\nActuaciones importadas: ${na}\nVisitas importadas: ${nv}\nCursos de características: ${nch}\nNotas importadas: ${nn}${dup?`\nOmitidas por estar ya registradas: ${dup}`:''}`);
 nav('centros');
}
function deleteNotionImported(){
 const a=db.actions.filter(x=>x.source==='notion').length,v=db.visits.filter(x=>x.source==='notion').length,n=db.centerNotes.filter(x=>x.source==='notion').length;
 let ch=0;db.centers.forEach(c=>Object.values(c.caracteristicas||{}).forEach(o=>{if(o.source==='notion')ch++}));
 if(!a&&!v&&!n&&!ch){alert('No hay nada importado de Notion.');return}
 if(!confirm(`Se eliminarán ${a} actuaciones, ${v} visitas, ${n} notas y ${ch} cursos de características importados de Notion.\n\nNo se toca lo que hayas registrado o editado tú, ni las fichas de los centros. ¿Continuar?`))return;
 db.actions=db.actions.filter(x=>x.source!=='notion');db.visits=db.visits.filter(x=>x.source!=='notion');db.centerNotes=db.centerNotes.filter(x=>x.source!=='notion');
 db.centers.forEach(c=>{for(const [k,o] of Object.entries(c.caracteristicas||{}))if(o.source==='notion')delete c.caracteristicas[k]});
 save();alert('Hecho. Ya puedes volver a importar la carpeta de Notion.');
}
