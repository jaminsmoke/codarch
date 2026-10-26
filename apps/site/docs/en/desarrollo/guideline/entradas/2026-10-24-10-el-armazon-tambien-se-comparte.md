---
title: The shell is shared too
date: "2026-10-24"
category: refactor
verdict: fase
---

**What it is**: taking out of the two `App.tsx` files what was identical —header, sidebar, stage,
inspector and settings— into an `AppShell` in `@codarch/ui`, and moving into the hook the state both
apps computed on their own.

**Why**: after M33 the state was already shared, but the markup was still duplicated: every change
to the sidebar or the map footer had to be made twice. On top of that, things like the selected
file, the symbols, the plugin views, the search or the `/` shortcut were repeated word for word.

**What changed**: `useCodarchApp` now computes the file and its migration, the symbols, the metrics,
the plugin views with their context, the search, `selectPath`, the settings options and the view
state shared by the URL and the saved views (`applyView`). It also loads a snapshot with its report
(`abrirSnapshot`/`abrirReporte`) and stores it as the project, so opening a file, dropping one,
loading a URL or reading a folder with `.codarch/` no longer repeat the same sequence. `AppShell`
paints the whole shell and each app passes its own pieces through slots: the header buttons, the
demo notice, the drag hint, the cancel button and the settings already mounted. The web app keeps
its startup (server, URL, demo) and the desktop keeps its own (`.codarch/`, native menu).

The `App.tsx` files drop to 865 lines (web) and 162 (desktop), and `AppShell` takes 503; before they
were 1565 and 762 with the markup repeated.

**Verdict**: **phase M33**, in the roadmap of
[ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md).
