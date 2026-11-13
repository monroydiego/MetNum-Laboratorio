/* Motor numérico de Numerical Escape. Sin dependencias ni resultados simulados. */
(function (global) {
  'use strict';
  const ERR = msg => { throw new Error(msg); };
  const neat = (v, n=6) => Number.isFinite(v) ? Number(v).toFixed(n) : String(v);
  const fabs = Math.abs;
  const fnNames = { sin:Math.sin, cos:Math.cos, tan:Math.tan, sqrt:Math.sqrt,
    abs:Math.abs, exp:Math.exp, log:Math.log, ln:Math.log, log10:Math.log10,
    asin:Math.asin, acos:Math.acos, atan:Math.atan, cbrt:Math.cbrt };
  // Parser de expresiones matemáticas: no usa eval ni Function.
  function expression(input) {
    let s = String(input || '').trim().replaceAll('**','^'), pos = 0;
    if (!s) ERR('Escribe una ecuación.');
    let tokens=[];
    while (pos < s.length) {
      if (/\s/.test(s[pos])) { pos++; continue; }
      let m = s.slice(pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (m) { tokens.push({t:'n',v:Number(m[0])}); pos+=m[0].length; continue; }
      m=s.slice(pos).match(/^[a-zA-Z]+/);
      if (m) { tokens.push({t:'id',v:m[0].toLowerCase()});pos+=m[0].length;continue; }
      if ('+-*/^(),'.includes(s[pos])) { tokens.push({t:s[pos],v:s[pos]});pos++;continue; }
      ERR('Carácter no permitido: '+s[pos]);
    }
    tokens.push({t:'EOF'}); let i=0;
    function parse(min=0) {
      let tok=tokens[i++], lhs;
      if (tok.t==='n') lhs={t:'n',v:tok.v};
      else if (tok.t==='-') lhs={t:'neg',a:parse(25)};
      else if (tok.t==='+') lhs=parse(25);
      else if (tok.t==='(') {lhs=parse(0); if (tokens[i++].t!==')') ERR('Falta un paréntesis.');}
      else if (tok.t==='id') {
        if (['x','pi','e'].includes(tok.v)) lhs={t:'var',v:tok.v};
        else if (Object.hasOwn(fnNames,tok.v)) {
          if (tokens[i++].t!=='(') ERR('Usa '+tok.v+'(expresión).');
          const a=parse(0);
          if (tokens[i++].t!==')') ERR('Falta cerrar '+tok.v+'(...).');
          lhs={t:'call',v:tok.v,a};
        } else ERR('Identificador desconocido: '+tok.v);
      } else ERR('Expresión incompleta o inválida.');
      const precedence={'+':10,'-':10,'*':20,'/':20,'^':30};
      while (tokens[i] && precedence[tokens[i].t] >= min) {
        let op=tokens[i++].t, bp=precedence[op], right=parse(op==='^'?bp:bp+1);
        lhs={t:'bin',op,a:lhs,b:right};
      }
      return lhs;
    }
    const tree=parse();
    if(tokens[i].t!=='EOF') ERR('Operador o paréntesis inesperado.');
    function evaluate(t,x) {
      switch(t.t) {
        case 'n':return t.v;
        case 'var':return t.v==='x'?x:t.v==='pi'?Math.PI:Math.E;
        case 'neg':return -evaluate(t.a,x);
        case 'call':return fnNames[t.v](evaluate(t.a,x));
        case 'bin': {
          const a=evaluate(t.a,x),b=evaluate(t.b,x);
          if(t.op==='+')return a+b;
          if(t.op==='-')return a-b;
          if(t.op==='*')return a*b;
          if(t.op==='/')return a/b;
          return a**b;
        }
      }
    }
    return x => { const y=evaluate(tree,Number(x));
      if(!Number.isFinite(y)) ERR('Resultado no finito al evaluar f('+neat(x)+').');
      return y;
    };
  }
  function bisection(f,a,b,tol=1e-6,max=120) {
    let fa=f(a),fb=f(b),rows=[],history=[],c=a;
    if (fa*fb>0) ERR('Se requieren signos opuestos en f(a) y f(b).');
    for(let n=1;n<=max;n++) {
      c=(a+b)/2;let fc=f(c),err=(b-a)/2;
      rows.push([n,neat(a),neat(b),neat(c),neat(fc),neat(err)]);history.push([n,Math.abs(fc)]);
      if(Math.abs(fc)<tol || err<tol)break;
      if(fa*fc<0){b=c;fb=fc;}else{a=c;fa=fc;}
    }
    return {value:c,rows,history};
  }
  function falsePosition(f,a,b,tol=1e-6,max=250) {
    let fa=f(a),fb=f(b),rows=[],history=[],c=a;
    if(fa*fb>0)ERR('Se requieren signos opuestos en los extremos.');
    for(let n=1;n<=max;n++) {
      if(Math.abs(fb-fa)<1e-16)ERR('División entre cero.');
      c=(a*fb-b*fa)/(fb-fa);let fc=f(c);
      rows.push([n,neat(a),neat(b),neat(c),neat(fc),neat(Math.abs(fc))]);history.push([n,Math.abs(fc)]);
      if(Math.abs(fc)<tol)break;
      if(fa*fc<0){b=c;fb=fc;}else{a=c;fa=fc;}
    }
    return {value:c,rows,history};
  }
  function newton(f,x,tol=1e-6,max=80) {
    let rows=[],history=[];
    for(let n=1;n<=max;n++) {
      let h=1e-5*Math.max(1,Math.abs(x)), d=(f(x+h)-f(x-h))/(2*h);
      if(Math.abs(d)<1e-12)ERR('La derivada es casi cero.');
      let next=x-f(x)/d;
      if(!Number.isFinite(next))ERR('La solución divergió.');
      rows.push([n,neat(x),neat(f(x)),neat(d),neat(next),neat(Math.abs(next-x))]);
      history.push([n,Math.abs(f(next))]);
      if(Math.abs(next-x)<tol || Math.abs(f(next))<tol){x=next;break;}
      x=next;
    }
    return {value:x,rows,history};
  }
  function secant(f,a,b,tol=1e-6,max=100) {
    let rows=[],history=[];
    for(let n=1;n<=max;n++) {
      let fa=f(a),fb=f(b);
      if(Math.abs(fb-fa)<1e-15)ERR('Pendiente casi cero.');
      let c=b-fb*(b-a)/(fb-fa);
      if(!Number.isFinite(c))ERR('La solución divergió.');
      rows.push([n,neat(a),neat(b),neat(c),neat(f(c)),neat(Math.abs(c-b))]);history.push([n,Math.abs(f(c))]);
      if(Math.abs(c-b)<tol || Math.abs(f(c))<tol){b=c;break;}
      [a,b]=[b,c];
    }
    return {value:b,rows,history};
  }
  function fixedPoint(g,x,tol=1e-6,max=150) {
    let rows=[],history=[];
    for(let n=1;n<=max;n++) {
      let next=g(x),err=Math.abs(next-x);
      if(!Number.isFinite(next)||Math.abs(next)>1e12)ERR('Punto fijo divergió.');
      rows.push([n,neat(x),neat(next),neat(err)]);history.push([n,err]);
      if(err<tol)return {value:next,rows,history};
      x=next;
    }
    ERR('Punto fijo no convergió en 150 iteraciones.');
  }
  function pointsValid(points) {
    if(!Array.isArray(points)||points.length<2)ERR('Se requieren al menos dos pares (x,y).');
    let p=points.map(([x,y])=>[Number(x),Number(y)]).sort((a,b)=>a[0]-b[0]);
    if(p.some(([x,y])=>!Number.isFinite(x)||!Number.isFinite(y)))ERR('Los puntos deben ser números.');
    if(p.some((z,i)=>i>0&&z[0]===p[i-1][0]))ERR('Existen coordenadas x repetidas.');
    return p;
  }
  function linearInterp(points,x) {
    const p=pointsValid(points);
    for(let i=0;i<p.length-1;i++){
      let [a,ya]=p[i],[b,yb]=p[i+1];
      if(a<=x&&x<=b){let t=(x-a)/(b-a),y=ya+t*(yb-ya);
        return {value:y,rows:[[neat(a),neat(ya),neat(b),neat(yb),neat(t),neat(y)]], plot:p};}
    }
    ERR('x debe pertenecer al intervalo de puntos.');
  }
  function lagrange(points,x) {
    let p=pointsValid(points),rows=[],v=0;
    for(let i=0;i<p.length;i++){
      let li=1;
      for(let j=0;j<p.length;j++) if(j!==i) li*=(x-p[j][0])/(p[i][0]-p[j][0]);
      let term=p[i][1]*li;v+=term;
      rows.push([i,neat(p[i][0]),neat(p[i][1]),neat(li),neat(term)]);
    }
    return {value:v,rows,plot:p};
  }
  function finiteDifferences(points){
    let p=pointsValid(points),h=p[1][0]-p[0][0];
    if(p.some((z,i)=>i>0&&Math.abs(z[0]-p[i-1][0]-h)>1e-9))
      ERR('Newton adelante/atrás requiere x igualmente espaciados.');
    let table=[p.map(z=>z[1])];
    while(table[table.length-1].length>1){let a=table[table.length-1];table.push(a.slice(1).map((z,i)=>z-a[i]));}
    return {p,h,table};
  }
  function newtonForward(points,x){
    const {p,h,table}=finiteDifferences(points);let u=(x-p[0][0])/h,coef=1,v=0,rows=[];
    for(let k=0;k<table.length;k++){
      if(k)coef*=(u-k+1)/k;
      let term=coef*table[k][0];v+=term;
      rows.push([k,neat(table[k][0]),neat(coef),neat(term),neat(v)]);
    }
    return {value:v,rows,plot:p};
  }
  function newtonBackward(points,x){
    const {p,h,table}=finiteDifferences(points);let u=(x-p.at(-1)[0])/h,coef=1,v=0,rows=[];
    for(let k=0;k<table.length;k++){
      if(k)coef*=(u+k-1)/k;
      let delta=table[k].at(-1),term=coef*delta;v+=term;
      rows.push([k,neat(delta),neat(coef),neat(term),neat(v)]);
    }
    return {value:v,rows,plot:p};
  }
  function dividedDifferences(points,x){
    let p=pointsValid(points),ys=p.map(z=>z[1]),rows=[],coeff=[];
    for(let k=0;k<p.length;k++){
      coeff.push(ys[0]);rows.push([k,neat(ys[0]),neat(p[k][0])]);
      ys=ys.slice(1).map((z,i)=>(z-ys[i])/(p[i+k+1][0]-p[i][0]));
    }
    let v=0,prod=1;
    for(let k=0;k<coeff.length;k++){v+=coeff[k]*prod;prod*=x-p[k][0];}
    return {value:v,rows,plot:p};
  }
  function matrixValid(A,b){
    if(!Array.isArray(A)||A.length<1||A.some(z=>!Array.isArray(z)||z.length!==A.length)||b.length!==A.length)
      ERR('A debe ser cuadrada y b debe tener n componentes.');
    const m=A.map((row,i)=>[...row.map(Number),Number(b[i])]);
    if(m.some(row=>row.some(z=>!Number.isFinite(z))))ERR('Los elementos de A y b deben ser números finitos.');
    return m;
  }
  function eliminate(A,b){
    let m=matrixValid(A,b),n=m.length,rows=[];
    for(let k=0;k<n;k++){
      let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;
      if(Math.abs(m[p][k])<1e-12)ERR('Matriz singular.');
      if(k!==p)[m[k],m[p]]=[m[p],m[k]];
      for(let i=k+1;i<n;i++){
        let f=m[i][k]/m[k][k];for(let j=k;j<=n;j++)m[i][j]-=f*m[k][j];
        rows.push(['F'+(i+1),'F'+(i+1)+' − '+neat(f,4)+'·F'+(k+1),m[i].map(z=>neat(z,3)).join('  ')]);
      }
    }
    let x=Array(n).fill(0);
    for(let i=n-1;i>=0;i--){x[i]=(m[i][n]-x.reduce((acc,v,j)=>acc+(j>i?m[i][j]*v:0),0))/m[i][i];
      rows.push(['x'+(i+1),'Sustitución hacia atrás',neat(x[i])]);}
    return {value:x,rows};
  }
  function jordan(A,b){
    let m=matrixValid(A,b),n=m.length,rows=[];
    for(let k=0;k<n;k++){
      let p=k;for(let i=k+1;i<n;i++)if(Math.abs(m[i][k])>Math.abs(m[p][k]))p=i;
      if(Math.abs(m[p][k])<1e-12)ERR('Matriz singular.');
      [m[k],m[p]]=[m[p],m[k]];let div=m[k][k];m[k]=m[k].map(z=>z/div);
      rows.push(['F'+(k+1),'Normalizar por '+neat(div,4),m[k].map(z=>neat(z,3)).join('  ')]);
      for(let i=0;i<n;i++)if(i!==k){let factor=m[i][k];m[i]=m[i].map((z,j)=>z-factor*m[k][j]);
        rows.push(['F'+(i+1),'Anular columna '+(k+1),m[i].map(z=>neat(z,3)).join('  ')]);}
    }
    return {value:m.map(z=>z[n]),rows};
  }
  function montante(A,b){
    let m=matrixValid(A,b),n=m.length,prev=1,rows=[];
    for(let k=0;k<n;k++){
      if(Math.abs(m[k][k])<1e-12){let p=k+1;while(p<n&&Math.abs(m[p][k])<1e-12)p++;
        if(p===n)ERR('Matriz singular.');[m[k],m[p]]=[m[p],m[k]];}
      let pivot=m[k][k],orig=m.map(row=>row.slice());
      for(let i=0;i<n;i++)if(i!==k){
        for(let j=0;j<=n;j++)if(j!==k)m[i][j]=(pivot*orig[i][j]-orig[i][k]*orig[k][j])/prev;
        m[i][k]=0;
      }
      prev=pivot;
      rows.push(['Pivote '+(k+1),neat(pivot,4),m.map(r=>'['+r.map(z=>neat(z,2)).join(' ')+']').join('  ')]);
    }
    return {value:m.map((r,i)=>r[n]/r[i]),rows};
  }
  function iterative(A,b,mode,tol=1e-8,max=250){
    const m=matrixValid(A,b),n=m.length; let x=Array(n).fill(0),rows=[];
    for(let i=0;i<n;i++)if(Math.abs(m[i][i])<1e-12)ERR('La diagonal no debe contener ceros.');
    for(let k=1;k<=max;k++){
      const old=x.slice(),next=mode==='jacobi'?x.slice():x;
      for(let i=0;i<n;i++){
        let s=0;for(let j=0;j<n;j++)if(j!==i)s+=m[i][j]*(mode==='jacobi'?old[j]:next[j]);
        next[i]=(m[i][n]-s)/m[i][i];
      }
      const e=Math.max(...next.map((z,i)=>Math.abs(z-old[i])));
      rows.push([k,...next.map(z=>neat(z)),neat(e)]);
      if(next.some(z=>!Number.isFinite(z)||Math.abs(z)>1e15))ERR('El método divergió.');
      x=next;
      if(e<tol) return {value:x,rows};
    }
    ERR('No convergió en '+max+' iteraciones. Prueba una matriz diagonalmente dominante.');
  }
  const NAMES=[
    'Bisección','Falsa posición','Newton-Raphson','Secante','Punto fijo',
    'Interpolación lineal','Lagrange','Newton hacia adelante','Newton hacia atrás','Diferencias divididas',
    'Eliminación de Gauss','Gauss-Jordan','Montante','Jacobi','Gauss-Seidel'
  ];
  const points=[0,1,2,3,4].map(x=>[x,2*x**3-3*x**2+x+5]);
  const irregular=[0,1,2,4,5].map(x=>[x,2*x**3-3*x**2+x+5]);
  const A=[[4,1,1],[1,5,1],[2,1,6]], b=[9,14,22];
  const descriptions=[
    'Divide el intervalo en mitades y conserva el cambio de signo.',
    'Traza una secante entre los extremos de signos opuestos.',
    'Usa la recta tangente y una derivada aproximada numéricamente.',
    'Aproxima la derivada con dos estimaciones anteriores.',
    'Aplica x(n+1) = g(x(n)) hasta alcanzar la tolerancia.',
    'Une los dos datos próximos mediante un segmento recto.',
    'Construye un polinomio a partir de todos los nodos.',
    'Emplea diferencias finitas desde el primer nodo.',
    'Emplea diferencias finitas desde el último nodo.',
    'Forma coeficientes con diferencias divididas y nodos no uniformes.',
    'Triangulariza la matriz y aplica sustitución regresiva.',
    'Transforma la matriz aumentada en [I | x].',
    'Elimina fracciones con la regla del pivote anterior.',
    'Actualiza todas las variables usando valores de la iteración previa.',
    'Usa de inmediato los valores nuevos al actualizar cada incógnita.'
  ];
  function solve(index, options={}){
    if(!(Number.isInteger(index)&&index>=0&&index<15))ERR('Selecciona un método válido.');
    let run,columns,formula,problem,answer,explanation,plotType;
    if(index<5){
      let eq=options.equation||'x^3 - x - 2';const f=expression(eq),a=Number(options.a??1),bv=Number(options.b??2),x0=Number(options.x0??1.5);
      if([a,bv,x0].some(z=>!Number.isFinite(z)))ERR('Parámetros de ecuación inválidos.');
      const rootRunners=[()=>bisection(f,a,bv),()=>falsePosition(f,a,bv),()=>newton(f,x0),()=>secant(f,a,bv),
        ()=>fixedPoint(expression(options.g||'cbrt(x+2)'),x0)];
      run=rootRunners[index]();
      columns=[
        ['n','a','b','c','f(c)','error'],['n','a','b','c','f(c)','|f(c)|'],
        ['n','x(n)','f(x)','f\'(x)','x(n+1)','error'],['n','x(n-1)','x(n)','x(n+1)','f(x)','error'],
        ['n','x(n)','g(x(n))','error']][index];
      formula=['c = (a + b)/2','c = (a·f(b) - b·f(a))/(f(b)-f(a))',
        "x(n+1) = x(n) - f(x(n))/f'(x(n))",'x(n+1) = x(n) - f(x(n))·(x(n)-x(n-1))/(f(x(n))-f(x(n-1)))',
        'x(n+1) = g(x(n))'][index];
      problem='f(x) = '+eq+' = 0';
      answer='Raíz aproximada: '+neat(run.value,7);
      explanation=run.rows.length+' iteraciones | residuo |f(x)| = '+neat(Math.abs(f(run.value)),8);
      plotType='convergence';
    }else if(index<10){
      const p=options.points??(index===9?irregular:points),x=Number(options.x??2.5);
      if(!Number.isFinite(x))ERR('x debe ser numérico.');
      run=[linearInterp,lagrange,newtonForward,newtonBackward,dividedDifferences][index-5](p,x);
      columns=[
        ['x0','y0','x1','y1','factor','P(x)'],['i','xi','yi','Li(x)','yi·Li'],
        ['orden','Δ^k y0','factor','término','suma'],['orden','∇^k yn','factor','término','suma'],
        ['orden','coeficiente','nodo xi']][index-5];
      formula=[
        'P(x) = y0 + (x-x0)·(y1-y0)/(x1-x0)',
        'P(x) = Σ yi·Li(x)',
        'P(x) = y0 + uΔy0 + u(u-1)Δ²y0/2! + ...',
        'P(x) = yn + u∇yn + u(u+1)∇²yn/2! + ...',
        'P(x) = f[x0] + f[x0,x1](x-x0) + ...'][index-5];
      problem='Puntos: '+p.map(z=>'('+z[0]+', '+z[1]+')').join(' ')+' | x = '+x;
      answer='P('+x+') ≈ '+neat(run.value,7);
      explanation=run.plot.length+' datos utilizados; método aplicado realmente a los nodos.';
      plotType='points';
    }else{
      const matrix=options.A??A,vec=options.bvec??b;
      run=index===10?eliminate(matrix,vec):index===11?jordan(matrix,vec):index===12?montante(matrix,vec):index===13?iterative(matrix,vec,'jacobi'):iterative(matrix,vec,'seidel');
      columns=index<13?['fila','operación','resultado']:['n',...run.value.map((_,i)=>'x'+(i+1)),'error'];
      formula=[
        'Eliminación triangular + sustitución regresiva','Reducción de [A|b] a [I|x]',
        'a(i,j) nuevo = (pivote·a(i,j) - a(i,k)·a(k,j))/pivote previo',
        'x_i(n+1) = (b_i - Σ a_ij·x_j(n))/a_ii',
        'Se usan x_j(n+1) tan pronto estén disponibles'][index-10];
      problem=matrix.map((r,i)=>r.map((z,j)=>z+'x'+(j+1)).join(' + ')+' = '+vec[i]).join('  |  ');
      answer=run.value.map((z,i)=>'x'+(i+1)+' = '+neat(z,6)).join('   ·   ');
      const residual=Math.max(...matrix.map((row,i)=>Math.abs(row.reduce((total,z,j)=>total+z*run.value[j],0)-vec[i])));
      explanation=run.rows.length+' pasos | error residual máximo = '+neat(residual,9);
      plotType=null;
    }
    return {index,name:NAMES[index],description:descriptions[index],problem,formula,columns,
      rows:run.rows,answer,explanation,plot:run.history||run.plot||null,plotType};
  }
  global.NumLab={solve,expression,names:NAMES,descriptions,defaults:{points,irregular,A,b},
    internals:{bisection,falsePosition,newton,secant,fixedPoint,linearInterp,lagrange,newtonForward,newtonBackward,dividedDifferences,eliminate,jordan,montante,iterative}};
  if(typeof module!=='undefined'&&module.exports)module.exports=global.NumLab;
})(typeof window!=='undefined'?window:globalThis);
