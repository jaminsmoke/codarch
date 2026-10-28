---
title: El mapa no escribe nombres que no caben
date: "2026-10-28"
category: fix
verdict: arreglo
---

**Qué era**: cada bloque del mapa escribía su nombre desde los dos píxeles de lado. En este repositorio eran **449** etiquetas para 405 ficheros, y en **169** el tipo salía por debajo de seis píxeles; en **42** no cabían ni cuatro letras por línea, así que un fichero como `symbols.ts` se leía `symb / ols / .` y un `chartreuse.test.ts` en una celda estrecha se partía en columnas de dos letras.

**Qué es**: `labelFor` exige ahora un tipo de **6** y **cinco** letras por línea; si el bloque no da para eso, no lleva nombre. El mapa pasa de **449** etiquetas a **218** y ninguna queda por debajo de esos dos mínimos. El corte se calcula con el lado corto y con el largo: el primero fija el tamaño de la letra y el segundo dice cuántas caben.

**Por qué así**: la regla anterior se justificaba diciendo que con el zoom se lee. No es cierto para un nombre: el zoom agranda la celda y su texto por igual —el tipo se mide en unidades del mapa—, así que un bloque que solo cabía tres letras las cabe también acercado, solo que más grandes. Un nombre partido en tres letras no se vuelve legible acercándose, y a cambio llena el mapa de manchas. El SVG que genera el CLI ya era más estricto —44×13 y puntos suspensivos—; esto acerca la app a esa regla sin perder el envoltorio que sí aprovechan los bloques grandes.

**Cómo se comprueba**: nueve casos en `packages/ui/test/labels.test.ts` fijan la regla —un cuadrado de veinte píxeles no lleva nombre, uno de 44×15 sí—. En la app abierta contra el repo, el mapa dibuja **218** etiquetas, ninguna por debajo de 6 px ni de cinco letras por línea, y los bloques grandes (`analyze-core.ts`, `serve.ts`) siguen partiendo su nombre en dos líneas como antes.

**Veredicto**: hecho. Si el mapa se queda corto de nombres, el dial son dos constantes —`MIN_SIZE` y `MIN_CHARS`— y las dos están probadas.
