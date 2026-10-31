---
title: "Las reglas de Ruff, expandidas"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: el bloque de Ruff listaba sus selectores —`E`, `F`, `E501`— con una nota diciendo que cada uno podía agrupar varias reglas. Era lo que decía la config, pero no lo que el proyecto exige: nadie sabe de memoria si `E` son cuarenta reglas o sesenta.

**Qué cambia**: Ruff pide su catálogo a la versión que tiene el proyecto, `ruff rule --all --output-format=json`, y expande cada selector a las reglas que casa. La especificidad es la de Ruff: gana el selector más concreto y, si empatan, el ignorado; `ALL` vale por todas. Así, `select = ["E", "F"]` con `ignore = ["E501"]` deja E101 y F401 y descarta E501, mientras que `select = ["E501"]` con `ignore = ["E"]` conserva E501. Las reglas entran ordenadas y sin repetir, y la nota dice que salen del catálogo. Si el catálogo no se puede leer —Ruff no está o su versión no lo da en JSON— se listan los selectores y la nota dice por qué.

**Por qué así**: el catálogo lo da la herramienta, no nosotros. Una tabla de reglas por versión en el repo envejecería y mentiría en cuanto se actualizara Ruff, que es exactamente lo que el ADR 0096 evita: medir con lo que el proyecto tiene.

**Verificado**: tests de la expansión por prefijo, de la especificidad en los dos sentidos y de `ALL`, del catálogo sin repetidos ni basura, y de las dos notas: con catálogo y sin él. Además, una pasada real de `codarch lint` en el repo de prueba con su binario simulado: `select = ["E", "F"]`, `extend-select = ["B"]` e `ignore = ["E501"]` salen como B006, E101 y F401. Suite completa (1.260), lint, typecheck y build del sitio en verde.

**Lo que falta**: las reglas de Checkstyle, y los lectores de Checkstyle, `go vet` y los analizadores de .NET.

**Veredicto**: fase en marcha.
