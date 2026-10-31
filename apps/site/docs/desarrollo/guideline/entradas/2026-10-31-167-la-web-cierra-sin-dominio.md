---
title: "La web cierra sin dominio"
date: "2026-10-31"
category: "docs"
verdict: "arreglo"
---

**Qué era**: M23 llevaba abierta desde el 2026-10-22 con una sola casilla: el dominio propio. Todo lo
demás —el sitio generado del markdown, la búsqueda con Pagefind, el sitemap, los dos idiomas y la guía—
estaba hecho y publicado en GitHub Pages. La casilla pedía una compra, un DNS, quitar el `base` del
config de Astro y redirigir la dirección vieja para no romper enlaces.

**Qué cambia**: M23 se cierra y el dominio se descarta por ahora. El sitio se queda en
`jaminsmoke.github.io/codarch`; si algún día hace falta, entra como fase nueva con su compra y su DNS.
La hoja del ADR 0034, el índice del roadmap y su fila dicen lo mismo.

**Por qué así**: una fase que espera una compra no dice nada del producto y hace dudar de si falta algo
grande. Un dominio no cambia lo que la web hace, y mantener el `base` deja estables las rutas internas,
el sitemap y los enlaces que ya existen.

**Verificado**: `site:build` con 287 páginas y la suite del sitio en verde (113 tests).

**Veredicto**: arreglo. M23 cierra; quedan M63, M64, M65 y M66.
