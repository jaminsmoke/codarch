# AGENTS.md

## Producto

CodArch mapea la arquitectura de un repositorio y la lleva al PR/CI y a agentes. v1: nodos = ficheros,
TypeScript/JavaScript, Java, Python, Go y C#, treemap 2D, snapshot interoperable `cc.json` 2.x. La UI es
una consumidora del modelo, no la fuente de verdad. Implementación clean-room: `cc.json` solo como
interoperabilidad.

Monorepo core-first:

```
packages/   schema · parsers · metrics · lint · layouts · render · plugin-api · addons · ui
apps/       cli · mcp · github-action · web · desktop · site
plugins/    vista-3d                    # plugins del repo: código (ADR 0028)
apps/site/docs/   adr/ (carpetas de diez: 0001-0010 … 0061-0070, con roadmap.md dentro) · model.md ·
                  usar/ · rules.md · mcp.md · migration.md · guideline/
scripts/    bench-* · build-cli · pack-cli · desktop-release · auto-release · check-action
```

## Idioma y estilo

- Documentación, UI y mensajes de producto: español. Código, nombres de API, tests y commits:
  inglés técnico, con commits convencionales (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
- Los documentos llevan un set **pequeño** de iconos, con la leyenda en
  `apps/site/docs/desarrollo/guideline/normas.md`: 🧭 decisión · 🗺️ hoja de ruta · 🧪 idea · ⚖️ veredicto ·
  ✅ hecho · 🟡 en curso · ⬜ sin empezar · 🔧 arreglo · ⏳ esperar. ✓ y ✗ significan **hecho** y
  **no hecho**, y no se mezclan con los iconos.
- Mermaid cuando el diagrama diga algo que el texto no dice de un vistazo.
- Cambios pequeños y deterministas. Nada de timestamps, rutas absolutas ni orden de filesystem en
  snapshots.
- Decisiones de modelo o de producto: ADR en `apps/site/docs/desarrollo/adr/` (carpetas de diez) **antes** de
  codificar. Cada ADR lleva su `## Hoja de ruta` con lo abierto y lo que está en curso; el registro
  de lo hecho vive en el **feed de la guía** (`apps/site/docs/desarrollo/guideline/entradas/`, ADR 0047).
  `apps/site/docs/desarrollo/roadmap.md` **indexa** las fases: una línea por fase con su decisión. Las
  ideas que no son fase viven en la guía, una por fichero, con su fecha y su veredicto. Un plugin
  tiene su propia hoja de ruta en su carpeta.

## Comandos

```bash
npm ci                 # respeta allowScripts fijados en package.json
npm run lint           # oxlint + eslint (ADR 0054)
npm run lint:types     # eslint con tipos: hooks y promesas
npm run typecheck      # tsc --noEmit
npx vitest run         # suite completa
npm run check:action   # action.yml + workflow + comentario
npm run version        # las versiones de engine, CLI, escritorio, web, MCP y Docker: cuadran
npm run release        # sube el parche de todos; para uno: -- --cli minor (ADR 0065)
npm run release -- --cli minor --dry-run  # enseña el plan sin tocar nada
npm run build:cli      # bundle ESM en apps/cli/dist
npm run pack:cli       # tarball en .codarch/pack
npm run docs           # abre la guía en el navegador (la del sitio, en el 5175)
npm run web:dev        # app web + codarch serve automático, se para con Vite
npm run site:dev       # la web del proyecto (apps/site/docs/… en el 5175)
npm run site:build     # la web del proyecto sale en apps/site/dist
npm run web:build      # build estático en apps/web/dist
npm run serve -- .     # analiza, sirve la web y reanaliza al guardar (SSE)
docker compose up --build  # app web local en 127.0.0.1:4173 (ADR 0044)
```

Antes de cada push: lint, typecheck, tests y `check:action`.

## Reglas de trabajo

1. **Tests primero o a la vez.** Cualquier cambio de comportamiento lleva test. Si tocas parser,
   snapshot o diff, añade un caso de determinismo.
2. **Commit y push frecuentes.** Commits pequeños y con intención; `main` debe quedar verde.
3. **No commitear artefactos.** `node_modules/`, `dist/`, `.codarch/`, `coverage/` y `samples/` están
   ignorados. No forzar su entrada.
4. **Dependencias.** npm workspaces y `package-lock.json`; nada de pnpm/Bun sin ADR. No usar
   `npm audit fix --force`: actualizar de forma controlada y repetir la suite.
5. **Scripts nativos.** npm 12 bloquea install scripts no aprobados. Si añades esbuild/tree-sitter u
   otro addon, actualiza `allowScripts` con la versión exacta.
6. **Documentos.** Cada `.md` de `apps/site/docs/` (salvo `desarrollo/guideline/`) lleva frontmatter
   (`title`, `description`, `section`, `sidebar`; en los ADR, `status` y `date`). Añadir el fichero
   basta para que salga en la web (ADR 0046) y el build falla si el esquema no cuadra. La guía es otra
   colección: `title`, `date`, `category` y `verdict` por idea, sin sidecars (ADR 0047).
   **Dónde va cada uno** (ADR 0081, que enmienda 0080): lo de **uso** (instalación, CLI, apps,
   reglas, MCP, acción, FAQ) va en `docs/usar/` con `section: usar` y sale en **Documentación**
   (`/docs/`); lo de **construcción** (roadmap, modelo, mapa, migración, ADR en
   `docs/desarrollo/adr/` y la guía en `docs/desarrollo/guideline/`) va en `docs/desarrollo/` con
   `section: desarrollo` y sale en **Desarrollo** (`/desarrollo/`). Las páginas de uso no enlazan ADR
   salvo en una nota «Para saber más». Cada página de interfaz lleva al menos una captura en
   `docs/images/`. Cada página nueva lleva su gemela en `docs/en/`.
7. **MCP.** El cliente lanza `node apps/mcp/bin/codarch-mcp.mjs`, no `npm run mcp`: npm puede
   contaminar `stdout`, que está reservado al protocolo.
8. **Acción.** La fuente es `apps/github-action` y se usa por subruta
   (`jaminsmoke/codarch/apps/github-action@v1`). El tag `v1` vive en el monorepo y lo mueve el
   workflow de publicación del CLI después de npm.
9. **Entrega.** `.github/workflows/release.yml` sube el parche tras CI verde en `main`: calcula el
   impacto por dependencias y lanza solo los canales afectados. `minor`/`major` se piden a mano con
   `npm run release -- --<componente> minor|major`. El CLI se publica con Trusted Publishing, sin
   OTP, y al publicarse el workflow actualiza el pin de la acción.
10. **Idiomas.** El idioma por defecto es el español. Las cadenas de la UI viven en
    `apps/site/src/content/i18n/<idioma>.json` y el contenido en `apps/site/docs/<idioma>/`. Añadir
    un idioma es copiar la carpeta, traducirla y añadirlo a `locales` (Starlight) e `i18n` (Astro);
    las cadenas que falten caen al español. No se generan traducciones automáticamente.
11. **`AGENTS.md` son reglas, no un diario.** Aquí no se acumula lo hecho: el estado de las fases
    está en `apps/site/docs/desarrollo/roadmap.md`, lo abierto en las hojas de ruta de los ADR y lo hecho
    en la guía. Si algo hay que contarlo, va allí.

## Estado

El producto va por `0.3.43`. Fases abiertas: **M23** (dominio propio y búsqueda de la web), **M31**
(los ADR en inglés), **M34** (la app dice qué raíz analiza; pausa del escritorio) y **M49** (el lenguaje
de la ficha en todo el reporte), **M63** (la carpeta tiene su ficha), **M64** (el mapa de lo que no
es código) y **M65** (el lint, en el mapa). **M24** (índice SQLite) sigue
aparcada. El detalle está en
`apps/site/docs/desarrollo/roadmap.md` y en la guía; este fichero no lo repite.

## No objetivos de v1

Backend remoto. Entrar en el roadmap es la forma de decidir algo, y cada cosa que entra lleva su ADR.

La regla que no se mueve: **el checksum depende del código, no de lo que tengas instalado**. Un
plugin o un addon no pueden aportar lentes mientras esa decisión no cambie (ADR 0029).
