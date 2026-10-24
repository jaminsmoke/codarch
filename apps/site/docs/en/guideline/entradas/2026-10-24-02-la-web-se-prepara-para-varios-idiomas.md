---
title: The site prepares for several languages
date: "2026-10-24"
category: docs
verdict: arreglo
---

**What it was**: the site was Spanish only and its strings were written in the components, so
adding a language meant touching code.

**Decision**: [ADR 0046, §8](../../adr/0041-0050/0046-los-documentos-con-starlight.md). The default
language is Spanish. UI strings live in `src/lib/i18n.ts` and the components receive `lang`. The
documents are translated per folder (`docs/<language>/`) and Starlight serves them with a fallback.
Adding a language is copying the folder, translating it and adding it to `locales` and `i18n`; no
translations are generated automatically.

**Verdict**: **fix**, done. The structure is ready; the first extra language will arrive when there
is someone to review it.
