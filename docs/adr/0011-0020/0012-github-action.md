---
title: ADR 0012 — GitHub Action para PRs
description: El diff y las reglas ya existen en el CLI. La cuña del producto es que ese análisis aparezca en el pull request sin que nadie abra un dashboard. Necesitamos una primera…
section: adr
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: GitHub Action para PRs
  order: 12
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

El diff y las reglas ya existen en el CLI. La cuña del producto es que ese análisis aparezca en el
pull request sin que nadie abra un dashboard. Necesitamos una primera acción que pueda ejecutarse en
este repositorio y que no comprometa la arquitectura del producto.

## Decisión

1. **Acción compuesta repo-local** en `apps/github-action`. En M2 el workspace contiene el código de
   CodArch y la acción ejecuta `npm ci` + `npx tsx apps/cli/src/index.ts`. No se publica todavía un
   paquete npm ni un bundle JavaScript de la acción.
2. **Base con `git worktree`, head con el checkout actual.** La acción calcula el merge-base contra
   `GITHUB_BASE_REF` (o usa `base-sha`), crea un worktree temporal en el commit base, analiza base y
   head, y elimina el worktree al terminar. Requiere `fetch-depth: 0`.
3. **Diff y política en el mismo paso.** `codarch diff` recibe `--config` si existe `.codarch.yml` y
   `--fail-on` según la entrada. El código `2` significa gate incumplido; `1`, error de análisis o
   configuración. La acción captura el código, publica artefacto y comentario, y solo al final
   devuelve ese código al runner.
4. **Aviso por defecto.** `fail-on: none` es el valor por defecto: el PR recibe el comentario y el
   artefacto, pero el check no bloquea. El equipo activa el bloqueo cuando la política es estable.
   La severidad por regla (`info`/`warn`/`error`) sigue decidiendo qué cuenta como error.
5. **Un comentario, actualizado.** El comentario lleva el marcador `<!-- codarch-report -->`. La
   acción busca ese marcador y edita el comentario existente; si no lo encuentra, crea uno nuevo.
   Así una serie de pushes no genera ruido.
6. **Artefacto completo.** Se suben snapshots de base y head, el mapa del head y `report.json`.
   El comentario enlaza a la ejecución y menciona el artefacto; no intenta incrustar el HTML.
7. **Sin secretos en el código.** El token entra por `github-token`; el workflow necesita
   `contents: read` y `pull-requests: write`. En PRs de forks el token suele ser de solo lectura y el
   comentario se omite con un warning, pero el análisis y el artefacto siguen funcionando.

## Consecuencias

- La acción es útil hoy en este repo y sirve de especificación para la acción publicada.
- `npm ci` en cada ejecución añade tiempo; se puede cachear o sustituir por el CLI publicado.
- La acción no analiza un checkout separado del head: usa el workspace que GitHub ya preparó. Eso
  evita duplicar el checkout y mantiene el diff alineado con el commit que se está revisando.
- El worktree base puede quedar huérfano si el runner muere; el paso final lo elimina y GitHub
  destruye el runner de todos modos.
- No hay comentario en PRs de forks con token read-only. Es una limitación de permisos, no del
  análisis.
- El día que exista `codarch` en npm, la acción podrá ser un wrapper fino; el contrato de entradas,
  salidas y artefacto no debería cambiar.

## Alternativas descartadas

- **Publicar ya un bundle JS con tree-sitter nativo.** Añade tamaño, plataformas y un proceso de
  release antes de validar la cuña.
- **Analizar solo el head y comparar contra un baseline guardado.** El baseline se desactualiza y no
  representa el merge-base real del PR.
- **Bloquear por defecto.** Un repo con deuda previa no podría adoptar la herramienta; el modo aviso
  permite medir antes de exigir.
- **Incrustar el mapa HTML en el comentario.** GitHub no lo renderiza y el comentario se vuelve
  enorme; el artefacto es el sitio correcto.
- **Usar `pull_request_target` para tener escritura en forks.** Ejecutar código del PR con un token
  de escritura es un riesgo de seguridad que no compensa en M2.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M2.

El detalle de lo hecho está en el [changelog](0012-github-action.changelog.md).
