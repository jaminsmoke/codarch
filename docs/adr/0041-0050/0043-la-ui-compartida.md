# ADR 0043 — La UI se comparte por paquete

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
├── detail.ts       el nivel de detalle del mapa
├── labels.ts       la etiqueta de un bloque
├── navigation.ts   la navegación por celdas
├── PrPanel.tsx     el panel de un report.json
├── pluginState.ts  qué plugins quedan activados
├── plugins.ts      el registro y la carga perezosa
├── Settings.tsx    los ajustes, con la actualización inyectada
└── styles.css      los tokens y las clases de las dos apps
```

El paquete exporta `.`, `./plugins`, `./Settings` y `./styles.css`. Las dos apps lo resuelven con
Vite y con `tsconfig`; no se publica en npm y su versión sigue siendo `0.0.0` porque no es un
producto.

### 2. Lo compartido es puro

Una pieza de `@codarch/ui`:

- recibe datos y devuelve llamadas por props; no lee un fichero, no analiza, no guarda;
- no importa `apps/*`, Electron, `node:*`, `localStorage` ni `window`;
- puede depender de `@codarch/render`, `@codarch/metrics`, `@codarch/addons`,
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

`App.tsx` sigue siendo el shell de cada app. Las etapas 1 y 2 no lo tocan: compartir su estado y
sus efectos sin separar antes las dependencias de plataforma sería un big-bang disfrazado.

### 4. La migración va por etapas

1. **Etapa 1 (hecha):** `styles.css`, `detail`, `labels`, `navigation` y `PrPanel`, con sus tests
   movidos a `packages/ui/test`.
2. **Etapa 2 (hecha):** `plugins.ts` y la parte común de los ajustes. `plugins.ts` es igual, pero
   importa el `storage` de cada app; se comparte inyectando el almacenamiento, no copiando el
   módulo. Los ajustes comparten el diálogo y sus secciones; cada app inyecta su fuente de
   actualización y su forma de abrirla.
3. **Etapa 3:** sacar de `App.tsx` las piezas presentacionales que hoy están duplicadas (mapa,
   inspector y paneles) y dejar en cada app los hooks de plataforma.

Cada etapa deja las dos apps funcionando y con sus builds verdes. Lo que no se comparta todavía se
queda donde está; no se mueve a medias.

## Consecuencias

- Un cambio de estilo o de una etiqueta se hace una vez.
- El escritorio deja de ser una copia de la web sin perder su interfaz ni sus funciones nativas.
- Las dos apps siguen sin importarse la una a la otra; comparten un paquete, no una app.
- Hay dos sitios que mantener en `App.tsx` hasta la etapa 3; es deuda visible, no una decisión
  permanente.
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
- [ ] Etapa 3: sacar de `App.tsx` las piezas presentacionales duplicadas y dejar los hooks de
  plataforma en cada app.
- [ ] Revisar que ninguna pieza nueva de `@codarch/ui` importe plataforma.

El detalle de lo hecho está en el [changelog](0043-la-ui-compartida.changelog.md).
