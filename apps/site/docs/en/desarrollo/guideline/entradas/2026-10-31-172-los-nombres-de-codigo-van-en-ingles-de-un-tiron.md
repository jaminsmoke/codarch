---
title: "Code names go English, in one cut"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: the `Plataforma` contract in `@codarch/ui`, `Tema`/`useTema`, the
`plataforma.ts` adapters for web and desktop, and much of the site (`guia-*`,
`LineaTiempo`, `vite-plugin-rutas`, `navegacion`, `middleware-rutas`...) were still
Spanish, against ADR 0031 (technical code names in English).

**What changes**: clean cut C6, no aliases. `Platform` (`AnalysisResult`, `analyze`,
`pickFolder`, `readProject`, `openInEditor`, `chains`, `heat`...), `Theme`/`useTheme`,
`platform.ts` on web and desktop, and on the site `guide-*`, `Timeline`,
`vite-plugin-routes`, `middleware-routes`, `navigation`, `routes`, `theme`, `title`,
`carousel`, `redirects`, `rehype-locale`, `zones`, `Bar`/`ThemeButton`/`GuideApp`,
React pages `Home`/`Guide`/`Future`/`Rules`. UI strings and docs prose stay Spanish.
Public URLs (`/desarrollo/guia/`, `futuro`, `normas`, `fecha` param), i18n keys
`guia.*`, the `cc.json` schema and MCP tool names are untouched.

**Why this way**: one language in code drops the dual vocabulary; user-visible routes
and copy do not change, so there is no public break.

**Verified**: typecheck, lint, vitest, `check:action`, `version`, and web, desktop and
site builds after each area.

**Verdict**: fix aligned with ADR 0031. Left on purpose: `guia*` slugs/CSS/i18n and the
`fecha` param (public URLs), plus minor Spanish locals on the site and Spanish
comments/prose.
