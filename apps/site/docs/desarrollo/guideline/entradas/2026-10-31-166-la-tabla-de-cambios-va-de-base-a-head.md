---
title: "La tabla de Cambios va de base a head"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: el reporte traía deltas por fichero y conteos, pero no los totales de cada métrica en la
base y el head. Sin ellos, Cambios no podía responder «qué se movió» sin releer los dos snapshots en el
navegador, y la tabla que pedía el ADR 0071 llevaba desde M49 esperando.

**Qué cambia**: el diff calcula `totals.metrics`: suma las métricas aditivas y toma el máximo de las
que ya son un máximo —`MAX_METRICS`, que ahora vive en `@codarch/metrics` y comparten las hojas y el
reporte—. Cada entrada lleva base, head y delta; una métrica que un lado no declara sale `null` y no
inventa delta. El reporte sube a **1.6** y un `1.5` se reconstruye con `totals: null`. La pestaña
Cambios gana **Totales** entre el resumen y los ficheros: una fila por métrica, con el delta coloreado
según su dirección; sin el campo, la sección no se pinta.

**Por qué así**: recalcular en la UI obligaba a cargar los dos snapshots enteros para leer un resumen;
sumar complejidades diría una cifra que no existe. El agregado lo decide la métrica, no la tabla. Y una
sección que no se midió se calla en vez de enseñar ceros.

**Verificado**: tests de los totales (suma, máximo, métrica de un solo lado y determinismo), del delta
y del reporte `1.5`; la tabla con y sin totales; suite completa en verde, typecheck limpio, lint sin
errores y `site:build` con 287 páginas.

**Veredicto**: hecho. M52 cierra y con ella M49.
