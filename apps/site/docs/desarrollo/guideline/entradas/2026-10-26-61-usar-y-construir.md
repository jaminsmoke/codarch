---
title: Usar CodArch y cómo se construye
date: "2026-10-26"
category: docs
verdict: adr
---

**Qué era**: la sidebar tenía un solo bloque «El producto» que mezclaba el roadmap, el modelo y el diseño del mapa con las reglas y el MCP. No había páginas de instalación, primeros pasos, webapp, escritorio ni acción, y la portada contaba la webapp como si analizara sola en el navegador.

**Qué cambió**: dos bloques. **Usar CodArch** (`section: producto`, páginas en `docs/usar/`) y **Cómo se construye** (`section: construir`, con los ADR y la guía). Nuevas páginas de primeros pasos, webapp, escritorio, GitHub Action y preguntas frecuentes, con su gemela inglesa. La portada y el README cuentan las tres vías: CLI + webapp (`npm i -g codarch`, se abre con `codarch serve`), webapp sola con Docker y el instalador de escritorio.

**Veredicto**: [ADR 0080](../../adr/0071-0080/0080-usar-y-construir.md). Faltan las páginas de instalación, CLI y actualizaciones, y las capturas marcadas como pendientes.
