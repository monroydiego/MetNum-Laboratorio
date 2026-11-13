# Propuesta de proyecto: Escape del Laboratorio Numérico II

**Materia:** Métodos Numéricos  
**Alumno:** Jorge Hugo De León Sepúlveda  
**Matrícula:** 2141751  
**Tipo de entrega:** Videojuego educativo de exploración 2D con solucionador numérico.

## 1. Introducción

Los métodos numéricos se utilizan para obtener soluciones aproximadas de ecuaciones y sistemas que pueden ser difíciles de resolver con procedimientos analíticos. Este proyecto convierte esas técnicas en herramientas de un videojuego interactivo: el estudiante recorre un laboratorio de ciencia ficción y desbloquea mecanismos ejecutando algoritmos implementados en JavaScript.

## 2. Objetivo general

Desarrollar un videojuego funcional en dos dimensiones que resuelva automáticamente problemas utilizando 20 métodos numéricos y permita consultar sus cálculos y resultados mediante tablas, gráficas y un modo de prueba para el docente.

## 3. Objetivos específicos

- Programar algoritmos de raíces de ecuaciones, interpolación, sistemas lineales y mínimos cuadrados.
- Permitir que los cálculos se ejecuten automáticamente a partir de ejemplos o valores escritos por el profesor.
- Mostrar los pasos, iteraciones, fórmulas, datos y aproximaciones producidas por cada algoritmo.
- Integrar el resultado de los cálculos en el avance de un videojuego con salas, enemigos y batalla final.
- Ejecutar todo localmente sin depender de una conexión a internet.

## 4. Historia y funcionamiento

La inteligencia artificial OMEGA toma el control de un laboratorio. El protagonista debe recuperar cuatro zonas. En cada sala hay cinco terminales numeradas: al acercarse y pulsar E, el programa ejecuta el algoritmo correspondiente y muestra sus resultados. Después de activar cinco terminales, el jugador accede a la siguiente sala.

Los drones de vigilancia recorren los espacios; al tocar al personaje, reducen la energía. El último sector contiene tres escudos de OMEGA, desactivables al volver a resolver métodos reales. Tras romperlos, el jugador dispara con ESPACIO y evade proyectiles para terminar la misión. Los controles, animaciones y sonidos forman parte de la experiencia, pero la resolución matemática es automática.

## 5. Métodos numéricos incluidos

| Área | Métodos |
|---|---|
| Raíces de ecuaciones | Bisección, Falsa posición, Newton-Raphson, Secante y Punto fijo |
| Interpolación | Lineal, Lagrange, Newton adelante, Newton atrás y Diferencias divididas |
| Sistemas lineales | Gauss, Gauss-Jordan, Montante, Jacobi y Gauss-Seidel |
| Mínimos cuadrados | Línea recta, Cuadrática, Cúbica, Lineal con función y Cuadrática con función |

## 6. Mínimos cuadrados: sustento matemático

Los cinco modelos se basan en el archivo de apuntes **MCuadrados.zip** aportado para la actividad. Su principio es minimizar la suma de los cuadrados de los residuos:

**S = Σ (yᵢ − g(xᵢ))²**.

Los coeficientes se obtienen formando las ecuaciones normales **(XᵀX) a = Xᵀy**, cuyos elementos se calculan a partir de los datos de entrada. El programa resuelve ese sistema mediante eliminación gaussiana con pivoteo parcial. Se muestran las ecuaciones normales, los coeficientes, la curva ajustada, los datos originales y los indicadores de error RMSE y R².

| Modelo | Expresión |
|---|---|
| Línea recta | g(x) = a₀ + a₁x |
| Cuadrático | g(x) = a₀ + a₁x + a₂x² |
| Cúbico | g(x) = a₀ + a₁x + a₂x² + a₃x³ |
| Lineal con función | g(x) = a₀ + a₁x + a₂f(x) |
| Cuadrático con función | g(x) = a₀ + a₁x + a₂x² + a₃f(x) |

La función adicional f(x) se puede elegir entre seno, coseno, exponencial, logaritmo natural, raíz cuadrada o tangente. Algunos datos y funciones pueden generar sistemas singulares; en esos casos el sistema comunica al usuario que debe modificar sus entradas.

### Comprobación con el ejemplo de línea recta de clase

Para los datos (1.1, 2.5), (1.9, 2.7), (2.4, 3.7), (4.8, 5.2), (5.1, 6.0) y (10.5, 8.3) se obtuvo:

**g(x) ≈ 2.008443615 + 0.633695283x**.

Esta solución reproduce los coeficientes de la práctica enviada por el estudiante.

## 7. Tecnología

- HTML5 para la estructura de la aplicación.
- CSS3 para interfaz y paneles.
- JavaScript para cálculo numérico, controles y dibujo del videojuego con Canvas 2D.
- Web Audio API para efectos sonoros sintéticos locales.
- Almacenamiento del navegador para conservar progreso cuando está disponible.

No se requieren librerías externas, descargas de imágenes, servicios web ni instalación de Python. La versión en HTML independiente puede abrirse directamente en un navegador.

## 8. Evaluación y pruebas

Se programó una prueba automatizada que ejecuta los 20 métodos y comprueba que generen soluciones y tablas. Se comparó la recta de mínimos cuadrados con el ejemplo de clase. Se realizaron pruebas de interfaz en Chromium para verificar movimiento, apertura de terminales, modo profesor, ejecución de la regresión, combate contra OMEGA y pantalla de victoria.

## 9. Conclusión

La aplicación demuestra que las técnicas de cálculo numérico no son solamente ejercicios escritos: pueden implementarse como algoritmos reutilizables para resolver problemas y apoyar una simulación interactiva. La integración de ejemplos, tablas y cálculos configurables permite usar el videojuego tanto como actividad lúdica como evidencia de funcionamiento frente al docente.
