---
title: The docs name five languages, and M61 closes
date: "2026-10-28"
category: docs
verdict: fase
---

**What it was**: the analysis already understood TS/JS, Java, Python, Go and C#, but the documentation still promised a TypeScript/JavaScript product. `AGENTS.md` declared v1 that way, the READMEs said "analyses a TypeScript/JavaScript repository", the `analyze` help drew only Java and Python, and the `codarch analyze` page did not say which languages it reads: whoever arrived with a Go repo had to guess.

**What it is**: the usage pages name the five languages and, above all, say **what an import points at in each one**, which is where the map is won or lost. `codarch analyze` gains a "What it analyses" section with the extension table and each language's resolution —modules and aliases in TS/JS, the `a/b/C.java` file by suffix in Java, the module or the `__init__.py` package in Python, the whole package with the `go.mod` prefix in Go, and the files that declare the `namespace` in C#—, plus the clarification that Rust, `.wasm` and `.node` are only measured for the migration lens. The FAQ gains the "Which languages does it understand?" question, which is the one anyone asking tries the tool with their repository, and first steps says it at the first analysis. `model.md` shows the real pipeline —the parser is chosen by extension and the cache is signed with its name— instead of v1's `TypeScriptParser.parse`.

**Why this way**: the migration lens is still JS/TS → Rust, and the docs say so in the same paragraph that names the five languages. Keeping the two apart matters: a Java file is a node on the map with metrics and edges, but it has no state, debt or crossings, and promising otherwise would have changed the meaning of a lens that is already published.

**What is missing**: nothing of M61.

**Verdict**: M61 is **closed**. The five languages are analysed, drawn and documented; what remains open in the product is M23, M31, M34 and M49.
