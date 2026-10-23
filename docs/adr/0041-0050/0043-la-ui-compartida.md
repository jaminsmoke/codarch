---
title: ADR 0043 — La UI se comparte por paquete
description: ADR 0021 decidió que el escritorio tuviera su propia interfaz, con el código copiado y sin importar apps/web; las dos apps solo compartían el motor. La decisión protegía…
section: adr
status: aceptado
date: "2026-10-23"
sidebar:
  label: La UI se comparte por paquete
  order: 43
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

ADR 0021 decidió que el escritorio tuviera su **propia** interfaz, con el código copiado y sin
importar `apps/web`; las dos apps solo compartían el motor. La decisión protegía una cosa que sigue
siendo cierta: una app no depende de la otra.

El tiempo enseñó el precio. En el momento de esta decisión, `styles.css` (2.092 líneas),
`detail.ts`, `labels.ts`, `navigation.ts`, `plugins.ts` y `PrPanel.tsx` eran **byte a byte iguales**
en las dos apps; `main.tsx` y `virtual.d.ts` también. Un arreglo de una celda del mapa o de una
etiqueta había que hacerlo dos veces, y la nota de alpha decía que el escritorio era «una copia de
la web». `App.tsx` sí había divergido —la web tiene análisis en el navegador, selector de carpetas y
estado en la URL; el escritorio tiene el puente nativo—, pero esa diferencia no justifica copiar lo
que no depende de la plataforma.

## Decisión

### 1. `packages/ui` es la presentación compartida

Nace `@codarch/ui`, privado, en `packages/ui`:

```text
packages/ui/src/
├── index.ts        las exportaciones públicas
├── data.ts         leer reporte y lente de migración
├── detail.ts       el nivel de detalle del mapa
├── labels.ts       etiquetas y colores del dominio
├── map.ts          el color de un fichero y su índice de métricas
├── MapCanvas.tsx   el mapa, con zoom, teclado y pan
├── metrics.ts      el orden de las métricas
├── navigation.ts   la navegación por celdas
├── panels.tsx      KPIs, leyenda, historial, listas e inspector
├── PrPanel.tsx     el panel de un report.json
├── pluginState.ts  qué plugins quedan activados
├── plugins.ts      el registro y la carga perezosa
├── Settings.tsx    los ajustes, con la actualización inyectada
├── tree.ts         buscar una carpeta en el árbol
└── styles.css      los tokens y las clases de las dos apps
```

El paquete exporta `.`, `./plugins`, `./Settings` y `./styles.css`. Las dos apps lo resuelven con
Vite y con `tsconfig`; no se publica en npm y su versión sigue siendo `0.0.0` porque no es un
producto.

### 2. Lo compartido es puro

Una pieza de `@codarch/ui`:

- recibe datos y devuelve llamadas por props; no lee un fichero, no analiza, no guarda;
- no importa `apps/*`, Electron, `node:*`, `localStorage` ni el puente del escritorio;
- puede medir el DOM para dibujar el mapa (`ResizeObserver` y el evento `resize`): es una pieza de
  interfaz, no una fuente de datos;
- puede depender de `@codarch/render`, `@codarch/metrics`, `@codarch/schema`, `@codarch/addons`,
  `@codarch/plugin-api`, Radix Dialog y React (peer).

El CSS común vive aquí. Si una app necesita un ajuste propio, lo pone en su hoja; no copia la común.

### 3. Cada app conserva su cáscara

Siguen en cada app, porque son plataforma:

| Pieza | Web | Escritorio |
|---|---|---|
| Análisis | worker en el navegador | proceso principal con git |
| Ficheros y diálogos | File System Access / selector | `window.codarch`, menús nativos |
| Persistencia | `storage.ts` de la web | `storage.ts` del escritorio |
| Arranque y URL | `App.tsx`, `viewState.ts` | `App.tsx`, preload |

`App.tsx` sigue siendo el shell de cada app. La etapa 3 le quita las piezas presentacionales, pero
no su estado ni sus efectos: compartir eso sin separar antes las dependencias de plataforma sería
un big-bang disfrazado.

### 4. La migración va por etapas

1. **Etapa 1 (hecha):** `styles.css`, `detail`, `labels`, `navigation` y `PrPanel`, con sus tests
   movidos a `packages/ui/test`.
2. **Etapa 2 (hecha):** `plugins.ts` y la parte común de los ajustes. `plugins.ts` es igual, pero
   importa el `storage` de cada app; se comparte inyectando el almacenamiento, no copiando el
   módulo. Los ajustes comparten el diálogo y sus secciones; cada app inyecta su fuente de
   actualización y su forma de abrirla.
3. **Etapa 3 (hecha):** sacar de `App.tsx` las piezas presentacionales que estaban duplicadas
   (mapa, inspector, paneles, leyenda, historial y listas) y dejar en cada app los hooks de
   plataforma. El historial y el calor reciben su cargador por props; la web lee del servidor y el
   escritorio del proceso principal.

Cada etapa deja las dos apps funcionando y con sus builds verdes. Lo que no se comparta todavía se
queda donde está; no se mueve a medias.

## Consecuencias

- Un cambio de estilo o de una etiqueta se hace una vez.
- El escritorio deja de ser una copia de la web sin perder su interfaz ni sus funciones nativas.
- Las dos apps siguen sin importarse la una a la otra; comparten un paquete, no una app.
- El shell de `App.tsx` sigue en cada app, pero las piezas que se pintan ya se mantienen una vez.
- `npm install` crea el workspace nuevo y los dos Vite lo resuelven. El paquete no entra en el
  checksum: no cambia el modelo.

## Alternativas descartadas

- **Meter la web dentro de Electron:** rompe ADR 0021 y mezcla dos ciclos de vida.
- **Seguir copiando:** ya demostró que se desincroniza; el mismo CSS en dos sitios es una trampa.
- **Que el escritorio importe `apps/web`:** una app dependería de la otra y el escritorio perdería
  su shell nativo.
- **Mover `App.tsx` entero a `packages/ui`:** arrastra plataforma, almacenamiento y análisis; no es
  presentación pura.

## Hoja de ruta

### M26 — La UI compartida

- [x] Crear `packages/ui` (`@codarch/ui`) con `detail`, `labels`, `navigation`, `PrPanel` y
  `styles.css`.
- [x] Las dos apps importan `@codarch/ui` y `@codarch/ui/styles.css`; las copias se borraron.
- [x] Los tests de las piezas compartidas viven en `packages/ui/test`; typecheck, suite y los dos
  builds pasan.
- [x] Etapa 2: compartir `plugins.ts` con el almacenamiento inyectado y la parte común de los
  ajustes.
- [x] Etapa 3: sacar de `App.tsx` las piezas presentacionales duplicadas (mapa, inspector,
  paneles, leyenda, historial y listas) y dejar los hooks de plataforma en cada app.
- [x] Revisar que ninguna pieza nueva de `@codarch/ui` importe plataforma de almacenamiento,
  Electron o `node:*`; el mapa solo mide el DOM para dibujarse.
