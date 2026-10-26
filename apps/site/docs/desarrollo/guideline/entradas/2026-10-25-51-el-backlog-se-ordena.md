---
title: El backlog se ordena
date: "2026-10-25"
category: docs
verdict: arreglo
---

**Qué era**: cuarenta casillas abiertas en dieciséis ADR, y varias eran el mismo trabajo apuntado dos veces. Filtrar las reglas por severidad estaba en el ADR 0058 y otra vez en el 0059. «Llevar esto al MCP» aparecía en el 0064, el 0067 y el 0068. Agrupar los símbolos por tipo ya lo había hecho la M43 y seguía pendiente. Y los tres items del plugin 3D vivían también en `plugins/vista-3d/ROADMAP.md`. Un item que está en dos sitios se hace dos veces o no se hace nunca.

**Qué cambió**: la criba. Cada duplicado queda en un solo sitio —el ADR dueño del concepto, o la hoja del plugin— y las tres frases condicionales del MCP se juntan en una: ampliarlo con estructura, código y dependencias cuando un agente lo pida. Tres items se tachan porque ya están hechos o cubiertos: agrupar los símbolos por tipo (M43), los alias de importación (M44) y el pliegue de los símbolos en la vida del símbolo, que era otra vez la fase nueva. De cuarenta casillas quedan treinta y una, y cinco de ellas son una fase.

**La fase**: una, la M49, en el [ADR 0061](../../adr/0061-0070/0061-el-marco-del-proyecto.md#hoja-de-ruta). La tabla de métricas y las secciones plegables llegan a **Cambios**, **Reglas**, el raíl y la vida del símbolo. Eran tres items sueltos —uno en el 0060, otro en el 0061 y otro en el 0062— y son el mismo trabajo.

**Los arreglos**, sin fase ni ADR: buscar una regla por severidad, origen o nombre (0058); recordar la última sección del fichero al cambiar de celda (0059); el filtro de símbolos por nombre (0062); el valor de una variable en la fila (0063); un atajo para plegarlo todo (0061); elegir el editor en los ajustes (0068); la red de seguridad del vigilante cuando Windows pierde avisos (0056); la prueba de la regla de anclaje con subcarpetas, que cierra la M34 (0050); y el smoke de la acción, que vive fuera de este repo (0066).

**Los que esperan** una decisión o una medida: compartir la caché entre el escritorio y `serve`, medir el churn al añadir un fichero, poder pausar la vigilancia del escritorio (0056 y 0050); el catálogo de las reglas que no se violan —el reporte tendría que llevarlo—, las reglas por símbolo y la evolución del fichero en la ficha (0057 y 0058); los espacios de nombres y las claves de objeto (0064); el tipo de arista (0068); el pliegue de imports (0060); el `action.yml` raíz para Marketplace (0066); y el índice SQLite, que sigue esperando volumen (0036). Los cincuenta ADR en inglés no entran: son la M31 y tienen su hoja.

**Veredicto**: arreglo, hecho. El orden del backlog deja de ser la antigüedad de la idea y pasa a decir qué se hace, qué se espera y qué ya no.
