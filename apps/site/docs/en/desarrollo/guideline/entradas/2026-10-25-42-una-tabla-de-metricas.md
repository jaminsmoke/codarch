---
title: The file card, in one table
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: the same metrics twice. A six-cell grid —area, risk, complexity, churn, debt and FFI
crossings— and below it a list of up to ten metrics. Only risk was new: the rest repeated `rloc`,
`maxComplexity`, `number_of_commits`, `migrationDebt` and `ffiCrossings`. The list cut just before
fan-in, cycles, commits and migration, so the grid covered what the list hid. Values also carried the
same weight whether they said 3 or 300.

**What changed**: one single table. Risk comes first, area is no longer a row but a mark on the metric
that decides the map, and every metric appears once, in a fixed order and with no cap. The bar reaches
the project's p95 —using the map's logarithmic scale— and colour only appears when less is better:
ochre at 75 % of p95, debt at p95. Risk has its own traffic light at 40 and 70. Metrics with no
direction stay in ink. And every row can be pressed: the map is painted by that metric and the active
row is marked.

**Numbers**: twenty unique, compact rows, somewhat taller than the grid and the list together, with no
duplicates and nothing hidden. The example file, `apps/mcp/src/tools.ts`: before it showed six cells
and ten rows with five repeated; now it shows risk and nineteen metrics, debt and crossings included.
Debt and crossings become curated model metrics so they have a p95 even when they are not the paint
mode. `cc.json`, the checksum and the report do not change.

**Verdict**: [ADR 0060](../../adr/0051-0060/0060-la-ficha-se-lee-en-una-tabla.md), done. Its roadmap
keeps grouping imports if the table grows, and bringing the same language to the report table and the
symbol card.
