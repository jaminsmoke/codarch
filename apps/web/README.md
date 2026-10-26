# CodArch Web

Primer vertical slice de la app web (M5). Carga un `cc.json` 2.x y dibuja el mismo treemap que el
render estático, reutilizando `buildRenderModel`, `layoutMap` y las escalas de color de
`@codarch/render/browser`. No duplica geometría.

## Uso

```bash
npm run web:dev      # http://127.0.0.1:5173; arranca codarch serve automáticamente
npm run web:build    # estático en apps/web/dist
npm run web:preview
npm run serve        # servidor autocontenido en http://127.0.0.1:4173
npm run serve -- . --no-watch
```

`web:dev` arranca `codarch serve --no-web` en `127.0.0.1:4173`, proxya `/api`, `/data` y `/events`
desde Vite y lo para al cerrar Vite. Para desactivarlo:
`CODARCH_NO_AUTOSERVE=1 npm run web:dev`.

`serve` carga `data/meta.json`, `data/snapshot.cc.json` y, si existe, `data/report.json`. El watch es
live por defecto: reanaliza al guardar y la app se refresca por SSE sin recargar.

Con el servidor arrancado, **Abrir repositorio o archivo → Monitorizar carpeta (live)** abre un
navegador de carpetas del servidor: puedes cambiar de repo sin reiniciar el comando. El panel
**Servidor local** permite **Detener live** / **Activar live**; el badge del topbar pasa de `live` a
`servido`. Detener live apaga el watcher, no el proceso que sirve los datos; el proceso se cierra
con Vite o con `codarch serve`.

Si no hay servidor ni proyecto guardado, la app no inventa datos: pide abrir un `cc.json` o arrancar
`codarch serve`.

**Abrir repositorio o archivo** ofrece tres caminos:

- **Repositorio (carpeta):** selecciona la raíz de un repo y busca `.codarch/snapshot.cc.json` y
  `.codarch/report.json`. No analiza código en el navegador; usa artefactos ya generados.
- **Archivo cc.json:** carga un snapshot suelto; el reporte se puede abrir desde la pestaña PR.
- **Cargar por URL:** pega la dirección de un `snapshot.cc.json` y, opcionalmente, la de un
  `report.json`. La URL debe permitir CORS o servirse desde el mismo origen.

También puedes arrastrar un `cc.json` al mapa.

## Enlaces compartibles

La URL lleva el estado de la vista, así que cualquier vista se puede compartir o marcar:

```
http://127.0.0.1:4173/?area=rloc&color=risk&focus=packages/render&file=packages/render/src/model.ts&tab=file
```

| Parámetro | Significado |
|---|---|
| `area` | métrica que decide el área |
| `color` | `risk`, `structure`, `status` o una métrica |
| `focus` | carpeta enfocada |
| `file` | fichero seleccionado |
| `tab` | `file` o `pr` |
| `src` | URL del snapshot a cargar |
| `report` | URL del reporte a cargar |

**Copiar enlace** pone la URL actual en el portapapeles. Los parámetros que no encajan con el snapshot
se ignoran: el enlace es una pista, no un contrato. Con `src`, la app carga ese snapshot y no cae al
servidor local ni a la demo; si la URL falla, el error se muestra en lugar de datos de otro origen.

## Qué incluye

- Treemap navegable con área y color elegibles.
- Color por riesgo, estructura, estado de migración (`js`, `rust`, `bridge`, `native`) o cualquier
  métrica del snapshot.
- Búsqueda por ruta, ficha de fichero y lista de deuda de migración.
- Estratos por lenguaje y contadores de puentes/FFI.
- Vista de PR: resumen de ficheros/aristas/ciclos/hotspots, reglas introducidas/existentes/resueltas,
  lista de hotspots, ciclos nuevos y ficheros modificados/nuevos.
- Clic en una fila del PR para enfocar el fichero correspondiente en el mapa.
- Foco por carpeta: clic en la cabecera de una carpeta; breadcrumb para volver al mapa completo.
- `Esc` limpia la selección y vuelve al mapa completo.
- Con `codarch serve`: selector de carpetas del servidor, cambio de repo y toggle live/stop.
- Preferencias de área/color y último proyecto abierto con artefactos se guardan en `localStorage` y
  se restauran al recargar.
- El estado de vista (área, color, carpeta, fichero, pestaña) vive en la URL: se puede compartir y
  recargar sin perder el contexto.
- Atajos: `/` enfoca la búsqueda, `Enter` abre el primer resultado y `Esc` limpia foco/selección.
- Flechas para moverse entre celdas del mapa; el foco sigue a la selección y solo hay un tab stop
  por celda. `Enter` activa: selecciona el fichero o entra en la carpeta.
- Carga local de `cc.json` 2.x; en navegador no se soporta el formato legacy 1.x.

## Analizar en el navegador

**Abrir repositorio o archivo → Analizar carpeta aquí…** elige una carpeta con File System Access
API y la analiza en un worker, con la misma gramática y el mismo código que el CLI: el snapshot que
sale tiene su checksum (sin historial, como el del CLI con `--no-git`).

- El pie de la mapa muestra el progreso fichero a fichero y un botón **Cancelar** que corta el
  análisis al momento. La lectura de ficheros también se puede cortar.
- El motor y las gramáticas (~3 MB) se cargan bajo demanda, solo cuando se pide analizar.

## Snapshots grandes

Un treemap de 20.000 ficheros no se lee: son 20.000 celdas de un píxel. El mapa se poda por tamaño
(la decisión está en [ADR 0019](https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/desarrollo/adr/0011-0020/0019-nivel-de-detalle-del-mapa.md)):

- Una carpeta con más de 800 ficheros no se expande: sus hijos se dibujan como bloques.
- Un bloque se pulsa para entrar en la carpeta; el breadcrumb permite volver.
- El pie del mapa dice el nivel y cuántos ficheros quedan dentro: nada se esconde en silencio.
- El modelo no se toca: la búsqueda, el inspector y los enlaces siguen llegando a cualquier fichero.

Medido con 20.000 ficheros (17,8 MB de snapshot): el render pasa de ~10 s a ~300 ms de JavaScript y
de 61.266 a 672 nodos DOM.


## Límites

- El snapshot y el reporte se cargan en memoria; el último proyecto con artefactos se persiste hasta
  ~2,5 MB. Los datos servidos por `codarch serve` no se guardan.
- **Abrir repositorio** no analiza: carga artefactos `.codarch` ya generados. El análisis en navegador
  (WASM) está en el roadmap como M6.
- La carga por URL depende de CORS: un `cc.json` servido desde otro origen sin cabeceras CORS no se
  puede leer desde el navegador.
- El layout se recalcula al redimensionar; el mapa es SVG, no WebGL.
- Los ficheros sin la métrica de área se dibujan con área mínima para no desaparecer.

Lo siguiente: análisis en el navegador (M6).
