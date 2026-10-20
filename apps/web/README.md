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

La demo carga `public/demo.cc.json` y `public/demo.report.json`, un diff real de este repo entre el
commit anterior a la app web y el árbol actual. Puedes abrir otro snapshot con **Abrir snapshot** o
arrastrando el fichero al mapa, y otro reporte desde la pestaña **PR**.

## Qué incluye

- Treemap navegable con área y color elegibles.
- Color por riesgo, estructura, estado de migración (`js`, `rust`, `bridge`, `native`) o cualquier
  métrica del snapshot.
- Búsqueda por ruta, ficha de fichero y lista de deuda de migración.
- Estratos por lenguaje y contadores de puentes/FFI.
- Vista de PR: resumen de ficheros/aristas/ciclos/hotspots, reglas introducidas/existentes/resueltas,
  lista de hotspots, ciclos nuevos y ficheros modificados/nuevos.
- Clic en una fila del PR para enfocar el fichero correspondiente en el mapa.
- Carga local de `cc.json` 2.x; en navegador no se soporta el formato legacy 1.x.

## Límites

- El snapshot y el reporte se cargan en memoria; no hay backend ni persistencia.
- No hay carga por URL ni `codarch serve` todavía.
- El layout se recalcula al redimensionar; el mapa es SVG, no WebGL.
- Los ficheros sin la métrica de área se dibujan con área mínima para no desaparecer.

El objetivo siguiente es foco por carpeta, navegación de teclado completa y un `codarch serve`
opcional para publicar el visor estático.
