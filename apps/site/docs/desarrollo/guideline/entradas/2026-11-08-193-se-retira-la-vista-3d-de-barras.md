---
title: "La vista 3D de barras se retira"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: había dos plugins 3D. El Atlas y la antigua vista de barras compartían WebGL2 y el
modelo, pero no la metáfora; mantener las dos confundía la elección y duplicaba cámara y volúmenes.

**Qué cambia**: se elimina `plugins/vista-3d` y su entrada en `.codarch.yml`. El
[ADR 0114](/desarrollo/adr/0111-0120/0114-el-atlas-sustituye-a-la-vista-3d/) deja al Atlas como la
única vista 3D del producto.

- Si alguien tenía `vista-3d` activado, el plugin deja de existir y vuelve al mapa clásico.
- No hay alias, modo «3D clásico» ni copia escondida.
- Se borran sus tests y su hoja de ruta.
- Se actualizan README, guía de uso y la captura de Ajustes.
- El mapa 2D sigue siendo el fallback.

**Por qué así**: una sola metáfora 3D, un solo mantenimiento y menos código. La historia queda en los
ADR antiguos, que siguen explicando por qué hay plugins y por qué el 3D usa WebGL2 propio.

**Verificado**: el build web ya no genera el chunk `vista-3d`; Ajustes muestra solo Atlas; el mapa
clásico sigue disponible; la suite, el typecheck y el build del sitio pasan.

**Tamaño**: la retirada del plugin y la limpieza de registro, tests y documentación.

**Veredicto**: hecho.
