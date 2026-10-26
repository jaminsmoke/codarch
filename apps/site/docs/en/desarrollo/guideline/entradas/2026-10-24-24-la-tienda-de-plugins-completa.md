---
title: The plugin store, complete
date: "2026-10-24"
category: feature
verdict: arreglo
---

**What it is**: the **Plugins** section in the settings showing the store at a glance —how many are
installed, how many are active and how many fail— and each plugin saying what it adds.

**Why**: the list already existed (title, version, description, switch), but the whole was not
visible and neither was what each plugin contributes, so the store looked like something else.

**What changed**: a summary on top ("1 plugin installed · 0 active on this machine"), a line per
plugin with its views and requirements (WebGL2, GPU) and a **Details** block with what it contributes
and the command to remove it from the repo (`codarch plugins remove <name>`). The summary is computed
by `summarizePlugins` and covered by tests.

The core stays the same: plugins are **repository code** compiled into the app; the store activates
them on this machine and the CLI installs them into the repo. A catalogue with runtime downloads
needs loading external code in a sandbox and its own ADR.

**Verdict**: fix for the M14 store, within ADR 0028 and ADR 0053.
