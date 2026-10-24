---
title: The web carries the product version
date: "2026-10-24"
category: chore
verdict: arreglo
---

**What it is**: the web saying the same version as the desktop, with no separate number to bump,
and `npm run version` checking it.

**Why**: the web said "web" when there was no server, and its `package.json` stayed at `0.0.0` even
though it is a product surface. Bumping the product to `0.3.2` left the doubt of whether `apps/web`
had to be touched as well.

**What changed**: `apps/web` carries the product version in its `package.json` and the checker
requires it just like the desktop's; the app shows the version the CLI serves or, without a server,
`PRODUCT_VERSION`. Internal packages and the site stay at `0.0.0`. How it is bumped now lives in
[ADR 0051](../../../adr/0051-0060/0051-la-version-se-sube-con-un-comando.md).

**Verdict**: **fix**, within
[ADR 0041](../../../adr/0041-0050/0041-cada-version-una-vez.md).
