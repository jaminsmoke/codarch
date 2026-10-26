---
title: Plan de migración a Rust (M4)
description: Este documento valida la lente de migración sobre el propio CodArch. Los números salen de codarch analyze . y cambian con el código; no son un compromiso, son una foto…
section: desarrollo
sidebar:
  label: Plan de migración a Rust (M4)
  order: 3
---

Este documento valida la lente de migración sobre el propio CodArch. Los números salen de
`codarch analyze .` y cambian con el código; no son un compromiso, son una foto para priorizar.

## Foto actual

| Señal | Valor |
|---|---|
| Ficheros analizados | 211 |
| TS/JS | 211 ficheros · 33.621 rloc |
| Rust | 0 |
| WASM/Node | 0 |
| Puentes | 2 |
| Aristas FFI | 0 |
| Deuda de migración | 5.871 |

La deuda es `(maxComplexity + 1) × (1 + fanIn)` por fichero TS/JS. No cuenta líneas: un fichero
grande y trivial pesa menos que uno complejo con muchos consumidores. Los fixtures de test ya no
entran: el `.codarch.yml` de este repo los excluye con `ignore`
([ADR 0038](adr/0031-0040/0038-el-alcance-del-analisis.md)), así que la foto mide solo código de
producción.

## Prioridad por deuda

| Deuda | RLOC | Fichero |
|---:|---:|---|
| 357 | 499 | `packages/render/src/model.ts` |
| 210 | 281 | `packages/parsers/src/migration.ts` |
| 195 | 682 | `packages/metrics/src/diff.ts` |
| 185 | 313 | `packages/parsers/src/analyze-core.ts` |
| 132 | 234 | `apps/cli/src/commands/compare.ts` |
| 126 | 2.588 | `apps/web/src/App.tsx` |
| 117 | 359 | `packages/schema/src/legacy.ts` |
| 112 | 732 | `apps/mcp/src/store.ts` |
| 108 | 237 | `packages/parsers/src/graph.ts` |
| 105 | 147 | `packages/versions/src/index.ts` |
| 104 | 256 | `packages/addons/src/index.ts` |
| 102 | 535 | `apps/cli/src/commands/serve.ts` |
| 90 | 1.910 | `apps/desktop/src/renderer/App.tsx` |
| 90 | 95 | `packages/metrics/src/report.ts` |
| 90 | 124 | `packages/parsers/src/walk.ts` |

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
npm run render -- .codarch/snapshot.cc.json -o .codarch/sitio
```

## Límites

- Rust se mide, no se parsea: no hay imports ni complejidad Rust en v1.
- Las aristas napi no son observables sin el glue generado; solo se marca el puente.
- Los fixtures de test de este repo se excluyen en `.codarch.yml`; no son deuda de producción.
- La deuda prioriza; no estima semanas ni personas.
