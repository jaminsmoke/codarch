---
title: "El resto, en la barra"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: con el [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) el resto ya se medía y se escribía, pero nadie lo cargaba: `rest.cc.json` estaba en `.codarch/` y la app seguía enseñando un solo mapa.

**Qué cambia**: la web y el escritorio cargan los dos artefactos de la misma pasada —el servidor los sirve juntos, la carpeta del repo trae el suyo, el análisis del navegador y el del escritorio lo devuelven con el snapshot— y la barra de actividad de la izquierda gana un segundo botón: **`Docs y config`**, con el icono de documento. Pulsar el del mapa activo pliega la hoja, como antes; pulsar el otro cambia el mapa entero y deja su hoja abierta. Sin `rest.cc.json` el botón se ve desactivado.

**Por qué así**: no es una pestaña del escenario ni una vista de plugin. Las pestañas ya significan «la vista que trae un plugin» y lo que hace esto es cambiar de modelo —árbol, métricas, ficha y raíl—, así que vive en la barra de mapas, donde se elige qué se está mirando. Tampoco se parte en un mapa por tipo: documentos, configuración y assets son un solo mapa.

**Lo que cambia dentro**: el área del resto es su tamaño y su color también lo es, hasta que llegue el color por tipo; los bloques que solo hablan de código —los lenguajes y el calor de los símbolos— desaparecen del raíl, y la leyenda y la ficha de fichero se apoyan en las métricas del resto. Al cambiar de mapa se suelta la selección, el foco y el fichero abierto, porque son del modelo anterior.

**Lo que falta**: el color por tipo con su leyenda, los estratos agrupados por `kind` y la ficha propia del fichero que no es código; las reglas del resto, en su ADR.

**Veredicto**: fase en marcha.
