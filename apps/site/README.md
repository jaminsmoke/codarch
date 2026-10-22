# La web del proyecto

La puerta de CodArch ✅ y sus documentos ✅ ([ADR 0034](../../docs/adr/0031-0040/0034-la-web-del-proyecto.md) ✅).

```bash
npm run site:dev     # en el 5175
npm run site:build   # sale en apps/site/dist
```

## Cómo funciona

- Las páginas de documentación **se generan del markdown del repo** ✅: un glob en el build ✅ ✅ y
  `marked` ✅ ✅. El texto **no** está duplicado ✅ ✅ — el ADR se escribe una vez ✅ y sale en GitHub
  ✅, en la web ✅ y en el npm ✅ ✅.
- Los **enlaces** del markdown ✅ se reescriben a las rutas del sitio ✅ ✅ (`/adrs/0025` ✅, `/docs/model`
  ✅ ✅) y los títulos ✅ llevan ancla ✅ ✅.
- La **guía** ✅ es su propia página ✅ ✅: se copia al build ✅ ✅ y se le reescriben los enlaces ✅ ✅
  (no se reescribe en React ✅ ✗ ✅).
- Los **tokens de color** ✅ son los de la app ✅ ✅ (`apps/web/src/styles.css` ✅ ✅) ✅.
- Se publica en **GitHub Pages** ✅ ✅ con el workflow `web.yml` ✅ ✅, en `/codarch/` ✅ ✅. El
  `404.html` ✅ ✅ es una copia del `index.html` ✅ ✅, que es la trampa de las direcciones profundas
  ✅ ✅ en Pages ✅ ✅.

## Lo que no está aquí

- La **app del mapa** ✅ ✅: es el producto ✅ ✅ y tiene su propia app ✅ ✅. Publicarla bajo `/app/`
  ✅ ✅ es un paso aparte ✅ ✅.
- La **búsqueda** ✅ ✅: cuando haga falta ✅ ✅, y no antes ✅ ✅.
