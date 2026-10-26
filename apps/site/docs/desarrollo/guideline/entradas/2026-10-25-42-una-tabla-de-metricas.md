---
title: La ficha del fichero, en una tabla
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: dos veces las mismas métricas. Una rejilla de seis celdas —área, riesgo, complejidad, churn,
deuda y cruces FFI— y debajo una lista de hasta diez métricas. Solo el riesgo era nuevo: el resto
repetía `rloc`, `maxComplexity`, `number_of_commits`, `migrationDebt` y `ffiCrossings`. Y la lista
cortaba justo antes de fan-in, ciclos, commits y migración, así que la rejilla tapaba lo que la lista
escondía. Los valores, además, pesaban lo mismo dijeran 3 o 300.

**Qué cambió**: una sola tabla. El riesgo va primero, el área deja de ser una fila y pasa a ser una
marca en la métrica que decide el mapa, y cada métrica aparece una vez, en un orden fijo y sin tope. La
barra llega al p95 del proyecto —con la escala logarítmica del mapa— y el color solo aparece cuando
menos es mejor: ocre al 75 % del p95, deuda en el p95. El riesgo tiene su semáforo en 40 y 70. Las
métricas sin dirección se quedan en tinta. Y cada fila se pulsa: el mapa se pinta por esa métrica y la
fila activa queda marcada.

**Números**: veinte filas únicas y compactas, algo más altas que la rejilla y la lista juntas, sin
duplicar y sin esconder nada. El fichero de ejemplo, `apps/mcp/src/tools.ts`: antes se veían seis
celdas y diez filas con cinco repetidas; ahora se ven riesgo y diecinueve métricas, incluidas deuda y
cruces. La deuda y los cruces pasan a ser métricas curadas del modelo para tener p95 aunque no sean el
modo de color. No cambia `cc.json`, ni el checksum, ni el reporte.

**Veredicto**: [ADR 0060](../../adr/0051-0060/0060-la-ficha-se-lee-en-una-tabla.md), hecho. Queda en su
hoja de ruta agrupar los imports si la tabla crece y llevar el mismo lenguaje a la tabla del reporte y a
la ficha del símbolo.
