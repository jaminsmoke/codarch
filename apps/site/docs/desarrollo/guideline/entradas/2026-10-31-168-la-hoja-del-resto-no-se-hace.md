---
title: "La hoja del resto no se hace"
date: "2026-10-31"
category: "removed"
verdict: "arreglo"
---

**Qué era**: M64 pedía una ficha propia para un fichero que no es código y otra para la carpeta con el
resto dentro. El fichero del resto ya se lee con la ficha común: cabecera, métricas sin riesgo y sus
enlaces entre documentos. La carpeta, en el mapa del resto, usa la misma hoja que la del código.

**Qué cambia**: la casilla se cancela en la hoja del ADR 0093. M64 sigue con lo que de verdad falta: los
estratos por `kind` en el raíl y las reglas del resto, que necesitan su ADR.

**Por qué así**: no hay símbolos, miembros, código ni cadena que enseñar, así que una hoja propia sería
la común con más secciones escondidas. El problema no era la hoja: era el contenido que ya se lee. Y lo
que hay que arreglar está en las fichas que ya existen, no en una cuarta para documentos.

**Verificado**: `site:build` con 287 páginas y la suite del sitio en verde.

**Veredicto**: arreglo. La hoja del resto se cancela; quedan los estratos por tipo y las reglas del resto.
