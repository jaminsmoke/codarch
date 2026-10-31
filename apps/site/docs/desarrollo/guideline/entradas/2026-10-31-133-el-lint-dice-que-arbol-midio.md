---
title: "El lint dice qué árbol midió"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: la hoja del proyecto decía `0 ficheros con hallazgos · score 0` y no había manera de saber si el repo estaba limpio o si nadie lo había mirado. El artefacto guardaba solo los ficheros **con** hallazgos —los limpios desaparecían— y su `meta.checksum` es el hash de su propio contenido, no el del árbol: un `lint.cc.json` de otra sesión se leía como si fuera el de la pantalla. En este repo la medida sí era limpia —`eslint .` sobre 494 ficheros y `oxlint .` sobre 539, los dos sin un mensaje—, pero el fichero no lo demostraba. En la misma revisión salieron más divergencias: el riesgo por fichero leía las cuentas **declaradas** en el artefacto mientras las hojas contaban **mensajes**; `--fail-on` decidía con el resumen declarado y el informe se imprimía con los mensajes, igual que el `summary` del MCP; y el dock del mapa y los Ajustes tenían cada uno su lista de colores. La lente del lint, pendiente desde el ADR 0094, tampoco existía.

**Qué cambia**: el artefacto sube a **1.2**. `summary.measured` dice cuántos ficheros se miraron, limpios incluidos, y `meta.tree` guarda el checksum del snapshot medido, que ponen `serve` y el live —`codarch lint` suelto no analiza y no lo inventa—. La hoja enseña `N ficheros con hallazgos de M medidos` y avisa **«Este lint es de otro árbol»** cuando no cuadra con el mapa. `serve` con live mide al arrancar, no solo al guardar. Y llega la lente **Lint**: cada fichero se pinta con su deuda (errores + ¼ avisos) sobre el máximo del mapa, con su leyenda y un aviso cuando no hay artefacto, y se elige en **COLOR** como las demás. La lista de colores es una sola para el dock y los Ajustes, y la cuenta por fichero, el `--fail-on` y el `summary` del MCP salen de `lintTotals` y `lintFileCounts`, los mismos que las hojas.

**Por qué así**: un cero sin procedencia no es un dato. Con la cobertura y el árbol, el mismo cero dice «se miraron 494 y no hay nada», que es lo que se quería saber. Y dos formas de contar lo mismo acaban dando dos cifras: la cuenta vive en un sitio y los consumidores la leen.

**Verificado**: `eslint .` con 494 ficheros y 0 mensajes, `oxlint .` con 0 avisos y 0 errores, `eslint -c eslint.config.types.js .` limpio; el artefacto de este repo, escrito por el live, con `measured` y `tree`. Tests de la lente en el render y en la app, de la cobertura y la procedencia en la hoja, de la cola con su árbol, del MCP con un artefacto de cuentas infladas —el resumen sale de los mensajes— y del CLI con «de N medidos». Typecheck, lint y suites en verde.

**Veredicto**: arreglo.
