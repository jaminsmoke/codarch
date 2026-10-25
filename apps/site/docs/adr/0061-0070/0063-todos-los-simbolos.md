---
title: ADR 0063 — Todos los símbolos del módulo
description: "La lente deja de esconder las constantes: captura las variables del módulo, cuenta cada tipo en el resumen, detecta cambios de cuerpo en el diff y agrupa la ficha por tipo."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: Todos los símbolos del módulo
  order: 63
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

El modelo conoce seis tipos de símbolo desde el ADR 0025: `function`, `class`,
`interface`, `type`, `enum` y `variable`. El parser solo emitía cinco. La
constante que guarda una función o una clase se convertía en `function` o
`class`, pero una constante de texto, un objeto de configuración o un `let` con
valor no aparecían: se descartaban a propósito como «datos, no estructura».

Esa decisión se tomó cuando la ficha enseñaba doce símbolos y una elipsis. Ya no
se sostiene: el ADR 0062 quitó el corte y ahora la lista se pliega entera. Un
fichero como `packages/ui/src/labels.ts` declara `EVENT_LABEL`,
`SYMBOL_LABEL` y `CHURN_METRIC`, que son la tabla de vocabulario de la UI; sin
ellos, la lente dice que el fichero solo tiene una función. En un repositorio
TypeScript, las constantes y los objetos de configuración son parte de la
estructura, no ruido.

Además, el diff de símbolos comparaba tipo, complejidad y líneas. Una constante
que cambia de `10` a `20` conserva las tres cosas, así que el cambio no se veía.

## Decisión

La lente captura **todas las declaraciones con nombre que el modelo ya conoce**
(M43).

1. **Una variable del módulo es un símbolo.** `const`, `let` y `var` con valor
   en el ámbito del módulo se emiten como `variable`. Da igual que el valor sea
   un texto, un número, un array o un objeto: la constante de configuración es
   estructura del módulo.
2. **Una función o una clase guardadas en una constante siguen siendo lo que
   son.** `const doblar = (x) => x * 2` es `function` y `const Forma = class {}`
   es `class`, también dentro de una función. No se convierten en `variable`.
3. **Las locales no entran.** `const total = 0` dentro de una función es
   implementación, no un símbolo del fichero. Capturarlas llenaría la ficha de
   nombres que solo existen durante una llamada. Las funciones y clases locales
   sí entran, como antes: son estructura reutilizable.
4. **Sin nombre propio no hay símbolo.** La desestructuración (`const { a } =
   obj`) declara enlaces, no un nombre; un `let pendiente;` sin valor tampoco
   aporta cuerpo que seguir. Los dos se omiten.
5. **El resumen cuenta las variables.** `CcSymbolsSummary` gana `variables` y
   la suma de los seis tipos cuadra con `symbols`. El MCP expone también
   `types`, `enums` y `variables` en el resumen del mapa.
6. **El diff mira el cuerpo.** Un símbolo cambia si cambia su tipo, su
   complejidad, sus líneas o el hash de su cuerpo. Así una constante modificada
   sin cambiar de tamaño aparece como `changed`.
7. **El hash salta solo el nombre, no el nodo.** Al dar cuerpo a las variables
   salió un fallo viejo: en los métodos y en las variables el nodo empieza en la
   misma columna que su nombre, y el hash saltaba el nodo entero. El resultado
   era un hash vacío, el mismo para todos los métodos de una clase. Ahora solo
   se salta la hoja del nombre; cada método, cada clase y cada variable tienen
   el hash de su cuerpo.
8. **La ficha agrupa por tipo.** Funciones, clases, interfaces, tipos, enums y
   variables, en ese orden; dentro de cada grupo se conserva el orden del
   modelo (funciones de más a menos complejas, el resto por línea). El resumen
   plegado enseña el reparto (`12 fn · 8 var · máx. 15`) y la vida del símbolo
   pasa a ser una sección plegable más. Si ningún símbolo trae complejidad, el
   resumen se queda con el reparto y no añade `sin complejidad`: la cuenta por
   tipo ya dice lo que hay.

