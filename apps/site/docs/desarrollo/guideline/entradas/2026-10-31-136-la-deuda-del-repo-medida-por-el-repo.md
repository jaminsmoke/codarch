---
title: "La deuda del repo, medida por el repo"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: pasar el análisis por el propio CodArch encontró dos cosas. Una regla de nuestro
`.codarch.yml` —`complejidad-maxima`, 40— la incumplía el propio repo: `describeSystem` en
`packages/lint/src/project.ts` medía **41**, con siete herramientas despachadas a mano en una sola
función. Y en Métricas, `inCycle`, `cycleSize`, `ffiCrossings` y `unresolvedImports` valían **0** —bien
medidos, 504 de 504 ficheros— pero la hoja decía «máximo del subárbol en
`apps/cli/src/args/analyze.ts`»: nombraba el primer fichero que traía un cero como si ahí estuviera el
máximo. El cero era cierto; el dueño, inventado.

**Qué cambia**: `project.ts` tiene un lector por sistema —`describeEslint`, `describeOxlint`,
`describeBiome`, `describeRuff`, `describeCheckstyle`— detrás de un despacho por nombre, y la ficha
común —nombre, config y nota del detector— se construye una vez. El peor `maxComplexity` del repo baja
de **41 a 33** y la regla de 40 vuelve a cumplirse. Y un máximo medido a cero ya no tiene dueño: la
fila se queda en `0` y su ayuda dice «el máximo del subárbol es 0», sin nombrar fichero. Igual en la
fila de complejidad cuando el snapshot no la trae como métrica.

**Por qué así**: una medida que el repo se exige a sí mismo no se aprueba subiendo el umbral, se paga
bajando la cifra; y un cero medido es un dato, pero prestarle un fichero lo convierte en una afirmación
que nadie comprobó. Cada lector de sistema cabe en una cabeza: la de ESLint no tiene por qué compartir
condiciones con la de Checkstyle.

**Verificado**: la medida por símbolo del parser da 41 en `describeSystem` antes y 33 en
`detectLintSystems` después; `analyze` sobre el repo escribe el snapshot con ese 33 y el lint sigue en
**0 ficheros con hallazgos de 495 medidos**, firmado con el árbol. Tests nuevos de que un máximo de cero
no nombra fichero y de que su ayuda lo dice. Typecheck, lint y suite completa en verde.

**Veredicto**: arreglo.
