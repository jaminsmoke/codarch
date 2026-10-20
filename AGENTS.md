# AGENTS.md

## Producto

CodArch mapea la arquitectura de un repositorio y la lleva al PR/CI y a agentes. v1: nodos = ficheros,
TypeScript/JavaScript, treemap 2D, snapshot interoperable `cc.json` 2.x. La UI es una consumidora del
modelo, no la fuente de verdad. Implementación clean-room: `cc.json` solo como interoperabilidad.

Monorepo core-first:

```
packages/   schema · parsers · metrics · layouts · render
apps/       cli · mcp · github-action · web (M5)
docs/       adr/ · model.md · rules.md · mcp.md · migration.md · roadmap.md
scripts/    bench-* · build-cli · pack-cli · sync-action · check-action
```

## Idioma y estilo

- Documentación, UI y mensajes de producto: español.
- Código, nombres de API, tests y commits: inglés técnico, commits convencionales (`feat:`, `fix:`,
  `docs:`, `chore:`).
- Preferir cambios pequeños y deterministas. Nada de timestamps, rutas absolutas ni orden de
  filesystem en snapshots.
- Cambios de modelo o decisiones de producto: ADR en `docs/adr/` antes de codificar.

## Comandos

```bash
npm ci                 # respeta allowScripts fijados en package.json
npm run lint           # oxlint
npm run typecheck      # tsc --noEmit
npx vitest run         # suite completa
npm run check:action   # action.yml + workflow + comentario
npm run build:cli      # bundle ESM en apps/cli/dist
npm run pack:cli       # tarball en .codarch/pack
npm run sync:action    # regenera .codarch/action-repo (repo público)
npm run web:dev        # app web + codarch serve automático, se para con Vite
npm run web:build      # build estático en apps/web/dist
npm run serve -- .     # analiza, sirve la web y reanaliza al guardar (SSE)
```

Antes de cada push: lint, typecheck, tests y `check:action`. Si el cambio toca la acción, ejecutar
también `npm run sync:action` y actualizar el repo público.

## Reglas de trabajo

1. **Tests primero o a la vez.** Cualquier cambio de comportamiento lleva test. Si tocas parser,
   snapshot o diff, añade un caso de determinismo.
2. **Commit y push frecuentes.** Commits pequeños y con intención; no acumular días de trabajo.
   `main` debe quedar verde.
3. **No commitear artefactos.** `node_modules/`, `dist/`, `.codarch/`, `coverage/` y `samples/` están
   ignorados. No forzar su entrada.
4. **Dependencias.** Seguir con npm workspaces y `package-lock.json`. No migrar a pnpm/Bun sin ADR.
   No usar `npm audit fix --force`; actualizar de forma controlada y repetir la suite.
5. **Scripts nativos.** npm 12 bloquea install scripts no aprobados. Si añades esbuild/tree-sitter u
   otro addon, actualiza `allowScripts` con la versión exacta.
6. **MCP.** El cliente debe lanzar `node apps/mcp/bin/codarch-mcp.mjs`, no `npm run mcp`: npm puede
   contaminar `stdout`, que está reservado al protocolo.
7. **Acción.** La fuente es `apps/github-action`. El repo público
   [`jaminsmoke/codarch-action`](https://github.com/jaminsmoke/codarch-action) se genera con
   `npm run sync:action`; no editar allí. Tras sincronizar, mover el tag mayor `v1`.
8. **Release del CLI.** Subir `apps/cli/package.json`, `npm run web:build`, `npm run build:cli`,
   `npm run pack:cli`, probar el tarball en un proyecto limpio,
   `npm publish apps/cli/dist --access public` (requiere OTP), actualizar el input `version` de la
   acción, sincronizar y mover `v1`.

## Estado y siguiente

- M1–M4 cerrados: parser TS, diff/reglas/acción, publicación npm + acción, lente de migración.
- M5 en curso: app web con treemap, inspector, foco por carpeta, migración, vista de PR, selector de
  carpetas servido, live/stop, persistencia, atajos básicos, carga por URL y estado de vista en la
  URL. Quedan flechas/snapshots grandes.
  “Abrir repositorio” lee `.codarch` ya generado; el análisis en navegador es M6 (WASM).
- Repos: `jaminsmoke/codarch` privado; `jaminsmoke/codarch-action` público;
  `jaminsmoke/codarch-action-smoke` privado para pruebas externas.

## No objetivos de v1

Símbolos, 3D, plugins, lente de dominio, evolución temporal y backend remoto. No añadirlos sin mover
el roadmap y documentar la decisión.
