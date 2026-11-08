---
title: "La leyenda del resto no repite Estratos"
date: "2026-11-08"
category: "removed"
verdict: "arreglo"
---

**Qué era**: el raíl del mapa del resto enseñaba dos veces lo mismo. **Estratos** ya repartía los ficheros por `kind` con su barra, sus tonos y la cuenta de cada tipo, y justo debajo **Leyenda · tipo** volvía a listar los mismos cuatro tonos con las mismas cifras.

**Qué cambia**: el modo de color `kind` ya no dibuja leyenda. **Estratos** queda como la única lectura del tipo en el raíl, y el mapa conserva su cuarta lente sin un bloque que la repita.

**Por qué así**: una leyenda que dice lo que el bloque de arriba ya dice no aclara: ocupa alto en una hoja estrecha y hace dudar de si son dos cuentas distintas. El resto de lentes —lint, riesgo, migración, métricas— mantienen su leyenda porque no tienen otro bloque que las cuente.

**Qué falta**: nada. La lente por tipo y su selector siguen igual; solo desaparece su bloque duplicado.

**Tamaño**: una rama de `Legend` y su caso de prueba. La documentación de uso y la hoja de ruta del ADR 0093 dicen ahora que el reparto vive en **Estratos**.

**Veredicto**: hecho.
