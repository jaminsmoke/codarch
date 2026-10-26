---
title: The site speaks two languages
date: "2026-10-24"
category: feature
verdict: fase
---

**What it is**: taking the site to English for real. Spanish stays the default language and
everything that existed does not change; next to it there is an `/en/` with the landing page, the
guide and the documents.

**Why**: ADR 0046 left languages *prepared*: `locales`, `i18n` and `lang` in the components, but the
interface had Spanish strings written by hand and the landing page and the guide had no English
version. A half-done language shows earlier than one that does not exist.

**What changed**: an ES/EN selector in the landing page and guide header (the documents already have
Starlight's), the routes `/en/`, `/en/guia/`, `/en/guia/YYYY-MM-DD/`, `/en/guia/futuro/` and
`/en/guia/normas/`, a full ES/EN dictionary in `src/lib/i18n.ts` and guide dates, categories and
verdicts formatted in the page's language. The product documents are translated in
`apps/site/docs/en/` (index, model, rules, MCP, migration, map, and the ADR index and roadmap); what
is missing falls back to Spanish with Starlight's notice, and the guide warns that its entries are
in Spanish.

**Coverage**: interface at 100 % (77 keys in each dictionary). Documents: 8 of 58 pages, 21 % of the
text. The 50 ADRs and the 33 guide entries are still in Spanish. Translating them is reviewed
content, not a `t()`: it is done file by file.

**Verdict**: **phase M31**, with the roadmap in
[ADR 0046](../../adr/0041-0050/0046-los-documentos-con-starlight.md#m31--el-sitio-en-dos-idiomas).
