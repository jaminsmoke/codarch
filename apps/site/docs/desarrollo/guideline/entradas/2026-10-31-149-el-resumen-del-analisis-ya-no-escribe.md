---
title: "El resumen del análisis ya no escribe nada"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `apps/cli/src/commands/analyze.ts` tenía 584 líneas y, dentro, el resumen del comando: catorce
funciones que montaban el texto que se ve al terminar. Tres de ellas —`parseField`, `scopesText` y
`historyText`— no eran presentación: escribían la caché de parseo, el registro de alcances y la foto del
historial mientras se construía cada línea. Quien leía el resumen estaba escribiendo artefactos, y el orden
de los campos era el orden de las escrituras.

**Qué cambia**: el texto vive en `apps/cli/src/analyze-report.ts` (262 líneas) y recibe los números hechos:
un objeto `ReportFacts` con la estructura, los imports, la migración, el lint, el parseo, los alcances, el
historial, el churn, los avisos y lo que quedó sin resolver. Las escrituras se mudan al comando
(`collectReport`), que las hace con los mismos nombres y en el mismo orden que antes, y después pide el
texto.

**Por qué así**: un formateador con efectos es un formateador que no se puede probar. Ahora el resumen se
prueba sin `git`, sin `fs` y sin repositorio temporal: 20 casos nuevos que fijan el orden de los campos, los
plurales («1 error» / «3 errores»), la cobertura del lint (ADR 0098), los topes de diez avisos y cinco imports
rotos con su «y N más», y lo que se dice cuando algo no se pudo guardar. Antes de esto, el texto solo se
veía a través del `console.log` de una prueba de integración.

**Verificado**: la suite entera en verde —**172 ficheros y 1489 tests**, eran 1469— y, además de los tests,
una pasada de verdad contra un repo temporal: el resumen sale con los mismos campos y en el mismo orden, la
caché de parseo queda en `.codarch/` y el historial en `.codarch-history/`, que es donde va a propósito
(se comparte, no se ignora). El comando queda en 501 líneas.

**Veredicto**: arreglo.
