---
title: "Estanterías laterales y archivadores con forma"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: todos los ficheros se apilaban en una estantería de fondo y los archivadores formaban
un bloque en el centro. Las paredes laterales quedaban vacías y los archivadores eran cubos lisos.

**Qué cambia**:

- Los ficheros se reparten en dos estanterías pegadas a las paredes laterales.
- Las hojas van de pie, con la cara al pasillo central y el canto hacia la cámara.
- Los archivadores se centran y, hasta cinco, van en una sola fila visible.
- Cada archivador gana tapa, zócalo, marco frontal y tirador; los detalles no son seleccionables.
- La sala crece en ancho para separar las estanterías laterales del centro.

**Por qué así**: la distribución usa las tres paredes visibles y deja un pasillo central. La
estantería deja de ser un cartel de hojas; el giro de cámara permite mirar los lomos de frente. Los
archivadores se leen como muebles y la fila central no esconde los de atrás cuando hay cinco.

**Verificado**: en Chrome, la raíz, `scripts` y `packages/ui/src` muestran las estanterías laterales,
los archivadores centrados y las etiquetas; sin errores de consola.

**Qué falta**: pulir luces, distribución fina y LOD; la puerta animada sigue para después.

**Tamaño**: `room.ts`, las pruebas del Atlas y la documentación del plugin.

**Veredicto**: hecho.
