---
title: The file card speaks about its lenses
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: the inspector showed numbers — risk, complexity, churn, debt — and the PR tab showed
changes, but it never explained **why** a cell had that risk or which domain rules the file touched.

**What changed**: a third tab, **Lenses**, next to File and PR. Risk is broken down into complexity,
churn and size with their weight and p95, using the same formula that colours the map: there are no
two truths. Domain rules are matched by path from the loaded `report.json` — introduced first, with
severity, rule, source and message —; without a report the tab says so instead of making one up.
Migration shows status, debt, crossings and the file's FFI edges; symbols show how many there are and
which one is the most complex.

**Numbers**: no new analysis: the breakdown comes from the same pass that already computed risk. A
click on a rule or an edge switches files without leaving the tab, and `tab=lenses` travels in the
URL and in saved views.

**Verdict**: [ADR 0057](../../adr/0051-0060/0057-la-ficha-del-fichero-habla-de-sus-lentes.md), done;
it does not change `cc.json` or the checksum. Per-symbol rules and the file's evolution when history
has more than one snapshot stay on its roadmap.
