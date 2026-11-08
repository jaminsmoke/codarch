# Atlas

El Atlas es una vista 3D frontal para recorrer la arquitectura en profundidad. Sustituye
el escenario central del mapa, no el marco de la app: la cabecera y las barras
laterales siguen siendo de CodArch.

- **Proyecto**: la raíz es la primera sala. Sus contenedores son las carpetas de primer nivel y sus
  hojas, los ficheros de la raíz.
- **Sala**: cada carpeta abre otra sala con la misma geometría. Los archivadores se ordenan en el
  centro; los ficheros van de pie en dos estanterías laterales, abiertas y ordenadas desde la boca
  de la sala hacia dentro.
- **Luz y etiquetas**: las paredes y estanterías tienen tiras de luz; el presupuesto de etiquetas
  prioriza viga, selección, carpetas y hojas. En salas muy cargadas se retiran primero los detalles
  pequeños de los archivadores.
- **Viga**: el frente queda abierto. Una viga lo cruza arriba con el letrero del nombre de la sala;
  no hay pared frontal completa.
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
el proyecto como primera sala y su viga, en el
[ADR 0118](../../apps/site/docs/desarrollo/adr/0111-0120/0118-el-proyecto-tambien-es-una-sala.md).
