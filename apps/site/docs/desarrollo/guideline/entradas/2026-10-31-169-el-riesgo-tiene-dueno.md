---
title: "El riesgo tiene dueño y el resto tiene estratos"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: la tabla de carpeta y proyecto nombraba al dueño de la complejidad máxima, pero no del
riesgo, así que un máximo de riesgo no se podía accionar. Y en el raíl del resto los tipos solo se veían
en la leyenda cuando el color era `kind`: para saber qué hay de documentos, configuración y assets
había que cambiar el mapa de color.

**Qué cambia**: **Métricas** de carpeta y proyecto gana **Riesgo máx.**, con el fichero que lo tiene y
una nota con su ruta; la fila se pulsa y pinta el mapa por riesgo, como la del fichero. El raíl del
resto gana **Estratos** por tipo: la barra, su leyenda y la cuenta de ficheros, sin tocar el color.

**Por qué así**: un máximo sin dueño no dice qué arreglar, y los tipos ya estaban medidos: solo faltaba
enseñarlos siempre. La fila de riesgo usa la misma escala 0–100 que la ficha del fichero, y el agregado
del resto no inventa un tipo que no tiene ficheros.

**Verificado**: suite completa en verde con los tests del dueño del riesgo y de los estratos por tipo,
typecheck limpio, lint sin errores y `site:build` con 287 páginas.

**Veredicto**: hecho. De M63 quedan frontera y ciclos, reglas agrupadas, cambios acotados y el MCP; de
M64, las reglas del resto.
