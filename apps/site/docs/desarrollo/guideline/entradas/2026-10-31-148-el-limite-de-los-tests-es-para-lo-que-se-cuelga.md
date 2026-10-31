---
title: "El límite de los tests es para lo que se cuelga"
date: "2026-10-31"
category: "chore"
verdict: "arreglo"
---

**Qué era**: la suite fallaba a ratos, y siempre en los mismos dos: `diff.test.ts` («accepts equivalent
option forms…») y `head-report-parity.test.ts` («tras un cambio nuevo, los dos se renuevan igual»). Los dos
abren un repo de verdad, escriben un commit, lanzan el CLI con `tsx` y comparan el reporte HEAD del servidor
con el del escritorio. En una máquina cargada pasan de los cinco segundos y Vitest los da por colgados, con
la suite en rojo por tiempo y no por lo que prueban.

**Qué cambia**: `vitest.config.ts` sube el límite a treinta segundos. Nada más: ni se saltan casos, ni se
tocan las aserciones, ni se marca ningún test como lento.

**Por qué así**: cinco segundos es un buen límite para una función pura y un mal límite para dos procesos.
Subirlo en el sitio donde se configura —y no caso por caso— deja el listón donde importa: un test que de
verdad se cuelga sigue fallando, solo que treinta segundos después en vez de cinco. La alternativa
—`it(..., 30_000)` en los dos que se quejan— esconde el problema en los que aún no se han quejado.

**Verificado**: la suite entera con el límite nuevo, **171 ficheros y 1469 tests** en verde, y los dos
casos que fallaban corren en segundos. Con `--testTimeout=60000` ya pasaban antes, que es lo que decía que
el problema era el reloj y no el código.

**Veredicto**: arreglo.
