---
title: Java joins the map, with a tree and without reading the manifest
date: "2026-10-28"
category: feature
verdict: fase
---

**What it was**: the map only looked at TS/JS. A Java repository looked almost empty: its files did not exist for the walk, there were no edges and there was no complexity. Rust was measured by hand, without a tree, and Java not even that.

**What it is**: Java goes in whole. A `.java` file is a node with `loc`, `rloc`, `functions`, `maxComplexity` and `maxFunctionLength`; with its symbols —class, interface, enum and `record`, plus methods and constructors— and their complexity, with the same body hash as TS so a rename does not break identity; with its members, which are its fields and a `record`'s components; and with its `import`s as graph edges —only explicit `import`s: a class in the same package has none and creates no edge—. It all comes from a single walk of the tree, as in TS, and there are two parsers: the CLI's native one and the browser's `.wasm`, sharing the measuring code, so the checksum matches. The browser now reads the folder's `.java` files and loads the grammar.

**Why this way**: resolution does not read `pom.xml` or `build.gradle`. A file's package is its path and its class is its name, so `import com.acme.billing.Invoice;` looks for a file ending in `com/acme/billing/Invoice.java`, whether it lives in `src/main/java/…` or at the repository root. `import static com.acme.Money.ZERO;` tries the member's class first and the class that holds it next, and that same second candidate resolves nested classes. What is not an edge is counted by name: platform packages (`java.`, `javax.`, `jdk.`…) are builtin, a whole package (`com.acme.*`) is external and creates no edge, and an import whose package is in the repository but whose class is missing is a broken import, counted with its line. An interface method without a body is a symbol and not a metric, a `switch` counts once per label —arrow form included— and a lambda is not measured on its own: its complexity is that of the method holding it.

**What is missing**: Python, Go and C#, and the usage docs, which still promise TS/JS.

**Verdict**: Java is done inside **M61**. The checksum of a TypeScript/JavaScript repository does not move, and a Java repository's is the same in the CLI and in the browser.
