---
title: Tres pestañas y adiós al nombre PR
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: cuatro pestañas. Lentes explicaba el riesgo del fichero seleccionado y Reglas contaba lo
que rompe el cambio, así que la misma pregunta —*¿qué le pasa a este fichero y qué rompe?*— pedía
saltar de una a otra. La cuarta se llamaba PR, de *pull request*, aunque CodArch compara snapshots y
no sabe si hay una revisión abierta.

**Qué cambió**: el inspector se queda en **Fichero · Reglas · Cambios**. Reglas es una sola lectura:
arriba el fichero (riesgo con sus señales y pesos, reglas de dominio, migración, símbolos) y abajo el
cambio (nuevas, existentes y resueltas, errores y avisos, origen, hotspots). La pestaña Lentes
desaparece porque su contenido es ahora la primera mitad de Reglas. PR pasa a llamarse **Cambios**:
es un diff de snapshots, con git o sin él.

**Números**: tres pestañas en vez de cuatro. `tab=changes` es el valor canónico de la URL y de las
vistas guardadas; `tab=lenses` y `tab=pr` se siguen leyendo y se reescriben al nombre nuevo, así que
los enlaces de tickets y las vistas viejas no se rompen. No hay análisis nuevo ni cambia `cc.json`.

**Veredicto**: [ADR 0059](../../adr/0051-0060/0059-tres-pestanas.md), hecho. Quedan en su hoja de ruta
recordar la sección del fichero al cambiar de celda y las dos cosas que ya arrastraba Reglas: filtrar
por severidad u origen y enseñar las reglas configuradas que no se violan.
