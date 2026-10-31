---
title: "El lint se mide al analizar"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: la lente del lint no era una lente del mapa, era un fichero que a veces estaba. Abrir un `cc.json` no traía lint; `codarch analyze` tampoco lo medía, así que el mapa solo podía pintarse por deuda si alguien había corrido `codarch lint` o había un `serve` detrás. Y el bloque del lint en **Métricas** se había ganado un botón «Pintar el mapa» que no era el sitio: las lentes se eligen en **COLOR**. Con el repo limpio, además, la escala arrancaba en el color del papel y el mapa entero se fundía con el fondo.

**Qué cambia**: `codarch analyze` ejecuta el lint que ya tiene el proyecto —su configuración y su binario, ADR 0096— y escribe `.codarch/lint.cc.json` firmado con el checksum del snapshot que acaba de escribir, en la misma pasada que las métricas. `--no-lint` lo omite. `serve` y el live comparan ese `meta.tree` con el árbol que sirven y no remiden lo que ya es suyo. El botón desaparece: la lente vive en **COLOR**, con escala propia cuyo extremo limpio es un verde apagado, y la comparten la leyenda, la hoja y el PNG de `codarch shot`.

**Por qué así**: el ADR 0094 descartó el lint dentro de `analyze` por coste, y el coste se paga gustoso —once segundos en este repo— a cambio de que la deuda esté donde están todas las demás lentes. El artefacto sigue fuera de `cc.json`: el checksum depende del código y no de lo que tengas instalado, y un lint inventado por nosotros no vale lo que el linter del proyecto.

**Verificado**: `codarch analyze` sobre este repo en 11,0 s escribe el artefacto con `tree` igual al del snapshot y `eslint` + `oxlint`; un segundo `serve` sobre ese árbol no lanza linter (`0 medidas`, `measured: 1039`); `--no-lint` no escribe artefacto. Tests del lint en el análisis y en `serve`, de la escala limpia y del arranque sin botón. Typecheck, lint y suites en verde.

**Veredicto**: arreglo.
