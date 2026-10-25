---
title: The update looks at the release, not the feed
date: "2026-10-25"
category: fix
verdict: arreglo
---

**What it was**: the installed app looked for its update metadata in
`releases/download/v1/latest-linux.yml` and got a 404. `electron-updater` resolves the tag in two ways: with
`allowPrerelease` on and a stable installed version it takes the **first entry** of the GitHub feed; otherwise
it asks for the latest release. The feed does not bring releases only: since the workflow moves the action's
`v1` tag, that bare tag without a version shows up first. The app asked for metadata there, where there is
none. Windows failed the same way with `latest.yml`; it was noticed on Linux first because that installer was
the brand new one.

**What changed**: the app no longer lets electron-updater guess the tag. On startup —and when pressing
**Update and restart**— it asks for the release list, drops drafts and tags without a version, takes the
highest one and pins the download base to `releases/download/v<version>`. The channel does not change:
`latest.yml` on Windows and `latest-linux.yml` on Linux, with the `.blockmap` files beside them, so the
differential update stays the same. If the list cannot be read, the automatic check is skipped and retried on
the next start instead of asking a wrong tag for metadata.

**Why not a one-liner**: turning `allowPrerelease` off also hid it today, because the repository's latest
release is the real one. But it left the app depending on what broke it —the order and content of a feed we do
not control— and took prerelease builds away. Asking and pinning the base removes the guess entirely, and the
result matches what the **Updates** section already showed, which always used this same list.

**Numbers**: one install-time fault that reached both platforms, zero changes to the release format, four new
cases in `apps/desktop/test/updates.test.ts` —including the feed that starts with `v1`— and nothing to touch in
`cc.json` or the checksum.

**Verdict**: fix, done. [ADR 0045](../../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md).
