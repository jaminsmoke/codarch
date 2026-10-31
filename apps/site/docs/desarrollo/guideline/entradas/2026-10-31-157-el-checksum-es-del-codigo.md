---
title: "El checksum es del código"
date: "2026-10-31"
category: "feature"
verdict: "arreglo"
---

**Qué era**: el checksum era MD5 de `{ files, lenses }`, y la lente de métricas lleva el churn cuando
hay git (`number_of_commits`, `number_of_authors`). El mismo árbol daba dos hashes según se midiera o
no el historial —medido en este repo: 626 ficheros, dos checksums—, así que el navegador solo era
comparable con el CLI pasado por `--no-git` (ADR 0020). El diff, además, contaba el churn como cambio
de un fichero.

**Qué cambia**: la lente entra en el hash sin las dos métricas de historial, ni sus descriptores ni sus
tipos; el resto no se toca. El snapshot gana `meta.historyChecksum`, el MD5 de los valores de historial
medidos, y no lo lleva cuando no hay git. El diff y el reporte saltan esas dos métricas: un PR no
cambia un fichero porque suban sus commits.

**Por qué así**: la identidad es el código, no lo que el clon sepa de su historia. Es la misma regla de
las cadenas (ADR 0026) y del lint (ADR 0099): lo que depende del historial o de lo instalado tiene su
propio hash. El churn no se borra porque el riesgo y el calor lo usan; solo deja de decidir si dos
snapshots son el mismo. Dos snapshots del mismo código con distinto calor comparten checksum y difieren
en `historyChecksum`; uno sin historial está sin medir, no a cero.

**Verificado**: suite en verde (**174 ficheros y 1510 tests**), typecheck y lint limpios y el sitio de
287 páginas. Los casos nuevos fijan lo que importa: el mismo árbol con y sin git da el mismo checksum
—también en un repo real con commits—, el historial distinto da el mismo checksum y otro
`historyChecksum`, el snapshot sin historial no lo tiene, y un diff con solo churn distinto sale vacío.
El auditor de lentes pasa por fin la comprobación del checksum. Los snapshots que medían git cambian de
checksum una vez; el formato no sube de versión.

**Veredicto**: arreglo. M72 cierra la identidad; M73 iguala el alcance del navegador y M74 ajusta la
comparación en la app.
