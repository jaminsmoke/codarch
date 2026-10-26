---
title: The action returns to the monorepo
date: "2026-10-25"
category: chore
verdict: adr
---

**What it was**: `jaminsmoke/codarch-action`, a separate public repo with a copy of `action.yml`, the comment renderer and the README. It existed because the monorepo was private and GitHub cannot resolve an action from a private repo into another repo. Syncing it was the last manual step of every CLI release.

**What changed**: the monorepo has been public since 2026-10-22, so the copy is not needed. The action is used by subpath: `jaminsmoke/codarch/apps/github-action@v1`. The `v1` tag and the CLI pin move in the same workflow that publishes to npm; `sync:action` and `.codarch/action-repo` are gone. The old repo is **archived** with a notice, not deleted, so old `uses` keep working.

**Numbers**: from two repos and two copies to one. One push, one pin and one tag. The Marketplace listing is lost, since it requires `action.yml` at the repo root; if it ever matters, a root `action.yml` can delegate without bringing the separate repo back.

**Verdict**: [ADR 0066](../../adr/0061-0070/0066-la-accion-vuelve-al-monorepo.md), done. `codarch-action-smoke` already points to the subpath.
