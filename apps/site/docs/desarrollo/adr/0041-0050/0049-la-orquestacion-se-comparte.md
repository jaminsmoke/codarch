---
title: ADR 0049 — La orquestación se comparte, la plataforma se adapta
description: "El App.tsx de la web y del escritorio comparten el estado y la lógica mediante un hook `useCodarchApp` en `@codarch/ui`. Cada app solo conecta su adaptador de plataforma."
section: desarrollo
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

Cada app implementa un `Plataforma`. Lo que una plataforma no puede hacer se queda fuera
(opcional) y el hook no lo ofrece:

- **Web**: preferencias, proyecto y plugins en `localStorage`; `cadenas` por `fetch` a
  `data/chains.json`. El análisis en el navegador y la elección de carpeta viven en la app, porque
  tienen progreso por fichero y cancelación.
- **Escritorio**: `analizar` usa `desktop().analyze`, `elegirCarpeta` usa `desktop().pickFolder`,
  `leerJson` usa `desktop().readJson`, preferencias y plugins en `localStorage`, y
  `restaurarProyecto` prefiere `.codarch/` del repo con la copia local como respaldo.

### 3. El `App.tsx` de cada app queda mínimo

El `App.tsx` de la web y del escritorio solo conecta el adaptador y renderiza el mapa con los
componentes de `@codarch/ui`. Las features específicas de plataforma (análisis en navegador,
actualizaciones del escritorio) se añaden como extensiones.

### 4. El armazón también se comparte: `AppShell`

La cabecera, la barra lateral, el escenario, el inspector y el menú de vistas son el mismo marcado
en las dos apps, así que viven en un componente `AppShell` de `@codarch/ui`. Cada app le pasa lo
suyo por huecos explícitos: los botones de la cabecera, el aviso de la demo, la pista de arrastrar,
el botón de cancelar el análisis y los ajustes ya montados (que llevan props de plataforma).

El estado de vista (las claves `area`, `color`, `focus`, `file`, `tab`, `symbol` y `labels`) también
sale de `@codarch/ui`: la web lo lee y lo escribe en la URL y el escritorio lo aplica desde las
vistas guardadas de un addon, con el mismo criterio de qué encaja con el snapshot.

### 4. La UI sigue siendo `@codarch/ui`

Los componentes visuales no cambian: ya están en `@codarch/ui`. La unificación es de la
orquestación, no del render.

### 5. Lo que sigue siendo de cada app

El arranque de la web (servidor local, URL, demo, drag & drop, análisis en el navegador con
cancelación) y el del escritorio (`.codarch/`, menú nativo, actualizaciones) no se mudan: son
plataforma, no presentación.

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

- [x] Extraer `useCodarchApp` en `@codarch/ui`.
- [x] Implementar el adaptador del escritorio y refactorizarlo.
- [x] Implementar el adaptador de la web y refactorizarla.
- [x] Mover al hook lo que era igual en las dos apps: fichero elegido, símbolos, métricas, vistas
      de plugins, búsqueda, atajos y el estado de vista que comparten la URL y los addons.
- [x] Extraer `AppShell` con la cabecera, la barra lateral, el escenario y el inspector.
- [x] Derivar en el hook las opciones de los ajustes y la carga de un snapshot con su reporte
      (`abrirSnapshot`/`abrirReporte`), que la web repetía en cada forma de abrir un fichero.
- [x] Poner guardas para que las apps no vuelvan a crecer: no pintan el armazón y tienen tope de
      líneas (`apps/web/test/architecture.test.ts`).
- [x] Verificar que ambas apps se comportan igual (lint, tipos, 410 tests y los dos builds).

Los `App.tsx` bajan de 1821 a 1565 líneas (web) y de 1106 a 762 (escritorio) con el hook; después,
a 865 y 162 al sacar `AppShell` (que ocupa 503) y llevar al hook las opciones de los ajustes y la
carga de un snapshot. Desaparecen las dos copias de `plugins.ts` y el marcado duplicado de las dos
apps. La restauración automática del proyecto solo corre donde la plataforma la declara: la web
conserva su arranque propio (servidor, URL, demo).

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
