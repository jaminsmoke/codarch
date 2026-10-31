---
title: "El lint se llama cc"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: el artefacto del lint era `.codarch/lint.json`, un nombre que se confunde con el de cualquier herramienta y que no decía de quién era.

**Qué cambia**: pasa a `.codarch/lint.cc.json`, en la familia de `cc.json` y `rest.cc.json`. El lector busca los dos nombres y solo se escribe el nuevo, así que un repo que ya tenía `lint.json` no se queda sin lint. `serve` sirve `/data/lint.cc.json`, `render` publica `data/lint.cc.json`, y la web y el escritorio leen el nuevo con el viejo de reserva. El contenido no cambia: sigue siendo el reporte **normalizado** de lo que dijeron las herramientas del proyecto —la regla, la severidad, la línea, la columna y el texto, con rutas relativas y orden canónico—, no un formato nuevo ni una medida propia.

**Por qué así**: guardar el JSON crudo de cada herramienta traería rutas absolutas y dos formas distintas de lo mismo: la app y la captura necesitarían un lector por dialecto y el checksum dejaría de ser estable. Normalizar es lo que hace que el reporte sea el mismo se mire desde donde se mire, y lo único que se añade al de la herramienta es el nombre de la regla y su sitio, que ya venían en él.

**Verificado**: tests que escriben el nombre nuevo y leen el viejo en el CLI, `serve` y `shot`, y los de la web y el escritorio con las dos rutas. Suite completa (1.241), lint, typecheck y build del sitio en verde; una pasada real de `codarch lint .` deja `lint.cc.json`.

**Lo que falta**: nada del nombre. Los lectores de Biome y Ruff siguen pendientes, como el resto de la hoja de ruta del ADR 0096.

**Veredicto**: fase en marcha.
