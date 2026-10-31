---
title: "Totals to Métricas, rules to Reglas"
date: "2026-10-30"
category: "fix"
verdict: "arreglo"
---

**What it was**: the same sheet said two things with the same words. In **Métricas** lint was "0 errors · 0 warnings" —the artifact's findings— and in **Reglas**, right next to it, "22 errors · 2 warnings" —the rules ESLint's config enables as error or warning—. Neither number was wrong; the reader had no way to know they measured different things. The split also duplicated numbers across both sections, and Métricas left `info` out: a project with only suggestions said "0 errors · 0 warnings" while Reglas counted findings.

**What changes**: each section owns one thing. **Métricas** carries the totals —errors, warnings and info, files with findings and score—, each count in its ink, and its per-folder table swaps the file count for the **Info** column, which was missing. **Reglas** speaks only of rules: systems say how many active rules they have and how their config enables them —«22 como error · 2 como aviso», with the word "como" separating a configured rule from a finding—, the header counts rules and repeats no totals, and the findings table gives each rule's count. The file sheet names the three severities, so a file with only `info` no longer says "0 errors · 0 warnings". The CLI appends `· N info` to the artifact line when there are any: a lint with only suggestions does not say zero in the terminal either.

**Why this way**: two sections showing the same thing end up disagreeing; the number goes where it is decided —debt, in Métricas— and the rule where it is explained —Reglas—. The shared counter now adds up from **messages** rather than from the counts each file declares: a foreign artifact with `errors` and `messages` that do not match can no longer make both sheets read different numbers, because there is a single source.

**Verified**: a counter test with an artifact declaring 9 errors while carrying one warning —the message wins—, UI totals with `info`, and tests that Reglas repeats neither "errores" nor "avisos" in the systems block and that Métricas shows the three counts. Suite, typecheck and site build green.

**Verdict**: fix.
