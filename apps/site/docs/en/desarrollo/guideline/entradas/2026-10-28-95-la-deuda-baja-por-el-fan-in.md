---
title: The debt falls where fan-in says
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**What it was**: the map put `packages/versions/src/index.ts` as the file with the most debt in the repository —**696**— with only 212 lines, ahead of others three times its size. The formula explains it: migration debt is `(max complexity + 1) × (1 + fan-in)`, and **28** files import it, so every point of complexity there weighed twenty-nine. Second was `packages/parsers/src/analyze-core.ts`: **576**, with **47** of complexity in a single 332-line function.

**What it is**: `index.ts` becomes a re-export façade —**36** lines, complexity **0**, debt **29**— and the work lives in `version.ts` (parsing and comparison, debt 45) and `update.ts` (the check, debt 22), where `checkSource` splits into one function per source —npm, GitHub releases and latest release— with `fetchJson` and `bestRelease` to help. In the analyser, `analyzeFiles` keeps the walk and the snapshot assembly, and each phase gets its name: `measureFile`, `pushUnmeasured`, `measureRustFile`, `readSource`, `parseFile`, `recordFile`, `closeNamespaces`, `applyChurn`, `applyGraph` and `applyMigration`. Max complexity **16** and longest function **114** lines.

**Why like this**: debt does not measure size, it measures what it costs to touch what everyone uses. So the fix is not writing less, it is keeping logic out of what half the repo imports: a façade has no branches, and the work stays in modules with few readers. In the analyser the cut is by phase, not by line ranges: reading, parsing, recording and counting are different things that all lived in the same `for`.

**How it is checked**: the whole suite, **972** cases in **121** files, stays green, and the analyser's determinism and parity cases pass untouched. To rule out a change in the analysis, the same repository was run with the `analyze-core.ts` from `HEAD` and with the new one: **no metric of any other file changes**, only its own. Repository debt drops from **11,331** to **10,381**, and the app running against the repo already shows **407** files and **10.4k**.

**Verdict**: done. The list continues with `apps/cli/src/commands/serve.ts` (complexity 45, debt 230), `apps/cli/src/commands/analyze.ts` (35, 216), `packages/parsers/src/migration.ts` (41, 210) and `packages/metrics/src/diff.ts` (38, 195): all four with fan-in 4 or 5, where lowering complexity is worth half.
