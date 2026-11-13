/* Escape del Laboratorio Numérico — juego offline 2D, puro Canvas + JavaScript */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const N=NumLab.names;
const rooms=[
  {name:'Acceso y seguridad',heading:'ACCESO Y SEGURIDAD',brief:'Reactiva los controles resolviendo cinco ecuaciones no lineales.',
   mission:'Las puertas dependen de raíces correctas de funciones.',col:'#5ef6db',dark:'#123f43',short:['Bisección','Falsa posición','Newton-Raphson','Secante','Punto fijo']},
  {name:'Cámara de sensores',heading:'CÁMARA DE SENSORES',brief:'Recupera datos perdidos mediante técnicas de interpolación.',
   mission:'Cinco consolas necesitan reconstruir mediciones.',col:'#a99bff',dark:'#2b2752',short:['Interpolación lineal','Lagrange','Newton adelante','Newton atrás','Diferencias divididas']},
  {name:'Núcleo de energía',heading:'NÚCLEO DE ENERGÍA',brief:'Resuelve los sistemas de ecuaciones y restablece la planta.',
   mission:'Sincroniza las redes de energía del complejo.',col:'#ffc982',dark:'#594027',short:['Gauss','Gauss-Jordan','Montante','Jacobi','Gauss-Seidel']},
  {name:'Archivo de anomalías',heading:'MÍNIMOS CUADRADOS',brief:'Repara las señales con datos ruidosos usando cinco modelos de regresión.',
   mission:'Ajusta curvas que aproximen la tendencia de las mediciones.',col:'#f2a2ff',dark:'#5a2b60',short:['Línea recta','Cuadrática','Cúbica','Lineal + función','Cuadrática + función']},
  {name:'OMEGA: núcleo hostil',heading:'ENFRENTAMIENTO FINAL',brief:'Desactiva tres escudos con cálculos reales. Luego esquiva los ataques y dispara con ESPACIO.',
   mission:'Derrota a la IA OMEGA y escapa del laboratorio.',col:'#ff6f99',dark:'#702c46',short:['Escudo: raíces','Escudo: sistemas','Escudo: regresión']}
];
const stations=[{x:182,y:193},{x:450,y:193},{x:737,y:193},{x:310,y:455},{x:762,y:455}];
const bossStations=[{x:166,y:205},{x:422,y:205},{x:680,y:205}];
const bossAlgorithms=[2,11,17];
const getStations=()=>room===4?bossStations:stations;
const bossSolved=[false,false,false];
const bossCached={};
let bossHP=3,health=100,invulnerable=0,shake=0,hitFlash=0,score=0,shotCooldown=0,fireCooldown=0;
let drones=[],shots=[],lasers=[],particles=[],soundOn=true,audioCtx=null,sectorTime=0;
const persistKey='numericalEscapeDeluxe_20_v2';
function sound(kind='click'){
 if(!soundOn)return;
 try {audioCtx??=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();
 const t=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
 osc.type=kind==='hurt'?'sawtooth':kind==='shoot'?'square':'sine';
 const freqs={click:[450,600],solve:[430,880],door:[275,520],hurt:[170,60],shoot:[980,300],win:[660,1320],boss:[100,260]};
 const [a,b]=freqs[kind]||freqs.click;
 osc.frequency.setValueAtTime(a,t);osc.frequency.exponentialRampToValueAtTime(Math.max(40,b),t+.16);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(kind==='hurt'?.035:.025,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+.22);
 osc.connect(gain);gain.connect(audioCtx.destination);osc.start(t);osc.stop(t+.23);
 }catch(e){}
}
function saveGame(){try{localStorage.setItem(persistKey,JSON.stringify({solved,room,health,bossSolved,bossHP,score}));}catch(e){}}
function loadGame(){try{const data=JSON.parse(localStorage.getItem(persistKey)||'null');if(!data)return false;
 if(!Array.isArray(data.solved)||data.solved.length!==20)return false;
 for(let i=0;i<20;i++)solved[i]=Boolean(data.solved[i]);
 room=Math.max(0,Math.min(4,Math.trunc(data.room)||0));health=Math.max(10,Math.min(100,Number(data.health)||100));
 bossHP=Math.max(0,Math.min(3,Number(data.bossHP??3)));score=Number(data.score)||0;
 if(Array.isArray(data.bossSolved))for(let i=0;i<3;i++)bossSolved[i]=Boolean(data.bossSolved[i]);
 // No permitir acceso a zonas bloqueadas con progreso adulterado.
 for(let i=0;i<Math.min(4,room);i++)if(solved.slice(i*5,i*5+5).some(v=>!v)){room=i;break;}
 if(room===4&&solved.some(v=>!v))room=solved.findIndex(v=>!v)/5|0;
 return true;
 }catch(e){return false;}}
function resetGame(){solved.fill(false);bossSolved.fill(false);Object.keys(cached).forEach(k=>delete cached[k]);Object.keys(bossCached).forEach(k=>delete bossCached[k]);room=0;bossHP=3;health=100;score=0;won=false;player.x=72;player.y=334;player.tx=null;player.ty=null;startTime=performance.now();shots=[];lasers=[];spawnDrones();saveGame();refreshSidebar();updateHUD();}
function updateHUD(){let h=$('healthText'),f=$('healthFill');if(h)h.textContent=Math.ceil(health)+'%';if(f)f.style.width=health+'%';
 let bh=$('bossHud');if(bh)bh.hidden=room!==4;
 if(room===4){$('bossText').textContent=Math.round(bossHP/3*100)+'%';$('bossFill').style.width=bossHP/3*100+'%';}
}
function sparkle(x,y,col='#75ffca',n=20){for(let i=0;i<n;i++){
 const a=Math.random()*Math.PI*2,spd=40+Math.random()*190;particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:.5+Math.random()*.55,max:1,col});
 }if(particles.length>280)particles.splice(0,particles.length-280);
}
function spawnDrones(){drones=[];if(room===4)return;for(let i=0;i<3;i++)drones.push({cx:285+i*285,cy:i%2?405:280,phase:i*2.2,range:95+i*12,speed:.48+i*.11,x:285+i*285,y:280,spin:0});}
function damage(amt){if(invulnerable>0||activeModal||won)return;health=Math.max(0,health-amt);invulnerable=1.45;shake=15;hitFlash=.25;sound('hurt');sparkle(player.x,player.y,'#ff7089',13);
 if(health<=0){health=100;player.x=72;player.y=335;player.tx=null;player.ty=null;lasers=[];showToast('⚠ Traje restaurado en punto de control. Los métodos completados se conservan.');}
 else showToast('⚠ ¡Esquiva los drones! Energía: '+Math.ceil(health)+'%');updateHUD();saveGame();}
