---
title: The roadmaps, brought up to date
date: "2026-10-25"
category: docs
verdict: arreglo
---

**What it was**: two roadmaps told less than what was done, and it showed while reviewing the four open phases
before choosing which one to tackle. **M49** said "not started" with five boxes, and three were already done:
M50 had taken collapsing to the card and to **Cambios**, the symbol's life was already a section with a count
and a summary, and the closed state was remembered per section since `sections.ts`. **M23** said the custom
domain and the search were missing, and search has been there since ADR 0046, with Pagefind across the whole
site. The phase index repeated M49's "not started", so the mistake could be read in two places.

**What changed**: M49 goes to **in progress** and its list says what is actually left —the rail's ten blocks,
still with their loose heading; a guard in `@codarch/ui` requiring title, count and summary; and a pending
decision on the **Cambios** metrics table—. M23 stops asking for search and leaves the custom domain as the only
pending item, with its two halves: buying the domain and pointing the DNS, and dropping `base: /codarch` from the
Astro config, which changes every internal route. The report view stops being a loose box: `tab=pr` reads as
`changes`, so there is no separate card to fix.

**Why it belongs here**: an out-of-date roadmap is not a style detail. It makes the next reader take what is
already done for pending work and decide on false data, which is exactly what happened when these four were
opened.

**Verdict**: fix, done. The phases stay open in [their ADR](../../roadmap.md); what changes is that they
now tell the truth.
