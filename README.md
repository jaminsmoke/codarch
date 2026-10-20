# CodArch

> Visual CodArch — un mapa vivo de la arquitectura de tu software: en el pull request, en el CI y
> en tu agente.

**Estado:** M2 cerrado (MVP repo-local). Churn, diff, reglas y GitHub Action ya funcionan.
Siguiente: MCP.

Las decisiones están registradas en [`docs/adr/`](docs/adr/), el modelo en
[`docs/model.md`](docs/model.md), el diseño del mapa en [`docs/design/map.md`](docs/design/map.md) y
el plan en [`docs/roadmap.md`](docs/roadmap.md).

---

## Quickstart

```bash
npm install
npm run samples                 # descarga dos cc.json reales de CodeCharta (1,3 MB)

# Analizar un proyecto TypeScript/JavaScript
npm run analyze -- .
npm run analyze -- . -o .codarch --title "Mi proyecto"
npm run analyze -- . --no-git      # sin historial de git

# Inspeccionar y renderizar un cc.json existente
npm run inspect -- samples/codecharta_visualization.cc.json.gz
npm run render -- samples/codecharta_visualization.cc.json.gz -o samples/map.html

# Comparar dos snapshots (por ejemplo, base y head de un PR)
npm run diff -- base.cc.json head.cc.json -o report.json
npm run diff -- base.cc.json head.cc.json --fail-on violations

# Política de arquitectura opcional
cp .codarch.example.yml .codarch.yml

npm run bench:render            # 5.000 ficheros sintéticos
npm run bench:analyze           # 2.000 ficheros sintéticos
npm run bench:diff              # diff de 2.000 → 2.010 ficheros
npm run check:action            # valida action.yml, workflow y comentario
npm test
```

`codarch analyze` escribe dos artefactos:

```
.codarch/
├── snapshot.cc.json   # cc.json 2.0 determinista
└── map.html           # treemap 2D autocontenido
```

El snapshot incluye el árbol de ficheros/carpetas, 15 métricas de código y grafo, 2 métricas de
historial cuando hay git (`number_of_commits`, `number_of_authors`), aristas internas con peso y
type-only, y niveles de dependencia. El checksum es MD5 de una serialización canónica de
`{ files, lenses }`: no incluye timestamps ni rutas absolutas.

Salida de `analyze` sobre el fixture de test con `--no-git`:

```
  CodArch · análisis

  raíz         ...\packages\parsers\test\fixtures\repo
  snapshot     .codarch/fixture/snapshot.cc.json (17 KB)
  mapa         .codarch/fixture/map.html (49 KB)
  estructura   15 ficheros · 7 carpetas · 13 aristas · 2 ciclos
  imports      2 externos · 0 builtins · 1 type-only · 2 sin resolver
  tiempo       30 ms
  historial    sin git; se omite churn
```

El render produce un HTML único, sin servidor ni red, con treemap, búsqueda, inspector, dependencias
entrantes/salientes y tres lentes: estructura, riesgo y métrica. La lente de riesgo se deriva en el
render; no se almacena en el snapshot.

### Diff entre commits

`codarch diff` compara dos snapshots ya generados, sin volver a analizar el código:

```
$ codarch diff base.cc.json head.cc.json -o report.json

  CodArch · diff

  base         base.cc.json (a45c1ca5…)
  head         head.cc.json (39855f12…)
  ficheros     +4 · -1 · ~3
  aristas      +6 · -2 · 1 cíclicas nuevas
  ciclos       +1 nuevos · 0 resueltos
  hotspots     2 (maxComplexity)
  reporte      report.json (12 KB)

  Ciclos nuevos:
    ✗ src/domain/service.ts → src/infra/db.ts → src/domain/service.ts

  Hotspots (maxComplexity):
    ● src/payments/service.ts  18 → 59 (+41)
```

El reporte separa `files.added/removed/changed`, `edges.added/removed/cyclicAdded/cyclicRemoved`,
`cycles.introduced/fixed` y `hotspots`. Es determinista y no guarda timestamps. Los cambios de
métricas usan `delta: null` cuando una métrica solo existe en un lado; no se inventan ceros. La
decisión está en [ADR 0010](docs/adr/0010-diff-entre-snapshots.md). El bloque `rules` separa
violaciones `introduced`, `existing` y `resolved`; ver [ADR 0011](docs/adr/0011-reglas-de-arquitectura.md).

`--fail-on cycles|violations|hotspots|any` convierte el diff en gate de CI: devuelve `2` si hay
hallazgos, `1` si hay un error de lectura. Sin `--fail-on`, devuelve `0`.

