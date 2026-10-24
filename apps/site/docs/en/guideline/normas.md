## The icons
| Icon | What it means |
|---|---|
| 🧭 | a **decision** (an ADR) |
| 🗺️ | a **roadmap** |
| 🧪 | an **idea** (an entry in this guide) |
| ⚖️ | a **verdict** |
| ✅ | **done** or **closed** |
| 🟡 | **in progress** |
| ⬜ | **not started** |
| 🔧 | a **fix** (an improvement without a phase) |
| ⏳ | **waiting** |

The icons are about category or state, not decoration: if a sentence reads fine without them, it
goes without them. ✓ and ✗ still mean **done** and **not done** when they are needed.

## The categories
Each entry says **what kind of work it is** on top of what was decided. The categories are the ones
in the **guide's changelog** ([ADR 0035](../adr/0031-0040/0035-la-guia-como-changelog.md) ·
[ADR 0047](../adr/0041-0050/0047-el-changelog-es-la-guia.md)) and they are a **closed set**:

| Category | What it is |
|---|---|
| `feature` | something **new**: a capability that was not there |
| `fix` | a **fix**: something that promised and did not deliver |
| `optimized` | the same, **faster** or cheaper |
| `refactor` | the same, **better inside** |
| `docs` | **documentation**: what is read, not what runs |
| `chore` | **maintenance**: versions, repo, tooling |
| `security` | **security**: permissions, secrets, dependencies |
| `removed` | **removing** something that no longer holds |

Not every category shows up every day: the day paints **only the ones that have something**, always
in that order. And an entry **declares** its category: it is not inferred from the verdict.

## The verdicts
| Verdict | What it means |
|---|---|
| `idea` | it is wanted, but there is no decision or date |
| `fase` | it enters the roadmap with its roadmap section |
| `adr` | it is settled with an ADR, without opening a new phase |
| `arreglo` | it is small: fixed without a phase or an ADR |
| `esperar` | the way it works has to be decided before offering it |

## The rule
- An idea **enters the roadmap** as a phase when it has a result you can see, and an **ADR** if it
  changes the product model or its rules.
- If what is missing is a **decision** (not work), it stays here until the decision is made.
- If it is an **improvement** to something that already exists, it needs no phase: it is done and
  checked.
- **Plugins** have their own roadmap (inside their folder), because they are separate pieces: the
  plugin system does not grow with each plugin.

## How an idea is placed here
1. Create a file in `docs/guideline/entradas/` named `YYYY-MM-DD-NN-title.md`. The `NN` orders the
   entries of the day; the title, in kebab-case, gives the anchor.
2. Declare `title`, `date`, `category` and `verdict` in the frontmatter.
3. Write the body: **what it is**, **why**, **what is missing**, the **verdict** and the **size**.
4. Respect the chronological order: if an old idea comes back, it comes back **to its place** (its
   date and its number).
5. When the verdict is `fase`, the idea moves to its decision's roadmap and the trace of why stays
   here.
6. Write its English version too in `docs/en/guideline/entradas/`, with the **same file name** and
   its title translated. A test compares both directories: an untranslated idea breaks the suite.

```yaml
---
title: The public plugin registry
date: "2026-10-21"
category: feature
verdict: idea
---
```

The site groups entries by date and category; adding the file is enough.
