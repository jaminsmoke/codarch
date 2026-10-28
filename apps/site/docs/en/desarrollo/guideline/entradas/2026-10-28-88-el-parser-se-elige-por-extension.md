---
title: The parser is picked by extension and the cache signs each entry
date: "2026-10-28"
category: refactor
verdict: fase
---

**What it was**: the analysis asked for **one** parser and applied it to everything `languageForPath` recognised, and the cache stored each file's `size:mtime` under an assumed parser: the same one for all of them. In `parse-cache.json` the parser name sat in the header, as if a scope could not hold more than one grammar.

**What it is**: the analysis receives a **list** and picks by extension, with the order of the list as the explicit tie-break; the walk covers the union of the parsers' extensions and the ones the migration lens measures. The cache signs **each entry** with the parser that produced it, and a hit requires both the parser and the version to match. The format goes up to 2, so the caches that were there are ignored and parsed once more.

**Why this way**: with more than one language, the file's version no longer says what measured it —two grammars may have seen the same `size:mtime`— and an entry from one language hitting in another would give nodes metrics that are not theirs. Signing the entry lets the cache keep travelling between scopes without contagion. The bridge and the migration debt are only measured when the language belongs to the lens, so a file in another language is a node with no migration status, which is what [ADR 0090](../../adr/0081-0090/0090-mas-lenguajes-que-ts-y-js.md) decides.

**What is missing**: the four languages of [ADR 0090](../../adr/0081-0090/0090-mas-lenguajes-que-ts-y-js.md) with their import resolution. Java comes first.

**Verdict**: the first step of **M61** is done. The checksum of a TypeScript/JavaScript repository does not move, and a test keeps watch over it.
