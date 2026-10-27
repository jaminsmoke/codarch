---
title: El padre no reparsea a sus hijos
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: el [ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md) decidió que un alcance lea el parseo de los que tiene debajo, con una puerta: si el ahorro no llegaba a un cuarto del tiempo de parseo, no se enviaba. Hasta hoy solo estaba el registro de qué alcances hay y cómo están.

**Qué es**: cada análisis deja su caché de parseo en su `.codarch/parse-cache.json` —con formato, parser y raíz— y el análisis de la raíz importa las entradas de los `.codarch/` que tiene debajo, reindexadas con su prefijo y validadas por versión `tamaño:mtime`. La línea `parseo` del resumen dice cuántos ficheros se reutilizaron: `326 reutilizados · 28 parseados · 348 de alcances de debajo`. La caché también vale para uno mismo: repetir `analyze .` en este repo pasa de **3 018 ms a 80 ms**, con los 356 ficheros reutilizados.

**Por qué así**: se reutiliza el **parseo**, no el snapshot: la resolución, el grafo, la migración y el checksum se rehacen siempre, así que el `cc.json` sale idéntico byte a byte con cachés y sin ellas. Una caché de otro formato, de otro parser o de otra raíz se ignora entera, y una entrada cuya versión no coincide se vuelve a parsear: un hijo desactualizado cuesta tiempo, nunca da un resultado falso. El padre escribe su propia caché y no toca la del hijo.

**Cómo se comprueba**: `apps/cli/test/parse-cache.test.ts` cubre el mismo checksum en frío y con cachés de hijos, que una entrada desactualizada se parsea otra vez, que una caché ajena se ignora y que la del hijo queda intacta tras analizar el padre. La medida del ADR se hizo sobre una copia limpia del repo (354 ficheros, 15 alcances analizados como suyos, sin git y sin la caché del propio padre): **3 107 ms en frío contra 315 ms con las cachés de los 15 alcances**, 326 de 354 ficheros reutilizados, mismo checksum `ea69ba0f…`, unos 592 KB de cachés. El ahorro es del **90 %**, así que la puerta se pasó de largo.

**Veredicto**: ADR 0089, dentro de M34. Queda decidir si `serve` y el escritorio también leen las cachés de sus alcances.
