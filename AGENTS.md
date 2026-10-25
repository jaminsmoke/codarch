# AGENTS.md

## Producto

CodArch mapea la arquitectura de un repositorio y la lleva al PR/CI y a agentes. v1: nodos = ficheros,
TypeScript/JavaScript, treemap 2D, snapshot interoperable `cc.json` 2.x. La UI es una consumidora del
modelo, no la fuente de verdad. Implementación clean-room: `cc.json` solo como interoperabilidad.

Monorepo core-first:

```
packages/   schema · parsers · metrics · layouts · render · plugin-api · addons · ui
apps/       cli · mcp · github-action · web (M5) · desktop (M7) · site (M23)
plugins/    vista-3d                    # plugins del repo: código (ADR 0028)
apps/site/docs/       adr/ (carpetas de diez: 0001-0010, 0011-0020, 0021-0030, 0031-0040, 0041-0050; roadmap.md dentro) · model.md · rules.md · mcp.md · migration.md · guideline/
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
- Cambios de modelo o decisiones de producto: ADR en `apps/site/docs/adr/` antes de codificar ✓. Los ADR van
  en carpetas de diez ✓ (`apps/site/docs/adr/0021-0030/0028-los-plugins.md` ✓). Cada ADR lleva su **hoja de
  ruta** dentro ✓ (`## Hoja de ruta` ✓): lo abierto y lo que está en curso ✓. El registro de lo
  hecho vive en el **feed de la guía** ✓ (`apps/site/docs/guideline/entradas/` ✓, ADR 0047 ✓).
- `apps/site/docs/adr/roadmap.md` **indexa** las fases ✓ (M0 a M32 ✓): una línea por fase ✓ con su decisión ✓.
  Las ideas que no son fase viven en la **guía** ✓ (`apps/site/docs/guideline/entradas/` ✓, un fichero por idea ✓
  con su fecha ✓), por orden cronológico ✓, cada una con su veredicto ✓ (fase ✓, ADR ✓, arreglo ✓
  o esperar ✓). Un plugin tiene su propia hoja de ruta en su carpeta ✓.

## Comandos

```bash
npm ci                 # respeta allowScripts fijados en package.json
npm run lint           # oxlint + eslint (ADR 0054)
npm run lint:types     # eslint con tipos: hooks y promesas
npm run typecheck      # tsc --noEmit
npx vitest run         # suite completa
npm run check:action   # action.yml + workflow + comentario
npm run version        # las versiones del producto, el CLI, el escritorio y la web: cuadran
npm run release        # sube el parche y prepara la release (-- minor | major | --dry-run)
npm run build:cli      # bundle ESM en apps/cli/dist
npm run pack:cli       # tarball en .codarch/pack
npm run sync:action    # regenera .codarch/action-repo (repo público)
npm run docs           # abre la guía en el navegador (la del sitio, en el 5175)
npm run web:dev        # app web + codarch serve automático, se para con Vite
npm run site:dev       # la web del proyecto (apps/site/docs/adr/… en el 5175)
npm run site:build     # la web del proyecto sale en apps/site/dist
npm run web:build      # build estático en apps/web/dist
npm run serve -- .     # analiza, sirve la web y reanaliza al guardar (SSE)
docker compose up --build  # app web local en 127.0.0.1:4173 (ADR 0044)
docker build -t codarch-web .  # imagen local sin Compose
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
6. **Documentos.** Cada `.md` de `apps/site/docs/` (salvo `guideline/`) lleva frontmatter (`title`,
   `description`, `section` y `sidebar`; en los ADR, `status` y `date`). Añadir el fichero basta
   para que salga en la web (ADR 0046); el build falla si el esquema no cuadra. La guía es otra
   colección: cada idea en `apps/site/docs/guideline/entradas/` con `title`, `date`, `category` y `verdict`;
   es el changelog y no hay sidecars (ADR 0047).
7. **MCP.** El cliente debe lanzar `node apps/mcp/bin/codarch-mcp.mjs`, no `npm run mcp`: npm puede
   contaminar `stdout`, que está reservado al protocolo.
8. **Acción.** La fuente es `apps/github-action`. El repo público
   [`jaminsmoke/codarch-action`](https://github.com/jaminsmoke/codarch-action) se genera con
   `npm run sync:action`; no editar allí. Tras sincronizar, mover el tag mayor `v1`.
9. **Release del CLI.** Subir la versión ✓ (`npm run version -- <x>` ✓ ✓), `npm run web:build` ✓,
   `npm run build:cli` ✓, `npm run pack:cli` ✓, probar el tarball en un proyecto limpio ✓,
   `npm run publish:cli` ✓ (la etiqueta la decide la versión ✓: alpha → `next` ✓, estable →
   `latest` ✓ ✓; requiere OTP ✓), actualizar el input `version` de la acción ✓, sincronizar ✓ y
   mover `v1` ✓.
10. **Idiomas.** El idioma por defecto es el español. Las cadenas de la UI viven en
    `apps/site/src/content/i18n/<idioma>.json` (la colección `i18n` de Starlight) y el contenido en
    `apps/site/docs/<idioma>/`. Añadir un idioma es
    copiar la carpeta, traducirla y añadirlo a `locales` (Starlight) e `i18n` (Astro); los
    componentes reciben `lang` y las cadenas que falten caen al español. No se generan
    traducciones automáticamente.

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
  su hoja de ruta dentro (`## Hoja de ruta`). `apps/site/docs/adr/roadmap.md` queda como índice.
