---
title: "Las herramientas del MCP, una por asunto"
date: "2026-10-31"
category: "chore"
verdict: "arreglo"
---

**Qué era**: `apps/mcp/src/tools.ts` tenía **1808 líneas** y era el fichero más largo del mapa: el

contrato de las herramientas, el mapa, la migración, el historial, la configuración, los símbolos, el

lint y la captura, todo en el mismo sitio. Cualquier cambio en una herramienta obligaba a recorrer un

fichero que hablaba de nueve cosas.

**Qué cambia**: el fichero se parte en diez módulos con un asunto cada uno —`types`, `map`,

`migration`, `history`, `config`, `symbols`, `analysis`, `lint`, `shot`— y dos internos que no son

herramientas: `helpers` y `scope`. `tools.ts` queda como superficie de catorce líneas: el servidor y las

pruebas siguen importando de ahí y no saben en qué módulo vive cada cosa. El tipo de un fichero —con su

entrada y su salida juntas— se declara una vez en `types.ts`, en el orden en que se lee el mapa, y la

cadena de símbolos deja de tener sus tipos fuera del sitio donde viven los demás.

**Por qué así**: partir por asunto y no por tamaño. Un módulo que se llama `history` y solo tiene

historial se puede leer de una vez; uno que se llama `tools` y tiene todo, no. El barril mantiene la

frontera que ya usaban los consumidores: el reparto es interno y no cambia ni una llamada.

**Verificado**: `npm run lint` sin mensajes en 570 ficheros, typecheck limpio y la suite completa en

verde con los **43 tests del MCP** intactos (162 ficheros, 1395 tests). Las 53 funciones exportadas

siguen exportándose; los diez ayudantes internos dejan de salir del barril.

**Veredicto**: arreglo.
