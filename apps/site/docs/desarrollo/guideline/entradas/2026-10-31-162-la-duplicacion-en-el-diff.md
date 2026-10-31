---
title: "La duplicación llega al diff"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: la duplicación ya se medía (M68), se pintaba en el mapa y tenía lista de pares (M69 y
M70), pero el diff no la miraba. Un PR podía meter una copia nueva o dejar que dos copias se
separaran sin que el reporte, el comentario del PR ni el MCP lo dijeran: el cambio pasaba con la
arquitectura intacta en el papel.

**Qué cambia**: el reporte sube a `1.5` y gana la sección `duplication`: las líneas duplicadas y
repetidas de cada lado con su delta, los pares que aparecen, los que desaparecen y los que se separan
—con la similitud de antes y la de ahora— y las cuentas antes de recortar. El CLI añade su línea al
resumen y una sección con los pares; la pestaña **Cambios** gana **Duplicación** con las líneas
ganadas o perdidas y los dos extremos de cada par, cada uno abre su ficha; el comentario del PR lleva
su fila y su bloque; y el MCP estrena `get_duplication_report`, con ámbito por carpeta o fichero.

**Por qué así**: dos fotos no comparten ids necesariamente, así que los pares se cruzan por sus **dos
rutas**, que es lo que la lente mide. Con la lente en un solo lado no hay comparación posible: el
reporte se para, dice qué lado está sin medir y deja `delta` en `null`, porque un cero inventado
convertiría «no se miró» en «está limpio». El corte es el mismo en la app, el CLI y el comentario —y
las cuentas viajan antes del recorte, para que el `+N` sea verdad—. La regla `duplication-max` no
entra: el ADR la condiciona a que el uso la pida, y hoy no la ha pedido nadie.

**Verificado**: la suite completa queda en **179 ficheros y 1554 tests**. Tests nuevos del diff (par
que cambia de id, par nuevo, par que se separa, par que se acerca, par que desaparece, lente en un
solo lado y sin lente), del informe del CLI, de la sección de Cambios, de la consulta del MCP y del
comentario del PR. Typecheck, lint, `lint:types`, `check:action` y el sitio construidos.

**Veredicto**: hecho. M71 cierra la cadena de la duplicación.
