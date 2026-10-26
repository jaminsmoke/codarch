---
title: Three installations, three places for preferences
date: "2026-10-24"
category: chore
verdict: adr
---

**What it is**: writing down where everything lives in the three ways of installing CodArch —npm,
Docker and desktop— and why the installation folder stores no state.

**Why**: there were reasonable doubts. Whether the desktop app should keep its config in the
installation folder, whether Docker could keep it in a volume, and whether plugins and addons are
installed into the app or into the repository.

**What was decided**: the project always lives in its repo (`.codarch.yml`, `.codarch/`,
`.codarch-history/`, `plugins/` and `addons/`). Preferences, enabled plugins and the last root belong
to the machine: `localStorage` on the web and Electron's profile on the desktop. The installation
folder only holds code because updates replace it. Docker has no state and no config volume: the repo
is mounted read-only and the chain ledger, which is a cache, is computed and returned even when it
cannot be written. Plugins are repo code compiled into the build (ADR 0028); addons are declarative
and work in all three. Installing a plugin into the app does not exist in v1 and would need loading
external code in a sandbox plus its own ADR.

**Verdict**: [ADR 0053](../../adr/0051-0060/0053-la-configuracion-no-se-mezcla.md), no open
phase; it is delivery architecture.
