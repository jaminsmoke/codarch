---
title: "ADR 0108 — Lint adds to risk"
description: "Lint no longer rescales the base. It adds a term before gamma, only from each file's health, and the 0..100 index is the sum of the contributions."
section: desarrollo
status: accepted
date: "2026-11-06"
sidebar:
  label: Lint adds to risk
  order: 108
---

**Status:** accepted · **Date:** 2026-11-06

This **amends** point 3 of [ADR 0094](../0091-0100/0094-el-lint-en-el-mapa.md) and does not change the base weights of [ADR 0008](../0001-0010/0008-diseno-mapa-2d.md). The coverage it reads is [ADR 0107](0107-la-cobertura-del-lint.md). The formula, with the cases, is in [risk](../../riesgo.md).

## Context

With an artifact, risk rescaled the base to leave 20% for lint: complexity 0.40, churn 0.256, size 0.144 and lint 0.20. A file with no findings went down, because that 20% weighed zero. A file missing from `files` was filled with zero and counted as measured. Project health, if used, said the same thing about every file.

That mixes three different facts: the snapshot base, the observed debt, and the failure to compare the tree.

## Decision

1. Base B does not change. Complexity 50%, churn 32% and size 18%, renormalized when a signal is missing, normalized by its p95. Gamma stays at 1.7. Folders still aggregate by maximum.
2. Lint is not a fourth signal of that base. When debt counts, it is added before gamma and never subtracts:

   `D = errors + 0.25·warnings` (info does not count)

   `nL = clamp(D / 10, 0, 1)`

   `raw = min(B + 0.2·nL, 1)`

   `risk = raw^1.7` on 0..1

   `score = 100·raw^1.7` on 0..100

   α = 0.2 and Dsat = 10 are provisional: they are not calibrated. `RISK_WEIGHTS_WITH_LINT` stays exported as card metadata; the index does not use it.
3. Whoever computes risk passes `lintView` for **each file**, copied from its `scopeHealth`: `fresh`, `counts`, `coverage` (`state`, `eligible`, `measured`, `reasons`), `applicability` (`applicable`, `na` or `not-found`) and `reason`. Project health is not passed. The whole artifact is not passed. With no artifact there is no view: a 0 is not invented.
4. When the file brings `lintView`, it wins over the legacy number and over `options.lint`. The legacy number is only a bridge for callers that still have no view.
5. Debt counts with `fresh === true` and valid counts, even when coverage is `unknown`, `partial` or `unmeasured`: that is an observed minimum, not a closed measurement. `fresh === false` or `null` does not penalize. `fresh === null` is still "there was no comparison", with reason `freshness-unverified`.
6. Not applicable and not found do not collapse. `na` comes from `eligible === 0`, from `not-eligible` or `no-eligible`, or from `applicability: "na"` with a reason. `not-found` is a different state: it is not zero and it is not not-applicable.
7. `contributions` for complexity, churn, size and lint have `points`, `percent` and `weight`. The `points` that are not null sum to `score`. `weight` is the nominal weight, not the percentage or the renormalized share. `points` null means the signal does not count.

`risk` without a lint term is the base alone, the same number as before this term.

## Consequences

- A map with two files may not move color: the p95 is the smaller one, both saturate at 1, and adding lint cannot pass 1. Findings and a base that is not already at the ceiling are required.
- Zero findings on a current tree add zero. They do not lower everyone else's risk.
- The debt lens still paints `errors + 0.25·warnings`. That is not the index term.
- A card that still reads `parts.lint.weight` sees 0: that weight does not exist in the base breakdown. The frontend closes the contribution row on this branch.
- α and Dsat can change without touching the `scopeHealth` contract.

## Rejected alternatives

- **Keep rescaling to 20%.** A lint zero lowered files that nobody could call clean.
- **Fill absent `files` entries with 0.** Absence and zero debt stopped being different.
- **Use project health for every file.** A finding in one file tinted the index of the others.
- **Add nothing when coverage is `unknown`.** Errors that were seen would be dropped. They count as an observed minimum, and the file is not called clean.

## Roadmap

No new phase.

- Done: the formula in `@codarch/metrics` and the render, MCP and screenshot wiring.
- Out of this delivery: the contribution row on the card. The frontend patches it on this branch.
- Still open: calibrating α and Dsat. They are provisional.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
