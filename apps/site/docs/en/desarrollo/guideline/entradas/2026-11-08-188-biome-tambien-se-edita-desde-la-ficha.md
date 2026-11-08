---
title: "Biome is also edited from the card"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: the rule manager covered oxlint and ESLint; Biome stayed read-only.

**What changes**: the Biome writer ([ADR 0112](/en/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) edits its `biome.json` in place: `linter.rules.<group>.<rule>`. Enabling writes the severity and turns the linter on if it was off; disabling writes `off` while recommended rules remain on and, if not, removes the entry. `biome.jsonc` is not rewritten because comments would be lost: it says so and leaves it alone. The card shows Biome's recommended rules and, if the installed schema can be read, its catalog in the add menu.

**Why this way**: it is the same contract as oxlint and ESLint: the project config wins. The format is JSON and can be validated before writing; JSONC waits for an editor that preserves comments.

**Verified**: enabling `suspicious/noDoubleEquals` on an off `biome.json` turns the linter on and writes the rule; disabling with recommended rules on leaves `off`; with recommended rules off it removes the entry; a `biome.jsonc` is rejected with a reason.

**What is missing**: Checkstyle (XML).

**Size**: the writer and recommendations in `@codarch/lint`; the editable condition in the card.

**Verdict**: done.
