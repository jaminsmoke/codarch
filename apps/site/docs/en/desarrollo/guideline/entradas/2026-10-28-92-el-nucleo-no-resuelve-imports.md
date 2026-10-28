---
title: The analysis core stops resolving imports
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**What it was**: `analyzeFiles` was, according to the map itself, the second hottest block in the repository: 440 lines, five levels of nesting and a maximum complexity of **72**. Inside it lived, mixed with the file walk, the four ways of resolving an import —the TS/JS module, the Java and Python path, the Go package and the C# namespace— so every new language fattened the same function.

**What it is**: the walk says *which file this is* and `resolveImports` says *where each import points*, with one function per target family: `linkModule`, `linkPath`, `linkPackage`, `linkTargets` and `linkInternal`. What is not an edge —external, platform, broken— accumulates in an `ImportTally` and comes back in one piece. The C# `using` is still closed at the end, which is the only thing that cannot be decided file by file.

**Why this way**: the order of the checks is the result, not a detail: a Java import that matches its file is an edge and a TS/JS one that does not match is a dependency. Split by family, each rule lives in one place and can be read without recalling the other three. And a `?raw`, `?url` or `?inline` stops being a broken import —it is a read of the file, not a link to the module—, which was the only false edge the map reported in the project's own site.

**How it is checked**: the repository's own map, before and after, still holds 386 files, 874 edges and 51.3k lines. The only thing that moves is what was meant to move: `analyzeFiles` complexity drops from **72 to 47** and the unresolved imports go from 1 to **0** —the site's `?raw`—, measured with `codarch inspect --metric maxComplexity` and with the map's counter. `packages/parsers/test/analyze.test.ts` gains the case of the four families in a single analysis and `resolve.test.ts` the one about bundler queries.

**Verdict**: refactor closed. What is left of the function is the walk, which is what it did.
