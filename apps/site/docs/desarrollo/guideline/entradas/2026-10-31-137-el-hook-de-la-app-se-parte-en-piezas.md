---
title: "El hook de la app se parte en piezas"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `useCodarchApp` era la única función del repo por encima de las 400 líneas de cuerpo
—**770**, medida por el parser— y la tercera del mapa por longitud. Dentro convivían cosas con reglas
propias: qué opciones ofrecen los tres selectores, qué de un enlace compartido se puede aplicar, qué
selecciona cada gesto, qué lección quiere pintar un plugin y qué se recupera al volver al mapa del
código. Todo eso se leía dentro de un hook y no se podía probar sin montar la app.

**Qué cambia**: once piezas en `packages/ui/src/app/`, cada una con su regla y sin React de por medio
donde se puede. `selectors.ts` decide las opciones de métrica, área y color; `applyView.ts` convierte
un estado de vista en un plan que se puede aplicar; `selection.ts` fija qué deja elegir un fichero y
qué selección toca cuando el modelo cambia; `pluginViews.ts` arma las vistas y el contexto de un
plugin; `bridges.ts` apaga las puertas que la plataforma no tiene; `detailFor` dice qué subárbol se
poda; `planMapSwitch` decide el área y el color al cambiar de mapa. Los hooks que los usan
—`derived`, `useSelection`, `viewOptions`, `pluginBindings`, `restore`— son el pegamento. El hook baja
a **501 líneas** y su función a **451**; el cuerpo que queda es estado, encadenado y el objeto que
devuelve la app.

**Por qué así**: un hook de 770 líneas no se puede probar sin un renderizador, y la app no tiene uno
en las pruebas. Sacando las reglas a funciones puras, cada una se prueba sola —46 casos nuevos, seis
ficheros de prueba nuevos y dos que ya estaban— y el hook se queda con lo que de verdad no se puede
sacar: el estado de React. No se partió por tamaño sino por responsabilidad: lo que cambia por el
mismo motivo quedó junto.

**Verificado**: `useCodarchApp` pasa de **770 a 451** líneas de función en la medida del parser, y el
repo sigue con **0 ficheros con hallazgos de 511 medidos** y **0 ciclos** en 520 ficheros. Una prueba
de humo monta el hook con una plataforma vacía y comprueba lo que devuelve sin snapshot. Typecheck,
lint y suite completa en verde: **160 ficheros, 1371 tests**.

**Veredicto**: arreglo.
