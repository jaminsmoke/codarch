# Changelog — ADR 0043

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
