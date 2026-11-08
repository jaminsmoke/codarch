---
title: "ADR 0112 — The rule manager writes the project config"
description: "ESLint rules are added and removed the way a user would: the real config is edited, with a managed block for inherited rules and a searchable catalog of known rules."
section: desarrollo
status: accepted
date: "2026-11-08"
sidebar:
  label: The rule manager
  order: 112
---

**Status:** accepted · **Date:** 2026-11-08

It **amends** the scope of [ADR 0111](0111-codarch-es-panel-de-control-del-lint.md): the control panel
also edits ESLint and any tool whose format can be read and written safely. The project config remains
the source of truth.

## Context

Oxlint can already be enabled and disabled from the card. ESLint is missing, and its config is
executable JavaScript: there is no line to remove when the rule comes from a preset. Adding a rule that
is not in the catalog is missing too. And the `.codarch` report can go stale if the config changes
outside CodArch, because the code tree checksum does not change.

## Decision

1. **The project config wins.** The writer reads and writes the real file; `.codarch/` only holds the
   report of the last run, never active rules or preferences.

2. **Managed block in `eslint.config.js`.** Rules that cannot be removed from a line —because they come
   from a preset or a spread— are written as overrides in a block with stable markers:

   ```js
   // codarch:lint-rules:start
   // Managed by CodArch. Do not edit by hand.
   { rules: { "no-console": "off" } }
   // codarch:lint-rules:end
   ```

   If the block does not exist, it is inserted once into the exported array with an AST; afterwards only
   its content is rewritten. A rule explicitly written in the user's config can be removed or changed
   in place; if it cannot be found safely, the block is used. If the file cannot be parsed (functions,
   computed values, unsupported syntax), it says so and does not touch it.

3. **Catalog of known rules.** Each adapter can list its rules for the add menu:
   - ESLint: core rules and the rules of the plugins the project config resolves.
   - Oxlint: the rules of the installed version's schema.
   - If a tool cannot enumerate them, the menu only offers active and recommended rules and says so; a
     catalog is not invented.

4. **The UI is a manager.** Active rules are removed; recommended and catalog rules are added. The add
   menu is searchable and grouped by plugin; when adding, the severity is chosen (`error` or `warn`,
   default `error`). Every change shows the file and the diff before writing, then lints again.

5. **The report does not diverge.** The artifact gains an optional lint config fingerprint (`meta.config`)
   inside contract **1.3**; an older reader ignores it and an artifact without it is read the same. A
   change in a config file forces a re-measure even if the code checksum does not change, and the first
   pass after live starts is forced too. The fingerprint is for auditing which config produced the
   photo, not for deciding which rules are active.

6. **One tool, one writer.** The `LintRuleWriter` contract receives the system, the rule and the
   severity, and returns the path and the diff. Oxlint JSON already meets it; ESLint AST is next; Biome,
   Ruff and Checkstyle will follow with their formats.

## Consequences

- Adding an ESLint rule will be choosing it from the menu, seeing the change and accepting it; the
  project's `npm run lint` sees exactly the same.
- The managed block is visible and versioned: there is no hidden config in `.codarch/`.
- The report is updated when the config changes; it stops being a photo that can silently age.
- A weird `eslint.config.js` is not broken: the write is rejected with a reason.

## Rejected alternatives

- **Storing rules in `.codarch/`.** It would be a second source of truth and CI would not see it.
- **A separate file imported by the config.** It adds an indirection the user did not ask for; the
  managed block is read in the same place.
- **Search and replace text.** It breaks configs with presets, spreads and overrides.
- **Showing only recommended rules.** The user needs to add any known rule.

## Roadmap

No new phase.

- ✅ The decision: managed block and searchable catalog.
- ✅ The ESLint writer with the managed block and explicit rule removal.
- ✅ The rule catalog per tool (ESLint core and plugins; oxlint).
- ✅ The add menu with search, severity and confirmation.
- ✅ Re-measuring when the lint config changes.
- ✅ `meta.config` as an optional fingerprint inside 1.3.
- ✅ The Biome writer in JSON.
- ✅ The Ruff writer in TOML, with `ruff rule` for the catalog.
- ✅ Checkstyle: removing modules from XML and enabling the ones in its curated catalog in their container.
- ⬜ Expanding the Checkstyle catalog to unknown modules.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
