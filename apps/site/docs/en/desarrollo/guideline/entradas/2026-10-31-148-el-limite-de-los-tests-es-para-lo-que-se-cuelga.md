---
title: "The test limit is for what hangs"
date: "2026-10-31"
category: "chore"
verdict: "arreglo"
---

**What it was**: the suite failed now and then, always in the same two: `diff.test.ts` ("accepts equivalent
option forms…") and `head-report-parity.test.ts` ("tras un cambio nuevo, los dos se renuevan igual"). Both
open a real repo, write a commit, run the CLI through `tsx` and compare the server's HEAD report with the
desktop's. On a loaded machine they go past five seconds and Vitest calls them hung, leaving the suite red
over time rather than over what they check.

**What changes**: `vitest.config.ts` raises the limit to thirty seconds. Nothing else: no case is skipped,
no assertion is touched, no test is marked slow.

**Why this way**: five seconds is a good limit for a pure function and a bad limit for two processes.
Raising it where it is configured —and not case by case— keeps the bar where it matters: a test that really
hangs still fails, just thirty seconds later instead of five. The alternative —`it(..., 30_000)` on the two
that complain— hides the problem in the ones that have not complained yet.

**Verified**: the whole suite with the new limit, **171 files and 1469 tests** green, and the two failing
cases run in seconds. With `--testTimeout=60000` they already passed, which is what said the problem was the
clock and not the code.

**Verdict**: fix.
