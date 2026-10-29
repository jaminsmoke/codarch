---
title: "The rest, measured"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) decided that what is not code gets its own snapshot, but the analysis did not measure it yet: the walk filtered by extension and anything that was not code reached nowhere.

**What changes**: the walk is split in **one single pass** (`walkCodeAndRest`): code follows its usual path and the rest is measured without a parser in `packages/parsers/src/rest.ts` —size, lines when it is text and each document's links. That feeds `buildRestSnapshot`: a cc.json 2.x with `bytes` (and `loc` when there is text), the `rest` lens holding each file's `kind` and the document-to-document edges, with its own checksum. On this repository that is 564 files —449 documents, 54 configuration files, 38 assets and 23 "other"— and 462 links between documents; code accounts for 493.

**Why like this**: the kind is not guessed from the folder but from the name and the extension, and whatever matches no rule lands in `other` instead of disappearing: the previous map lied precisely by omission. Lockfiles are `asset` and not configuration, because nobody edits them by hand. The bytes of a text file are computed in the module itself and not with `TextEncoder`, so the CLI and the browser measure the same thing.

**What is missing**: `analyze` and `serve` writing `.codarch/rest.cc.json`, the `El resto` tab with its blocks in the rail, the ficha of a file that is not code and, in its own ADR, the rules of the rest. The new test checks that changing a document moves the rest checksum and **not** the code one.

**Verdict**: phase under way.
