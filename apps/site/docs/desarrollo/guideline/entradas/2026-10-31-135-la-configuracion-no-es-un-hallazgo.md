---
title: "La configuración no es un hallazgo"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: **Reglas** decía «372 como error · 24 como aviso» con el rojo y el ocre de la deuda, y su barra de severidades se leía como un total de hallazgos. **Métricas** decía cero. Las dos cifras venían del mismo artefacto y las dos eran ciertas: una contaba **reglas configuradas**, la otra **mensajes**. Pero compartían color y palabras, así que la app parecía contradecirse, y con el repo limpio la lente del lint no tenía nada que pintar: se leía como que el lint no funcionaba.

**Qué cambia**: la severidad de una regla activa se rotula y se pinta como **configuración** —«Configuración · 372 como error · 24 como aviso», en gris, con un punto neutro en la lista—, sin la tinta de la deuda; esa tinta queda solo para la tabla de reglas con hallazgos. Un sistema lleva su frase de configuración en lugar de la barra roja. Y el cero se acompaña de su cobertura: **«Medido y limpio: 496 ficheros mirados, ninguno con hallazgos»** en Métricas y **«Sin hallazgos en el proyecto: se midieron 496 ficheros»** en Reglas. Las cuentas no cambian: siguen saliendo de los mensajes, en un solo sitio.

**Por qué así**: dos cosas ciertas pueden parecer una mentira si se visten igual. La severidad configurada no es deuda hasta que produce un mensaje, y un cero sin «de cuántos» no se distingue de una medida que no se hizo (ADR 0098). El consumidor no tiene que saber qué campo del artefacto lee cada hoja.

**Verificado**: con un fichero de prueba en este repo, `analyze` mide 3 avisos en 496 ficheros y el artefacto los firma con el árbol; con el repo limpio, las dos hojas dicen la misma cuenta y su cobertura, y la lente pinta el mapa con el verde de limpio. Tests de que la configuración no usa la tinta de la deuda, de que el sistema medido ya no dibuja barra roja y de que el proyecto limpio enseña su cobertura. Typecheck, lint y suites en verde.

**Veredicto**: arreglo.
