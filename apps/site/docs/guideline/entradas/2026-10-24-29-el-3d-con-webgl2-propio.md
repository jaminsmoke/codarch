---
title: El 3D se dibuja con WebGL2 propio
date: "2026-10-24"
category: optimized
verdict: adr
---

**Qué es**: que la vista 3D deje de usar `three/webgpu` y dibuje con un renderizador propio de
WebGL2: un cubo instanciado, dos shaders y una cámara con matemática pura. Decisión en el
[ADR 0055](/docs/adr/0055-el-3d-se-dibuja-con-webgl2/).

**Por qué**: el 3D iba mal en la app de escritorio y la GPU no llegaba al 10 %. La parte nuestra era
ridícula (1,1 ms montar los volúmenes, 0,015 ms el nivel de detalle), así que el coste estaba en el
runtime: preparar escena, nodos y materiales en cada fotograma, y arrastrar 2,2 MB de three para
dibujar una sola malla.

**Qué cambió**: la escena son dos shaders y una llamada instanciada. La cámara, las matrices y el
picking viven en módulos puros con pruebas. Solo se dibuja cuando algo cambia, con la resolución
limitada a 2× y ocho megapíxeles. Medido en la RTX del equipo: 4.000 cajas a 1280×800 → 3,1 ms por
fotograma; a 2560×1600 → 8,5 ms. El chunk del plugin pasa de 2.173 kB a 15 kB.

**Qué se aprende**: elegir una librería no es gratis. Three resolvía el dibujo, pero su capa de
escena costaba más que el problema que resolvíamos. Para una vista con una sola forma instanciada,
el camino corto era escribir el camino corto.

**Veredicto**: ADR 0055; el plugin sigue sin tocar el snapshot.
