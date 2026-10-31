---
title: "The site closes without a domain"
date: "2026-10-31"
category: "docs"
verdict: "arreglo"
---

**What it was**: M23 had been open since 2026-10-22 with a single box: the custom domain. Everything
else —the site generated from markdown, Pagefind search, the sitemap, both languages and the guide— was
done and published on GitHub Pages. The box asked for a purchase, a DNS, removing `base` from the Astro
config and redirecting the old address so no links broke.

**What changes**: M23 closes and the domain is dropped for now. The site stays at
`jaminsmoke.github.io/codarch`; if it is ever needed, it enters as a new phase with its purchase and
its DNS. ADR 0034's roadmap, the roadmap index and its row say the same.

**Why this way**: a phase waiting on a purchase says nothing about the product and makes you wonder
whether something big is missing. A domain does not change what the site does, and keeping `base`
leaves the internal routes, the sitemap and the existing links stable.

**Verified**: `site:build` with 287 pages and the site suite green (113 tests).

**Verdict**: fix. M23 closes; M63, M64, M65 and M66 remain.
