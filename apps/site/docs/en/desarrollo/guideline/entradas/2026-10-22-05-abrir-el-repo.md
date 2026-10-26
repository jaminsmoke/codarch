---
title: Opening the repo
date: "2026-10-22"
category: chore
verdict: fase
---

**What it is**: CodArch's source code being public. The code already ships —the CLI is on npm and
the action has its own public repo—; what was still private was the repo and its documents.

**Why**: the **public plugin registry** needs the repo to be public: nobody publishes a plugin in a
repo they cannot see. And the **clean room** (ADR 0001) reads better when the implementation is in
plain sight.

**Decision**: [ADR 0033](../../adr/0031-0040/0033-abrir-el-repo.md). The license stays **MIT**, the
trademark is not granted with it, and the papers come before opening: `SECURITY.md`,
`CONTRIBUTING.md`, `NOTICE.md`, `TRADEMARK.md` and the privacy note.

**Verdict**: **phase M22**, in the roadmap of
[ADR 0033](../../adr/0031-0040/0033-abrir-el-repo.md). The measures are in place and the repo is
public.
