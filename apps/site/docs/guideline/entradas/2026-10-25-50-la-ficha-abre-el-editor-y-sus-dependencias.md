---
title: La ficha abre el editor y sus dependencias
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: la ficha ya enseñaba el código, pero para editarlo había que buscar el fichero y la línea a mano. Y del grafo de imports solo se veían los números de fan-in y fan-out, no los nombres de los ficheros con los que habla.

**Qué cambió**: el bloque de código gana **Editor** y **Copiar ruta**. En el escritorio y en la web servida, Editor compone `vscode://file/…:línea` y abre el fichero; Copiar ruta deja `ruta:línea` en el portapapeles y funciona siempre, también en el análisis de carpeta del navegador, donde no hay ruta absoluta. La pestaña Fichero gana **Dependencias**: **Importa** y **Lo usan**, deduplicadas y ordenadas, y cada ruta abre ese fichero en el mapa y en la ficha.

**Números**: las dependencias salen del `RenderModel` que ya existía; no se añade nada a `cc.json` ni cambia el checksum. En `tools.ts` se ven 5 salidas y 3 entradas, con nombres en vez de solo `fanOut`/`fanIn`. El código sigue con fondo negro y Prism.

**Qué queda a nivel de fichero**: ya están métricas, símbolos, código, miembros, superficie, dependencias, cadena, reglas y migración. Quedan el tipo de arista y la elección de editor en los ajustes.

**Veredicto**: [ADR 0068](../../adr/0061-0070/0068-la-ficha-abre-el-editor-y-sus-dependencias.md), hecho. Después vienen los ajustes y las mejoras visuales, poco a poco.
