---
title: "El navegador lee el mismo alcance"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: el lector del navegador saltaba directorios **por su nombre** —`dist`, `build`, `out`,
`target`, `.venv` y unos cuantos más— además de los internos. El walker del CLI solo salta
`node_modules`, `.git` y `.codarch`, y deja el resto a `.gitignore` y al `ignore` del proyecto. Un repo
que versiona `build/generated.ts` sin ignorarlo entraba en el mapa del CLI y no en el del navegador.
Peor: el lector **no leía los `.gitignore`**, así que el analizador no podía aplicar el alcance del
proyecto ni aunque los ficheros estuvieran en memoria. Los tests de paridad usaban listas de ficheros
explícitas y no lo veían.

**Qué cambia**: `packages/parsers/src/scope.ts` define la única lista de directorios internos
—`node_modules`, `.git`, `.codarch`— y la comparten el walker y el lector del navegador. El lector deja
de tener su propia lista de nombres, lee los `.gitignore` como un fichero de configuración más y el
analizador aplica las reglas. El tope de 20 000 ficheros sigue abortando con un error: nunca hay un
snapshot parcial con checksum válido.

**Por qué así**: el alcance lo decide el proyecto, no la app que lo analiza. Un nombre como `build` no
significa lo mismo en todos los repos, y que el navegador lo saltara convertía una optimización en una
segunda verdad. Compartir la lista y leer los `.gitignore` es lo que hace que el checksum del navegador
sea el del CLI sin `--no-git` (ADR 0038, ADR 0103). El coste es leer algún directorio pesado de más; el
límite y el error explícito son la red.

**Verificado**: test nuevo del lector con un `build/generated.ts` versionado y un `ignored/secret.ts`
con su regla en `.gitignore`: el lector lee los dos, el analizador descarta el ignorado y el snapshot del
navegador da el mismo checksum que el CLI (`--no-git`) con dos ficheros de código. Suite completa en
verde (**175 ficheros y 1511 tests**), typecheck y lint limpios y el sitio de 287 páginas.

**Veredicto**: arreglo. M73 cierra el alcance; queda M74 para que la app compare código e historial.
