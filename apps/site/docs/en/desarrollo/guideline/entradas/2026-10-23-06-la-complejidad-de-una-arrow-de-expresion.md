---
title: The complexity of an expression arrow
date: "2026-10-23"
category: fix
verdict: arreglo
---

**What it was**: the map said a file had `maxComplexity` 33 and the symbol lens had no function
above 10. Part of the difference is legitimate —file metrics also count anonymous callbacks and
nested functions, while symbols only count named declarations—, but there was a real bug:
`functionComplexity` started at the body's children, so an expression arrow such as `x => x ? 1 : 0`
or `a && b` lost the body's own decision and stayed at complexity 1.

**Decision**: [ADR 0040](../../adr/0031-0040/0040-la-complejidad-del-cuerpo-entero.md). Complexity
walks the whole body; nested functions are still measured separately. File metrics include
anonymous callbacks and the symbol lens only names: they are two different questions and the
documents say so. The `cc.json` format does not change; the checksum changes where the metrics
change.

**Verdict**: **fix**, with ADR 0040; done.
