---
title: "Los efectos del hook se prueban"
date: "2026-10-31"
category: "chore"
verdict: "arreglo"
---

**Qué era**: la suite probaba componentes con `renderToStaticMarkup`, que no ejecuta efectos, así que
la mitad del hook de la app —cargar documentos, restaurar el proyecto guardado, escuchar los atajos— no
tenía una sola prueba. Nadie montaba el hook entero porque `plugins.ts` importa
`virtual:codarch-plugins`, un módulo que genera el build y que fuera de él no resuelve.

**Qué cambia**: entran `@testing-library/react`, `@testing-library/dom` y `jsdom` como dependencias de
desarrollo de la raíz, y `vitest.config.ts` resuelve `virtual:codarch-plugins` a un registro vacío de
pruebas (`packages/ui/test/fixtures/plugins-empty.ts`): la app carga con cero plugins, como un repo sin
plugins declarados. `appHookEffects.test.ts` monta el hook con un DOM de verdad y prueba catorce casos:
la carga de documentos —un snapshot válido decide su vista y deja de cargar, uno roto se dice y no deja
el mapa a medias, abrir un proyecto lo guarda—, el refresco del live —avisa con otro árbol, no avisa con
el mismo y no mueve la vista, y respeta el área de las preferencias al abrir otro proyecto—, los atajos
—`/` al buscador, `Ctrl+,` a los ajustes y `Escape` a soltar búsqueda, foco y selección—, el proyecto
guardado al montar —se restaura con su rótulo, y el que ya no se abre se borra—, el lint que añade su
lente, el mapa del resto que se abre por bytes y vuelve al código, y una vista pedida que se aplica con
lo que el mapa tiene.

**Por qué así**: un efecto no se puede comprobar mirando un HTML que nunca se ejecutó. Con un DOM de
verdad se comprueba lo que de verdad importa —que `/` deja el foco en el buscador, que el refresco no
mueve el mapa— sin cambiar el entorno de toda la suite: solo el fichero que lo necesita pide `jsdom`.

**Verificado**: **161 ficheros y 1385 tests** en verde, con los catorce casos nuevos; `npm run lint` sin
mensajes en 558 ficheros; typecheck y `site:build` correctos. La prueba de humo del hook sigue montándolo
sin DOM para lo que solo se lee.

**Veredicto**: arreglo.
