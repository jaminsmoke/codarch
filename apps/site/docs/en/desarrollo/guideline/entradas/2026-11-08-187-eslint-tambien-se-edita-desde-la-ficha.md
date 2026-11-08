---
title: "ESLint is also edited from the card"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: oxlint could be enabled and disabled, but ESLint stayed read-only. Adding a rule that was not in the catalog was not possible either.

**What changes**: the rule manager ([ADR 0112](/en/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) also edits ESLint. Rules that cannot be removed from a line —presets, spreads— are written as an override in a **managed block** with markers inside `eslint.config.js`; the block is inserted once and afterwards only its content is rewritten. An explicit rule is covered by the same override for now. The **Add rule** menu opens in the tool, searches the project's real catalog and groups by plugin: 292 ESLint core rules and 136 from `@typescript-eslint` in this repo, plus oxlint's from its schema. The severity is chosen and written to the project config. After writing, live measures again; if the config changes outside CodArch, it does too.

**Why this way**: the project config is the only source of truth. `.codarch/` remains the report of the last run, not a list of rules. The block is read in the same place and adds no indirection the user did not ask for.

**Verified**: the catalog lists 292 core rules and 136 from `@typescript-eslint`; the writer inserts the block in `tseslint.config(...)` and updates it without duplicating it; `eslint` still loads the config; enabling and disabling from the route writes and re-lints; catalog, writer and menu tests.

**What is missing**: `meta.config` 1.4 with the config fingerprint; removing the explicit line when the AST can locate it safely; Biome, Ruff and Checkstyle.

**Size**: the catalog and writer in `@codarch/lint`; the route and live in `serve`; the platform action; the card and menu in `packages/ui`.

**Verdict**: done.
