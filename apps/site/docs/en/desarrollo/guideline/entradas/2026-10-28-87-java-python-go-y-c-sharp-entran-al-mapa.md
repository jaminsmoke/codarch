---
title: Java, Python, Go and C# join the map
date: "2026-10-28"
category: feature
verdict: adr
---

**What it was**: v1 was declared TypeScript/JavaScript and it was followed to the letter. The walk only looks for those extensions, the analysis asks for one parser and `languageForPath` drops whatever is not a language of the migration lens. A Java, Python, Go or C# repository looked almost empty: no nodes, no edges and no complexity, which is exactly what the map is meant to show. Rust was the half exception —LOC/RLOC by hand, no tree— and the rest did not exist.

**What it is**: [ADR 0090](../../adr/0081-0090/0090-mas-lenguajes-que-ts-y-js.md) decides that **Java, Python, Go and C#** enter with the whole analysis: file metrics, symbols with their complexity, class members where the language has them and imports resolved into edges. The important part is what does **not** change: `cc.json` stays as it is, with no new `language` field, because a file in these languages is a node like any other and the language is derived from the extension. The migration lens is untouched as well: it keeps counting the move from JS/TS to Rust, and a `.java` has no migration status because it takes no part in it.

**Why this way**: the analysis now receives a list of parsers and picks by extension, and the cache signs **each entry** with the parser that produced it, so one grammar cannot swallow another's parse. Resolution does not read `pom.xml`, `build.gradle` or `go.mod` to guess roots: looking for the `a/b/C.java` suffix works the same for Maven, Gradle and a flat project, and in Go the `go.mod` is only needed for the module prefix. Wildcards and aliases add no edges, and whatever does not resolve is counted with its line, as today. The invariant that closes the decision is the other side: a TypeScript/JavaScript-only repository has to produce the same `cc.json` byte for byte.

**What is missing**: phase **M61**, in five steps —the parser by extension and the cache per entry; Java; Python; Go; C#— and the docs that still promise only TS/JS. Each language's tests and the untouched-checksum test are the gate of every step.

**Verdict**: ADR 0090, inside M61. The decision is made; the code starts with Java, which is what brought it.
