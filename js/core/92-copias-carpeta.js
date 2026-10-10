/* =====================================================================
   Versión 4.0 · Copias de seguridad automáticas y carpeta de BoxAbalar
   (la lógica está en vault.js; aquí solo el panel de «Datos y seguridad»)
   ===================================================================== */
function bkWhen(iso){return iso?new Date(iso).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'—'}
function bkSize(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'}
async function fillBackupPanel(){
 const box=document.getElementById('backupPanel');
 if(!box||!window.__vault||!window.__vault.backups)return;
 const [list,dir,imgHTML]=await Promise.all([window.__vault.backups(),window.__vault.dirStatus(),imgPanelHTML().catch(e=>{console.warn(e);return ''})]);
 if(!document.getElementById('backupPanel'))return;
 let dirHTML;
 if(!dir.can)dirHTML=`<p class="muted">Este navegador no permite vincular carpetas (iPhone, Safari). En el iPhone los documentos se abren eligiéndolos en la app Archivos, las copias se guardan solo dentro de este equipo y las imágenes y los PDF nuevos viajan dentro del archivo cifrado.</p>`;
 else if(!dir.linked)dirHTML=`<p>Vincula la carpeta <b>Registro</b> de BoxAbalar (la que contiene el archivo de datos). La aplicación creará dentro dos subcarpetas: <b>Copias</b> (una copia cifrada por día, se conservan las últimas 14) y <b>Documentos</b> (los archivos de las fichas de consultas, de la bibliografía y de las notas de reuniones, y las imágenes y los PDF adjuntos a las actuaciones y a las notas).</p>
  <div class="toolbar"><button class="btn primary" onclick="__vault.linkDir()">Vincular carpeta de BoxAbalar…</button></div>`;
 else dirHTML=`<dl class="center-data-list"><div><dt>Carpeta vinculada</dt><dd>${esc(dir.name)}</dd></div>
   <div><dt>Permiso</dt><dd>${dir.ready?'Concedido':'<b>Falta permiso</b> para escribir en la carpeta'}</dd></div>
   <div><dt>Última copia en la carpeta</dt><dd>${dir.lastCopyAt?esc(bkWhen(dir.lastCopyAt)):'—'}${dir.copies!==null?` · ${dir.copies} copia${dir.copies===1?'':'s'} en «Copias»`:''}</dd></div></dl>
  <div class="toolbar">${dir.ready?`<button class="btn" onclick="__vault.backupNow()">Hacer una copia ahora</button>`:`<button class="btn primary" onclick="__vault.allowDir()">Dar permiso</button>`}<button class="btn" onclick="__vault.linkDir()">Cambiar de carpeta…</button><button class="btn danger" onclick="__vault.unlinkDir()">Desvincular</button></div>
  <p class="muted" style="font-size:12px">Las copias de la carpeta son archivos cifrados con tu contraseña, igual que el registro. Los archivos de la carpeta «Documentos», incluidas las imágenes y los PDF adjuntos, <b>no</b> están cifrados.</p>`;
 const rows=list.map(b=>`<tr><td>${esc(bkWhen(b.at))}</td><td>${esc(b.reason)}</td><td>${esc(b.device||'—')}</td><td>${bkSize(b.bytes)}</td><td style="white-space:nowrap"><button class="btn small" onclick="__vault.downloadBackup(${b.i})">Descargar</button> <button class="btn small" onclick="__vault.restoreBackup(${b.i})">Restaurar</button></td></tr>`).join('');
 box.innerHTML=`<div class="panel"><div class="panelhead"><h2>Copias de seguridad y carpeta de BoxAbalar</h2></div><div class="panelbody">
  <h3 style="margin-top:0">Carpeta del registro</h3>${dirHTML}
  ${imgHTML}
  <h3>Copias guardadas en este equipo</h3>
  <p class="muted" style="font-size:12px">Se hace una copia automática al primer guardado de cada día (con el estado en que dejaste el registro el día anterior) y siempre que eliges «Sobrescribir» o «Cargar el archivo» ante un conflicto. Se conservan las últimas 10. Solo sirven para restaurar si la contraseña no ha cambiado; si cambió, usa «Descargar».</p>
  ${rows?`<div class="tablewrap"><table class="table"><thead><tr><th>Fecha</th><th>Motivo</th><th>Equipo</th><th>Tamaño</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="muted">Todavía no hay copias en este equipo.</p>'}
 </div></div>`;
}
