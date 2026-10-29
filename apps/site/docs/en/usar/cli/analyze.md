---
title: "codarch analyze"
description: "Analyses a repository and writes the cc.json snapshot."
section: usar
sidebar:
  label: "analyze"
  order: 21
---

Analyses a repository and writes the cc.json snapshot.

## What it analyses

The walk reads each language's extensions and **parses every one with its grammar**:

| Language | Extensions |
| --- | --- |
| TypeScript / JavaScript | `.ts` `.tsx` `.mts` `.cts` `.js` `.jsx` `.mjs` `.cjs` |
| Java | `.java` |
| Python | `.py` |
| Go | `.go` |
| C# | `.cs` |

All of them yield the file's metrics (`loc`, `rloc`, `functions`, `maxComplexity`,
`maxFunctionLength`), its symbols with their complexity and its imports as edges. Rust (`.rs`) and the
`.wasm` and `.node` artefacts are also measured, **without a tree**, for the migration lens only.

Imports do not point at the same thing in every language, and the analysis respects that:

- **TS/JS**: modules, packages, `tsconfig` aliases and workspaces.
- **Java**: the `a/b/C.java` file, found by path suffix; it works the same for Maven, Gradle or a flat
  project.
- **Python**: the `a/b.py` module or the `a/b/__init__.py` package, and relative imports from the
  file's package.
- **Go**: the whole package —every `.go` in the folder—, with the `go.mod` prefix.
- **C#**: the files that declare the `using`'s `namespace`, resolved at the end of the analysis.

An import that does not resolve is counted and listed with its line; no edge is invented. A language
that is not in the table is not analysed: its files do not appear on the map, and the summary says so
when none are left to read.

The **migration lens** does not change: it is still JS/TS → Rust, so a Java, Python, Go or C# file has
no state, debt or crossings.

## Usage

```sh
codarch analyze [path] [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-o, --out <dir>` | Output folder. Defaults to `<path>/.codarch`. |
| `--ignore <pattern>` | Adds an exclusion to the scope. Repeatable. |
| `--config <file>` | YAML scope. Defaults to `.codarch.yml` when present. |
| `--no-config` | Does not read the YAML scope. |
| `--project <name>` | Project name in the snapshot. |
| `--no-git` | Does not read churn from git history. |
| `--history` | Also saves the snapshot to `.codarch-history/`. |
| `-h, --help` | Help. |
| `-v, --version` | Version. |

## Output

Writes `snapshot.cc.json` to the output folder and, next to it, `rest.cc.json`: the map of what is not code —documents, configuration and assets— in its own snapshot with its own checksum, so changing a `.md` does not move the code one. If it creates `.codarch/` at the root, it adds `.codarch/` to `.gitignore` (an existing folder is left alone). Prints a summary: root, both snapshot paths and sizes, files, folders, edges, cycles, imports (external, builtins, type-only, unresolved), migration, parse cache, nested scopes and time.

The **parse cache** is left in `.codarch/parse-cache.json` and the **list of nested scopes** in `.codarch/scopes.json`: they are derived, they can be deleted, and they save the analysis that contains this scope from parsing again what is already parsed ([`codarch scopes`](scopes.md)).

![Output of `codarch analyze .` in the terminal](../../../images/cli-analyze.png)

## Examples

```sh
codarch analyze .
codarch analyze . -o .codarch --project "My project" --history
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Snapshot written. |
| `1` | Invalid argument or option, missing path, invalid `.codarch.yml` or the output could not be written. |
