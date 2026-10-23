---
title: Los ciclos, de ejecución
date: "2026-10-23"
category: fix
verdict: arreglo
---

**Qué era**: `sin-ciclos` contaba cualquier import, también `import type`. Un ciclo que el
compilador borra se leía como un ciclo de arquitectura; en este repo, tres de los cinco ciclos
eran solo de tipos.

**Decisión**: [ADR 0037](../../adr/0031-0040/0037-los-ciclos-de-ejecucion.md). Un ciclo es de
ejecución: cuenta una arista con al menos un import de ejecución (`weight > typeOnly`). Las aristas
de tipos siguen en la lente de dependencias, pero no son ciclos ni violan la regla. El checksum
cambia donde había un ciclo de tipos; el formato `cc.json` no.

**Veredicto**: **arreglo**, con ADR 0037; hecho. La exclusión de los fixtures intencionados sigue
siendo un arreglo aparte.
