---
title: "La letra de la captura"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el PNG del mapa era un tablero de cajas de color y, debajo, un resumen con los doce nombres. Se veía dónde estaba el bulto, pero para saber qué caja era cuál había que cruzar posiciones con una lista, y una captura suelta —pegada en un chat, en un PR— no se explicaba sola.

**Qué es**: la captura rotula los ficheros grandes y las carpetas con una fuente de mapa de bits de 5x7 escrita en `packages/render/src/font.ts`: mayúsculas, minúsculas, dígitos y los signos de una ruta. No hay fuente instalada que cargar ni rasterizador de tipografías al que pedir nada: cada glifo es una rejilla de bits y cada píxel del glifo es un cuadrado de 1 o 2 px. La letra se pidió primero solo en mayúsculas —el doble de glifos con la mitad de tabla— y se cambió al verla: una ruta en mayúsculas es un grito y `useCodarchApp.tsx` deja de ser ese fichero.

**Por qué así**: los umbrales son los del SVG, para que el PNG y la pantalla digan lo mismo: 44x13 para la primera línea, dos líneas —nombre y extensión— cuando la caja da para ellas, y la cabecera de una carpeta solo cuando el layout se la ha reservado. Lo que no cabe se corta con puntos suspensivos; un hueco que no da ni para el corte se queda sin etiqueta, porque tres puntos en seis píxeles no dicen nada. La tinta sale de `inkFor`, la misma que usa la app: el nombre se lee igual sobre un riesgo alto que sobre uno bajo.

**El detalle que casi se cuela**: `textWidth` contaba unidades UTF-16, así que un emoji en una ruta medía el doble de lo que ocupa y se comía el sitio de dos letras. Ahora cuenta caracteres, y el carácter sin glifo deja su hueco en blanco sin acortar la línea. Lo encontró el test de la fuente, no una captura.

**Cómo se comprueba**: `packages/render/test/font.test.ts` cubre el juego completo —mayúsculas, minúsculas y dígitos tienen glifo, con tinta y con siete filas—, que la minúscula no sea la mayúscula, el hueco del carácter desconocido, la medida con y sin aire, el corte con puntos suspensivos y que dos pasadas den lo mismo. En `shot.test.ts`, dos mapas que solo cambian el nombre de su único fichero dan bytes distintos, y el mismo nombre da los mismos bytes: eso prueba que la letra llega a los píxeles. Suite **1.094** casos y **134** ficheros, `tsc` limpio y lint sin errores. La captura de este repositorio pasa de 28 KB a 46 KB.

**Veredicto**: fase M62 cerrada: la imagen dice los nombres y el resumen dice las cifras. Queda el signo de interrogación de siempre —cuántas etiquetas caben antes de que el mapa se vuelva ruido— y eso se responde mirando capturas de repos grandes, no aquí.
