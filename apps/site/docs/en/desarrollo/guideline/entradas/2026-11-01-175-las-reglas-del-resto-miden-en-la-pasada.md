---
title: "The rules of the rest are measured in the pass"
date: "2026-11-01"
category: "feature"
verdict: "fase"
---

**What it was**: the map of the rest showed **what is there** —documents, configuration, assets and who
links to whom— but it did not say **what is broken**. A link to a file that no longer exists and a
frontmatter the site rejects were found on publishing, not on analysing. [ADR 0105](/en/desarrollo/adr/0101-0110/0105-las-reglas-de-doc-y-config/)
wrote the four rules down; what was missing was them saying something.

**What changes**: `docsFindings` (`packages/lint/src/rest.ts`) resolves links against the tree, finds
orphans among the declared entries, reads the frontmatter where a glob asks for it and looks for each
document's twin in both directions. `RestFile` carries the frontmatter keys, read while the document is
measured, so the rules never open anything again. `buildRestLint` turns them into
`.codarch/lint-rest.repmod.json` with `meta.tree` = the rest's checksum, and `analyze` and `serve` write
it in their pass, gated by checksum. The name joins the ADR 0100 registry, so `.codarch/` recognises it
and does not sweep it.

**Why this way**: the rules are pure and touch no disk, so the result does not depend on the machine and
two equal passes give the same file. Only documents are judged: counting a `package.json` as measured
would say it was looked at when nobody did. The frontmatter is read where the document is already in
memory to count lines and links, and the artifact is signed with the **rest's** checksum: the code's
still means «this code».

**Verified**: tests for the four rules and the frontmatter reading, for the artifact (checksum, input
order and provenance) and for the `.codarch/` registry; typecheck, lint and the `lint` and `parsers`
suites, 386 tests. A full `analyze` on this repo writes the artifact.

**Verdict**: done. M76 still has open the `docs:` block of `.codarch.yml`, the **Rules** section in the
rest's sheets and the link's line.
