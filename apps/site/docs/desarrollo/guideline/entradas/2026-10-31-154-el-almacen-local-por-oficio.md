---
title: "El almacén local, por oficio"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `packages/ui/src/storage.ts` tenía 197 líneas y **cuatro oficios** metidos en un solo módulo: las claves
del almacén, su apertura y el olvido de una clave; las preferencias de vista con su tipo, su validador y su
lectura y escritura; los plugins activados; y la forma de un proyecto guardado, con su validador y su lector.
Diez funciones que las dos apps y el índice de la UI importaban del mismo sitio —**fanIn 20**, el más alto del
repo—. Era el **primero por deuda**: 315. La deuda no venía de la complejidad (14) sino de que todo el mundo
dependía del módulo entero para usar una pieza.

**Qué cambia**: `storage.ts` se queda en **18 líneas** y solo reúne; cada oficio vive en su módulo hermano:

| Módulo | Qué es |
|---|---|
| `storage-local.ts` | las tres claves, abrir `localStorage` y olvidar una clave |
| `storage-preferences.ts` | `ViewPreferences`, su validador y su lectura y escritura |
| `storage-plugins.ts` | los plugins activados en la máquina |
| `storage-project.ts` | `SavedProject`, su validador y el lector por clave |

La dependencia va en un sentido: preferencias, plugins y proyecto leen `storage-local`; `storage.ts` los
reúne porque es la puerta que ya usan `@codarch/ui/storage`, `apps/web`, `apps/desktop` y el índice de la UI.
Y lo que dentro de la UI solo necesitaba abrir el almacén —`theme`, `CollapsibleSection`, `ToolDock`,
`InspectorDock` y `pluginBindings`— ahora importa `storage-local`, no el vocabulario entero.

**Por qué así**: el almacén local es una pieza de plataforma, no de presentación, y tenía el reparto al revés:
quien quería `localStore()` se llevaba también el formato del proyecto guardado y las claves de todo. Separar
no cambia una línea de la lógica —los comentarios que explican cada regla viajan con su función, del guardia de
forma del proyecto a la lista de plugins— y deja la puerta pública intacta, así que las dos apps no cambian una
sola importación.

**Verificado**: la suite entera en verde —**173 ficheros y 1497 tests**—, con las 66 pruebas de UI, web y
escritorio entre ellas, y `storage.test.ts` fijando lo mismo: preferencias y plugins de ida y vuelta, el
proyecto normalizado con sus addons, el descarte de lo que no se entiende y el silencio cuando no hay almacén.
Typecheck y lint limpios, y el sitio se escribe. La deuda del fichero baja de **315 a 16** y deja de estar el
primero del repo; el peor de las piezas nuevas es **40** (`storage-local`). Sin pruebas nuevas: no hay
comportamiento nuevo, solo piezas.

**Veredicto**: arreglo.
