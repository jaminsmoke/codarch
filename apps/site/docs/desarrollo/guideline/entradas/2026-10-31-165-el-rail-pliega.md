---
title: "El raíl pliega y el guard lo exige"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: los cuatro bloques del raíl —**Vista**, **Estratos**, **Leyenda** y **Más reescritos**—
llevaban su encabezado suelto en un `.eyebrow` y no se podían plegar: en una pantalla baja el mapa
perdía el ancho sin ganar nada. Y `sections.test.ts` solo probaba el almacenamiento, así que nada
obligaba a una sección nueva a declarar título, cuenta y resumen.

**Qué cambia**: los cuatro son secciones plegables con su cuenta y una cifra corta de resumen —Vista,
áreas y colores; Estratos, `rloc`; Leyenda, la cifra de su modo; Más reescritos, símbolos— y la leyenda
conserva su título por modo («Leyenda · lint», «Leyenda · riesgo»…). `sectionGuard` lee los `.tsx` de
`@codarch/ui` y falla si una sección no declara `id`, `title`, `count` y `summary`; los grupos de
símbolos —su cuenta es el resumen— y las secciones sin datos (`section-empty`) quedan fuera con nombre
propio. El guard encontró una sección real sin resumen, **Ciclos nuevos**, que ahora dice «sin ciclos
nuevos» o «N nuevos».

**Por qué así**: una sección que se pliega y no dice nada al cerrarse es una sección escondida. El guard
vive en el paquete que comparten la web y el escritorio, así que la comprobación no se escribe dos veces
ni se olvida en una de las dos.

**Verificado**: suite completa en verde, typecheck limpio y `site:build` con 287 páginas. El lint no da
errores; queda un aviso previo en `packages/parsers/src/duplication.ts`.

**Veredicto**: arreglo. M49 sigue abierta por la tabla base→head (M52).
