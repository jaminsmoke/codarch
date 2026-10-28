---
title: "ADR 0090 — Más lenguajes que TypeScript y JavaScript"
description: "Java, Python, Go y C# entran con el análisis entero —métricas, símbolos e imports en el grafo— sin cambiar `cc.json`: un fichero suyo es un nodo como los demás. El análisis elige el parser por extensión y la caché firma cada entrada con el que la produjo. La lente de migración sigue siendo JS/TS → Rust y no se contamina, y un repositorio solo de TS/JS da exactamente el mismo checksum que antes."
section: desarrollo
status: aceptado
date: "2026-10-28"
sidebar:
  label: Más lenguajes que TS y JS
  order: 90
---

**Estado:** aceptado · **Fecha:** 2026-10-28

## Contexto

La v1 se declaró TypeScript/JavaScript: el recorrido busca esas extensiones ([`extensions.ts`](../../../../../packages/parsers/src/extensions.ts)),
el análisis pide **un** parser y `languageForPath` descarta lo que no conoce como lenguaje de la lente de
migración ([ADR 0016](../0011-0020/0016-lente-migracion.md)). Un repositorio Java, Python, Go o C# se ve hoy
casi vacío: sus ficheros no existen para el mapa, no hay aristas y no hay complejidad. Rust es la excepción
parcial —se mide LOC/RLOC a mano, sin árbol—, y el resto no entra.

El coste de «soportar un lenguaje» tiene cuatro capas, y conviene no confundirlas:

| Capa | Qué hace hoy | Qué hace falta |
|---|---|---|
| Recorrido | solo extensiones de TS/JS | sumar las de cada lenguaje |
| Parseo | tree-sitter, gramática nativa y `.wasm` | una gramática y un analizador por lenguaje |
| Modelo | `CcMigrationLanguage` es de la migración | **nada**: el fichero es un nodo como los demás |
| Grafo | resolución de imports de TS/JS | una resolución por lenguaje |

La lente de migración ([ADR 0016](../0011-0020/0016-lente-migracion.md)) modela **una** migración: de JS/TS a
Rust, con estados `js`, `rust`, `bridge` y `native`. No es «el lenguaje de cada fichero» y no debe convertirse
en eso: un `status: "rust"` sobre un `.java` sería una mentira.

## Decisión

### 1. Cuatro lenguajes, con el análisis entero

Entran **Java, Python, Go y C#**. Para cada uno: métricas del fichero (`loc`, `rloc`, `functions`,
`maxComplexity`, `maxFunctionLength`), símbolos con su complejidad, miembros de clase donde el lenguaje los
tenga, e **imports resueltos** que se convierten en aristas del grafo. Es lo que hace útil el mapa: sin
aristas solo hay cajas con líneas.

Los lenguajes que quedan fuera de esta hornada —Kotlin, PHP, Ruby, C/C++, y Rust con árbol— no cambian de
estado: siguen como están y no se anuncian como soportados.

### 2. El snapshot no cambia

Un fichero de estos lenguajes es un **nodo como los demás**: métricas en la lente de métricas, símbolos en la
de símbolos, estructura donde la haya, aristas en la de dependencias. No hay un campo `language` nuevo en
`cc.json`, y no lo hay porque nadie lo necesita todavía: quien quiera saber el lenguaje lo deriva de la
extensión, como se hace hoy. Así el formato 2.x sigue siendo interoperable y un consumidor viejo ve ficheros
con métricas, que es lo que ya sabe leer.

La lente de **migración no se toca**: sigue teniendo solo `ts`, `js`, `rust`, `wasm` y `node`, y sus estados
siguen contando la migración a Rust. Un fichero Java no tiene nodo de migración, ni deuda, ni estado.

### 3. El parser se elige por extensión

El análisis deja de recibir **un** parser y recibe la lista de los que sabe usar; cada uno declara sus
extensiones y `parserForPath` decide. El recorrido recoge la unión de todas, y un fichero sin parser se
descarta como hoy.

La caché de parseo se firma **por entrada**: cada una guarda el nombre del parser que la produjo, y solo se
reutiliza si coincide con el que le tocaría a esa ruta. El fichero de caché sube a formato 2; una caché de
formato 1 se ignora entera —y se parsea—, que es la salida segura de siempre ([ADR 0089](../0081-0090/0089-cada-alcance-lee-los-de-abajo.md)).
Un cambio de gramática o de analizador se resuelve subiendo el nombre o la versión del parser, no la caché a
ciegas.

**Invariante que no se mueve:** un repositorio solo de TS/JS produce el **mismo `cc.json`, byte a byte**, con
y sin caché, antes y después de esta decisión. Añadir lenguajes no puede mover un número de lo que ya había.

### 4. Cada lenguaje resuelve sus imports a su manera

| Lenguaje | Se escribe | Se resuelve a |
|---|---|---|
| Java | `import a.b.C;` · `import static a.b.C.m;` | el fichero `a/b/C.java`, buscado por sufijo de ruta |
| Python | `import a.b` · `from a.b import x` · `from . import x` | `a/b.py` o `a/b/__init__.py`; con un nombre, primero `a/b/x.py`. Los relativos, desde el paquete del fichero |
| Go | `import "mod/x/y"` | el paquete: todos los `.go` de esa carpeta, con el prefijo del `go.mod` |
| C# | `using A.B;` | los ficheros que declaran `namespace A.B` |

