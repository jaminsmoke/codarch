---
title: "The Rust scanner has one state per case"
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**What it was**: `packages/parsers/src/migration.ts` measured Rust lines of code without a parser, and it did so in a single `measureRustSource` —**41** of complexity, 127 lines in its longest function and **210** of debt— with a loop over a hundred lines long in which eight flags (`blockDepth`, `rawHashes`, `inString`, `inChar`, `escaped`, `lineHasCode`…) decided, character by character, what was being read. Every new case —the comment that nests, the quote that escapes, the raw string's hash— added one more `if` in the same place.

**What it is**: the scanner says which state it is in and every state has its function. `stepNewline` closes the line wherever the cursor is (the content of a multiline string is still code); `stepCode` recognises the comment, the raw string, the string and the char literal; `stepLineComment`, `stepBlockComment` —which tracks depth because Rust nests them—, `stepQuoted` —one for both `"` and `'`, which differ only in the closing quote— and `stepRawString` spend what is already open. `opensRawString` and `countHashes` share the hash count that used to be written twice. Complexity drops to **11**, the longest function to **76** lines and the debt to **60**. In the same file, `buildMigration` was the one left at 15, so its status and debt move out to `statusFor` and `debtFor`.

**Why like this**: each state is a different lexical rule and none of them needs to know about the others: a nested comment has nothing to do with an escaped quote. With one function per state, adding one means writing its handler, not hunting for the place of the `if`.

**How it is checked**: a copy of the previous scanner was kept and compared with the new one over a corpus of hard fragments —nested comment, raw string with and without hashes, multiline raw string, `br##"…"##`, escaped quote, `'a` lifetime, CRLF, lone `\r`, comment and string left open— plus **400** seeded random combinations: the `loc`/`rloc` pairs match in every one. That comparison was temporary and has been removed; what stays in `packages/parsers/test/migration.test.ts` are two permanent cases: the multiline raw string with a nested comment, and determinism —the same source gives the same result on a second pass and in any order—. Suite **981** cases and **122** files, `tsc` clean and lint with no errors. Repository debt drops from **10,128** to **9,978**.

**Verdict**: done. Next is `packages/metrics/src/diff.ts` (complexity 38, debt 195); after that `packages/addons/src/index.ts` and `packages/ui/src/storage.ts`, which weigh through fan-in 16 more than through complexity.
