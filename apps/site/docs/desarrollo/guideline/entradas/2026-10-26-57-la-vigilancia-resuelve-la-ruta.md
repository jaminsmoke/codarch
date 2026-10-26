---
title: La vigilancia resuelve la ruta
date: "2026-10-26"
category: fix
verdict: arreglo
---

**Qué era**: `codarch serve --watch` se caía sin decir nada cuando la raíz estaba en una ruta temporal de Windows. El log solo dejaba una aserción de libuv: `!_wcsnicmp(filename, dir, dirlen), file src\win\fs-event.c`. La causa: `%TEMP%` llega como nombre corto (`C:\Users\JAMINS~1\…`) y `fs.watch` recursivo recibe los eventos con el nombre largo; libuv compara el prefijo del evento con el del directorio vigilado, no coincide y aborta el proceso. No hay forma de atraparlo desde JavaScript: la única salida es no darle esa ruta.

**Qué cambió**: `watchRepository` resuelve la raíz con `fs.realpathSync.native` antes de abrir los handles, así que vigila la ruta larga —y de paso resuelve enlaces y junctions—. El árbol y `.git` se escuchan sobre esa misma raíz.

**Números**: cinco líneas y un `realpath`; los dos handles por repo (árbol y `.git`) siguen siendo dos. Los tests de vigilancia se mudaron a `%TEMP%`, que es justo donde fallaba, y hay uno nuevo que vigila a través de un junction.

**Veredicto**: arreglo, sin ADR: es implementación, no una decisión de producto. Comprobado con el caso que caía: raíz `C:\Users\JAMINS~1\…\watch-serve`, `--watch` activo, un guardado y el `↻` del reanálisis, con el servidor todavía vivo. Sin el arreglo, ese mismo test aborta la ejecución.