- **Java** no lee el `pom.xml` ni el `build.gradle`: buscar el sufijo `a/b/C.java` resuelve igual las raíces de
  Maven y Gradle (`src/main/java`, `src/test/java`) y un proyecto plano. Los imports con comodín (`a.b.*`) no
  crean aristas; los `static` resuelven la clase, que es la parte que se puede nombrar.
- **Python** resuelve contra la raíz y por sufijo, así que también vale un `src/`. Un nombre de
  `from a import b` puede ser un submódulo (`a/b.py`) o un nombre del módulo (`a/__init__.py`): se prueban
  los dos en ese orden. La biblioteca estándar es builtin y `from a import *` no crea aristas.
- **Go** importa **paquetes**, no ficheros: la arista va a cada `.go` de la carpeta destino, ordenados por
  ruta. Sin `go.mod` legible se intenta el sufijo del import.
- **C#** indexa los `namespace` declarados por fichero (con bloque o de fichero entero) y enlaza el `using`
  con los que coinciden exactamente. Los alias y los `using static` no crean aristas.

Los imports que no se resuelven se cuentan y se listan como hoy, con su línea: un import roto es información,
no un fallo del análisis.

### 5. El determinismo es la prueba

- El orden de los ficheros ya es determinista; el de las aristas nuevas, también: se ordenan por ruta y se
  expanden los paquetes de Go en orden.
- Un repositorio con estos ficheros **cambia** de checksum respecto a antes, porque gana nodos. Es esperado y
  determinista: el mismo código da el mismo documento.
- La prueba que cierra la decisión es la del otro lado: un repositorio TS/JS da el mismo checksum que antes,
  fichero a fichero y byte a byte, con y sin caché.

### 6. Lo que no entra

Kotlin, PHP, Ruby, C/C++ y Rust con árbol quedan fuera. Tampoco entran los comodines, los alias de import, los
`using static`, los reexports ni la lectura de `pom.xml`, `build.gradle`, `go.mod` o `.csproj` para deducir
raíces o nombres de proyecto: el nombre del proyecto sigue saliendo del `package.json` y, si no hay, de la
carpeta. Todo eso puede llegar después sin reabrir esta decisión, porque el modelo no cambia.

## Consecuencias

- Un repositorio Java, Python, Go o C# deja de parecer vacío: peso, complejidad, ciclos, fan-in y fan-out
  funcionan igual que en TS/JS.
- Entran cuatro gramáticas nativas y sus cuatro `.wasm`. El paquete del parser crece y hay que actualizar
  `allowScripts` con las versiones exactas (regla 5 del `AGENTS.md`); el navegador gana cuatro assets, que se
  cargan solo al analizar.
- La caché de parseo gana un campo por entrada y un formato nuevo. Las viejas se tiran sin avisar, como
  siempre.
- `languageForPath` se queda para la lente de migración; el que decide si un fichero se analiza es
  `parserForPath`. Son dos preguntas distintas y dejan de confundirse.
- El tiempo de análisis sube en monorepos con varios lenguajes —hay más ficheros—, pero la caché por parser
  mantiene barato el guardado del live.
- La documentación de uso deja de decir «TypeScript/JavaScript» donde ya no es verdad: `model.md`, la guía y
  las páginas de `analyze` y de la app.

## Alternativas descartadas

- **Medirlos sin grafo** (LOC/RLOC y complejidad, como Rust): es rápido, pero sin aristas el mapa no enseña
  arquitectura. Se descartó por el usuario al elegir el alcance.
- **Parsear con expresiones regulares**: la complejidad y los símbolos necesitan un árbol; un regex sobre
  código real da números que nadie puede defender.
- **Meter estos lenguajes en la lente de migración**: sus estados cuentan una migración concreta a Rust;
  reutilizarlos como «el lenguaje del fichero» obligaría a cambiar su significado y a romper a quien ya la lee.
- **Un campo `language` en cada nodo ahora**: cambia `cc.json` sin un consumidor que lo pida; la extensión ya
  lo dice y se puede derivar en la UI. Si algún día hace falta, será otro ADR.
- **Una herramienta universal tipo ctags**: pierde la estructura y los imports de cada lenguaje, que es justo
  lo que se busca.
- **Leer `pom.xml` o `go.mod` para deducir raíces y nombre**: el sufijo de ruta resuelve sin ellos, y el
  nombre del proyecto no cambia el mapa.

## Hoja de ruta

### M61 — Más lenguajes que TS y JS

- [x] El análisis elige parser por extensión y la caché firma cada entrada con el suyo; un repositorio TS/JS
      da el mismo checksum byte a byte que antes.
- [x] Java completo: gramática nativa y `.wasm`, métricas, símbolos, miembros e imports resueltos por paquete,
      con sus tests.
- [x] Python completo: módulos y paquetes, relativos, `__init__.py`, con sus tests.
- [ ] Go completo: paquetes, `go.mod` y expansión a ficheros, con sus tests.
- [ ] C# completo: namespaces declarados por fichero y `using`, con sus tests.
- [ ] La documentación deja de prometer solo TS/JS: `model.md`, el `AGENTS.md` y las páginas de uso.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
