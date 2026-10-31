---
title: "Las capturas de la hoja de proyecto"
date: "2026-10-30"
category: "docs"
verdict: "arreglo"
---

**Qué era**: la captura de la hoja **Proyecto** era de antes del rediseño y enseñaba justo lo que la sección ya no dice: la lista de seis filas de Métricas y, en Reglas, `24 reglas activas · 22 errores · 2 avisos`. Quien la miraba leía que el repo tenía 22 errores cuando el lint estaba limpio. No había ninguna captura propia de **Métricas**, así que la sección que cambió de formato no tenía dónde verse.

**Qué cambia**: dos imágenes nuevas en `docs/images/`. `webapp-inspector-proyecto.png`, 1920×1200 y tema claro, con la hoja abierta y el tercer icono encendido en la barra de actividad: la tabla de Métricas completa con su cobertura, el lint con sus tres cuentas y Reglas con `eslint` y `oxlint` medidos. `webapp-inspector-metricas.png`, 600×1746 a escala 2 —el panel recortado—, con la sección entera: las 19 filas de métricas del snapshot, la complejidad máxima con su fichero y el lint con su desglose por carpeta. La segunda entra en el párrafo de **Métricas** de `usar/webapp` y `en/usar/webapp`, con el alt en el idioma de cada página; la primera sustituye a la captura antigua de la hoja.

**Por qué así**: una captura es documentación y no puede enseñar un dato que el producto ya no da. El recorte a escala 2 del panel es la única forma de que el detalle de la tabla se lea en la web sin convertir la captura en una app entera.

**Verificado**: las dos imágenes se sacaron de la app en `web:dev` con el snapshot real de este repo —501 ficheros, 19 métricas, 0 hallazgos— y se revisaron a tamaño completo; el build del sitio las procesa y las páginas de los dos idiomas las referencian.

**Veredicto**: arreglo.