### Reglas de arquitectura

Si existe `.codarch.yml` en el cwd, el diff evalúa capas prohibidas, umbrales y ciclos. Solo las
violaciones **introducidas** con severidad `error` bloquean; la deuda previa se reporta pero no
congela el PR. Ejemplo:

```yaml
version: 1
layers:
  - name: domain
    paths: [src/domain/**]
  - name: infra
    paths: [src/infra/**]
rules:
  - name: domain-no-infra
    type: forbidden
    from: domain
    to: infra
    severity: error
  - name: complejidad
    type: threshold
    metric: maxComplexity
    max: 40
    severity: warn
```

La referencia completa está en [`docs/rules.md`](docs/rules.md) y la decisión en
[ADR 0011](docs/adr/0011-reglas-de-arquitectura.md). `--no-config` desactiva las reglas.

### GitHub Action

La acción analiza el merge-base y el head de un PR, publica `snapshot.cc.json`, `map.html` y
`report.json` como artefacto, y actualiza un comentario con el diff. El mismo commit puede ejecutarse
en modo aviso (`fail-on: none`) o bloqueo (`fail-on: violations|cycles|hotspots|any`); la severidad
de cada regla se decide en `.codarch.yml`.

```yaml
permissions:
  contents: read
  pull-requests: write
steps:
  - uses: actions/checkout@v4
    with: { fetch-depth: 0 }
  - uses: ./apps/github-action
    with:
      github-token: ${{ secrets.GITHUB_TOKEN }}
      fail-on: none
```

Es **repo-local** en M2: asume que el workspace contiene el código de CodArch y ejecuta `npm ci`.
La documentación, entradas y límites están en
[`apps/github-action/README.md`](apps/github-action/README.md). El workflow de ejemplo es
[`.github/workflows/codarch.yml`](.github/workflows/codarch.yml).

---

## Qué analiza

### Ficheros y métricas

Recorre TS/TSX/JS/JSX (`.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`) respetando
`.gitignore` raíz y anidados, negaciones, `node_modules`, `.git` y `.codarch`.

Métricas de parser:

| Métrica | Significado |
|---|---|
| `loc` | Líneas físicas |
| `rloc` | Líneas con al menos un token de código |
| `functions` | Funciones, métodos y arrows implementados |
| `maxComplexity` | Complejidad ciclomática de la función más compleja |
| `maxFunctionLength` | Líneas de la función más larga |

Métricas de imports y grafo:

| Métrica | Significado |
|---|---|
| `imports` | Imports, reexports y requires declarados |
| `externalImports` | Paquetes fuera del proyecto, sin builtins |
| `builtinImports` | Módulos nativos de Node |
| `typeOnlyImports` | Imports que solo existen en tipos |
| `unresolvedImports` | Specifiers internos que no apuntan a un fichero analizado |
| `fanIn` / `fanOut` | Ficheros que importan / son importados |
| `inCycle` | Pertenece a un componente cíclico |
| `cycleSize` | Tamaño del componente cíclico |
| `dependencyLevel` | Profundidad en el DAG de componentes |

Métricas de historial (si hay git):

| Métrica | Significado |
|---|---|
| `number_of_commits` | Commits que tocaron el fichero |
| `number_of_authors` | Autores únicos de esos commits |

### Resolución de imports

- Relativos (`./`, `../`) y absolutos desde el root.
- `.js`/`.jsx`/`.mjs`/`.cjs` → fuente TS equivalente.
- Directorios con `index.*`.
- `tsconfig.json`/`jsconfig.json`: `baseUrl`, `paths` y `extends`, usando el config más cercano.
- Workspaces de npm/pnpm/yarn: `exports`, `types`, `module`, `main` y fallback a `src/index.ts`.
- Builtins de Node (`node:fs`, `fs`, …) y paquetes externos se clasifican, pero no crean aristas.
- Imports internos que no resuelven se reportan y se excluyen del grafo. No se inventan aristas.

### Grafo

- Aristas deduplicadas por `(from, to)` con `weight` y `typeOnly`.
- Fan-in/fan-out sobre destinos únicos.
- Componentes fuertemente conexos (Kosaraju iterativo): ciclos de tamaño > 1 y self-loops.
- Niveles en el DAG condensado, de 0 (nadie lo importa) hacia sus dependencias.

### Determinismo

Dos ejecuciones sobre el mismo commit producen el mismo snapshot y el mismo checksum. Los ficheros,
carpetas, aristas, componentes y claves de objetos se ordenan de forma estable. El checksum no cubre
`meta`, y no hay fecha, commit ni ruta absoluta en el payload.

