---
title: "The MCP tools, one per subject"
date: "2026-10-31"
category: "chore"
verdict: "arreglo"
---

**What it was**: `apps/mcp/src/tools.ts` was **1808 lines** long and the longest file on the map: the

tools' contract, the map, migration, history, config, symbols, lint and the screenshot, all in one

place. Any change to one tool meant walking a file that talked about nine things.

**What changes**: the file is split into ten modules with one subject each —`types`, `map`,

`migration`, `history`, `config`, `symbols`, `analysis`, `lint`, `shot`— and two internals that are not

tools: `helpers` and `scope`. `tools.ts` becomes a fourteen-line surface: the server and the tests still

import from there and do not know which module holds what. A tool's type —its input and output

together— is declared once in `types.ts`, in the order the map is read, and the symbol chain stops

having its types outside where the other ones live.

**Why this way**: split by subject, not by size. A module called `history` that only holds history can

be read in one go; one called `tools` that holds everything cannot. The barrel keeps the boundary

consumers already used: the split is internal and does not change a single call.

**Verified**: `npm run lint` with no messages over 570 files, a clean typecheck and the full suite green

with the **43 MCP tests** untouched (162 files, 1395 tests). The 53 exported functions are still

exported; the ten internal helpers stop leaving through the barrel.

**Verdict**: fix.
