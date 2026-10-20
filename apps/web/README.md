# CodArch Web

Primer vertical slice de la app web (M5). Carga un `cc.json` 2.x y dibuja el mismo treemap que el
render estático, reutilizando `buildRenderModel`, `layoutMap` y las escalas de color de
`@codarch/render/browser`. No duplica geometría.

## Uso

```bash
npm run web:dev      # http://127.0.0.1:5173
npm run web:build    # estático en apps/web/dist
npm run web:preview
```

La demo carga `public/demo.cc.json`, un snapshot de este repo con la lente de migración. Puedes abrir
otro snapshot con el botón **Abrir snapshot** o arrastrando el fichero al mapa.

## Qué incluye

- Treemap navegable con área y color elegibles.
- Color por riesgo, estructura, estado de migración (`js`, `rust`, `bridge`, `native`) o cualquier
  métrica del snapshot.
- Búsqueda por ruta, ficha de fichero y lista de deuda de migración.
- Estratos por lenguaje y contadores de puentes/FFI.
- Carga local de `cc.json` 2.x; en navegador no se soporta el formato legacy 1.x.

## Límites

- El snapshot se carga en memoria; no hay backend ni persistencia.
- No hay vista de PR ni carga por URL todavía.
- El layout se recalcula al redimensionar; el mapa es SVG, no WebGL.
- Los ficheros sin la métrica de área se dibujan con área mínima para no desaparecer.

El objetivo siguiente es añadir vista de PR (`report.json`), foco por carpeta y un `codarch serve`
opcional.
