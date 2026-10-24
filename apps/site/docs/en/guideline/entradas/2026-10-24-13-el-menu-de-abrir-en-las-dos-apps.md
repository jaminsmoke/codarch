---
title: The open menu, the same in both apps
date: "2026-10-24"
category: refactor
verdict: arreglo
---

**What it is**: the web and desktop apps opening things from the same **Open** menu in the header,
and the desktop app dropping "cc.json" and "report.json" as loose buttons.

**Why**: the M33 unification took the shell, but the header stayed out: the desktop still had three
buttons and the web had a dropdown. They were two ways of doing the same thing and one of them took
half the bar.

**What changed**: `OpenMenu` in `@codarch/ui` paints the dropdown (long and short label, closing on
choice) and each app passes its own options. The web keeps watch folder, folder with `.codarch`,
analyze in the browser, load by URL and cc.json file; the desktop has analyze folder, cc.json file
and JSON report. The settings gear stays at the end in both.

**Verdict**: an interface change; it needs no ADR.
