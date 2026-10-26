---
title: The diff, when the file opens
date: "2026-10-26"
category: feature
verdict: fase
---

**What it was**: the **Files** row gave one number, the `rloc` delta, and that is not enough to know what was touched. The first attempt put the partials in the row itself —`+38 −27 +11`— and they do not fit: the right column is a few dozen pixels wide, the middle number gets lost, and with a diff open the whole list stretched to 547 px inside a 246 px panel, so the total fell outside and could not be seen.

**What changed**: the row carries **one** total again —the `rloc` delta, or whichever metric moved most— and the expandable gains a **Diffs** section next to **Symbols**. There live the file's partials and the code view as git draws it: two line-number columns, the `+` and `−` inside its line, three lines of context and `⋯` where it skips. The diff does not travel in the report: it is requested on open, and the platform that owns the repo serves it —`/api/diff` in `codarch serve`, `codarch:read-diff` in the desktop app— comparing the working tree with `git show HEAD:<path>`.

**Numbers**: the report goes to 1.4 because every symbol carries its `addedLines` and `removedLines`, measured when both texts are at hand; from two loose `cc.json` they stay `null`. The diff is capped at a million cells and at 600 rows for a new or deleted file, and it says so. The list column is `minmax(0, 1fr)` again: the overflow is what was hiding the totals.

**Verdict**: [ADR 0077](../../adr/0071-0080/0077-el-diff-al-abrir-el-fichero.md), done. Checked in the served app: a modified file opens with its `Symbols` and its `Diffs +29 −2`, the code with both numberings, and the panel no longer overflows; the three cases —new, modified, deleted— each have their reading, and six tests pin the diff and its paths.
