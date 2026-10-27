---
title: El padre lista sus alcances
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: analizar la raíz volvía a parsear todo lo que un `.codarch/` de una subcarpeta ya había parseado, y nada decía qué alcances había por debajo ni si estaban al día ([ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md)).

**Qué es**: `codarch analyze` apunta en `.codarch/scopes.json` qué `.codarch/` ha visto por debajo —checksum, commit, ficheros y fecha de su última foto— y la línea `alcances` dice cuántos son. Un comando nuevo, `codarch scopes [ruta] [--json]`, los lista con su estado: **al día**, **se analizó otra vez** (su checksum cambió desde que el padre lo vio), **nuevo**, **ya no está**, y el aviso **ficheros más nuevos** cuando el snapshot del hijo es anterior a algún fichero de su carpeta.

**Por qué así**: el padre **lee hacia abajo y no escribe** en el `.codarch/` del hijo: cada alcance lo escribe quien lo analiza, y un padre que reescribiera a sus hijos les impondría su `.codarch.yml`. El registro es un índice derivado, no una prueba: se puede borrar y se poda solo al reanalizar. La búsqueda usa el mismo recorrido que el análisis —`.gitignore` y el alcance de `.codarch.yml`—, así que `samples/`, que está ignorado y tiene su propio `.codarch/`, no cuenta como alcance del padre. Un snapshot ilegible se salta: el estado del padre no se cae por un hijo roto.

**Cómo se comprueba**: `apps/cli/test/scopes.test.ts` analiza un padre con un hijo real y cubre el registro, el alcance ignorado, el snapshot roto, `node_modules`, el aviso de ficheros más nuevos, el cambio de checksum y el estado «nuevo». En este repo, analizar `packages/ui` como alcance hace que la raíz diga `1 anidados`, `codarch scopes` lo enseña «al día» y, al borrar su `.codarch/`, pasa a «ya no está» hasta que el siguiente análisis poda el registro.

**Veredicto**: ADR 0089, dentro de M34. Queda abierto reutilizar el parseo del hijo, con la puerta de medirlo antes.
