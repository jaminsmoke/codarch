/**
 * Los tipos que el sitio toma de sus dependencias.
 *
 * `astro sync` escribe `.astro/types.d.ts` con `astro/client`, pero Starlight
 * registra `App.Locals` —y con él `locals.starlightRoute`— desde su propio
 * paquete, y `tsc` solo lo ve si alguien lo referencia: el `astro.config.mjs`
 * que lo importa no está en el programa de TypeScript. Esta línea es esa
 * referencia.
 */
/// <reference types="@astrojs/starlight" />
