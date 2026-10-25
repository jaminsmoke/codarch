---
title: ADR 0064 — La ficha no esconde nada
description: "La lente de símbolos no puede ser toda la verdad del fichero: los campos de clase y la superficie de imports y exports también se enseñan, en secciones propias y sin tocar la identidad de los símbolos."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: La ficha no esconde nada
  order: 64
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

El ADR 0063 cerró la lente de símbolos: funciones, clases, interfaces, tipos,
enums y variables del módulo. Aun así, la ficha del fichero seguía mintiendo
por omisión. En este repositorio:

- **70 de 294 ficheros** no tienen ningún símbolo. Un barrel como
  `packages/metrics/src/browser.ts` solo enseña Métricas, aunque su contenido
  sea reexportar medio paquete.
- **57 campos de clase** no aparecen. `apps/mcp/src/store.ts` declara 21 campos
  y la ficha solo enseña la clase y sus métodos; el estado del store no se ve.
  A ellos se suman 3 propiedades declaradas en parámetros del constructor.
- **904 imports** y **538 exports** no se leen en la ficha. La lente de
  dependencias conoce las aristas entre ficheros, pero no qué nombre entra o
  sale de cada uno.

La tentación es meterlo todo en `CcSymbol`. No es gratis: un campo no es una
declaración del módulo, dos clases del mismo fichero pueden repetir el nombre
(`constructor`, `root`), y la cadena de un símbolo empareja por nombre y ruta.
Meter campos en la lente obligaría a cambiar la identidad y la cadena para
resolver colisiones que hoy solo existen en los métodos.

## Decisión

### 1. Una lente `structure`, aditiva

El snapshot gana una lente opcional `structure` con un nodo por fichero:

```ts
type CcStructureNode = {
  members: CcMember[]
  imports: CcSurfaceImport[]
  exports: CcSurfaceExport[]
}
```

No es una lente de símbolos y no entra en su resumen. No tiene checksum propio:
el checksum del snapshot ya cubre todas las lentes. `cc.json` sigue en 2.x
porque el campo es aditivo; un snapshot anterior se lee como si no tuviera
estructura.

### 2. Miembros: lo que declara una clase

Los **campos de clase** —incluidos `static`, `private` y `readonly`— y las
**propiedades del constructor** (`constructor(private readonly base: string)`)
se guardan con su clase, su nombre, su línea y sus líneas. La sección
**Miembros** los agrupa por clase.

No son símbolos: no tienen hash, no entran en el diff de símbolos y no abren
una cadena. La clase ya es el símbolo; el campo es parte de su cuerpo.

### 3. Superficie: lo que entra y lo que sale

La sección **Superficie** enseña:

- **Importa**: el módulo de origen y los nombres que trae, con `default`,
  `* as ns`, alias (`a as b`) y `type`.
- **Exporta**: el nombre exportado, el alias, `default`, `*`, `* as ns` y el
  origen cuando es una reexportación. Las declaraciones exportadas
  (`export function`, `export const`, `export interface`…) también se listan
  aquí, aunque ya estén en Símbolos: la superficie es la API del fichero.

Los imports dinámicos y los `require` se conservan con su tipo; la sección no
los esconde.

### 4. La ficha

En la pestaña **Fichero**, después de Símbolos:

- **Superficie**: cuenta de imports y exports; al plegarse, «N imports · M
  exports».
- **Miembros**: cuenta de miembros; al plegarse, las clases con su número, por
  ejemplo «Store 21 · PendingAnalyses 3».

Las dos son secciones plegables como Métricas y Símbolos, con su estado en el
almacenamiento local. Aparecen aunque el fichero no tenga símbolos: un barrel
ya no enseña solo métricas.

### 5. Lo que queda fuera, por ahora

- **Claves de objetos de configuración** (315 claves en 36 objetos del módulo):
  el objeto ya es un símbolo; enumerar sus claves llenaría la ficha de datos.
- **Espacios de nombres** (1 real en este repo): son declaraciones con cuerpo,
  pero no hay volumen que justifique una sección.
- **Código suelto de módulo** (llamadas y asignaciones de nivel superior, 51
  ficheros sobre todo tests y scripts): la superficie ya da contexto; modelar
  sentencias sería convertir la ficha en un árbol de sintaxis.
- **Diff y MCP**: la estructura no entra en el reporte ni en las consultas de
  agentes en esta fase. Se puede añadir después sin cambiar la identidad.

## Consecuencias

- Un fichero sin símbolos deja de ser una ficha vacía: enseña qué importa y qué
  exporta.
- El estado de una clase (sus campos) se lee sin abrir el código.
- El checksum cambia porque la lente es nueva; la regla de identidad no cambia.
- Los snapshots antiguos siguen cargando: `structure` es opcional y ausente.
- La lente crece con el fichero (imports, exports y miembros), pero no toca la
  cadena ni el diff de símbolos.
- Los campos no compiten con los símbolos por el nombre: se agrupan bajo su
  clase, así que dos `root` en el mismo fichero no se confunden.

## Alternativas descartadas

- **Meter campos y espacios de nombres en `CcSymbol`.** Un campo no es una
  declaración del módulo y rompería la cadena por colisiones de nombre; además
  obligaría a versionar la identidad de los símbolos.
- **Una sección de claves de objetos.** Es datos dentro de un símbolo, no
  estructura del fichero; 315 filas esconden lo que importa.
- **Enseñar solo las aristas de dependencias.** Ya existen, pero no dicen qué
  nombre entra o sale; un barrel seguiría sin explicar su API.
- **Un árbol de sintaxis en la ficha.** Es el editor, no el atlas.

## Hoja de ruta

### M44 — La ficha no esconde nada

- [x] Lente `structure` con `members`, `imports` y `exports` por fichero.
- [x] Campos de clase y propiedades del constructor agrupados por clase.
- [x] Imports con nombres, alias y tipo; exports con alias y reexportaciones.
- [x] Secciones **Superficie** y **Miembros** plegables en la ficha.
- [x] La ficha de un fichero sin símbolos ya no queda vacía.
- [x] Paridad nativa/WASM y determinismo del snapshot.
- [ ] Llevar la estructura al diff y al MCP, si hace falta.
- [ ] Espacios de nombres y código suelto, solo si aparecen en un repo real.
- [ ] Claves de objetos, como detalle de una variable, no como sección.

El registro de lo hecho vive en el [feed de la guía](/guia/).
