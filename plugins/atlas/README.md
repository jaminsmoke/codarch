# Atlas

El Atlas es una vista 3D para recorrer la arquitectura en profundidad. Sustituye
el escenario central del mapa, no el marco de la app: la cabecera y las barras
laterales siguen siendo de CodArch.

- **Carpetas**: contenedores. De lejos son un volumen; al acercarte se abren en
  una losa y enseñan a sus hijos.
- **Ficheros**: cubos dentro de su carpeta, con el color del mapa.
- **Cámara**: órbita con el ratón; rueda para acercar; clic para entrar en una
  carpeta o seleccionar un fichero.
- **Mapas**: funciona con el mapa de código y con el de documentos/configuración
  porque recibe el `RenderModel` que esté abierto.

## Activación

El plugin se compila si el repo lo declara en `.codarch.yml` y se activa desde
los ajustes de la app. Si está apagado, o la máquina no tiene WebGL2, se sigue
viendo el mapa clásico.

## Límites de esta primera versión

Es el corte vertical de M77: la vista aérea 3D, la selección y el foco ya
funcionan. Los corredores, las estanterías, las etiquetas y el vuelo llegan
después; no se prometen aquí.

La decisión está en el [ADR 0113](../../apps/site/docs/desarrollo/adr/0111-0120/0113-el-atlas-es-un-plugin.md).
