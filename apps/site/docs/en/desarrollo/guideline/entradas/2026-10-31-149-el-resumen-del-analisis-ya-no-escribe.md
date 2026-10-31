---
title: "The analysis summary no longer writes anything"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `apps/cli/src/commands/analyze.ts` had 584 lines and, inside, the command's summary: fourteen
functions building the text you see when it finishes. Three of them —`parseField`, `scopesText` and
`historyText`— were not presentation: they wrote the parse cache, the scope register and the history photo
while each line was built. Whoever read the summary was writing artifacts, and the order of the fields was
the order of the writes.

**What changes**: the text lives in `apps/cli/src/analyze-report.ts` (262 lines) and takes the numbers done:
a `ReportFacts` object with structure, imports, migration, lint, parsing, scopes, history, churn, warnings
and what was left unresolved. The writes move to the command (`collectReport`), which does them with the
same names and the same order as before, then asks for the text.

**Why this way**: a formatter with side effects is a formatter you cannot test. The summary is now tested
without `git`, without `fs` and without a temporary repository: 20 new cases pinning the order of the
fields, the plurals ("1 error" / "3 errors"), the lint coverage (ADR 0098), the caps of ten warnings and
five broken imports with their "and N more", and what is said when something could not be saved. Before
this, the text was only visible through the `console.log` of an integration test.

**Verified**: the whole suite green —**172 files and 1489 tests**, were 1469— and, besides the tests, a real
pass against a temporary repo: the summary comes out with the same fields in the same order, the parse cache
stays in `.codarch/` and the history in `.codarch-history/`, which is where it belongs on purpose (it is
shared, not ignored). The command is down to 501 lines.

**Verdict**: fix.
