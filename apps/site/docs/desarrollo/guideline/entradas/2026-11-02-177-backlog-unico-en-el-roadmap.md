---
title: "Backlog único en el roadmap; casillas abiertas fuera de los ADR"
date: "2026-11-02"
category: "docs"
verdict: "hecho"
---

**Qué era**: varias hojas de ruta de ADR y el checklist del diseño del mapa
acumulaban casillas `- [ ]` que no eran fase. El smoke de la acción, las páginas
de instalación/CLI y la evidencia del escritorio empaquetado (chunk diferido y
`file://`) seguían abiertos en papel aunque el código ya los cubría. La línea del
enlace (`rest.links`) quedó fuera de M76 sin un sitio único donde vivir.

**Qué cambia**: se verifican y marcan hechos 0066 (smoke en subruta), 0080
(instalación/CLI/actualizaciones; capturas pendientes **obsoletas**), 0086 y
0087 (asar con `CodeEditor-*.js`, rutas relativas, `loadFile`, IPC `whole`). Los
ítems que siguen abiertos —incluido Marketplace `action.yml` raíz y la lente
`rest.links`— pasan al **Backlog** del [roadmap](/desarrollo/roadmap/#backlog)
(ES y EN alineados). Cada ADR abierto apunta a ese backlog en lugar de casillas
sueltas. Guía y mapa siguen el mismo criterio.

**Por qué así**: una fase nace en su ADR; lo que aún no es fase no debe vivir
disperso. El backlog enlaza la decisión y evita que un `[ ]` se confunda con
trabajo de la fase cerrada.

**Verificado**: revisión de código y `package:dir` del escritorio; workflow de
`codarch-action-smoke` en `jaminsmoke/codarch/apps/github-action@v1`; arranque
de `codarch.exe` empaquetado.

**Veredicto**: hecho. Queda manual opcional: doble clic en la UI empaquetada
para abrir un fichero entero (la ruta `file://` y el trozo ya están listos).
