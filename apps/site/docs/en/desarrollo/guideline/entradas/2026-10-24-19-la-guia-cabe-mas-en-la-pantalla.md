---
title: The guide fits more on screen
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: guide entries, which at rest are just a title, taking up what a title takes and not
twice that.

**Why**: each row measured 93 px on desktop — a 26 px title with two paddings above and below — so a
day with 20 ideas did not fit on one screen. The guide is a changelog and it is read top to bottom:
the more that fits at a glance, the better.

**What changed**: a single scale for the whole guide. The entry title drops to
`clamp(1.02rem, 1.6vw, 1.18rem)` with 1.3 line height; the row keeps `0.5rem`/`0.55rem` of
padding; and the verdict label and category chips step down (12 px icon). The day date goes from
68 px to 50 px and groups sit closer. Expanded text stays at 0.97 rem with 1.7 line height, and the rest
(future, rules) follows the same scale. Two duplicate rules, `.guia-entrada-titulo` and
`.guia-entrada-meta`, were removed along the way: the second overrode the first and pushed the chip
out of place.

**Verdict**: **fix**, no ADR (it is typography). On desktop a row goes from 93 px to 51 px and a
20-idea day from 2,262 px to 1,289 px; on mobile, a single-line row goes from 78 px to 48 px. The
checksum does not change.
