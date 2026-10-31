---
title: "Tres fases históricas cierran"
date: "2026-10-31"
category: "docs"
verdict: "arreglo"
---

**Qué era**: tres fases que ya no sostenían su trabajo. **M24** (índice SQLite) seguía «sin empezar» con
una premisa que el tiempo deshizo: se haría «cuando el número de documentos justifique la consulta», y
hoy hay 554 documentos, pero Pagefind indexa el sitio en el build y el markdown sigue siendo la fuente:
la base solo añadiría un artefacto que regenerar. **M31** pedía traducir «los 50 ADR»; ya son 103, son
documentos de construcción y el producto y la guía llevan tiempo en los dos idiomas. **M34** tenía tres
casillas abiertas que el código ya cumplía: el anclaje de alcances con su test diferencial (ADR 0089), la
raíz en la banda y en el título de la ventana, y la vigilancia que se pausa desde Ajustes.

**Qué cambia**: M24 queda descartada, con su razón en la hoja del ADR 0036 y sus pasos como registro de
qué haría falta si se reabre. M31 y M34 cierran en sus hojas (0046 y 0050), con las casillas tachadas y
la evidencia al lado. El índice del roadmap y el estado de `AGENTS.md` dicen lo mismo: quedan abiertas
M23, M49 y M63–M66.

**Por qué así**: una fase que espera una necesidad que no llegó ocupa una fila del roadmap y hace dudar
de si falta algo. Una casilla que se cumple en otra fase no se cierra sola. El roadmap es el índice de
lo abierto, no un archivo de intenciones.

**Verificado**: 554 documentos en `docs/` (848 KB de ADR y 937 KB de guía); el `watch` de
`settings/sections.tsx` con `live` / `detener`, y la banda del proyecto enseñando la fuente del
snapshot; el test diferencial y las cachés por alcance del ADR 0089. Suite del sitio en verde y
`site:build` con 287 páginas.

**Veredicto**: arreglo. M24 se descarta; M31 y M34 cierran.
