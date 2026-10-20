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

Si no hay servidor, la demo carga `public/demo.cc.json` y `public/demo.report.json`, un diff real de
este repo entre el commit anterior a la app web y el árbol actual.

**Abrir repositorio o archivo** ofrece dos caminos:

- **Repositorio (carpeta):** selecciona la raíz de un repo y busca `.codarch/snapshot.cc.json` y
  `.codarch/report.json`. No analiza código en el navegador; usa artefactos ya generados.
- **Archivo cc.json:** carga un snapshot suelto; el reporte se puede abrir desde la pestaña PR.

También puedes arrastrar un `cc.json` al mapa.

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
- Atajos: `/` enfoca la búsqueda, `Enter` abre el primer resultado y `Esc` limpia foco/selección.
- Carga local de `cc.json` 2.x; en navegador no se soporta el formato legacy 1.x.

## Límites

- El snapshot y el reporte se cargan en memoria; el último proyecto con artefactos se persiste hasta
  ~2,5 MB. Los datos servidos por `codarch serve` no se guardan.
- **Abrir repositorio** no analiza: carga artefactos `.codarch` ya generados. El análisis en navegador
  (WASM) está en el roadmap como M6.
- No hay carga por URL todavía.
- El layout se recalcula al redimensionar; el mapa es SVG, no WebGL.
- Los ficheros sin la métrica de área se dibujan con área mínima para no desaparecer.

El objetivo siguiente es `codarch serve`, carga por URL, persistencia y navegación de teclado
completa.
