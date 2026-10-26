---
title: The documents, on the site
date: "2026-10-22"
category: docs
verdict: fase
---

**What it is**: the repo's documents being **read on the site** and not only on GitHub. Until then
the site had a landing page and a guide; the ADRs, the roadmap, the model and the rules stayed in
markdown.

**How**: one page per document, with the **menu**, the **page index** and the **neighbors**. Links
between documents no longer leave for the repo: they navigate on the site and without reloading.
**Mermaid diagrams** are drawn, and they only load on the page that brings them. Each view travels
in its own chunk: the landing page carries nobody's markdown.

**Along the way**: an entry that **waits** is no longer painted twice (it was in its day and in
Future with the same anchor) and the MCP says **nine** queries, not six.

**Verdict**: **phase M23**, done in the roadmap of
[ADR 0034](../../adr/0031-0040/0034-la-web-del-proyecto.md#hoja-de-ruta). The domain and the search
are still pending.
