# La web del proyecto

La puerta de CodArch ✅, la guía ✅ ✅ y los documentos ✅ ✅ ([ADR 0034](../../docs/adr/0031-0040/0034-la-web-del-proyecto.md) ✅).

```bash
npm run site:dev     # en el 5175
npm run site:build   # sale en apps/site/dist
```

## Qué hay ahora

- **`/`** — la portada ✅ ✅.
- **`/guia/`** — la guía ✅ ✅: sus ideas en una línea del tiempo ✅ ✅, cada día como un changelog
  ✅ ✅ y lo que espera en **Futuro** ✅ ✅.
- **`/docs/`** — los **documentos** ✅ ✅: el producto ✅ (roadmap ✅, modelo ✅, reglas ✅, MCP ✅,
  migración ✅), el diseño del mapa ✅ y todas las **decisiones** ✅ en sus carpetas de diez ✅ ✅, cada
  una con su hoja de ruta dentro y su changelog al lado ✅.
- **`/docs/<ruta>/`** — un documento ✅ ✅: su menú ✅, su índice ✅, los vecinos ✅ ✅ y los diagramas
  **Mermaid** ✅ ✅.
- **El marco** ✅ (`src/Marco.tsx` ✅ ✅): la cabecera ✅, la navegación ✅ y el pie ✅ ✅, que
  envuelven a todas las páginas ✅ ✅ ✅.

## Cómo funciona

- **Tailwind** ✅ ✅ para el estilo ✅ ✅, con los **tokens de color de la app** ✅ ✅
  (`@theme` ✅ ✅ en `src/styles.css` ✅ ✅ ✅). La prosa del markdown vive en `.prosa` ✅ ✅.
- **motion** ✅ ✅ para las animaciones ✅ ✅: entradas ✅ ✅, tarjetas ✅ ✅ y la línea del tiempo
  ✅ ✅ ✅.
- La **guía** ✅ ✅ se genera del markdown del repo ✅ ✅ (`docs/guideline/contenido.md` ✅ ✅ ✅): el
  contenido es la verdad ✅ ✅ ✅ y la web solo le pone color ✅ ✅ y movimiento ✅ ✅ ✅.
- Los **documentos** ✅ ✅ también ✅ ✅: `docs/**/*.md` ✅ ✅ se convierte en páginas ✅ ✅
  (`src/lib/docs.ts` ✅ ✅) y una carpeta es una ruta ✅ ✅ (`docs/model.md` → `/docs/model/` ✅ ✅ ✅).
  El título lo pone la página ✅ ✅: del markdown se quita el `#` ✅ ✅.
- Los **enlaces** entre documentos ✅ ✅ se quedan en el sitio ✅ ✅ y navegan sin recargar ✅ ✅; lo
  que no es un documento ✅ (una imagen ✅, un HTML ✅) sale al repo ✅ ✅.
- Las **rutas** de los documentos ✅ ✅ salen del build ✅ ✅ (`virtual:docs-rutas` ✅ ✅): así la guía
  enlaza a un ADR ✅ ✅ sin llevarse su texto ✅ ✅ ✅.
- Cada vista ✅ se carga con su ruta ✅ ✅: la portada no lleva el markdown ✅ ✅ y **Mermaid** se
  carga solo en la página que trae un diagrama ✅ ✅.
- Se publica en **GitHub Pages** ✅ ✅ con el workflow `web.yml` ✅ ✅, en `/codarch/` ✅ ✅ ✅.

## Lo que no está aquí (todavía ✅ ✅)

- La **app del mapa** ✅ ✅: es el producto ✅ ✅ y tiene su propia app ✅ ✅.
- El **dominio propio** ✅ ✅ y la **búsqueda** ✅ ✅: cuando haga falta ✅ ✅, y no antes ✅ ✅.
