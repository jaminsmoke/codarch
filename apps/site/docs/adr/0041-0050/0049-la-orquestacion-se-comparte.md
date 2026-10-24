---
title: ADR 0049 — La orquestación se comparte, la plataforma se adapta
description: "El App.tsx de la web y del escritorio comparten el estado y la lógica mediante un hook `useCodarchApp` en `@codarch/ui`. Cada app solo conecta su adaptador de plataforma."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: La orquestación se comparte
  order: 49
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

La web y el escritorio ya comparten las piezas de UI mediante `@codarch/ui` (M26): mapa,
inspector, paneles, settings, plugins y estilos. Pero el `App.tsx` de cada app —la orquestación:
carga de datos, análisis, estado global y navegación— es independiente: 1821 líneas en la web y
1106 en el escritorio, con duplicación de `loadSnapshot`, `loadReport`, `analyzeFolder`,
`readPreferences`, `writePreferences` y el estado de pestañas, foco, zoom, etiquetas, etc.

El escritorio tiene menos features que la web (no analiza en el navegador, no tiene el selector de
carpeta del servidor), pero la base es la misma. Cada feature nueva se implementa dos veces y el
drift es inevitable.

## Decisión

### 1. Un hook compartido: `useCodarchApp`

`@codarch/ui` exporta un hook `useCodarchApp(plataforma)` que encapsula:

- El estado del snapshot (`cc`, `areaMetric`, `colorMode`, `query`, `focusPath`, `selectedIndex`,
  `report`, `addons`, `pluginView`, `zoom`, `center`, `showLabels`).
- Las operaciones: `loadSnapshot`, `loadReport`, `resetReport`, `analyzeFolder`, `openSnapshotFile`,
  `openReportFile`, `selectIndex`, `openSymbolChain`.
- Las preferencias: `readPreferences`/`writePreferences` (delegadas a la plataforma).
- La persistencia: `readProject`/`writeProject` (delegadas a la plataforma).

El hook no sabe de HTTP ni de IPC: recibe un objeto `Plataforma` con las operaciones de plataforma
y las usa.

### 2. Un adaptador por plataforma

Cada app implementa un `Plataforma`:

- **Web**: `analyze` usa `analyzeInBrowser`, `openFolder` usa `directoryPicker`, `readJson` usa
  `fetch`, `readPreferences`/`writePreferences` usan `localStorage`, `readProject`/`writeProject`
  usan `localStorage`.
- **Escritorio**: `analyze` usa `desktop().analyze`, `openFolder` usa `desktop().pickFolder`,
  `readJson` usa `desktop().readJson`, `readPreferences`/`writePreferences` usan `localStorage`,
  `readProject`/`writeProject` leen/escriben `.codarch/` del repo.

### 3. El `App.tsx` de cada app queda mínimo

El `App.tsx` de la web y del escritorio solo conecta el adaptador y renderiza el mapa con los
componentes de `@codarch/ui`. Las features específicas de plataforma (análisis en navegador,
actualizaciones del escritorio) se añaden como extensiones.

### 4. La UI sigue siendo `@codarch/ui`

Los componentes visuales no cambian: ya están en `@codarch/ui`. La unificación es de la
orquestación, no del render.

## Consecuencias

- Una sola orquestación: añadir una feature se hace en `useCodarchApp` y las dos apps la heredan.
- El escritorio gana automáticamente las features de la web que le falten (y viceversa).
- Los adaptadores son pequeños y testeables.
- La migración es gradual: se puede empezar por el escritorio (más pequeño) y luego la web.

## Alternativas descartadas

- **Seguir con dos `App.tsx`**: el drift es inevitable y cada feature se implementa dos veces.
- **Unificar también el render**: el render ya está unificado en `@codarch/ui`; unificar el
  render completo rompería la frontera de seguridad del escritorio.

## Hoja de ruta

### M33 — La orquestación compartida

- [ ] Extraer `useCodarchApp` en `@codarch/ui` con el adaptador web.
- [ ] Refactorizar la web para usarlo.
- [ ] Implementar el adaptador del escritorio y refactorizarlo.
- [ ] Verificar que ambas apps se comportan igual.

El registro de lo hecho vive en el [feed de la guía](/guia/).
