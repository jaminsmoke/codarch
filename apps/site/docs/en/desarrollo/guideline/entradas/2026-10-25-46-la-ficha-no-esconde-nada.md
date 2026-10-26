---
title: The file card hides nothing
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: the symbols lens already captured every module declaration, but the file card still lied by omission. 70 of 294 files had no symbols at all and only showed metrics; a barrel such as `packages/metrics/src/browser.ts` hid its 38 exports. The 21 fields of `ArchitectureStore` were missing too: the class and its methods were visible, its state was not. In total, 60 class members (57 fields and 3 constructor properties), 971 imports and 1,338 exports were left out.

**What changed**: an additive `structure` lens stores, per file, the **class members** grouped by their class and the **surface** of imports and exports with aliases, `type`, `default`, `* as ns` and each re-export's source. The card gains **Surface** and **Members**, two collapsible sections that also show up when the file has no symbols. Identity is untouched: members have no hash or chain, and the symbols diff stays the same. Object configuration keys, namespaces and top-level loose code remain out.

**Numbers**: `store.ts` goes from a class with methods to a card with **21 members** under `ArchitectureStore`. The metrics barrel shows its **38 exports** even though it has no symbols at all. The lens adds content to the checksum because the snapshot is more complete, not because the identity rule changed.

**Verdict**: [ADR 0064](../../adr/0061-0070/0064-la-ficha-no-esconde-nada.md), done. Its roadmap keeps taking the structure to the diff and the MCP, namespaces and loose code if a real repo needs them, and object keys as a detail of a variable.
