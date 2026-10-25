---
title: La ficha enseña el código
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: la ficha listaba los símbolos, sus miembros y su superficie, pero para leer el cuerpo había que abrir el editor. Los grupos de símbolos no se podían plegar y la explicación de una métrica vivía en un `title` que solo aparecía al pasar el cursor por el nombre.

**Qué cambió**: todos los símbolos guardan sus líneas, no solo las funciones. Al pulsar uno, la ficha pide su código real a la plataforma —servidor local, escritorio o los ficheros que la web tiene en memoria— y lo enseña en un bloque plegable justo debajo de la fila, con números de línea y dos de contexto. El lector compartido no sale del repo, rechaza symlinks y directorios como `.git` o `node_modules`, y corta en 400 líneas o 1 MB. Además, Funciones, Clases, Interfaces, Tipos, Enums y Variables se pliegan por su cuenta, y cada fila de Métricas lleva un `?` delante del nombre con la explicación breve; el tooltip de la fila sigue contando la escala, el p95 y la cobertura.

**Números**: `labelFor` enseña sus 13 líneas más 2 de contexto; los 20 campos de métricas tienen ayuda visible y el código de un miembro de clase también se abre bajo su fila. El código no entra en `cc.json` ni en el reporte; el checksum cambia porque todos los símbolos llevan ahora su rango de líneas, no porque el fuente se guarde.

**Sobre las variables**: los `const` y `let` del módulo sí se capturan. Los que guardan una flecha o una clase aparecen en **Funciones** o **Clases**, no en **Variables**, porque eso es lo que son. No se capturan los locales, la desestructuración ni los `let` sin valor. Quedan fuera, por ahora, los espacios de nombres, las claves de objetos y el código suelto de nivel superior.

**Veredicto**: [ADR 0067](../../adr/0061-0070/0067-la-ficha-ensena-el-codigo.md), hecho. El código se pinta con Prism sobre fondo negro, sin recuadros por línea. El salto al editor y las dependencias llegan en M48 (ADR 0068).
