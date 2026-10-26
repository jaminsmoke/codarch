---
title: ADR 0038 — El alcance del análisis se declara en `.codarch.yml`
description: El analizador recorre los ficheros de código que no están en .gitignore ni en la lista de directorios internos (nodemodules, .git, .codarch). Eso es un buen defecto para…
section: desarrollo
status: aceptado
date: "2026-10-23"
sidebar:
  label: El alcance del análisis se declara en .codarch.yml
  order: 38
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

El analizador recorre los ficheros de código que no están en `.gitignore` ni en la lista de
directorios internos (`node_modules`, `.git`, `.codarch`). Eso es un buen defecto para un
repositorio normal, pero mezcla dos cosas distintas: lo que **versiona** Git y lo que **pertenece a
la arquitectura** que se quiere medir.

En este repositorio el efecto se ve: los fixtures de `packages/parsers/test/fixtures/repo` son
código a propósito —incluidos un ciclo y dos imports rotos— para probar el analizador. Al analizar
CodArch, esos ficheros entran en el mapa, en la deuda de migración, en `sin-ciclos` y en el
checksum. La foto del repo cuenta dos ciclos y dos imports sin resolver que no son de producción.
El `--ignore` del CLI ya permite excluirlos, pero es efímero: no queda en el repo, `serve` y la
acción no lo usan, y el agente no puede explicar por qué falta un fichero.

También se consideró excluir fixtures por defecto (`**/test/fixtures/**`). Es cómodo, pero convierte
una convención de nombres en una decisión de producto: una carpeta llamada `fixtures` puede ser
código real. El alcance lo sabe el equipo, no el nombre de una carpeta.

## Decisión

### 1. `ignore` es una lista del proyecto

`.codarch.yml` gana una clave `ignore` con una lista de patrones en sintaxis de `.gitignore`,
relativos a la raíz del proyecto. El analizador los suma a los patrones de `.gitignore` y a los
directorios internos. No hay un patrón nuevo por defecto para tests o fixtures: si un repo quiere
excluirlos, lo declara.

```yaml
ignore:
  - packages/*/test/fixtures/**
  - vendor/**
```

### 2. Se aplica antes de crear el snapshot

El alcance se decide al recorrer, no al pintar. `codarch analyze`, `codarch serve`, el análisis en el
navegador y la acción de GitHub leen el `ignore` del `.codarch.yml` de su raíz antes de analizar. Un
fichero excluido no entra en el árbol, ni en las métricas, ni en las aristas, ni en los ciclos, ni en
el checksum. El `--ignore` del CLI sigue existiendo y **suma** patrones para una ejecución concreta;
`--no-config` desactiva la lectura del archivo.

La acción analiza base y head con **su** configuración: si el `ignore` cambia en un PR, el diff ve
entrar o salir ficheros, que es exactamente lo que cambió el alcance.

### 3. Los consumidores del snapshot no vuelven a filtrar

`codarch diff`, `codarch render`, `codarch inspect` y el MCP trabajan con el snapshot que reciben.
No llevan su propia copia de `ignore`: si un fichero no está en el snapshot, no está; si está, se
evalúa. Dos filtros distintos producirían dos verdades para el mismo checksum.

`get_project_config` expone `ignore` junto a perfiles, capas, reglas y addons, para que un agente
pueda decir por qué un fichero no aparece.

### 4. El formato del snapshot no cambia

No se añade una lista de ficheros ignorados al `cc.json`. El alcance se reconstruye desde el
`.codarch.yml` versionado y el conjunto de ficheros resultante. El checksum sigue siendo el del
snapshot: dos configuraciones que produzcan los mismos ficheros dan el mismo checksum.

## Consecuencias

- Este repositorio excluye `packages/*/test/fixtures/**`: los dos ciclos de fixtures y los dos
  imports sin resolver desaparecen del análisis de CodArch; los tests que usan esos fixtures siguen
  ejecutándose.
- Un repo sin `ignore` analiza lo mismo que antes. No hay una exclusión silenciosa de tests.
- La acción y el servidor comparten el alcance con el CLI; el PR, el mapa y el MCP hablan del mismo
  conjunto de ficheros. La app web lee el `.codarch.yml` al abrir un repositorio en el navegador, así
  que el análisis local no abre una segunda verdad.
- Cambiar `ignore` cambia el checksum y el diff muestra el alta o la baja de los ficheros. Es un
  cambio de alcance, no de reglas.

## Alternativas descartadas

- **Excluir fixtures por defecto**: oculta código por el nombre de una carpeta y decide por el
  equipo lo que es arquitectura.
- **Solo `--ignore`**: no queda en el repo, no lo usa `serve`, la acción no lo hereda y el agente no
  puede explicarlo.
- **Poner los patrones en `.gitignore`**: mezcla control de versiones con alcance de arquitectura;
  un fichero forzado con `git add -f` seguiría versionado pero no analizado, o al revés.
- **Excluir con capas o reglas**: las reglas evalúan después de analizar; el fichero ya estaría en
  el árbol, en las métricas y en el checksum.

## Hoja de ruta

**Estado:** cerrado. No abre una fase: extiende la configuración que ya existe. Se aplica en M2 y
M5.

- [x] **0038.1** `packages/metrics`: `ignore` en `RuleConfig` y en `parseRuleConfig`; lista de
  patrones no vacíos; `loadIgnoreConfig` para quien solo necesita el alcance. Tests de
  configuración válida e inválida.
- [x] **0038.2** `apps/cli`: `analyze` lee `.codarch.yml` de la raíz (o `--config`), suma
  `--ignore` y respeta `--no-config`; `serve` recalcula con el mismo alcance y lo recarga al
  guardar. Tests del comando y del servidor.
- [x] **0038.3** Acción y MCP: la acción pasa su `config` a los dos análisis cuando no es el
  `.codarch.yml` por defecto; `get_project_config` devuelve `ignore`. Tests de la herramienta y
  `check:action`.
- [x] **0038.4** Configuración y documentos: `.codarch.yml` excluye los fixtures de este repo,
  `.codarch.example.yml` explica la clave, `docs/model.md`/`docs/rules.md`/`docs/mcp.md` la
  describen y `docs/migration.md` deja de decir que los fixtures contaminan la foto. El análisis en
  navegador lee el mismo `.codarch.yml`.
- [x] **0038.5** Reanalizar el repo sin fixtures: 211 ficheros, 427 aristas, 0 ciclos y 0 imports
  sin resolver; lint, typecheck, tests, `check:action` y `site:build` en verde; changelog
  actualizado.
