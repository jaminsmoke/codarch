---
title: Una ruta, dos idiomas
date: "2026-10-24"
category: refactor
verdict: arreglo
---

**Qué es**: que la portada y la guía tengan **un fichero por vista** y no uno por idioma. Astro
sirve los dos idiomas desde la misma ruta con un parámetro de descanso: `[...lang]` está vacío en
el idioma por defecto y vale `en` en el otro.

**Por qué**: las cinco páginas del sitio estaban duplicadas —`index`, `guia`, `guia/[fecha]`,
`guia/futuro` y `guia/normas`— y el título, la descripción y el `canonical` de cada idioma se
escribían dos veces. Cualquier arreglo había que hacerlo dos veces y las dos copias ya se habían
separado.

**Qué cambió**: diez ficheros pasan a cinco; cada uno genera `/` y `/en/` con `getStaticPaths`, el
idioma sale de `Astro.params.lang` y los metadatos de la cabecera viven en la colección `i18n`
(`meta.home.*`, `meta.guia.*`). El `canonical` se compone con `urlCanonica` y la fecha larga con
`fechaCompleta`, que ya usaba la guía. Las URLs no cambian: 133 páginas, las mismas que antes.

**Veredicto**: **arreglo**, dentro de M31 (ADR 0046, §8). No cambia el modelo ni el checksum.
