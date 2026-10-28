---
title: C# joins the map, and the namespace resolves at the end
date: "2026-10-28"
category: feature
verdict: fase
---

**What it was**: the map looked at TS/JS and, since this week, Java, Python and Go. A C# repository looked almost empty: its files did not exist for the walk, there were no edges and there was no complexity.

**What it is**: C# goes in whole. A `.cs` file is a node with `loc`, `rloc`, `functions`, `maxComplexity` and `maxFunctionLength`; with its symbols —`class`, `struct` and `record` as a class, `interface` as an interface, `enum` as an enum, `delegate` as a type, and methods and constructors as functions with their complexity—; with its members, which are fields, properties and the parameters of a `record`; and with its `using`s as edges. It comes from a single walk, and there are two parsers —the CLI's native one and the browser's `.wasm`— sharing the code: the checksum matches.

**Why this way**: C# imports neither files nor folders, it imports **namespaces**, and a file's namespace is not derived from its path the way Java's package is: the file declares it, as a block or file-scoped. That breaks the resolution the other languages use, which closes while measuring the file that writes the import: here nobody knows who declares `Acme.Billing` until the last file has been measured. So the `using` is noted and closed at the end, with the map of declared namespaces in hand. Three questions, in order: if some file declares the namespace, they are edges —one per file, because `using Acme.Billing;` gives you everything in that namespace, not a specific file—; if the repository declares its root but not the namespace (`using Acme.Gone` with `Acme.Billing` inside), the import is broken and is counted with its line; if neither, `System…` and `Microsoft…` are platform and the rest are dependencies. A `using` of the namespace a file itself declares is not an edge to itself: it is normal in C#, and counting it as a cycle would invent one. An alias (`using Json = …;`) and a `using static` are not namespace dependencies and are not emitted as imports: counting them as outside would lie in the number. Complexity counts `if`, the four loops, every `case` —every arm of a `switch expression` too—, `catch`, the ternary and `&&` and `||`; `default` does not, it opens no path. A property with an expression body is named state, not a method, but its ternary counts inside the method that writes it. The positional parameters of a `record` are properties and are members; a `delegate`'s are its signature and are not.

**What is missing**: the usage docs, which still promise TS/JS in `model.md`, `AGENTS.md` and the app and CLI pages.

**Verdict**: C# is done inside **M61**. The checksum of a TypeScript/JavaScript repository still does not move, and a C# repository's is the same in the CLI and in the browser.
