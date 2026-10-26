---
title: La ciudad entra en la pantalla
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que la vista 3D abra enseñando **el mapa entero**, centrado y a la distancia justa, en vez
de arrancar cerca de una esquina.

**Por qué**: la cámara abría a una distancia fija (467 unidades) mirando al origen. El mapa mide
1.000 × 700 y empieza en el margen del layout, así que la vista inicial enseñaba poco más de un cuarto
del mapa y el resto quedaba fuera de pantalla. Con el nivel de detalle ya en su sitio, no había razón
para no enseñar la ciudad completa.

**Qué cambió**:

- `boundsOf` (`volumes.ts`) mide lo que ocupa el mapa: centro de la base y radio de la esfera que lo
  envuelve, altura incluida.
- `fitDistance` (`orbit.ts`) calcula a qué distancia cabe ese radio con el campo de visión de la
  cámara, cumpliendo el campo vertical **y** el horizontal (o sea, con cualquier proporción de
  pantalla) y dejando un 8 % de aire.
- La cámara orbita alrededor del **centro del mapa**, no del origen.
- Los límites de zoom van con el mapa: el máximo pasa a ~2,4 veces la distancia de encuadre, el mínimo
  a un 5 %.
- La niebla también se escala con el mapa: antes iba fija (400–1.600) y, con la escena entera
  delante, se habría comido media ciudad; al alejarse, la borraba del todo.

**Verificado**: en Chrome la apertura enseña la ciudad completa y centrada (314 cajas de 263
ficheros), el plano lejano del mapa queda legible al alejarse del todo, y las pruebas cubren que a la
distancia de encuadre se ve el radio entero en vertical y en horizontal, y que una pantalla estrecha
pide más distancia que una ancha.

**Veredicto**: arreglo del plugin (M15), el último punto de su v0.02.
