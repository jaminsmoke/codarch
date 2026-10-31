---
title: "Un solo contador para el lint"
date: "2026-10-30"
category: "fix"
verdict: "arreglo"
---

**Qué era**: el mismo artefacto daba números distintos según dónde se mirase. La UI contaba reglas con hallazgos ignorando los `info`; el MCP los contaba; el CLI sumaba mensajes por su cuenta. En un repo medido y limpio con 24 reglas activas, la cabecera de **Reglas** decía `0`, que se lee como «no hay reglas». Y la salida del CLI decía `oxlint sin config · sin config: corre sus correcciones…` y `0 ficheros`, que suena a que no se analizó nada.

**Qué cambia**: el recuento vive en **un solo sitio**, `packages/lint/src/rollup.ts`: `lintTotals` (errores, avisos, hallazgos y ficheros con algún mensaje) y `lintRules` / `lintRuleCounts` (cada regla con sus tres cuentas). La app le añade el `score` que ya pesaba en el riesgo; el MCP y el CLI leen lo mismo. Un `info` es un hallazgo en los tres, aunque no sume a errores ni a avisos. En el proyecto, el número de **Reglas** cuenta reglas activas —0 solo si no hay ninguna— y, en carpeta y fichero, reglas con hallazgos; la fila del fichero dice «sin hallazgos de lint» en vez de «sin violaciones». El CLI ya no repite «sin config» en la nota de oxlint y dice «ficheros con hallazgos», con singular y plural.

**Por qué así**: la cifra que se enseña no puede depender del consumidor. Tenerla junto al formato del artefacto evita que el siguiente lector de lint invente la suya, y deja una regla clara para `info`: cuenta como hallazgo, no como deuda.

**Verificado**: tests nuevos del contador compartido —totales con `info`, barra de carpeta, sin artefacto, orden determinista— y actualizados los de la UI y el MCP; test de la cabecera con reglas activas y de la nota de oxlint sin duplicar; test de la salida del CLI con «1 fichero con hallazgos · 1 error · 1 aviso». Pasada real en este repo: 24 reglas activas de ESLint, oxlint medido y sin enumerar, 0 ficheros con hallazgos y la nota una sola vez. Typecheck, lint y suite en verde.

**Veredicto**: arreglo.
