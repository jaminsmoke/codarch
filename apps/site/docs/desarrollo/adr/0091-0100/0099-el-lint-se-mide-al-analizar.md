---
title: "ADR 0099 — El lint se mide al analizar"
description: "`codarch analyze` ejecuta el lint que el proyecto ya tiene y escribe su artefacto firmado con el checksum del snapshot, en la misma pasada que las métricas. La lente del lint deja de ser una carga aparte que podía faltar: es una lente del análisis, con su escala propia y sin botón en la hoja."
section: desarrollo
status: aceptado
date: "2026-10-31"
sidebar:
  label: El lint se mide al analizar
  order: 99
---

**Estado:** aceptado · **Fecha:** 2026-10-31

## Contexto

El [ADR 0094](0094-el-lint-en-el-mapa.md) descartó ejecutar ESLint dentro de `analyze` para no atar un
análisis determinista y barato a `node_modules` y a media docena de configuraciones. El lint quedó como
una pasada aparte —`codarch lint`— y `serve` la lanzaba por su cuenta, con su cola y su evento.

El resultado se vio al usar la lente: **la deuda de lint no era una lente del análisis, era un fichero
que a veces estaba**. Abrir un `cc.json` no traía lint; `codarch analyze` tampoco lo medía, así que el
mapa solo podía pintarse por lint si alguien había corrido `codarch lint` o había un `serve` detrás.
Y el artefacto podía ser de otro árbol, lo que obligó al [ADR 0098](0098-el-lint-dice-que-arbol-midio.md)
a firmarlo y avisar. Todo eso era síntoma de lo mismo: el lint medía fuera de la pasada que dibuja el
mapa.

La lente tampoco se leía: con el repo limpio, la escala arrancaba en el color del papel y todos los
bloques se fundían con el fondo. Y el bloque del lint de **Métricas** había ganado un botón «Pintar el
mapa» que no era el sitio: las lentes se eligen en **COLOR**, como todas.

## Decisión

### 1. El lint se mide en el análisis

`codarch analyze` ejecuta el lint que **tiene** el proyecto —su configuración y su binario, ADR 0096— y
escribe `.codarch/lint.cc.json` en la misma pasada, con `meta.tree` igual al checksum del snapshot que
acaba de escribir. `--no-lint` lo omite para quien solo quiere el mapa y no puede esperar a un linter.

Esto enmienda el ADR 0094 en su descarte: la objeción era el coste, y el coste se asume —once segundos
en un repo de quinientos ficheros— a cambio de que el lint sea del análisis y no de la sesión. El
artefacto sigue **fuera** de `cc.json` y de su checksum: el checksum depende del código, no de lo que
tenga instalado la máquina, y `cc.json` sigue siendo interoperable.

### 2. El que ya es del árbol no se vuelve a medir

`serve` y el live comparan el `meta.tree` del artefacto guardado con el checksum que están sirviendo: si
coincide, no lanzan el linter. Analizar y servir el mismo árbol cuesta una pasada, no dos. Si no
coincide —o el artefacto es 1.1, sin árbol— se mide en segundo plano y se avisa al abrir la app.

### 3. La lente es una lente

- Se ofrece en **COLOR**, como Riesgo, Estructura o cualquier métrica, y solo cuando hay lint medido.
- Tiene su **escala propia**: el extremo limpio es un verde apagado, no el papel. Un repo sin hallazgos
  se ve como un mapa pintado de limpio, no como un mapa sin pintar.
- La leyenda, la hoja y el PNG de `codarch shot` leen la misma escala y la misma cuenta.
- No tiene botón en la hoja del proyecto: el control es el selector de color de siempre.

## Consecuencias

- Un `codarch analyze` en un repo con ESLint tarda lo que tarda ESLint; `--no-lint` devuelve la pasada
  barata.
- El lint existe después de analizar, con cualquier consumidor: CLI, web servida, escritorio y MCP leen
  el mismo artefacto; un `cc.json` compartido sin su `.codarch/` no lo lleva, y la app lo dice.
- La lente del lint no puede «no estar cargada» en el mapa que la ofrece: si el artefacto falta, la
  opción no se ofrece y la banda lo dice.
- Ya no hay dos caminos para medir: uno, el del análisis. La cola del live solo existe para no perder
  un guardado durante una pasada.

## Hoja de ruta

Fases **M65 — El lint, en el mapa** y **M67 — El lint es del proyecto**.

- ✅ `codarch analyze` mide el lint del proyecto y lo firma con el árbol (con `--no-lint`).
- ✅ `serve` y el live no remiden un artefacto que ya es del árbol servido.
- ✅ La lente del lint en **COLOR**, con su escala propia, su leyenda y el PNG.
- ✅ Sin botón propio en la hoja: las lentes se eligen en **COLOR**.
- ⬜ El punto del lint en la barra (ADR 0094).
- ⬜ El lint incremental del live: medir solo lo que cambió.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
