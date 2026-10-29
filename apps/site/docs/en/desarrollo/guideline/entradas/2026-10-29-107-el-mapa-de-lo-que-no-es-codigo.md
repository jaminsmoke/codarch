---
title: "The map of what is not code"
date: "2026-10-29"
category: "feature"
verdict: "adr"
---

**What it was**: the map counts code and only code. The walk accepts twelve extensions, so documents, configuration and assets do not exist in the model: not in the tree, not in the metrics, not in the checksum. In this repository that leaves out 443 documents and 29 configuration files, half of the project.

**What changes**: [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) opens phase **M64** with a second snapshot, `.codarch/rest.cc.json`, written by the same `analyze` pass: cc.json 2.x with its own checksum, area in bytes and a `rest` lens holding each file's kind. The stage gains the `El resto` tab, and the code snapshot changes neither in content nor in checksum.

**Why like this**: the cut had to be in the artifact, not in the painting. A lens inside the code snapshot would have put documents in the PR diff, in the layer rules and in the checksum, which today means "this code"; filtering them out while drawing undoes none of that. And everything the walk finds gets a kind —`doc`, `config`, `asset` or `other`—: what matches no rule stays in `other` instead of disappearing, which is what made the map lie by omission.

**What is missing**: all of M64. The walk split in one pass, the snapshot with its determinism test, `analyze` and `serve` writing the second file, the tab and its blocks in the rail, the ficha of a file that is not code and, in its own ADR, the rules of the rest: broken links, orphans, frontmatter and the language twin declared in `.codarch.yml`.

**Verdict**: the decision is taken.
