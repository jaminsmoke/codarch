---
title: "analyze deja de ser una sola función"
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**Qué era**: `apps/cli/src/commands/analyze.ts` metía en `runAnalyze` —**35** de complejidad, 262 líneas en la función más larga y **216** de deuda— la validación de la raíz, la política del repo, la carga de cachés de los alcances, el análisis, la escritura del snapshot y, al final, nueve campos del resumen con sus ternarios y sus `try/catch`, cada uno de los cuales podía fallar de una manera distinta.

**Qué es**: el comando ordena fases y cada una tiene nombre. `readIgnore` devuelve la política o el motivo por el que no vale; `loadCaches` trae el parseo anterior y el de los alcances de debajo, y sin alcances legibles analiza entero; `writeSnapshot` escribe el `cc.json` o dice por qué no pudo; `reportLines` compone el resumen con un campo por función —`migrationText`, `parseField`, `scopesText`, `historyText`, `churnText`, `warningLines`, `unresolvedLines`—. La complejidad baja a **11**, la función más larga a **79** líneas y la deuda a **72**.

**Por qué así**: el resumen es presentación y el resto es análisis: no fallan por lo mismo ni cambian por lo mismo. Un campo del resumen no debería poder tumbar la escritura del snapshot, y un `catch` de la caché de parseo no tiene nada que ver con el del historial. Al separarlos, cada uno dice qué hace cuando no puede.

**Cómo se comprueba**: se ejecutó el mismo repositorio con el `analyze.ts` de `HEAD` y con el nuevo, partiendo de la misma caché: la salida del comando es **idéntica**, solo cambian el tiempo y los bytes del snapshot. Un caso nuevo en `apps/cli/test/analyze.test.ts` fija el orden de los campos del resumen —de la raíz al churn— para que un campo que se cuele se note. La suite queda en **979** casos y **122** ficheros. La deuda del repositorio baja de **10.271** a **10.128**.

**Veredicto**: hecho. Las siguientes son `packages/parsers/src/migration.ts` (41 de complejidad, 210 de deuda), `packages/metrics/src/diff.ts` (38, 195) y dos ficheros de fan-in 16 con complejidad 10 —`packages/addons/src/index.ts` y `packages/ui/src/storage.ts`—, donde lo que pesa no es la complejidad sino cuántos los importan.