**La regla que queda:** un símbolo es una declaración con nombre que forma
parte del módulo. Los datos del módulo también lo son; los locales no. El
checksum cambia porque cambia el contenido de la lente, no porque cambie la
regla de identidad: sigue dependiendo del código.

**Lo que no cambia:** el checksum sigue siendo determinista y no depende de lo
que haya instalado; `cc.json` sigue siendo 2.x (los campos nuevos son
aditivos); la cadena de un símbolo sigue emparejando por cuerpo; y el orden de
`symbolsOf` no cambia (complejidad y luego línea).

## Consecuencias

- La ficha de un fichero de configuración deja de mentir: las constantes que
  usa el resto del módulo aparecen con su nombre y su línea.
- La lista crece. Por eso se agrupa y el resumen dice el reparto; el filtro por
  nombre sigue en la hoja de ruta para ficheros con cientos de símbolos.
- Las variables no tienen complejidad; sus líneas se guardan para enseñar el
  código del símbolo (ADR 0067).
- Un cambio de valor en una constante ya se ve en el reporte, el comentario del
  PR y el MCP.
- Los métodos y las clases recuperan un hash de cuerpo con contenido. El suyo
  era vacío desde M12 por el salto del nodo entero: todos los métodos de una
  clase compartían el mismo hash vacío. La cadena se rehace una vez para esos
  símbolos; a partir de ahí distingue un cuerpo de otro.
- Los snapshots anteriores siguen cargando: si no traen `variables`, se lee
  como cero. Al reanalizar, el checksum cambia porque la lente es más completa.
- Quedan fuera de esta lente, por ahora, los espacios de nombres: envuelven
  declaraciones, no son una declaración más. Los miembros de clase y los alias
  de importación se resuelven en la lente `structure` (ADR 0064).

## Alternativas descartadas

- **Capturar también las variables locales.** Es fácil de implementar y arruina
  la señal: una función de cien líneas aporta decenas de nombres que no existen
  fuera de ella.
- **Un tipo `constant` separado de `variable`.** El modelo ya tiene `variable`;
  añadir otro tipo obliga a tocar la cadena, el diff y todas las apps para
  distinguir algo que el cuerpo ya dice. Si algún día importa el `const` frente
  al `let`, se añade un detalle, no un tipo nuevo.
- **Capturar las propiedades de un objeto literal.** Un objeto de configuración
  con treinta claves pasaría de un símbolo a treinta y uno. El objeto ya es el
  símbolo.
- **Seguir dejando fuera las constantes.** Es lo que hacía que un fichero de
  etiquetas pareciera tener solo una función. La ficha ya sabe plegarse.

## Hoja de ruta

### M43 - Todos los símbolos y la ficha completa

- [x] Las variables del módulo se emiten como `variable`, con texto, objetos y
  números.
- [x] Las funciones y clases guardadas en constantes siguen siendo función o
  clase, también en ámbito local.
- [x] Las variables locales, la desestructuración y los `let` sin valor no son
  símbolos.
- [x] `CcSymbolsSummary.variables`, el MCP y las fixtures cuadran con los seis
  tipos.
- [x] El diff compara el hash del cuerpo: un cambio de valor cuenta.
- [x] El hash salta solo la hoja del nombre: métodos, clases y variables tienen
  cuerpo propio y ningún símbolo acaba con el hash vacío.
- [x] La ficha agrupa por tipo y el resumen plegado enseña el reparto.
- [x] La vida del símbolo es una sección plegable, como Métricas y Símbolos.
- [x] Colores propios para `enum` y `variable` y títulos largos con elipsis.
- [ ] Un filtro por nombre cuando un fichero traiga cientos de símbolos.
- [ ] Distinguir el valor de una variable (texto, número, objeto) en la fila.
- [ ] Espacios de nombres y alias de importación, si el modelo los necesita.

El registro de lo hecho vive en el [feed de la guía](/guia/).
