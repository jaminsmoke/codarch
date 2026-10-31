---
title: "Duplication reaches the diff"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: duplication was already measured (M68), painted on the map and listed as pairs (M69
and M70), but the diff did not look at it. A PR could add a new copy or let two copies drift apart
without the report, the PR comment or the MCP saying so: the change went through with the architecture
intact on paper.

**What changes**: the report goes up to `1.5` and gains the `duplication` section: duplicated and
repeated lines on each side with their delta, the pairs that appear, those that disappear and those
drifting apart —with their similarity before and after— and the counts before truncating. The CLI adds
its line to the summary and a section with the pairs; the **Changes** tab gains **Duplication** with
the lines gained or lost and both ends of each pair, each one opening its card; the PR comment carries
its row and block; and the MCP ships `get_duplication_report`, scoped by folder or file.

**Why this way**: two snapshots do not necessarily share ids, so pairs are matched by their **two
paths**, which is what the lens measures. With the lens on only one side there is no comparison: the
report stops, says which side is unmeasured and leaves `delta` as `null`, because an invented zero
would turn "not looked at" into "clean". The cut is the same in the app, the CLI and the comment —and
the counts travel before truncation, so `+N` is true—. The `duplication-max` rule does not go in: the
ADR makes it conditional on usage asking for it, and no one has asked yet.

**Verified**: the whole suite is green at **179 files and 1554 tests**. New tests cover the diff (pair
with a changed id, new pair, pair drifting apart, pair coming closer, pair disappearing, lens on one
side only and no lens), the CLI report, the Changes section, the MCP query and the PR comment.
Typecheck, lint, `lint:types`, `check:action` and the site built.

**Verdict**: done. M71 closes the duplication chain.
