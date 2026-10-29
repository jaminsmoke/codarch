---
title: "The lint runs"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: [ADR 0094](../../adr/0091-0100/0094-el-lint-en-el-mapa.md) had its format and its normalizers, but no command wrote the artifact: lint still did not exist for anyone using CodArch.

**What changes**: `codarch lint` reads the `lint:` block of `.codarch.yml` —`name`, `command` and `format` (`eslint-json` or `oxlint-json`)—, launches every tool **in parallel** at the repo root and writes `.codarch/lint.json`. It fails soft: a tool that is missing or crashes is reported and the rest carry on; the artifact is written with what was measured, and only those tools land in `meta.tools`. A linter with findings that exits non-zero is **not** a failure if it wrote its JSON, and the command does not block by default: `--fail-on never|errors|warnings` decides. With no tool measuring there is no artifact and the exit code is 1, because an empty file would say "clean" when it means "unmeasured". If `.codarch/` is born here, it is added to `.gitignore`, as in `analyze`.

**Why this way**: the command is the one that knows about processes and the lint package the one that knows about dialects; that is why `runLint` takes a runner and the normalizer never sees a `child_process`. Warnings `npx` writes to stdout before the JSON are tolerated by reading from the first bracket to the last: a tool did not stop measuring because npm talks.

**Verified**: 12 new tests in `packages/lint` (valid and malformed configuration, ordering and soft failure, JSON wrapped in warnings, determinism) and 9 in the CLI, covering the artifact, `.gitignore`, `--fail-on`, `--out` and invalid configuration. By hand, with real ESLint and oxlint over a file with `var` and `debugger`: the artifact comes out with 1 error and 3 warnings, `--fail-on errors` returns 1, and the `build:cli` bundle does the same from `apps/cli/dist`. Full suite (1,165), lint, typecheck and `site:build` green.

**What is missing**: `serve`, the web and the desktop reading the artifact, the fourth risk signal, the file and folder fichas, and the Linter lens.

**Verdict**: phase in progress.
