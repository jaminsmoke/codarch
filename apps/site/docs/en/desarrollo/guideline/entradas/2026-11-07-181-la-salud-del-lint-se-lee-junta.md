---
title: "Lint health is read together"
date: "2026-11-07"
category: "fix"
verdict: "adr"
---

**What it was**: the Code card read only `lint.repmod.json`. An empty 1.2 legacy file came out with unknown coverage, and document findings ended up in Docs and config, next to the catalog.

**What changes**: `scopeHealthMerged` joins the two artifacts by canonical path ([ADR 0109](/en/desarrollo/adr/0101-0110/0109-la-salud-del-lint-se-lee-junta/)). Each finding keeps domain, tool and rule; if the tool is inferred, it says so. At the root, documents are not cut by the code paths. A legacy origin carries the reason `legacy-version` and does not become complete coverage. The catalog derives `countState`: oxlint that was not enumerated is `unknown`, not zero. The `codarch` rules come from the producer, not from the messages. Risk does not change.

**Why this way**: adding in each panel double-counts, and one `meta.tree` cannot sign both trees.

**What is left**: the code card does not open a `.md`, because that node is on the rest map. The finding's anchor names which map.

**Size**: the adapter is in `@codarch/lint`; the card only calls it.

**Verdict**: done.
