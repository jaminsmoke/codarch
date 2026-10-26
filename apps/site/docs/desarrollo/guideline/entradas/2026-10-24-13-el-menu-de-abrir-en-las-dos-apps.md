---
title: El menú de abrir, igual en las dos apps
date: "2026-10-24"
category: refactor
verdict: arreglo
---

**Qué es**: que la web y el escritorio abran las cosas desde el mismo menú **Abrir** de la cabecera,
y que el escritorio deje de tener «cc.json» y «report.json» como botones sueltos.

**Por qué**: la unificación de M33 se llevó el armazón, pero se quedó fuera la cabecera: el
escritorio seguía con tres botones y la web con un menú desplegable. Eran dos formas de hacer lo
mismo y una de ellas ocupaba media barra.

**Qué cambió**: `OpenMenu` en `@codarch/ui` pinta el desplegable (etiqueta larga y corta, cierre al
elegir) y cada app le pasa sus opciones. La web conserva monitorizar carpeta, carpeta con `.codarch`,
analizar en el navegador, cargar por URL y archivo cc.json; el escritorio tiene analizar carpeta,
archivo cc.json y reporte JSON. El engranaje de ajustes queda al final en las dos.

**Veredicto**: cambio de interfaz; no necesita ADR.
