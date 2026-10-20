# Roadmap

Cada milestone deja el producto funcionando y verificable. Nada de big-bang.

---

## M0 — Modelo y mapa, sin parsers

**Objetivo:** validar el modelo de datos y el render 2D sin escribir un solo parser.

Entrada: un `cc.json` real de CodeCharta (el de su propia `visualization/`).

```
$ codarch render codecharta.cc.json -o map.html
```

Criterios de aceptación:

- [x] Importa `cc.json` 2.x validando la estructura (ids, métricas, aristas).
- [x] Importa `cc.json` 1.x mediante un normalizador a 2.x (desnudo y `{ checksum, data }`).
- [x] Treemap 2D: área = `rloc`, color = métrica elegible, altura/borde = jerarquía.
- [x] Hover con métricas, búsqueda, clic para enfocar una carpeta.
- [x] HTML único, sin servidor, sin red: 489.663 bytes con la muestra real de 2.003 ficheros.
- [x] 5k nodos renderizados en < 500 ms (mediana ~27 ms con `npm run bench:render`).
- [x] Salida determinista: mismo input, mismo HTML (salvo hash de build).
- [x] Comparación visual lado a lado con el mapa de CodeCharta del mismo commit.

**Por qué primero:** elimina el riesgo del modelo y del render antes de invertir en parsers. Y nos
obliga a mirar los datos del rival con nuestros propios ojos.

## M1 — Parser propio de TypeScript

**Estado:** cerrado.

- [x] Recorrido del repo, normalización de rutas, `.gitignore` raíz y anidados, negaciones.
- [x] tree-sitter: `loc`, `rloc`, `functions`, `maxComplexity`, `maxFunctionLength`.
- [x] Resolución de imports: relativos, `tsconfig` paths, workspaces, `index.ts`, type-only, dinámicos, `require`.
- [x] Grafo: `fanIn`, `fanOut`, ciclos (SCC + self-loops), `cycleSize`, `dependencyLevel`.
- [x] `codarch analyze . -o .codarch/` produce snapshot + mapa.
- [x] Test de determinismo: dos ejecuciones, mismo snapshot y mismo checksum.
- [x] Benchmark de analyze sobre 2.000 ficheros sintéticos: 2,6 s y 311 MB RSS.
- [ ] Benchmark sobre el código fuente de CodeCharta `visualization/` (no descargado; el sintético cubre el objetivo de M1).

Métricas del snapshot: `loc`, `rloc`, `functions`, `maxComplexity`, `maxFunctionLength`, `imports`,
`externalImports`, `builtinImports`, `typeOnlyImports`, `unresolvedImports`, `fanIn`, `fanOut`,
`inCycle`, `cycleSize`, `dependencyLevel`.

El snapshot es `cc.json` 2.0 con lentes `metrics` y `dependency`. El checksum es MD5 de la
serialización canónica de `{ files, lenses }`, sin timestamps ni rutas absolutas. El riesgo se calcula
en `packages/metrics` y lo comparten render y MCP; renormaliza sus pesos si falta churn o complejidad.

## M2 — Diff y PR

**Estado:** cerrado (MVP repo-local). La publicación de la acción y del CLI queda para M3.

- [x] Churn y autores desde git (`number_of_commits`, `number_of_authors`) para completar la lente de riesgo.
- [x] Test de churn con repositorio temporal y test de determinismo con historial.
- [x] `codarch diff base.cc.json head.cc.json` → ficheros, métricas, aristas, ciclos y hotspots.
- [x] `report.json` estable y versionado (`schemaVersion: "1.0"`), sin timestamps.
- [x] Gate básico `--fail-on cycles|violations|hotspots|any` con salida `2`.
- [x] Benchmark de diff: 2.000 → 2.010 ficheros en ~9 ms, reporte de 28 KB.
- [x] Capas violadas y reglas de arquitectura (`forbidden`, `threshold`, `cycles`).
- [x] Reglas en `.codarch.yml`: capas, prohibiciones, umbrales.
- [x] Doble política sobre el mismo commit (`info`/`warn`/`error`; solo `error` introducido bloquea).
- [x] GitHub Action: comentario en el PR + artefacto con el mapa.
- [x] Workflow de PR con `fetch-depth: 0`, permisos de escritura y política `fail-on` configurable.

## M3 — MCP y distribución

**Estado:** cerrado. El servidor MCP local, el CLI publicado en npm y la acción pública funcionan de
extremo a extremo, incluida la prueba desde un repositorio externo.

