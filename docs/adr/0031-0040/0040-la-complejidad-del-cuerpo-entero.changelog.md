# Changelog — ADR 0040 «La complejidad cuenta el cuerpo entero»

**Decisión:** [el ADR](0040-la-complejidad-del-cuerpo-entero.md) · **Estado:** aceptado · **Fecha:** 2026-10-23

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el
[ADR](0040-la-complejidad-del-cuerpo-entero.md#hoja-de-ruta).

## Lo que se hizo

- **El cuerpo entero.** `functionComplexity` empieza en el nodo de `body`, no en `body.children`:
  una arrow con cuerpo de expresión ya cuenta el `?:`, el `&&`, el `||` o el `??` que está en la
  propia expresión. Si el cuerpo es un bloque, el bloque no añade complejidad por sí mismo y se
  recorren sus hijos como antes. Las funciones anidadas se siguen midiendo aparte.
- **Tests.** `packages/parsers/test/parser.test.ts` comprueba las métricas de fichero con una arrow
  de `?:`, una de `&&` y una de bloque; `packages/parsers/test/symbols.test.ts` comprueba la
  complejidad por símbolo, que una arrow que devuelve otra no hereda sus decisiones y que un callback
  anónimo suma en el fichero pero no aparece en la lente de símbolos.
- **Dos recuentos, dos preguntas.** `docs/model.md`, `README.md` y `docs/rules.md` explican que
  `functions` y `maxComplexity` cuentan también callbacks anónimos y funciones anidadas, mientras
  que la lente de símbolos solo lista las declaraciones con nombre. La diferencia que encontró la
  auditoría no se oculta: se documenta.
- **La guía.** La entrada «La complejidad de una arrow de expresión» deja constancia del fallo y de
  la decisión.
- **Sin cambio de formato.** `cc.json` mantiene `apiVersion` 2.0. Cambian los valores de complejidad
  y el checksum donde el código cambia, como con cualquier métrica; la foto se vuelve a analizar.

## Verificación

- `npx vitest run`: 49 ficheros, 371 tests.
- `npm run lint`, `npm run typecheck`, `npm run check:action`, `npm run site:build` y
  `npm run web:build`: en verde.
- El build web sigue avisando de `node:fs`/`node:path` externalizados y del `eval` de
  `web-tree-sitter`; es el siguiente punto de la auditoría, no una regresión de esta decisión.

## Decisiones relacionadas

- [ADR 0025 — La lente de símbolos: mirar dentro del fichero](../0021-0030/0025-lente-de-simbolos.md)
  — la lente lista los símbolos con nombre; la complejidad de fichero ya existía.
- [ADR 0037 — Los ciclos: de ejecución, no de tipos](0037-los-ciclos-de-ejecucion.md)
  — otra métrica que se calcula sobre el grafo y se lee igual en el snapshot.
