---
title: "The rest legend no longer repeats Estratos"
date: "2026-11-08"
category: "removed"
verdict: "arreglo"
---

**What it was**: the rest map rail said the same thing twice. **Estratos** already split files by `kind` with its bar, its tones and the count for each kind, and right below it **Leyenda · tipo** listed the same four tones with the same figures again.

**What changes**: the `kind` colour mode no longer draws a legend. **Estratos** is the only reading of kind in the rail, and the map keeps its fourth lens without a block that repeats it.

**Why this way**: a legend that says what the block above already says does not clarify: it takes height in a narrow sheet and makes you wonder whether they are two different counts. The other lenses —lint, risk, migration, metrics— keep their legend because no other block counts them.

**What is missing**: nothing. The kind lens and its selector stay as they are; only the duplicated block goes away.

**Size**: one branch of `Legend` and its test case. The usage docs and the ADR 0093 roadmap now say the split lives in **Estratos**.

**Verdict**: done.
