function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function date(v){if(!v)return ''; let d=new Date(v); return isNaN(d)?esc(v):d.toLocaleDateString('es-ES');}
function iso(v){return v?new Date(v).toISOString().slice(0,10):''}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function nav(view){document.querySelectorAll('.nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view)); render(view)}
document.querySelectorAll('.nav button[data-view]').forEach(b=>b.onclick=()=>nav(b.dataset.view));
function layout(title,sub,buttons=''){return `<div class="top"><div class="title"><h1>${title}</h1><p>${sub}</p></div><div class="actions">${buttons}</div></div>`}
function render(view='dashboard'){if(view==='dashboard')dashboard(); if(view==='registro')registro(); if(view==='centros')centros(); if(view==='visitas')visitas(); if(view==='seguimiento')seguimiento(); if(view==='especiales')especiales(); if(view==='datos')datos(); if(view==='consultas')consultas(); if(view==='contactos')contactos();}
const DEADLINES = [
 ['2026-09-15','Hasta el 15/09/2026','Finalizar la incorporación gradual del alumnado de 4.º de infantil','Centros con 4.º de educación infantil · Orden 4/06/2026, art. 4.3','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2026-09-30','Antes de finalizar septiembre','Entregar las programaciones didácticas a Inspección','Dirección de los centros docentes · Orden 4/06/2026, art. 4.2','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2026-10-15','Antes del 16/10/2026','Solicitar días no lectivos sustitutivos cuando las fiestas locales no coincidan con días lectivos','Consejo escolar, consejo social o responsable del centro · Orden 4/06/2026, art. 7.2','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2026-10-16','Hasta el 16/10/2026','Celebrar la sesión de evaluación inicial','Centros docentes · Orden 4/06/2026, art. 9','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2026-09-29','Antes del 30/09','PGA: remitir el capítulo I','CPI','https://www.lex.gal/es/normativa/detalle/6914?mod=false'],
 ['2026-07-13','Antes del 14/07/2026','Distribuir provisionalmente materias, ámbitos, cursos, módulos y turnos para 2026/27','Centros de secundaria · Resolución 11/06/2026, disposición adicional segunda.1','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-07-14','Antes del 15/07/2026','Remitir a Inspección la síntesis de necesidades de profesorado','Dirección de centros de secundaria · Disposición adicional segunda.2','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-07-14','Antes del 15/07/2026','Solicitar autorización y configurar en XADE la agrupación de áreas en ámbitos de primaria','Centros de primaria · Resolución 11/06/2026; también actualizar o retirar agrupaciones anteriores en XADE','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-07-14','Antes del 15/07/2026','Solicitar autorización y configurar en XADE la agrupación de materias en ámbitos de ESO','Centros con ESO · Resolución 11/06/2026; también actualizar o retirar agrupaciones anteriores en XADE','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-07-14','Antes del 15/07/2026','Solicitar autorización excepcional de materias con menos alumnado del mínimo en ESO','Centros con ESO · Resolución 11/06/2026','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-07-14','Antes del 15/07/2026','Presentar la propuesta de incorporación de alumnado al programa de diversificación curricular','Centros con ESO · Resolución 11/06/2026','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-07-14','Antes del 15/07/2026','Solicitar autorización excepcional de materias con menos alumnado del mínimo en bachillerato','Centros con bachillerato · Resolución 11/06/2026','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-09-29','Antes del 30/09/2026','Solicitar autorización para cursar a distancia materias de bachillerato','Centro de bachillerato ante Inspección · Resolución 11/06/2026','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-10-15','Hasta el 15/10/2026','Solicitar autorización para cursar a distancia materias tras cambio de modalidad o vía','Alumnado de 1.º de bachillerato · Excepción al plazo general de septiembre','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2026-09-29','Antes del 30/09','PGA: remitir capítulo I, incluido el primer documento de datos','IES · Orden 1/08/1997, puntos 6 y 18','https://www.lex.gal/normativa/detalle/8091'],
 ['2026-09-30','Durante septiembre','Solicitar a Inspección autorización de agrupamientos flexibles','5.º y 6.º de primaria y ESO · Orden 8/09/2021, art. 56.7','https://www.lex.gal/normativa/detalle/9210'],
 ['2026-10-02','28/09–02/10','Constituir la junta electoral','Centros nuevos en 2026/27','https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf'],
 ['2026-10-13','07–13/10','Voto telemático de las familias','Consejos escolares de centros nuevos','https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf'],
 ['2026-10-14','Antes del 15/10','Presentar la PGA al consejo escolar','Escuelas infantiles y CEIP','https://www.lex.gal/normativa/detalle/8094'],
 ['2026-10-19','Antes del 20/10','PGA: remitir el capítulo II','CPI','https://www.lex.gal/es/normativa/detalle/6914?mod=false'],
 ['2026-10-19','Antes del 20/10','PGA: remitir capítulo II, DOC y anexos','IES · Orden 1/08/1997, punto 7','https://www.lex.gal/normativa/detalle/8091'],
 ['2026-10-23','19–23/10','Votación presencial','Consejos escolares de centros nuevos','https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf'],
 ['2026-10-26','20–26/10','Constituir la junta electoral','Renovación parcial de consejos escolares','https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf'],
 ['2026-10-31','Durante octubre','Elaborar el programa anual de actividades complementarias','IES · Orden 1/08/1997, punto 20','https://www.lex.gal/normativa/detalle/8091'],
 ['2026-10-31','Antes de noviembre','Celebrar la primera reunión general de tutoría con las familias','Infantil y primaria · Orden 22/07/1997, cap. VI.5.4','https://www.lex.gal/normativa/detalle/8094'],
 ['2026-10-31','Durante octubre','Elaborar el programa anual de actividades complementarias','CPI','https://www.lex.gal/es/normativa/detalle/6914?mod=false'],
 ['2026-11-14','Antes del 15/11','PGA: remitir capítulo III, datos estadísticos y planes','IES · Orden 1/08/1997, puntos 8 y 18','https://www.lex.gal/normativa/detalle/8091'],
 ['2026-11-14','Antes del 15/11','PGA: remitir el capítulo III','CPI','https://www.lex.gal/es/normativa/detalle/6914?mod=false'],
 ['2026-11-17','11–17/11','Voto telemático de las familias','Renovación parcial de consejos escolares','https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf'],
 ['2026-10-31','Antes de terminar octubre','Solicitar fragmentación de bachillerato por necesidades educativas especiales, si procede','Centros con bachillerato · Orden 8/09/2021, art. 59.5','https://www.lex.gal/normativa/detalle/9210'],
 ['2026-11-27','23–27/11','Votación presencial','Renovación parcial de consejos escolares','https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf'],
 ['2026-11-30','Antes de terminar noviembre','Solicitar a Inspección autorización de las adaptaciones curriculares, salvo las ligadas a flexibilización','Centros con alumnado que precise adaptación · Orden 8/09/2021, art. 55.8','https://www.lex.gal/normativa/detalle/9210'],
 ['2026-12-15','Antes del 16/12','Remitir el informe electoral (anexo II) a Inspección','Dirección de centros afectados','https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf'],
 ['2026-12-31','Durante diciembre','Presentar al consejo escolar las cuentas justificativas para su aprobación','Escuelas infantiles y CEIP · Orden 22/07/1997, cap. I.4.4','https://www.lex.gal/normativa/detalle/8094'],
 ['2027-01-30','Antes del 31/01','Remitir copia certificada de la cuenta justificativa y su resumen','Escuelas infantiles y CEIP · Orden 22/07/1997, cap. I.4.5','https://www.lex.gal/normativa/detalle/8094'],
 ['2027-02-04','15/01–04/02','Recibir solicitudes de reserva de plaza','Centros de infantil, primaria, ESO y bachillerato afectados','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-02-22','22/02','Publicar la lista de plazas reservadas','Centros afectados por la reserva','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-02-28','Durante febrero','PGA: remitir el proyecto de presupuesto','IES · Orden 1/08/1997, punto 9','https://www.lex.gal/normativa/detalle/8091'],
 ['2027-02-28','Durante febrero','PGA: remitir el proyecto de presupuesto','CPI','https://www.lex.gal/es/normativa/detalle/6914?mod=false'],
 ['2027-02-28','Antes del 01/03','Publicar vacantes y celebrar el sorteo de desempate','Centros del proceso de admisión','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-03-20','01–20/03','Recibir solicitudes de admisión ordinaria','Infantil, primaria, ESO y bachillerato','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-03-31','Durante marzo','Enviar solicitud de flexibilización por reducción de escolarización (altas capacidades)','Infantil, primaria y ESO · Orden 8/09/2021, art. 58.4.a','https://www.lex.gal/normativa/detalle/9210'],
 ['2027-04-30','Durante abril','Enviar solicitud de flexibilización por ampliación de escolarización','Último curso de infantil y primaria · Orden 8/09/2021, art. 58.8.a','https://www.lex.gal/normativa/detalle/9210'],
 ['2027-04-23','19–23/04','Evaluación de diagnóstico de 2.º de ESO','IES y centros con ESO','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-04-25','25/04*','Publicar listas provisionales de admisión','Centros del proceso de admisión','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-04-30','26–30/04','Evaluación de diagnóstico de 4.º de primaria','Centros con primaria','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-04-29','Antes del 30/04/2027','Solicitar autorización del calendario de fin de curso y pruebas de acceso o certificación','Dirección de centros de enseñanzas de régimen especial · Orden 4/06/2026, art. 5.2','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-04-29','Antes del 30/04/2027','Proponer las fechas de evaluación final de enseñanzas de régimen especial no previstas expresamente','Dirección de centros de enseñanzas de régimen especial · Orden 4/06/2026, art. 13.f','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-05-15','Primera quincena de mayo','Solicitar dotación inicial de auxiliar cuidador o intérprete de lengua de signos','Centros que precisen el recurso · Orden 8/09/2021, art. 82.1','https://www.lex.gal/normativa/detalle/9210'],
 ['2027-05-31','Durante mayo','Solicitar continuidad de auxiliar cuidador o intérprete, con informe de orientación','Centros con dotación actual · Orden 8/09/2021, art. 82.2','https://www.lex.gal/normativa/detalle/9210'],
 ['2027-05-31','Últimos diez días hábiles de mayo de 2027','Inscribir y matricular en las pruebas o actividades personalizadas extraordinarias','Antiguo alumnado de 4.º de ESO; verificar festivos locales para determinar el inicio del plazo','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2027-05-15','15/05*','Publicar listas definitivas de admisión','Centros del proceso de admisión','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-06-30','Durante junio','Proponer al consejo escolar el horario general del curso siguiente','IES · Orden 1/08/1997, punto 12','https://www.lex.gal/normativa/detalle/8091'],
 ['2027-06-16','15–16/06/2027','Celebrar la evaluación final de 2.º curso de los ciclos formativos','FP básica, grado medio y grado superior · Orden 4/06/2026, art. 13.d','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-06-21','17–21/06/2027','Celebrar pruebas finales de la convocatoria extraordinaria','1.º de bachillerato y 1.º de ciclos formativos de grado básico · Orden 4/06/2026, art. 14.1','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-06-15','Hasta el 15/06/2027','Finalizar las actividades lectivas de los segundos cursos de ciclos formativos','FP básica, grado medio y grado superior · Orden 4/06/2026, art. 5.1','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-06-21','Hasta el 21/06/2027','Finalizar las actividades lectivas del resto de enseñanzas y el servicio de comedor','Infantil, primaria, ESO, bachillerato y otras enseñanzas; excepciones indicadas en el art. 5 · Orden 4/06/2026','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-06-30','22–30/06/2027','Elaborar actas e informes de evaluación y memoria final de curso','Profesorado de centros públicos · Orden 4/06/2026, art. 15.3','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['2027-06-30','Durante junio de 2027','Celebrar pruebas o actividades personalizadas extraordinarias de ESO','Centros organizadores · Calendario y horario pendientes de concretar','https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf'],
 ['2027-06-30','20–30/06','Formalizar matrícula','Infantil y primaria','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-07-07','23/06–07/07','Formalizar matrícula','ESO y bachillerato','https://www.lex.gal/normativa/detalle/9094'],
 ['2027-07-09','Antes del 10/07','Enviar a Inspección la memoria de la aula educativa hospitalaria','Aulas educativas hospitalarias · Orden 8/09/2021, art. 62.3.i','https://www.lex.gal/normativa/detalle/9210'],
 ['2027-07-09','Antes del 10/07','Comunicar a Inspección el horario general aprobado para el curso siguiente','IES · Orden 1/08/1997, punto 13','https://www.lex.gal/normativa/detalle/8091'],
 ['2027-07-09','Antes del 10/07','Remitir la memoria anual de la PGA a Inspección','IES · Orden 1/08/1997, punto 43','https://www.lex.gal/normativa/detalle/8091'],
 ['2027-07-09','Antes del 10/07','Remitir la memoria final tras informar al claustro y al consejo escolar','Escuelas infantiles y CEIP · Orden 22/07/1997, cap. I.5.8','https://www.lex.gal/normativa/detalle/8094'],
 ['2027-07-09','Antes del 10/07','Remitir la memoria anual a Inspección','CPI','https://www.lex.gal/es/normativa/detalle/6914?mod=false']
 ,['2027-07-08','Antes del 09/07/2027','Enviar la memoria anual del centro a Inspección','Direcciones de centros educativos · Orden 4/06/2026, art. 18','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf']
];
// La referencia del día 4 recuerda el límite «antes del 5» de cada mes.
for(let month=10;month<=19;month++){
 const year=month<=12?2026:2027, m=month<=12?month:month-12;
 const previous=new Date(year,m-2,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'});
 DEADLINES.push([`${year}-${String(m).padStart(2,'0')}-04`,'Antes del día 5',`Remitir a Inspección y publicar el parte de faltas de ${previous}`,'IES · Orden 1/08/1997, punto 103','https://www.lex.gal/normativa/detalle/8091']);
}
// Avisos mensuales de infantil y primaria: exposición durante los tres primeros días y envío antes del quinto.
for(let month=10;month<=19;month++){
 const year=month<=12?2026:2027, m=month<=12?month:month-12;
 const previous=new Date(year,m-2,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'});
 DEADLINES.push([`${year}-${String(m).padStart(2,'0')}-04`,'Días 1–3 y antes del 5',`Exponer el parte de faltas de ${previous} los días 1–3; remitirlo a Inspección antes del 5`,'Infantil y primaria · Orden 22/07/1997, cap. V.3.2','https://www.lex.gal/normativa/detalle/8094']);
}
const RELATIVE_DEADLINES = [
 ['Cada trimestre, y al inicio y fin de curso','Reunir los órganos colegiados al menos una vez por trimestre; remitir la documentación con una semana de antelación para sesiones ordinarias y convocar las extraordinarias con 48 horas, salvo urgencia.','CPI · Decreto 7/1999, arts. 10.3 y 12.2','https://www.lex.gal/normativa/detalle/3439'],
 ['Cada trimestre','Reunir la comisión económica al menos una vez por trimestre, antes de la correspondiente sesión del consejo escolar.','CPI · Decreto 7/1999, art. 9.7','https://www.lex.gal/normativa/detalle/3439'],
 ['Desde la solicitud de un tercio de miembros','Convocar el órgano colegiado en un máximo de 20 días y celebrar la sesión en el plazo máximo de un mes, contados desde el día siguiente a la solicitud.','CPI · Decreto 7/1999, art. 12.2','https://www.lex.gal/normativa/detalle/3439'],
 ['Durante las elecciones al consejo escolar','Admitir candidaturas durante al menos siete días; reclamar su proclamación en los dos días siguientes y resolver el siguiente día hábil. Exponer el censo al menos diez días antes de la votación.','CPI · Decreto 7/1999, art. 11.4 y 11.7','https://www.lex.gal/normativa/detalle/3439'],
 ['Tras la proclamación de electos al consejo escolar','Constituir el consejo escolar dentro de los diez días siguientes; las reclamaciones contra decisiones de la junta electoral tienen un plazo de quince días.','CPI · Decreto 7/1999, art. 11.10 y 11.11','https://www.lex.gal/normativa/detalle/3439'],
 ['Desde la solicitud a la asociación de familias','Conceder diez días a la asociación de padres y madres más representativa para proponer representante al consejo escolar.','CPI · Decreto 7/1999, art. 9.3','https://www.lex.gal/normativa/detalle/3439'],
 ['En el primer trimestre; tras una revocación','Elegir delegados de grupo de primaria y ESO en el primer trimestre y convocar nueva elección dentro de quince días si se revoca la designación.','CPI · Decreto 7/1999, art. 82','https://www.lex.gal/normativa/detalle/3439'],
 ['Desde el 16 de julio de 2027','Mantener archivadas y a disposición de Inspección las actas de evaluación final del propio centro y de los centros privados adscritos.','Secretarías de los centros · Orden 4/06/2026, art. 17','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['Al solicitar una modificación del calendario escolar','Presentar la solicitud ante la dirección territorial al menos quince días antes de la modificación prevista.','Centros interesados · Orden 4/06/2026, disposición adicional primera.2','https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf'],
 ['Al inicio de cada curso','Elaborar la concreción anual del Plan general de atención a la diversidad e incorporarla a la PGA.','Departamento de orientación · Decreto 229/2011, art. 11; Orden 8/09/2021, art. 74','https://www.lex.gal/normativa/detalle/1673'],
 ['Al final de cada curso','Evaluar la concreción anual del plan de atención a la diversidad e integrar el informe en la memoria del centro.','Departamento de orientación · Orden 8/09/2021, art. 75','https://www.lex.gal/normativa/detalle/9210'],
 ['Al inicio de cada etapa','Revisar la evaluación y el informe psicopedagógico; actualizarlos antes si cambian significativamente las circunstancias.','Orientación · Orden 8/09/2021, art. 22','https://www.lex.gal/normativa/detalle/9210'],
 ['En cada sesión de evaluación','Revisar los planes de refuerzo y los planes personalizados del alumnado que repite o promociona con materias pendientes.','Primaria y ESO · Orden 8/09/2021, arts. 50.3, 51.4 y 52.3','https://www.lex.gal/normativa/detalle/9210'],
 ['Cada trimestre','Hacer seguimiento de la concreción anual del plan de atención a la diversidad e informar al claustro y la dirección.','Departamento de orientación · Orden 8/09/2021, art. 75.2','https://www.lex.gal/normativa/detalle/9210'],
 ['Final de curso o trimestre','Revisar la escolarización en modalidad distinta de la ordinaria: al menos al fin de cada curso; en infantil, al fin de cada trimestre.','Orientación · Orden 8/09/2021, art. 32.3','https://www.lex.gal/normativa/detalle/9210'],
 ['Al final de cada curso','Elaborar el informe individual de los refuerzos educativos aplicados.','Tutoría y profesorado · Orden 8/09/2021, art. 48.4','https://www.lex.gal/normativa/detalle/9210'],
 ['Al cierre de curso','Elaborar informes individuales del alumnado de agrupamientos flexibles para valorar efectividad y continuidad.','Tutoría y orientación · Orden 8/09/2021, art. 56.11','https://www.lex.gal/normativa/detalle/9210'],
 ['Al cierre de curso','Elaborar informes individuales de apoyo y la memoria anual del profesorado de apoyo.','Profesorado de apoyo · Orden 8/09/2021, art. 57.2.g y 57.6','https://www.lex.gal/normativa/detalle/9210'],
 ['Al cierre de curso','Elaborar y remitir la memoria como centro de recursos.','Centros de educación especial · Orden 8/09/2021, art. 84.6','https://www.lex.gal/normativa/detalle/9210'],
 ['Al modificar una adaptación curricular autorizada','Solicitar nueva autorización a Inspección si se modifican elementos prescriptivos del currículo.','Primaria y ESO · Orden 8/09/2021, art. 55.15','https://www.lex.gal/normativa/detalle/9210'],
 ['Al incorporar alumnado nuevo a un agrupamiento flexible','Aplicar el procedimiento del artículo 56, valorando el informe de orientación de origen o la evaluación inicial.','Primaria y ESO · Orden 8/09/2021, art. 56.9','https://www.lex.gal/normativa/detalle/9210'],
 ['Desde la solicitud de atención domiciliaria','Enviar documentación a la jefatura territorial en cinco días; esta resuelve en otros cinco días tras recibirla.','Dirección del centro · Orden 8/09/2021, art. 62','https://www.lex.gal/normativa/detalle/9210'],
 ['Tras evaluación extraordinaria en ESO','Solicitar ampliación de escolarización en cinco días naturales desde la evaluación; tramitación y resolución posteriores, cinco días naturales por fase.','ESO · Orden 8/09/2021, art. 58.9','https://www.lex.gal/normativa/detalle/9210'],
 ['Primeros cinco días hábiles de junio','Recibir solicitud de participación en prueba de 1.º de bachillerato por posible flexibilización; comprobar calendario de días hábiles.','Bachillerato · Orden 8/09/2021, art. 59.3','https://www.lex.gal/normativa/detalle/9210'],
 ['Tras las evaluaciones de ESO y bachillerato','Recibir solicitud de flexibilización en dos días hábiles; remitir expediente en cinco días naturales tras cerrar solicitudes.','Bachillerato · Orden 8/09/2021, art. 59.4','https://www.lex.gal/normativa/detalle/9210'],
 ['Desde la incorporación a un grupo de lenguas','Limitar la permanencia a un trimestre, salvo ampliación excepcional autorizada por Inspección.','Alumnado de incorporación tardía · Orden 8/09/2021, art. 68.2','https://www.lex.gal/normativa/detalle/9210'],
 ['Cada trimestre','Reunir los órganos colegiados; documentación de sesión ordinaria al menos una semana antes y convocatoria extraordinaria al menos 48 horas antes.','Infantil y primaria · Decreto 374/1996, art. 51','https://www.lex.gal/normativa/detalle/10307'],
 ['Cada mes','Celebrar al menos una reunión del equipo de ciclo y levantar acta.','Infantil y primaria · Orden 22/07/1997, cap. VI.1.4','https://www.lex.gal/normativa/detalle/8094'],
 ['Antes de Navidad, Semana Santa y fin de curso','Celebrar las sesiones de evaluación de cada grupo.','Infantil y primaria · Orden 22/07/1997, cap. IV.10.7','https://www.lex.gal/normativa/detalle/8094'],
 ['Tras aprobar la PGA','Remitir copia de la PGA y el acta del consejo escolar a Inspección en cinco días.','Infantil y primaria · Orden 22/07/1997, cap. I.3.9','https://www.lex.gal/normativa/detalle/8094'],
 ['Desde una falta injustificada','Comunicarla a la dirección territorial en siete días.','Infantil y primaria · Orden 22/07/1997, cap. V.3.6','https://www.lex.gal/normativa/detalle/8094'],
 ['Desde una petición de un tercio de miembros','Convocar el órgano colegiado en 20 días como máximo; celebrar la sesión en un mes como máximo.','Infantil y primaria · Decreto 374/1996, art. 51','https://www.lex.gal/normativa/detalle/10307'],
 ['Desde la solicitud a la ANPA','Conceder diez días para proponer representante al consejo escolar cuando corresponda.','Infantil y primaria · Decreto 374/1996, art. 41','https://www.lex.gal/normativa/detalle/10307'],
 ['Cada trimestre, e inicio y fin de curso','Reunir los órganos colegiados; convocatoria ordinaria con documentación al menos una semana antes; extraordinaria, al menos 48 horas antes.','IES · Decreto 324/1996, art. 51','https://www.lex.gal/normativa/detalle/3911'],
 ['Elecciones al consejo escolar','Admitir candidaturas durante al menos 7 días; reclamación contra proclamación en los 2 días siguientes y resolución el siguiente día hábil.','Centros afectados · Decreto 324/1996, disposición adicional primera','https://www.lex.gal/normativa/detalle/3911'],
 ['Desde la solicitud a la AMPA','Conceder 10 días para proponer representante al consejo escolar, cuando corresponda.','IES · Decreto 324/1996, art. 40','https://www.lex.gal/normativa/detalle/3911'],
 ['Desde la petición de un tercio de miembros','Convocar órgano colegiado en un máximo de 20 días y celebrar sesión en un máximo de un mes desde la petición.','IES · Decreto 324/1996, art. 51','https://www.lex.gal/normativa/detalle/3911'],
 ['Desde la recepción de horarios','Inspección resuelve en 20 días; si devuelve el horario general, modificarlo en la primera reunión siguiente del consejo escolar antes del inicio de las clases.','IES · Orden 1/08/1997, puntos 94 y 13','https://www.lex.gal/normativa/detalle/8091'],
 ['Desde una falta injustificada','Comunicar la falta de asistencia o puntualidad a la dirección territorial en 7 días e informar simultáneamente al interesado.','Dirección de IES · Orden 1/08/1997, punto 104','https://www.lex.gal/normativa/detalle/8091'],
 ['Desde una propuesta de cambio del proyecto educativo','Conceder al consejo escolar al menos un mes para estudiarla; aprobación posible en el tercer trimestre.','IES · Orden 1/08/1997, punto 36','https://www.lex.gal/normativa/detalle/8091'],
 ['Desde la revocación de un delegado','Convocar nuevas elecciones en un plazo de 15 días.','IES · Decreto 324/1996, art. 111','https://www.lex.gal/normativa/detalle/3911']
];
function deadlineMonth(isoDate){return ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"][Number(isoDate.slice(5,7))-1]||"VAR"}
function calendarItems(){return [...DEADLINES,...(Array.isArray(db.manualDeadlines)?db.manualDeadlines:[]).map(x=>[x.date,x.date.split('-').reverse().join('/'),x.title,x.scope||'Plazo manual',x.source||'',x.id])].sort((a,b)=>a[0].localeCompare(b[0]))}
const CALENDAR_SOURCE_NAMES = {
 'https://www.lex.gal/es/normativa/detalle/6914?mod=false':'Orden de 03/10/2000 · Organización y funcionamiento de los CPI',
 'https://www.lex.gal/normativa/detalle/10307':'Decreto 374/1996 · Reglamento de los CEIP',
 'https://www.lex.gal/normativa/detalle/1673':'Decreto 229/2011 · Atención a la diversidad',
 'https://www.lex.gal/normativa/detalle/3911':'Decreto 324/1996 · Reglamento de los IES',
 'https://www.lex.gal/normativa/detalle/3439':'Decreto 7/1999 · Reglamento de los CPI',
 'https://www.lex.gal/normativa/detalle/8091':'Orden de 01/08/1997 · Organización de los IES',
 'https://www.lex.gal/normativa/detalle/8094':'Orden de 22/07/1997 · Organización de los CEIP',
 'https://www.lex.gal/normativa/detalle/9094':'Orden de 21/10/2022 · Admisión del alumnado',
 'https://www.lex.gal/normativa/detalle/9210':'Orden de 08/09/2021 · Atención a la diversidad',
 'https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf':'Orden de 04/06/2026 · Calendario escolar 2026/27',
 'https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf':'Resolución de 11/06/2026 · Instrucciones de curso 2026/27',
 'https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf':'Resolución de 27/08/2026 · Elecciones a los consejos escolares 2026/27'
};
// Fechas de publicación en el DOG, distintas de las fechas de firma de las normas.
const CALENDAR_SOURCE_PUBLICATIONS = {
 'https://www.lex.gal/normativa/detalle/3911':'1996-08-09',
 'https://www.lex.gal/normativa/detalle/3439':'1999-01-26',
 'https://www.lex.gal/normativa/detalle/10307':'1996-10-21',
 'https://www.lex.gal/normativa/detalle/1673':'2011-12-21',
 'https://www.lex.gal/normativa/detalle/8091':'1997-09-02',
 'https://www.lex.gal/normativa/detalle/8094':'1997-09-02',
 'https://www.lex.gal/es/normativa/detalle/6914?mod=false':'2000-11-02',
 'https://www.lex.gal/normativa/detalle/9210':'2021-10-26',
 'https://www.lex.gal/normativa/detalle/9094':'2022-11-08',
 'https://www.xunta.gal/dog/Publicados/2026/20260615/AnuncioG0761-050626-0001_gl.pdf':'2026-06-15',
 'https://www.xunta.gal/dog/Publicados/2026/20260623/AnuncioG0761-110626-0003_gl.pdf':'2026-06-23',
 'https://www.xunta.gal/dog/Publicados/2026/20260904/AnuncioG0761-270826-0001_gl.pdf':'2026-09-04'
};
function calendarSources(items){
 const urls=new Set([...items.map(x=>x[4]),...RELATIVE_DEADLINES.map(x=>x[3])].filter(x=>/^https?:\/\//i.test(x)));
 const groups=[['Decretos',[]],['Órdenes',[]],['Resto',[]]];
 for(const url of urls){const name=CALENDAR_SOURCE_NAMES[url]||url;const group=/^Decreto\b/i.test(name)?0:/^Orden\b/i.test(name)?1:2;groups[group][1].push(url)}
 return groups.filter(([,sources])=>sources.length).map(([heading,sources])=>`<section class="calendar-source-group"><h4>${heading}</h4><ul class="calendar-source-list">${sources.sort((a,b)=>(CALENDAR_SOURCE_PUBLICATIONS[a]||'9999-12-31').localeCompare(CALENDAR_SOURCE_PUBLICATIONS[b]||'9999-12-31')||(CALENDAR_SOURCE_NAMES[a]||a).localeCompare(CALENDAR_SOURCE_NAMES[b]||b,'es')).map(url=>`<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(CALENDAR_SOURCE_NAMES[url]||url)}</a></li>`).join('')}</ul></section>`).join('');
}
function deadlineRow(item,featured=false){const source=/^https?:\/\//i.test(item[4])?`<a href="${esc(item[4])}" target="_blank" rel="noopener noreferrer">Consultar fuente</a>`:esc(item[4]||'Sin fuente indicada');return `<div class="deadline${item[0]<calendarToday()?' overdue':''}${featured?' featured':''}"><span class="deadline-month" aria-label="Mes de vencimiento ${deadlineMonth(item[0])}">${deadlineMonth(item[0])}</span><time>${esc(item[1])}</time><div><strong>${esc(item[2])}</strong><small>${esc(item[3])} · ${source}${item[5]?` · <button class="btn small danger" onclick="deleteManualDeadline('${item[5]}')">Eliminar</button>`:''}</small></div></div>`}
function relativeRow(x){return `<div class="deadline"><span class="deadline-month" aria-label="Mes variable">VAR</span><time>${esc(x[0])}</time><div><strong>${esc(x[1])}</strong><small>${esc(x[2])} · <a href="${esc(x[3])}" target="_blank" rel="noopener noreferrer">Consultar norma</a></small></div></div>`}
function calendarToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function calendarPanel(){
 const items=calendarItems(), upcoming=items.filter(x=>x[0]>=calendarToday()), featured=new Set(upcoming.slice(0,5));
 return `<div class="panel"><div class="panelhead"><h2>Calendario de plazos · 2026/27</h2><button class="btn small primary" onclick="newManualDeadline()">+ Añadir plazo</button></div><div class="panelbody"><div class="toolbar"><input id="calendarSearch" class="input" type="search" style="flex:1" placeholder="Buscar fecha, evento, centro o norma…" aria-label="Buscar eventos en el calendario" oninput="filterCalendar()"><span class="pill">${upcoming.length} próximos</span></div><p class="muted" style="font-size:12px;margin:0 0 12px">Fechas normativas; comprueba el ámbito y los ajustes por día no lectivo. *En admisión, si el último día no es lectivo, se traslada al siguiente día lectivo.</p><div id="calendarResults"><div class="deadline-list">${upcoming.slice(0,5).map(x=>deadlineRow(x)).join('')||'<div class="empty">No quedan plazos próximos.</div>'}</div></div><div class="calendar-dropdowns"><details id="calendarMore" class="calendar-more"><summary>Ver el calendario completo (${items.length} actuaciones)</summary><div class="deadline-list">${items.map(x=>deadlineRow(x,featured.has(x))).join('')}</div><p class="muted" style="font-size:12px">Además: candidaturas al consejo escolar, mínimo 7 días naturales; documentación de baremo, 10 días hábiles tras cerrar la admisión; reclamaciones a listas provisionales, 5 días hábiles desde su publicación.</p><h3 style="font-size:14px;color:var(--accent)">Plazos periódicos y relativos</h3><div class="deadline-list">${RELATIVE_DEADLINES.map(relativeRow).join('')}</div><p class="muted" style="font-size:12px">Esta selección no abarca todas las convocatorias y enseñanzas.</p></details><details id="calendarSources" class="calendar-more"><summary>Ver fuentes de calendario</summary>${calendarSources(items)}</details></div></div></div>`;
}
function normalizeCalendarSearch(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function filterCalendar(){
 const raw=document.getElementById('calendarSearch')?.value||'', query=normalizeCalendarSearch(raw.trim());
 const box=document.getElementById('calendarResults'), more=document.getElementById('calendarMore');
 if(!box||!more)return;
 if(!query){const upcoming=calendarItems().filter(x=>x[0]>=calendarToday());box.innerHTML=`<div class="deadline-list">${upcoming.slice(0,5).map(x=>deadlineRow(x)).join('')||'<div class="empty">No quedan plazos próximos.</div>'}</div>`;more.hidden=false;return}
 const matches=calendarItems().filter(x=>normalizeCalendarSearch([x[0],x[1],x[2],x[3],x[4],deadlineMonth(x[0])].join(' ')).includes(query));
 const relative=RELATIVE_DEADLINES.filter(x=>normalizeCalendarSearch(x.join(' ')).includes(query));
 box.innerHTML=`<p class="muted" style="font-size:12px">${matches.length+relative.length} resultados</p><div class="deadline-list">${matches.map(x=>deadlineRow(x)).join('')}${relative.map(relativeRow).join('')||(!matches.length?'<div class="empty">No se encontraron eventos.</div>':'')}</div>`;
 more.hidden=true;
}
function newManualDeadline(){
 openModal('Añadir plazo',`<div class="formgrid"><div class="field"><label for="manualDate">Fecha límite *</label><input id="manualDate" type="date" class="input" required></div><div class="field"><label for="manualTitle">Actuación *</label><input id="manualTitle" class="input" style="width:100%" required maxlength="200"></div><div class="field full"><label for="manualScope">Centros o ámbito</label><input id="manualScope" class="input" style="width:100%" maxlength="200"></div><div class="field full"><label for="manualSource">Enlace a la fuente (opcional)</label><input id="manualSource" class="input" style="width:100%" type="url" placeholder="https://…"></div></div>`,()=>{
  const date=document.getElementById('manualDate').value,title=document.getElementById('manualTitle').value.trim(),scope=document.getElementById('manualScope').value.trim(),source=document.getElementById('manualSource').value.trim();
  if(!date||!title){alert('Indica la fecha límite y la actuación.');return}
  if(source&&!/^https?:\/\//i.test(source)){alert('El enlace debe empezar por https:// o http://.');return}
  if(!Array.isArray(db.manualDeadlines))db.manualDeadlines=[];
  db.manualDeadlines.push({id:uid(),date,title,scope,source});save();closeModal();dashboard();
 });
}
function deleteManualDeadline(id){if(!confirm('¿Eliminar este plazo manual?'))return;db.manualDeadlines=(db.manualDeadlines||[]).filter(x=>x.id!==id);save();dashboard()}
function filterHomeRequests(){
 const q=(document.getElementById('homeRequestSearch')?.value||'').trim().toLocaleLowerCase('es');
 const onlyPending=!!document.getElementById('homeRequestPendingOnly')?.checked;
 const rows=document.querySelectorAll('#homeRequestList .home-request-row');let visible=0;
 rows.forEach(row=>{row.hidden=(!!q&&!row.dataset.center.includes(q))||(onlyPending&&row.dataset.finished==='true');if(!row.hidden)visible++});
 const empty=document.getElementById('homeRequestNoResults');if(empty){empty.hidden=!rows.length||(!q&&!onlyPending)||visible>0;empty.textContent='No hay resultados con los filtros seleccionados.';}
}
