---
title: "El resto, escrito"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: el [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) ya medía lo que no es código, pero el resto vivía solo en memoria: `codarch analyze` seguía dejando un único artefacto en `.codarch/` y la app no tenía de dónde leerlo.

**Qué cambia**: `writeRestSnapshot` (`packages/parsers/src/rest-store.ts`) escribe `.codarch/rest.cc.json` con la misma serialización canónica que el snapshot del código y con corte por checksum: guardar código no reescribe un mapa de documentos que no ha cambiado. `analyze` lo escribe al lado del snapshot y el resumen gana una línea `resto` con la ruta, el tamaño, los ficheros y los enlaces. `serve` lo guarda en el `.codarch/` del repo en cada pasada y lo expone en `/data/rest.cc.json` **desde la memoria de esa misma pasada** —nunca leyendo el fichero, así los dos mapas no se pueden desincronizar en el servidor—, con un 204 si no hay resto, y su banner cuenta los ficheros.

**Por qué así**: el artefacto es lo que separa a los dos públicos. El del código no cambia ni de contenido ni de checksum, y lo que compara código no lo mira: el diff, las reglas, la acción y el MCP siguen leyendo solo `snapshot.cc.json`. El resto es un mapa más de `.codarch/`, ignorado como el otro, y con su propia verificación: tres tests nuevos cubren que un documento movido cambia el checksum del resto y no el del código, que dos pasadas dejan el fichero byte a byte igual y que el servidor sirve lo que acaba de escribir.

**Lo que falta**: que la web y el escritorio carguen el resto, la pestaña `El resto` con sus bloques en el raíl, la ficha del fichero que no es código y, en su ADR, las reglas del resto.

**Veredicto**: fase en marcha.
