---
title: "El gestor de reglas enseña el diff y permite deshacer"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: activar o quitar una regla escribía directamente en la config. Las recomendaciones eran
las mismas para todos los proyectos y el catálogo de Checkstyle solo cubría los módulos más obvios.

**Qué cambia**: el [ADR 0112](/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/) añade cuatro cosas.

- **Previsualización**: el servidor calcula el cambio sin tocar el disco y la confirmación enseña el
  diff de líneas. Solo al aceptar se escribe y se vuelve a lintar.
- **Deshacer**: la última escritura de cada config se guarda en memoria del servidor y se puede
  revertir desde el aviso. No se guarda en `.codarch/`: no es un artefacto del análisis.
- **Recomendaciones por proyecto**: se leen señales seguras de `package.json` (React, Vue, Svelte,
  TypeScript, Vitest o Jest) y se añaden reglas con sentido. Si el catálogo real está disponible, las
  extra se filtran contra él para no recomendar algo que la config no resuelve.
- **Checkstyle**: el catálogo curado pasa de unos ochenta a más de ciento setenta módulos, con su
  contenedor comprobado. Un módulo desconocido se sigue rechazando y el menú lo explica en vez de
  decir que no hay coincidencias.

**Por qué así**: el diff da contexto antes de tocar el proyecto; el undo es una red de seguridad, no
una segunda fuente de verdad; y una recomendación solo vale si la herramienta puede cargarla.

**Verificado**: previsualizar no modifica el fichero; escribir y deshacer deja el contenido original;
el segundo undo contesta 409; el menú muestra la nota del catálogo vacío; las recomendaciones no
duplican las base; la suite completa y el typecheck pasan.

**Qué falta**: los módulos de Checkstyle que no están en el catálogo curado siguen rechazándose; el
undo vive mientras viva el servidor y es de una escritura por config; las señales de proyecto se
limitan a `package.json`.

**Tamaño**: el cálculo sin escritura en `@codarch/lint`; las rutas de previsualización y undo en el
servidor; el diff, la confirmación, el aviso y las recomendaciones en la ficha.

**Veredicto**: hecho.
