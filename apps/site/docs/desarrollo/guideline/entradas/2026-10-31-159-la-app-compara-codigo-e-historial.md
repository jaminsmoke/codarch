---
title: "La app compara código e historial"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: el checksum del snapshot pasó a depender solo del código (M72), y el churn se quedó en su
propio `historyChecksum`. Pero la app y el live seguían comparando **solo el primero**. Un commit nuevo
sin cambios de código no movía el checksum, así que el live no reescribía el snapshot y la app no
avisaba: el mapa enseñaba el calor viejo aunque el análisis hubiera medido el nuevo. Con los dos
checksums tratados como uno solo, la alternativa era reabrir la vista en cada commit.

**Qué cambia**: `snapshotRelation` (schema) clasifica dos snapshots en `same`, `heat` o `tree`. La app
avisa de un refresco si cambió el código **o** el historial, sin tocar la vista; el escritorio reescribe
el snapshot cuando cambia cualquiera de los dos, y solo se lo salta si son los dos iguales. La banda del
proyecto añade «sin historial» cuando `meta.historyChecksum` no está. El MCP devuelve `checksum` y
`historyChecksum` en el resumen, en el mapa y en la ficha del módulo, y dice qué significa cada uno.

**Por qué así**: la comparación es una sola función y no dos parecidas en la app y en el escritorio. El
historial cambia sin que cambie el código, y el calor es parte de los datos: refrescarlo no es abrir otro
proyecto (ADR 0103, ADR 0056). El aviso de «sin historial» distingue un snapshot medido sin git de uno medido
con git; sin él, la banda dejaba creer que el calor venía de los commits.

**Verificado**: tests de `snapshotRelation` (mismo snapshot, calor nuevo, otro árbol, sin historial),
del hook (mismo código con otro historial avisa; con el mismo historial no), del escritorio (no da por
guardado el mismo código con otro historial) y del MCP (el resumen trae los dos hashes). Suite completa
en verde (**176 ficheros y 1524 tests**), typecheck y lint limpios y el sitio de 287 páginas.

**Veredicto**: arreglo. M74 cierra el ADR 0103.
