---
title: Cambios es de git
date: "2026-10-26"
category: fix
verdict: adr
---

**Qué era**: la pestaña Cambios mezclaba cosas que no son un cambio —reglas de arquitectura, deuda de migración, símbolos, ciclos y el histórico de fotos— y, peor, el dato no siempre era de ahora: la app pedía `data/report.json` y solo lo sustituía por el reporte HEAD si llegaba. En este repositorio la pestaña enseñaba 65 ficheros añadidos de un reporte de tres días antes mientras el árbol tenía ocho ficheros tocados. Sin git no había respaldo: el histórico crecía y la lista de cambios acababa siendo un archivo, no una pestaña.

**Qué cambió**: la pestaña enseña solo el árbol de trabajo contra su último commit. Con servidor pide un único reporte, el HEAD, y el refresco en vivo relee ese; un artefacto estático —el mapa de un PR— conserva su `report.json`, porque ahí no hay repositorio con el que comparar. Sin git lo dice, y sin cambios también. Las reglas salen de la pestaña y de su cuenta de cambios: no son un cambio del código y la ficha de cada fichero ya las lista. El histórico se queda al final, plegado y con su frase: son fotos guardadas del repositorio, no los cambios de hoy.

**Números**: el panel pierde unas cien líneas de reglas y dos pestañas de datos se quedan en una; ni `cc.json`, ni el checksum, ni el formato de `report.json`, ni lo que publica la acción cambian. La web pasa a pedir un solo reporte al servidor.

**Veredicto**: [ADR 0075](../../adr/0071-0080/0075-cambios-es-de-git.md), hecho. Los tres estados quedaron comprobados en la app servida: con cambios enseña los ficheros tocados, sin git dice que no hay git, y con git limpio dice que no hay cambios desde el último commit.
