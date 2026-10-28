---
title: La deuda baja por donde manda el fan-in
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**Qué era**: el mapa ponía `packages/versions/src/index.ts` como el fichero con más deuda del repositorio —**696**— con solo 212 líneas, por delante de otros que triplicaban su tamaño. La fórmula lo explica: la deuda de migración es `(complejidad máxima + 1) × (1 + fan-in)`, y ese fichero lo importan **28** ficheros, así que cada punto de complejidad suyo pesaba veintinueve. El segundo era `packages/parsers/src/analyze-core.ts`: **576**, con **47** de complejidad en una sola función de 332 líneas.

**Qué es**: `index.ts` pasa a ser una fachada de reexportaciones —**36** líneas, complejidad **0**, deuda **29**— y el trabajo vive en `version.ts` (parseo y comparación, deuda 45) y `update.ts` (la comprobación, deuda 22), donde `checkSource` se reparte en una función por fuente —npm, releases de GitHub y última release— con `fetchJson` y `bestRelease` de apoyo. En el analizador, `analyzeFiles` se queda en el recorrido y el montaje del snapshot, y cada fase tiene su nombre: `measureFile`, `pushUnmeasured`, `measureRustFile`, `readSource`, `parseFile`, `recordFile`, `closeNamespaces`, `applyChurn`, `applyGraph` y `applyMigration`. Complejidad máxima **16** y función más larga **114** líneas.

**Por qué así**: la deuda no mide tamaño, mide cuánto cuesta tocar lo que todos usan. Por eso el arreglo no es escribir menos, sino que lo que importa medio repositorio no tenga lógica propia: una fachada no tiene ramas y el trabajo se queda en módulos con pocos lectores. En el analizador el corte es por fase, no por tramos de líneas: leer, parsear, apuntar y contar son cosas distintas que estaban en el mismo `for`.

**Cómo se comprueba**: la suite entera, **972** casos en **121** ficheros, sigue en verde, y los de determinismo y paridad del analizador pasan sin tocarlos. Para descartar que el refactor cambie el análisis, se ejecutó el mismo repositorio con el `analyze-core.ts` de `HEAD` y con el nuevo: **ninguna métrica de ningún otro fichero cambia**, solo las suyas. La deuda del repositorio baja de **11.331** a **10.381**, y la app abierta contra el repo ya muestra **407** ficheros y **10,4k**.

**Veredicto**: hecho. La lista sigue con `apps/cli/src/commands/serve.ts` (complejidad 45, deuda 230), `apps/cli/src/commands/analyze.ts` (35, 216), `packages/parsers/src/migration.ts` (41, 210) y `packages/metrics/src/diff.ts` (38, 195): los cuatro con fan-in 4 o 5, donde bajar la complejidad vale la mitad.
