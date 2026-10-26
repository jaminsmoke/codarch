---
title: La cabecera, sin demo y con el enlace dentro
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: quitar la demo de la web y mover **Copiar enlace** al menú **Abrir**, para que la
cabecera de la web y la del escritorio se parezcan de verdad.

**Por qué**: la demo era un resto de cuando no había servidor ni `.codarch/`: cargaba un snapshot de
ejemplo y ocupaba un botón. Y el enlace de la vista es una acción más de «abrir», no un botón fijo al
lado de los ajustes.

**Qué cambió**: fuera el botón **Demo**, su carga al arrancar y el aviso de la demo; si no hay
servidor ni proyecto guardado, la app enseña el estado vacío y pide un `cc.json`. **Copiar enlace de
la vista** vive ahora en el menú **Abrir** y, al copiar, el menú se queda abierto con **Enlace
copiado** para que se note. El indicador **Live** de la web se queda: es el que dice que el servidor
reanaliza y el mapa se refresca solo.

**Veredicto**: cambio de interfaz; no necesita ADR. La vigilancia en el escritorio (su indicador
equivalente) llega con M34.
