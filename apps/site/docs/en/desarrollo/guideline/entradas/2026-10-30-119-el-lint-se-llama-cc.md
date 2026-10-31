---
title: "Lint is called cc"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: the lint artifact was `.codarch/lint.json`, a name that is confused with any tool's and did not say whose it was.

**What changes**: it becomes `.codarch/lint.cc.json`, in the family of `cc.json` and `rest.cc.json`. The reader looks for both names and only the new one is written, so a repo that already had `lint.json` does not lose its lint. `serve` serves `/data/lint.cc.json`, `render` publishes `data/lint.cc.json`, and the web app and the desktop app read the new one with the old one as a fallback. The content does not change: it is still the **normalised** report of what the project's tools said —rule, severity, line, column and text, with relative paths and canonical order—, not a new format or a measurement of our own.

**Why this way**: storing each tool's raw JSON would bring absolute paths and two shapes for the same thing: the app and the capture would need one reader per dialect and the checksum would stop being stable. Normalising is what makes the report the same wherever it is read, and the only thing added to the tool's own is the rule name and its place, which were already in it.

**Verified**: tests that write the new name and read the old one in the CLI, `serve` and `shot`, plus the web and desktop ones with both paths. Full suite (1,241), lint, typecheck and site build green; a real `codarch lint .` run leaves `lint.cc.json`.

**What is missing**: nothing about the name. The Biome and Ruff readers are still pending, like the rest of ADR 0096's roadmap.

**Verdict**: phase in progress.
