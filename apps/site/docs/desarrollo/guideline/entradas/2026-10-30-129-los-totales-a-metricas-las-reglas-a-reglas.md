---
title: "Los totales a Métricas, las reglas a Reglas"
date: "2026-10-30"
category: "fix"
verdict: "arreglo"
---

**Qué era**: la misma hoja decía dos cosas con las mismas palabras. En **Métricas** el lint era «0 errores · 0 avisos» —los hallazgos del artefacto— y en **Reglas**, al lado, «22 errores · 2 avisos» —las reglas que la config de ESLint activa como error o aviso—. Ninguna cifra estaba mal; el lector no tenía cómo saber que medían cosas distintas. Además el reparto duplicaba números en las dos secciones, y Métricas se dejaba fuera los `info`: un proyecto con solo sugerencias decía «0 errores · 0 avisos» mientras Reglas contaba hallazgos.

**Qué cambia**: el reparto es uno. **Métricas** lleva los totales —errores, avisos e info, ficheros con hallazgos y score—, con cada cuenta en su tinta, y su tabla por carpeta cambia el recuento de ficheros por la columna **Info**, que es lo que faltaba. **Reglas** habla solo de reglas: los sistemas dicen cuántas reglas activas tienen y cómo las activa su config —«22 como error · 2 como aviso», con el «como» que separa la config del hallazgo—, la cabecera cuenta reglas y no repite totales, y la tabla de hallazgos da la cuenta de cada regla. La ficha del fichero dice las tres severidades, así que un fichero con solo `info` ya no dice «0 errores · 0 avisos». El CLI añade `· N info` a la línea del artefacto cuando los hay: un lint con solo sugerencias tampoco dice cero en la terminal.

**Por qué así**: dos secciones que enseñan lo mismo acaban discrepando; el número va donde se decide —la deuda, en Métricas— y la regla donde se explica —Reglas—. El contador compartido pasa a sumar desde los **mensajes** y no desde las cuentas que declara cada fichero: un artefacto de fuera con `errors` y `messages` que no cuadren ya no puede hacer que las dos hojas lean cifras distintas, porque solo hay una fuente.

**Verificado**: test del contador con un artefacto que declara 9 errores y trae un aviso —manda el mensaje—, totales con `info` en la UI, y tests de que Reglas no repite «errores» ni «avisos» en el bloque de sistemas y de que Métricas enseña las tres cuentas. Suite, typecheck y build del sitio en verde.

**Veredicto**: arreglo.
