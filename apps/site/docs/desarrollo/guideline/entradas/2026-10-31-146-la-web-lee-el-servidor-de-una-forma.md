---
title: "La web lee el servidor de una sola forma"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `apps/web/src/App.tsx` es el fichero que más se toca del repositorio —683 líneas y 52 commits—
y la lectura de lo que sirve el servidor local estaba escrita dos veces: una en `session.ts`
(`bootFromServer`) y otra dentro del componente (`refreshFromServer`), que es la que corre al cambiar de
carpeta. Habían empezado igual y ya no lo eran: el arranque pedía el reporte HEAD y la versión servida, el
refresco pedía `data/report.json` —el de un PR, no el del repo— y no actualizaba la versión. Además había
dos `fetch` a pelo con su JSON y su error repetidos (`POST /api/root` y `POST /api/watch`), y una segunda
copia de «abrir un enlace»: `loadFromUrl` al lado de `bootFromUrl`.

**Qué cambia**: una sola forma de cada cosa.

| Pieza | Qué hace ahora |
|---|---|
| `session.loadServedProject` | lee snapshot, resto, lint, reporte HEAD y addons; lo usan el arranque y el refresco |
| `server-control.selectRoot` / `setWatch` | los dos mandos del servidor, con el motivo de fallo que dé el servidor |
| `App.loadFromUrl` | delega en `runBoot`: el enlace se abre igual al arrancar que a mano |
| `sessionHandlers` | el contrato de la sesión se define una vez y lo usan arranque, refresco y live |

`loadServedProject` acepta lo ya leído (`meta`, `served`) para que el arranque no pida dos veces lo mismo,
y `preserveView` para que encender el live ponga el mapa al día sin cerrar la ficha que se está mirando.

**Por qué así**: dos copias de una lectura no se rompen a la vez, divergen. Ahora cambiar de carpeta enseña
el mismo reporte que el arranque y el live (ADR 0075) y la versión que sirve el CLI aparece también después
de cambiar de raíz. El fichero apenas adelgaza —683 a 667 líneas— porque el contrato de la sesión pasó a
estar explícito, pero cada trabajo vive en un solo sitio.

**Un fallo que sale al unificar**: `bootFromUrl` ponía el modo en «local» también cuando la carga fallaba.
Con el enlace cargado desde el menú, eso encendía el botón de live sin servidor detrás. Ahora, si no se
cargó nada, el modo se queda como estaba, y la prueba lo fija.

**Verificado**: 171 ficheros y **1469 tests** en verde (eran 1456), lint sin mensajes y typecheck limpio.
Los seis casos de los mandos del servidor cubren qué se manda, qué se devuelve y los tres fallos —motivo del
servidor, sin cuerpo de error, y sin respuesta—; los siete del refresco, qué artefacto se lee, cuál es el
reporte con servidor y sin él, el caso sin snapshot y los dos modos de `preserveView`/precargado.

**Veredicto**: arreglo.
