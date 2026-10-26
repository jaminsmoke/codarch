---
title: Documentation and Development
date: "2026-10-26"
category: docs
verdict: adr
---

**What it was**: the two blocks from ADR 0080 shared `/docs/`, the sidebar, search and pagination; whoever came to install CodArch saw the ADRs in the sidebar, and the guide lived apart at `/guia/`.

**What changed**: two areas. **Documentation** (`/docs/`) is only the product; **Development** (`/desarrollo/`) brings together the roadmap, model, design, migration, ADRs and the guide (`/desarrollo/guia/`). Each area has its own sidebar and search filter, which search applies by default; the header is Home · Documentation · Development and the old addresses redirect. The two MCP pages are now one, and the web app, desktop app and first steps are explained screen by screen with screenshots.

**Verdict**: [ADR 0081](../../adr/0081-0090/0081-documentacion-y-desarrollo.md), which amends ADR 0080.
