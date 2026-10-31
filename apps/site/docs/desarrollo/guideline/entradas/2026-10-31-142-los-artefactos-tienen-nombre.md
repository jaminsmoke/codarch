---
title: "Los artefactos tienen nombre, y el lint es un módulo del reporte"
date: "2026-10-31"
category: "feature"
verdict: "arreglo"
---

**Qué era**: el artefacto del lint se llamaba `lint.cc.json`, pero no es un cc.json —lleva `schemaVersion`
propio, no `meta.apiVersion`—: el sufijo prometía una interoperabilidad que no tiene. Su nombre anterior,
`lint.json`, dejó de escribirse y **seguía leyéndose en siete sitios** —la web dos veces, dos funciones del
CLI, `serve`, el MCP y el escritorio, este último con su constante copiada—, cada uno con su lista de
nombres. En este repo convivían los dos ficheros: el que dejaba un servidor viejo y el que escribe el
análisis. Y alrededor había más preguntas sin respuesta escrita: `report.json` y `head-report.json` sin
relación declarada, y el estado local (`chains`, `scopes`, `parse-cache`, `preferences`) con el mismo
aspecto que un documento que se comparte.

**Qué cambia**: el [ADR 0100](../../adr/0091-0100/0100-los-nombres-de-los-artefactos.md) fija la regla.
`.cc.json` es el **formato**, no la propiedad: solo `snapshot.cc.json` y `rest.cc.json`, los cc.json 2.x
que se abren fuera. `report.json` es el reporte, y sus piezas son `<módulo>.repmod.json` —*report
module*—; el lint pasa a `lint.repmod.json`. `head-report.json` se queda. El estado local no lleva sufijo.
Y **un nombre, un sitio**: el nombre lo declara el paquete que escribe el artefacto y los consumidores
importan la constante. Sin compatibilidad: los siete lectores de nombres viejos y las dos constantes de
alias desaparecen, y un `lint.json` o un `lint.cc.json` de ayer se ignora en vez de leerse a medias.

**Por qué así**: un nombre que miente cuesta código. Cada alias obligaba a repetir la lista de nombres en
otro módulo y a mantener dos caminos para lo mismo; y una carpeta con dos nombres para un artefacto hace
imposible saber cuál manda. En 0.x un artefacto local se regenera midiendo otra vez: la compatibilidad no
vale siete lectores.

**Verificado**: `codarch analyze .` con el CLI recién construido deja `.codarch/lint.repmod.json` (525
ficheros medidos, 0 hallazgos) y la carpeta vuelve a tener sus nueve ficheros, sin `lint.json` ni
`lint.cc.json`. Los tests que fijaban la lectura del nombre viejo ahora fijan lo contrario —el servidor
contesta 204, el MCP dice «sin medir», la captura pinta sin lint— y `format.test.ts` fija el nombre. Lint
sin mensajes en 570 ficheros, typecheck limpio, **1396 tests** en verde y `site:build` con 281 páginas.

**Veredicto**: arreglo.
