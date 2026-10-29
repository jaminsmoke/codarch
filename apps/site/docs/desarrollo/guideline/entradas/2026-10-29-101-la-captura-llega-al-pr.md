---
title: "La captura llega al PR"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: la acción comentaba el diff en texto y subía el artefacto con los snapshots, la app publicada y el reporte, pero no el mapa. Para verlo había que descargar el artefacto, abrir `head/app/index.html` y esperar a que la web cargara; el comentario, que es lo que se lee, no decía nada del bulto.

**Qué es**: un paso «Capturar el mapa» entre el análisis del head y el comentario deja `head/map.png` y su resumen `head/map.json` dentro de la carpeta del artefacto, con `codarch shot --out`, que no gasta ranura. El comentario acaba con un bloque «Mapa del head»: el área, el color, la escala, las cinco celdas más grandes con su nombre y su área, y un enlace a los artefactos de la ejecución.

**Por qué así**: dentro del comentario la imagen no cabe. GitHub sanea el HTML, descarta las imágenes `data:` y no tiene API pública para adjuntar un fichero a un comentario, así que solo se pintan imágenes con URL. Las alternativas eran un servicio de imágenes —una dependencia externa en un análisis que hoy no usa la red— o una rama publicada —binarios en el repo desde CI—. El artefacto ya se subía y no pide ni un permiso más.

**El fallo que no rompe nada**: la acción instala el CLI desde npm, y la versión publicada el día que esto se escribió todavía no sabía capturar. El paso corre con `set +e`: si `shot` falla, se limpia lo que haya dejado, sale un `::warning::` y el comentario se publica sin el bloque. En cuanto el pin de la acción apunta a una versión con `shot`, el mapa aparece solo.

**Cómo se comprueba**: `npm run check:action` afirma que el paso existe, que escribe `map.png` y `map.json` en el artefacto, que tolera el fallo y que el comentario recibe el resumen; y renderiza el comentario dos veces —con la captura y sin ella— para comprobar que el bloque sale con sus cifras y el enlace, y que sin fichero —o con un JSON roto— el comentario sigue saliendo entero.

**Veredicto**: fase M62 sigue abierta. Queda pintar etiquetas dentro de la imagen, que pide una fuente de mapa de bits y su decisión aparte.
