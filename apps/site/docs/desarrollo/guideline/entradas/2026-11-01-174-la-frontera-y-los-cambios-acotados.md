---
title: "La frontera y los cambios acotados"
date: "2026-11-01"
category: "feature"
verdict: "fase"
---

**Qué era**: M63 tenía abiertos la frontera y los ciclos de la carpeta y el enlace
que acota Cambios. La hoja de carpeta ya contaba sus métricas, su duplicación y
su lint, pero no decía si la carpeta es un módulo o un lío: sus aristas no se
partían por dentro y fuera, y los ciclos no se separaban entre los que caen
dentro y los que la cruzan.

**Qué cambia**: `boundary.ts` lee el grafo del mapa y devuelve la frontera
—internas, entrantes desde fuera y salientes hacia fuera, con los ficheros
externos y sus aristas— y los ciclos —de cierre dentro y que cruzan—. Dos
secciones nuevas en la hoja, **Frontera** y **Ciclos**, con sus cuentas y una
fila por fichero de fuera que abre su ficha. `scopeChangeFiles` filtra el
reporte por carpeta, y la ficha gana una línea con los ficheros tocados que abre
**Cambios** acotado, con «Ver todo» para quitarlo. M63 cierra.

**Por qué así**: los ciclos se cuentan por **arista de cierre**, que es lo único
que el snapshot guarda; el tamaño del ciclo entero solo lo conoce el diff, y
decirlo aquí sería inventarlo, así que la sección lo escribe. El filtro de
cambios no duplica la lista ni toca el reporte: es la misma sección con otra
selección, y la pestaña dice a qué está acotada.

**Verificado**: tests de `folderBoundary`, `folderCycles`, sus sumas y del filtro
de cambios; typecheck, lint y vitest de `packages/ui`.

**Veredicto**: hecho. M63 cierra. Queda abierta M64 (el resto).
