/* =====================================================================
   Versión 4.10 · Texto con formato en los cuadros de texto largos
   - Mismo formato que «Notas reuniones» (nFmt, en 96-reuniones.js): «## Título», «- » listas,
     «1. » listas numeradas, «**negrita**», «*cursiva*», «---» separador y enlaces https://…
   - Cada cuadro largo lleva una barra de botones (insertan las marcas), «Vista previa» y un tirador
     inferior para hacerlo más grande o más pequeño (en el iPhone Safari no muestra el tirador nativo).
   - El texto se guarda tal cual; se ve con formato en la ficha del centro, visitas, notas, etc.
   ===================================================================== */
const MD_FIELDS=new Set(['requestDetails','vobs','fdetails','faction','fuText','fuEditText','ntext','comObs','cfcontenido','rfcontenido','bfapuntes','ctfNotes','dotNotas']);

/* Texto guardado → HTML con formato (vacío si no hay texto) */
function mdRender(text){return String(text||'').trim()?nFmt(text):''}
/* Texto sin marcas para resúmenes de una línea (tablas, PDF) */
function mdPlain(text){return nPlain(text)}

function mdEnhanceIn(root){
 if(!root)return;
 root.querySelectorAll('textarea.textarea').forEach(t=>{if(MD_FIELDS.has(t.id)||t.dataset.md==='1')mdEnhance(t)});
}
function mdEnhance(t){
 if(!t||t.dataset.mdReady)return;
 t.dataset.mdReady='1';
 const wrap=document.createElement('div');wrap.className='md-wrap';
 t.parentNode.insertBefore(wrap,t);
 const bar=document.createElement('div');bar.className='md-bar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Formato del texto');
 const B=(label,title,fn,cls='')=>{const b=document.createElement('button');b.type='button';b.className='md-btn '+cls;b.innerHTML=label;b.title=title;b.setAttribute('aria-label',title);b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',e=>{e.preventDefault();fn()});bar.appendChild(b);return b};
 B('<b>T</b>','Título de apartado («## »)',()=>mdLinePrefix(t,'## '));
 B('<b>B</b>','Negrita («**texto**»)',()=>mdWrapSel(t,'**','**','negrita'));
 B('<i>I</i>','Cursiva («*texto*»)',()=>mdWrapSel(t,'*','*','cursiva'));
 B('•&nbsp;Lista','Lista con viñetas («- »)',()=>mdLinePrefix(t,'- '));
 B('1.&nbsp;Lista','Lista numerada («1. »)',()=>mdLinePrefix(t,'1. ',true));
 B('—','Separador («---»)',()=>mdInsertBlock(t,'---'));
 const prev=B('Vista previa','Ver el texto con formato',()=>mdTogglePreview(t,wrap,prev),'md-prev-btn');
 const help=document.createElement('span');help.className='md-help';help.textContent='?';help.title=N_FORMAT_HELP;bar.appendChild(help);
 wrap.appendChild(bar);
 wrap.appendChild(t);
 const view=document.createElement('div');view.className='md-preview qbody nbody';view.hidden=true;wrap.appendChild(view);
 const grip=document.createElement('div');grip.className='md-grip';grip.title='Arrastra para cambiar el tamaño';grip.setAttribute('aria-hidden','true');grip.innerHTML='<span></span>';wrap.appendChild(grip);
 mdGrip(grip,t);
 t.addEventListener('keydown',e=>mdListEnter(e,t));
}
function mdTogglePreview(t,wrap,btn){
 const view=wrap.querySelector('.md-preview');if(!view)return;
 const on=view.hidden;
 if(on){view.innerHTML=mdRender(t.value)||'<p class="muted">Sin texto.</p>';view.style.minHeight=Math.max(60,t.offsetHeight)+'px'}
 view.hidden=!on;t.hidden=on;btn.classList.toggle('on',on);btn.textContent=on?'Editar':'Vista previa';
 wrap.querySelectorAll('.md-btn:not(.md-prev-btn)').forEach(b=>b.disabled=on);
}
function mdFire(t){t.dispatchEvent(new Event('input',{bubbles:true}))}
function mdWrapSel(t,a,b,ph){
 const s=t.selectionStart,e=t.selectionEnd,v=t.value,sel=v.slice(s,e)||ph;
 t.setRangeText(a+sel+b,s,e,'end');
 if(s===e){t.setSelectionRange(s+a.length,s+a.length+sel.length)}
 t.focus();mdFire(t);
}
function mdLinePrefix(t,prefix,numbered){
 const v=t.value,s=t.selectionStart,e=t.selectionEnd;
 const ls=v.lastIndexOf('\n',s-1)+1;let le=v.indexOf('\n',Math.max(e-(e>s&&v[e-1]==='\n'?1:0),s));if(le<0)le=v.length;
 const lines=v.slice(ls,le).split('\n');
 const strip=l=>l.replace(/^(#{1,3}\s+|[-•*]\s+|\d+[.)]\s+)/,'');
 const has=lines.every(l=>!l.trim()||(numbered?/^\d+[.)]\s+/.test(l):l.startsWith(prefix)));
 let n=0;
 const out=lines.map(l=>{if(!l.trim()&&lines.length>1)return l;if(has)return strip(l);n++;return (numbered?n+'. ':prefix)+strip(l)}).join('\n');
 t.setRangeText(out,ls,le,'end');
 if(s===e){const p=ls+out.length;t.setSelectionRange(p,p)}else t.setSelectionRange(ls,ls+out.length);
 t.focus();mdFire(t);
}
function mdInsertBlock(t,txt){
 const v=t.value,s=t.selectionStart;
 const before=s>0&&v[s-1]!=='\n'?'\n':'',after=v[s]&&v[s]!=='\n'?'\n':'';
 t.setRangeText(before+txt+'\n'+after,s,t.selectionEnd,'end');t.focus();mdFire(t);
}
/* Al pulsar Intro dentro de una lista, se continúa la lista; en una viñeta vacía, se termina */
function mdListEnter(e,t){
 if(e.key!=='Enter'||e.shiftKey||e.isComposing||t.selectionStart!==t.selectionEnd)return;
 const v=t.value,s=t.selectionStart,ls=v.lastIndexOf('\n',s-1)+1,line=v.slice(ls,s);
 const m=line.match(/^(\s*)([-•*]|(\d+)([.)]))\s+(.*)$/);if(!m)return;
 e.preventDefault();
 if(!m[5].trim()){t.setRangeText('',ls,s,'end');mdFire(t);return}
 const next=m[3]?(Number(m[3])+1)+m[4]:m[2];
 t.setRangeText('\n'+m[1]+next+' ',s,s,'end');mdFire(t);
}
/* Tirador para cambiar la altura: funciona con ratón y con el dedo */
function mdGrip(grip,t){
 grip.addEventListener('pointerdown',e=>{
  e.preventDefault();
  const y0=e.clientY,h0=t.offsetHeight;
  try{grip.setPointerCapture(e.pointerId)}catch(_){}
  grip.classList.add('drag');
  const move=ev=>{t.style.height=Math.max(60,h0+ev.clientY-y0)+'px'};
  const end=()=>{grip.classList.remove('drag');grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end)};
  grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
 });
}

/* La ventana de edición aplica las mejoras al abrirse */
{
 const base=openModal;
 openModal=function(title,body,onSave){const r=base(title,body,onSave);mdEnhanceIn(document.getElementById('modalBody'));return r};
}

/* Botón «Eliminar …» a la izquierda del pie de la ventana de edición */
function addModalDelete(label,fn){
 const foot=document.querySelector('#modal .modalfoot');if(!foot)return;
 document.getElementById('modalDelete')?.remove();
 const b=document.createElement('button');b.id='modalDelete';b.type='button';b.className='btn danger modal-delete';b.textContent=label;b.onclick=fn;foot.insertBefore(b,foot.firstChild);
}