function story(heading,paragraph,icon='⬡'){
 const html=modalHead('CAPÍTULO '+String(room+1).padStart(2,'0')+' / TRANSMISIÓN',''+heading,'Registro recuperado del laboratorio.',false)+
 `<div class="dialog-body"><div class="story-accent">${icon}</div><p class="intro-lead">${es(paragraph)}</p><div class="dialog-footer"><span class="keyhint">WASD · E calcular · F avanzar ${room===4?'· ESPACIO atacar':''}</span><button class="btn primary" id="storyGo">CONTINUAR →</button></div></div>`;
 openModal('story',html,true);$('storyGo').onclick=()=>{closeModal();sound('door');};
}
function combat(dt){
 if(activeModal||won)return;
 invulnerable=Math.max(0,invulnerable-dt);hitFlash=Math.max(0,hitFlash-dt);shake=Math.max(0,shake-dt*34);
 shotCooldown=Math.max(0,shotCooldown-dt);fireCooldown-=dt;
 for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
 if(room===4){
  if(fireCooldown<0&&bossHP>0){fireCooldown=2.4;let yy=335+Math.sin(now*.001)*66;lasers.push({x:897,y:yy,vx:-260,phase:0});sound('boss');}
  for(let i=lasers.length-1;i>=0;i--){const z=lasers[i];z.x+=z.vx*dt;z.phase+=dt;if(Math.hypot(z.x-player.x,z.y-player.y)<29){damage(17);lasers.splice(i,1);}else if(z.x<15)lasers.splice(i,1);}
  for(let i=shots.length-1;i>=0;i--){const z=shots[i];z.x+=620*dt;if(z.x>888){
   let by=340+Math.sin(now*.001)*66;
   if(bossSolved.every(Boolean)&&Math.abs(z.y-by)<115&&bossHP>0){bossHP--;score+=200;sound('solve');shake=9;sparkle(915,by,'#ff7eac',48);showToast('✓ Impacto en OMEGA · '+bossHP+' núcleos restantes');saveGame();updateHUD();
    if(bossHP===0){lasers=[];won=true;setTimeout(()=>victory(),800);}}
   shots.splice(i,1);
  }}
 }else{
  for(const d of drones){d.spin+=dt*4;d.x=d.cx+Math.sin(now*.001*d.speed*2+d.phase)*d.range;d.y=d.cy+Math.cos(now*.00065+d.phase)*46;
   if(Math.hypot(d.x-player.x,d.y-player.y)<40)damage(12);
  }
 }
}
function fire(){if(activeModal||won||room!==4)return;
 if(!bossSolved.every(Boolean)){showToast('Resuelve primero las 3 barreras del jefe');return;}
 if(shotCooldown>0)return;shotCooldown=.48;shots.push({x:player.x+25,y:player.y});sound('shoot');sparkle(player.x+20,player.y,'#aefdf1',6);
}

