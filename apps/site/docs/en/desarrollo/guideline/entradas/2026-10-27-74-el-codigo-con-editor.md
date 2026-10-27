---
title: The code, with an editor
date: "2026-10-27"
category: optimized
verdict: adr
---

**What it was**: the sheet painted the open symbol's code with Prism, one row per line, in a `<pre>`. [ADR 0085](../adr/0081-0090/0085-la-ruta-del-mapa-navega.md) retired the whole-file tab because it froze the app and left «measure and split the painting» open, without knowing whether the cost was highlighting or mounting.

**What it is**: the snippet is painted with **CodeMirror 6**, read-only and in its own chunk ([ADR 0086](../adr/0081-0090/0086-el-codigo-de-la-ficha-con-editor.md)). It brings the file's gutter, line wrapping and native selection; it does not capture `Esc` or backspace, and its colours are the `.token.*` classes in `styles.css`, so the block looks as before. Prism leaves the UI together with its `highlight.ts`.

**Why this way**: the prototype was measured with the same symbol —`useCodarchApp.tsx`, lines 195–964— in the real app. The `<pre>` left **a 21,785 ms task** and **5,809 nodes**; the editor mounts in **17 ms**, leaves **172 nodes** and paints **16 lines**. Neither highlighting nor CSS explained it: Prism takes 16.1 ms on those 770 lines and an equivalent mock-up of 8,470 nodes lays out in 66.8 ms; the cost was in mounting the tree. Shiki was dropped for its 27 ms per 400-line block and 190 kB grammar, and `content-visibility` only lowers layout, not mounting.

**How it is checked**: with the repo open, a symbol's code opens instantly and the gutter starts at the real line (195, 196, 197); with the editor open, walking folders and opening another file leaves no long task. The mount leaves its measure in `codarch-code-mount`, and `packages/ui/test/codeEditorState.test.ts` covers the document, the read-only state and the gutter numbering.

**Verdict**: ADR 0086, with no new phase. Seeing the whole file in the stage on this base and checking the lazy chunk in the packaged desktop app stay open.
