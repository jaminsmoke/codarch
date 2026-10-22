# Hoja de ruta — ADR 0003 «TypeScript primero, Rust cuando un benchmark lo exija»

**Decisión:** [el ADR](0003-typescript-first.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-20

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M1 — Parser propio de TypeScript

**Estado:** ✅ cerrado.

- [x] Recorrido del repo, normalización de rutas, `.gitignore` raíz y anidados, negaciones.
- [x] tree-sitter: `loc`, `rloc`, `functions`, `maxComplexity`, `maxFunctionLength`.
- [x] Resolución de imports: relativos, `tsconfig` paths, workspaces, `index.ts`, type-only, dinámicos, `require`.
- [x] Grafo: `fanIn`, `fanOut`, ciclos (SCC + self-loops), `cycleSize`, `dependencyLevel`.
- [x] `codarch analyze . -o .codarch/` produce snapshot + mapa.
- [x] Test de determinismo: dos ejecuciones, mismo snapshot y mismo checksum.
- [x] Benchmark de analyze sobre 2.000 ficheros sintéticos: 2,6 s y 311 MB RSS.
- [x] Benchmark sobre el código fuente de CodeCharta `visualization/` (1.756 ficheros): 9,4 s de
  análisis, 5.595 aristas y 2,2 MB de snapshot. Destapó un bug del resolutor: un fichero con punto
  en el nombre ("app.config") se tomaba por con extensión y no se resolvía. Los imports sin resolver
  pasaron de 3.813 a 3 (y las aristas de 1.834 a 5.595).

Métricas del snapshot: `loc`, `rloc`, `functions`, `maxComplexity`, `maxFunctionLength`, `imports`,
`externalImports`, `builtinImports`, `typeOnlyImports`, `unresolvedImports`, `fanIn`, `fanOut`,
`inCycle`, `cycleSize`, `dependencyLevel`.

El snapshot es `cc.json` 2.0 con lentes `metrics` y `dependency`. El checksum es MD5 de la
serialización canónica de `{ files, lenses }`, sin timestamps ni rutas absolutas. El riesgo se calcula
en `packages/metrics` y lo comparten render y MCP; renormaliza sus pesos si falta churn o complejidad.

## Decisiones relacionadas

- [ADR 0002 «Monorepo core-first»](0002-monorepo-core-first.md) — M0, M1

## Dónde se aplica

- M1 (Parser propio de TypeScript): [la hoja de su decisión](0003-typescript-first.roadmap.md)
- M6 (Análisis en el navegador): [la hoja de su decisión](../0011-0020/0020-analisis-en-el-navegador.roadmap.md)
