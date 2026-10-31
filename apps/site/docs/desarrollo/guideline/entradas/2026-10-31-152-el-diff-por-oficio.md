---
title: "El diff, por oficio"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `packages/metrics/src/diff.ts` tenía 883 líneas y ocho oficios: el contrato del reporte, el
indexado de cada `cc.json`, la comparación de ficheros y sus métricas, la de aristas, los ciclos por
componente fuertemente conexa —Kosaraju iterativo, con su pila explícita—, el reporte de migración, los
hotspots y la traducción al motor de reglas. `diffSnapshots` llamaba a veintitrés privadas repartidas por
el fichero, y era el cuarto fichero por deuda desde el primer día del mapa.

**Qué cambia**: el fichero queda en 122 líneas y solo cablea; cada oficio vive en su módulo hermano:

| Módulo | Qué es |
|---|---|
| `diff-types.ts` | el contrato: resumen, fichero, cambio de métrica, arista, ciclo, migración, hotspot, reporte, opciones |
| `diff-index.ts` | un `cc.json` indexado: rutas por id, nodos en orden y aristas agregadas por par |
| `diff-files.ts` | altas, bajas y cambios de métrica, más el resumen de cada lado |
| `diff-edges.ts` | aristas que aparecen y desaparecen, y cuáles cierran un ciclo (ADR 0037) |
| `diff-cycles.ts` | los ciclos de cada lado y la diferencia entre los dos |
| `diff-migration.ts` | la deuda de migración con su antes y su después |
| `diff-hotspots.ts` | los ficheros donde la métrica elegida subió |
| `diff-rules.ts` | el índice traducido a lo que el motor de reglas pide |
| `diff-shared.ts` | el orden estable y la lectura de números que comparten todos |

La dependencia va en un sentido: `diff.ts` cablea; los demás leen `diff-types` y `diff-shared`, y nadie
mira hacia arriba. `diff.ts` sigue reexportando el contrato —`IndexedSnapshot` incluido, que lo usan
`symbol-diff` y `report`—, así que el índice del paquete, la entrada del navegador y los reportes viejos
no cambian una línea.

**Por qué así**: el diff es la pieza que decide qué se comenta en el PR, y estaba escrita como una función
con veintitrés ayudantes que se llamaban entre sí a lo largo del fichero. Separar no cambia la lógica: los
comentarios que explican cada regla viajan con su función, y ahora se puede leer —o probar— una parte sin
las otras siete. Kosaraju y la migración eran las dos que más pesaban y las que menos se tocaban; viven
aparte y con el mismo código.

**Verificado**: la suite entera en verde —**173 ficheros y 1497 tests**—, con `diff.test.ts` fijando la
determinista, los ciclos y los deltas nulos, y la paridad servidor/escritorio del CLI que compara los dos
reportes carácter a carácter. Typecheck y lint limpios.

**Veredicto**: arreglo.
