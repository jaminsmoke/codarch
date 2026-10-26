---
title: El zoom ya no redibuja el mapa
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que acercar, alejar y arrastrar el mapa dejen de reconciliar todo el SVG en cada paso.

**Por qué**: `zoom` y `center` viven en el hook, así que cada clic o cada movimiento del botón
derecho volvía a renderizar los 260 bloques y sus 306 etiquetas `foreignObject`. Con un repo grande
eso se nota como tirones y congelaciones; además, `zoomAt` actualizaba el centro **dentro** del
actualizador de zoom, que puede aplicarse dos veces.

**Qué cambió**: el contenido del mapa es un componente memoizado (`MapContent`) que no recibe `zoom`
ni `center`: acercar solo cambia el `viewBox` del SVG. El arrastre se agrupa por fotograma
(`requestAnimationFrame`) en vez de lanzar un estado por evento del ratón, y `zoomAt` calcula el
centro una sola vez, fuera del actualizador.

**Cómo se encontró y por qué no se vio antes**: se perfiló la CPU del build web mientras se pulsaba
zoom diez veces. No había presupuesto de rendimiento ni prueba de regresión: las revisiones se hacían
con repos pequeños y a ojo. Con 260 celdas el coste de JS era de unos 6-8 ms por clic; el paso a
peor escala con el número de nodos y con el rasterizado de las etiquetas. Si en el escritorio sigue
pesando, el siguiente sospechoso es el `foreignObject` al ampliar: la salida sería dibujar etiquetas
como `<text>` o mover el zoom a una transformación CSS.

**Veredicto**: arreglo de rendimiento; no necesita ADR.
