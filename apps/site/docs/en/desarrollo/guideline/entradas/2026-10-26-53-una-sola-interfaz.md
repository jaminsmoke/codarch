---
title: One single interface
date: "2026-10-26"
category: refactor
verdict: adr
---

**What it was**: three interfaces. The web app, the desktop app —sharing `packages/ui`— and a hand-written HTML viewer in `packages/render/src`: some 1,660 lines with its own CSS, its own inspector and its own JavaScript. That third one was what `codarch analyze` left in `.codarch/map.html`, what `codarch render` produced and what the GitHub Action published as the PR artifact. It had no Changes, no Rules and never talked to `serve`. Every improvement to the real app meant deciding whether to copy it there, and it almost never was: the PR artifact showed a product that no longer existed.

**What changed**: the web app is the only interface. `html.ts`, `client.js` and `styles.css` are gone, and `renderHtml` no longer exists as an API. `codarch analyze` writes only the snapshot and its summary; drawing is the app's job. `codarch render <cc.json> -o <folder>` copies the real build and leaves `data/snapshot.cc.json` next to it, so the result is a static site you can serve from Pages, `npx serve` or `codarch serve` itself, with no node and no CLI. The Action publishes that same folder and its `map` output points at the head's `index.html`.

**Numbers**: about 1,660 lines fewer, two viewer tests gone and two CLI build assets (`styles.css`, `client.js`) no longer copied. Neither `cc.json`, nor the checksum, nor `report.json` change. `codarch render` changes its output: an `.html` becomes a directory.

**Verdict**: [ADR 0073](../../adr/0071-0080/0073-una-sola-interfaz.md), done. One open line: the MCP is missing queries the CLI already has, and they get added as tools, not views.
