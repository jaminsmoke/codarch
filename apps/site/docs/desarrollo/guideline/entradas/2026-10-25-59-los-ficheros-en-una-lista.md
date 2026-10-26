---
title: Los ficheros del cambio, en una lista
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: **Cambios** tenía una sección para los ficheros modificados y otra para los nuevos. Los eliminados no tenían lista: solo un `−1` en la rejilla de seis cifras, que además repetía la cuenta de hotspots, símbolos y deuda de migración que ya estaba en sus cabeceras. Y las tres listas no hablaban la misma unidad: los modificados enseñaban las dos métricas que se movieran, los nuevos un `+rloc` y los eliminados nada.

**Qué cambió**: una sola sección **Ficheros**, la última de la pestaña, con tres grupos —**Nuevos**, **Modificados**, **Eliminados**— y una fila por fichero: letra de estado en su color (`A` patina, `M` ochre, `D` deuda), ruta y el delta de `rloc`, la misma cifra para los tres. Si el `rloc` no se movió, la métrica que más se movió lleva su nombre; el resto vive en el tooltip. El eliminado no es un botón: no está en el snapshot del head y su tooltip lo dice. Cada grupo se corta a 25, como **Reglas**. La rejilla se va y queda una línea con **Aristas** y **Ciclos**, solo cuando alguna de las cuatro cifras se mueve.

**Números**: en la prueba de tres ficheros, las tres listas quedan en una sección: `1 nuevo · 1 modificado · 1 eliminado` en la cabecera, `src/c.ts` `A +3`, `src/a.ts` `M +6`, `src/viejo.ts` `D −4`. La pestaña pierde una sección y gana la lista de eliminados. No cambia ni `report.json` ni el checksum: los tres grupos ya venían en `report.files`.

**Qué queda**: la tabla de métricas de **Cambios** sigue sin decidir, y los diez bloques del raíl sin plegar (M49).

**Veredicto**: [ADR 0070](../../adr/0061-0070/0070-los-ficheros-del-cambio-en-una-lista.md), hecho.
