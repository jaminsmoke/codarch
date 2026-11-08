---
title: "ADR 0114 — El Atlas sustituye a la vista 3D de barras"
description: "La vista 3D de barras se retira del producto: el Atlas es la única vista 3D. No se mantienen dos metáforas que compiten ni se deja una copia escondida."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: El Atlas sustituye a la vista 3D
  order: 114
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Retira** la vista que nació en el [ADR 0028](0021-0030/0028-los-plugins.md) y cuyo renderizador
describió el [ADR 0055](0051-0060/0055-el-3d-se-dibuja-con-webgl2.md). El
[ADR 0113](0113-el-atlas-es-un-plugin.md) crea el Atlas, que ya está implementado.

## Contexto

El Atlas ya dibuja el mapa en 3D: vista aérea, contenedores de carpeta, cubos de fichero, selección
y foco sincronizados, y funciona en los dos mapas. La antigua `vista-3d` de barras sigue en el repo
como un segundo plugin 3D.

Las dos vistas comparten WebGL2 y el modelo, pero no la metáfora: una es un histograma de cajas y la
otra es un atlas que se recorre en profundidad. Mantener las dos confunde al usuario, duplica el
código de cámara y volumen, y obliga a decidir dos veces cada paso de la vista 3D.

## Decisión

### 1. Se retira `plugins/vista-3d`

El plugin desaparece del repo y de `.codarch.yml`. El Atlas es la única vista 3D del producto.

- No se deja una copia escondida ni un modo «clásico 3D».
- No se mantiene un alias de compatibilidad: si alguien tenía `vista-3d` activado en su máquina, el
  plugin deja de existir y la app vuelve al mapa clásico.
- El mapa 2D sigue siendo el fallback y la referencia de legibilidad.

### 2. El Atlas ocupa su lugar

El Atlas mantiene lo que ya decidió el [ADR 0113](0113-el-atlas-es-un-plugin.md): plugin separado,
escenario central completo, todos los mapas, sin lentes nuevas y sin tocar el checksum. Lo que cambia
es que ya no hay otra vista 3D con la que compararlo.

### 3. Los ADR antiguos son historia

El [ADR 0028](0021-0030/0028-los-plugins.md) y el
[ADR 0055](0051-0060/0055-el-3d-se-dibuja-con-webgl2.md) siguen siendo válidos como registro: explican
por qué hay plugins y por qué el 3D se dibuja con WebGL2 propio. La referencia concreta a la vista de
barras es histórica; la vista actual es el Atlas.

### 4. Se limpia lo que dependía de ella

- Se borran sus ficheros, sus tests y su hoja de ruta.
- Se actualizan `.codarch.yml`, el README, la guía de uso y las capturas que la mencionaban.
- El Atlas conserva sus propias cámaras, volúmenes y tests; no queda código huérfano.

## Consecuencias

- Un solo plugin 3D, un solo concepto y una sola hoja de ruta.
- Menos código duplicado y menos bundle: el Atlas ya tiene su chunk propio.
- El usuario que tenía `vista-3d` activado no pierde el mapa: cae al mapa clásico y puede activar el
  Atlas.
- No cambia el contrato de plugins, el checksum ni los addons.
- La retirada no reescribe la historia: los ADR antiguos se leen con la fecha en que se decidieron.

## Alternativas descartadas

- **Mantener las dos vistas.** Duplica metáfora, cámara y mantenimiento, y confunde la elección.
- **Dejarla oculta o desactivada por defecto.** Una copia escondida sigue envejeciendo y sigue
  arrastrando código y tests.
- **Fusionarla con el Atlas.** El Atlas es otra cosa; meter las barras dentro le devuelve la confusión
  que se quiere quitar.
- **Borrarla sin dejar registro.** El ADR 0114 y los ADR históricos explican por qué se fue.

## Hoja de ruta

Sin fase nueva. La retirada forma parte de M77.

- ✅ Retirar `plugins/vista-3d` y su registro en `.codarch.yml`.
- ✅ Borrar sus tests y su documentación de plugin.
- ✅ Actualizar README, guía de uso, capturas y referencias al plugin.
- ✅ Dejar el Atlas como única vista 3D y conservar el mapa clásico como fallback.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
