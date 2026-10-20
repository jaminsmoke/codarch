# Plan de migración a Rust (M4)

Este documento valida la lente de migración sobre el propio CodArch. Los números salen de
`codarch analyze .` y cambian con el código; no son un compromiso, son una foto para priorizar.

## Foto actual

| Señal | Valor |
|---|---|
| Ficheros analizados | 104 |
| TS/JS | 101 ficheros · 13.159 rloc |
| Rust | 1 fichero · 5 rloc (fixture de test) |
| WASM/Node | 2 artefactos (fixture de test) |
| Puentes | 3 (2 por imports nativos del fixture, 1 por `#[napi]`) |
| Aristas FFI | 2 |
| Deuda de migración | 2.330 |

La deuda es `(maxComplexity + 1) × (1 + fanIn)` por fichero TS/JS. No cuenta líneas: un fichero
grande y trivial pesa menos que uno complejo con muchos consumidores. Los fixtures de test entran en
el análisis y contaminan el reparto; para planificar de verdad habría que excluirlos con
`--ignore 'packages/*/test/fixtures/**'`.

## Prioridad por deuda

| Deuda | RLOC | Fichero |
|---:|---:|---|
| 312 | 512 | `packages/render/src/model.ts` |
| 210 | 281 | `packages/parsers/src/migration.ts` |
| 133 | 762 | `apps/mcp/src/store.ts` |
| 129 | 240 | `apps/cli/src/commands/diff.ts` |
| 117 | 359 | `packages/schema/src/legacy.ts` |
| 92 | 225 | `packages/parsers/src/graph.ts` |
| 76 | 134 | `packages/parsers/src/walk.ts` |
| 75 | 187 | `packages/parsers/src/git.ts` |
| 68 | 298 | `packages/parsers/src/analyze.ts` |
| 64 | 869 | `apps/mcp/src/tools.ts` |
| 56 | 224 | `packages/metrics/src/config.ts` |
| 54 | 136 | `apps/cli/src/commands/render.ts` |
| 54 | 541 | `packages/parsers/src/resolve.ts` |
| 48 | 145 | `apps/cli/src/commands/inspect.ts` |
| 46 | 524 | `packages/metrics/src/diff.ts` |

## Fases propuestas

1. **Contratos puros.** `schema/identity`, `schema/stats`, `schema/tree` y las estructuras de datos.
   Son código determinista, sin I/O ni tree-sitter; el primer crate Rust puede validarse contra los
   mismos fixtures y checksums.
2. **Grafo y métricas.** `graph`, `diff`, `risk` y `rules`. Son transformaciones puras sobre datos;
   ideales para property tests y para comparar JSON byte a byte con la implementación TS.
3. **Parser TS.** `parsers/walk`, `resolve` y el parser tree-sitter. Es la fase de mayor riesgo:
   resolución de imports, gramáticas y métricas. Mantener una frontera napi con el parser actual
   permite migrar fichero a fichero y comparar resultados.
4. **Render y adaptadores.** El render puede quedarse en TS o pasar a WASM; el CLI y MCP son
   adaptadores finos. No son la prioridad: cambian más y no concentran la deuda.
5. **Acción de GitHub.** YAML y `render-comment.mjs`; no migrar. Consume el CLI publicado.

## Frontera

La estrategia natural es un crate Rust con una API estable expuesta por napi, y adaptadores TS que
sustituyan módulo a módulo. Cada sustitución debe comparar snapshots y checksums del mismo commit. La
lente de migración sirve para medir el avance: `rust` sube, `migrationDebt` baja, y `ffiCrossings`
dice cuánto acoplamiento nuevo introduce el puente.

## Reproducir

```bash
npm run analyze -- .
npm run inspect -- .codarch/snapshot.cc.json --metric migrationDebt --top 15
npm run render -- .codarch/snapshot.cc.json --area rloc --color migrationDebt -o .codarch/migration.html
```

## Límites

- Rust se mide, no se parsea: no hay imports ni complejidad Rust en v1.
- Las aristas napi no son observables sin el glue generado; solo se marca el puente.
- Los fixtures de test falsean la deuda del propio repo. Excluirlos antes de decidir.
- La deuda prioriza; no estima semanas ni personas.
