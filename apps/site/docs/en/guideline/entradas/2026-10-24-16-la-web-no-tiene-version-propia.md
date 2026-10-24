---
title: The web app has no version of its own
date: "2026-10-24"
category: chore
verdict: arreglo
---

**What it is**: the version number coming from the product in the web app too, with nothing to bump
separately, and `npm run version` checking it.

**Why**: the web said "web" when there was no server, and it was not written down whether it had a
version of its own. Bumping the product to `0.3.2` left the doubt of whether `apps/web` had to be
touched as well.

**What changed**: the web shows the version the CLI serves and, without a server, `PRODUCT_VERSION`
(the manifest generated from `versions.json`). `apps/web`, `apps/site` and `packages/*` stay at
`0.0.0` because they are not published, and the version checker fails if any of them takes a version
of its own.

**Verdict**: **fix**, within
[ADR 0041](../../../adr/0041-0050/0041-cada-version-una-vez.md).
