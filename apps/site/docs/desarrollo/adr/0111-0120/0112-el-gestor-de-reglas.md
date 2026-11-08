---
title: "ADR 0112 — El gestor de reglas escribe en la config del proyecto"
description: "Las reglas de ESLint se añaden y se quitan como lo haría un usuario: se edita la config real, con un bloque gestionado para lo heredado y un catálogo buscable de reglas conocidas."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: El gestor de reglas
  order: 112
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Enmienda** el alcance del [ADR 0111](0111-codarch-es-panel-de-control-del-lint.md): el panel de control
también edita ESLint y cualquier herramienta cuyo formato se pueda leer y escribir con seguridad. La
fuente de verdad sigue siendo la config del proyecto.

## Contexto

Oxlint ya se activa y se desactiva desde la ficha. Falta ESLint, cuya config es JavaScript ejecutable:
no hay una línea que borrar cuando la regla viene de un preset. También falta poder **añadir** una
regla que no esté en el catálogo, no solo activar las recomendadas. Y el informe de `.codarch` puede
quedar viejo si la config cambia por fuera, porque el checksum del árbol de código no cambia.

## Decisión

1. **La config del proyecto manda.** El escritor lee y escribe el fichero real; `.codarch/` solo
   guarda el informe de la última ejecución, nunca reglas activas ni preferencias.

2. **Bloque gestionado en `eslint.config.js`.** Las reglas que no se pueden quitar de una línea
   —porque vienen de un preset o de un spread— se escriben como overrides en un bloque con marcas
   estables:

   ```js
   // codarch:lint-rules:start
   // Gestionado por CodArch. No editar a mano.
   { rules: { "no-console": "off" } }
   // codarch:lint-rules:end
   ```

   Si el bloque no existe, se inserta una vez en el array exportado con un AST; después solo se
   reescribe su contenido. Una regla explícita en la config del usuario se puede quitar o cambiar en
   su sitio; si no se encuentra con seguridad, se usa el bloque. Si el fichero no es analizable
   (funciones, valores calculados, sintaxis no soportada), se dice y no se toca.

3. **Catálogo de reglas conocidas.** Cada adaptador puede listar sus reglas para el menú de añadir:
   - ESLint: las del núcleo y las de los plugins que resuelve la config del proyecto.
   - Oxlint: las del esquema de la versión instalada.
   - Si una herramienta no puede enumerarlas, el menú solo ofrece las activas y las recomendadas y lo
     dice; no se inventa un catálogo.

4. **La UI es un gestor.** Las activas se quitan; las recomendadas y las del catálogo se añaden. El
   menú de añadir es buscable y agrupa por plugin; al añadir se elige la severidad (`error` o `warn`,
   por defecto `error`). Cada cambio enseña fichero y diff antes de escribir, y después se vuelve a
   lintar.

5. **El informe no diverge.** El artefacto gana una huella opcional de la config del lint (`meta.config`)
   dentro del contrato **1.3**; un lector anterior la ignora y un artefacto sin ella se lee igual. Un
   cambio en un fichero de config fuerza una re-medida aunque el checksum del código no cambie, y al
   arrancar el live la primera pasada también es forzada. La huella sirve para auditar qué config
   produjo la foto, no para decidir qué reglas están activas.

6. **Una herramienta, un escritor.** El contrato `LintRuleWriter` recibe el sistema, la regla y la
   severidad, y devuelve la ruta y el diff. Oxlint JSON ya lo cumple; ESLint AST es el siguiente;
   Biome, Ruff y Checkstyle llegarán con su formato.

## Consecuencias

- Añadir una regla de ESLint será elegirla del menú, ver el cambio y aceptarlo; el `npm run lint` del
  proyecto ve exactamente lo mismo.
- El bloque gestionado es visible y versionado: no hay una config oculta en `.codarch/`.
- El informe se actualiza al cambiar la config; deja de ser una foto que puede envejecer en silencio.
- Un `eslint.config.js` raro no se rompe: se rechaza la escritura con un motivo.

## Alternativas descartadas

- **Guardar las reglas en `.codarch/`.** Sería una segunda fuente de verdad y CI no las vería.
- **Un fichero aparte importado por la config.** Añade una indirección que el usuario no pidió; el
  bloque gestionado se lee en el mismo sitio.
- **Buscar y reemplazar texto.** Rompe configs con presets, spreads y overrides.
- **Enseñar solo las recomendadas.** El usuario necesita añadir cualquier regla conocida.

## Hoja de ruta

Sin fase nueva.

- ✅ La decisión: bloque gestionado y catálogo buscable.
- ✅ El escritor de ESLint con bloque gestionado y retirada de reglas explícitas.
- ✅ El catálogo de reglas por herramienta (ESLint núcleo y plugins; oxlint).
- ✅ El menú de añadir con búsqueda, severidad y confirmación.
- ✅ Re-medida al cambiar la config del lint.
- ✅ `meta.config` como huella opcional dentro de 1.3.
- ✅ El escritor de Biome en JSON.
- ✅ El escritor de Ruff en TOML, con `ruff rule` para el catálogo.
- ✅ Checkstyle: quitar módulos del XML. Activar espera el contenedor.
- ⬜ Activar módulos de Checkstyle cuando se sepa su contenedor.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
