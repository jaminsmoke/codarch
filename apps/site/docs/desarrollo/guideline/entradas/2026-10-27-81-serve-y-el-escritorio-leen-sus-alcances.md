---
title: Serve y el escritorio leen sus alcances
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: el [ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md) ya hacía que `codarch analyze` reutilizara el parseo de sus alcances de debajo, pero solo él: `serve` y el escritorio volvían a leer y parsear los paquetes que un `.codarch/` de una subcarpeta ya tenía parseados, en cada reanálisis. La entrada anterior dejaba abierto si también lo leerían.

**Qué es**: el almacén de la caché de parseo por alcance se ha mudado al paquete compartido (`@codarch/parsers`), y la **sesión** de análisis —la que usan `serve` y el proceso de análisis del escritorio (ADR 0074)— lee, la primera vez que analiza una raíz, el `parse-cache.json` de su propio `.codarch/` y los de los `.codarch/` que tiene debajo, reindexados con su prefijo. Se reutiliza el **parseo**, no el snapshot: resolución, grafo, migración y churn se rehacen siempre, así que el `cc.json` y su checksum salen idénticos con cachés y sin ellas. El escritorio gana además lo que pierde al cerrar: al reabrir un proyecto, la caché que dejó `analyze` ya no muere con el proceso anterior.

**Por qué así**: una sola implementación del almacén —formato, parser y raíz como guardas— para que las tres plataformas lean lo mismo y una caché no dependa de quién la escribió. Se busca **una vez por sesión**: la raíz no cambia, y un alcance nuevo se ve en la sesión siguiente. Un fallo al leer no se propaga ni se anota como aviso: sin caché se analiza entero, que es el resultado correcto; solo cuesta tiempo. Y sigue valiendo lo de siempre: hacia abajo sí, hacia arriba nunca.

**Cómo se comprueba**: `packages/parsers/test/repo-session.test.ts` deja a un alcance de debajo su caché y abre una sesión nueva del padre: `2 reutilizados · 2 parseados`, y al borrar el `.codarch/` del hijo el checksum sale igual con `0 reutilizados`. `apps/cli/test/parse-cache.test.ts` sigue cubriendo las guardas (otro formato, otro parser, otra raíz), la entrada desactualizada y que el padre no escribe en el `.codarch/` del hijo. La medida del ahorro es la que ya está en el ADR: **3 107 ms → 315 ms** (90 %). No se ha vuelto a medir para `serve` y el escritorio: reutilizan el mismo almacén y el mismo pipeline, así que lo medido es lo que se aplica.

**Veredicto**: ADR 0089, dentro de M34. Cierra lo que la entrada *El padre no reparsea a sus hijos* dejaba abierto.
