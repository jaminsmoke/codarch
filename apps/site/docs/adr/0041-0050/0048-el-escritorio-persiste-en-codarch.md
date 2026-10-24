---
title: ADR 0048 — El escritorio persiste en `.codarch/` del repo
description: "El escritorio deja de guardar el proyecto en localStorage y escribe `.codarch/snapshot.cc.json` en el repo analizado, como la web y el CLI. La configuración y el análisis quedan por repo."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: El escritorio persiste en .codarch
  order: 48
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

El escritorio analiza un repo con `analyzeRepository` y envía el snapshot al renderer, que lo guarda
en `localStorage` (`codarch.project.v1`). Eso significa:

- Un solo proyecto por máquina: analizar el repo B borra el A.
- El escritorio no escribe `.codarch/snapshot.cc.json`, así que la web app («Abrir repositorio»)
  y el CLI no pueden reutilizar su análisis.
- Las preferencias de vista y los plugins activos también viven en `localStorage`, mezclados con
  el snapshot.

La web app y el CLI, en cambio, leen y escriben en `.codarch/` del repo. El escritorio es el
único que no persiste ahí.

## Decisión

### 1. El escritorio escribe en `.codarch/`

Al analizar una carpeta, el proceso principal escribe `snapshot.cc.json` en `.codarch/` del repo,
igual que `codarch analyze`. Si el fichero ya tiene ese contenido no se reescribe, y el renderer
solo guarda en `localStorage` la raíz del último repo: el proyecto se lee siempre de `.codarch/`.

### 2. `Abrir repositorio` carga desde `.codarch/`

Si la carpeta tiene `.codarch/snapshot.cc.json`, el escritorio lo carga sin re-analizar, como la
web app. «Re-analizar» regenera el fichero.

### 3. `.codarch/` se ignora por repo

Si el repo no ignora `.codarch/`, el escritorio lo añade a su `.gitignore` (append, sin tocar
lo demás). Así los artefactos locales no se commitean.

### 4. `localStorage` solo para preferencias

El snapshot y el reporte salen de `localStorage`. Ahí quedan las preferencias globales (tema, zoom,
plugins activos) y la raíz del último repo, lo justo para saber qué `.codarch/` leer al arrancar.

### 5. Permisos

El escritorio necesita permiso de escritura en la carpeta del repo. Si no lo tiene, el análisis se
ve igual (vive en memoria) pero no se escribe `.codarch/` ni se restaura en el siguiente arranque.

## Consecuencias

- Cada repo tiene su propio `.codarch/` con snapshot y reporte; cambiar de repo no borra el
  análisis.
- La web, el CLI y el escritorio comparten la misma fuente de verdad.
- El escritorio puede saltarse el análisis si el snapshot está actualizado.
- `localStorage` deja de guardar snapshots; los usuarios con proyecto guardado migran una vez.

## Alternativas descartadas

- **Seguir con `localStorage`**: un solo proyecto por máquina y sin compartir con el resto de
  herramientas.
- **Un directorio global de CodArch** (`~/.codarch/`): vuelve el problema de mezclar repos y no
  se comparte con el equipo.
- **No escribir en el repo**: el escritorio seguiría siendo el único que no persiste.

## Hoja de ruta

### M32 — El escritorio persiste en `.codarch/`

- [x] ADR 0048 aceptado.
- [x] El proceso principal escribe `.codarch/snapshot.cc.json` al analizar.
- [x] `Abrir repositorio` carga desde `.codarch/` si existe.
- [x] `.gitignore` se actualiza con `.codarch/` si falta.
- [x] El renderer lee desde `.codarch/` y deja de guardar snapshots en `localStorage`.
- [x] Migración de un proyecto guardado en `localStorage` a `.codarch/`.

El renderer conserva en `localStorage` solo las preferencias y la raíz del último repo. Al
arrancar, `restaurarSesion` migra una vez el proyecto viejo (si el repo sigue ahí), lee
`.codarch/snapshot.cc.json`, su `report.json` si existe y los addons que declara el repo. Si el
`.codarch/` desapareció, el arranque queda vacío en vez de inventarse el proyecto.

El registro de lo hecho vive en el [feed de la guía](/guia/).
