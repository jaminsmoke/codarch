# Atlas

El Atlas es una vista 3D frontal para recorrer la arquitectura en profundidad. Sustituye
el escenario central del mapa, no el marco de la app: la cabecera y las barras
laterales siguen siendo de CodArch.

- **Vista general**: el mapa plano 3D del primer nivel: contenedores de carpeta y las hojas de la raíz.
- **Sala**: cada carpeta abre una sala. Las subcarpetas son archivadores que abren otra sala; los
  ficheros, hojas frontales en estanterías de fondo.
- **Cámara**: frontal, a la altura de la sala; no es un plano cenital. Se orbita con el ratón y la
  rueda acerca.
- **Fichero**: al pulsar una hoja se abre un panel de solo lectura con su código.
- **Mapas**: funciona con el mapa de código y con el de documentos/configuración porque recibe el
  `RenderModel` que esté abierto.

## Activación

El plugin se compila si el repo lo declara en `.codarch.yml` y se activa desde
los ajustes de la app. Si está apagado, o la máquina no tiene WebGL2, se sigue
viendo el mapa clásico.

## Límites de esta primera versión

Es el corte vertical de M77: la vista aérea 3D, la selección y el foco ya
funcionan. Los corredores, las estanterías, las etiquetas y el vuelo llegan
después; no se prometen aquí.

La decisión está en el [ADR 0113](../../apps/site/docs/desarrollo/adr/0111-0120/0113-el-atlas-es-un-plugin.md).
