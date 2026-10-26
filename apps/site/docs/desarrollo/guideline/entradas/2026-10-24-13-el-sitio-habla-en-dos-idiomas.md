---
title: El sitio habla en dos idiomas
date: "2026-10-24"
category: feature
verdict: fase
---

**Qué es**: llevar el sitio a inglés de verdad. El español sigue siendo el idioma por defecto y todo
lo que ya existía no cambia; al lado hay un `/en/` con la portada, la guía y los documentos.

**Por qué**: el ADR 0046 dejó los idiomas *preparados*: `locales`, `i18n` y `lang` en los
componentes, pero la interfaz tenía cadenas en español escritas a mano y la portada y la guía no
tenían versión inglesa. Un idioma a medias se nota antes que uno que no existe.

**Qué cambió**: un selector ES/EN en la cabecera de la portada y la guía (los documentos ya tienen
el de Starlight), las rutas `/en/`, `/en/guia/`, `/en/guia/AAAA-MM-DD/`, `/en/guia/futuro/` y
`/en/guia/normas/`, un diccionario ES/EN completo en `src/lib/i18n.ts` y fechas, categorías y
veredictos de la guía formateados en el idioma de la página. Los documentos de producto están
traducidos en `apps/site/docs/en/` (índice, modelo, reglas, MCP, migración, mapa, e índice y hoja de
ruta de los ADR); lo que falta cae al español con el aviso de Starlight, y la guía avisa de que sus
entradas están en español.

**Cobertura**: interfaz al 100 % (77 claves en cada diccionario). Documentos: 8 de 58 páginas, el
21 % del texto. Los 50 ADR y las 33 entradas de la guía siguen en español. Traducirlos es contenido
revisado, no un `t()`: se hace fichero a fichero.

**Veredicto**: **fase M31**, con la hoja de ruta en
[ADR 0046](../../adr/0041-0050/0046-los-documentos-con-starlight.md#m31--el-sitio-en-dos-idiomas).
