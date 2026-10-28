---
title: Go joins the map, and one import is several edges
date: "2026-10-28"
category: feature
verdict: fase
---

**What it was**: the map looked at TS/JS and, since this week, Java and Python. A Go repository looked almost empty: its files did not exist for the walk, there were no edges and there was no complexity.

**What it is**: Go goes in whole. A `.go` file is a node with `loc`, `rloc`, `functions`, `maxComplexity` and `maxFunctionLength`; with its symbols —functions, methods with a receiver, a `struct` as a class, an `interface` as an interface, any other declared type as a type, and the package's `const`s and `var`s, hashing the value so a rename does not move identity—; with its members, which are the `struct`'s fields; and with its `import`s as edges. Here is where it differs from the other languages, and it shapes everything: **Go imports packages, not files**, so an import stops being one edge and becomes as many as the target folder has `.go` files, ordered by path. It all comes from a single walk, and there are two parsers —the CLI's native one and the browser's `.wasm`— sharing the code: the checksum matches.

**Why this way**: the module name does not live in each file but in the root `go.mod`, so it is read once per analysis, before measuring anything, and not once per import. With that prefix, an import starting with it is a folder of the repository, and if the folder is missing the import is **broken** —Go would reject it— and is counted with its line. An import that does not start with the module comes from outside: the standard library has no dot in its first segment (`fmt`, `net/http`), so it counts as builtin, and the rest are dependencies. Without a readable `go.mod` the import's suffix is tried, most specific first, which is what works for a flat project; in exchange, an external import may match a repository folder with the same name. Complexity counts `if`, `for`, every `case` —`type switch` and `select` included—, `&&` and `||`; `default` does not, because it opens no path, and an `else if` is a nested `if` and counts on its own. An embedded field declares no name and is not a member; `_` and `.` are not aliases and do not enter as a name.

**What is missing**: C#, and the usage docs, which still promise TS/JS.

**Verdict**: Go is done inside **M61**. The checksum of a TypeScript/JavaScript repository still does not move, and a Go repository's is the same in the CLI and in the browser.
