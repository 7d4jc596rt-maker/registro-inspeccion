/* ---------- Pegar actuación preparada por Claude ---------- */
const PASTE_KEYS={'fecha':'date','fecha de la actuacion':'date','hora':'time','medio':'mode','medio de comunicacion':'mode','centro':'center','codigo':'code','codigo del centro':'code','persona implicada':'student','persona':'student','persona implicada / alumno/a':'student','alumno/a':'student','alumno':'student','alumna':'student','alumnado':'student','asunto':'subject','prioridad':'priority','detalles':'details','actuacion realizada':'action','actuacion realizada / respuesta':'action','respuesta':'action','estado':'status','finalizada':'status'};
function parsePastedAction(text){
 const out={};let cur=null;
 for(const raw of String(text).replace(/\r/g,'').split('\n')){
  if(/^\s*```/.test(raw))continue;
  const line=raw.replace(/^\s*[-*>]+\s*/,'').replace(/\*\*/g,'');
  const m=line.match(/^([A-Za-zÁÉÍÓÚÜáéíóúüñÑ/ .]{3,40}):\s*(.*)$/);
  const key=m&&PASTE_KEYS[normTxt(m[1]).replace(/\s+/g,' ')];
  if(key){cur=key;out[key]=m[2].trim();continue}
  if(!cur&&normTxt(line)==='actuacion')continue;
  if(cur==='details'||cur==='action')out[cur]=(out[cur]?out[cur]+'\n':'')+raw.trimEnd();
 }
 for(const k in out)out[k]=String(out[k]).replace(/^\n+|\s+$/g,'');
 return out;
}
function matchCenter(name,code){
 if(code){const c=db.centers.find(c=>String(c.code).trim()===String(code).trim());if(c)return c}
 const n=normTxt(name).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();if(!n)return null;
 const bare=s=>normTxt(s).replace(/[^a-z0-9 ]/g,' ').replace(/\b(ies|ceip|cpi|cra|eei|cpr|cfea|cee|cifp|eoi|epa|plurilingue|de|do|da|das|dos|o|a)\b/g,' ').replace(/\s+/g,' ').trim();
 return db.centers.find(c=>normTxt(c.name).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()===n)
  ||db.centers.find(c=>bare(c.name)&&bare(c.name)===bare(name))
  ||db.centers.filter(c=>bare(c.name)&&(bare(c.name).includes(bare(name))||bare(name).includes(bare(c.name)))).sort((a,b)=>b.name.length-a.name.length)[0]||null;
}
function claudeInstructions(){
 const centers=[...db.centers].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`- ${c.name}${c.code?` (${c.code})`:''}`).join('\n');
 return `Cuando te pida preparar una actuación para mi aplicación de registro, devuélvela SOLO en este formato, dentro de un bloque de código y sin texto adicional dentro del bloque. En «Persona implicada» y en el resto del texto escribe siempre el nombre completo (nombre y apellidos, tal como te los dé) de las personas implicadas, incluido el alumnado: no uses iniciales ni abreviaturas.

ACTUACIÓN
Fecha: DD/MM/AAAA
Medio: Correo electrónico | Teléfono | Presencial | REXEL | Otro
Centro: nombre exacto de la lista de abajo
Código: código del centro
Persona implicada: nombre completo (nombre y apellidos) o vacío
Asunto: una sola línea
Prioridad: Alta | Media | Baja (déjala vacía si no te la indico)
Detalles: texto; puede ocupar varias líneas
Actuación realizada: texto; puede ocupar varias líneas
Estado: Pendiente | Finalizada

Mis centros:
${centers||'- (todavía no hay centros registrados)'}`;
}
async function copyClaudeInstructions(){
 const text=claudeInstructions();
 try{await navigator.clipboard.writeText(text);alert('Instrucciones copiadas. Pégalas al principio de tu conversación con Claude.')}
 catch{const t=document.getElementById('pasteText');if(t){t.value=text;t.select()}alert('No se pudo copiar automáticamente: las instrucciones están en el cuadro de texto; selecciónalas y cópialas.')}
}
async function pasteFromClipboard(){
 try{const t=await navigator.clipboard.readText();document.getElementById('pasteText').value=t}
 catch{alert('El navegador no ha dado acceso al portapapeles. Mantén pulsado el cuadro de texto y elige «Pegar».');document.getElementById('pasteText').focus()}
}
function pasteActionStart(){
 openModal('Pegar actuación de Claude',`<p style="margin-top:0">Pega aquí el bloque que te ha preparado Claude. Se abrirá el formulario relleno para que lo revises antes de guardar.</p>
 <div class="toolbar"><button type="button" class="btn" onclick="pasteFromClipboard()">Pegar del portapapeles</button><button type="button" class="btn" onclick="copyClaudeInstructions()">Copiar instrucciones para Claude</button></div>
 <textarea id="pasteText" class="textarea" style="min-height:240px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px" placeholder="ACTUACIÓN&#10;Fecha: 28/09/2026&#10;Medio: Teléfono&#10;Centro: …&#10;Asunto: …&#10;Prioridad: Alta&#10;Detalles: …"></textarea>
 <p class="muted" style="font-size:12px">Las instrucciones incluyen el formato y la lista de tus centros (nombre y código) para que Claude los escriba igual que en la aplicación.</p>`,()=>{
  const p=parsePastedAction(document.getElementById('pasteText').value);
  if(!p.subject&&!p.details&&!p.action){alert('No reconozco el formato. Comprueba que el texto tenga líneas como «Asunto: …» o «Detalles: …».');return}
  const warnings=[];
  const d=p.date?parseDateAny(p.date):'';if(p.date&&!d)warnings.push(`No he entendido la fecha «${p.date}»: revísala.`);
  const time=p.time?timeFrom(p.time):'';
  let mode='',details=p.details||'';
  if(p.mode){const exact=ACTION_MODES.find(m=>normTxt(m)===normTxt(p.mode));if(exact)mode=exact;else{const [m,note]=normMode(p.mode);mode=m;if(note)warnings.push(`El medio «${p.mode}» se ha registrado como «Otro».`)}}
  const c=matchCenter(p.center,p.code);
  if((p.center||p.code)&&!c)warnings.push(`No encuentro el centro «${p.center||p.code}»: elígelo en la lista.`);
  if(p.priority&&!normPriority(p.priority)&&!/^(sin prioridad|ninguna|vacio|—|-)?$/.test(normTxt(p.priority)))warnings.push(`No he entendido la prioridad «${p.priority}»: se ha dejado vacía.`);
  newAction({date:d||todayIso(),time,mode,center:c?c.name:'',student:p.student||'',subject:p.subject||'',priority:normPriority(p.priority),details,action:p.action||'',finalizada:/finaliz|cerrad|^s[ií]$/i.test(normTxt(p.status||''))},warnings);
 });
 document.getElementById('modalSave').textContent='Continuar';
}
