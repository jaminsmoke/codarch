---
title: "M76 closes with Rules on the sheets"
date: "2026-11-02"
category: "feature"
verdict: "fase"
---

**What it was**: the rest's rules already measured in the pass and wrote
`.codarch/lint-rest.repmod.json`, but the rest map still did not show them: no
**Rules** section, no bar mark, and `.codarch.yml` could not declare entries,
twins, frontmatter or severities. The link's line stayed open.

**What changes**: the `docs:` block of `.codarch.yml` is read, validated and fed
to `buildRestLint`. Web, CLI `serve` and desktop load `lint-rest.repmod.json` on
the same path as code lint. Document, folder and project sheets of the rest show
**Rules** (not Lint) and the bar mark shows the worst severity in scope —no mark
if clean or unmeasured—. The link's line stays **out of v1**: the snapshot stores
edges, not the line, and faking it would lie. M76 closes.

**Why this way**: one vocabulary (rule, severity, message) and one artifact per
tree. The code map does not load this; code risk does not weigh it. Configuration
declares what cannot be guessed —entries, twins, frontmatter schemas— in the same
analysis scope.

**Verified**: typecheck, lint, `check:action` and vitest (1632); tests for the
`docs:` block, for `serve` (`/data/lint-rest.repmod.json`), for desktop
persistence and for `lintBarMark` with a rules label.

**Verdict**: done. M76 closes. The link's line reopens only if the rest stores the
`rest.links` lens.
