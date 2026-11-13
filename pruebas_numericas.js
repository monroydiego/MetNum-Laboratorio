const assert=require('assert');
require('./metodos.js');
const lab=require('./minimos_cuadrados.js');
assert.strictEqual(lab.names.length,20);
for(let i=0;i<20;i++){
 const result=lab.solve(i);
 assert(result.rows.length>0,`Sin iteraciones ${i}`);
 assert(result.answer && result.formula,`Sin resultado ${i}`);
 console.log(String(i+1).padStart(2,'0'),result.name, String(result.answer).slice(0,90));
 if(i>=15){ assert(result.rmse>=0 && result.rmse<5,`RMSE fallo ${i}`);assert(result.r2<=1+1e-8,`R2 fallo ${i}`); }
}
const p=[[0,1],[1,3],[2,5],[3,7],[4,9]];
const r=lab.solve(15,{points:p});assert(Math.abs(r.coeff[0]-1)<1e-9);assert(Math.abs(r.coeff[1]-2)<1e-9);
for(let i=16;i<20;i++){
 const r=lab.solve(i,{points:lab.regressionDefaults[i-15].points,feature:lab.regressionDefaults[i-15].feature});assert(Number.isFinite(r.rmse));
}
console.log('TODO OK / 20 algoritmos / recta exacta / regresiones');
