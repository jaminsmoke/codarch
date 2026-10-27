---
title: The parent lists its scopes
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: analyzing the root parsed again everything a subfolder's `.codarch/` had already parsed, and nothing said which scopes were below it or whether they were up to date ([ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md)).

**What it is**: `codarch analyze` records in `.codarch/scopes.json` which `.codarch/` folders it saw below —checksum, commit, files and the date of their latest snapshot— and the `alcances` line says how many there are. A new command, `codarch scopes [path] [--json]`, lists them with their state: **up to date**, **analyzed again** (its checksum changed since the parent saw it), **new**, **no longer there**, and the **newer files** warning when the child's snapshot is older than some file in its folder.

**Why this way**: the parent **reads downwards and does not write** into a child's `.codarch/`: each scope is written by whoever analyzes it, and a parent rewriting its children would force its `.codarch.yml` on them. The register is a derived index, not a proof: it can be deleted and it prunes itself on the next analysis. The search uses the same walk as the analysis —`.gitignore` and the scope in `.codarch.yml`— so `samples/`, which is ignored and has its own `.codarch/`, does not count as a scope of the parent. An unreadable snapshot is skipped: the parent's state does not fall over a broken child.

**How it is checked**: `apps/cli/test/scopes.test.ts` analyzes a parent with a real child and covers the register, the ignored scope, the broken snapshot, `node_modules`, the newer-files warning, the checksum change and the "new" state. In this repo, analyzing `packages/ui` as a scope makes the root say `1 anidados`, `codarch scopes` shows it "up to date" and, once its `.codarch/` is deleted, it becomes "no longer there" until the next analysis prunes the register.

**Verdict**: ADR 0089, inside M34. Reusing the child's parse is still open, gated on measuring it first.
