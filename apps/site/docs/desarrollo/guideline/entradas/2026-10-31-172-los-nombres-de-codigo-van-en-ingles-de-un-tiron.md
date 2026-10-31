---
title: "Los nombres de codigo van en ingles, de un tiron"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Que era**: el contrato `Plataforma` en `@codarch/ui`, `Tema`/`useTema`, los adaptadores
`plataforma.ts` de web y escritorio, y buena parte del sitio (`guia-*`, `LineaTiempo`,
`vite-plugin-rutas`, `navegacion`, `middleware-rutas`...) seguian en espanol, contra el
ADR 0031 (nombres de codigo en ingles tecnico).

**Que cambia**: corte limpio C6, sin alias. `Platform` (`AnalysisResult`, `analyze`,
`pickFolder`, `readProject`, `openInEditor`, `chains`, `heat`...), `Theme`/`useTheme`,
`platform.ts` en web y escritorio, y en el sitio `guide-*`, `Timeline`,
`vite-plugin-routes`, `middleware-routes`, `navigation`, `routes`, `theme`, `title`,
`carousel`, `redirects`, `rehype-locale`, `zones`, `Bar`/`ThemeButton`/`GuideApp`,
paginas React `Home`/`Guide`/`Future`/`Rules`. Las cadenas de UI y el contenido de la
documentacion siguen en espanol. Las URLs publicas (`/desarrollo/guia/`, `futuro`,
`normas`, param `fecha`), las claves i18n `guia.*`, el esquema `cc.json` y los nombres
de tools MCP no se tocan.

**Por que asi**: un solo idioma en el codigo evita el doble vocabulario; las rutas y el
texto que ve el usuario no cambian, asi que no hay rotura publica.

**Verificado**: typecheck, lint, vitest, `check:action`, `version`, builds de web,
escritorio y sitio tras cada area.

**Veredicto**: arreglo alineado con el ADR 0031. Quedan a proposito slugs/CSS/i18n
`guia*` y el param `fecha` (URLs publicas), mas variables locales espanolas menores
en el sitio y comentarios/prosa en espanol.
