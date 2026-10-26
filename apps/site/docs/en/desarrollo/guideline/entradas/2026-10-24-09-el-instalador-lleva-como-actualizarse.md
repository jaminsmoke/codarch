---
title: The installer carries how to update itself
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: CI checking, before publishing, that the installer carries `latest*.yml` and
`resources/app-update.yml`.

**Why**: `electron-updater` reads `resources/app-update.yml` **from the installed package** to know
which repository to look at. If it is missing, the update check fails and says so nowhere visible.
It happened: the instance installed here was still on `0.3.0-alpha.2` with `alpha.3` and `alpha.4`
published, because that installer did not carry the file. The **Updates** section in the settings
did show the new version and its link, but installing by itself was not possible.

**What changed**: `scripts/check-desktop-package.mjs` checks, on the folder electron-builder leaves,
that each unpacked app carries `app-update.yml` with provider, repository and cache folder, and that
there is a `latest*.yml`. The desktop workflow runs it after packaging on Windows and Linux, and it
is also available as `npm run check:desktop` to try it by hand. The app also warns on the console if
it starts without that file instead of failing silently.

**Verdict**: **fix**, inside
[ADR 0045](../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md) (M28).
