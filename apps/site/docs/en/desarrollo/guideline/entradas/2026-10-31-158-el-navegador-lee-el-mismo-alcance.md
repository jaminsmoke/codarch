---
title: "The browser reads the same scope"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: the browser reader skipped directories **by name** —`dist`, `build`, `out`, `target`,
`.venv` and a few more— on top of the internal ones. The CLI walker only skips `node_modules`, `.git`
and `.codarch`, and leaves the rest to `.gitignore` and the project's `ignore`. A repo that tracks
`build/generated.ts` without ignoring it entered the CLI map and not the browser's. Worse: the reader
**did not read `.gitignore` files**, so the analyser could not apply the project scope even with the
files in memory. The parity tests used explicit file lists and did not see it.

**What changes**: `packages/parsers/src/scope.ts` defines the single list of internal directories
—`node_modules`, `.git`, `.codarch`— and the walker and the browser reader share it. The reader drops
its own name list, reads `.gitignore` files as one more configuration file and the analyser applies the
rules. The 20,000-file limit still aborts with an error: there is never a partial snapshot with a valid
checksum.

**Why this way**: scope is decided by the project, not by the app analysing it. A name like `build` does
not mean the same in every repo, and having the browser skip it turned an optimisation into a second
truth. Sharing the list and reading `.gitignore` is what makes the browser checksum match the CLI's
without `--no-git` (ADR 0038, ADR 0103). The cost is reading the occasional heavy directory; the limit
and the explicit error are the net.

**Verified**: new reader test with a tracked `build/generated.ts` and an `ignored/secret.ts` with its
rule in `.gitignore`: the reader reads both, the analyser drops the ignored one and the browser snapshot
gives the same checksum as the CLI (`--no-git`) with two code files. Whole suite green (**175 files and
1511 tests**), typecheck and lint clean and the site's 287 pages.

**Verdict**: fix. M73 closes the scope; M74 remains so the app compares code and history.
