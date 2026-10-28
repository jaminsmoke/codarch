---
title: La UI deja de tener tres ficheros de mil líneas
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**Qué era**: tres ficheros de la interfaz eran los más grandes de su capa: `panels.tsx` con **979** líneas, `useCodarchApp.tsx` con **837** y `ChangesPanel.tsx` con **759**. En `panels.tsx` convivían la leyenda, los estratos de lenguaje, el inspector de un fichero, la muestra de código y tres listas de commits; en el hook, la cámara del mapa, la carga de documentos, los atajos y las preferencias; en la pestaña de cambios, sus siete filas distintas.

**Qué es**: cada pieza vive en su módulo y lo que queda es el pegamento. `panels.tsx` pasa a **7** líneas y junta `panels/` — `Inspector`, `CodePeek`, `Legend`, `LanguageSample`, `HistoryPanel`, `HeatList`, `Kpi`. `ChangesPanel.tsx` baja a **387** y sus filas están en `changes/` — `FileEntry`, `BalanceRow`, `HistoryRow`, `TouchedRows` y `summary`. El hook baja a **528** y reparte su trabajo en `app/` — `types`, `camera`, `documents`, `preferences`, `shortcuts` y `snapshotView`. Son dieciocho módulos nuevos, 1954 líneas entre todos.

**Por qué así**: se cortó por lo que cada bloque sabe, no por su tamaño: la cámara solo sabe de zoom y centro, los documentos solo de parsear y guardar, y una fila solo de lo suyo. Lo que se queda en el hook es lo que es de la app entera —qué se deriva del snapshot, qué está seleccionado, qué vistas traen los plugins—. La decisión de con qué vista abre un snapshot salió a `snapshotView` porque es lo único de la carga que se puede leer sin abrir un fichero, y así se prueba sola.

**Cómo se comprueba**: los 205 casos de `packages/ui/test` siguen pasando sin cambiar una línea de test, y `snapshotView.test.ts` añade **11** para las decisiones nuevas —qué área y qué color abre un snapshot, y qué se conserva en un refresco—. En la app abierta contra el repo: el mapa, el raíl, la ficha con sus secciones, el desplegable de un símbolo, la pestaña de cambios con su balance y el zoom se comportan igual. La complejidad máxima de los módulos nuevos es **20** (`Inspector`) y el hook baja a **17**.

**Veredicto**: refactor cerrado. `Inspector` es ahora el fichero más grande de la UI con 594 líneas y seis secciones dentro; partirlo por secciones es la siguiente pasada.
