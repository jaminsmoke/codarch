---
title: "The rule list reads by plugin"
date: "2026-11-08"
category: "feature"
verdict: "arreglo"
---

**What it was**: in **Docs and config** active rules were a flat list: the full identifier —plugin and rule separated by a slash— on one line, with the severity in grey. With 24 ESLint rules and 5 oxlint rules, everything weighed the same.

**What changes**: each tool —eslint, oxlint— is a **collapsible subsection** with its rule count and, when closed, its configuration and state. Inside, rules are grouped by **plugin**: a subtitle `@typescript-eslint`, `core` or `doc`, with its rules below, each with severity on the right and a coloured bar on the left. The `title` keeps the full identifier and severity tints the bar and the label —red for error, ochre for warning, blue for info— not the name: an active rule is configured, it has not fired. The section gains hierarchy: the section title goes up to 14 px, each system name to 12.5 px, “Tools that measured” becomes a subtitle with its rule, and the catalog drops lint's red because it is configuration, not debt.

**Why this way**: the plugin is context and the rule is what you search for. Splitting them makes it possible to scan by name and severity without reading a slash in every row, and the colour answers “is it an error or a warning?” at a glance.

**Verified**: the 24 ESLint rules and 5 oxlint rules render grouped by plugin, with their severity; the test checks `@typescript-eslint` + `no-unsafe-declaration-merging`, `core` + `no-console`, both colour levels and that each tool folds.

**What is missing**: nothing. CodArch's custom rules still come later.

**Size**: `LintConfigSection`, `lint.css` and the section title scale in `inspector.css`.

**Verdict**: done.
