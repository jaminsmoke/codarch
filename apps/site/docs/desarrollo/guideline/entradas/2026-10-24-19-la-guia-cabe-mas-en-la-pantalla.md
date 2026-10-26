---
title: La guía cabe más en la pantalla
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que las entradas de la guía, que en reposo solo son un título, ocupen lo que ocupa un
título y no el doble.

**Por qué**: cada fila medía 93 px en el escritorio —un título de 26 px con dos rellenos encima y
debajo— y un día de 20 ideas no cabía en una pantalla. La guía es un changelog y se lee de arriba
abajo: cuanto más entra de un vistazo, mejor.

**Qué cambió**: una sola escala para toda la guía. El título de la entrada baja a
`clamp(1.02rem, 1.6vw, 1.18rem)` con interlineado 1.3, la fila se queda en `0.5rem`/`0.55rem` de
relleno y la etiqueta del veredicto y los chips de categoría bajan un paso (icono de 12 px). La
fecha del día pasa de 68 px a 50 px y el grupo se separa con menos aire. El texto desplegado queda
en 0.97 rem con interlineado 1.7, y el resto (futuro, normas) sigue la misma escala. De paso se
quitaron dos reglas duplicadas de `.guia-entrada-titulo` y `.guia-entrada-meta`: la segunda pisaba
a la primera y descolocaba el chip.

**Veredicto**: **arreglo**, sin ADR (es tipografía). En el escritorio la fila baja de 93 px a 51 px
y el día de 20 ideas pasa de 2.262 px a 1.289 px; en el móvil, una fila de una línea pasa de 78 px
a 48 px. El checksum no cambia.
