---
title: "La hoja del proyecto, como la del fichero"
date: "2026-10-30"
category: "feature"
verdict: "arreglo"
---

**Qué era**: la hoja del proyecto tenía su propia idea de **Métricas**: una lista de cuatro totales —ficheros, carpetas, líneas y complejidad— y el lint como una fila más. La ficha del fichero, en cambio, enseña una tabla con nombre, barra, valor y ayuda desde el ADR 0060. Mientras tanto, el snapshot traía diecisiete métricas y la hoja de proyecto callaba trece. Y seguía la trampa de las palabras: **Métricas** decía «0 errores · 0 avisos» —hallazgos— mientras **Reglas** decía «22 errores · 2 avisos» —reglas configuradas con esa severidad—, dos frases que parecían el mismo dato y no lo eran.

**Qué cambia**: **Métricas** es ahora la tabla de la ficha del fichero con otro sujeto: una fila por cada métrica del snapshot, la barra como **cobertura** —la parte de los ficheros que la trae— y el valor como suma; las métricas que ya son un máximo por fichero (complejidad, función más larga, nivel de dependencia, ciclos) no se suman: se enseña el mayor y su dueño. Pulsar una fila pinta el mapa, igual que en el fichero. El **lint** es un bloque dentro de Métricas con sus tres cuentas —errores, avisos e info—, los ficheros con hallazgos y el score, y **Lint por carpeta** con err., avis., info y score; los recuentos de ficheros y carpetas se quedan en la cabecera de la hoja, que ya los decía. **Reglas** deja de agregar severidades: un sistema lleva su filete, su píldora y su barra, sin cifras, y la severidad se lee regla a regla. El contador compartido suma desde los mensajes y expone `info`, así que la app, el CLI y el MCP leen la misma cuenta.

**Por qué así**: una métrica se tiene que leer igual en las tres hojas, y lo que cambia es el sujeto, no el formato. La barra del fichero llega al p95; una suma no se compara con el p95 de un fichero, así que en proyecto y carpeta la barra dice lo único que se puede leer sin mentir: cuánto del subárbol trae el dato. Y un total de reglas configuradas no puede llamarse «errores» al lado de una sección que cuenta errores de verdad.

**Verificado**: tests de `rollupMetricRows` —suma, máximo con dueño, cobertura, fila derivada de complejidad, marca del área— y de la hoja con el formato nuevo; 303 tests de UI en verde. Render con el snapshot real de este repo: 17 filas de métricas, `0 errores · 0 avisos · 0 info`, `0 ficheros con hallazgos · score 0`, y en Reglas solo `24 reglas activas`, sin ningún total que se pueda confundir con los hallazgos. Typecheck, lint, suite, web y sitio en verde.

**Veredicto**: arreglo.
