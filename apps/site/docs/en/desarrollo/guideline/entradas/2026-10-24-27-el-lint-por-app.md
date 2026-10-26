---
title: Linting, per app and per kind of code
date: "2026-10-24"
category: chore
verdict: adr
---

**What it is**: a second lint net, with ESLint configured per area, on top of oxlint.

**Why**: oxlint is fast and catches the obvious, but not the rules of hooks, list keys,
accessibility, unawaited promises or a stray `it.only`. The zoom jank was not a lint bug, but it made
clear that a net was missing.

**What was decided**: oxlint stays in every save; ESLint adds hooks, React, accessibility and promise
rules with a flat config per path (core/Node, UI/React, Electron main, tests). Type-aware rules live
in a separate pass (`lint:types`) so the save path is not punished. Dependencies: `eslint`,
`typescript-eslint`, `globals`; for React, `eslint-plugin-react`, `eslint-plugin-react-hooks` and
`eslint-plugin-jsx-a11y`; for tests, `@vitest/eslint-plugin`. No `eslint-plugin-import` (CodArch's
graph already does that work) and no Prettier.

**Verdict**: [ADR 0054](../../adr/0051-0060/0054-el-lint-por-app.md), M35 phase.
