---
title: The changelog is the guide
date: "2026-10-23"
category: docs
verdict: adr
---

**What it is**: the record of what is done living in this guide, not in an `<adr>.changelog.md` next
to each decision, and each day having its own page.

**Why**: the guide already tells what was done and what is waiting, by date and by category. The
sidecar repeated that story per decision and forced the same thing to be written twice. On top of
that, a single page with every day grew without limit.

**Decision**: [ADR 0047](../../adr/0041-0050/0047-el-changelog-es-la-guia.md). The sidecars
disappear; the ADR keeps the decision and its roadmap. The guide is split into `/guia/` (the last
day), `/guia/YYYY-MM-DD/`, `/guia/futuro/` and `/guia/normas/`; the timeline links to each one.

**Verdict**: **ADR 0047**, done. The record has a single source and each day has its URL.