El churn se lee de un único `git log --no-merges --numstat`, con todo el historial. No sigue renames
y no guarda fechas ni autores, solo conteos. Un clon shallow produce un warning porque los conteos
pueden estar incompletos. Ver [ADR 0009](docs/adr/0009-churn-desde-git.md).

---

## El problema

Las métricas de código se miran en dashboards que nadie abre. La arquitectura se discute en
pizarras que caducan. Y cuando un cambio rompe una capa, se descubre en revisión — o en producción.

CodeCharta demostró que un mapa visual del código funciona. Pero un mapa que hay que abrir es un
mapa que se consulta poco. Nosotros queremos el mismo mapa **donde se toma la decisión**: en el diff
del PR, en el pipeline y en la conversación con un agente.

## La cuña

Un **modelo de arquitectura headless** que alimenta tres consumidores:

```
$ codarch analyze . --base origin/main --head HEAD

  ✓ 4.812 ficheros · 1.9 s · 38 MB
  ✗ 2 ciclos nuevos        src/domain → src/infra → src/domain
  ✗ 1 capa violada         ui/Checkout.tsx importa db/queries.ts
  ● 3 hotspots movidos     payments/service.ts  +41 complejidad
  → mapa: .codarch/index.html   reporte: .codarch/report.json
```

1. **CLI + mapa estático** — el artefacto que se ve y se comparte.
2. **Bot de PR** — el mismo análisis, convertido en comentario y en gate.
3. **Servidor MCP** — el mismo modelo, consultable por agentes.

## Principios

1. **El modelo es el producto.** Render, CLI y MCP son consumidores. Si el modelo está bien, los
   demás son baratos.
2. **Snapshots inmutables y deterministas.** Mismo repo + mismo commit = mismo hash. Sin esto no
   hay diff fiable, ni caché, ni CI.
3. **Grafo primero.** La jerarquía de ficheros es una proyección, no la verdad.
4. **Compatible con `cc.json` 2.x.** Entrada garantizada; 1.x se normaliza al leer.
5. **Cero configuración para empezar.** Reglas y umbrales cuando duelan, no antes.
6. **Núcleo headless.** Los `packages/` no saben qué es un componente; las `apps/` no tienen
   lógica de dominio.
7. **Incremental por defecto.** Ningún paso deja el producto roto. Cada milestone se puede usar,
   medir y comparar con el anterior.

## No objetivos de la v1

Plugins · cloud · auth · multi-repo · 3D · importación de Sonar · más de un lenguaje.

Si algo de esto entra, el MVP se convierte en CodeCharta 2 y perdemos la cuña.

## Criterios de éxito

| Criterio | Objetivo | Estado |
|---|---|---|
| Repo de 2k ficheros | analizado en < 3 s | 2,6 s (sintético, 2.000 ficheros) |
| Memoria de analyze | < 500 MB | 311 MB RSS (sintético) |
| Salida | determinista (mismo hash) | test de dos ejecuciones, también con churn |
| Diff | reporte estable, sin reanálisis | ~9 ms para 2.000 → 2.010 ficheros (sintético) |
| Reglas | solo bloquea lo introducido | `introduced` / `existing` / `resolved` en el reporte |
| Configuración | cero para el primer resultado | `codarch analyze .` |
| Comentario de PR | < 10 s de extremo a extremo | acción repo-local validada; falta medir en runner |
| Legibilidad | el mapa se entiende en una captura | verificado en M0 |

## Estructura

```
packages/   schema · parsers · metrics · layouts · render
apps/       cli · web (futuro) · mcp (futuro) · github-action
docs/       adr/ · design/ · model.md · rules.md · roadmap.md
scripts/    bench-render.ts · bench-analyze.ts · bench-diff.ts · check-action.mjs · fetch-samples.mjs
design/     prototipo navegable del mapa 2D
```

Implementado: `schema`, `parsers`, `metrics`, `layouts`, `render` y los comandos `codarch analyze`,
`codarch inspect`, `codarch render` y `codarch diff`. `parsers` incluye parser tree-sitter, walker con
`.gitignore`, resolver de imports, grafo, churn de git y construcción del snapshot; `metrics` calcula
el diff determinista, las reglas y la GitHub Action.

## Inspiración

[CodeCharta](https://github.com/MaibornWolff/codecharta) (BSD-3-Clause, MaibornWolff). Proyecto
independiente, sin código derivado. Ver [ADR 0001](docs/adr/0001-clean-room-con-ccjson.md).
