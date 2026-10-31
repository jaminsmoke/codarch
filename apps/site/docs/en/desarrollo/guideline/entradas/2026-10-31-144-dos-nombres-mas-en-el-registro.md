---
title: "The `.gitignore` and the config are written in one place"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: two more product names spread across the code, and one of them with a real bug. The
`.codarch/` line in `.gitignore` was added in **four places** —`analyze`, `codarch lint`, `serve` and
the desktop app—, each with its own "if the folder is being created now" check. And the config name,
`.codarch.yml` / `.codarch.yaml`, was in **six**: addons, metrics, the build's plugin registry,
`codarch installed`, the MCP and the web reader. Five looked for both names; the plugin build looked
**only at `.yml`**, so a repo with `.codarch.yaml` had its `plugins:` and addons ignored in the bundle
while `analyze` read them. That is the failure duplication hides: it is not that the code is repeated,
it is that one copy fell behind.

**What changes**: both names join the [ADR 0101](../../adr/0101-0110/0101-la-carpeta-es-del-producto.md)
registry. `CONFIG_FILE_NAMES` declares the two config files and `findRepoConfig(root)` looks them up in
order; metrics' `findProjectConfig`, the addons, the plugin build, `codarch installed` and the MCP come
from there. `ensureStateIgnored(root)` in `@codarch/parsers` is the only way to touch `.gitignore`: it
checks that `.codarch/` does not exist and writes `STATE_IGNORE_ENTRY`, and the CLI, `serve` and the
desktop app call it.

**What is left alone, and why**: the ignored-folder lists are still seven. They look alike —they all
carry `node_modules`— but they are not the same: the analysis respects the repo's `.gitignore` and only
excludes its own; lint skips `dist` when **looking for** its config, not when measuring; `resolve`
skips folders that are not workspace packages; `source` denies what is not served; and the server does
not publish `coverage`. Unifying them would save six lines and break five behaviours. The rule is to
unify what must match, not what is written alike.

**Verified**: a repo with `.codarch.yaml` and `plugins:` compiles its plugin (new test in
`plugin-api`), `findRepoConfig` prefers `.yml` when both exist and returns `null` without config, and
the registry rejects two roles sharing a name or a name carrying a path. The `.gitignore` entry is added
once and left alone when the folder already existed (two new cases). Lint with no messages, a clean
typecheck, **1418 tests** green.

**Verdict**: fix.
