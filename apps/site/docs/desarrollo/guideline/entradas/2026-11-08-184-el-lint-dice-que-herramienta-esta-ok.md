---
title: "El lint dice qué herramienta está ok"
date: "2026-11-08"
category: "feature"
verdict: "arreglo"
---

**Qué era**: la ficha de proyecto decía «Limpio y al día», pero no se podía ver qué herramienta lo había medido ni cuántas reglas tenía activas. La única pista era la nota de oxlint cuando faltaba su config.

**Qué cambia**: la sección **Lint** de la ficha de proyecto tiene una fila por herramienta con su estado (`ok`, `medido`, `cobertura parcial`, `sin medir`), su archivo de configuración, las reglas activas y los ficheros medidos. La nota de la herramienta queda en su fila. No es el catálogo de reglas: eso sigue en **Docs y config**. Además, el repo estrena `.oxlintrc.json` con cinco reglas explícitas y las categorías apagadas, para que el catálogo de oxlint se lea igual que el de ESLint y el live pueda enseñar sus reglas.

**Por qué así**: «limpio» sin sujeto no se puede auditar. La ficha dice qué se midió y con qué; el catálogo y las reglas personalizadas de CodArch son otra cosa y quedan para después. La config de oxlint es del repo, no del producto.

**Verificado**: ESLint con 24 reglas y oxlint con 5 en **Docs y config**; 731 medidos, 0 hallazgos y `fresh === true`; el live sirve el snapshot y el lint con el mismo checksum. El cambio de `.oxlintrc.json` reaparece en el artefacto y en la ficha sin reiniciar el navegador.

**Qué falta**: las reglas propias de CodArch —arquitectura, doc y config— no se tocan aquí. Checkstyle, Biome y Ruff siguen sin enumerar sus limpios si no tienen comando de listado.

**Tamaño**: una fila por herramienta en `LintSection`, su helper en `lintHealth` y el `.oxlintrc.json` del repo.

**Veredicto**: hecho.
