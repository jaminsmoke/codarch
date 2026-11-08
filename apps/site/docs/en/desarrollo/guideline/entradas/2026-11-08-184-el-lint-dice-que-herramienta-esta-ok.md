---
title: "Lint says which tool is ok"
date: "2026-11-08"
category: "feature"
verdict: "arreglo"
---

**What it was**: the project card said “Clean and up to date”, but you could not see which tool had measured it or how many active rules it had. The only clue was oxlint's note when its config was missing.

**What changes**: the **Lint** section of the project card has one row per tool with its state (`ok`, `measured`, `partial coverage`, `unmeasured`), its config file, active rules and measured files. The tool's note stays in its row. It is not the rule catalog: that stays in **Docs and config**. The repo also gets a `.oxlintrc.json` with five explicit rules and categories off, so oxlint's catalog reads like ESLint's and live can show its rules.

**Why this way**: “clean” without a subject cannot be audited. The card says what was measured and with what; the catalog and CodArch's custom rules are another matter and come later. The oxlint config belongs to the repo, not the product.

**Verified**: ESLint with 24 rules and oxlint with 5 in **Docs and config**; 731 measured, 0 findings and `fresh === true`; live serves snapshot and lint with the same checksum. The `.oxlintrc.json` change shows up in the artifact and the card without restarting the browser.

**What is missing**: CodArch's own rules —architecture, doc and config— are not touched here. Checkstyle, Biome and Ruff still do not enumerate clean files without a listing command.

**Size**: one row per tool in `LintSection`, its helper in `lintHealth` and the repo's `.oxlintrc.json`.

**Verdict**: done.
