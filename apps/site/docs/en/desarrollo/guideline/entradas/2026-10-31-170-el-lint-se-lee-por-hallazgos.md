---
title: "Lint is read by findings; Rules leaves the code"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: the code sheet had a **Rules** section that mixed architecture violations, migration

debt and lint; in folder and project only lint remained, with the active-rule catalogue and the detected

systems. The sheet of a document or a config had no rules.

**What changes**: **Rules** leaves the file, folder and project sheets. **Lint** comes in: in the file,

the debt's weight in risk and the messages with their rule, line and text; in folder and project, the

findings grouped by rule. FFI crossings move to **Dependencies**. The active-rule catalogue and the

systems are no longer shown in the code view. Rules is reserved for docs and config: architecture

violations, once fixed, will be a subsection.

**Why this way**: an active rule is not a finding and does not say what to fix; the message is what can

be acted on. Architecture rules do not have a fixed model yet, and the catalogue is configuration, not

a code sheet.

**Verified**: full suite green with **183 files and 1567 tests**, clean typecheck, lint with **0

errors** —the previous warning in `packages/parsers/src/duplication.ts` remains— and `site:build` with

**289 pages**.

**Verdict**: done. M63 loses grouped rules; M64 keeps the docs and config rules, which are now in their

right place; the lint dot in the bar and the debt in `explain_module` remain open because they are

lint, not the catalogue.
