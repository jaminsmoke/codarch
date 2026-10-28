---
title: "El escáner de Rust tiene un estado por caso"
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**Qué era**: `packages/parsers/src/migration.ts` medía las líneas de código de Rust sin parser, y lo hacía en un solo `measureRustSource` —**41** de complejidad, 127 líneas en la función más larga y **210** de deuda— con un bucle de más de cien líneas en el que ocho banderas (`blockDepth`, `rawHashes`, `inString`, `inChar`, `escaped`, `lineHasCode`…) decidían, carácter a carácter, qué se estaba leyendo. Cada caso nuevo —el comentario que anida, la comilla que escapa, la almohadilla del raw— añadía un `if` al mismo sitio.

**Qué es**: el escáner dice en qué estado está y cada estado tiene su función. `stepNewline` cierra la línea esté donde esté el cursor (el contenido de un string multilínea sigue siendo código); `stepCode` reconoce el comentario, el raw string, el string y el char literal; `stepLineComment`, `stepBlockComment` —que cuenta la profundidad porque Rust anida—, `stepQuoted` —una sola para `"` y `'`, que solo se diferencian en la comilla final— y `stepRawString` gastan lo que ya está abierto. `opensRawString` y `countHashes` comparten la cuenta de almohadillas que antes estaba escrita dos veces. La complejidad baja a **11**, la función más larga a **76** líneas y la deuda a **60**. En el mismo fichero, `buildMigration` era quien quedaba en 15, así que su estado y su deuda salen a `statusFor` y `debtFor`.

**Por qué así**: cada estado es una regla lexicográfica distinta y ninguna necesita saber de las demás: el comentario anidado no tiene nada que ver con el escape de una comilla. Con una función por estado, añadir uno es escribir su handler, no buscar el sitio del `if`.

**Cómo se comprueba**: se guardó una copia del escáner anterior y se comparó con el nuevo sobre un corpus de fragmentos difíciles —comentario anidado, raw string con y sin almohadillas, raw string multilínea, `br##"…"##`, comilla escapada, lifetime `'a`, CRLF, `\r` suelto, comentario y string sin cerrar— más **400** combinaciones aleatorias con semilla fija: los pares `loc`/`rloc` coinciden en todos. Esa comparación era temporal y se retiró; lo que queda en `packages/parsers/test/migration.test.ts` son dos casos permanentes: el raw string multilínea con comentario anidado, y la determinación —la misma fuente da lo mismo en la segunda pasada y en cualquier orden—. Suite **981** casos y **122** ficheros, `tsc` limpio y lint sin errores. La deuda del repositorio baja de **10.128** a **9.978**.

**Veredicto**: hecho. La siguiente es `packages/metrics/src/diff.ts` (38 de complejidad, 195 de deuda); después quedan `packages/addons/src/index.ts` y `packages/ui/src/storage.ts`, que pesan por fan-in 16 más que por complejidad.
