---
title: "`.codarch` is not the workshop"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: this repo's `.codarch/` folder was being used as a workshop. Next to the snapshot, the

lint and the preferences —what the program itself leaves behind when analysing this very repository—

there had ended up codemod scripts, probes and test captures: `cx.mjs`, `cx-all.mjs`, `cx-fn.mjs` at the

root and a `tmp/` folder with a file split, probes and logs. None of that is product output. It is

development code in the place where the product keeps its artifacts, and since the folder is ignored,

the mistake never showed in a `git status`.**What changes**: the whole workshop is removed: the three codemods, the `tmp/` folder, the package
copies and tarballs in `cs/` (137 MB), the TypeScript comparisons in `parity/`, the Go and C# demo
repos, the development server logs, the analysis round folders (`compare-round`, `diff-after`,
`snapshot-round`, `shell-round`…), `map.html`, the hand-made captures, the old `lint.json` and the
`shots/` folder of working captures. The rule is written into `AGENTS.md`: `.codarch/` belongs to the
product, not to development, and no code, tests or scripts are written there, not even temporary
ones. If a job needs a scratch file, it does not live inside the tree being analysed. And
`escritorio.md` now states the exact list —nine files— of what the product writes there, so it is
clear what is output and what is a leftover to delete.

**Why this way**: `.codarch/` is the product's configuration and output —this repo's snapshot and

lint, which are also what the app and the MCP read in manual testing—. Mixing our own code in there

does two kinds of damage: it dirties the boundary the product promises, and it blurs what came out of

the analysis and what was written by hand. A scratch file in the analysed tree also leaks into the map

itself.**Verified**: `ls -la .codarch/` shows nine files and no folder —`snapshot.cc.json`,
`rest.cc.json`, `head-report.json`, `report.json`, `chains.json`, `preferences.json`,
`parse-cache.json`, `lint.cc.json` and `scopes.json`— which is exactly what the product writes. A
`find` for `.mjs`, `.ts`, `.js`, `.pid` and `.log` returns nothing. Lint with no messages, a clean
typecheck, the full suite and `site:build` green.

**Verdict**: fix.
