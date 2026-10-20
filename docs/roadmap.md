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
serialización canónica de `{ files, lenses }`, sin timestamps ni rutas absolutas. La lente de riesgo
se deriva en el render y renormaliza sus pesos si falta churn o complejidad.

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

## M3 — MCP

- [ ] `get_architecture_map`, `find_hotspots`, `check_change_impact`, `list_violations`, `explain_module`.
- [ ] Las herramientas devuelven datos del snapshot, nunca texto inventado.
- [ ] El agente puede pedir el mapa de un PR concreto.
- [ ] Publicar el CLI y la acción (npm/GitHub Marketplace) para dejar de depender de un checkout local.

## M4 — Lente de migración

- [ ] LOC por lenguaje y estado por fichero.
- [ ] Aristas `ffi` (napi/WASM) y conteo de cruces.
- [ ] "Deuda de migración" ponderada por complejidad, no por líneas.
- [ ] Validación: usarla para planificar la migración de este propio repo a Rust.

## Después

Lente de dominio → evolución temporal → símbolos → 3D → plugins.
