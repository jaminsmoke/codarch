# AGENTS.md

## Producto

CodArch mapea la arquitectura de un repositorio y la lleva al PR/CI y a agentes. v1: nodos = ficheros,
TypeScript/JavaScript, treemap 2D, snapshot interoperable `cc.json` 2.x. La UI es una consumidora del
modelo, no la fuente de verdad. Implementación clean-room: `cc.json` solo como interoperabilidad.

Monorepo core-first:

```
packages/   schema · parsers · metrics · layouts · render · plugin-api · addons
apps/       cli · mcp · github-action · web (M5) · desktop (M7) · site (M23)
plugins/    vista-3d                    # plugins del repo: código (ADR 0028)
docs/       adr/ (carpetas de diez: 0001-0010, 0011-0020, 0021-0030, 0031-0040, 0041-0050; roadmap.md dentro) · model.md · rules.md · mcp.md · migration.md · guideline/
scripts/    bench-* · build-cli · pack-cli · desktop-release · sync-action · check-action
```

## Idioma y estilo

- Documentación, UI y mensajes de producto: español.
- Los documentos llevan un set **pequeño** de iconos ✓, con la leyenda en la guía ✓ y aquí ✓:
  🧭 decisión ✓ · 🗺️ hoja de ruta ✓ · 🧪 idea ✓ · ⚖️ veredicto ✓ · ✅ hecho ✓ o cerrada ✓ ·
  🟡 en curso ✓ · ⬜ sin empezar ✓ · 🔧 arreglo ✓ · ⏳ esperar ✓. Los ✓ y ✗ siguen significando
  **hecho / no hecho** ✓: no se mezclan con los iconos ✓.
- Mermaid ✓ cuando el diagrama diga algo que el texto no dice de un vistazo ✓.
- Código, nombres de API, tests y commits: inglés técnico, commits convencionales (`feat:`, `fix:`,
  `docs:`, `chore:`).
- Preferir cambios pequeños y deterministas. Nada de timestamps, rutas absolutas ni orden de
  filesystem en snapshots.
- Cambios de modelo o decisiones de producto: ADR en `docs/adr/` antes de codificar ✓. Los ADR van
  en carpetas de diez ✓ (`docs/adr/0021-0030/0028-los-plugins.md` ✓). Cada ADR lleva su **hoja de
  ruta** dentro ✓ (`## Hoja de ruta` ✓): lo abierto y lo que está en curso ✓. El sidecar
  `<adr>.changelog.md` ✓ guarda lo hecho ✓, no lo que falta ✓ (ADR 0036 ✓).
- `docs/adr/roadmap.md` **indexa** las fases ✓ (M0 a M25 ✓): una línea por fase ✓ con su decisión ✓.
  Las ideas que no son fase viven en la **guía** ✓ (`docs/guideline/` ✓, una página ✓ en HTML ✓ con su
  CSS ✓ y su JS ✓ ✓), por orden cronológico ✓, cada una con su veredicto ✓ (fase ✓, ADR ✓, arreglo ✓
  o esperar ✓). Un plugin tiene su propia hoja de ruta en su carpeta ✓.

## Comandos

