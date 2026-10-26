---
title: The tool dock
date: "2026-10-26"
category: feature
verdict: adr
---

**What it was**: the left panel was called **rail** in the markup and the CSS, while on the other side the inspector's dock already had an activity bar with a name of its own; the settings gear lived in the header, between the open-repository button and the views menu, competing with what really belongs to the open project; and the panel always took its 258 px, with no way to fold it.

**What changed**: the rail is now called **toolbar** and gets a dock of its own, mirroring the inspector's: the 44 px bar on the left —in the frame's colour— and the sheet next to it. The map icon folds the sheet and leaves the map full screen; the state is remembered between visits like a section's, and with the sheet folded the dock is 44 px with the strip still in sight. The settings gear moves to the foot of the bar, apart from the tools and marked while the dialog is open: the header keeps what belongs to the project. Settings do not change their API (`settingsOpen`/`setSettingsOpen`). Tools are a list (`TOOL_ENTRIES`), so adding one is an entry and its sheet.

**Numbers**: the shell grid becomes `auto minmax(0,1fr) 346px` —the left track is measured by the dock, 44 + 258— and the sheet has a fixed width (258, 226 below 1180) so long text does not stretch the dock. The `.rail-settings` CSS goes away, unused by any component. Checked in the served app: at 1440 the dock is 302 and the map 652; folded, the dock is 44 and the map 910, and it stays folded after a reload; at 1000 the dock is 270 and the inspector stacks; at 711 the bar lies down into a 44 px row with Settings at the far right; the gear opens the dialog with its icon marked.

**Verdict**: [ADR 0083](../../adr/0081-0090/0083-el-dock-de-herramientas.md), done. The captures that show the gear in the header and the rail are still to be redone.
