---
title: "The folder cleans itself, and the names live in one registry"
date: "2026-10-31"
category: "feature"
verdict: "arreglo"
---

**What it was**: ADR 0100 gave the names a rule, but the folder had no owner. `snapshot.cc.json` showed up
in eleven files and `.codarch` in thirty, each package with its constant and each consumer with its copy;
`report.json` and `head-report.json` had the rule of which one wins written five times —MCP, `serve`, the
desktop app, the web app and the docs—. And nothing cleaned: a `lint.json` deleted by hand **came back**,
because an old script still wrote it and `analyze` never looked at what was left over. This repo had three
lint names at once and a `map.html` from a working copy.

**What changes**: [ADR 0101](../../adr/0101-0110/0101-la-carpeta-es-del-producto.md). The names move to a
**registry** in `@codarch/schema` —`CODARCH_ENTRIES`, with each file's role—, and the constants,
`codarchPath` and the list the clean-up recognises all come from there. `codarch analyze` and the desktop
app, after writing, **remove what they do not recognise** and say what they took, by name. Local state
—preferences, parse cache, chain ledger, scopes, rules cache, captures— is kept even when that pass did
not write it. And the two reports have a module: `report-store` declares what each one compares, who
writes it and that the working-tree one wins.

**Why this way**: a folder with no owner fills up, and a rule repeated in five places drifts. The
alternative —deleting everything not written by that pass— was simpler and worse: it took the chosen view
and forced a full parse on every analysis. `--out` is not cleaned because that folder was chosen by the
caller, and `serve` does not clean because it reanalyses on every save: cleaning belongs to the complete
pass.

**Verified**: in this repo, `codarch analyze .` leaves `.codarch/` at its nine files, with
`lint.repmod.json` from 525 measured files and no `lint.json` or `lint.cc.json`, and the warning says what
it removed. New tests for `sweepCodarch` (keeps what it knows, removes files and folders, does not create
the folder, sorted list), for `preferredReport` (precedence, unreadable file, deterministic write) and two
for `analyze` (cleans the repo and warns; leaves the `--out` folder alone). The desktop/`serve` parity test
now writes a real report: JSON the reader does not understand is no longer a valid fallback.

**Verdict**: fix.
