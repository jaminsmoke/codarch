---
title: "ADR 0106 — Las cuentas y las rutas del lint salen de los mensajes"
description: "El artefacto sigue en 1.2. Al leer, las cuentas heredadas se regeneran desde los mensajes y las rutas se canonizan (NFC por segmento, sin cambiar mayúsculas). summary.measured es la cobertura global y no se toca. Dos claves que caen en la misma ruta se avisan, no se funden en silencio."
section: desarrollo
status: aceptado
date: "2026-11-06"
sidebar:
  label: Las cuentas y las rutas del lint
  order: 106
---

**Estado:** aceptado · **Fecha:** 2026-11-06

## Contexto

El artefacto del lint (`lint.repmod.json` y `lint-rest.repmod.json`) guarda dos
cosas que pueden no decir lo mismo: los **mensajes** y las **cuentas**
(`errors`, `warnings` y el `summary`). Las hojas, el riesgo y el MCP ya cuentan
mensajes (`lintTotals`, `lintFileCounts`). El lector, en cambio, devolvía las
cifras declaradas tal cual. Un artefacto de fuera con `errors: 9` y un solo
aviso enseñaba 9 en un sitio y 1 en otro.

Las rutas tenían el mismo problema al revés. Al **escribir**, `canonicalLintPath`
deja la ruta relativa, con `/` y sin `..`. Al **leer**, la clave se conservaba
como viniera: `./src/a.ts`, `src\\a.ts` y `src/Cafe\u0301.ts` no eran
`src/a.ts` ni `src/Café.ts`. El mapa compara por cadena, así que el hallazgo no
caía en el fichero.

`summary.measured` es otra cifra: cuántos ficheros miró la pasada, limpios
incluidos. Esos limpios no están en `files`, así que no sale de los mensajes.
No es una cuenta por carpeta.

Subir el esquema a 1.3 para quitar las cuentas heredadas rompería los
artefactos 1.0, 1.1 y 1.2 que ya están en repos. Los nombres de los ficheros
tampoco se tocan ([ADR 0100](../0091-0100/0100-los-nombres-de-los-artefactos.md)).

## Decisión

1. **El esquema sigue en 1.2.** No hay 1.3. Los ficheros siguen llamándose
   `lint.repmod.json` y `lint-rest.repmod.json`. Las cuentas heredadas siguen
   en el fichero: al leer se **regeneran**, no se tiran.

2. **Los mensajes son la única fuente de las cuentas.** `readLintArtifact`
   reescribe, con `lintFileCounts` y `lintTotals`:
   - `errors` y `warnings` de cada fichero;
   - `summary.files`, `summary.errors`, `summary.warnings` y `summary.messages`.

   `summary.files` es el número de **ficheros con hallazgos**: cualquiera con
   al menos un mensaje. Un `info` cuenta como hallazgo y como fichero, y no
   como error ni como aviso. `summary.messages` es el total de mensajes
   (lo que `lintTotals` llama `findings`). Un fichero sin mensajes sale del
   mapa: no es un hallazgo, aunque declarara errores. `createLintArtifact`
   sigue generando las cuentas igual que antes, desde los mensajes, al escribir.

3. **`summary.measured` no se regenera.** Es la cobertura **global** de la
   pasada, limpios incluidos. No es de una carpeta y no se puede reconstruir
   desde `files`. Si el artefacto la trae (1.2), se conserva; si no (1.0 y
   1.1), sigue faltando. El checksum declarado tampoco se recalcula: es el de
   quien escribió.

