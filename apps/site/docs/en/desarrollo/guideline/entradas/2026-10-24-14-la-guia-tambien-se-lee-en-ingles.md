---
title: The guide reads in English too
date: "2026-10-24"
category: docs
verdict: fase
---

**What it is**: translating the whole guide. The entries and the rules of `/en/guia/` stop being the
Spanish text with a notice on top and become reviewed English content. The notice disappears.

**Why**: the guide is the product's changelog and the page most read after the landing page. Half a
guide translated behind a notice was worse than not offering it: whoever came in English found a
sign asking them to go back to Spanish.

**What changed**: every entry has its version in `docs/en/guideline/entradas/` with the same file
name, and the rules in `docs/en/guideline/normas.md`. The guide is loaded per language
(`cargarGuia("en")`, `guiaEn` collection) and its links go to `/en/docs/...`: to the ADR, not to the
Spanish version. Dates, categories and verdicts were already formatted in the page's language. A
test checks that both directories have exactly the same entries, so adding an idea without its
translation breaks the suite.

**Coverage**: the guide, at 100 % (36 entries and the rules). The documents stay at 8 of 58 pages:
the 50 ADRs are what is missing. The interface does not change.

**Verdict**: **phase M31**, with the roadmap in
[ADR 0046](../../adr/0041-0050/0046-los-documentos-con-starlight.md#m31--el-sitio-en-dos-idiomas).
