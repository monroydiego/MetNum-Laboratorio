// Conclusión general del equipo. Compartida por ambos manuales.
module.exports = (c) => [
  c.H1('Conclusiones'),
  c.H2('Conclusión general del equipo'),
  c.P('Al inicio, el proyecto consistía en un juego que presentaba problemas del libro. Al cierre del desarrollo, el equipo entrega un sistema con motor numérico, verificación de respuestas con evidencia fotográfica, acceso protegido para docentes, récords por matrícula, una matrícula validada de extremo a extremo y un ajuste del tamaño de la letra que mejora la legibilidad. Varias decisiones ante erratas o huecos del libro se tomaron durante el trabajo y quedan documentadas en el Manual Técnico, de modo que quien continúe el proyecto pueda entender por qué el código se comporta como lo hace.'),
  c.P('Un juego educativo parece sencillo hasta que hay que decidir quién puede ver las fotos, qué se guarda en el navegador y qué se conserva en el servidor. Responder esas preguntas obligó a separar lo provisional de lo que debe persistir. La documentación forma parte del producto: un manual que describe el sistema tal como funciona obliga a comprobar cada afirmación contra el código.'),
];
