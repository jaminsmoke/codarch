---
title: The header without the demo, with the link inside
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: removing the demo from the web app and moving **Copy link** into the **Open** menu,
so the web and desktop headers actually look alike.

**Why**: the demo was a leftover from when there was neither a server nor `.codarch/`: it loaded a
sample snapshot and took a button. And the view link is one more "open" action, not a fixed button
next to the settings.

**What changed**: the **Demo** button, its boot load and the demo notice are gone; when there is no
server and no saved project, the app shows the empty state and asks for a `cc.json`. **Copy view
link** now lives in the **Open** menu and, after copying, the menu stays open with **Link copied** so
it shows. The web **Live** indicator stays: it tells that the server re-analyzes and the map
refreshes on its own.

**Verdict**: an interface change; it needs no ADR. Watching in the desktop app (its equivalent
indicator) comes with M34.