const player={x:72,y:334,tx:null,ty:null,direction:1,walk:0};
const keys=new Set(), solved=Array(20).fill(false),cached={};
let room=0,now=0,lastTime=0,startTime=performance.now(),activeModal='',toastTimeout=0,won=false;
const overlay=$('overlay'),dialog=$('dialog');
const es = s => String(s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const colorBlend=(hex,a)=>hex+Math.round(a*255).toString(16).padStart(2,'0');
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const doneCount=()=>solved.filter(Boolean).length;
const roomDone=(id=room)=>id===4?bossSolved.filter(Boolean).length:solved.slice(id*5,id*5+5).filter(Boolean).length;
const roomComplete=()=>room===4?(bossSolved.every(Boolean)&&bossHP===0):roomDone()===5;
function openModal(type,html,slim=false){
  activeModal=type;overlay.classList.remove('hidden');dialog.className='dialog'+(slim?' slim':'');dialog.innerHTML=html;
  const c=dialog.querySelector('[data-close]');if(c)c.addEventListener('click',closeModal);
  dialog.scrollTop=0;
}
function closeModal(){
  if(activeModal==='welcome') return;
  overlay.classList.add('hidden');activeModal='';dialog.innerHTML='';
  keys.clear();canvas.focus?.();
}
function modalHead(kicker,title,sub='',closable=true){
  return `<div class="dialog-head"><div><div class="dialog-eyebrow">${es(kicker)}</div><h2 class="dialog-title">${es(title)}</h2>${sub?`<p class="dialog-subtitle">${es(sub)}</p>`:''}</div>${closable?'<button class="close-dialog" type="button" data-close title="Cerrar">×</button>':''}</div>`;
}
function showToast(msg){
  const toast=$('gameToast');toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>toast.classList.remove('show'),3100);
}
function welcome(){
  let html=modalHead('INICIANDO SIMULACIÓN','Misión: Escape del Laboratorio','Un videojuego 2D que resuelve de verdad los métodos numéricos.',false)+
   `<div class="dialog-body"><p class="intro-lead">La inteligencia artificial OMEGA ha secuestrado las instalaciones. Recupera 20 algoritmos, evade sus drones de seguridad, repara las señales con mínimos cuadrados y vence al núcleo central.</p>
   <div class="intro-grid"><div class="intro-tile"><span class="intro-num">01 / ENCUENTRA</span><h3>Explora el laboratorio</h3><p>Mueve a tu personaje con WASD o las flechas del teclado y localiza las cinco terminales de cada sala.</p></div>
   <div class="intro-tile"><span class="intro-num">02 / CALCULA</span><h3>Activa una consola</h3><p>Presiona E. Después elige «Resolver automáticamente» y observa las iteraciones del algoritmo.</p></div>
   <div class="intro-tile"><span class="intro-num">03 / ESCAPA</span><h3>Desbloquea la salida</h3><p>Completa las cuatro salas, desactiva los tres escudos de OMEGA y dispárale con ESPACIO mientras esquivas sus ataques.</p></div></div>
   <div class="dialog-footer"><div class="keyhint">4 salas · 20 métodos · jefe final · Sin internet</div><button class="btn primary" id="startBtn">INICIAR MISIÓN →</button></div></div>`;
  openModal('welcome',html,true);
  $('startBtn').addEventListener('click',()=>{activeModal='';overlay.classList.add('hidden');sound('click');if(room===4&&bossHP===0){won=true;victory();}else showToast('Acércate a una terminal y pulsa E');});
}
function help(){
  openModal('help',modalHead('MANUAL DE OPERACIÓN','Cómo jugar','Controles y funcionamiento del sistema')+`<div class="dialog-body"><div class="intro-grid">
   <div class="intro-tile"><span class="intro-num">DESPLAZAMIENTO</span><h3>W, A, S, D o flechas</h3><p>Camina con WASD o flechas. Puedes hacer clic para caminar. Los drones dañan tu traje: al perder toda la energía reapareces sin perder cálculos.</p></div>
   <div class="intro-tile"><span class="intro-num">TERMINALES</span><h3>Tecla E</h3><p>Al estar cerca de una consola, abre su problema, calcula la solución y consulta la tabla y la gráfica.</p></div>
   <div class="intro-tile"><span class="intro-num">SIGUIENTE SALA</span><h3>Tecla F</h3><p>Tras resolver cinco métodos, ve a la derecha y pulsa F. En la sala final, desactiva 3 escudos con E y dispara con ESPACIO.</p></div>
   </div><p class="teacher-desc">En «Modo profesor» puedes escribir tus propias ecuaciones, puntos, sistemas y datos para mínimos cuadrados. Todos los cálculos se ejecutan localmente.</p>
   <div class="dialog-footer"><button id="restartBtn" class="btn back">↻ Reiniciar partida</button><button class="btn primary" data-close2>VOLVER AL JUEGO</button></div></div>`,true);
  $('restartBtn').onclick=()=>{if(confirm('¿Reiniciar todos los niveles?')){resetGame();closeModal();showToast('Nueva partida iniciada');}};
  dialog.querySelector('[data-close2]').onclick=closeModal;
}
function currentMethod(localIndex){return room===4?bossAlgorithms[localIndex]:room*5+localIndex;}
function nearestStation(){
  let idx=-1,d=Infinity;
  getStations().forEach((s,i)=>{let v=dist(s,player);if(v<d){d=v;idx=i;}});
  return d<105?idx:-1;
}
function closeDoor(){return player.x>930 && Math.abs(player.y-334)<116;}
function interact(){
  if(activeModal || won)return;
  const i=nearestStation();
  if(i!==-1){if(room===4)openBossPuzzle(i);else openPuzzle(currentMethod(i));return;}
  if(closeDoor()){
    if(roomComplete())advance();
    else showToast('Faltan '+(5-roomDone())+' terminales por resolver');
    return;
  }
  showToast('Acércate a una consola para interactuar');
}
function advance(){
  if(!roomComplete()){showToast('Resuelve las 5 terminales antes de salir');return;}
  if(room===4){if(bossHP===0){won=true;victory();}return;}
  room++;player.x=72;player.y=334;player.tx=null;player.ty=null;fireCooldown=1;lasers=[];shots=[];spawnDrones();saveGame();refreshSidebar();updateHUD();
  const stories=[null,
   ['El archivo fantasma','Los sensores perdieron sus lecturas. Recupera la información interpolando datos.','⌁'],
   ['El corazón de la planta','El sistema eléctrico responde a ecuaciones simultáneas. Resuélvelas antes de que OMEGA apague el reactor.','⚡'],
   ['La mentira en los datos','OMEGA contaminó las mediciones con ruido. Los mínimos cuadrados permitirán reconstruir la tendencia sin forzar cada dato.','∑'],
   ['PROTOCOLO OMEGA','Tres barreras protegen al núcleo. Calcula cada escudo con E. Luego usa ESPACIO para lanzar tus disparos mientras esquivas rayos.','☣']];
  story(...stories[room]);
}
function terminalDescription(index){
  const r=NumLab.solve(index);
  return r.problem;
}
function openPuzzle(index){
  let result=cached[index];
  const body=modalHead('TERMINAL '+String(index+1).padStart(2,'0')+' / ALGORITMO NUMÉRICO',N[index],NumLab.descriptions[index]);
  const d=NumLab.solve(index);
  if(result){showResult(result,index,false);return;}
  openModal('puzzle',body+`<div class="dialog-body"><div class="challenge-top"><div class="pill">DESAFÍO POR RESOLVER</div><span class="keyhint">SECTOR ${Math.floor(index/5)+1} · CONSOLA ${(index%5)+1}/5</span></div>
   <div class="math-question"><div class="section-caption">PROBLEMA DETECTADO</div><p>${es(d.problem)}</p></div>
   <div class="section-caption">MÉTODO A EJECUTAR</div><div class="formula-block">${es(d.formula)}</div>
   <p class="teacher-desc" style="margin-top:17px">Al iniciar el cálculo se ejecutará el algoritmo paso por paso, se obtendrá un resultado y se guardarán las iteraciones reales en una tabla para revisarlas.</p>
   <div class="dialog-footer"><span class="keyhint">Cálculo local, no requiere conexión.</span><button id="runMethod" class="btn primary">⚡ RESOLVER AUTOMÁTICAMENTE</button></div></div>`);
  $('runMethod').addEventListener('click',()=>{
    try {result=NumLab.solve(index);cached[index]=result;solved[index]=true;health=Math.min(100,health+7);score+=100;saveGame();sound('solve');sparkle(stations[index%5].x,stations[index%5].y,rooms[room].col,28);updateHUD();refreshSidebar();showResult(result,index,false);showToast('✓ '+N[index]+' resuelto');}
    catch(err){showToast('Error de cálculo: '+err.message);}
  });
}

function openBossPuzzle(i){
 const idx=bossAlgorithms[i],result=bossCached[i];if(result){showResult(result,idx,false);return;}
 let r=NumLab.solve(idx);
 const html=modalHead('BARRERA OMEGA / '+(i+1)+'/3','Desactivar escudo '+(i+1),'El núcleo exige un cálculo verificable antes de que puedas atacarlo.')+
 `<div class="dialog-body"><div class="boss-callout">☣ Cada escudo requiere un algoritmo distinto. Los resultados y las iteraciones son cálculos reales.</div><div class="math-question"><div class="section-caption">MÉTODO: ${es(r.name)}</div><p>${es(r.problem)}</p></div><div class="formula-block">${es(r.formula)}</div><div class="dialog-footer"><button class="btn primary" id="breakShield">⚡ RESOLVER Y ROMPER ESCUDO</button></div></div>`;
 openModal('puzzle',html);$('breakShield').onclick=()=>{
  try {let z=NumLab.solve(idx);bossSolved[i]=true;bossCached[i]=z;health=Math.min(100,health+15);score+=250;saveGame();refreshSidebar();updateHUD();sound('solve');sparkle(bossStations[i].x,bossStations[i].y,'#eab2ff',36);showResult(z,idx,false);if(bossSolved.every(Boolean))showToast('⚡ ¡ESCUDOS ABIERTOS! Acércate y presiona ESPACIO.');}
  catch(err){showToast('Error: '+err.message);}
 };
}

