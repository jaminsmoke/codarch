---
title: The roadmap, in the ADR
date: "2026-10-22"
category: docs
verdict: fase
---

**What it was**: the sidecars were called `.roadmap.md`, but they mostly held what had already been
done. The real roadmap was spread across the phase status, the guide's ideas and the central index.

**Decision**: [ADR 0036](../../adr/0031-0040/0036-el-roadmap-en-el-adr-y-el-changelog.md). The
**roadmap** lives in the ADR (`## Hoja de ruta`); the sidecar becomes a **changelog** with what is
done. The phase index stays inside `docs/adr`, in [`roadmap.md`](../../roadmap.md).

**What was done**: the 35 sidecars changed name and role; each ADR gained its roadmap; the site
calls the sidecar a changelog and shows the roadmap inside the ADR.

**Verdict**: **phase M23.10**, done. The SQLite index of the documents stays as **M24**, for when
the volume asks for it: the database will be derived and the markdown will still be the truth.
