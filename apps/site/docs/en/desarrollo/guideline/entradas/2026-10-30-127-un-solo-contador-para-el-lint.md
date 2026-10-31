---
title: "One counter for lint"
date: "2026-10-30"
category: "fix"
verdict: "arreglo"
---

**What it was**: the same artifact gave different numbers depending on where you looked. The UI counted rules with findings while ignoring `info`; the MCP counted them; the CLI added messages up on its own. In a measured, clean repo with 24 active rules, the **Reglas** header said `0`, which reads as "there are no rules". And the CLI output said `oxlint sin config · sin config: corre sus correcciones…` and `0 ficheros`, which sounds like nothing was analysed.

**What changes**: the count lives in **one place**, `packages/lint/src/rollup.ts`: `lintTotals` (errors, warnings, findings and files with any message) and `lintRules` / `lintRuleCounts` (each rule with its three counts). The app adds the `score` that already weighed on risk; the MCP and the CLI read the same. An `info` is a finding in all three, even though it adds to neither errors nor warnings. In the project, the **Reglas** number counts active rules —0 only when there are none— and, in folder and file, rules with findings; the file row says "sin hallazgos de lint" instead of "sin violaciones". The CLI no longer repeats "sin config" in oxlint's note and says "ficheros con hallazgos", singular and plural.

**Why this way**: the number on screen cannot depend on the consumer. Keeping it next to the artifact format stops the next lint reader from inventing its own, and leaves one clear rule for `info`: it counts as a finding, not as debt.

**Verified**: new tests for the shared counter —totals with `info`, folder boundary, no artifact, deterministic order— and updated UI and MCP tests; a test for the header with active rules and for oxlint's note without duplication; a test for the CLI output with "1 fichero con hallazgos · 1 error · 1 aviso". A real run on this repo: 24 active ESLint rules, oxlint measured and not enumerated, 0 files with findings and the note only once. Typecheck, lint and suite green.

**Verdict**: fix.