function formatTime(ms){let s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function victory(){
 const seconds=Math.floor((performance.now()-startTime)/1000);
 const html=modalHead('FIN DE MISIÓN / OMEGA DERROTADA','¡Laboratorio recuperado!','La inteligencia artificial hostil ha sido desconectada.',false)+
 `<div class="dialog-body"><div class="success-emblem">✦ ⬡ ✦</div><div class="victory-stat">20 / 20</div><p class="victory-copy">Completaste cuatro sectores, resolviste 20 algoritmos de verdad, venciste los tres escudos numéricos y derrotaste al jefe OMEGA.</p>
 <div class="victory-grid"><div class="victory-item"><strong>20</strong><small>ALGORITMOS RESUELTOS</small></div><div class="victory-item"><strong>${score}</strong><small>PUNTOS DE MISIÓN</small></div><div class="victory-item"><strong>${formatTime(seconds*1000)}</strong><small>TIEMPO TRANSCURRIDO</small></div></div>
 <div class="dialog-footer"><span class="keyhint">Tu laboratorio ya está libre.</span><div><button class="btn back" id="victoryReview">MODO PROFESOR</button> <button class="btn primary" id="playAgain">↻ VOLVER A JUGAR</button></div></div></div>`;
 openModal('victory',html,true);sound('win');
 $('playAgain').onclick=()=>{resetGame();closeModal();story('Operación reiniciada','El laboratorio vuelve a estar bajo amenaza. ¡Buena suerte!','✦');};
 $('victoryReview').onclick=()=>teacher();
}
function paintGraph(c,result){
  if(!result.plot||!result.plot.length)return;
  const g=c.getContext('2d'),w=c.width,h=c.height,arr=result.plot;
  g.clearRect(0,0,w,h);g.fillStyle='#0c1a26';g.fillRect(0,0,w,h);
  let coords=arr.map(([x,y])=>[Number(x),Number(y)]);
  if(result.plotType==='convergence')coords=coords.map(([x,y])=>[x,Math.log10(Math.max(1e-12,y))]);
  let trend=result.fitCurve||[];const all=coords.concat(trend);
  let xmin=Math.min(...all.map(z=>z[0])),xmax=Math.max(...all.map(z=>z[0]));
  let ymin=Math.min(...all.map(z=>z[1])),ymax=Math.max(...all.map(z=>z[1]));
  if(xmin===xmax){xmin-=1;xmax+=1;}if(ymin===ymax){ymin-=1;ymax+=1;}
  let mx=(xmax-xmin)*.09,my=(ymax-ymin)*.16;
  xmin-=mx;xmax+=mx;ymin-=my;ymax+=my;
  const X=x=>38+(x-xmin)/(xmax-xmin)*(w-54),Y=y=>h-30-(y-ymin)/(ymax-ymin)*(h-50);
  g.strokeStyle='#294150';g.lineWidth=1;g.font='10px Consolas';g.fillStyle='#7f9ba8';
  for(let i=0;i<=4;i++){
    let x=38+i*(w-54)/4,y=17+i*(h-47)/4;
    g.beginPath();g.moveTo(x,16);g.lineTo(x,h-30);g.stroke();
    g.beginPath();g.moveTo(38,y);g.lineTo(w-16,y);g.stroke();
  }
  g.beginPath();(trend.length?trend:coords).forEach(([x,y],i)=>i?g.lineTo(X(x),Y(y)):g.moveTo(X(x),Y(y)));
  g.strokeStyle='#6fefe0';g.lineWidth=2.4;g.shadowBlur=12;g.shadowColor='#6fefe0';g.stroke();g.shadowBlur=0;
  coords.forEach(([x,y])=>{g.beginPath();g.arc(X(x),Y(y),3.6,0,Math.PI*2);g.fillStyle='#cefff3';g.fill();});
  g.fillStyle='#a6bdc8';g.textAlign='left';g.fillText(result.plotType==='convergence'?'log₁₀(error)':result.plotType==='regression'?'● Datos  — Ajuste mínimos cuadrados':'Datos medidos',43,13);
  g.fillText(xmin.toFixed(1),38,h-9);g.textAlign='right';g.fillText(xmax.toFixed(1),w-16,h-9);
  g.fillStyle='#7899a4';g.textAlign='left';g.fillText(ymax.toFixed(1),4,16);g.fillText(ymin.toFixed(1),4,h-33);
}
function showResult(result,index,fromTeacher){
  const kicker=fromTeacher?'MODO PROFESOR / CÁLCULO PERSONALIZADO':'CONSOLA '+String(index+1).padStart(2,'0')+' / COMPLETADA';
  const header=modalHead(kicker,result.name,'Procedimiento e iteraciones calculados por el algoritmo.');
  const rows=result.rows.map(row=>'<tr>'+row.map(z=>'<td>'+es(z)+'</td>').join('')+'</tr>').join('');
  const table=`<div class="table-scroll"><table><thead><tr>${result.columns.map(z=>'<th>'+es(z)+'</th>').join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const extra=result.normalMatrix?`<div class="data-card wide-data"><div class="card-caption">ECUACIONES NORMALES Y ELIMINACIÓN (MOSTRAR AL DOCENTE)</div><div class="regression-matrix">${result.normalMatrix.map((row,i)=>row.map((z,j)=>es(Number(z).toFixed(5))+'·a'+j).join(' + ')+' = '+es(Number(result.normalRhs[i]).toFixed(5))).join('<br>')}</div><div class="table-note">${result.steps.map(t=>es(t)).join(' · ')}</div>${result.prediction!==null&&result.prediction!==undefined?`<p class="teacher-desc">Predicción en x=${es(result.predictionAt)}: g(x)=${es(result.prediction.toFixed(7))}</p>`:''}</div>`:'';
  const graphic=result.plot&&result.plot.length?'<div class="data-card"><div class="card-caption">VISUALIZACIÓN DE DATOS</div><canvas id="resultGraph" class="chart" width="440" height="230"></canvas><div class="table-note">'+(result.plotType==='convergence'?'Evolución de la magnitud del error por iteración.':result.plotType==='regression'?'Puntos originales y curva de mejor ajuste por mínimos cuadrados.':'Representación de los nodos proporcionados.')+'</div></div>':
      '<div class="data-card"><div class="card-caption">COMPROBACIÓN DEL SISTEMA</div><p class="teacher-desc">El algoritmo transforma la matriz y calcula las incógnitas. Las operaciones y resultados de cada paso aparecen en la tabla para comprobación del docente.</p><div class="pill completed">✓ SISTEMA RESUELTO</div></div>';
  const html=header+`<div class="dialog-body"><span class="pill completed">✓ CÁLCULO REALIZADO</span>
   <div class="math-question"><div class="section-caption">PROBLEMA</div><p>${es(result.problem)}</p></div>
   <div class="formula-block"><div class="section-caption">FÓRMULA APLICADA</div>${es(result.formula)}</div>
   <div class="solution-highlight"><div class="solution-label">RESULTADO FINAL</div><div class="solution-answer">${es(result.answer)}</div><div class="solution-desc">${es(result.explanation)}</div></div>
   <div class="content-columns"><div class="data-card"><div class="card-caption">TABLA DE ITERACIONES / ${result.rows.length} PASOS</div>${table}</div>${graphic}</div>${extra}
   <div class="dialog-footer"><span class="keyhint">Estos valores se calcularon; no son respuestas precargadas.</span><button class="btn primary" id="resultClose">${fromTeacher?'VOLVER AL MODO PROFESOR':'CONTINUAR EXPLORANDO'} →</button></div></div>`;
  openModal('result',html);
  if(result.plot){let c=$('resultGraph');if(c)paintGraph(c,result);}
  $('resultClose').onclick=()=>fromTeacher?teacher():closeModal();
}
let draft={feature:'sin',regPoints:'',regX:'2',index:0,equation:'x^3-x-2',a:'1',b:'2',x0:'1.5',g:'cbrt(x+2)',x:'2.5',points:'0,5; 1,5; 2,11; 3,35; 4,89',matrix:'4,1,1; 1,5,1; 2,1,6',vector:'9,14,22'};
function teacher(){
  const selector=N.map((name,i)=>`<option value="${i}" ${Number(draft.index)===i?'selected':''}>${String(i+1).padStart(2,'0')} · ${es(name)}</option>`).join('');
  let html=modalHead('BANCO DE PRUEBAS','Modo profesor','Introduce nuevos valores y verifica que el programa aplica el método seleccionado.')+
    `<div class="dialog-body"><p class="teacher-desc">Elige cualquiera de los 20 algoritmos. Cambia ecuaciones, semillas, puntos, matrices o funciones de ajuste. No se necesita internet.</p>
    <div class="teacher-grid"><div class="field wide"><label for="teacherMethod">MÉTODO A UTILIZAR</label><select id="teacherMethod">${selector}</select></div>
    <div class="form-section" id="rootFields"><div class="field wide"><label for="eqInput">ECUACIÓN f(x), usando x y ^</label><input id="eqInput" value="${es(draft.equation)}" placeholder="x^3-x-2"></div>
    <div class="field"><label for="leftInput">EXTREMO a / SEMILLA 1</label><input id="leftInput" value="${es(draft.a)}"></div>
    <div class="field"><label for="rightInput">EXTREMO b / SEMILLA 2</label><input id="rightInput" value="${es(draft.b)}"></div>
    <div class="field"><label for="x0Input">SEMILLA x0 (Newton o punto fijo)</label><input id="x0Input" value="${es(draft.x0)}"></div>
    <div class="field"><label for="gInput">FUNCIÓN g(x) PARA PUNTO FIJO</label><input id="gInput" value="${es(draft.g)}"></div></div>
    <div class="form-section" id="interpFields"><div class="field wide"><label for="pointsInput">PUNTOS (x,y), SEPARADOS CON ;</label><textarea id="pointsInput" placeholder="0,5; 1,5; 2,11">${es(draft.points)}</textarea></div>
    <div class="field"><label for="interpX">VALOR x QUE QUIERES CALCULAR</label><input id="interpX" value="${es(draft.x)}"></div></div>
    <div class="form-section" id="matrixFields"><div class="field wide"><label for="matrixInput">MATRIZ A, FILAS SEPARADAS POR ;</label><textarea id="matrixInput">${es(draft.matrix)}</textarea></div><div class="field wide"><label for="vectorInput">VECTOR b, NÚMEROS SEPARADOS POR COMA</label><input id="vectorInput" value="${es(draft.vector)}"></div></div>
    <div class="form-section" id="regFields"><div class="field wide"><button class="btn back" type="button" id="useRegExample">↻ CARGAR DATOS DE EJEMPLO PARA ESTE MÉTODO</button></div><div class="field wide"><label for="regPointsInput">DATOS (x,y) PARA MÍNIMOS CUADRADOS, SEPARADOS POR ;</label><textarea id="regPointsInput" placeholder="0,1; 1,2; 2,4; 3,8">${es(draft.regPoints||NumLab.regressionDefaults[Math.max(0,+draft.index-15)].points.map(p=>p.join(',')).join('; '))}</textarea></div>
    <div class="field"><label for="featureInput">FUNCIÓN EXTRA f(x)</label><select id="featureInput">${['sin','cos','exp','ln','sqrt','tan'].map(f=>`<option value="${f}" ${draft.feature===f?'selected':''}>${f}(x)</option>`).join('')}</select></div>
    <div class="field"><label for="regXInput">EVALUAR LA CURVA EN x (opcional)</label><input id="regXInput" value="${es(draft.regX)}"></div></div></div>
    <div id="teacherError" aria-live="polite"></div>
    <div class="dialog-footer"><span class="keyhint">Ejemplo: sin(x), sqrt(x), x^2, exp(x), cbrt(x)</span><button class="btn primary" id="teacherRun">⚙ EJECUTAR ALGORITMO</button></div></div>`;
  openModal('teacher',html);
  const toggle=()=>{const i=+$('teacherMethod').value;$('rootFields').classList.toggle('visible',i<5);$('interpFields').classList.toggle('visible',i>=5&&i<10);$('matrixFields').classList.toggle('visible',i>=10&&i<15);$('regFields').classList.toggle('visible',i>=15);};
  $('teacherMethod').addEventListener('change',toggle);toggle();
  $('useRegExample').onclick=()=>{let k=Math.max(0,Math.min(4,(+$('teacherMethod').value)-15)),ex=NumLab.regressionDefaults[k];$('regPointsInput').value=ex.points.map(p=>p.join(', ')).join('; ');$('featureInput').value=ex.feature;$('regXInput').value=String(ex.points[Math.floor(ex.points.length/2)][0]);};
  $('teacherRun').onclick=()=>{
    try{
      const index=+$('teacherMethod').value;
      draft={index,equation:$('eqInput').value,a:$('leftInput').value,b:$('rightInput').value,x0:$('x0Input').value,g:$('gInput').value,
        x:$('interpX').value,points:$('pointsInput').value,matrix:$('matrixInput').value,vector:$('vectorInput').value,regPoints:$('regPointsInput').value,feature:$('featureInput').value,regX:$('regXInput').value};
      let options={};
      const csv=s=>s.split(/[;,\n]+/).map(z=>z.trim()).filter(Boolean).map(Number);
      const pairs=s=>s.split(/[;\n]+/).map(z=>z.trim()).filter(Boolean).map(row=>row.split(/[\s,]+/).map(Number));
      if(index<5){options={equation:draft.equation,a:Number(draft.a),b:Number(draft.b),x0:Number(draft.x0),g:draft.g};}
      else if(index<10){let p=pairs(draft.points);if(p.some(row=>row.length!==2))throw new Error('Escribe pares x,y separados por ;.');options={points:p,x:Number(draft.x)};}
      else if(index<15){let mat=pairs(draft.matrix);let v=csv(draft.vector);options={A:mat,bvec:v};}
      else{const p=pairs(draft.regPoints);if(p.some(row=>row.length!==2))throw new Error('Escribe pares x,y separados por ;.');options={points:p,feature:draft.feature,x:draft.regX.trim()===''?undefined:Number(draft.regX)};}
      const result=NumLab.solve(index,options);
      showResult(result,index,true);
    }catch(e){$('teacherError').innerHTML='<div class="error-banner">⚠ '+es(e.message)+'</div>';}
  };
}
function refreshSidebar(){
  let r=rooms[room];
  $('roomTitle').textContent=r.name;$('roomDesc').textContent=r.brief;
  $('stageHeading').textContent='SECTOR '+String(room+1).padStart(2,'0')+' / '+r.heading;
  $('globalCount').textContent=doneCount()+' / 20';$('globalFill').style.width=(doneCount()/20*100)+'%';
  $('roomCount').textContent=roomDone()+'/'+(room===4?3:5)+(room===4?' · vida '+bossHP+'/3':'');
  for(let i=0;i<5;i++){$('badge'+i).className=room===i?'current':(i<4&&roomDone(i)===5)||(i===4&&bossHP===0)?'done':'';}
  let list=$('terminalList');list.replaceChildren();
  for(let i=0;i<(room===4?3:5);i++){
    const done=room===4?bossSolved[i]:solved[currentMethod(i)];const e=document.createElement('div');e.className='terminal-row'+(done?' completed':'');
    e.innerHTML='<span class="terminal-number">0'+(i+1)+'</span><span class="terminal-text">'+es(r.short[i])+'</span><span class="terminal-lock">'+(done?'✓':'◇')+'</span>';
    e.title='Ve a esa consola dentro del juego para activarla.';list.appendChild(e);
  }
}
function movePlayer(dt){
  if(activeModal||won)return;
  let dx=0,dy=0;
  if(keys.has('ArrowLeft')||keys.has('a'))dx--;
  if(keys.has('ArrowRight')||keys.has('d'))dx++;
  if(keys.has('ArrowUp')||keys.has('w'))dy--;
  if(keys.has('ArrowDown')||keys.has('s'))dy++;
  if(dx||dy){player.tx=null;player.ty=null;}
  else if(player.tx!==null){dx=player.tx-player.x;dy=player.ty-player.y;
    if(Math.hypot(dx,dy)<5){player.tx=null;player.ty=null;dx=0;dy=0;}
  }
  const l=Math.hypot(dx,dy);
  if(l>0){const speed=230*dt;player.x+=dx/l*Math.min(l,speed);player.y+=dy/l*Math.min(l,speed);
    if(dx)player.direction=Math.sign(dx);player.walk+=dt*13;}
  player.x=clamp(player.x,34,1012);player.y=clamp(player.y,142,530);
  const i=nearestStation();const inter=$('interaction');
  if(i!==-1){inter.innerHTML='<kbd>E</kbd> Activar '+es(rooms[room].short[i])+' '+((room===4?bossSolved[i]:solved[currentMethod(i)])?'✓':'');}
  else if(room===4)inter.innerHTML=bossSolved.every(Boolean)?'<kbd>ESPACIO</kbd> ¡Dispara al núcleo y esquiva los rayos!':'<kbd>E</kbd> Rompe las '+(3-roomDone())+' barreras que faltan';
  else if(closeDoor())inter.innerHTML=roomComplete()?'<kbd>F</kbd> Puerta desbloqueada · continuar →':'<kbd>F</kbd> Puerta bloqueada · '+(5-roomDone())+' restantes';
  else inter.innerHTML='<kbd>W A S D</kbd> o <kbd>↑ ← ↓ →</kbd> para moverte';
  $('touchAction').textContent=room===4&&bossSolved.every(Boolean)?'⚡ DISPARAR':closeDoor()?'F · SALIR':'E · ACTIVAR';
}
// Primitivas gráficas. Todo el arte del juego se dibuja al vuelo, sin archivos externos.
function rr(x,y,w,h,r,fill,stroke=null,line=1){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
}
function text(t,x,y,size=14,color='#fff',weight='600',align='left',font="'Segoe UI',Arial"){
  ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(String(t),x,y);
}
function line(x1,y1,x2,y2,color='#38505b',width=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function glow(x,y,r,c,alpha=.22){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,colorBlend(c,alpha));g.addColorStop(1,colorBlend(c,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function background(r){
  let bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0c1d2a');bg.addColorStop(1,'#0a1723');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const gradient=ctx.createLinearGradient(0,100,W,500);gradient.addColorStop(0,'#0a1f2c');gradient.addColorStop(.5,'#132c37');gradient.addColorStop(1,'#0a1c2a');rr(20,95,1040,454,20,gradient,'#3f6472',2);
  ctx.save();ctx.beginPath();ctx.roundRect(21,95,1038,452,19);ctx.clip();
  for(let y=100;y<545;y+=47)line(20,y,1060,y,'#244050',.8);
  for(let x=25;x<1060;x+=47)line(x,95,x,548,'#244050',.8);
  for(let x=48;x<1060;x+=220){glow(x,115,130,r.col,.055);glow(x,540,110,r.col,.07);}
  for(let i=0;i<32;i++){let x=(i*167)%1024+28,y=(i*107)%430+110;ctx.fillStyle=i%3===0?'#406273':'#254451';ctx.fillRect(x,y,3,3);}
  ctx.restore();
  // Consolas y vigas de pared superior e inferior
  rr(20,95,1040,27,4,'#182d39','#355360');rr(20,524,1040,24,4,'#1a303d','#355360');
  for(let x=65;x<1020;x+=135){rr(x,108,65,5,2, '#3b6670');rr(x,534,65,4,2,'#315563');}
  // Señalización vertical
  for(let i=0;i<3;i++){let bx=130+i*400;rr(bx,82,175,26,6,'#111d2c','#38525e');text(['SECTOR '+String(room+1).padStart(2,'0'),'CONTROL DE SISTEMAS','ACCESO RESTRINGIDO'][i],bx+87,99,10,i===0?r.col:'#708e9c','700','center');}
  // Cámara / energía en fondo, por ambiente
  glow(545,320,260,r.col,.043);
  for(let i=0;i<3;i++){let x=120+i*425;
    rr(x,305,95,69,8,'#0c212e','#335360');
    rr(x+12,319,71,36,4,'#132e3a','#417282');
    ctx.strokeStyle=colorBlend(r.col,.6);ctx.lineWidth=2;
    ctx.beginPath();for(let j=0;j<16;j++){let xx=x+13+j*4.5,yy=336+Math.sin(j*.75+now*.0017+i)*9; j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();
  }
  // Salida, línea de guía hacia la puerta
  for(let x=912;x<1035;x+=27){rr(x,328,15,3,2,colorBlend(r.col,.3));}
  text('LABORATORIO DE MÉTODOS NUMÉRICOS',300,68,12,'#8eacbd','800');
  text('ZONA 0'+(room+1)+'  /  '+r.heading,1036,68,11,r.col,'800','right');
}
function drawStation(pos,i,r){
  const id=currentMethod(i),done=room===4?bossSolved[i]:solved[id],near=dist(pos,player)<105;
  let pulse=(Math.sin(now*.0032+i*2)+1)/2;
  glow(pos.x,pos.y,96,done?'#70eda9':r.col,.09+(.09*pulse));
  // Apoyo de una consola física
  rr(pos.x-76,pos.y+32,152,22,4,'#07141e','#42616d');
  rr(pos.x-81,pos.y-49,162,90,8,'#192d3b','#587481',1.5);
  rr(pos.x-69,pos.y-36,138,68,6,done?'#15332f':'#102731',done?'#6ee5a4':'#3b8f92',1);
  for(let c=0;c<3;c++)rr(pos.x-58+c*10,pos.y-26,5,5,1,done?'#6feaab':c===1?r.col:'#345e6a');
  ctx.strokeStyle=done?'#76eda3':r.col;ctx.lineWidth=2;ctx.beginPath();
  for(let j=0;j<=32;j++){let x=pos.x-52+j*3.2,y=pos.y+1+Math.sin(j*.47+now*.003+i)*9;
    if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  // Terminal logo/resolution marker
  rr(pos.x-28,pos.y+41,56,7,3,done?'#53c89b':'#5f8390');
  rr(pos.x-81,pos.y-75,162,23,5,done?'#163e36':'#1e3740',done?'#438a65':'#3a6976');
  text(String(i+1).padStart(2,'0'),pos.x-70,pos.y-59,11,done?'#89fac2':'#89b0bf','800');
  let stationName=r.short[i].toUpperCase();if(stationName.length>20)stationName=stationName.slice(0,20);
  text(stationName,pos.x+7,pos.y-58,10,done?'#b1ffd4':'#d5f1f8','800','center');
  text(done?'✓':near?'E':'●',pos.x+67,pos.y-59,13,done?'#7df1a8':near?'#f1d58d':'#6b9dac','800','center');
  if(near){ctx.strokeStyle=r.col;ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(pos.x-88,pos.y-82,176,140);ctx.setLineDash([]);
    rr(pos.x-38,pos.y+61,76,24,5,'#072a32','#57d3ca');text('PULSA E',pos.x,pos.y+77,11,'#d6fff8','800','center');}
}
function drawDoor(r){
  if(room===4)return;
  const unlocked=roomComplete(),c=unlocked?'#73edb2':'#ff8c91';
  const x=1001,y=242;
  glow(x+34,y+88,110,c,unlocked?.27:.14);
  rr(x,y,68,182,8,'#0c1c29','#45616f',3);
  rr(x+10,y+13,48,154,5,unlocked?'#113e39':'#382534',c,2);
  for(let k=0;k<4;k++){line(x+17,y+27+k*41,x+53,y+27+k*41,colorBlend(c,.56),2);}
  rr(x-40,y+59,34,48,6,'#192d39','#55717b');
  ctx.beginPath();ctx.arc(x-23,y+74,7,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();
  text(unlocked?'OPEN':'LOCK',x-23,y+96,8,c,'800','center');
  if(unlocked){text('SALIDA ABIERTA',x+34,y-12,10,c,'800','center');
    text('F →',x+34,y+100,20,'#f1fff9','900','center');}
  else{text('SALIDA BLOQUEADA',x+34,y-12,10,'#e4959a','800','center');}
  for(let j=0;j<4;j++)rr(1016+j*11,220,7,4,2,unlocked?'#51dbaa':'#a44958');
}
function drawPlayer(r){
  const {x,y}=player,moving=(keys.has('w')||keys.has('a')||keys.has('s')||keys.has('d')||keys.has('ArrowRight')||keys.has('ArrowUp')||keys.has('ArrowLeft')||keys.has('ArrowDown')||player.tx!==null);
  const bounce=moving?Math.sin(player.walk)*2.3:Math.sin(now*.003)*1.2;
  ctx.beginPath();ctx.ellipse(x,y+19,24,8,0,0,Math.PI*2);ctx.fillStyle='#010b1399';ctx.fill();
  ctx.fillStyle='#1a5260';rr(x-14,y+5+bounce,10,19,4,'#265d68','#66a3a7');rr(x+4,y+5-bounce,10,19,4,'#265d68','#66a3a7');
  rr(x-21,y-18+bounce,42,38,10,'#b5d5d8','#e3f5f5',1);
  rr(x-26,y-12+bounce,10,26,5,'#417b85','#78cad1');rr(x+17,y-12+bounce,10,26,5,'#417b85','#78cad1');
  rr(x-13,y-12+bounce,26,25,7,'#25505d');rr(x-8,y-6+bounce,16,13,4,r.col);
  ctx.beginPath();ctx.arc(x,y-27+bounce,22,0,Math.PI*2);ctx.fillStyle='#e2f2ec';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#2f606a';ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y-27+bounce,16,12,0,0,Math.PI*2);ctx.fillStyle='#0d3444';ctx.fill();
  ctx.beginPath();ctx.ellipse(x+5,y-33+bounce,7,4,-.5,0,Math.PI*2);ctx.fillStyle='#84d9e0';ctx.fill();
  rr(x-20,y+18,40,5,3,'#3f8c99');
  text('HUGO',x,y-56+bounce,10,'#d6faff','800','center');
}
function drawMinimap(){
  rr(36,555,250,21,4,'#111f2aed','#35515f');text('◉  TERMINALES '+roomDone()+'/'+(room===4?3:5),47,569,10,'#b6d7e3','800');
  for(let i=0;i<(room===4?3:5);i++)rr(167+i*21,562,14,7,2,(room===4?bossSolved[i]:solved[currentMethod(i)])?'#87f2af':'#365768');
  text('WASD / FLECHAS  ·  E  ·  F',1038,569,10,'#829dad','700','right');
}
function drawEnemy(d,r){
  glow(d.x,d.y,68,'#ff6a86',.16);
  ctx.save();ctx.translate(d.x,d.y);ctx.rotate(Math.sin(d.spin)*.12);
  rr(-23,-15,46,31,8,'#392339','#fc7892',2);rr(-40,-8,15,18,4,'#68304a','#f9a0af');rr(25,-8,15,18,4,'#68304a','#f9a0af');
  ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fillStyle='#ffcfbd';ctx.fill();ctx.beginPath();ctx.arc(1,0,4,0,Math.PI*2);ctx.fillStyle='#b32b68';ctx.fill();ctx.restore();
  text('SENTINEL',d.x,d.y-27,9,'#ffc3c7','800','center');
}
function drawBoss(r){
 const x=933,y=340+Math.sin(now*.001)*66;
 glow(x,y,175,'#ff396d',.26);
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(now*.0007)*.08);
 ctx.strokeStyle='#ff769f';ctx.lineWidth=4;
 for(let i=0;i<8;i++){let a=i*Math.PI/4+now*.00035;line(Math.cos(a)*64,Math.sin(a)*64,Math.cos(a)*88,Math.sin(a)*88,'#f478a4',5);}
 ctx.beginPath();ctx.arc(0,0,72,0,Math.PI*2);ctx.fillStyle='#321d36';ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,46,0,Math.PI*2);ctx.fillStyle='#5b244b';ctx.fill();ctx.strokeStyle='#ffb6bd';ctx.lineWidth=3;ctx.stroke();
 ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fillStyle=bossHP>0?'#ff577b':'#5c5665';ctx.fill();
 ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fillStyle='#fff1e0';ctx.fill();ctx.restore();
 text('OMEGA',x,y-105,19,'#ffd2dd','900','center');
 if(!bossSolved.every(Boolean)){
  ctx.beginPath();ctx.arc(x,y,103+Math.sin(now*.007)*4,0,Math.PI*2);ctx.lineWidth=3;ctx.strokeStyle='#bf76fb';ctx.setLineDash([12,12]);ctx.stroke();ctx.setLineDash([]);
  text('ESCUDO '+(3-bossSolved.filter(Boolean).length)+'/3',x,y+120,11,'#d5b4ff','800','center');
 }
 for(const z of lasers){glow(z.x,z.y,26,'#ff6e88',.35);rr(z.x-20,z.y-7,40,14,7,'#e64b70','#ffe0da');}
 for(const z of shots){glow(z.x,z.y,25,'#91fff1',.40);rr(z.x-9,z.y-5,23,10,5,'#d9ffff','#7dedfb');}
}
function drawParticles(){for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.9);rr(p.x,p.y,4,4,2,p.col);}ctx.globalAlpha=1;}
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  const r=rooms[room];background(r);
  // Alfombras guía, cableado y señales en suelo
  rr(50,294,958,94,13,'#0e2330a9','#244958');
  line(47,341,1005,341,colorBlend(r.col,.26),2);
  for(let x=90;x<950;x+=130){ctx.strokeStyle='#326c77';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,285);ctx.lineTo(x+30,273);ctx.lineTo(x+55,273);ctx.stroke();}
  getStations().forEach((s,i)=>drawStation(s,i,r));drawDoor(r);if(room===4)drawBoss(r);else drones.forEach(d=>drawEnemy(d,r));drawPlayer(r);drawParticles();drawMinimap();
  if(hitFlash>0){ctx.fillStyle='rgba(240,35,65,'+(hitFlash*.24)+')';ctx.fillRect(0,0,W,H);}ctx.restore();
}
function frame(t){
  const dt=Math.min(.05,(t-lastTime)/1000||.016);lastTime=t;now=t;
  movePlayer(dt);combat(dt);draw();
  $('clockText').textContent=formatTime(t-startTime);
  requestAnimationFrame(frame);
}
window.addEventListener('keydown',e=>{
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(key) && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))e.preventDefault();
  if(activeModal){if(key==='Escape'&&activeModal!=='welcome')closeModal();return;}
  if(key===' '&&!e.repeat){fire();return;}
  if(key==='m'&&!e.repeat){soundOn=!soundOn;updateAudioBtn();return;}
  if(['e','f'].includes(key)&&!e.repeat){
    if(key==='e')interact();else if(closeDoor()&&room!==4)advance();else showToast(room===4?'Enfréntate al núcleo OMEGA':'Acércate a la puerta para cambiar de sala');
    return;
  }
  if(key==='t'&&!e.repeat){teacher();return;}
  if(key==='h'&&!e.repeat){help();return;}
  keys.add(key);
});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('click',e=>{
  if(activeModal||won)return;
  let bounds=canvas.getBoundingClientRect(),x=(e.clientX-bounds.left)*W/bounds.width,y=(e.clientY-bounds.top)*H/bounds.height;
  const k=getStations().findIndex(s=>Math.hypot(x-s.x,y-s.y)<80);
  if(k!==-1 && dist(getStations()[k],player)<105){if(room===4)openBossPuzzle(k);else openPuzzle(currentMethod(k));return;}
  if(x>985&&y>235&&y<445&&closeDoor()){if(roomComplete())advance();else showToast('Aún faltan terminales.');return;}
  player.tx=clamp(x,34,1012);player.ty=clamp(y,142,530);
});
overlay.addEventListener('click',e=>{if(e.target===overlay && activeModal!=='welcome')closeModal();});
$('helpBtn').addEventListener('click',help);$('teacherBtn').addEventListener('click',teacher);
$('touchAction').onclick=()=>{if(room===4&&bossSolved.every(Boolean)){fire();return;}if(room!==4&&closeDoor()){if(roomComplete())advance();else showToast('Faltan '+(5-roomDone())+' terminales');}else interact();};
document.querySelectorAll('[data-move]').forEach(btn=>{
  const key=btn.dataset.move;
  btn.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);btn.setPointerCapture(e.pointerId);});
  btn.addEventListener('pointerup',()=>keys.delete(key));
  btn.addEventListener('pointercancel',()=>keys.delete(key));
  btn.addEventListener('lostpointercapture',()=>keys.delete(key));
});
function updateAudioBtn(){const el=$('audioBtn');el.innerHTML=soundOn?'♫ <span>Sonido: ON</span>':'♪ <span>Sonido: OFF</span>';}
$('audioBtn').addEventListener('click',()=>{soundOn=!soundOn;updateAudioBtn();if(soundOn)sound('click');});
const lastSave=loadGame();spawnDrones();updateHUD();refreshSidebar();welcome();
if(lastSave)showToast('✓ Partida guardada recuperada');
requestAnimationFrame(frame);
})();
