---
title: Los documentos, en la web
date: "2026-10-22"
category: docs
verdict: fase
---

**Qué es**: que los documentos del repo se **lean en el sitio** y no solo en GitHub. Hasta
ahora la web tenía portada y guía; los ADR, el roadmap, el modelo y las reglas se
quedaban en markdown.

**Cómo**: una página por documento, con el **menú**, el **índice de la página** y los
**vecinos**. Los enlaces entre documentos ya no salen al repo: navegan en el sitio y sin
recargar. Los **diagramas Mermaid** se dibujan, y solo se cargan en la página que los trae.
Cada vista viaja en su trozo: la portada no lleva el markdown de nadie.

**De paso**: la entrada que **espera** ya no se pinta dos veces (estaba en su día y en
Futuro con el mismo ancla) y el MCP dice **nueve** consultas, no seis.

**Veredicto**: **fase M23**, hecha en la hoja de
[ADR 0034](../../adr/0031-0040/0034-la-web-del-proyecto.md#hoja-de-ruta). Quedan el dominio y la
búsqueda.
