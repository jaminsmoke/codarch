---
title: Changelog — ADR 0043
description: Lo hecho del ADR 0043, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0041-0050/0043-la-ui-compartida
sidebar:
  label: Changelog
  order: 43.5
---

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0043-la-ui-compartida.md).

## 2026-10-23

- Nace `packages/ui` con el paquete privado `@codarch/ui` y las piezas puras `detail`, `labels`,
  `navigation`, `PrPanel` y `styles.css`.
- Las dos apps dejan de tener copia de esos ficheros: `App.tsx` importa de `@codarch/ui` y
  `main.tsx` carga `@codarch/ui/styles.css`.
- Los tests de `detail`, `labels` y `navigation` se mudan a `packages/ui/test`; la suite sigue
  pasando.
- `tsconfig.json` añade el alias y el include de `.tsx` de los paquetes; los dos `vite.config.ts`
  resuelven `@codarch/ui` y su CSS.
- `apps/desktop/README.md` deja de describir el renderer como copia de la web.
- Etapa 2: `plugins.ts` vive en `@codarch/ui/plugins` con un `PluginStore` inyectado; cada app
  solo pasa sus funciones de almacenamiento. La regla de qué queda activado es una función pura
  (`nextEnabledPlugins`) con sus tests.
- Los ajustes viven en `@codarch/ui/Settings`; cada app inyecta su `SettingsUpdateAdapter` (npm en
  la web, el proceso principal en el escritorio). La sección y sus textos comunes dejan de estar
  duplicados.
- La declaración de `virtual:codarch-plugins` se muda a `@codarch/plugin-api`; las dos copias de
  `virtual.d.ts` desaparecen.
- Etapa 3: `MapCanvas`, el inspector, los KPIs, la leyenda, el historial y las listas de deuda,
  calor y ficheros tocados viven en `@codarch/ui`; `App.tsx` baja más de mil líneas en cada app.
- El historial y el calor comparten la vista y reciben su cargador por props: la web lee del
  servidor y el escritorio del proceso principal.
- También se comparten `findFolder`, `mapColorFor`, `metricIndexOf`, la lectura del reporte y de la
  lente de migración, y el orden de las métricas, con sus tests.
- `@codarch/ui` puede medir el DOM para pintar el mapa; sigue sin tocar almacenamiento, Electron ni
  `node:*`.
