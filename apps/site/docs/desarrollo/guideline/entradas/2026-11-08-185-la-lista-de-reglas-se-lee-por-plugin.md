---
title: "La lista de reglas se lee por plugin"
date: "2026-11-08"
category: "feature"
verdict: "arreglo"
---

**Qué era**: en **Docs y config** las reglas activas eran una lista plana: el identificador completo —plugin y regla separados por una barra— en una sola línea, con la severidad en gris. Con 24 reglas de ESLint y 5 de oxlint, todo pesaba lo mismo.

**Qué cambia**: cada herramienta —eslint, oxlint— es una **subsección plegable** con su cuenta de reglas y, cerrada, su configuración y su estado. Dentro, las reglas se agrupan por **plugin**: un subtítulo `@typescript-eslint`, `core` o `doc`, y debajo sus reglas, cada una con la severidad a la derecha y un filete de color a la izquierda. El `title` conserva el identificador completo y la severidad tiñe el filete y la etiqueta —rojo para error, ocre para aviso, azul para info—, no el nombre: una regla activa está configurada, no ha saltado. La sección gana jerarquía: el título de sección sube a 14 px, el nombre de cada sistema a 12,5 px, «Herramientas que midieron» pasa a subtítulo con su pleca y el catálogo deja el rojo del lint porque es configuración, no deuda.

**Por qué así**: el plugin es contexto y la regla es lo que se busca. Partirlos deja escanear por nombre y por severidad sin leer una barra diagonal en cada fila, y el color responde a «¿está como error o como aviso?» de un vistazo.

**Verificado**: las 24 reglas de ESLint y las 5 de oxlint se pintan agrupadas por plugin, con su severidad; el test comprueba `@typescript-eslint` + `no-unsafe-declaration-merging`, `core` + `no-console`, los dos niveles de color y que cada herramienta se pliega.

**Qué falta**: nada. Las reglas personalizadas de CodArch siguen para después.

**Tamaño**: `LintConfigSection`, `lint.css` y la escala del título de sección en `inspector.css`.

**Veredicto**: hecho.
