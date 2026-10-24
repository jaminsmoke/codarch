---
title: The second lint net
date: "2026-10-24"
category: chore
verdict: fase
---

**What it is**: ESLint per area, on top of oxlint, with a separate pass for the rules that need
types.

**Why**: oxlint is fast and catches the obvious, but not the rules of hooks, list keys,
accessibility, unawaited promises or a stray `it.only`. The zoom jank was not a lint bug, but it made
clear that a second net was missing.

**What changed**: `eslint.config.js` with blocks per path (core/Node, UI/React, Electron main and
tests) and `eslint.config.types.js` with `no-floating-promises`, `no-misused-promises` and
`await-thenable` over the Node code. `npm run lint` runs oxlint + ESLint; CI also runs
`npm run lint:types`.

The first pass found thirteen real errors: a `require` in a fixture, the Starlight augmentation
(namespace and merging), the folder picker backdrop, three effects that synchronise state (each
documented with its reason), the 3D view's ref pattern, an `async` handler Node does not await and a
`whenReady()` without `catch`. Each was fixed or documented. Fifteen `exhaustive-deps` warnings remain
for stable setters from `app.actions`: they do not block.

**Verdict**: **M35 phase, closed**, in the roadmap of
[ADR 0054](../../../adr/0051-0060/0054-el-lint-por-app.md).
