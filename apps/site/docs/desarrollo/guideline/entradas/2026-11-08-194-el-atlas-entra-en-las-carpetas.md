---
title: "El Atlas entra en las carpetas"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: el Atlas dibujaba el mapa entero y seleccionaba ficheros, pero pulsar una carpeta solo
cambiaba el foco de la app; la cámara seguía en el atlas completo.

**Qué cambia**: al pulsar una carpeta, la cámara del Atlas se centra en su volumen y se acerca. Aparece
un breadcrumb dentro de la vista y un botón **Volver** para regresar al mapa entero. Si el foco se
cambia desde la ruta de la app, el Atlas sigue el mismo camino.

Funciona en los dos mapas y conserva la selección y el resto del estado. El foco sigue siendo de la
app: el Atlas no guarda una segunda verdad.

**Por qué así**: entrar en una carpeta es el primer gesto que convierte el Atlas en un mapa y no solo
en una vista aérea. El breadcrumb y el botón de vuelta evitan perderse.

**Verificado**: abrir `packages/ui` enfoca su volumen, muestra el breadcrumb y el botón Volver; al
pulsarlo se vuelve al atlas completo. Sin errores de consola.

**Qué falta**: la transición animada, las etiquetas, el detalle de fichero y los corredores.

**Tamaño**: el foco de cámara en `orbit.ts` y `scene.ts`, el breadcrumb y el botón en la vista, y la
prueba de `findVolume`.

**Veredicto**: hecho.
