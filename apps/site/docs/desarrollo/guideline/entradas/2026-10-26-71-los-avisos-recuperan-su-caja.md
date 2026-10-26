---
title: Los avisos recuperan su caja
date: "2026-10-26"
category: fix
verdict: arreglo
---

**Qué era**: los documentos escriben sus avisos con `:::note` y salían como un párrafo suelto. No era el markdown: los documentos viven en `docs/`, no en `src/content/docs` (ADR 0046), y Starlight solo transforma las carpetas que conoce —su colección y las que se le añaden—. Sin ellas, sus `remark` se saltaban cada fichero y se perdían los avisos y los enlaces de ancla de los títulos sin decir nada: la página se pintaba igual, solo que sin caja.

**Qué cambió**: la configuración de Starlight declara `markdown.processedDirs: ["./docs"]`, que es la carpeta real de los documentos. Y el procesador de markdown, que es propio para reescribir los enlaces, gana `remarkRehype.passThrough: ["element"]`: los avisos llegan como nodos de hast metidos en el árbol de mdast y sin eso `remark-rehype` los envolvía en un `div`. Los dos fallos eran silenciosos y los dos están ahora en `contenido.test.ts`. Queda un tercero, más callado: Starlight elige el idioma de sus traducciones por la ruta del fichero dentro de `src/content/docs`, así que aquí siempre concluía español y las páginas inglesas rotulaban sus avisos «Nota». Lo repone `rehype-idioma.mjs`, que pone en su idioma la etiqueta de serie de los avisos y la del enlace de cada sección —«Sección titulada» y «Section titled»—, y respeta el título que escriba el documento. Va al final de la tubería, cuando Starlight ya ha montado unos y otras.

**La forma**: el aviso toma la de la casa en vez de la de Starlight —filete de 3 px, tinte al 8 % del mismo tono, esquina de 8 px y el epígrafe en la versalita mono de los códigos de idioma—. Los cuatro tonos son los de la paleta del sitio —cobalt, patina, ochre y debt—, no los azules de Starlight, que no aparecen en ninguna otra página. De paso, los títulos vienen envueltos por Starlight para colgar su ancla: el aire y la escala del h2, el h3 y el h4 pasan a la envoltura y el título se queda sin margen arriba, para que los dos no se sumen.

**Cómo se comprueba**: en el navegador, `/docs/usar/mcp/` pinta sus dos notas con el filete cobalt, el tinte al 8 % y el epígrafe en mono, y las cabeceras llevan su ancla al pasar el ratón; en claro y en oscuro el texto sigue siendo la tinta y el icono el tono. El build deja los avisos en las dos lenguas y `contenido.test.ts` vigila `processedDirs`, `passThrough` y los enlaces del markdown.

**Veredicto**: arreglo, sin ADR. Es una tubería que no se ve hasta que falta.
