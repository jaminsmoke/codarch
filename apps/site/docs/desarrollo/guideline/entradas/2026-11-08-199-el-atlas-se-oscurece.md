---
title: "El Atlas se oscurece y ordena sus etiquetas"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: la sala frontal tenía un fondo claro, estanterías y etiquetas sin una jerarquía visual
clara. Las hojas lejanas llenaban la pantalla de nombres.

**Qué cambia**:

- Paleta propia del Atlas: fondo, suelo, estanterías y paneles oscuros; las hojas conservan el color
  del mapa.
- La sala se apoya en una plataforma y una estantería de fondo; los archivadores quedan delante.
- La cámara se aleja lo suficiente para que quepan estanterías y archivadores.
- Las etiquetas de ficheros lejanos se ocultan por tamaño en pantalla; el fichero seleccionado siempre
  conserva la suya.
- HUD, breadcrumb y panel de código usan la misma paleta oscura.

**Por qué así**: el contraste hace que las hojas y los contenedores se lean de un vistazo; las
etiquetas dejan de competir cuando hay muchas hojas.

**Verificado**: `scripts` y `packages/ui/src` se ven con estanterías y etiquetas; el visor sigue
abriendo; sin errores de consola.

**Qué falta**: paredes y luces más trabajadas, distribución fina de archivadores y LOD de geometría.

**Tamaño**: paleta y CSS del plugin, `room.ts` y el presupuesto de etiquetas de `scene.ts`.

**Veredicto**: hecho.
