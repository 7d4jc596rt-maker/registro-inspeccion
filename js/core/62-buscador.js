/* ======================= VERSIÓN 4.16: BUSCADOR GENERAL DE INICIO =======================
   Campo de búsqueda en Inicio que busca un texto en todos los apartados de la aplicación:
   centros (datos, otros datos, dotación, ficha oficial), actuaciones, visitas, notas del centro,
   peticiones y requerimientos, consultas y procedimientos, otros datos, notas de reuniones,
   bibliografía, contactos y supervisiones.
   - No distingue mayúsculas ni tildes.
   - En los números (teléfonos, códigos) no tiene en cuenta espacios, puntos ni guiones entre cifras:
     «981 54 12 00» encuentra «981541200» y al revés.
   - Cada resultado indica el apartado, el campo y un fragmento con el texto encontrado; al pulsarlo
     se abre el registro correspondiente.
   ======================================================================================= */
let gsQuery='',gsTimer=null;
const GS_SKIP=new Set(['id','centerId','seedId','createdAt','updatedAt','creado','modificado','thumb','thumbnail','data','src','blob','iv','hash','key','attKey','handle','mime','size','w','h','width','height','origen','source']);
const GS_LABELS={name:'Nombre',code:'Código',tipo:'Tipo',address:'Dirección postal',town:'Concello',phone:'Teléfono',email:'Correo electrónico',email2:'Otro correo',director:'Dirección',directorExt:'Extensión',directorMobile:'Móvil de dirección',directorObs:'Observaciones de dirección',head:'Jefatura de estudios',headPrimary:'Jefatura de estudios · Primaria',headSecondary:'Jefatura de estudios · Secundaria',headAdults:'Jefatura de estudios · Adultos',secretary:'Secretaría',vice:'Vicedirección',orientacion:'Orientación',conserje:'Conserje',comedor:'Comedor',gestion:'Gestión',comensales:'Nº comensales',obs:'Observaciones',adaptaciones:'Adaptaciones curriculares',center:'Centro',student:'Persona implicada',subject:'Asunto',details:'Detalles',action:'Actuación realizada',updates:'Actualizaciones',text:'Texto',title:'Título',titulo:'Título',contenido:'Contenido',notes:'Observaciones',observaciones:'Observaciones',apuntes:'Apuntes',etiquetas:'Etiquetas',temas:'Temas',normativa:'Normativa',documentos:'Documentos',nombre:'Nombre',descripcion:'Descripción',mode:'Medio',date:'Fecha',type:'Tipo',fichaOficial:'Ficha oficial',dotacion:'Dotación',caracteristicas:'Características (antiguas)'};
function gsLabel(path){const k=[...path].reverse().find(p=>typeof p==='string'&&isNaN(p));return GS_LABELS[k]||k||''}
/* Normaliza un texto y guarda, para cada carácter normalizado, su posición en el texto original */
function gsNorm(s){
 s=String(s??'');let out='',map=[];
 for(let i=0;i<s.length;i++){
  const ch=s[i];
  if(/[\s.\-\/]/.test(ch)&&/\d/.test(s[i-1]||'')){let j=i;while(j<s.length&&/[\s.\-\/]/.test(s[j]))j++;if(/\d/.test(s[j]||'')){i=j-1;continue}}
  const n=ch.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  for(const c of n){out+=c;map.push(i)}
 }
 return {out,map};
}
function gsQnorm(q){return gsNorm(String(q).trim().replace(/\s+/g,' ')).out}
/* Recorre un objeto y devuelve los textos que contienen la búsqueda: [{label,snippet}] */
function gsScan(obj,q,path=[],hits=[]){
 if(hits.length>=3||obj===null||obj===undefined)return hits;
 if(typeof obj==='string'||typeof obj==='number'){
  const s=String(obj);if(s.length>200000||/^data:/.test(s))return hits;
  const {out,map}=gsNorm(s),k=out.indexOf(q);
  if(k>=0){
   const a=map[k],b=(map[k+q.length-1]??a)+1;
   const from=Math.max(0,a-60),to=Math.min(s.length,b+60);
   const snippet=(from>0?'…':'')+esc(s.slice(from,a))+'<mark>'+esc(s.slice(a,b))+'</mark>'+esc(s.slice(b,to))+(to<s.length?'…':'');
   hits.push({label:gsLabel(path),snippet:snippet.replace(/\n+/g,' · ')});
  }
  return hits;
 }
 if(Array.isArray(obj)){obj.forEach((v,i)=>gsScan(v,q,[...path,String(i)],hits));return hits}
 if(typeof obj==='object'){for(const [k,v] of Object.entries(obj)){if(GS_SKIP.has(k)||/^legacy/i.test(k)||/^migrated/i.test(k))continue;gsScan(v,q,[...path,k],hits)}}
 return hits;
}
function gsCenterByName(name){const n=String(name||'').trim().toLocaleLowerCase('es');return db.centers.find(c=>c.name.trim().toLocaleLowerCase('es')===n||String(c.code)===String(name||'').trim())}
function gsRun(query){
 const q=gsQnorm(query);if(q.length<2)return [];
 const groups=[];
 const add=(section,items)=>{if(items.length)groups.push({section,items})};
 const mk=(list,fn)=>list.map(x=>{const r=fn(x);if(!r)return null;const hits=gsScan(r.obj,q);return hits.length?{...r,hits}:null}).filter(Boolean);
 const cname=id=>db.centers.find(c=>c.id===id)?.name||'';
 // Centros: datos, otros datos, dotación y ficha oficial, cada uno por separado
 const centerItems=[];
 const DATA_KEYS=['name','code','tipo','address','town','phone','email','email2','director','directorExt','directorMobile','directorObs','head','headPrimary','headSecondary','headAdults','secretary','vice','orientacion','conserje'];
 db.centers.forEach(c=>{
  const data={};DATA_KEYS.forEach(k=>{if(c[k]!==undefined)data[k]=c[k]});
  const otros={comedor:c.comedor,adaptaciones:c.adaptaciones?{infantil:c.adaptaciones.infantil,primaria:c.adaptaciones.primaria,eso:c.adaptaciones.eso}:undefined};
  const rest={};Object.entries(c).forEach(([k,v])=>{if(!DATA_KEYS.includes(k)&&!['comedor','adaptaciones','fichaOficial','id'].includes(k)&&v&&typeof v==='object')rest[k]=v});
  [[data,'datos','Datos del centro'],[otros,'otros','Otros datos'],[rest,'dotacion','Dotación'],[{fichaOficial:c.fichaOficial},'ficha','Ficha oficial']].forEach(([obj,tab,part])=>{
   const hits=gsScan(obj,q);if(hits.length)centerItems.push({title:c.name,sub:part,hits,open:`gsOpenCenter('${c.id}','${tab}')`});
  });
 });
 add('Centros',centerItems);
 add('Actuaciones',mk(db.actions,a=>({obj:{center:a.center,student:a.student,subject:a.subject,details:a.details,action:a.action,mode:a.mode,updates:(a.updates||[]).map(u=>u.text),pdfs:(a.pdfs||[]).map(p=>p.name)},title:a.subject||'(sin asunto)',sub:[date(a.date),a.center,a.finalizada?'Finalizada':'Pendiente'].filter(Boolean).join(' · '),open:`editAction('${a.id}')`})));
 add('Visitas',mk(db.visits,v=>({obj:Object.fromEntries(Object.entries(v).filter(([k])=>!['images','pdfs'].includes(k))),title:v.center||'Visita',sub:date(v.date),open:`editVisit('${v.id}')`})));
 add('Notas del centro',mk(db.centerNotes||[],n=>({obj:{title:n.title,text:n.text},title:n.title||'Nota',sub:[cname(n.centerId),n.date?date(n.date):''].filter(Boolean).join(' · '),open:`gsOpenCenter('${n.centerId}','notas')`})));
 add('Peticiones y requerimientos',mk(db.petitionsRequirements||[],x=>({obj:Object.fromEntries(Object.entries(x).filter(([k])=>!['type','finalizada'].includes(k))),title:(x.type||'')+(x.subject?' · '+x.subject:''),sub:[cname(x.centerId),date(x.date)].filter(Boolean).join(' · '),open:`editCenterRequest('${x.id}','${x.centerId}')`})));
 add('Consultas y procedimientos',mk(db.consultas||[],x=>({obj:x,title:x.titulo||x.title||'Consulta',sub:x.tipo||'',open:`gsGo('consultas',()=>consultaView('${x.id}'))`})));
 // Otros datos (tablas): cada registro, con su centro
 const spItems=[];
 Object.entries(db.specials||{}).forEach(([name,m])=>{
  if(!m||!Array.isArray(m.rows)||name.trim()==='Profesorado-FALTAS'||name==='Actuacións')return;
  const ci=name==='EOE_At.Dom_Cambio mod_Flexibili'?1:0;
  m.rows.forEach((row,ri)=>{
   const obj={};(m.headers||[]).forEach((h,i)=>{obj[h||('Campo '+(i+1))]=row[i]});
   const hits=gsScan(obj,q);if(!hits.length)return;
   const c=gsCenterByName(row[ci]);
   spItems.push({title:specialLabel(name),sub:String(row[ci]??''),hits,open:c?`gsOpenCenter('${c.id}','otros')`:`gsGo('especiales',()=>showSpecialSection(${esc(JSON.stringify(name))}))`});
  });
 });
 add('Otros datos',spItems);
 add('Notas reuniones',mk(db.reuniones||[],x=>({obj:x,title:x.titulo||'Reunión',sub:[x.tipo,x.fecha?date(x.fecha):''].filter(Boolean).join(' · '),open:`gsGo('reuniones',()=>reunionView('${x.id}'))`})));
 add('Bibliografía',mk(db.bibliografia||[],x=>({obj:x,title:x.titulo||'Lectura',sub:[x.tipo,x.anio].filter(Boolean).join(' · '),open:`gsGo('bibliografia',()=>biblioView('${x.id}'))`})));
 add('Contactos',mk(db.contacts||[],x=>({obj:{name:x.name,phone:x.phone,email:x.email,notes:x.notes},title:x.name||'Contacto',sub:x.phone||x.email||'',open:`gsGo('contactos',()=>editContact('${x.id}'))`})));
 add('Supervisiones',mk(db.supervisions||[],x=>({obj:x,title:x.center||x.centro||x.tool||'Supervisión',sub:x.date?date(x.date):'',open:`nav('supervisiones')`})));
 return groups;
}
function gsGo(view,fn){nav(view);try{fn()}catch(e){console.warn(e)}}
function gsOpenCenter(id,tab){nav('centros');centerDetail(id,tab)}
function homeSearchBlock(){
 return `<div class="panel home-search"><div class="panelbody"><div class="home-search-row"><input id="gsInput" class="input" type="search" placeholder="Buscar en toda la aplicación: un nombre, un teléfono, un correo, una palabra…" aria-label="Buscar en toda la aplicación" value="${esc(gsQuery)}" oninput="gsInput(this.value)" onkeydown="if(event.key==='Escape'){this.value='';gsInput('')}"></div><div id="gsResults" class="gs-results" aria-live="polite">${gsResultsHTML(gsQuery)}</div></div></div>`;
}
function gsInput(v){gsQuery=v;clearTimeout(gsTimer);gsTimer=setTimeout(()=>{const box=document.getElementById('gsResults');if(box)box.innerHTML=gsResultsHTML(gsQuery)},200)}
const gsOpenGroups=new Set();
function gsResultsHTML(query){
 const q=String(query||'').trim();if(!q)return '';
 if(gsQnorm(q).length<2)return '<p class="muted gs-note">Escribe al menos dos caracteres.</p>';
 const groups=gsRun(q),total=groups.reduce((s,g)=>s+g.items.length,0);
 if(!total)return `<p class="muted gs-note">No se ha encontrado «${esc(q)}» en ningún apartado.</p>`;
 const LIMIT=25;
 return `<p class="muted gs-note">${total} ${total===1?'resultado':'resultados'} en ${groups.length} ${groups.length===1?'apartado':'apartados'}.</p>`+groups.map(g=>{
  const all=gsOpenGroups.has(g.section),shown=all?g.items:g.items.slice(0,LIMIT);
  return `<div class="gs-group"><h3 class="home-sub">${esc(g.section)} <span class="pill">${g.items.length}</span></h3>${shown.map(it=>`<button type="button" class="gs-item" onclick="${it.open}"><span class="gs-title">${esc(it.title)}${it.sub?` <span class="muted">· ${esc(it.sub)}</span>`:''}</span>${it.hits.map(h=>`<span class="gs-hit">${h.label?`<b>${esc(h.label)}:</b> `:''}${h.snippet}</span>`).join('')}</button>`).join('')}${!all&&g.items.length>LIMIT?`<button type="button" class="btn small" onclick="gsOpenGroups.add(${esc(JSON.stringify(g.section))});document.getElementById('gsResults').innerHTML=gsResultsHTML(gsQuery)">Ver los ${g.items.length} resultados</button>`:''}</div>`;
 }).join('');
}
