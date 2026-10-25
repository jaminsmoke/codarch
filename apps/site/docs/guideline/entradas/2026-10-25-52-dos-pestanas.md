---
title: Dos pestañas, el fichero y el cambio
date: "2026-10-25"
category: refactor
verdict: adr
---

**Qué era**: la pestaña **Reglas** juntaba dos escalas. Arriba, el fichero: riesgo con sus señales, reglas de dominio, migración y un resumen de símbolos que ya estaban en **Fichero** —el riesgo es una fila de Métricas, los símbolos son su sección—. Abajo, el cambio: violaciones nuevas, existentes y resueltas de todo el repo, perfil y hotspots. Para saber qué reglas toca el fichero había que estar en Reglas; para leer qué rompe el cambio, salir de Cambios. Un salto por otro.

**Qué cambió**: el panel derecho se queda en **Fichero** y **Cambios**. La ficha gana, dentro de Métricas, el desglose del riesgo con sus tres señales, sus pesos y el p95: el valor ya está en la fila, aquí solo se explica de dónde sale. Después de Métricas nace una sola sección **Reglas** con dos subsecciones —**Dominio**, las violaciones que tocan este fichero, y **Deuda de migración**, sus cruces FFI y la fórmula—; antes eran dos secciones sueltas y la segunda caía entre Dependencias y Miembros. **Cambios** absorbe el estado de reglas del cambio, con sus tres listas y los hotspots por fin con nombres. `tab=rules` y el viejo `tab=lenses` se leen como `tab=changes`. Dentro de la ficha, la subsección se anuncia con el tinte de Reglas y el reparto de violaciones a la derecha, y cada violación ocupa dos líneas —la regla con su origen y su marca, el mensaje en una sola línea— al ritmo de la tabla de Métricas, con el texto entero en el tooltip. **Cambios** estrena el mismo idioma: cada bloque es una sección plegable con su punto de color y su cuenta, y cerrada resume lo que importa —«3 nuevas · 7 existentes», «deuda 4,1k → 5,8k»—, así que el panel entero cabe en una pantalla en vez de ser un scroll de dos mil píxeles.

**Números**: dos pestañas en vez de tres; la ficha pasa de ocho secciones sueltas a siete, con Reglas agrupando dos. Ni `cc.json`, ni el checksum, ni `report.json` cambian: todo sale del snapshot y del reporte que ya existían. `RulesPanel` y `FileLens` desaparecen.

**Veredicto**: [ADR 0069](../../adr/0061-0070/0069-dos-pestanas.md), hecho. La siguiente pasada es visual, sección a sección.
