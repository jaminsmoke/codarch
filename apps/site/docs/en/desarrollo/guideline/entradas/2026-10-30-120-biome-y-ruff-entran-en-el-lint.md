---
title: "Biome and Ruff join lint"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: Biome and Ruff were detected from their configuration, and that was it: their systems entered the artifact with a "no reader yet" and their findings counted neither in risk nor in the ficha.

**What changes**: the artifact can read `biome lint --reporter=json` and `ruff check --output-format=json`, and the override's `format` gains `biome-json` and `ruff-json`. Biome runs with its `node_modules` binary (`@biomejs/biome/bin/biome`); Ruff, which does not live there, with the one the project has on the PATH. Biome gives no line or column —its `span` is byte offsets—, so its messages enter without a position instead of computing one by hand, and its rule keeps the group (`suspicious/noDoubleEquals`). Ruff gives no severity: its findings count as errors, which is how it treats them when it exits non-zero. Their active rules are still not enumerated, and the artifact says so. Their messages are merged with ESLint's and oxlint's, sorted and counted the same way.

**Why this way**: measure what the tool says and declare what it does not say. A byte `span` turned into a line with a heuristic, or a severity invented for Ruff, would be worse than a gap: the map would count debt the tool never claimed.

**Verified**: tests for both normalisers —prefix, severities, absolute paths, grouping by file and rejecting a JSON that is not theirs—, for dispatching by dialect in `runLint` and for detection with and without a binary. Plus a real `codarch lint` run on two test repos with one stub binary per tool (neither is installed here): it detects, runs, normalises and writes `lint.cc.json` with their findings. Full suite (1,250), lint, typecheck and site build green.

**What is missing**: the active rules for Biome and Ruff from their configuration, and the readers for Checkstyle, `go vet` and the .NET analysers.

**Verdict**: phase in progress.
