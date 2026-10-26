---
title: Publication, in its channel
date: "2026-10-23"
category: docs
verdict: arreglo
---

**What it was**: on GitHub only the desktop release was visible. The CLI looked unpublished and the
site had no release, even though the CLI lives on npm and the site on Pages.

**What was done**: the README says where each piece is and the desktop release links to the site,
npm and the action. The map's web app stays inside the CLI; the package is not duplicated and no
release is invented for the site.

**Why**: each piece has its channel. A release with installers is not the same as a Pages
deployment or an npm package.

**Decision**: [ADR 0032](../../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.md) and
[ADR 0034](../../adr/0031-0040/0034-la-web-del-proyecto.md). It changes neither the product nor the
checksum.

**Verdict**: **fix**, inside M23.
