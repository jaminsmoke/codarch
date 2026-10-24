---
title: Cycles, of execution
date: "2026-10-23"
category: fix
verdict: arreglo
---

**What it was**: `sin-ciclos` counted any import, `import type` included. A cycle the compiler
erases read as an architecture cycle; in this repo, three of the five cycles were type-only.

**Decision**: [ADR 0037](../../adr/0031-0040/0037-los-ciclos-de-ejecucion.md). A cycle is one of
**execution**: it counts an edge with at least one runtime import (`weight > typeOnly`). Type edges
stay in the dependency lens, but they are not cycles and do not violate the rule. The checksum
changes where there was a type cycle; the `cc.json` format does not.

**Verdict**: **fix**, with ADR 0037; done. Excluding the intentional fixtures is still a separate
fix.
