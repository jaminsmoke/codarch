---
title: "analyze stops being a single function"
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**What it was**: `apps/cli/src/commands/analyze.ts` packed into `runAnalyze` —**35** of complexity, 262 lines in its longest function and **216** of debt— the root validation, the repo policy, the scope cache loading, the analysis, the snapshot write and, at the end, nine summary fields with their ternaries and their `try/catch`, each of which could fail in a different way.

**What it is**: the command orders phases and each one has a name. `readIgnore` returns the policy or why it is not valid; `loadCaches` brings the previous parse and the one from the scopes underneath, and with no readable scope it analyses everything; `writeSnapshot` writes `cc.json` or says why it could not; `reportLines` assembles the summary with one function per field —`migrationText`, `parseField`, `scopesText`, `historyText`, `churnText`, `warningLines`, `unresolvedLines`—. Complexity drops to **11**, the longest function to **79** lines and the debt to **72**.

**Why like this**: the summary is presentation and the rest is analysis: they do not fail for the same reason nor change for the same reason. A summary field should not be able to bring down the snapshot write, and a catch for the parse cache has nothing to do with the one for history. Separating them lets each say what it does when it cannot.

**How it is checked**: the same repository was run with the `analyze.ts` from `HEAD` and with the new one, starting from the same cache: the command output is **identical**, only the time and the snapshot bytes change. A new case in `apps/cli/test/analyze.test.ts` pins the order of the summary fields —from the root to churn— so a field that sneaks in gets noticed. The suite sits at **979** cases and **122** files. Repository debt drops from **10,271** to **10,128**.

**Verdict**: done. Next are `packages/parsers/src/migration.ts` (complexity 41, debt 210), `packages/metrics/src/diff.ts` (38, 195) and two files with fan-in 16 and complexity 10 —`packages/addons/src/index.ts` and `packages/ui/src/storage.ts`—, where what weighs is not complexity but how many import them.
