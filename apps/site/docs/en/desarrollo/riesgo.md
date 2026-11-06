---
title: Risk and lint
description: "The base does not change. Lint adds a term before gamma, read from each file's health, and the contribution points sum to the 0..100 index."
section: desarrollo
sidebar:
  label: Risk and lint
  order: 5
---

The decision is [ADR 0108](adr/0101-0110/0108-el-lint-suma-al-riesgo.md). The health that is copied is [artifact 1.3](lint-1.3.md).

## The base

B is the same as always: complexity 50%, churn 32% and size 18%. When a signal is missing, those weights renormalize. Each signal is divided by its p95 and clamped to 1. Gamma is 1.7. A folder keeps the maximum of its files, not the sum.

Without a lint term, `risk = B^1.7`. That is the same number as before.

## The term

```
D   = errors + 0.25·warnings
nL  = clamp(D / 10, 0, 1)
raw = min(B + 0.2·nL, 1)
risk  = raw^1.7          0..1
score = 100·raw^1.7      0..100
```

Info does not enter D. α = 0.2 and Dsat = 10 are not calibrated. Lint never subtracts. Once `raw` is 1, more debt does not raise the index: a two-file map is often already at that ceiling, because the p95 is the smaller of the two.

## What is passed

Per file, the view that comes from its `scopeHealth`:

| Field | What it is |
|---|---|
| `fresh` | `true` when `meta.tree` is the snapshot checksum. `false` when both exist and differ. `null` when there was no comparison. |
| `counts` | Errors, warnings, info and findings, counted from the messages. |
| `coverage.state` | `unmeasured`, `unknown`, `partial` or `complete`. |
| `coverage.eligible` | Size of the universe. `null` is not zero. |
| `coverage.measured` | It does not enter the formula. |
| `coverage.reasons` | The contract codes. `not-found`, `not-eligible` and `no-eligible` matter. |
| `applicability` | `applicable`, `na` or `not-found`. |
| `reason` | The first reason, so `na` is evidenced. |

Project health is not passed, nor the whole artifact. With no artifact there is no view. A file missing from `files` is not filled with 0.

`lintView` wins over the legacy number. That number only remains for callers that still do not build the view: it is read as fresh debt of unknown coverage, and `options.lint` is required.

## When debt counts

| Situation | What the index does |
|---|---|
| `fresh === true` and there are errors or warnings, even when the state is `unknown` | It adds. Confidence is an observed minimum, not a closed measurement. |
| `fresh === true`, coverage `complete`, `eligible > 0`, debt 0 and info 0 | It adds nothing. The file can be called clean. |
| `fresh === true` and debt 0 with an unknown universe | It adds 0. It does not lower the others and is not called clean. |
| `fresh === false` | No penalty. The tree is not this one. |
| `fresh === null` | No penalty. There was no comparison (`freshness-unverified`). |
| `applicability: "na"` | No penalty. It is not zero. |
| `applicability: "not-found"` | No penalty. It is not not-applicable and it is not zero. |
| No artifact | No view. Risk is B^1.7. |

## Contributions

Each signal has `points`, `percent` and `weight`.

- `points` are points of the 0..100 index. Those that are not null sum to `score`.
- `percent` is the percentage of that index. Null when the index is 0 or the signal does not count.
- `weight` is the nominal weight (0.50, 0.32, 0.18, and 0.2 for lint when nL exists). It is not the renormalized share or the percentage.

`points` null means the signal does not count. It is not a zero.

## Where it lives

The object is what `riskBreakdown` returns in `@codarch/metrics` (`packages/metrics/src/risk.ts`). The render model stores it on each file as `riskBreakdown`, and the card reads that. It is not written to `cc.json`. MCP and the screenshot copy it only into their output. When the snapshot has no metrics, the field is `null`: the card does not recompute it.
