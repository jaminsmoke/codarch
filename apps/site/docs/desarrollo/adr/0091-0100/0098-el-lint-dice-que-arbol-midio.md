---
title: "ADR 0098 — El lint dice qué árbol midió"
description: "El artefacto del lint sube a 1.2 con `meta.tree` —el checksum del snapshot medido— y `summary.measured` —los ficheros que llegaron a mirarse—, para que la app distinga «medido y limpio» de «no se midió» y avise cuando el lint es de otro árbol. La lente del lint, que faltaba desde el ADR 0094, se cierra en la misma pasada."
section: desarrollo
status: aceptado
date: "2026-10-31"
sidebar:
  label: El lint dice qué árbol midió
  order: 98
---

**Estado:** aceptado · **Fecha:** 2026-10-31

## Contexto

La hoja del proyecto enseñaba `0 ficheros con hallazgos · score 0` y no había forma de saber si eso
quería decir «el repo está limpio» o «nadie miró». El artefacto guardaba los ficheros **con**
hallazgos —los limpios no aparecían— y su `meta.checksum` es el hash de su propio contenido: dos
pasadas con la misma salida dan el mismo checksum aunque sean de árboles distintos. Así, un
`.codarch/lint.cc.json` viejo se leía como si fuera del árbol que había en pantalla, y una cifra de
ayer pasaba por la de hoy. En este repo la medida sí era limpia —ESLint sobre 494 ficheros y oxlint
sobre 539, los dos sin un mensaje—, pero el fichero no lo demostraba.

En la misma revisión aparecieron tres divergencias de cifra y una de lentes:

- El riesgo por fichero leía `errors` y `warnings` **declarados** en el artefacto, mientras las hojas
  contaban **mensajes**. Un artefacto de fuera con las cuentas desincronizadas hacía que el mapa y
  la ficha dijeran números distintos.
- `codarch lint --fail-on` decidía con el `summary` del artefacto y el informe se imprimía con los
  mensajes. Mismo problema en el `summary` del MCP.
- El dock del mapa tenía su **propia lista** de colores y Ajustes la suya: una podía ofrecer una
  lente que la otra no dejaba elegir.
- La lente del lint seguía pendiente (ADR 0094, ADR 0097), así que la deuda no se podía ver en el
  mapa.

## Decisión

### 1. La cobertura se guarda

`summary.measured` dice cuántos ficheros llegaron a mirarse, **incluidos los limpios**. Un artefacto
con `measured: 494` y cero hallazgos afirma que el repo está limpio; uno sin cobertura, no. El
artefacto sube a **1.2** y los 1.0 y 1.1 se siguen leyendo: en ellos `measured` no existe y la app
simplemente no enseña esa cifra.

### 2. El artefacto firma el árbol

`meta.tree` es el checksum del snapshot que se midió. Lo pone quien analiza —`serve` y el live, que
son los únicos que saben de qué árbol hablan— al lanzar la pasada. `codarch lint` suelto **no lo
inventa**: no analiza, así que deja el campo fuera y la app no pregunta.

Con los dos campos, la hoja del proyecto dice `N ficheros con hallazgos de M medidos` y avisa
**«Este lint es de otro árbol»** cuando `meta.tree` no es el checksum del mapa. No es un cero lo que
se corrige: es un cero sin procedencia.

### 3. El live mide al arrancar

`serve` con live lanza una pasada al empezar, en segundo plano, además de la de cada guardado. Antes
solo medía cuando el vigilante veía un cambio: un servidor recién arrancado servía el lint de la
sesión anterior hasta que alguien guardaba algo. Sin live no se lanza ningún linter: el servidor solo
sirve.

### 4. La lente del lint, cerrada

El color por deuda de lint no lee una métrica del snapshot: lee `file.lint` del modelo (errores + ¼
avisos) y se escala con el **máximo del mapa**, que el modelo expone como `lintMax`. La comparten el
mapa de la app, la leyenda y el PNG de `codarch shot`. Sin artefacto la lente no se ofrece y la
banda del proyecto dice que no hay lint medido, en vez de pintar todos los bloques como limpios.

La lista de colores es **una**: `colorOptions` en `useCodarchApp`, que usan el dock y Ajustes.

### 5. Una sola cuenta

- El riesgo por fichero toma sus cuentas con `lintFileCounts`, que cuenta **mensajes**, igual que
  `lintTotals` y `lintRules`.
- `--fail-on` y el `summary` del MCP usan `lintTotals`, no el resumen declarado del artefacto.

## Consecuencias

- Un `0` en la hoja del proyecto lleva su cobertura al lado y, si el lint es de otro árbol, se dice.
- El riesgo del fichero y la ficha no pueden contar de dos maneras: comparten fuente.
- La deuda se ve en el mapa con la misma escala que se lee en la leyenda y en la captura.
- `codarch lint` desde CI sigue escribiendo un artefacto válido, sin árbol: la app no lo marca como
  viejo porque no puede saberlo, y no finge que lo sabe.
- El artefacto tiene dos campos nuevos y la misma determinación: mismas herramientas, misma salida,
  mismo fichero.

## Hoja de ruta

Fases **M65 — El lint, en el mapa** y **M67 — El lint es del proyecto**.

- ✅ `summary.measured` y `meta.tree` en el artefacto 1.2; lectura de 1.0 y 1.1.
- ✅ La hoja del proyecto dice los ficheros medidos y avisa del lint de otro árbol.
- ✅ `serve` con live mide al arrancar.
- ✅ La lente del lint: color por deuda, escala del mapa, leyenda y aviso sin artefacto.
- ✅ Una sola lista de colores en el dock y en Ajustes.
- ✅ La cuenta por fichero y los totales del CLI y del MCP salen de los mensajes.
- ⬜ El punto del lint en la barra (ADR 0094).
- ⬜ Otras herramientas por lenguaje (ADR 0094).

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
