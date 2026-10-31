---
title: "The rest sheet is not built"
date: "2026-10-31"
category: "removed"
verdict: "arreglo"
---

**What it was**: M64 asked for a sheet of its own for a file that is not code, and another for the
folder holding the rest. A rest file already reads with the common sheet: header, metrics without risk
and its links between documents. The folder, on the rest map, uses the same sheet as code.

**What changes**: the box is cancelled in ADR 0093's roadmap. M64 keeps what is really missing: the
strata by `kind` in the rail and the rest's rules, which need their own ADR.

**Why this way**: there are no symbols, members, code or chain to show, so a sheet of its own would be
the common one with extra sections hidden. The problem was not the sheet but the content that already
reads. And what needs fixing lives in the sheets we already have, not in a fourth one for documents.

**Verified**: `site:build` with 287 pages and the site suite green.

**Verdict**: fix. The rest sheet is cancelled; the strata by kind and the rest's rules remain.
