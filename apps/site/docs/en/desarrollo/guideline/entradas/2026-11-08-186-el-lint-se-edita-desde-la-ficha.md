---
title: "Lint is edited from the card"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: the **Docs and config** catalog showed active rules but did not let you touch them. CodArch was a mirror of the project: disabling a rule meant opening the file by hand.

**What changes**: the card is also a control panel ([ADR 0111](/en/desarrollo/adr/0111-0120/0111-codarch-es-panel-de-control-del-lint/)). In oxlint, every active rule has a button to disable it with an inline confirmation —rule, file and change— and each tool shows **recommended** rules that are not active with a button to enable them. The write goes to the project's `.oxlintrc.json`, not to a parallel list: `npm run lint` and CodArch keep seeing the same thing. The server validates origin, system and rule, writes atomically and asks live to re-analyse.

**Why this way**: disabling an explicit rule removes it; if it may come from a category, it writes `off` in the config. `eslint.config.js` is not rewritten: it is code and needs an AST writer, which is left for another delivery.

**Verified**: the catalog shows ESLint's 24 rules and oxlint's 5; oxlint's recommendations include `no-eval` and `no-implied-eval`. On a test server, enabling `no-eval` added the entry and disabling it removed it; tests cover enable, disable with confirmation, invalid config and a platform without writing.

**What is missing**: ESLint with AST; undoing the last write; project-specific recommendations.

**Size**: the recommended catalog and writer in `@codarch/lint`; the route in `serve`; the platform action; the card in `packages/ui`.

**Verdict**: done.
