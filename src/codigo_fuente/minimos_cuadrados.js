/* Mínimos cuadrados: cinco familias tomadas de los apuntes de MCuadrados.
   Ajuste usando matrices normales AᵀA a = Aᵀy, con pivoteo parcial.
   El sistema no utiliza bibliotecas, respuestas precalculadas ni eval(). */
(function(global){
'use strict';
const base=global.NumLab, original=base.solve;
const names=['Mínimos cuadrados · recta','Mínimos cuadrados · cuadrática','Mínimos cuadrados · cúbica','Mínimos cuadrados · lineal + f(x)','Mínimos cuadrados · cuadrática + f(x)'];
const descriptions=[
 'Encuentra a₀ y a₁ para g(x)=a₀+a₁x por mínimos cuadrados.',
 'Ajusta g(x)=a₀+a₁x+a₂x² mediante las ecuaciones normales.',
 'Ajusta g(x)=a₀+a₁x+a₂x²+a₃x³ a datos con error.',
 'Calcula g(x)=a₀+a₁x+a₂f(x), con f(x) elegida por el usuario.',
 'Calcula g(x)=a₀+a₁x+a₂x²+a₃f(x) mediante ajuste de mínimos cuadrados.'
];
const defaults=[
 {points:[[1.1,2.5],[1.9,2.7],[2.4,3.7],[4.8,5.2],[5.1,6.0],[10.5,8.3]],feature:'sin'},
 {points:[[0,2.1],[1,2.8],[2,5.5],[3,9.3],[4,14.2],[5,21.7],[6,29.9]],feature:'sin'},
 {points:[[-2,-10.4],[-1,-1.6],[0,2.1],[1,3.1],[2,6.4],[3,18.7],[4,44.2]],feature:'sin'},
 {points:[[0,1.23],[.5,2.29],[1,3.13],[1.5,3.42],[2,3.80],[2.5,3.80],[3,3.41],[3.5,3.13],[4,2.88],[4.5,3.04],[5,3.36]],feature:'sin'},
 {points:[[0,1.28],[.25,1.80],[.5,2.15],[.75,2.42],[1,2.56],[1.25,2.77],[1.5,2.97],[1.75,3.31],[2,3.56],[2.25,4.04]],feature:'exp'}
];
const neat=(z,n=6)=>Number.isFinite(z)?Number(z).toFixed(n):String(z);
const fail=m=>{throw new Error(m);};
function chooseFn(name){
 const fns={sin:Math.sin,cos:Math.cos,exp:Math.exp,ln:Math.log,sqrt:Math.sqrt,tan:Math.tan};
 if(!Object.prototype.hasOwnProperty.call(fns,name))fail('Función no permitida. Usa sin, cos, exp, ln, sqrt o tan.');
 return fns[name];
}
function solveNormal(A,b){
 const n=b.length,m=A.map((row,i)=>[...row,b[i]]),steps=[];
 for(let k=0;k<n;k++){
  let piv=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[piv][k]))piv=i;
  if(Math.abs(m[piv][k])<1e-11)fail('Sistema singular o mal condicionado: añade datos x más variados o cambia la función.');
  if(piv!==k){[m[k],m[piv]]=[m[piv],m[k]];steps.push(`Intercambiar F${k+1} y F${piv+1}`);}
  for(let i=k+1;i<n;i++){
   let factor=m[i][k]/m[k][k];
   for(let j=k;j<=n;j++)m[i][j]-=factor*m[k][j];
   steps.push(`F${i+1} ← F${i+1} - (${neat(factor,4)})·F${k+1}`);
  }
 }
 const x=new Array(n).fill(0);
 for(let i=n-1;i>=0;i--){
  let sum=m[i][n];for(let j=i+1;j<n;j++)sum-=m[i][j]*x[j];
  x[i]=sum/m[i][i];steps.push(`Sustitución: a${i} = ${neat(x[i],8)}`);
 }
 return {coeff:x,steps};
}
function regression(index,opt={}){
 const kind=index-15;
 const src=opt.points??defaults[kind].points;
 if(!Array.isArray(src))fail('Proporciona los puntos como pares (x,y).');
 const pts=src.map(p=>Array.isArray(p)&&p.length===2?p.map(Number):[NaN,NaN]);
 const nBasis=[2,3,4,3,4][kind];
 if(pts.length<nBasis)fail('Se necesitan al menos '+nBasis+' observaciones.');
 if(pts.length>160)fail('Máximo 160 observaciones por cálculo para no saturar la interfaz.');
 if(pts.some(p=>p.some(q=>!Number.isFinite(q))))fail('Todos los datos deben ser números finitos.');
 const fnName=opt.feature||defaults[kind].feature, fn=chooseFn(fnName);
 function features(x){
  let row=kind===0?[1,x]:kind===1?[1,x,x*x]:kind===2?[1,x,x*x,x*x*x]:kind===3?[1,x,fn(x)]:[1,x,x*x,fn(x)];
  if(row.some(z=>!Number.isFinite(z)))fail('La función '+fnName+'(x) no está definida en uno de los puntos.');
  return row;
 }
 const B=pts.map(p=>features(p[0]));
 const sums=Array.from({length:nBasis},()=>Array(nBasis).fill(0)),rhs=Array(nBasis).fill(0);
 B.forEach((row,i)=>{
  for(let j=0;j<nBasis;j++){
   rhs[j]+=row[j]*pts[i][1];
   for(let k=0;k<nBasis;k++)sums[j][k]+=row[j]*row[k];
  }
 });
 const {coeff,steps}=solveNormal(sums,rhs);
 const predict=x=>features(x).reduce((s,z,j)=>s+z*coeff[j],0);
 const mean=pts.reduce((s,p)=>s+p[1],0)/pts.length;
 const tss=pts.reduce((s,p)=>s+(p[1]-mean)**2,0);
 const rows=pts.map((p,i)=>{const gx=predict(p[0]);return [i+1,neat(p[0],4),neat(p[1],4),neat(gx,6),neat(p[1]-gx,6)];});
 const sse=pts.reduce((s,p)=>s+(p[1]-predict(p[0]))**2,0);
 const rmse=Math.sqrt(sse/pts.length),r2=tss<1e-12?(sse<1e-12?1:0):1-sse/tss;
 const eq=['a₀ + a₁x','a₀ + a₁x + a₂x²','a₀ + a₁x + a₂x² + a₃x³',`a₀ + a₁x + a₂·${fnName}(x)`,`a₀ + a₁x + a₂x² + a₃·${fnName}(x)`][kind];
 const plot=pts.slice().sort((p,q)=>p[0]-q[0]);
 let xmin=plot[0][0], xmax=plot.at(-1)[0];
 let fit=[];for(let i=0;i<=90;i++){
  const x=xmin+(xmax-xmin)*i/90;
  try {const y=predict(x);if(Number.isFinite(y))fit.push([x,y]);} catch(e){/* dominio discontinuo */}
 }
 return {index,name:names[kind],description:descriptions[kind],
  problem:'Ajustar '+pts.length+' datos (x,y) al modelo '+eq+'.',
  formula:'Minimizar Σ[yi - g(xi)]². Ecuaciones normales: (XᵀX)·a = Xᵀy.',
  answer:coeff.map((z,i)=>`a${i} = ${neat(z,7)}`).join('  ·  '),
  explanation:`Error cuadrático medio (RMSE) = ${neat(rmse,7)}  |  R² = ${neat(r2,7)}  |  ${pts.length} datos`,
  columns:['N°','x','y medido','g(x) ajustado','residuo'],rows,plot,fitCurve:fit,plotType:'regression',
  normalMatrix:sums,normalRhs:rhs,steps,coeff,rmse,r2,
  prediction:(typeof opt.x==='number'&&Number.isFinite(opt.x))?predict(opt.x):null,
  predictionAt:opt.x
 };
}
base.names.push(...names);base.descriptions.push(...descriptions);
base.solve=(index,opt={})=>index<15?original(index,opt):index<20?regression(index,opt):fail('Método fuera de rango.');
base.regressionDefaults=defaults;
base.internals.regression=regression;
if(typeof module!=='undefined'&&module.exports)module.exports=base;
})(typeof window!=='undefined'?window:globalThis);
