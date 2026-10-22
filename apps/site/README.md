# La web del proyecto

La puerta de CodArch ✅ y la guía ✅ ✅ ([ADR 0034](../../docs/adr/0031-0040/0034-la-web-del-proyecto.md) ✅).

```bash
npm run site:dev     # en el 5175
npm run site:build   # sale en apps/site/dist
```

## Qué hay ahora

- **`/`** — la portada ✅ ✅.
- **`/guia/`** — la guía ✅ ✅: sus ideas en una línea del tiempo ✅ ✅, con el color de su
  veredicto ✅ ✅ ✅.
- **El marco** ✅ (`src/Marco.tsx` ✅ ✅): la cabecera ✅, la navegación ✅ y el pie ✅ ✅, que
  envuelven a todas las páginas ✅ ✅ ✅.

## Cómo funciona

- **Tailwind** ✅ ✅ para el estilo ✅ ✅, con los **tokens de color de la app** ✅ ✅
  (`@theme` ✅ ✅ en `src/styles.css` ✅ ✅ ✅).
- **motion** ✅ ✅ para las animaciones ✅ ✅: entradas ✅ ✅, tarjetas ✅ ✅ y la línea del tiempo
  ✅ ✅ ✅.
- La **guía** ✅ ✅ se genera del markdown del repo ✅ ✅ (`docs/guideline/contenido.md` ✅ ✅ ✅): el
  contenido es la verdad ✅ ✅ ✅ y la web solo le pone color ✅ ✅ y movimiento ✅ ✅ ✅.
- Los **enlaces** del markdown ✅ ✅ salen al repo ✅ ✅ ✅, que es donde están los documentos ✅ ✅ ✅.
- Se publica en **GitHub Pages** ✅ ✅ con el workflow `web.yml` ✅ ✅, en `/codarch/` ✅ ✅ ✅.

## Lo que no está aquí (todavía ✅ ✅)

- Las páginas de los **documentos** ✅ ✅ (los ADR ✅ ✅, el roadmap ✅ ✅, el modelo ✅ ✅): el
  generador ✅ ✅ ya las trae ✅ ✅ ✅, pero de momento ✅ ✅ el sitio enseña solo la portada ✅ ✅ y la
  guía ✅ ✅ ✅.
- La **app del mapa** ✅ ✅: es el producto ✅ ✅ y tiene su propia app ✅ ✅.
- La **búsqueda** ✅ ✅: cuando haga falta ✅ ✅, y no antes ✅ ✅.
