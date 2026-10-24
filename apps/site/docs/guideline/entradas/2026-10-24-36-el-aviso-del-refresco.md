---
title: El aviso del refresco
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que un refresco en vivo lo diga. Al guardar un fichero, el mapa se pone al día sin mover la
vista (entrada anterior), pero lo hacía en silencio: no había forma de saber si lo que se ve era de
ahora o de hace un rato. Ahora la cabecera escribe **actualizado** un momento, junto a `live`, y se
apaga solo.

**Por qué**: la alternativa era un diálogo o un aviso que hay que cerrar, y eso estorba más que ayuda
cuando guardas cada pocos segundos. El aviso no debe mover nada ni costar un repintado: va en la
cabecera, se monta con el mismo render que trae el snapshot nuevo y se apaga con una animación de CSS,
sin temporizadores.

**Qué cambió**:

- `useCodarchApp`: el estado lleva `refreshedAt`, que se pone cuando llega un snapshot **con otro
  checksum** y con `preserveView`. Así no hay aviso al arrancar ni cuando el vigilante avisa de algo
  que no cambia el mapa.
- `AppShell`: `RefreshNotice` en la cabecera, con `key` por refresco (la animación empieza de nuevo) y
  `aria-live="polite"`. Con `prefers-reduced-motion` no hay animación: el aviso se queda visible.
- Las **preferencias** se escriben solo si cambian (`JSON.stringify` como clave). Antes cada `cc` nuevo
  —y cada refresco trae uno— disparaba una escritura en `localStorage` y, en el escritorio, un viaje
  al proceso principal y al disco.

**Medido en la app real** (este repositorio, 274 ficheros, depurador de Chromium):

| | |
|---|---|
| El aviso | aparece al cambiar el checksum y se apaga a los ~3 s |
| Refresco completo | 2 layouts · 13 ms de layout · 8 ms de estilo · 30 ms de script · 0 tareas largas |
| Preferencias | `preferences.json` no se reescribió (misma fecha) |
| Vista | área, color y foco, intactos |

**Queda abierto**: el refresco sigue reanalizando el repositorio entero (unos 2,6 s en este repo); lo
que ya no hace es tirar la vista ni reescribir lo que no cambió.

**Veredicto**: arreglo; no necesita ADR.
