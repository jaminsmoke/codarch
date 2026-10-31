---
title: "Duplication, measured"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: the model knew how many lines a file had and how much it cost to migrate, but not
whether those lines were written twice. And they were: the web app and the desktop app share their
`main.tsx` character for character, and the `schema` and `lint` barrels repeat a good part of their
modules. Aggregate debt goes up when a large file is split, and there was no way to tell "it was split"
from "it was copied" (ADR 0102).

**What changes**: the optional, deterministic `duplication` lens in `cc.json`:

| Piece | Contents |
|---|---|
| `nodes` | `duplicatedLines`, `repeatedLines` and `duplicateOf` when the file is a literal copy |
| `pairs` | `fromId`, `toId`, `lines`, `similarity` 0–100 and `status: "copy" \| "diverging"` |
| `summary` | pairs, copies, duplicated lines, repeated lines and ratio |

The detector knows nothing about grammars: it normalizes the significant lines `rloc` already counts
and looks for windows of **eight** by SHA-256, merging adjacent ones before counting. It shares the
six languages and the scope of the map. `similarity` is shared windows over the smaller file's windows:
100 is `copy`, 40 to 99 is `diverging` and below that there is no pair.

Two new metrics, both with `direction: -1`: `duplicatedLines` (across files) and `repeatedLines`
(within one). The ratio is not stored: it is divided on read, and folders and the project add up lines
and divide by their `rloc`, never adding percentages. `migrationDebt` keeps its formula: duplication is
not added to it.

**Why this way**: a copy that drifts apart cannot be seen by looking at lines, and the threshold of
eight leaves out the three-line wrapper and keeps a real function. v1 measures what is copied as is;
renames would need an AST or normalizing identifiers and would break parity between the CLI and the
browser. The duplication fingerprint travels in the parse cache, so a save does not re-read unchanged
files (ADR 0056), and the checksum still comes from the measured code.

**Verified**: **11 new tests** —the `K` cutoff (7 lines no, 8 yes), the identical file and its
canonical, internal repetition, the thresholds, scope, reading without the lens and determinism—; the
whole suite green (**174 files and 1509 tests**), typecheck and lint clean and the site builds. The
first measurement of this repo gave **598 files**, **2,183 duplicated lines**, **518 repeated** and
**5 pairs**. With the shared blocks already removed —the `schema` and `lint` surfaces, the web's
`reader.ts`, the `InspectorBar` frame, the profile projection and the `history` and `scopes`
arguments— **626 files** remain, with **1,820 duplicated lines** and **466 repeated**, 3 % of `rloc`,
in **1 pair**: the two `main.tsx` files, which differ only in a comment. By file, the top ones
are the Go, Java and Python analyzers (53, 52 and 49 lines), which share a skeleton below the pair
threshold.

**Verdict**: phase. M68 closes the measurement; M69 paints it, M70 names the divergence and M71 takes it
to the diff.
