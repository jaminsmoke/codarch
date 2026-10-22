# Hoja de ruta — ADR 0010 «Diff entre snapshots y reporte estable»

**Decisión:** [el ADR](0010-diff-entre-snapshots.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-20

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M2 — Diff y PR

**Estado:** ✅ cerrado (MVP repo-local). La publicación de la acción y del CLI queda para M3.

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

## Decisiones relacionadas

- [ADR 0004 «La cuña: PR/CI + MCP»](0004-cuna-pr-ci-mcp.md) — M2, M3
- [ADR 0009 «Churn desde git, sin romper el determinismo»](0009-churn-desde-git.md) — M2
- [ADR 0011 «Reglas de arquitectura en `.codarch.yml`»](../0011-0020/0011-reglas-de-arquitectura.md) — M2, M9
- [ADR 0012 «GitHub Action para PRs»](../0011-0020/0012-github-action.md) — M2
