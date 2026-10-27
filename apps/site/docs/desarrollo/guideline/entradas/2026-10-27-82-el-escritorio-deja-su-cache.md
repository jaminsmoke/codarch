---
title: El escritorio deja su caché
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: `serve` y el escritorio ya leían las cachés de sus alcances, pero el escritorio no dejaba la suya: al cerrar la app se perdía el parseo de la sesión, así que reabrir un proyecto volvía a parsear todo lo que un `analyze` no hubiera guardado antes (ADR 0089).

**Qué es**: cuando el escritorio analiza —al abrir un proyecto, al pulsar analizar y en cada reanálisis del live— la caché de esa pasada queda en el `.codarch/parse-cache.json` del repo, junto al snapshot. Desde ahí la encuentra el análisis siguiente: el suyo, el de `serve` o el de `codarch analyze`. La escritura no adelanta al snapshot: se guarda aunque el snapshot ya estuviera en disco, porque el parseo es nuevo aunque el mapa no cambie.

**Por qué así**: el `utilityProcess` que analiza **no toca `.codarch/`** (ADR 0050): calcula la caché y la devuelve, y la escribe el proceso principal, que es el único que escribe el estado del repo. Así el invariante no se dobla ni con una excepción para una caché. Un fallo al escribirla se queda en un `console.error`: es derivada, se puede borrar, y lo único que cuesta es volver a parsear. El fichero lo serializa el mismo código en las tres plataformas (`writeParseCachePayload`), con el mismo formato y las mismas guardas de formato, parser y raíz.

**Cómo se comprueba**: `apps/desktop/test/analyze-worker.test.ts` analiza un repo real con el worker, comprueba que **no ha aparecido `.codarch/`**, que la caché que devuelve cubre los ficheros del repo —con su raíz y su formato—, y que el checksum es el mismo en los tres estados: sin caché, con la caché guardada y después de borrarla. Lo que queda sin cubrir por un test es el cable del proceso principal (llamar a guardarla al abrir, al analizar y al reanalizar): vive en `main.ts` y lo cubre el typecheck, no la suite.

**Veredicto**: ADR 0089, dentro de M34. Cierra el hueco que la entrada *Serve y el escritorio leen sus alcances* dejaba abierto.
