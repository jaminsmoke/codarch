---
title: "El `.codarch` no es el taller"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: la carpeta `.codarch/` de este repo se estaba usando como taller. Junto al snapshot, el

lint y las preferencias —lo que deja el propio programa al analizar este mismo repositorio— habían

acabado scripts de codemod, pruebas y capturas de prueba: `cx.mjs`, `cx-all.mjs`, `cx-fn.mjs` en la

raíz y una carpeta `tmp/` con un reparto de ficheros, sondas y registros. Nada de eso es salida del

producto. Es código de desarrollo en el sitio donde el producto guarda sus artefactos, y como la

carpeta está ignorada, el error no se veía en ningún `git status`.**Qué cambia**: se borra el taller entero: los tres codemods, la carpeta `tmp/`, las copias y tarballs
de paquetes en `cs/` (137 MB), las comparativas en TypeScript de `parity/`, los repos de prueba de Go y
C#, los registros de los servidores de desarrollo, las carpetas de rondas de análisis (`compare-round`,
`diff-after`, `snapshot-round`, `shell-round`…), el `map.html`, las capturas hechas a mano, el
`lint.json` viejo y el `shots/` con capturas de trabajo. La regla queda escrita en `AGENTS.md`:
`.codarch/` es del producto, no del desarrollo, y no se escribe ahí código, pruebas ni scripts;
tampoco temporales. Si un trabajo necesita un temporal, no vive dentro del árbol que se analiza. Y
`escritorio.md` dice ahora la lista exacta —nueve ficheros— de lo que el producto escribe ahí, para que
se sepa qué es salida y qué es un resto que hay que borrar.

**Por qué así**: `.codarch/` es configuración y salida del producto —el snapshot y el lint de este

repo, que además son la entrada de la app y del MCP en las pruebas manuales—. Mezclar ahí código

propio hace dos daños: se ensucia la frontera que el producto promete, y se pierde de vista lo que es

salida del análisis y lo que es escritura a mano. Un temporal en el árbol analizado, además, se cuela

en el propio mapa.**Verificado**: `ls -la .codarch/` enseña nueve ficheros y ni una carpeta —`snapshot.cc.json`,
`rest.cc.json`, `head-report.json`, `report.json`, `chains.json`, `preferences.json`,
`parse-cache.json`, `lint.cc.json` y `scopes.json`—, que es justo lo que escribe el producto. Un `find`
de `.mjs`, `.ts`, `.js`, `.pid` y `.log` no devuelve nada. Lint sin mensajes, typecheck limpio, suite
completa y `site:build` en verde.

**Veredicto**: arreglo.
