---
title: Lo que ya hay, mejorado
date: "2026-10-21"
category: fix
verdict: arreglo
---

Estas **no** son fases: son arreglos. Van aquí para que no se pierdan.

### La API promete cosas que la app no hace (hecho)

El contrato declaraba los paneles de la barra lateral y los modos de color de plugin, y **la app
no los pintaba**. Eso es una promesa que no se cumple, y lo peor de una promesa que no se cumple es
que alguien la cuente.

**Hecho**: el contrato ahora promete **solo vistas** (una pestaña del mapa central), que es lo único
que la app sabe hacer. Los paneles y los modos de color se añadirán **cuando la app sepa
pintarlos**, no antes. El ADR 0028 lo dice, para que quien escriba un plugin no los busque.

### El diff de símbolos todavía no sabe de renombrados

El diff empareja por nombre; las cadenas sí reconocen renombrados. El comentario del PR podría
decir "has renombrado `parseDiff`", y todavía no lo dice.

**Veredicto**: **arreglo**, sin fase. La maquinaria ya existe (las cadenas): solo hay que
conectarla.

### Una mudanza con cambio a la vez rompe la cadena

Si una función se muda **y** cambia de cuerpo a la vez, la cadena se parte (el renombrado exige
el mismo hash). Es el límite honesto que decidimos, pero es un caso real.

**Veredicto**: **no arreglar todavía**. Aflojar la regla crearía cadenas falsas, que es peor
que una cadena partida. Se puede añadir una señal de "probablemente es la misma" más adelante
—y se haría en el diff, no en la cadena.

### La web no compara dos momentos

La CLI sí (`codarch history --from --to`); la web tiene la línea del tiempo pero no la
comparación.

**Veredicto**: **arreglo** o nada. No es urgente: la línea del tiempo ya da el contexto.

### El layout: el mapa crecía la página (hecho)

El `.map-frame` no tenía altura acotada → el SVG crecía con su propia relación de aspecto →
la página entera scrollea y el raíl, que tenía `overflow: auto`, nunca scrolleaba.

**Hecho**: en la anchura ancha la app ocupa la pantalla (`100dvh`), el raíl y el inspector
scrollean solos y el mapa se ajusta a lo que queda. En la anchura estrecha (donde el inspector
se apila) el mapa ocupa la pantalla y la página scrollea solo para el inspector.

Y con eso, el **zoom**: botones `+`, `−` y `Ajustar`, más la rueda (que acerca
centrado en el puntero). La distribución del mapa **no** cambia: lo que cambia es el rectángulo
visible, así que acercar es gratis.

### El mapa: los nombres no se veían (hecho)

Dos fallos que llevaban desde siempre y que solo se veían al mirar la pantalla:

1. **El texto estaba dentro del `<rect>`**. En SVG un `<rect>` no admite hijos → el texto se
 dibujaba siempre con **tamaño cero** → los nombres de los ficheros y de las carpetas **nunca** se
 han visto. Ahora el texto es hermano del rect.
2. **El marco no se medía**: el `ResizeObserver` no llegaba a disparar → el mapa se dibujaba
 siempre para 1400×900 y se escalaba a la mitad → un texto de 10,5 px quedaba en 5.
 Ahora se mide al montar, se observa el marco y se mide al redimensionar.

**Hecho**: los nombres se leen ("App.tsx", "PrPanel.tsx", "APPS").

### El nombre de los bloques (hecho)

Empezó mal: el nombre se pintaba como un texto aparte y se calculaba a mano cuánto cabía.
Salía recortado ("analy…"), se desbordaba y los bloques pequeños se quedaban sin nombre.

**El enfoque definitivo**: el nombre **es del bloque**. Cada bloque lleva un `foreignObject` con
texto HTML dentro y es el **navegador** el que lo envuelve y lo recorta. Así **no puede
salirse del bloque**, por diseño, diga lo que diga el nombre.

Lo único que se decide en código es lo que el navegador no puede adivinar:

- **El tamaño de la fuente**, del lado corto del bloque (de 4 a 11 px).
- **Si va en vertical** (`writing-mode: vertical-rl`) cuando el bloque es alto y estrecho.
- **Si el bloque da para algo**: por debajo de dos píxeles no hay nada que enseñar.

Medido en el mapa de este repo: **215 labels**, **ninguno desbordado** y **85 en vertical**.
Los que se quedan sin nombre son bloques de un píxel, donde no cabe ni una letra.

### El 3D: las cajas no tienen etiqueta

Con 200 cajas no se sabe cuál es cuál.

**Veredicto**: en la guía del plugin.

### Las reglas del addon llegan al MCP

Un addon puede aportar reglas (declarativas) y la app las ve, pero el MCP no las veía
porque lee el snapshot y las reglas viven en la configuración.

**Veredicto**: **arreglado**. El MCP lee la configuración como hace el CLI:
`get_project_config` devuelve el perfil, las capas, las reglas con su origen (`config`, `profile`
o `addon:<nombre>`) y los addons declarados con sus vistas guardadas.
