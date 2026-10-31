---
title: "The checksum is the code's"
date: "2026-10-31"
category: "feature"
verdict: "arreglo"
---

**What it was**: the checksum was MD5 of `{ files, lenses }`, and the metrics lens carries churn when
there is git (`number_of_commits`, `number_of_authors`). The same tree gave two hashes depending on
whether history was measured —measured in this repo: 626 files, two checksums—, so the browser was only
comparable to the CLI run with `--no-git` (ADR 0020). The diff also counted churn as a file change.

**What changes**: the lens enters the hash without the two history metrics, nor their descriptors or
types; nothing else is touched. The snapshot gains `meta.historyChecksum`, the MD5 of the measured
history values, and does not carry it when there is no git. The diff and the report skip those two
metrics: a PR does not change a file because its commit count went up.

**Why this way**: identity is the code, not what the clone knows about its history. It is the same rule
as chains (ADR 0026) and lint (ADR 0099): whatever depends on history or on installed tools gets its
own hash. Churn is not deleted because risk and heat use it; it just stops deciding whether two
snapshots are the same. Two snapshots of the same code with different heat share a checksum and differ
in `historyChecksum`; one without history is unmeasured, not at zero.

**Verified**: suite green (**174 files and 1510 tests**), typecheck and lint clean and the site's 287
pages. The new cases pin what matters: the same tree with and without git gives the same checksum —also
in a real repo with commits—, different history gives the same checksum and another
`historyChecksum`, a snapshot without history does not have it, and a diff with only different churn
comes out empty. The lens auditor finally passes its checksum check. Snapshots that measured git change
their checksum once; the format does not bump its version.

**Verdict**: fix. M72 closes identity; M73 matches the browser's scope and M74 adjusts the comparison
in the app.
