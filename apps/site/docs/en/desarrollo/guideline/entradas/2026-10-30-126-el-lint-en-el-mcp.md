---
title: "The agent can read the lint now"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: lint lived on the map, in the PR comment and in Rules, but the MCP did not expose it. An agent could tell a file had lint debt from its metrics, not which system produces it, with which rule and on which line.

**What changes**: `get_lint_report` reads the `.codarch/lint.cc.json` left by `codarch lint` and `serve`, next to the snapshot, and returns the project's `systems` —name, configuration, active rules with their severity and the note about what could not be measured or enumerated—, the `tools` that measured, the `summary`, the scope's `files` and `total`, the `rules` with their count and the `findings` with file, rule, severity, line, column and message. Errors come first and then by path and line; `limit` trims the list without touching `total`. It filters by `path` (folder or file, validated against the snapshot), by `rule` and by `severity`. With no artifact it does not answer "clean": `available: false` with the reason, because not measured is not no findings. It also reads the previous name, `lint.json`.

**Why this way**: the MCP does not measure, it counts what was measured, as with the rest of the model (ADR 0013, ADR 0074). That is why it runs no tools and expands no rules: if the artifact is not there, the honest answer is that it is missing, not a plausible list. And a single tool, not one per question: the agent asks for a folder's lint and gets systems, rules and messages in the same response.

**Verified**: tests for the tool with a real `createLintArtifact` artifact —systems with their rules and their note, finding and rule order, filters by folder, file, rule and severity, trimming with `total` intact, reading `lint.json` and `available: false` without an artifact— and for server registration: fourteen tools. A stdio call against a temporary repo with real `analyze` and `lint` runs (Ruff stubbed on the PATH) returned both systems and their findings. `apps/mcp` suite green, lint, typecheck and site build.

**Verdict**: phase in progress.
