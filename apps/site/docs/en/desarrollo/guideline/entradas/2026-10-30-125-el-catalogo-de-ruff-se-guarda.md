---
title: "Ruff's catalogue stays home"
date: "2026-10-30"
category: "optimized"
verdict: "fase"
---

**What it was**: to enumerate Ruff's active rules, every `codarch lint` pass —and every re-analysis of `codarch serve`— ran `ruff rule --all --output-format=json`, which returns hundreds of rules. The result is the same on every pass with the project's version.

**What changes**: before asking for the catalogue, it asks the version with `ruff --version` and looks in `.codarch/lint-cache.json`. If the file holds that same version, the selectors are expanded with what was saved and `ruff rule` is not run. Otherwise the catalogue is requested, expanded and saved with the version that produced it. Upgrading Ruff changes the version line and invalidates the cache on its own, with no migrations. If `.codarch/` does not exist, it is not created just to write the cache: the first pass that does not have it yet saves nothing and the next one finds it. A write failure swallows the cache and carries on, which costs a call, not a result.

**Why this way**: the catalogue is not a decision of the repo but of the installed version, and storing it does not change what is measured. It lives outside the artifact: it does not touch `lint.cc.json` or the checksum, because the rule that does not move is that the checksum depends on the code and not on what you have installed.

**Verified**: tests for the first pass writing `{ version, rules }` into `.codarch/lint-cache.json`, for the second pass not running `ruff rule` and expanding the same, for another version requesting the catalogue again, and for `.codarch/` not being created when it is absent. `packages/lint` suite green, typecheck and site build.

**Verdict**: phase in progress.