```bash
npm ci                 # respeta allowScripts fijados en package.json
npm run lint           # oxlint
npm run typecheck      # tsc --noEmit
npx vitest run         # suite completa
npm run check:action   # action.yml + workflow + comentario
npm run version        # las versiones del producto, el CLI y el escritorio: cuadran
npm run build:cli      # bundle ESM en apps/cli/dist
npm run pack:cli       # tarball en .codarch/pack
npm run sync:action    # regenera .codarch/action-repo (repo público)
npm run docs           # abre la guía en el navegador (la del sitio, en el 5175)
npm run web:dev        # app web + codarch serve automático, se para con Vite
npm run site:dev       # la web del proyecto (docs/adr/… en el 5175)
npm run site:build     # la web del proyecto sale en apps/site/dist
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
8. **Release del CLI.** Subir la versión ✓ (`npm run version -- <x>` ✓ ✓), `npm run web:build` ✓,
   `npm run build:cli` ✓, `npm run pack:cli` ✓, probar el tarball en un proyecto limpio ✓,
   `npm run publish:cli` ✓ (la etiqueta la decide la versión ✓: alpha → `next` ✓, estable →
   `latest` ✓ ✓; requiere OTP ✓), actualizar el input `version` de la acción ✓, sincronizar ✓ y
   mover `v1` ✓.

## Estado y siguiente

- M1–M4 cerrados: parser TS, diff/reglas/acción, publicación npm + acción, lente de migración.
- M5 en curso: app web con treemap, inspector, foco por carpeta, migración, vista de PR, selector de
  carpetas servido, live/stop, persistencia, atajos básicos, carga por URL, estado de vista en la
  URL, navegación por flechas y nivel de detalle para snapshots grandes.
- M6 cerrado: el análisis en el navegador da el mismo checksum que el CLI, con progreso por fichero
  y cancelación instantánea.
- M7 cerrado: app de escritorio con Electron y su propia copia de la UI (ADR 0021); el motor es el
  mismo, las apps no se importan la una a la otra. Instaladores sin firmar por CI.
- M8 cerrado: la lente de migración se ve en el reporte, en el comentario del PR y en el MCP
  (`get_migration_plan`); decisión en ADR 0022.
- M9 cerrado: la lente de dominio (catálogo de perfiles, generador de capas y perfiles propios) y
  la migración en el reporte, el PR y el MCP; decisiones en ADR 0022 y ADR 0023. `codarch@0.2.0` y
  CodArch Desktop `0.2.0` publicados.
- M10 cerrado: la evolución temporal (ADR 0024). La lente de calor (commits), el historial del repo
  en `.codarch-history/`, la comparación de dos momentos y su vista en las dos apps.
- M11 cerrado: la lente de símbolos (ADR 0025). El parser recoge funciones, clases, interfaces y
  tipos con su complejidad; el inspector de las dos apps los lista y el MCP responde por ellos.
  “Abrir repositorio” lee `.codarch` ya generado; el análisis en navegador es M6 (WASM).
- M12 cerrado: la vida de un símbolo (ADR 0026). El diff habla de símbolos y cada uno tiene su
  cadena a través de renombrados y mudanzas.
- M13 cerrada: los ajustes y el store de plugins (ADR 0027).
- M14 cerrada: los plugins (ADR 0028). Piezas del repo que se compilan en el build y se activan
  desde los ajustes; el contrato promete **solo vistas**.
- M15 cerrada: la vista 3D, el primer plugin, en su propio chunk y con su hoja de ruta.
- M16 cerrada: los addons (ADR 0029). Conocimiento declarativo (perfiles, reglas y vistas
  guardadas) que se instala copiando una carpeta y viaja con el repo. Un addon **no** aporta código
  ni lentes: el checksum no cambia. `@codarch/addons`, `addons:` en `.codarch.yml`,
  `codarch addons list|add|remove`, el diff aplicando sus reglas (con su `source` en el reporte y en
  el PR), el menú **Vistas** de las dos apps, `get_project_config` en el MCP y los addons del
  proyecto en los ajustes, en modo lectura.
- M17 cerrada: instalar y quitar (ADR 0030). `codarch plugins list|add|remove`, simétrico con
  `codarch addons`: instalar copia la carpeta hija y la declara; quitar la borra y la saca de la
  lista, nunca la carpeta contenedora. Las dos listas avisan si la carpeta y `.codarch.yml` no
  cuadran (`--json` para el CI). Los ejemplos de plugin y addon salieron del repo con los comandos
  nuevos.
- M18 cerrada: los documentos ordenados (ADR 0031). Los ADR van en carpetas de diez y cada uno lleva
  su hoja de ruta dentro (`## Hoja de ruta`); su changelog al lado (`<adr>.changelog.md`) guarda lo
  hecho. `docs/adr/roadmap.md` queda como índice.
- M20 cerrada: la guía, en HTML (ADR 0031, §7). `docs/guideline/` es una página (`index.html`,
  `guia.css`, `guia.js`) con índice, «dónde estoy» y sin nombres G1: cada entrada se llama por lo
  que es. `npm run docs` la abre.
- M21 cerrada: las versiones y las actualizaciones (ADR 0032). Una versión para el producto (la de
  la raíz, con `npm run version -- <x>` y comprobada por el CI), `codarch version [--check]` (npm) y
  la sección **Actualizaciones** en los ajustes de las dos apps. El escritorio se actualiza con
  las releases del repo (`CODARCH_UPDATE_REPO`).
- M23 en curso: la web del proyecto (ADR 0034). `apps/site`: React + Vite + router, con
  los tokens de la app; las páginas de docs **se generan del markdown del repo** (una sola verdad) y
  la guía ✅ ✅. El sitio enseña la portada ✅ ✅, la guía ✅ ✅ y los documentos ✅ ✅ (una página por
  documento, con menú, índice, vecinos y Mermaid). Está en `jaminsmoke.github.io/codarch` ✅ ✅ y se
  publica sola ✅ ✅ con el workflow `web.yml` ✅ ✅.
- M23.10 cerrada: la documentación ordenada (ADR 0036). La hoja de ruta vive en el ADR, el sidecar
  es `<adr>.changelog.md` y el índice de fases está en `docs/adr/roadmap.md`.
- M24 sin empezar: el índice SQLite de los documentos. Será derivado del markdown, con FTS5, en
  `.codarch/docs.db` (ignorado); el markdown sigue siendo la verdad.
- M25 en curso: la entrega se automatiza (ADR 0042). El CLI se publica con Trusted Publishing y el
  escritorio crea su release solo cuando `versions.json` supera la última `desktop-v*`; la acción
  se actualiza después de publicar.
- M22 cerrada: el repo, con sus papeles (ADR 0033). La auditoría está hecha (MIT, sin secretos,
  dependencias permisivas) y ya están `SECURITY.md`, `CONTRIBUTING.md`, `NOTICE.md`, `TRADEMARK.md` y
  la nota de privacidad. El repo es público desde el 2026-10-22.
- Repos: `jaminsmoke/codarch` público; `jaminsmoke/codarch-action` público;
  `jaminsmoke/codarch-action-smoke` privado para pruebas externas.

## No objetivos de v1

Backend remoto. El 3D y los plugins entraron por el roadmap (M14 y M15) y los addons son M16: entrar
en el roadmap es la forma de decidir algo, y cada cosa que entra lleva su ADR.

La regla que no se mueve: **el checksum depende del código, no de lo que tengas instalado**. Un
plugin o un addon no pueden aportar lentes mientras esa decisión no cambie (ADR 0029).
