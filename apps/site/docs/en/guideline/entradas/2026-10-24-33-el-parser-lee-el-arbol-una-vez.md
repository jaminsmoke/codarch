---
title: The parser reads the tree once
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: analysing a file no longer walks its syntax tree four or five times. Before, the tree
was walked by `measureSource` (metrics), `collectImports` (imports) and `collectSymbols` (symbols), and
on top of that every function was measured on its own (complexity) and every symbol was walked again to
hash its body.

**Why**: with the native tree-sitter binding, every access to `children` **unmarshals that node's
children into JS again**. The profile of an analysis made it plain: `get children`, `unmarshalNodes` and
`unmarshalNode` took close to half of the time, and each pass paid for the same tree all over again.

**What changed**:

- `ts/tree.ts` (`analyzeTree`): a single walk returns metrics, imports and symbols. Each function's
  complexity is measured on the way past and kept by position, so the symbol reuses it instead of
  measuring it again.
- `ts/parser.ts` and `ts/wasm-parser.ts` use `analyzeTree`. The two routes —native (CLI, server,
  desktop main process) and WASM (browser)— give the same result, so the checksum does not change.
- Children are asked for **once per node** (`const children = node.children`) in the walk and in the
  body hash. Before they were asked for two and three times on the same node, unmarshalling each time.

**Measured** (this repository, 89 files from `packages` and `apps`, median of four rounds with a warm
up): 1,975 ms with the three passes, **636 ms** with a single one; **68% less**. On the full analysis of
this repository (274 files) the CLI goes from **5,330 ms down to 2,590 ms** (51% less). The first pass
had already gained 25% before touching the body hash: the win was mostly in not repeating the same walk.

**How it was checked that nothing changes**: `test/tree.test.ts` compares `analyzeTree` against the three
separate functions, file by file, over eight tricky cases (comments, imports of every kind, overloads,
nesting, TSX) and over the ~200 files of this repository, and also checks that two passes give the same
result. On top of that, `packages/schema` was analysed with the old parser and with the new one: same
checksum (`5d07a868…`) and same figures. The two old functions stay: some callers only want metrics or
only imports.

**Still open**:

- Analysing a **subfolder** does not inherit the `.gitignore` files above it: `codarch analyze apps/cli`
  swallows `apps/cli/dist/` (the packaged web app) and takes **20 s** for 38 files, while the whole
  repository takes 2.6 s. The analyser applies the `.gitignore` files found inside the root it is given,
  and that `dist/` is ignored by the repository root's `.gitignore`.
- The body hash and the complexity still walk each function's subtree on their own. The next step would
  be doing them in the same walk (a stack of hash contexts) or moving to `TreeCursor`, which does not
  unmarshal children into JS.

**Verdict**: performance fix; no ADR needed. Both apps gain: the parser lives in `@codarch/parsers` and
is used by the CLI, the desktop helper process and the web Worker.