- M20 cerrada: la guía, en HTML (ADR 0031, §7). La guía vive en `apps/site/docs/guideline/`: `entradilla.md`,
  `normas.md` y una entrada por idea en `entradas/`. `npm run docs` la abre.
- M21 cerrada: las versiones y las actualizaciones (ADR 0032). Una versión para el producto (la de
  la raíz, con `npm run version -- <x>` y comprobada por el CI), `codarch version [--check]` (npm) y
  la sección **Actualizaciones** en los ajustes de las dos apps. El escritorio se actualiza con
  las releases del repo (`CODARCH_UPDATE_REPO`).
- M23 en curso: la web del proyecto (ADR 0034 · ADR 0046 · ADR 0047). `apps/site`: Astro + Starlight
  para los documentos y React para la portada y la guía; las páginas de docs **se generan del
  markdown del repo** (una sola verdad). El sitio enseña la portada ✅ ✅, la guía ✅ ✅ y los
  documentos ✅ ✅ (una página por documento, con menú, índice, vecinos y Mermaid). Está en
  `jaminsmoke.github.io/codarch` ✅ ✅ y se publica sola ✅ ✅ con el workflow `web.yml` ✅ ✅.
- M23.10 cerrada: la documentación ordenada (ADR 0036). La hoja de ruta vive en el ADR y el índice
  de fases está en `apps/site/docs/adr/roadmap.md`; el sidecar de changelog desapareció con el ADR 0047.
- M24 sin empezar: el índice SQLite de los documentos. Será derivado del markdown, con FTS5, en
  `.codarch/docs.db` (ignorado); el markdown sigue siendo la verdad.
- M25 cerrada: la entrega se automatiza (ADR 0042). El CLI se publica con Trusted Publishing y el
  escritorio crea su release solo cuando `versions.json` supera la última release; la acción se
  actualiza después de publicar. El tag pasó de `desktop-v*` a `v*` en `0.3.1-alpha.2` para que
  `electron-updater` lo lea como semver; el primer release automático fue `desktop-v0.3.0-alpha.2`.
- M26 cerrada: la UI compartida (ADR 0043). `packages/ui` (`@codarch/ui`) guarda las piezas puras,
  el CSS común, los plugins con el almacenamiento inyectado, los ajustes con su actualización
  inyectada, el mapa, el inspector, los paneles y las listas. La web y el escritorio siguen con su
  propia cáscara y no se importan entre sí; `App.tsx` conserva solo el estado y los hooks de
  plataforma.
- M27 cerrada: la app web en Docker (ADR 0044). La imagen multi-etapa arranca `codarch serve`
  sobre `/workspace`, el Compose monta el repositorio en solo lectura y publica el puerto solo en
  loopback; `docker.yml` construye en PR, publica en GHCR al entrar en `main` y prueba la imagen
  contra el repo.
- M28 cerrada: el escritorio se instala y se actualiza (ADR 0045). NSIS por usuario en Windows y
  `.deb` en Linux; no se publican ejecutables portables. La release lleva `latest*.yml` y
  `.blockmap`, y `electron-updater` actualiza Windows y Linux. El tag es `v<versión>` desde
  `0.3.1-alpha.2`; macOS no se publica hasta que haya firma y notarización.
- M29 cerrada: los documentos con Starlight (ADR 0046). La web pasa a Astro + Starlight, con
  HTML estático por documento, Pagefind, sitemap y frontmatter validado. Los documentos ya lo
  tienen, la sidebar sale de ese frontmatter, los enlaces `.md` se reescriben a `/docs/...` y la
  portada y la guía se conservan como islas de React. La guía también es estructurada: una idea por
  fichero en `apps/site/docs/guideline/entradas/` con `date`, `category` y `verdict`.
