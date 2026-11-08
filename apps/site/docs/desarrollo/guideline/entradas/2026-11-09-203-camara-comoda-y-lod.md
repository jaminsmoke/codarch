---
title: "Cámara a mano, más aire y LOD de geometría"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**Qué era**: la cámara solo se manejaba con arrastre y rueda, sin botón para volver a la vista
inicial ni atajos. La sala se sentía estrecha y los detalles de los archivadores se dibujaban siempre.

**Qué cambia**:

- La sala gana ancho, fondo y altura mínima; la fila central y las estanterías laterales se separan.
- Botones **−**, **Centrar** y **+** en el escenario.
- Atajos `+` / `-` para acercar y alejar, y `0` o `R` para centrar.
- La vista inicial arranca con algo más de altura.
- Los detalles de los archivadores se marcan como `detail`: en salas de más de 140 cajas se retiran
  antes que los cuerpos, las hojas o el mobiliario principal.

****Por qué así**: centrar y acercar tiene que estar a mano, también en táctil. El aire evita que los
muebles se toquen y el LOD por carga aligera las salas grandes sin quitar contenido.

**Verificado**: en Chrome, raíz, `scripts` y `packages/ui/src` se ven con más aire, los botones de
cámara y las estanterías abiertas; sin errores de consola.

**Qué falta**: LOD por distancia y distribución fina. La puerta animada sigue para después.

**Tamaño**: `room.ts`, `scene.ts`, `view.tsx`, `orbit.ts`, estilos y pruebas del Atlas.

**Veredicto**: hecho.
