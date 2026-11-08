---
title: "The rule manager shows the diff and can undo"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: enabling or removing a rule wrote straight to the config. Recommendations were the
same for every project and the Checkstyle catalog only covered the most obvious modules.

**What changes**: [ADR 0112](/en/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/) adds four things.

- **Preview**: the server computes the change without touching the disk and the confirmation shows the
  line diff. Only on accept does it write and lint again.
- **Undo**: the last write per config is kept in server memory and can be reverted from the notice. It
  is not stored in `.codarch/`: it is not part of the analysis artifact.
- **Project recommendations**: safe signals are read from `package.json` (React, Vue, Svelte,
  TypeScript, Vitest or Jest) and matching rules are added. When the real catalog is available, the
  extra rules are filtered against it so it never recommends something the config cannot resolve.
- **Checkstyle**: the curated catalog grows from about eighty to more than one hundred and seventy
  modules, each with its verified container. An unknown module is still rejected and the menu explains
  it instead of saying there are no matches.

**Why this way**: the diff gives context before touching the project; undo is a safety net, not a second
source of truth; and a recommendation is only worth it if the tool can load it.

**Verified**: preview does not modify the file; writing and undoing restores the original content; a
second undo answers 409; the menu shows the empty-catalog note; recommendations do not duplicate the
base ones; the full suite and typecheck pass.

**What is missing**: Checkstyle modules outside the curated catalog are still rejected; undo lives as
long as the server and covers one write per config; project signals are limited to `package.json`.

**Size**: the no-write computation in `@codarch/lint`; the preview and undo routes in the server; the
diff, confirmation, notice and recommendations in the card.

**Verdict**: done.
