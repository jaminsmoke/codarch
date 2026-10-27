---
title: Las proyecciones se comparten
date: "2026-10-27"
category: refactor
verdict: arreglo
---

**Qué era**: los dos adaptadores `Plataforma` repetían las mismas dos proyecciones: sacar `entries` del historial y `heat` del payload de cadenas. Cuatro guardias escritos dos veces, y con diferencias: la web comprobaba que el payload fuera un objeto, el escritorio se fiaba del puente; el escritorio devolvía lo que viniera si no era un objeto, que en el tipo se colaba como si fuera una lista.

**Qué es**: `historyEntries(payload)` y `symbolHeat(payload)` viven en `@codarch/ui`, junto al contrato `Plataforma` que ya importaba esos tipos, y cada adaptador se queda con su transporte: `historial: async () => historyEntries(await fetchJson("data/history.json"))` en la web, `historyEntries(await desktop().history())` en el escritorio. Un payload que llegue raro es `null`.

**Por qué así**: el transporte sí es de cada plataforma —HTTP con `data/*.json` en la web, IPC en el escritorio— y la forma de lo que se sirve es del contrato, que ya estaba escrito una sola vez. No hay ADR nuevo: es la deuda de la misma costura del [ADR 0073](../adr/0071-0080/0073-una-sola-interfaz.md) y el [ADR 0074](../adr/0071-0080/0074-una-sola-sesion.md). Se descartó dejarlas en cada adaptador «porque son cuatro líneas»: eran cuatro líneas con dos comportamientos distintos ante lo inesperado, que es exactamente cómo divergen las copias.

**Cómo se comprueba**: `packages/ui/test/platform.test.ts` cubre las dos proyecciones: la lista que sí está, la lista vacía (que es válida), la clave que falta y el payload que no se entiende —número, cadena, array— que sale `null`. Los tests de las dos apps siguen verdes sin tocarlos.

**Veredicto**: arreglo dentro del ADR 0073 y el ADR 0074. Con el almacén local de la entrada anterior, esta era la última duplicación de la lista que quedaba entre la web y el escritorio; lo que se queda en cada app —quién analiza, elegir carpeta, IPC o HTTP— es el puerto, no una copia.
