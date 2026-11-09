# Atlas

El Atlas es una vista 3D frontal para recorrer la arquitectura en profundidad. Sustituye
el escenario central del mapa, no el marco de la app: la cabecera y las barras
laterales siguen siendo de CodArch.

- **Proyecto**: la raíz es la primera sala y lleva el nombre del proyecto analizado. Sus contenedores
  son las carpetas de primer nivel y sus hojas, los ficheros de la raíz.
- **Sala**: cada carpeta abre otra sala con la misma geometría. Son salas profundas y sin techo; los
  archivadores se pegan a la pared de fondo y los ficheros van de pie en dos estanterías laterales,
  abiertas, con tablas finas y llenadas desde el fondo hacia el frente.
- **Luz y etiquetas**: las paredes y estanterías tienen tiras de luz; el presupuesto de etiquetas
  prioriza cartel, selección, carpetas y hojas. Los detalles de los archivadores se retiran por carga,
  distancia o ángulo de cámara. El pasillo central lleva dos guías de suelo.
- **Cartel**: el frente queda abierto. El nombre de la sala vive en un cartel centrado en la pared de
  fondo; la raíz usa el nombre del proyecto analizado.
- **Cámara**: frontal, a la altura de la sala; no es un plano cenital. Se orbita con el ratón, la
  rueda acerca y hay botones **−**, **Centrar** y **+**, con los atajos `+`, `-` y `0`/`R`.
- **Fichero**: al pulsar una hoja se abre un panel de solo lectura con su código.
- **Mapas**: funciona con el mapa de código y con el de documentos/configuración porque recibe el
  `RenderModel` que esté abierto.

## Activación

El plugin se compila si el repo lo declara en `.codarch.yml` y se activa desde
los ajustes de la app. Si está apagado, o la máquina no tiene WebGL2, se sigue
viendo el mapa clásico.

## Límites de esta primera versión

Es el corte vertical de M77: las salas recursivas, la selección, el foco y el
visor ya funcionan. Quedan el pulido de distribución, luces y LOD, y la puerta
animada de entrada, que no se promete aquí.

La decisión está en el [ADR 0113](../../apps/site/docs/desarrollo/adr/0111-0120/0113-el-atlas-es-un-plugin.md);
el proyecto como primera sala y su cartel de fondo, en el
[ADR 0124](../../apps/site/docs/desarrollo/adr/0121-0130/0124-cartel-de-fondo-y-nombre-del-proyecto.md).
