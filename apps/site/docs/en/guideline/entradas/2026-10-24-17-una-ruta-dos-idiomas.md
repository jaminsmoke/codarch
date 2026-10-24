---
title: One route, two languages
date: "2026-10-24"
category: refactor
verdict: arreglo
---

**What it is**: the landing page and the guide having **one file per view** instead of one per
language. Astro serves both languages from the same route with a rest parameter: `[...lang]` is
empty in the default language and is `en` in the other.

**Why**: the site's five pages were duplicated —`index`, `guia`, `guia/[fecha]`, `guia/futuro`
and `guia/normas`— and the title, description and `canonical` of each language were written twice.
Every fix had to be made twice, and the two copies had already drifted.

**What changed**: ten files become five; each one generates `/` and `/en/` with `getStaticPaths`,
the language comes from `Astro.params.lang` and the header metadata lives in the `i18n` collection
(`meta.home.*`, `meta.guia.*`). The `canonical` is built with `urlCanonica` and the long date with
`fechaCompleta`, which the guide already used. The URLs do not change: 133 pages, the same as
before.

**Verdict**: **fix**, inside M31 (ADR 0046, §8). It changes neither the model nor the checksum.
