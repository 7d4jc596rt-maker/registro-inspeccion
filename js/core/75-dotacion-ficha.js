/* ---------- Ficha: dotación de profesorado (CEIP/CEI/EEI/CRA públicos) ---------- */
const DOT_SPECS=[['EI','031','Educación Infantil'],['EP','038','Educación Primaria'],['FI','032','Inglés'],['FF','033','Francés'],['EM','035','Música'],['EF','034','Educación Física'],['AL','037','Audición y Lenguaje'],['PT','036','Pedagogía Terapéutica'],['DO','039','Orientación'],['ALC','037','AL compartido'],['PTC','036','PT compartido'],['OC','039','Orientación compartida']];
const DOT_TIPOS=['CEIP','CEI','EEI','CRA'];
function dotApplies(c){const t=String(c.tipo||'').toUpperCase(),m=String(c.name||'').match(/^([A-Z]{2,6})\b/);return DOT_TIPOS.includes(t)||(!!m&&DOT_TIPOS.includes(m[1]))||Object.keys(c.dotacion||{}).length>0}
function dotHasData(o){return !!o&&(o.uei!==''&&o.uei!=null||o.uep!==''&&o.uep!=null||DOT_SPECS.some(([s])=>o.cat?.[s]!=null&&o.cat[s]!==''||o.real?.[s]!=null&&o.real[s]!==''))}
function dotNum(v){const n=parseInt(v,10);return isNaN(n)?0:n}
function dotSign(n){return n>0?'+'+n:String(n)}
function dotTable(d){
 const cat=d.cat||{},real=d.real||{};
 const tc=DOT_SPECS.reduce((s,[k])=>s+dotNum(cat[k]),0),tr=DOT_SPECS.reduce((s,[k])=>s+dotNum(real[k]),0);
 const diffCell=n=>`<td class="${n<0?'dot-neg':n>0?'dot-pos':''}">${dotSign(n)}</td>`;
 const head=`<tr><th class="dot-label"></th><th>UEI</th><th>UEP</th>${DOT_SPECS.map(([s,c,l])=>`<th title="${esc(l)}">${s}<br><span>${c}</span></th>`).join('')}<th>TOTAL</th></tr>`;
 const r1=`<tr><th class="dot-label">Catálogo+Habilitadas</th><td class="dot-units">${esc(d.uei??'')}</td><td class="dot-units">${esc(d.uep??'')}</td>${DOT_SPECS.map(([s])=>`<td>${dotNum(cat[s])}</td>`).join('')}<td class="dot-total">${tc}</td></tr>`;
 const r2=`<tr><th class="dot-label">Presencia en centro</th><td class="dot-units"></td><td class="dot-units"></td>${DOT_SPECS.map(([s])=>`<td>${dotNum(real[s])}</td>`).join('')}<td class="dot-total">${tr}</td></tr>`;
 const r3=`<tr class="dot-diff"><th class="dot-label">Diferencia</th><td class="dot-units"></td><td class="dot-units"></td>${DOT_SPECS.map(([s])=>diffCell(dotNum(real[s])-dotNum(cat[s]))).join('')}${diffCell(tr-tc)}</tr>`;
 return `<div class="dot-wrap"><table class="dot-table"><thead>${head}</thead><tbody>${r1}${r2}${r3}</tbody></table></div>`;
}
function centerDotHTML(c,k){
 if(!dotApplies(c))return '';
 const d=(c.dotacion||{})[k];
 const head=`<div class="section-head dot-head"><h3 style="margin:0">Dotación de profesorado · curso ${k}</h3><div class="toolbar" style="margin:0"><button class="btn small" onclick="pasteDotStart()">Pegar datos de Claude</button><button class="btn small primary" onclick="editDot('${c.id}','${k}')">${dotHasData(d)?'Editar':'Añadir a mano'}</button></div></div>`;
 if(!dotHasData(d))return head+`<div class="empty">No hay datos de dotación de profesorado para el curso ${k}.</div>`;
 return head+dotTable(d)+`<p class="dot-legend">Unidades: XIEAlumnado (catalogadas + habilitadas). Catálogo+Habilitadas: docentes que corresponden a esas unidades según el catálogo de EI/EP (archivo CatalogoEsteban). Presencia: Persoal 6.5 reducido, solo docentes con presencia física, sin sustitutos; los compartidos con base en otro centro cuentan 1 en ALC, PTC u OC; sin Religión. <span class="dot-neg-t">Rojo</span>: menos docentes de los que corresponden. <span class="dot-pos-t">Verde</span>: más.${d.fecha?` Datos a ${date(d.fecha)}.`:''}</p>${d.notas?`<div class="note-text dot-notes">${esc(d.notas)}</div>`:''}<div style="margin-top:8px"><button class="btn small danger" onclick="deleteDot('${c.id}','${k}')">Eliminar la dotación de este curso</button></div>`;
}
function dotForm(k,d){
 const cat=d.cat||{},real=d.real||{};
 const inp=(id,v)=>`<input id="${id}" class="input dot-in" type="number" min="0" step="1" inputmode="numeric" value="${esc(v??'')}">`;
 return `<div class="formgrid"><div class="field"><label for="dotCourse">Curso escolar</label><input id="dotCourse" class="input" style="width:100%" value="${esc(k)}" placeholder="2026/27"></div><div class="field"><label for="dotFecha">Fecha de los datos</label><input id="dotFecha" class="input" type="date" value="${esc(d.fecha||'')}"></div></div>
 <div class="dot-wrap" style="margin-top:12px"><table class="dot-table dot-form"><thead><tr><th class="dot-label"></th><th>UEI</th><th>UEP</th>${DOT_SPECS.map(([s,c])=>`<th>${s}<br><span>${c}</span></th>`).join('')}</tr></thead><tbody>
 <tr><th class="dot-label">Catálogo+Habilitadas</th><td>${inp('dot_uei',d.uei)}</td><td>${inp('dot_uep',d.uep)}</td>${DOT_SPECS.map(([s])=>`<td>${inp('dotc_'+s,cat[s])}</td>`).join('')}</tr>
 <tr><th class="dot-label">Presencia en centro</th><td></td><td></td>${DOT_SPECS.map(([s])=>`<td>${inp('dotr_'+s,real[s])}</td>`).join('')}</tr></tbody></table></div>
 <div class="field full" style="margin-top:12px"><label for="dotNotas">Notas</label><textarea id="dotNotas" class="textarea" style="min-height:70px">${esc(d.notas||'')}</textarea></div>`;
}
function editDot(cid,k){
 const c=db.centers.find(x=>x.id===cid);if(!c)return;if(!c.dotacion)c.dotacion={};
 openModal(`Dotación de profesorado · ${c.name}`,dotForm(k,c.dotacion[k]||{}),()=>{
  const nk=normCourse(document.getElementById('dotCourse').value);
  if(!nk){alert('Indica el curso con el formato 2026/27.');return}
  if(nk!==k&&dotHasData(c.dotacion[nk])&&!confirm(`El curso ${nk} ya tiene datos de dotación. ¿Sustituirlos?`))return;
  const g=id=>{const v=document.getElementById(id).value.trim();return v===''?'':dotNum(v)};
  const o={uei:g('dot_uei'),uep:g('dot_uep'),cat:{},real:{},fecha:document.getElementById('dotFecha').value,notas:document.getElementById('dotNotas').value.trim(),updatedAt:nowIso()};
  DOT_SPECS.forEach(([s])=>{o.cat[s]=g('dotc_'+s);o.real[s]=g('dotr_'+s)});
  if(nk!==k)delete c.dotacion[k];
  if(dotHasData(o))c.dotacion[nk]=o;else delete c.dotacion[nk];
  centerCourseSel[cid+'.char']=nk;save();closeModal();centerDetail(cid,'caracteristicas');
 });
}
function deleteDot(cid,k){
 const c=db.centers.find(x=>x.id===cid);if(!c||!c.dotacion)return;
 if(!confirm(`¿Eliminar la dotación de profesorado del curso ${k}?`))return;
 delete c.dotacion[k];save();centerDetail(cid,'caracteristicas');
}
/* Bloques «DOTACIÓN DE PROFESORADO» preparados por Claude (uno o varios) */
function parseDotBlocks(text){
 const blocks=[];let cur=null,lastKey='';
 String(text||'').replace(/\r/g,'').replace(/^```.*$/gm,'').split('\n').forEach(line=>{
  const t=line.trim();
  if(/^DOTACI[ÓO]N( DE)? PROFESORADO/i.test(t)){cur={notas:''};blocks.push(cur);lastKey='';return}
  if(!cur)return;
  if(/^FIN$/i.test(t)){cur=null;return}
  const m=t.match(/^([^:]{2,40}):\s*(.*)$/);
  const key=m?normTxt(m[1]):'';
  const pairs=v=>{const o={};v.split(/[;,]/).forEach(p=>{const q=p.trim().match(/^([A-Za-z]{2,4})(?:\s+0\d\d(?=[\s=:]))?\s*[=:]?\s*(-?\d+)$/);if(q)o[q[1].toUpperCase()]=+q[2]});return o};
  if(m&&/^codigo/.test(key)){cur.code=m[2].replace(/\s/g,'');lastKey=''}
  else if(m&&/^centro/.test(key)){cur.center=m[2].trim();lastKey=''}
  else if(m&&/^curso/.test(key)){cur.course=normCourse(m[2]);lastKey=''}
  else if(m&&/^fecha/.test(key)){cur.fecha=parseDateAny(m[2])||'';lastKey=''}
  else if(m&&/^unidades/.test(key)){const o=pairs(m[2]);if('UEI' in o)cur.uei=o.UEI;if('UEP' in o)cur.uep=o.UEP;lastKey=''}
  else if(m&&/^catalogo/.test(key)){cur.cat=pairs(m[2]);lastKey=''}
  else if(m&&/^(presencia|reales|real)/.test(key)){cur.real=pairs(m[2]);lastKey=''}
  else if(m&&/^notas?/.test(key)){cur.notas=m[2].trim();lastKey='notas'}
  else if(lastKey==='notas'&&t)cur.notas+=(cur.notas?'\n':'')+t;
 });
 return blocks.filter(b=>b.cat||b.real);
}
function pasteDotStart(){
 openModal('Pegar dotación de profesorado',`<p style="margin-top:0">Pega aquí uno o varios bloques «DOTACIÓN DE PROFESORADO» preparados por Claude. Cada bloque se guarda en su centro (por el código) y en su curso.</p>
 <div class="toolbar"><button type="button" class="btn" onclick="pasteDotClipboard()">Pegar del portapapeles</button></div>
 <textarea id="dotPaste" class="textarea" style="min-height:220px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px" placeholder="DOTACIÓN DE PROFESORADO&#10;Código: …&#10;Curso: 2026/27&#10;Unidades: UEI 5; UEP 14&#10;Catálogo+Habilitadas: EI 6; EP 13; …&#10;Presencia en centro: EI 6; EP 12; …&#10;FIN"></textarea>`,()=>{
  const blocks=parseDotBlocks(document.getElementById('dotPaste').value);
  if(!blocks.length){alert('No reconozco el formato. El bloque debe empezar por «DOTACIÓN DE PROFESORADO» y tener las líneas «Catálogo+Habilitadas» y «Presencia en centro».');return}
  const ok=[],bad=[];
  blocks.forEach(b=>{const c=matchCenter(b.center,b.code);if(!c||!b.course){bad.push(`${b.center||b.code||'Sin centro'}${b.course?'':' (sin curso)'}`);return}ok.push([c,b])});
  if(!ok.length){alert('No encuentro en tu registro ninguno de los centros:\n'+bad.join('\n'));return}
  const repl=ok.filter(([c,b])=>dotHasData(c.dotacion?.[b.course])).map(([c,b])=>`${c.name} (${b.course})`);
  if(repl.length&&!confirm(`Ya hay datos de dotación y se sustituirán en:\n${repl.join('\n')}\n\n¿Continuar?`))return;
  ok.forEach(([c,b])=>{if(!c.dotacion)c.dotacion={};const cat={},real={};DOT_SPECS.forEach(([s])=>{cat[s]=b.cat?.[s]??0;real[s]=b.real?.[s]??0});c.dotacion[b.course]={uei:b.uei??'',uep:b.uep??'',cat,real,fecha:b.fecha||'',notas:b.notas||'',updatedAt:nowIso(),source:'claude'}});
  save();closeModal();
  alert(`Dotación guardada en ${ok.length} ${ok.length===1?'centro':'centros'}:\n${ok.map(([c,b])=>`${c.name} (${b.course})`).join('\n')}${bad.length?`\n\nNo encontrados:\n${bad.join('\n')}`:''}`);
  if(ok.length===1){centerCourseSel[ok[0][0].id+'.char']=ok[0][1].course;centerDetail(ok[0][0].id,'caracteristicas')}
 });
 document.getElementById('modalSave').textContent='Guardar';
}
async function pasteDotClipboard(){
 try{document.getElementById('dotPaste').value=await navigator.clipboard.readText()}
 catch{alert('El navegador no ha dado acceso al portapapeles. Mantén pulsado el cuadro de texto y elige «Pegar».');document.getElementById('dotPaste').focus()}
}

/* ---------- Ficha oficial del centro (importada del generador de fichas) ---------- */
function fichaCourses(c){return Object.keys(c.fichaOficial||{}).sort().reverse()}
function centerFichaHTML(c){
 const store=c.fichaOficial||{},have=fichaCourses(c);
 const courses=[...new Set([currentCourse(),...have])].sort().reverse();
 let k=centerCourseSel[c.id+'.ficha']||(store[currentCourse()]?currentCourse():(have[0]||currentCourse()));if(!courses.includes(k))k=currentCourse();
 const f=store[k];
 const sel=`<select id="cFichaCourse" class="select" aria-label="Curso escolar" onchange="setCenterCourse('${c.id}','ficha',this.value)">${courses.map(x=>`<option value="${x}" ${x===k?'selected':''}>Curso ${x}${x===currentCourse()?' (actual)':''}${store[x]?'':' · sin ficha'}</option>`).join('')}</select>`;
 const btns=f?`<div class="toolbar" style="margin:0"><button class="btn small" onclick="copyFichaText('${c.id}','${k}')">Copiar como texto</button><button class="btn small danger" onclick="deleteFicha('${c.id}','${k}')">Eliminar</button></div>`:`<button class="btn small primary" onclick="importFichasStart('${c.id}')">Importar fichas…</button>`;
 const head=`<div class="section-head"><h3 style="margin:0">Ficha oficial del centro · curso ${k}</h3>${btns}</div><div class="course-bar"><label for="cFichaCourse">Curso</label>${sel}</div>`;
 if(!f)return head+`<div class="empty">No hay ficha oficial para el curso ${k}.${have.length?` Hay ficha de ${have.join(', ')}; consúltala en el desplegable.`:' En el generador de fichas, pulsa «Xerar todas as fichas (.zip)» e impórtalo aquí o en «Datos y seguridad».'}</div>`;
 return head+`<p class="ficha-meta">Ficha con fecha ${esc(f.date||'—')} · importada el ${esc(date(String(f.importedAt||'').slice(0,10)))}${f.file?' · '+esc(f.file):''}</p><div class="ficha-body">${fichaBlocksHTML(f.blocks||[])}</div>`;
}
const FICHA_TEL=/^(\+34\s?)?[6789]\d{2}[\s-]?\d{3}[\s-]?\d{3}$/;
function fichaBlocksHTML(blocks){
 return blocks.map(b=>{
  if(b.t==='h')return `<h4 class="fo-h">${esc(b.x)}</h4>`;
  if(b.t==='s')return `<h5 class="fo-sub">${esc(b.x)}</h5>`;
  if(b.t==='p')return `<p class="${b.n?'fo-note':'fo-p'}">${esc(b.x)}</p>`;
  if(b.t==='kv')return `<dl class="fo-kv">${b.rows.map(([a,v])=>`<div><dt>${esc(a.replace(/:\s*$/,''))}</dt><dd>${fichaValueHTML(a,v)}</dd></div>`).join('')}</dl>`;
  if(b.t==='tb'){
   return `<div class="tablewrap"><table class="fo-table">${b.rows.map((r,i)=>{
    const tag=i===0&&b.head?'th':'td',tot=r.some(x=>/^total\b/i.test(x.x));
    return `<tr${tot&&i?' class="tot"':''}>${r.map(x=>`<${tag}${x.cs>1?` colspan="${x.cs}"`:''}${x.rs>1?` rowspan="${x.rs}"`:''}${tag==='td'&&/^[\d.,]+$/.test(x.x)&&!FICHA_TEL.test(x.x)?' class="num"':''}>${tag==='td'&&FICHA_TEL.test(x.x)?`<a href="tel:${esc(x.x.replace(/[^\d+]/g,''))}">${esc(x.x)}</a>`:esc(x.x)}</${tag}>`).join('')}</tr>`}).join('')}</table></div>`;
  }
  return '';
 }).join('');
}
function fichaValueHTML(label,v){
 if(/correo/i.test(label)&&/^\S+@\S+$/.test(v))return `<a href="mailto:${esc(v)}">${esc(v)}</a>`;
 if(/tel/i.test(label)&&/\d/.test(v))return `<a href="tel:${esc(v.replace(/[^\d+]/g,''))}">${esc(v)}</a>`;
 return esc(v);
}
function fichaText(c,k){
 const f=c.fichaOficial?.[k];if(!f)return '';
 const out=[`FICHA OFICIAL · ${c.name} · curso ${k} (${f.date||''})`];
 (f.blocks||[]).forEach(b=>{
  if(b.t==='h')out.push('',b.x.toUpperCase());
  else if(b.t==='s')out.push('',b.x);
  else if(b.t==='p')out.push(b.x);
  else if(b.t==='kv')b.rows.forEach(([a,v])=>out.push(`${a.replace(/:\s*$/,'')}: ${v}`));
  else if(b.t==='tb')b.rows.forEach(r=>out.push(r.map(x=>x.x.replace(/\n/g,' · ')).join('\t')));
 });
 return out.join('\n');
}
async function copyFichaText(cid,k){
 const c=db.centers.find(x=>x.id===cid);if(!c)return;const t=fichaText(c,k);
 try{await navigator.clipboard.writeText(t);alert('Ficha copiada. Puedes pegarla en un documento o en tu conversación con Claude.')}
 catch(e){openModal('Ficha como texto',`<textarea class="textarea" style="width:100%;min-height:50vh" readonly>${esc(t)}</textarea>`,closeModal)}
}
function deleteFicha(cid,k){
 const c=db.centers.find(x=>x.id===cid);if(!c?.fichaOficial?.[k])return;
 if(!confirm(`¿Eliminar la ficha oficial del curso ${k} de ${c.name}? Puedes volver a importarla desde el ZIP del generador.`))return;
 delete c.fichaOficial[k];if(!Object.keys(c.fichaOficial).length)delete c.fichaOficial;save();centerDetail(cid,'ficha');
}

/* Lectura de ZIP y ODT sin bibliotecas externas */
function zipList(buf){
 const u=new Uint8Array(buf),dv=new DataView(buf);let e=-1;
 for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}
 if(e<0)throw new Error('El archivo no es un ZIP válido.');
 const n=dv.getUint16(e+10,true);let off=dv.getUint32(e+16,true);const out=[];
 for(let k=0;k<n;k++){
  if(dv.getUint32(off,true)!==0x02014b50)break;
  const flag=dv.getUint16(off+8,true),method=dv.getUint16(off+10,true),csize=dv.getUint32(off+20,true),nlen=dv.getUint16(off+28,true),xlen=dv.getUint16(off+30,true),clen=dv.getUint16(off+32,true),loc=dv.getUint32(off+42,true);
  const nb=u.subarray(off+46,off+46+nlen);let name;try{name=new TextDecoder(flag&0x800?'utf-8':'utf-8',{fatal:true}).decode(nb)}catch(_){name=String.fromCharCode(...nb)}
  const start=loc+30+dv.getUint16(loc+26,true)+dv.getUint16(loc+28,true);
  out.push({name,method,data:u.subarray(start,start+csize)});off+=46+nlen+xlen+clen;
 }
 return out;
}
async function zipRead(entry){
 if(entry.method===0)return entry.data;
 if(entry.method!==8)throw new Error('Formato de compresión no admitido.');
 if(typeof DecompressionStream==='undefined')throw new Error('Este navegador no puede descomprimir archivos. Actualiza el navegador (en el iPhone, iOS 16.4 o posterior).');
 const st=new Blob([entry.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
 return new Uint8Array(await new Response(st).arrayBuffer());
}
function odtNodeText(n){
 let t='';
 for(const ch of n.childNodes){
  if(ch.nodeType===3){t+=ch.nodeValue;continue}
  if(ch.nodeType!==1)continue;
  const ln=ch.localName;
  if(ln==='s')t+=' '.repeat(Number(ch.getAttribute('text:c')||ch.getAttributeNS?.('urn:oasis:names:tc:opendocument:xmlns:text:1.0','c')||1));
  else if(ln==='tab')t+=' ';
  else if(ln==='line-break')t+='\n';
  else if(ln==='frame'||ln==='note'||ln==='annotation')continue;
  else t+=odtNodeText(ch);
 }
 return t;
}
function odtParas(n){
 const r=[];
 (function walk(x){for(const ch of x.childNodes){if(ch.nodeType!==1)continue;if(ch.localName==='p'||ch.localName==='h'){const t=odtNodeText(ch).replace(/[ \t\u00a0]+/g,' ').trim();if(t)r.push(t)}else if(ch.localName!=='table')walk(ch)}})(n);
 return r;
}
function odtTable(tb){
 const rows=[];
 (function walk(x){for(const ch of x.childNodes){if(ch.nodeType!==1)continue;
  if(ch.localName==='table-row'){const r=[];for(const cell of ch.childNodes){if(cell.nodeType!==1||cell.localName!=='table-cell')continue;
    const g=a=>Number(cell.getAttribute('table:'+a)||1),ps=[...cell.getElementsByTagName('*')].filter(e=>e.localName==='p');
    r.push({x:odtParas(cell).join('\n'),cs:g('number-columns-spanned'),rs:g('number-rows-spanned'),hd:ps.length>0&&ps.every(e=>/Head/.test(e.getAttribute('text:style-name')||''))})}
   if(r.length)rows.push(r)}
  else if(/^table-(header-rows|rows|row-group)$/.test(ch.localName))walk(ch)}})(tb);
 return rows;
}
function parseFichaODT(xml){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 const body=[...doc.getElementsByTagName('*')].find(n=>n.localName==='text'&&n.parentNode?.localName==='body');
 if(!body)throw new Error('No se encuentra el texto del documento.');
 const blocks=[],meta={};
 const isCaps=t=>t.length<70&&/[A-ZÁÉÍÓÚÑ]/.test(t)&&t===t.toUpperCase()&&!/^\*/.test(t)&&!/:/.test(t);
 (function walk(x){for(const n of x.childNodes){if(n.nodeType!==1)continue;const ln=n.localName;
  if(ln==='p'||ln==='h'){const t=odtNodeText(n).replace(/[ \t\u00a0]+/g,' ').trim();if(!t)continue;
   if(!blocks.length&&!meta.started&&/^INFORME$/i.test(t))continue;
   const st=n.getAttribute('text:style-name')||'';
   if(/SectionOfficial/.test(st)||(/^\d+\.\s/.test(t)&&isCaps(t.replace(/^\d+\.\s*/,''))))blocks.push({t:'h',x:t});
   else if(/SubOfficial/.test(st)||isCaps(t))blocks.push({t:'s',x:t});
   else blocks.push({t:'p',x:t,n:/^(Note|Muted)/.test(st)||/^\*|^AVISO/i.test(t)});}
  else if(ln==='table'){const rows=odtTable(n).filter(r=>r.some(c=>c.x));if(!rows.length)continue;
   const kv=rows.every(r=>r.length===2&&/:\s*$/.test(r[0].x));
   if(kv){const pairs=rows.map(r=>[r[0].x,r[1].x]);pairs.forEach(([a,v])=>{meta[a.replace(/:\s*$/,'').trim().toUpperCase()]=v});
    if(pairs.some(([a])=>/^ASUNTO/i.test(a)))continue;
    blocks.push({t:'kv',rows:pairs});}
   else{const styled=rows.some(r=>r.some(c=>c.hd));const head=styled?rows[0].every(c=>c.hd||!c.x):(rows.length>1&&!rows[0].some(c=>/^\d/.test(c.x))&&rows.slice(1).some(r=>r.some(c=>/^\d+$/.test(c.x))));
    blocks.push({t:'tb',head,rows:rows.map(r=>r.map(({x,cs,rs})=>({x,cs,rs})))});}}
  else if(ln==='list'||ln==='section'||ln==='list-item')walk(n);}})(body);
 const cm=String(meta['CENTRO']||'').match(/^\s*(\d{6,9})\s*[-–·]\s*(.+)$/);
 return {code:cm?cm[1]:'',name:cm?cm[2].trim():String(meta['CENTRO']||'').trim(),course:normCourse(meta['CURSO']||'')||'',date:meta['DATA']||'',inspector:meta['INSPECTOR/A']||'',blocks};
}
async function fichaFromODT(bytes,file){
 const ents=zipList(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const ce=ents.find(e=>e.name==='content.xml');if(!ce)throw new Error('No parece una ficha ODT.');
 const f=parseFichaODT(new TextDecoder('utf-8').decode(await zipRead(ce)));f.file=file;return f;
}
function importFichasStart(returnCid){
 window.__fichaReturn=returnCid||'';
 let i=document.getElementById('fichasFile');
 if(!i){i=document.createElement('input');i.type='file';i.id='fichasFile';i.multiple=true;i.hidden=true;i.accept='.zip,.odt,application/zip,application/vnd.oasis.opendocument.text';i.onchange=importFichasFiles;document.body.appendChild(i)}
 i.value='';i.click();
}
async function importFichasFiles(e){
 const files=[...e.target.files];if(!files.length)return;
 const fichas=[],errors=[];
 for(const file of files){
  try{
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(/\.odt$/i.test(file.name)){fichas.push(await fichaFromODT(bytes,file.name));continue}
   for(const en of zipList(bytes.buffer)){
    if(!/\.odt$/i.test(en.name)||/(^|\/)(__MACOSX|\.)/.test(en.name))continue;
    const nm=en.name.split('/').pop();
    try{fichas.push(await fichaFromODT(await zipRead(en),nm))}catch(err){errors.push(nm+': '+err.message)}
   }
  }catch(err){errors.push(file.name+': '+err.message)}
 }
 if(!fichas.length){alert('No se ha podido leer ninguna ficha.'+(errors.length?'\n\n'+errors.slice(0,5).join('\n'):''));return}
 const byCode=new Map(db.centers.filter(c=>c.code).map(c=>[String(c.code).trim(),c]));
 const byName=new Map(db.centers.map(c=>[normTxt(c.name),c]));
 let plan=fichas.map(f=>{
  const c=(f.code&&byCode.get(f.code))||byName.get(normTxt(f.name))||null;
  const course=f.course||currentCourse();
  return {f,course,cid:c?.id||'',cname:c?.name||'',prev:c?.fichaOficial?.[course]||null};
 }).filter((p,i,arr)=>!p.cid||!arr.slice(i+1).some(q=>q.cid===p.cid&&q.course===p.course))
  .sort((a,b)=>(!!b.cid-!!a.cid)||a.f.name.localeCompare(b.f.name,'es'));
 window.__fichaPlan=plan;
 const ok=plan.filter(p=>p.cid).length;
 openModal('Importar fichas oficiales',`<p style="margin-top:0">Se han leído <b>${fichas.length}</b> ${fichas.length===1?'ficha':'fichas'}. <b>${ok}</b> ${ok===1?'corresponde':'corresponden'} a centros de tu registro.</p>
 <div class="notice" style="margin-bottom:12px">Cada ficha se guarda en el apartado «Ficha oficial» de su centro, en el curso que indica. Si ese centro ya tiene ficha de ese curso, se sustituye. No se modifica ningún otro dato del centro.</div>
 ${errors.length?`<div class="notice warn-notice" style="margin-bottom:12px">No se han podido leer: ${esc(errors.join(' · '))}</div>`:''}
 <div class="tablewrap" style="max-height:48vh"><table class="table"><thead><tr><th></th><th>Ficha</th><th>Código</th><th>Curso</th><th>Centro en tu registro</th><th>Estado</th></tr></thead><tbody>${plan.map((p,i)=>`<tr><td><input type="checkbox" id="fp_${i}" ${p.cid?'checked':'disabled'} aria-label="Importar ${esc(p.f.name)}"></td><td>${esc(p.f.name)}</td><td>${esc(p.f.code||'—')}</td><td>${esc(p.course)}</td><td>${p.cid?esc(p.cname):'<span class="muted">No está en tu registro</span>'}</td><td>${!p.cid?'<span class="muted">Se omite</span>':p.prev?`Sustituye la del ${esc(p.prev.date||'')}`:'Nueva'}</td></tr>`).join('')}</tbody></table></div>
 ${plan.length>ok?'<p class="muted" style="font-size:12px">Los centros que no están en tu registro se omiten. Si quieres incluir alguno, créalo en «Centros» con su código y vuelve a importar.</p>':''}`,runFichaPlan);
 document.getElementById('modalSave').textContent='Importar';
}
function runFichaPlan(){
 const plan=window.__fichaPlan;if(!plan)return;let n=0,r=0;
 plan.forEach((p,i)=>{
  if(!p.cid||!document.getElementById('fp_'+i)?.checked)return;
  const c=db.centers.find(x=>x.id===p.cid);if(!c)return;
  if(!c.fichaOficial||typeof c.fichaOficial!=='object')c.fichaOficial={};
  if(c.fichaOficial[p.course])r++;else n++;
  c.fichaOficial[p.course]={date:p.f.date,importedAt:nowIso(),file:p.f.file||'',inspector:p.f.inspector||'',blocks:p.f.blocks};
 });
 window.__fichaPlan=null;save();closeModal();
 alert(`Fichas importadas: ${n} ${n===1?'nueva':'nuevas'}${r?` y ${r} ${r===1?'sustituida':'sustituidas'}`:''}. Las encontrarás en cada centro, en «Ficha oficial».`);
 if(window.__fichaReturn&&db.centers.some(c=>c.id===window.__fichaReturn))centerDetail(window.__fichaReturn,'ficha');else if(document.getElementById('fichasFile')&&document.querySelector('#main .top h1')?.textContent==='Datos y seguridad')nav('datos');
}
