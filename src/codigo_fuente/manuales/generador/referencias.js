// Referencias compartidas por ambos manuales. Libro y material de clase: datos tomados de los propios PDF.
// `extra` agrega las referencias propias de cada manual (normas, documentación de las tecnologías).
module.exports = (c, extra = []) => [
  c.H1('Referencias', { sinSalto: true }),
  c.P('Los métodos, las fórmulas y el formato de resolución del juego proceden del libro de la asignatura y del material de clase. Los archivos PDF de las referencias 2 a 9 se obtuvieron del material de clase publicado en el equipo de Teams del curso.'),
  c.OL([
    'Zamora Pequeño, O., Zamora Pequeño, R. S. y del Ángel Ramírez, A. (2020). *Métodos numéricos* (2.ª ed.). Universidad Autónoma de Nuevo León, Facultad de Ingeniería Mecánica y Eléctrica. ISBN 978-607-27-0504-3.',
    'Zamora Pequeño, O. (s. f.). *Actividad Fundamental. Problemas Resueltos. Medio Curso* (AcFProblemasR-MC.pdf) [Archivo PDF]. Material de clase, equipo de Teams del curso de Métodos Numéricos.',
    'Zamora Pequeño, O. (s. f.). *Actividad Fundamental. Problemas Resueltos. Ordinario* (AcFProblemasR-OR.pdf) [Archivo PDF]. Material de clase, equipo de Teams del curso de Métodos Numéricos.',
    'Curso de Métodos Numéricos (s. f.). *Interpolación, Medio Curso*: Interpolación Lineal, Newton hacia Adelante, Newton hacia Atrás, Newton con Diferencias Divididas y Lagrange [Archivos PDF]. Material de clase, equipo de Teams del curso.',
    'Curso de Métodos Numéricos (s. f.). *Ecuaciones no lineales, Medio Curso*: Gráfico y Bisectriz, Punto Fijo, Newton – Raphson, Falsa Posición y Secante [Archivos PDF]. Material de clase, equipo de Teams del curso.',
    'Curso de Métodos Numéricos (s. f.). *Ecuaciones lineales, Medio Curso*: Ecuaciones Lineales, Gauss – Seidel y Jacobi [Archivos PDF]. Material de clase, equipo de Teams del curso.',
    'Curso de Métodos Numéricos (s. f.). *Mínimos cuadrados, Ordinario*: Mínimos Cuadrados, Línea Recta, Cuadrática y Cúbica, Lineal con Función y Cuadrática con Función [Archivos PDF]. Material de clase, equipo de Teams del curso.',
    'Curso de Métodos Numéricos (s. f.). *Integración, Ordinario*: Integración, Regla Trapezoidal, Newton – Cotes Cerradas y Abiertas, Constantes de Newton – Cotes y Reglas de 1/3 y 3/8 de Simpson [Archivos PDF]. Material de clase, equipo de Teams del curso.',
    'Curso de Métodos Numéricos (s. f.). *Ecuaciones diferenciales ordinarias, Ordinario*: Ecuaciones Diferenciales Ordinarias, Euler Modificado, Runge – Kutta de 2.º, 3.er y 4.º orden (1/3 y 3/8 de Simpson) y de Orden Superior [Archivos PDF]. Material de clase, equipo de Teams del curso.',
    ...extra,
  ]),
];
