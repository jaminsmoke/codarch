---
title: Newlines are not code
date: "2026-10-26"
category: fix
verdict: adr
---

**What it was**: the Changes tab kept showing files nobody had touched, and the reason was not the tab. With `core.autocrlf=true` on Windows, `git archive` exports the commit with CRLF while the working tree was LF: the hash of each symbol's body includes the line endings, so the symbols lens saw changes where there was only a carriage return. The same happened with two same-name symbols in one file —two nested `listener`s, the constructor of two classes—: pairing kept only one and the other showed up as changed.

**What changed**: the analyser normalises CRLF to LF when reading a source file, in a single place, so it holds for disk, for the browser's memory and for the HEAD export. Same-name symbols are paired in order of appearance instead of through a map that loses duplicates.

**Numbers**: two lines of normalisation and a map that becomes a queue per name. Snapshots of a repo with CRLF change checksum once; the format and the model do not change. `rloc`, `loc` and symbol lines stay the same: the hashes are what change.

**Verdict**: [ADR 0076](../../adr/0071-0080/0076-las-lineas-no-son-codigo.md), done. On this repository the tab went from showing files like `Settings.tsx`, `preload.ts` or `watch.ts` that nobody touched to showing only the ones with real changes.
