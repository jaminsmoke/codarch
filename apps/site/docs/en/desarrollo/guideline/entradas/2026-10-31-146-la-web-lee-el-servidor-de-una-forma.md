---
title: "The web reads the server one way"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `apps/web/src/App.tsx` is the most touched file in the repository —683 lines and 52
commits— and reading what the local server serves was written twice: once in `session.ts`
(`bootFromServer`) and once inside the component (`refreshFromServer`), the one that runs after switching
folders. They started the same and no longer were: boot asked for the HEAD report and the served version,
while the refresh asked for `data/report.json` —a pull request's, not the repo's— and left the version
alone. Two hand-rolled `fetch` calls with their JSON and error handling were repeated too (`POST
/api/root` and `POST /api/watch`), plus a second copy of "open a link": `loadFromUrl` next to
`bootFromUrl`.

**What changes**: one way of doing each thing.

| Piece | What it does now |
|---|---|
| `session.loadServedProject` | reads snapshot, rest, lint, HEAD report and addons; boot and refresh both use it |
| `server-control.selectRoot` / `setWatch` | the server's two controls, with the reason the server gives |
| `App.loadFromUrl` | hands over to `runBoot`: a link opens the same at start-up and by hand |
| `sessionHandlers` | the session contract is defined once, used by boot, refresh and live |

`loadServedProject` accepts what is already read (`meta`, `served`) so boot does not ask for the same twice,
and `preserveView` so turning live on brings the map up to date without closing the open panel.

**Why this way**: two copies of one read do not break together, they drift. Switching folder now shows the
same report as start-up and live (ADR 0075) and the version the CLI serves shows up after changing root
too. The file barely shrinks —683 down to 667 lines— because the session contract became explicit, but
each job lives in one place.

**A bug that falls out of unifying**: `bootFromUrl` set the mode to "local" even when loading failed. With
the link loaded from the menu that lit up the live button with no server behind it. Now, if nothing was
loaded, the mode stays as it was, and the test pins it down.

**Verified**: 171 files and **1469 tests** green (were 1456), lint silent and typecheck clean. The six
cases for the server controls cover what is sent, what comes back and the three failures —the server's
reason, a body with no error, and no response—; the seven for the refresh cover which artifact is read,
which report with and without a server, the no-snapshot case and both `preserveView`/preloaded modes.

**Verdict**: fix.
