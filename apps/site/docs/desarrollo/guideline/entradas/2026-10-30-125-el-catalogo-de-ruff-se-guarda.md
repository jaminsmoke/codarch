---
title: "El catálogo de Ruff se queda en casa"
date: "2026-10-30"
category: "optimized"
verdict: "fase"
---

**Qué era**: para enumerar las reglas activas de Ruff, cada pasada de `codarch lint` —y cada reanálisis de `codarch serve`— lanzaba `ruff rule --all --output-format=json`, que devuelve cientos de reglas. El resultado es el mismo en todas las pasadas de la misma versión del proyecto.

**Qué cambia**: antes de pedir el catálogo se pregunta la versión con `ruff --version` y se busca en `.codarch/lint-cache.json`. Si el fichero tiene esa misma versión, se expanden los selectores con lo guardado y `ruff rule` no se lanza. Si no, se pide el catálogo, se expande y se guarda con la versión que lo dio. Actualizar Ruff cambia la línea de versión e invalida la caché sola, sin migraciones. Si `.codarch/` no existe, no se crea para escribir la caché: la primera pasada que aún no lo tiene no guarda nada y la siguiente ya lo encuentra. Un fallo al escribir se traga la caché y se sigue, que cuesta una llamada, no un resultado.

**Por qué así**: el catálogo no es una decisión del repo sino de la versión instalada, y guardarlo no cambia lo que se mide. Vive fuera del artefacto: no toca `lint.cc.json` ni el checksum, porque la regla que no se mueve es que el checksum depende del código y no de lo que tengas instalado.

**Verificado**: tests de que la primera pasada escribe `{ version, rules }` en `.codarch/lint-cache.json`, de que la segunda no lanza `ruff rule` y expande igual, de que otra versión vuelve a pedir el catálogo, y de que sin `.codarch/` no se crea el directorio. Suite de `packages/lint` en verde, typecheck y build del sitio.

**Veredicto**: fase en marcha.
