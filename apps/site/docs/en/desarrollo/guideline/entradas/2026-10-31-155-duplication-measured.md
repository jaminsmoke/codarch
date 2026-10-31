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
whole suite green (**174 files and 1508 tests**), typecheck and lint clean and the site builds. This
repo measured with its own lens: **598 files**, **2,183 duplicated lines** and **518 repeated**, 3 % of
`rloc`, in **5 pairs** —one `copy`, the two `main.tsx` files; four `diverging`, from the web's
`reader.ts` to the parsers' `extensions.ts` at 86 %, and the `schema` and `lint` barrels against their
modules at 97 and 28 lines—. By file, the top ones are `schema/src/index.ts` (98) and `browser.ts`
(97), the Go and Java analyzers (53 and 52) and the UI's `InspectorBar` (52, plus another 52 repeated
inside).

**Verdict**: phase. M68 closes the measurement; M69 paints it, M70 names the divergence and M71 takes it
to the diff.
