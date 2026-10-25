---
title: Los símbolos, todos los del módulo
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: la lente conocía seis tipos de símbolo, pero solo emitía cinco. Las constantes se descartaban como «datos, no estructura», así que `packages/ui/src/labels.ts` parecía tener una función y escondía `EVENT_LABEL`, `SYMBOL_LABEL` y `CHURN_METRIC`, que son la tabla de vocabulario de la interfaz. Además, el diff comparaba tipo, complejidad y líneas: una constante que cambiaba de `10` a `20` no se veía.

**Qué cambió**: las variables del módulo son símbolos. `const`, `let` y `var` con valor se emiten como `variable`, también las constantes de texto y los objetos de configuración. Una flecha o una clase guardadas en una constante siguen siendo `function` o `class`, en cualquier ámbito. Las variables locales, la desestructuración y los `let` sin valor se quedan fuera: son implementación, no estructura del fichero. El resumen gana `variables`, el MCP expone los seis tipos, y el diff compara el hash del cuerpo. En la ficha, los símbolos se agrupan por tipo —funciones, clases, interfaces, tipos, enums y variables— y el resumen plegado dice el reparto (`12 fn · 8 var · máx. 15`); la vida del símbolo pasa a ser una sección plegable más.

**Números**: en los 293 ficheros del análisis aparecen **440 variables** que antes no se veían, sobre **1 886 símbolos**. `packages/ui/src/labels.ts` pasa de 2 símbolos a 9: siete constantes y dos declaraciones con forma. No cambia el orden de `symbolsOf`; el checksum cambia porque la lente es más completa, no porque cambie la regla de identidad. Al dar cuerpo a las variables salió un fallo viejo: los métodos tenían el hash vacío porque el nodo y su nombre empiezan en la misma columna y se saltaba el nodo entero. Ahora solo se salta la hoja del nombre, así que cada método, clase y variable tiene un cuerpo distinto.

**Veredicto**: [ADR 0063](../../adr/0061-0070/0063-todos-los-simbolos.md), hecho. Queda en su hoja de ruta un filtro por nombre para listas enormes, distinguir el valor de una variable y, si el modelo lo pide, espacios de nombres y alias de importación.
