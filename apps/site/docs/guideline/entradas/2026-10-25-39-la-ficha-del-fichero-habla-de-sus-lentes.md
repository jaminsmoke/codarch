---
title: La ficha del fichero habla de sus lentes
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: el inspector enseñaba números —riesgo, complejidad, churn, deuda— y la pestaña PR los
cambios, pero no explicaba **por qué** una celda tenía ese riesgo ni qué reglas de dominio tocaba el
fichero.

**Qué cambió**: una tercera pestaña, **Lentes**, junto a Fichero y PR. El riesgo se desglosa en
complejidad, churn y tamaño con su peso y su p95, con la misma fórmula que colorea el mapa: no hay
dos verdades. Las reglas de dominio se cruzan por ruta desde el `report.json` cargado —las nuevas
primero, con severidad, regla, origen y mensaje—; sin reporte se dice, no se inventa. La migración
enseña estado, deuda, cruces y las aristas FFI del fichero; los símbolos, cuántos hay y cuál es el
más complejo.

**Números**: sin análisis nuevo: el desglose sale de la misma pasada que ya calculaba el riesgo. Un
clic en una regla o en una arista cambia de fichero sin salir de la pestaña, y `tab=lenses` viaja en
la URL y en las vistas guardadas.

**Veredicto**: [ADR 0057](../../adr/0051-0060/0057-la-ficha-del-fichero-habla-de-sus-lentes.md),
hecho; no cambia `cc.json` ni el checksum. Quedan en su hoja de ruta las reglas por símbolo y la
evolución del fichero cuando el historial tenga más de una foto.