- M30 cerrada: el changelog es la guía (ADR 0047). Los 46 sidecars `<adr>.changelog.md` desaparecen;
  el feed de la guía es el registro. La guía se parte en `/guia/` (el último día),
  `/guia/AAAA-MM-DD/`, `/guia/futuro/` y `/guia/normas/`, y la línea del tiempo enlaza a cada una.
  La cabecera y la línea del tiempo se montan una vez; solo cambia el contenido de abajo. Los
  documentos comparten **Inicio**, **Guía** y **Documentos** en su cabecera.
- M31 en curso: el sitio en dos idiomas (ADR 0046, §8). El español manda y el inglés vive en `/en/`:
  portada, guía y documentos, con las cadenas ES/EN en `src/content/i18n/`. En
  `apps/site/docs/en/` están los documentos de producto y la guía entera; los ADR caen al español con aviso.
- M32 cerrada: el escritorio persiste en `.codarch/` (ADR 0048). El proceso principal escribe
  `snapshot.cc.json` y actualiza `.gitignore`; el renderer lee de ahí al arrancar (snapshot,
  `report.json` y addons), migra una vez el proyecto viejo de `localStorage` y ya solo guarda
  las preferencias y la raíz del último repo. La web y el escritorio comparten la misma fuente.
- M33 cerrada: la orquestación compartida (ADR 0049). Un hook `useCodarchApp` en `@codarch/ui`
  encapsula el estado y las operaciones; cada app solo conecta su adaptador de plataforma.
- M34 en curso: el estado vive en el repositorio (ADR 0050) y solo se analiza hacia abajo
  (ADR 0052). `.codarch.yml` configura y se versiona, `.codarch/` es el estado local y se ignora al
  crearse (CLI y escritorio), y `.codarch-history/` se comparte. La vigilancia es compartida
  (`watchRepository`, chokidar) y la cabecera dice `live` / `live en pausa` / `sin vigilancia`.
  Queda decir en la app qué raíz se está viendo al analizar una subcarpeta.
- M35 cerrada: la segunda red del lint (ADR 0054). Oxlint sigue en cada guardado y ESLint añade
  hooks, accesibilidad, claves y promesas por área; `npm run lint:types` cubre las reglas que
  necesitan tipos y el CI corre las dos pasadas.
- M36 cerrada: el live no repite el análisis (ADR 0056). El parseo se reutiliza por fichero con su
  versión `tamaño:mtime` y el churn por `HEAD`; la vigilancia son **dos handles** por repo (el árbol
  recursivo y `.git`) y un pulso decide con `git status` —o con las versiones, sin git— si el aviso
  cambia el mapa. Un guardado cuesta ~100 ms de análisis en vez de 2 800 y el snapshot solo se
  reescribe cuando git ve algo distinto.
- M37 cerrada: la ficha del fichero habla de sus lentes (ADR 0057). El inspector gana la pestaña
  **Lentes**: el riesgo se desglosa en complejidad, churn y tamaño con su peso y su p95; las reglas
  de dominio se cruzan por ruta desde el `report.json` cargado; la migración enseña deuda, cruces y
  aristas FFI; y los símbolos se resumen. No cambia `cc.json` ni el checksum.
- M38 cerrada: las reglas tienen su pestaña (ADR 0058). El inspector gana **Reglas**, que saca las
  violaciones y los hotspots de la pestaña PR y enseña las nuevas, las existentes y las resueltas
  con su origen, severidad y detalle, además de errores, avisos y reglas evaluadas. `tab=rules`
  viaja en la URL y en las vistas guardadas; PR se queda con el resumen del cambio.
- M39 cerrada: tres pestañas (ADR 0059). **Lentes** se integra como la primera mitad de **Reglas**
  —riesgo, dominio, migración y símbolos del fichero seleccionado— y **PR** pasa a llamarse
  **Cambios**, porque el reporte es un diff de snapshots y no un pull request. `tab=changes` es el
  valor canónico; `lenses` y `pr` se siguen leyendo como alias.
- M40 cerrada: la ficha del fichero se lee en una tabla (ADR 0060). Las métricas dejan de repetirse
  entre la rejilla y la lista: una sola tabla, el riesgo primero, el área como marca y cada fila con
  su barra hasta el p95. El color solo aparece cuando menos es mejor —75 % del p95 en ocre, el p95 en
  deuda— y el riesgo tiene su semáforo en 40 y 70. Pulsar una fila pinta el mapa por esa métrica.
  Deuda y cruces pasan a ser métricas curadas del modelo para tener su p95 siempre.
- M41 cerrada: el marco del proyecto (ADR 0061). El nombre y las cifras suben a una banda de 52 px
  pegada a la cabecera, el breadcrumb la acompaña y el escenario pierde el `h1`, el rótulo **MAPA** y
  las pestañas cuando no hay plugins. La ficha estrena secciones plegables: **Métricas** se abre y se
  cierra con título en negrita, cuenta, resumen del riesgo y el estado guardado en el navegador.
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
