# Hoja de ruta — ADR 0025 «La lente de símbolos: mirar dentro del fichero»

**Decisión:** [el ADR](0025-lente-de-simbolos.md) · **Estado:** aceptado · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M11 — La lente de símbolos

**Estado:** cerrado. El mapa ya sabe qué hay dentro de cada fichero: funciones, clases, interfaces y
tipos, con su complejidad. Decisión en [ADR 0025](0025-lente-de-simbolos.md).

- [x] **M11.1** El parser recoge los símbolos en el mismo paseo que mide las métricas, con el
  **código compartido** con el navegador: el checksum del snapshot no cambia y la paridad
  navegador/CLI sigue valiendo ✓.
- [x] Solo los símbolos con forma (funciones, clases, interfaces, tipos, enums): las constantes son
  datos, no estructura.
- [x] La lente `symbols` en el snapshot. El `apiVersion` no cambia: una lente opcional no invalida
  el formato ✓ (como la de migración ✓).
- [x] El inspector de las dos apps lista los símbolos del fichero, de la función más compleja a la
  más simple ✓.
- [x] El MCP responde a las dos preguntas: `explain_module` da los símbolos de un fichero y
  `get_architecture_map` resume los del repo y sus funciones más complejas ✓.
