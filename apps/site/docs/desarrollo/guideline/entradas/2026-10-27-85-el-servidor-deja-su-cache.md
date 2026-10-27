---
title: El servidor deja su caché
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: `serve` ya leía el parseo de sus alcances y el de su propia raíz, pero no dejaba la caché de sus pasadas. Reiniciar el servidor —o el `analyze` que viniera después— volvía a pagar el parseo completo de lo que el servidor ya había parseado. Y su comentario decía «no escribe en el repositorio» aunque el libro de cadenas ya vivía en `.codarch/`.

**Qué es**: cada análisis del servidor —el inicial, el del live y el de un cambio de raíz— deja su `.codarch/parse-cache.json`, con el mismo serializador que usan el escritorio y el CLI (`writeParseCachePayload`). Desde ahí lo encuentra el análisis siguiente, sea del servidor, del escritorio o de `codarch analyze`. El comentario del comando se ajusta a lo que hace: no toca el árbol de trabajo, escribe estado derivado e ignorado.

**Por qué así**: con esto las tres plataformas que analizan —CLI, `serve` y escritorio— leen y escriben igual, y una caché sirve a la siguiente sin depender de quién la escribió ni de qué app esté abierta. No se vuelve a medir: es el mismo almacén y el mismo pipeline, y la puerta del [ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md) ya se pasó con un **90 %** de ahorro; lo que cambia es que el trabajo del servidor ya no se tira al cerrar. Del lado del navegador no hay nada equivalente que hacer: su sistema de ficheros en memoria no sabe `stat`, que es la clave de la caché, y el build estático ni siquiera analiza.

**Cómo se comprueba**: `apps/cli/test/serve.test.ts` analiza un repo con `analyzeState` y comprueba que ha dejado `parse-cache.json` con su raíz y sus dos entradas, y que un módulo nuevo —sesión nueva, como un servidor recién arrancado— da el mismo checksum. Que las entradas se **reutilicen** lo cubre `packages/parsers/test/repo-session.test.ts`, que es la sesión que el servidor usa: `2 reutilizados · 2 parseados`.

**Veredicto**: ADR 0089, dentro de M34. Con esto las tres plataformas que analizan dejan su caché.
