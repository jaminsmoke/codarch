---
title: El servidor separa estado, rutas y arranque
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**Qué era**: `apps/cli/src/commands/serve.ts` tenía **613** líneas de código y **45** de complejidad en una sola función, `runServe`, que era la más alta del repositorio después de las dos que ya se habían partido. Dentro vivían cuatro cosas que cambian por motivos distintos: el estado que se reanaliza, el vigilante de ficheros, el cambio de carpeta y una cadena de diecisiete `if (pathname === …)` que era el API entero. Su deuda era **230**, la más alta que quedaba.

**Qué es**: tres ficheros con un tema cada uno. `serve.ts` es el arranque —comprueba la raíz, encuentra el build web, monta y escucha— con **97** líneas y complejidad **10**; `serve-live.ts` guarda el estado que cambia y su vigilante (**207** líneas, complejidad **5**); `serve-routes.ts` tiene el servidor HTTP con una **tabla de despacho** —una ruta, una función— y cada ruta entre 2 y 5 de complejidad (**437** líneas, complejidad **10**). Las tres juntas deben **112** frente a los 230 de antes.

**Por qué así**: el estado vivo y las respuestas no tienen el mismo tiempo de vida. El estado cambia mientras el servidor escucha —un guardado, un live apagado, otra carpeta— y las rutas son estáticas: lo único que cambian es qué leen. La tabla de despacho sustituye a la cadena de comparaciones porque el API es exactamente eso, un mapa de ruta a respuesta, y así añadir una ruta no alarga una función. `ServeOptions` sigue en `serve.ts` y las rutas no lo importan: piden solo el origen propio, el build web y el estado.

**Cómo se comprueba**: seis casos nuevos en `apps/cli/test/serve-routes.test.ts` levantan el `handle` en un puerto libre y piden el snapshot, la meta, el código de un fichero, un cambio de carpeta desde loopback, un POST desde otro origen —que se queda en 403—, el latido sin watch —204—, un verbo que no toca —405 con su `Allow`— y una ruta desconocida. La suite entera queda en **978** casos y **122** ficheros. La deuda del repositorio baja de **10.381** a **10.271**, y la app abierta contra el repo lo dice en su cabecera.

**Veredicto**: hecho. Siguen `apps/cli/src/commands/analyze.ts` (35 de complejidad, deuda 216), `packages/parsers/src/migration.ts` (41, 210) y `packages/metrics/src/diff.ts` (38, 195).
