---
title: Los símbolos, todos y plegables
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: la ficha enseñaba doce símbolos y resumía el resto con un «y N más». En `apps/mcp/src/tools.ts` había cincuenta: treinta y ocho no tenían forma de aparecer, justo cuando el símbolo es la puerta a su cadena de commits. Además, la sección no se parecía a **Métricas**: rótulo mono en mayúsculas, sin cuenta y sin plegar.

**Qué cambió**: **Símbolos** usa la misma sección plegable que **Métricas**. El título va en negrita, con la cuenta al lado (`50`), y al cerrarse resume lo que no se ve: `complejidad máx. 15`. Se enseñan todos, sin corte ni elipsis, en el orden del modelo —del más complejo al más simple y, a igual complejidad, por línea—. Cada fila conserva tipo, nombre y complejidad, el tooltip añade la línea, y el estado plegado se recuerda en el navegador. Una nota breve explica el orden y que pulsar un símbolo abre su vida.

**Números**: de 12 filas visibles y 38 escondidas a 50 disponibles. Con la sección cerrada, la ficha vuelve a caber en el inspector (597 px) y deja a la vista el resumen. No cambia `cc.json`, ni el checksum, ni el reporte, ni el orden de `symbolsOf`.

**Veredicto**: [ADR 0062](../../adr/0061-0070/0062-los-simbolos-tambien-se-pliegan.md), hecho. Queda en su hoja de ruta un filtro por nombre para listas enormes, agrupar por tipo y llevar el patrón a la vida del símbolo y a las fichas del reporte.
