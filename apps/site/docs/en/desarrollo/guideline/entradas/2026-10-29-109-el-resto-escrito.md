---
title: "The rest, written"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) already measured what is not code, but the rest only lived in memory: `codarch analyze` still left a single artifact in `.codarch/` and the app had nowhere to read it from.

**What changes**: `writeRestSnapshot` (`packages/parsers/src/rest-store.ts`) writes `.codarch/rest.cc.json` with the same canonical serialisation as the code snapshot and a checksum gate: saving code does not rewrite a document map that has not changed. `analyze` writes it next to the snapshot and the summary gains a `resto` line with the path, the size, the files and the links. `serve` stores it in the repo's `.codarch/` on every pass and exposes it at `/data/rest.cc.json` **from that same pass's memory** —never by reading the file, so the two maps cannot drift apart on the server—, with a 204 when there is no rest, and its banner counts the files.

**Why like this**: the artifact is what separates the two audiences. The code one changes neither in content nor in checksum, and whatever compares code does not look at it: diff, rules, the action and MCP keep reading only `snapshot.cc.json`. The rest is one more map in `.codarch/`, ignored like the other one, and with its own verification: three new tests cover that a moved document changes the rest checksum and not the code one, that two passes leave the file byte-for-byte identical and that the server serves what it has just written.

**What is missing**: the web and the desktop loading the rest, the `El resto` tab with its blocks in the rail, the ficha of a file that is not code and, in its own ADR, the rules of the rest.

**Verdict**: phase under way.
