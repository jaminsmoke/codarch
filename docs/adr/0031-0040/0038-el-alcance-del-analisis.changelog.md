---
title: Changelog — ADR 0038 «El alcance del análisis se declara en `.codarch.yml`»
description: Lo hecho del ADR 0038, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0031-0040/0038-el-alcance-del-analisis
sidebar:
  label: Changelog
  order: 38.5
---

**Decisión:** [el ADR](0038-el-alcance-del-analisis.md) · **Estado:** aceptado · **Fecha:** 2026-10-23

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el
[ADR](0038-el-alcance-del-analisis.md#hoja-de-ruta).

## Lo que se hizo

- **Configuración.** `RuleConfig` gana `ignore`; `parseRuleConfig` valida y normaliza los patrones
  (lista, no vacíos, `/`), y `loadIgnoreConfig` lee solo el alcance para no exigir addons al
  analizar. Tests en `packages/metrics/test/config.test.ts`.
- **CLI.** `analyze` busca `.codarch.yml` o `.codarch.yaml` en la raíz analizada, acepta
  `--config`/`--no-config` y suma `--ignore` al alcance del repo. `serve` relee el archivo en cada
  análisis, así que guardar la configuración refresca el mapa. Tests en
  `apps/cli/test/analyze.test.ts` y `apps/cli/test/serve.test.ts`.
- **Acción y MCP.** La acción pasa su `config` a los análisis base/head cuando no es el
  `.codarch.yml` por defecto y usa `--no-config` para `none`; `get_project_config` devuelve
  `ignore`, incluso si el config tiene un addon que falta. `check:action` y los tests del MCP en
  verde.
- **Web.** El lector del navegador incluye `.codarch.yml`/`.codarch.yaml` y `runAnalysis` aplica
  `parseIgnoreYaml` antes de analizar; el mismo alcance que el CLI. Test en
  `apps/web/test/analysis.test.ts`.
- **Documentos.** `.codarch.yml` excluye `packages/*/test/fixtures/**`; `.codarch.example.yml`
  explica la clave; `docs/model.md`, `docs/rules.md` y `docs/mcp.md` describen el alcance; y
  `docs/migration.md` se actualiza con la foto sin fixtures.

## Verificación

- Análisis del repo con `--no-git`: **211 ficheros · 53 carpetas · 427 aristas · 0 ciclos · 0
  imports sin resolver**. Checksum: `fa6ad81fa35b246e115fb3b71543499d`.
- `npx vitest run`: 49 ficheros, 360 tests.
- `npm run lint`, `npm run typecheck`, `npm run check:action` y `npm run site:build`: en verde.
- La acción publicada recogerá la lectura de `ignore` al publicar la versión del CLI que incluye
  esta decisión; el `.codarch.yml` por defecto ya es el que usan base y head.
- La app web lee el `.codarch.yml` al analizar un repositorio en el navegador; el servidor y el CLI
  comparten el mismo alcance.

## Decisiones relacionadas

- [ADR 0011 «Reglas de arquitectura en `.codarch.yml`»](../0011-0020/0011-reglas-de-arquitectura.md)
  — la configuración gana una clave de alcance; las reglas no cambian.
- [ADR 0037 «Los ciclos: de ejecución, no de tipos»](0037-los-ciclos-de-ejecucion.md)
  — los ciclos de tipos ya no cuentan; los fixtures siguen siendo un problema de alcance, no de
  semántica.
