---
title: Three tabs and goodbye to the PR name
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: four tabs. Lenses explained the risk of the selected file and Rules counted what the
change breaks, so the same question —*what is wrong with this file and what breaks?*— meant jumping
from one to the other. The fourth one was called PR, for *pull request*, even though CodArch compares
snapshots and does not know whether a review is open.

**What changed**: the inspector is now **File · Rules · Changes**. Rules is a single read: the file on
top (risk with its signals and weights, domain rules, migration, symbols) and the change below (new,
existing and resolved, errors and warnings, source, hotspots). The Lenses tab is gone because its
content is now the first half of Rules. PR is now **Changes**: it is a snapshot diff, with git or
without it.

**Numbers**: three tabs instead of four. `tab=changes` is the canonical value in the URL and in saved
views; `tab=lenses` and `tab=pr` are still read and rewritten to the new name, so ticket links and old
views keep working. There is no new analysis and no change to `cc.json`.

**Verdict**: [ADR 0059](../../adr/0051-0060/0059-tres-pestanas.md), done. Its roadmap keeps remembering
the file section when the cell changes, plus the two things Rules already carried: filtering by
severity or source and showing configured rules that are not violated.
