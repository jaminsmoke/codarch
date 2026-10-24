---
title: El armazón también se comparte
date: "2026-10-24"
category: refactor
verdict: fase
---

**Qué es**: sacar de los dos `App.tsx` lo que era idéntico —cabecera, barra lateral, escenario,
inspector y ajustes— a un `AppShell` de `@codarch/ui`, y llevar al hook el estado que las dos apps
calculaban por su cuenta.

**Por qué**: después de M33 el estado ya era compartido, pero el marcado seguía duplicado: cada
cambio de la barra lateral o del pie del mapa había que hacerlo dos veces. Además, cosas como el
fichero elegido, los símbolos, las vistas de los plugins, la búsqueda o el atajo `/` se repetían
palabra por palabra.

**Qué cambió**: `useCodarchApp` calcula ahora el fichero y su migración, los símbolos, las métricas,
las vistas de los plugins con su contexto, la búsqueda, `selectPath` y el estado de vista que
comparten la URL y las vistas guardadas (`applyView`). `AppShell` pinta el armazón completo y cada
app le pasa lo suyo por huecos: los botones de la cabecera, el aviso de la demo, la pista de
arrastrar, el botón de cancelar y los ajustes ya montados. La web conserva su arranque (servidor,
URL, demo) y el escritorio el suyo (`.codarch/`, menú nativo).

Los `App.tsx` quedan en 922 líneas (web) y 172 (escritorio), y `AppShell` ocupa 504; antes eran
1565 y 762 con el marcado repetido.

**Veredicto**: **fase M33**, en la hoja de ruta de
[ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md).
