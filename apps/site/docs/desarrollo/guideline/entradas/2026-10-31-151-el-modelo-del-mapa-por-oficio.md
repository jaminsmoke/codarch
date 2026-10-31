---
title: "El modelo del mapa, por oficio"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `packages/render/src/model.ts` tenía 835 líneas y siete oficios: el contrato que comparten el
SVG, el cliente y la captura; la lista de métricas curadas y sus escalas; la construcción de los ficheros
con su área, su tipo y sus cuatro señales de riesgo; las secciones con su color por carpeta; el árbol de
carpetas; las aristas y los ciclos; y la lente inicial con su selección. Todo bajo dos `export` y una
función `buildRenderModel` que llamaba a catorce privadas repartidas por el fichero.

**Qué cambia**: el fichero queda en 138 líneas y solo cablea las fases; cada oficio vive en su módulo
hermano, con el prefijo del modelo para que se vea de qué son:

| Módulo | Qué es |
|---|---|
| `model-types.ts` | el contrato: lente, opciones, metadatos, fichero, sección, métrica, árbol, arista, modelo |
| `model-files.ts` | los ficheros con su área y su tipo, y el riesgo con sus señales (ADR 0057, ADR 0094) |
| `model-sections.ts` | el color categórico por las tres primeras carpetas |
| `model-metrics.ts` | qué métricas viajan y con qué escala —p95, log si hay cola— se pintan |
| `model-tree.ts` | el árbol de carpetas y el colapso de las cadenas de un solo hijo |
| `model-dependencies.ts` | las aristas sin repetir y las que el snapshot marca como ciclo (ADR 0037) |
| `model-lens.ts` | con qué lente abre el mapa y qué fichero queda seleccionado |

La dependencia va en un sentido: `model.ts` cablea; `model-files` lee valores con `model-metrics`;
nadie mira hacia arriba. `model.ts` sigue reexportando el contrato, así que `index.ts`, `browser.ts`, el
color, el layout, el ráster y la captura no cambian una línea.

**Por qué así**: `buildRenderModel` era la función que el propio mapa señalaba como su bloque más caliente
—lo decía su comentario, escrito cuando ya dolía—. Separar no cambia la lógica: cada comentario que explica
una regla viaja con su función, y el coste se paga una vez. El modelo es lo que leen la app, la captura y
los plugins, y sus piezas ahora se pueden leer sin tener delante las otras seis: la escala de una métrica
está donde se calcula, y el riesgo está donde se renormaliza cuando falta el historial.

**Verificado**: la suite entera en verde —**173 ficheros y 1497 tests**—, con los de `model.test.ts` que ya
fijan la determinista, el colapso de carpetas, los ciclos, las cuatro señales del riesgo y la lente del
lint. Typecheck y lint limpios, y el bundle del navegador y el del sitio se escriben igual.

**Veredicto**: arreglo.
