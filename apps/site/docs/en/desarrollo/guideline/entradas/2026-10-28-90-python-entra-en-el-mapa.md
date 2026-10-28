---
title: Python joins the map, with `__init__.py` and without reading the manifest
date: "2026-10-28"
category: feature
verdict: fase
---

**What it was**: the map looked at TS/JS and, since yesterday, Java. A Python repository looked almost empty: its files did not exist for the walk, there were no edges and there was no complexity.

**What it is**: Python goes in whole. A `.py` file is a node with `loc`, `rloc`, `functions`, `maxComplexity` and `maxFunctionLength`; with its symbols —classes and functions, plus module-level constants, which in Python are the closest thing to a public surface—, every function with its complexity and the same body hash as TS and Java, so a rename does not break identity; with its members, which are the assignments in the class body and the `self.x = …` of its methods, without repeating a field declared in two places; and with its `import`s as graph edges. It all comes from a single walk of the tree, and there are two parsers —the CLI's native one and the browser's `.wasm`— sharing the measuring code: the checksum matches. The browser now reads the folder's `.py` files and loads the grammar.

**Why this way**: resolution does not read `requirements.txt` or `pyproject.toml`. A module is a `.py` and a package is a folder, so an import is a path looked up by suffix: the repository root works as well as a `src/` inside the `sys.path`. `import a.b` looks for `a/b.py` and `a/b/__init__.py`; `from a.b import C` carries its names, which may be submodules or names defined in the module, so it tries `a/b/C.py` first and then `a/b.py` or its `__init__.py`. A relative import hangs off the file's package and each dot goes up one level: `from . import x` is a sibling of `x`, `from ..pkg import y` is an uncle package. What is not an edge is counted by name: the standard library (`os`, `json`, `typing`…) is builtin, `from x import *` points to a whole package and is external without an edge, what is neither in the repository nor in the library is a dependency, and a relative import whose package is in the repo but whose module is missing is a broken import, counted with its line. Comments are recognised by node type rather than by their text —a `#` inside a string is not a comment—, so `rloc` does not count comments and the body hash ignores them. Complexity counts `if` and `elif`, `for`, `while`, `except`, the `case` of a `match`, the ternary, `and` and `or`, and the filter of a comprehension; `else` and `finally` do not, because they open no path.

**What is missing**: Go and C#, and the usage docs, which still promise TS/JS.

**Verdict**: Python is done inside **M61**. The checksum of a TypeScript/JavaScript repository still does not move, and a Python repository's is the same in the CLI and in the browser.
