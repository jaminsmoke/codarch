---
title: El live conserva la vista
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que guardar un fichero con la app abierta actualice el mapa **sin** devolver la vista al
principio. Antes el mapa se ponía al día, pero se perdían el área, el color, el foco, la búsqueda y la
selección; y de paso se vaciaban los addons y se cerraba el reporte del PR.

**Por qué**: la web ya lo hacía bien —su refresco llama a `loadSnapshot(snapshot, "servidor local",
true)`—, pero el escritorio no distinguía **abrir** de **refrescar**. El proceso principal manda el
mismo mensaje (`{ kind: "snapshot" }`) al abrir un repo por «abrir con» y al reanalizar por el
vigilante, y el renderer lo trataba igual: `loadSnapshot` sin `preserveView`, más `setAddons([])`,
`resetReport()` y una escritura del proyecto. Resultado: cada guardado parecía una apertura nueva.

**Qué cambió**:

- `DesktopTarget` lleva `refresh?: boolean`. `refreshFromDisk` lo pone al mandar el snapshot del
  vigilante; `openTarget` y la restauración no.
- `renderer/App.tsx`: si el mensaje es un refresco, `loadSnapshot(snapshot, label, true)` y nada más.
  `preserveView` conserva área, color, búsqueda, selección y foco, y deja en paz los addons y el
  reporte. Abrir un repo distinto sigue reseteando la vista, que es lo que toca.
- De paso, el refresco de arranque (el de los 400 ms) también conserva: ya no deshace la vista que
  acaba de restaurar.

**Medido en la app real** (este repositorio, ventana al frente, clic en la carpeta `packages` y
guardado de un fichero):

| | Antes del guardado | Después |
|---|---|---|
| Área | `loc` | `loc` |
| Color | `structure` | `structure` |
| Búsqueda | `packages` | `packages` |
| Foco | `Todo / packages` | `Todo / packages` |
| Checksum | `ce4d0b84` | `f2deb670` |

El checksum cambia y el mapa se repinta con los datos nuevos; la vista se queda donde estaba.

**Queda abierto**: el refresco sigue reanalizando el repo entero (2,7 s en este repositorio) y el
principio sigue siendo el mismo en las dos apps. Lo que faltaba era no tirar la vista al aplicarlo.

**Veredicto**: arreglo; no necesita ADR. Cierra lo que quedó abierto en «El escritorio abre en vivo».
