// Conclusiones del equipo: una grupal y una personal por integrante. Compartido por ambos manuales.
// Nota: las reflexiones personales son borradores; cada integrante debe revisar y ajustar su texto.
module.exports = (c) => [
  c.H1('Conclusiones'),
  c.H2('Conclusión grupal'),
  c.P('Al inicio, el proyecto era un juego que presentaba problemas del libro. Al final es un sistema con motor numérico, verificación de respuestas con evidencias fotográficas, acceso protegido para docentes y récords por matrícula. Varias decisiones ante erratas o huecos del libro se tomaron durante el desarrollo. Quedan documentadas en el manual técnico, para que quien continúe el trabajo entienda por qué el código hace lo que hace.'),
  c.P('Un juego educativo parece sencillo hasta que hay que decidir quién puede ver las fotos, qué se guarda en el navegador y qué se conserva en el servidor. Responder esas preguntas obligó a separar lo que es provisional de lo que debe persistir. También dejó claro que la documentación forma parte del producto: un manual que describe el sistema tal como funciona obliga a comprobar cada afirmación.'),

  c.H2('Conclusiones personales'),
  c.H3('Emmanuel Carrillo Loera'),
  c.P('Lo que más resalto de este proyecto es el cuidado con los números. Dos métodos pueden dar resultados casi iguales y, aun así, la respuesta de un estudiante es incorrecta si no coincide hasta el tercer decimal. La precisión no se decide al final, sino en la forma en que se guardan y se comparan los valores. Un resultado solo vale si otra persona puede reproducirlo a mano.'),
  c.H3('Luis David Cigala Montes'),
  c.P('La parte más útil fue ver cómo una separación clara en capas facilita cambiar el proyecto sin romperlo. Cada vez que se agregaba una función, las pruebas indicaban si el cambio afectaba otra parte. Como práctica me queda escribir pruebas contra los ejemplos del libro antes de confiar en un resultado, y tratar el orden del código como parte del aprendizaje.'),
  c.H3('David Alejandro Ortiz Fuentes'),
  c.P('Una herramienta educativa debe sentirse clara antes que correcta. Observar cómo reacciona un estudiante ante un aviso, una vida perdida o una puerta bloqueada cambia la manera de diseñar las pantallas. Cada mensaje debe decir qué pasó y qué hacer después, y el color por sí solo no comunica un estado.'),
  c.H3('Jorge Hugo De Leon Sepulveda'),
  c.P('Los métodos de integración y de ecuaciones diferenciales muestran que el error de un paso se arrastra a los siguientes. Por eso cada método necesita su tabla de iteraciones y su propia verificación. Entender el error importa tanto como obtener el número, y una resolución con el formato del libro sirve también para explicarlo.'),
  c.H3('Diego Monroy García'),
  c.P('Todo lo que el sistema guarda debe poder revisarse meses después: evidencias, récords y accesos. Documentar las decisiones, y no solo el código, resultó tan importante como programar, porque un manual bien escrito obliga a comprobar que el sistema hace lo que dice.'),
];
