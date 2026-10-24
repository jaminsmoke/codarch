---
title: "Alpha: let the version say so"
date: "2026-10-22"
category: chore
verdict: fase
---

**What it is**: the product saying it is alpha. The functionality is there; the product is not yet:
things still change and the desktop app is a copy of the web one.

**Decision**: [ADR 0032](../../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.md) (§6). The
version carries a prerelease (`0.3.0-alpha.1`), on npm it goes to the `next` tag so `latest` keeps
the last normal one, and the README says so at the top.

What **is** promised: the `cc.json` 2.x model and its checksum.

**Verdict**: **phase M21**, in the roadmap of
[ADR 0032](../../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.md). Done.
