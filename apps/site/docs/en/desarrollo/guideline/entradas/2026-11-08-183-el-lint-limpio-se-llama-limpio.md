---
title: "Clean lint says it is clean"
date: "2026-11-08"
category: "fix"
verdict: "adr"
---

**What it was**: the project card said “Partial coverage: no findings observed in what was measured. It is not known which files were eligible” with ESLint and oxlint at zero over 685 and 731 files. `eligiblePaths` was never written, and oxlint's note said “it runs its default correctness rules” without naming what was happening: it was installed with no config file.

**What changes**: each tool declares its universe ([ADR 0110](/en/desarrollo/adr/0101-0110/0110-el-lint-limpio-se-llama-limpio/)). ESLint uses what it returned —clean files included— and oxlint a listing command, `--debug=files`; a `lint:` block in `.codarch.yml` may declare `list`. A missing config is stated with those words and does not block `complete`. In the project, folder and file cards, the card says **“Clean and up to date”** without the row of zeros when coverage is complete and the tree is up to date; otherwise it shows the counts and the reason. `codarch analyze` no longer says “freshness unverified” when the tree matches.

**Why this way**: config changes which rules run, not which files were measured. Deriving the universe from the snapshot does not work either: oxlint covers `.astro` and ESLint does not. Contract **1.3** stays: `eligiblePaths` already existed and a reason's `text` was already free-form.

**Verified**: this repo goes from `partial` to `complete` with **731** measured (685 from ESLint and 731 from oxlint), **0** findings and `fresh === true`; the system note says “no config file”. Tests for universe by results, listing, broken listing, missing config and clean in all three scopes.

**What is missing**: Checkstyle, Biome, Ruff, go vet and dotnet stay `unknown` if they do not list clean files. Ruff may use `--show-files` once wired.

**Size**: the adapters and `runLint` in `@codarch/lint`; the card in `packages/ui`; the `analyze` summary; the 1.3 artifact page and the CLI guide.

**Verdict**: done.
