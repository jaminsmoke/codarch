---
title: Two tabs, the file and the change
date: "2026-10-25"
category: refactor
verdict: adr
---

**What it was**: the **Rules** tab mixed two scales. Above, the file: risk with its signals, domain rules, migration and a symbol summary that were already in **File** —risk is a metrics row, symbols are their own section—. Below, the change: introduced, existing and resolved violations for the whole repo, profile and hotspots. To see which rules the file touches you had to be in Rules; to read what the change breaks, leave Changes. One jump exchanged for another.

**What changed**: the right panel stays at **File** and **Changes**. The card gains, inside Metrics, the risk breakdown with its three signals, their weights and the p95: the value is already in the row, this only explains where it comes from. After Metrics a single **Rules** section is born with two subsections —**Domain**, the violations touching this file, and **Migration debt**, its FFI crossings and the formula—; they used to be two loose sections, the second sandwiched between Dependencies and Members. **Changes** absorbs the change's rule state, with its three lists and hotspots finally by name. `tab=rules` and the old `tab=lenses` read as `tab=changes`. Inside the card, each subsection announces itself with the Rules tint and the violation split on the right, and every violation takes two lines —the rule with its source and mark, the message on a single line— at the rhythm of the Metrics table, with the full text in the tooltip. **Changes** adopts the same language: every block is a collapsible section with its colour dot and its count, and when closed it summarises what matters —"3 new · 7 existing", "debt 4.1k → 5.8k"—, so the whole panel fits on one screen instead of being a two-thousand-pixel scroll.

**Numbers**: two tabs instead of three; the card goes from eight loose sections to seven, with Rules grouping two. Neither `cc.json`, nor the checksum, nor `report.json` change: everything comes from the snapshot and the report that already existed. `RulesPanel` and `FileLens` disappear.

**Verdict**: [ADR 0069](../../adr/0061-0070/0069-dos-pestanas.md), done. The next pass is visual, section by section.
