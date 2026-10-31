---
title: "Three historical phases close"
date: "2026-10-31"
category: "docs"
verdict: "arreglo"
---

**What it was**: three phases whose work no longer held up. **M24** (SQLite index) was still "not
started" on a premise time undid: it would happen "when the number of documents justifies querying",
and today there are 554 documents, but Pagefind indexes the site at build time and markdown is still the
source: a database would only add an artifact to regenerate. **M31** asked to translate "the 50 ADRs";
there are 103 now, they are construction documents, and the product docs and the guide have long been
bilingual. **M34** had three open boxes the code already honoured: scope anchoring with its differential
test (ADR 0089), the root in the project band and the window title, and a watch that pauses from
Settings.

**What changes**: M24 is discarded, with its reason in ADR 0036's roadmap and its steps kept as a record
of what reopening would take. M31 and M34 close in their roadmaps (0046 and 0050), boxes ticked with the
evidence beside them. The roadmap index and the state in `AGENTS.md` say the same: M23, M49 and M63–M66
remain open.

**Why this way**: a phase waiting for a need that never arrived takes a roadmap row and makes you wonder
whether something is missing. A box fulfilled in another phase does not close itself. The roadmap is the
index of what is open, not an archive of intentions.

**Verified**: 554 documents under `docs/` (848 KB of ADRs and 937 KB of guide); the `watch` block in
`settings/sections.tsx` with `live` / `stop`, and the project band showing the snapshot's source; ADR
0089's differential test and per-scope caches. Site suite green and `site:build` with 287 pages.

**Verdict**: fix. M24 is discarded; M31 and M34 close.