4. **La ruta canónica es una sola función.** `canonicalLintPath`, la misma al
   escribir y al leer, y la que usa el resto (`normalizePath`):
   - separadores POSIX (`\` pasa a `/`);
   - sin `./`, sin barras repetidas y sin segmento vacío;
   - NFC **por segmento**, como `normalizeName` en la identidad del `cc.json`;
   - se rechaza una ruta absoluta y cualquier `..` (no se resuelve: salirse del
     repo es un error);
   - no se pasa a minúsculas. `Src/Foo.ts` y `src/foo.ts` son ficheros distintos.
     La comparación es la de la cadena ya canónica, y distingue mayúsculas.

   Al leer, se canoniza la clave de cada fichero. Esa clave es la ruta del
   mensaje: el mensaje no lleva otra. Una ruta que no se puede canonizar
   invalida el artefacto. El lector sigue sin lanzar: devuelve `null`, como con
   cualquier forma rota.

5. **Una colisión de rutas se avisa y no se funde en silencio.** Si dos claves
   crudas distintas caen en la misma ruta, el resultado lleva `diagnostics`:

   ```ts
   { kind: "path-collision", path: "src/Café.ts", keys: ["src/Cafe\u0301.ts", "src/Café.ts"] }
   ```

   Los mensajes de todas las claves se conservan, en ese orden, bajo la ruta
   canónica, **sin deduplicar**. La cuenta sale de esa lista. No es un fallo:
   el artefacto se lee. `diagnostics` no es del esquema 1.0–1.2.
   `createLintArtifact` no lo escribe: al escribir, la misma ruta es un fichero
   a propósito (dos herramientas) y los mensajes repetidos se cuentan una vez.
   Un aviso mal formado se ignora. Uno bien formado se conserva, para que
   `read(serialize(read(x)))` sea igual a `read(x)`.

6. **Quien anuncia el lint usa la agregación compartida.** El aviso del live
   sale de `lintTotals`, no del `summary` declarado. `messages` del aviso es
   el total de hallazgos, info incluido. `measured` no viaja en ese aviso.

## Consecuencias

- Un artefacto con cuentas que no cuadran enseña, al leer, lo que dicen sus
  mensajes. La app, el CLI, el MCP y el mapa no dependen del número declarado.
- `src/Cafe\u0301.ts` y `src/Café.ts` son el mismo fichero después de leer.
  `./src/a.ts`, `src\\a.ts` y `src//a.ts` también. `Src/Foo.ts` no es
  `src/foo.ts`.
- El render y el MCP ven la ruta canónica porque leen el artefacto: el
  hallazgo cae en el fichero del mapa.
- Una colisión queda a la vista. Los mensajes no se tiran ni se deduplican, así
  que la cuenta puede ser mayor que si se hubieran fundido al escribir. El
  aviso dice por qué.
- El resto descarta una ruta que el artefacto rechazaría (absoluta, vacía o
  con `..`) en vez de tumbar la pasada. El destino de un enlace se canoniza
  igual, para que un enlace en NFD encuentre el fichero en NFC.
- Los artefactos 1.0 y 1.1 se siguen leyendo. El nombre de los ficheros no
  cambia.

## Alternativas descartadas

- **Subir a 1.3 y quitar las cuentas heredadas.** Rompe lo ya escrito. Las
  cuentas siguen siendo útiles en el fichero; lo que no manda es el número
  viejo.
- **Lanzar si hay colisión.** El lector no lanza: un artefacto raro no puede
  tumbar el mapa. Un aviso en el resultado es aditivo y el artefacto se sigue
  leyendo.
- **Fundir en silencio al leer**, como al escribir. Al escribir es el contrato
  (dos herramientas, un fichero, mensajes deduplicados). Al leer, dos claves
  distintas son un dato del fichero que hay que ver.
- **Pasar las rutas a minúsculas.** En un sistema de ficheros que distingue
  mayúsculas, `Foo.ts` y `foo.ts` no son el mismo nodo.
- **Resolver `..`**, como hace `pathSegments` del `cc.json`. En el lint, `..`
  es una ruta que se sale del repo, no un segmento que se deshace.
- **Regenerar `summary.measured`.** Los ficheros limpios no están en el
  artefacto. Inventar la cobertura sería mentir.

## Hoja de ruta

Sin fase nueva: el esquema sigue en 1.2 y se aplica al leer.

- ✅ Las cuentas heredadas se regeneran desde los mensajes. `summary.files` son
  los ficheros con hallazgos.
- ✅ `summary.measured` se conserva y queda documentado como cifra global.
- ✅ Las rutas se canonizan al leer, con NFC por segmento, y una colisión se
  avisa en `diagnostics`.
- ✅ El live agrega con `lintTotals`. El render y el MCP ven la ruta canónica.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
