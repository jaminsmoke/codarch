---
title: La ficha no esconde nada
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: la lente de símbolos ya capturaba todas las declaraciones del módulo, pero la ficha seguía mintiendo por omisión. 70 de 294 ficheros no tenían ningún símbolo y solo enseñaban métricas; un barrel como `packages/metrics/src/browser.ts` escondía sus 38 exports. Los 21 campos de `ArchitectureStore` tampoco aparecían: se veían la clase y sus métodos, no su estado. En total quedaban fuera 60 miembros de clase (57 campos y 3 propiedades del constructor), 971 imports y 1.338 exports.

**Qué cambió**: una lente `structure` aditiva guarda, por fichero, los **miembros de clase** agrupados por su clase y la **superficie** de imports y exports con alias, `type`, `default`, `* as ns` y el origen de cada reexportación. La ficha estrena **Superficie** y **Miembros**, dos secciones plegables que aparecen también cuando el fichero no tiene símbolos. No toca la identidad: los miembros no tienen hash ni cadena, y el diff de símbolos sigue igual. Quedan fuera las claves de objetos de configuración, los espacios de nombres y el código suelto de nivel superior.

**Números**: `store.ts` pasa de una clase con métodos a una ficha con **21 miembros** bajo `ArchitectureStore`. El barrel de métricas enseña sus **38 exports** aunque no tenga un solo símbolo. La lente añade contenido al checksum porque el snapshot es más completo, no porque cambie la regla de identidad.

**Veredicto**: [ADR 0064](../../adr/0061-0070/0064-la-ficha-no-esconde-nada.md), hecho. En su hoja de ruta quedan llevar la estructura al diff y al MCP, los espacios de nombres y el código suelto si aparecen en un repo real, y las claves de objeto como detalle de una variable.
