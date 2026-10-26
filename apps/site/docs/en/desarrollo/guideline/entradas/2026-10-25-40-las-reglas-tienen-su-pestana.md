---
title: Rules get their own tab
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: rules lived at the bottom of the PR tab, after migration, symbols and files. Only
five new violations were visible; existing and resolved ones were counted but could not be opened.
Hotspots, meanwhile, repeated a list the summary already numbered.

**What changed**: a fourth tab, **Rules**, between Lenses and PR. It shows the architecture summary
of the change — new, existing and resolved, new errors and warnings, rules and layers evaluated,
applied profile —, the three full lists with the rule, its source (`team`, `profile` or addon),
severity, message and the details of the edge, metric or cycle, and a count by source. Hotspots move
here with their metric and their before and after. A red dot warns about new violations without
opening the tab.

**Numbers**: PR keeps what it is, the change: files, edges, cycles, migration and symbols.
`tab=rules` travels in the URL and in saved views. There is no new analysis and no change to
`cc.json`: everything comes from the `report.json` that already existed.

**Verdict**: [ADR 0058](../../adr/0051-0060/0058-las-reglas-tienen-su-pestana.md), done. Turning
Lenses into a subsection of Rules, filtering by severity or source and showing configured rules that
are not violated stay on its roadmap.
