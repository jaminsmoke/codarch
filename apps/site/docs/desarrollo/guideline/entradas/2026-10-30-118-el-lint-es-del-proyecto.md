---
title: "El lint es del proyecto"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: `codarch lint` solo sabía lanzar los comandos escritos a mano en el bloque `lint:` de `.codarch.yml`. En la práctica eso empujaba a inventar el lint: un `npx` que trae su propia versión, una config que el repo no usa, o un mapa que cuenta un lint que el proyecto no tiene. Y de la ficha solo se veían números.

**Qué cambia**: el comando **detecta** el lint que el repo ya tiene —eslint, oxlint, biome, ruff, checkstyle, `go vet` y `dotnet`— por su fichero de configuración y por la herramienta instalada, y lo lanza **con el binario y la config del repo**, en su raíz, heredando el config hacia arriba hasta la raíz que se analiza. El bloque `lint:` deja de ser el plan: pasa a ser un override, y `--no-detect` corre solo eso. El artefacto sube a **1.1** con `meta.systems` —herramienta, dialecto, config usada, de dónde salió, reglas activas y cuántas— y el 1.0 se sigue leyendo. ESLint enumera sus reglas con `--print-config`; oxlint cuenta las que corrió; las que no saben decirlo lo dicen en vez de inventarse una lista.La sección **Reglas** enseña esos sistemas, su config y sus reglas activas en la ficha de proyecto; la
carpeta y el fichero leen las reglas con hallazgos de su ámbito. Las cuentas siguen en Métricas. Sin
lint y sin artefacto, las fichas de proyecto y carpeta recomiendan el mínimo para el stack que ven
(eslint en TS/JS, ruff en Python, staticcheck en Go, Checkstyle en Java, `dotnet format` en C#) sin
escribir nada. En este repo sobraba el bloque: se quitó y su propio mapa se mide ahora con el eslint y el oxlint que ya tenía.

**Por qué así**: el mapa cuenta lo que el proyecto mide, no lo que nosotros quisiéramos que midiera. Nada de `npx`: una herramienta que el repo no instaló no es su lint. Y sin config ni herramienta no hay artefacto —ni uno vacío—: no medir y estar limpio son cosas distintas, y el checksum depende del código, no de lo que tengas instalado.

**Verificado**: tests nuevos para cada sistema detectado, la config que se hereda de la raíz, el override que gana, las reglas de eslint salidas de globs gruesos, las de oxlint contadas, el artefacto 1.1 y el 1.0 que sigue entrando,los hallazgos en los tres ámbitos con sus cuentas, los sistemas en la ficha de proyecto, limpio frente
a sin medir, y la recomendación cuando no hay config. Suite completa (1.238), lint y typecheck en verde.

**Lo que falta**: lanzar las herramientas desde la app web —sin Node no hay proceso, así que enseña lo que midió la CLI o `serve`—, las listas de reglas de biome y ruff, y el lint en el MCP.

**Veredicto**: fase en marcha.
