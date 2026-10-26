---
title: Using CodArch and how it is built
date: "2026-10-26"
category: docs
verdict: adr
---

**What it was**: the sidebar had a single "The product" block mixing the roadmap, the model and the map design with the rules and the MCP. There were no pages for installation, getting started, the web app, the desktop app or the action, and the home page described the web app as if it analysed on its own in the browser.

**What changed**: two blocks. **Using CodArch** (`section: producto`, pages in `docs/usar/`) and **How it is built** (`section: construir`, with the ADRs and the guide). New pages for getting started, web app, desktop, GitHub Action and FAQ, with their English twin. The home page and the README tell the three paths: CLI + web app (`npm i -g codarch`, opened with `codarch serve`), the web app alone with Docker and the desktop installer.

**Verdict**: [ADR 0080](../../adr/0071-0080/0080-usar-y-construir.md). The installation, CLI and updates pages are still missing, as are the screenshots marked as pending.