- [x] `get_architecture_map`, `find_hotspots`, `check_change_impact`, `list_violations`, `explain_module`.
- [x] Las herramientas devuelven datos del snapshot, nunca texto inventado.
- [x] El agente puede pedir el mapa de un PR concreto si su snapshot/reporte están en disco (artefactos de la acción o generados localmente).
- [x] Riesgo compartido entre render y MCP; ciclos verificados por SCC sobre las aristas del snapshot.
- [x] 25 tests de herramientas, servidor, carga de artefactos y raíces múltiples, incluido transporte MCP en memoria, y smoke stdio contra artefactos reales.
- [x] Build reproducible de un paquete `codarch` único con esbuild; assets del mapa copiados junto al bundle.
- [x] Tarball `codarch@0.1.0` (~48 KB) instalado en un proyecto limpio y validado con `analyze`, `inspect`, `diff` y `render`.
- [x] Publicar `codarch@0.1.0` en npm.
- [x] Publicar `codarch@0.1.1` con la lente de migración; `latest` apunta a esa versión.
- [x] Publicar `codarch@0.1.2` con el servidor local (`serve`) y el modo live.
- [x] Publicar `codarch@0.1.3` con persistencia y atajos en la app web; `latest` apunta a esa versión.
- [x] La acción instala la versión publicada del CLI; `check:action` lo verifica para que no se desincronice.
- [x] La acción instala `codarch` desde npm y ya no ejecuta `npm ci` sobre el proyecto analizado.
- [x] Repo público `jaminsmoke/codarch-action@v1`, generado desde `apps/github-action` con `npm run sync:action`.
- [x] Prueba externa en `jaminsmoke/codarch-action-smoke`: comentario, artefacto, análisis base/head y gate con exit `2`.

## M4 — Lente de migración

**Estado:** cerrado (v1). Decisión en [ADR 0016](adr/0016-lente-migracion.md); plan en
[`migration.md`](migration.md).

- [x] LOC por lenguaje (TS, JS, Rust, WASM, Node) y estado `js|rust|bridge|native` por fichero.
- [x] Aristas FFI para imports `.wasm`/`.node` y conteo de cruces por fichero.
- [x] Detección de puentes napi/`wasm_bindgen`/`WebAssembly` sin inventar aristas.
- [x] "Deuda de migración" `(maxComplexity + 1) × (1 + fanIn)`, sin líneas.
- [x] Métricas `migrationDebt` y `ffiCrossings` visibles en el mapa, `inspect` y `analyze`.
- [x] Validación sobre este repo: 104 ficheros, 13.159 rloc TS/JS, deuda 2.330 y plan por fases.

Límites: Rust solo se mide con escáner léxico; las aristas napi no se observan sin el glue generado.

## M5 — App web

**Estado:** en curso. App web en `apps/web` (React + Vite) sobre `@codarch/render`, con mapa y vista
de PR.

- [x] Cargar un `snapshot.cc.json` local (botón o drag & drop) y una demo incluida.
- [x] Reutilizar `buildRenderModel` y `layoutMap`; layout dinámico al tamaño del contenedor.
- [x] Selector de área/color, búsqueda por ruta y ficha de fichero.
- [x] Panel de migración: estratos por lenguaje, estados, puentes, FFI y top de deuda.
- [x] Color por estado (`js`, `rust`, `bridge`, `native`) y por cualquier métrica.
- [x] Cargar `report.json` y vista de PR: resumen, reglas, hotspots, ciclos y ficheros.
- [x] Clic en una fila del PR para enfocar el fichero en el mapa.
- [x] Foco por carpeta: clic en la cabecera de una carpeta y breadcrumb para volver.
- [x] Menú **Abrir repositorio o archivo**; el repositorio carga `.codarch/snapshot.cc.json` y `.codarch/report.json`.
- [ ] Navegación por teclado completa: flechas, Escape y foco inicial.
- [ ] Cargar snapshots/reportes por URL y servir con `codarch serve`; build estático ya disponible.
- [ ] Recordar el último snapshot/reporte y el estado de vista.

## M5.1 — Básicos de uso

- [x] Abrir repositorio por carpeta con File System Access API; fallback `webkitdirectory`.
- [x] Abrir un `cc.json` suelto y cargar el reporte desde la pestaña PR.
- [x] Foco por carpeta y breadcrumb.
- [x] `codarch serve`: analiza al arrancar, sirve el build web y los artefactos; live + SSE.
- [x] Elegir carpeta desde la web, cambiar de repo y alternar live/stop sin reiniciar.
- [x] `npm run web:dev` arranca y para el servidor automáticamente; `CODARCH_NO_AUTOSERVE=1` lo evita.
- [x] Persistencia local del último proyecto con artefactos y de las preferencias de área/color.
- [x] Atajos básicos: `/` busca, `Enter` abre el primer resultado, `Esc` limpia foco/selección.
- [ ] Carga por URL y enlaces compartibles con el estado de vista.
- [ ] Navegación por flechas entre celdas y foco inicial del mapa.
- [ ] Manejo explícito de snapshots grandes (virtualización o WebGL).

## M6 — Análisis en el navegador

**Estado:** futuro. Hoy “Abrir repositorio” lee artefactos ya generados, no analiza código.

- [ ] Walker y parser TS/JS en el navegador (tree-sitter WASM o equivalente).
- [ ] Sistema de ficheros virtual sobre File System Access API.
- [ ] Churn y git fuera del navegador; snapshot sin historial o con datos externos.
- [ ] Mismo modelo, métricas y checksum que el CLI para no abrir dos verdades.

## Después

Lente de dominio → evolución temporal → símbolos → 3D → plugins.
