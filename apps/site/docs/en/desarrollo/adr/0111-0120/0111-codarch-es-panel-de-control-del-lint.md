---
title: "ADR 0111 — CodArch is also a lint control panel"
description: "The card is no longer read-only: it enables and disables rules by writing the project config, with confirmation and without a second source of truth. It starts with oxlint in JSON."
section: desarrollo
status: accepted
date: "2026-11-08"
sidebar:
  label: CodArch is a lint control panel
  order: 111
---

**Status:** accepted · **Date:** 2026-11-08

It **amends** the point of [ADR 0096](0096-el-lint-es-del-proyecto.md) that kept configuration read-only
and [ADR 0104](0104-el-lint-se-lee-por-hallazgos.md) that made the rule section read-only.

## Context

CodArch read the project's lint and showed its rules, but could not change them. The card was a mirror.
To be useful as a control panel, enabling or disabling a rule must change the project's real
configuration: if CodArch stored its own preference, `npm run lint` and CodArch would disagree. That is
not acceptable.

## Decision

1. **One source of truth: the project config.** Every action writes the file the project already uses.
   CodArch keeps no parallel list of active rules.
2. **Only write what can be read and validated.** The first tool is **oxlint** in JSON
   (`oxlint.json`, `.oxlintrc.json`). ESLint is out of this delivery: its config is executable
   JavaScript and needs an AST writer plus a decision on presets and overrides.
3. **Enable** writes `"rule": "error"` or `"rule": "warn"` in `rules`. **Disable** removes the entry if
   it was explicit and no categories are on; if the rule may come from a category or a preset, it
   writes `"rule": "off"` in the project config. An inherited rule is never touched blindly.
4. **Confirmation with context.** The disable button opens an inline confirmation with the rule, the
   file and the exact change. No “are you sure?” without a subject.
5. **Recommended.** A curated, versioned catalog in `@codarch/lint` holds the minimum per tool. The card
   shows recommended rules that are not active and enables them with the same write. Project-specific
   recommendations come later, when signals justify them.
6. **Safe write.** The server validates origin, system and rule, writes atomically and asks live to
   re-analyse. The card updates from the new artifact: the state is not invented.
7. **If it cannot write, it says so.** A read-only config, an unknown format or a platform without
   writing shows no active buttons. The change is not faked.

## Consequences

- CodArch stops being a mirror and becomes a monitor and control panel; the artifact remains the
  measurement of the project config.
- The read-only branch (catalog, grouping, folding) remains the presentation; writing is a separate
  layer.
- Live must re-analyse after writing. Without live the change still applies, but the card does not
  update by itself.
- ESLint keeps its read-only card until its writer exists. It does not pretend it can edit.

## Rejected alternatives

- **Storing rules in `.codarch.yml` and applying them only when measuring.** It would be a second source
  of truth and `npm run lint` would not see the change.
- **Rewriting `eslint.config.js` as text.** It is code: presets, spreads and overrides cannot be
  removed by looking for lines.
- **Enabling without confirmation.** Changing configuration is a write to the repo; the user must see
  which file and line are touched.
- **Showing every tool's full rule catalog.** We do not have it for ESLint and it would age with every
  version; recommended rules are a small, maintained set.

## Roadmap

No new phase.

- ✅ The decision and the minimum recommended catalog.
- ✅ The oxlint JSON writer with enable, disable and validation.
- ✅ The server route and live re-analysis.
- ✅ The inline confirmation and the recommended block.
- ⬜ ESLint with AST and overrides, in a separate delivery.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
