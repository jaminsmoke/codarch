---
title: "ADR 0093 — El mapa de lo que no es código"
description: "Los documentos, la configuración y los assets no existen en el modelo: el recorrido solo acepta código, así que el mapa cuenta la mitad del proyecto. Ganan un segundo snapshot, `.codarch/rest.cc.json`, con su propio checksum y su propia lente de tipo; el mapa de código no cambia de contenido ni de checksum, el PR y las reglas no lo miran y el escenario gana una pestaña."
section: desarrollo
status: aceptado
date: "2026-10-29"
sidebar:
  label: El mapa de lo que no es código
  order: 93
---

**Estado:** aceptado · **Fecha:** 2026-10-29

## Contexto

El mapa cuenta el código y solo el código. El recorrido acepta doce extensiones
(`DEFAULT_EXTENSIONS`: TypeScript, JavaScript, Java, Python, Go y C#) y un fichero que no las tiene no
llega al árbol, ni a las métricas, ni al checksum. No es un filtro de la interfaz: es el alcance,
decidido al recorrer ([ADR 0038](../0031-0040/0038-el-alcance-del-analisis.md)).

La consecuencia es que el mapa **miente por omisión** en la pregunta más básica: ¿qué es este
proyecto? En este repositorio hay 487 ficheros de código frente a 443 documentos `.md` y 29
configuraciones: la mitad del proyecto no aparece en ningún sitio. Un repositorio que es mitad
documentación y mitad código se lee como si solo fuera código.

Meterlos en el mapa de código no vale. Sin parser no tienen complejidad, fan-in ni riesgo, que es lo
que el área, el color y la ficha saben leer; el área total y el riesgo del proyecto cambiarían de
significado; las reglas de capas los evaluarían; el diff de un PR los contaría como ficheros del
cambio; y el checksum, que hoy significa «este código», pasaría a significar otra cosa. Además los
documentos tienen reglas propias —enlaces, huérfanos, gemelas— que no se parecen en nada a capas y
ciclos de ejecución.

## Decisión

### 1. Un segundo snapshot, no una lente del primero

`.codarch/rest.cc.json`, escrito por la misma pasada de `analyze` que
`.codarch/snapshot.cc.json` ([ADR 0048](../0041-0050/0048-el-escritorio-persiste-en-codarch.md)).
Los dos son cc.json 2.x y cada uno tiene su checksum. El snapshot del código no cambia ni de
contenido ni de checksum: los documentos no están dentro.

El corte es del **artefacto**, no del pintado. Una lente dentro del mismo snapshot habría metido
`.md` en el árbol del código y, con ellos, en el diff, en las reglas y en el checksum; pintar después
solo lo que apetece no deshace eso.

### 2. Todo lo que no es código, con su tipo

Entra todo lo que el recorrido encuentra y no es una extensión de código: documentos, configuración,
imágenes, lockfiles, licencias. **Nada se cae en silencio**: lo que no casa con ninguna regla entra
como `other`. Es la regla que impide que el mapa vuelva a mentir por omisión, y la que hace que un
formato nuevo aparezca en el mapa el día que aparece en el repo.

| `kind` | Qué | Ejemplos |
|---|---|---|
| `doc` | prosa y texto | `*.md`, `*.mdx`, `*.txt`, `LICENSE`, `NOTICE` |
| `config` | manifiestos, build y CI | `package.json`, `tsconfig.json`, `.codarch.yml`, workflows |
| `asset` | binarios y lo que se sirve | imágenes, fuentes, lockfiles, `*.wasm` |
| `other` | lo que no casa con lo de arriba | un script suelto, una extensión nueva |

El `ignore` del `.codarch.yml` es el mismo para los dos snapshots: el alcance es uno
([ADR 0038](../0031-0040/0038-el-alcance-del-analisis.md)). Excluir `fixtures/**` excluye sus
documentos y sus configuraciones.

Los tests **no** se mueven en esta fase: son código y siguen en el mapa de código. Si algún día
salen, es un `kind` o un filtro del mapa de código, no un tercer formato.

### 3. El formato es cc.json 2.x con una lente propia

- **Árbol**: el mismo de siempre, ficheros y carpetas con su `id`.
- **`lenses.metrics.attributes[id]`**: `bytes` (siempre) y `loc` (solo si es texto). Los atributos de
  cc.json son números, así que el tipo no cabe aquí; el área del mapa es `bytes`.
- **`lenses.rest.nodes[id]`**: `{ kind, loc? }`, la lente propia, con el mismo trato que la de
  migración ([ADR 0016](../0011-0020/0016-lente-migracion.md)): lo que no es una métrica numérica
  vive en una lente nuestra, no en un campo inventado dentro del nodo.
- **`lenses.dependency.edges`**: los enlaces de un documento a otro (`[texto](ruta.md)`), que dan
  fan-in, fan-out, huérfanos y ciclos entre documentos.
- **`meta.checksum`**: MD5 de `{ files, lenses }` serializado canónicamente, la misma regla que el
  del código. Determinista por construcción: bytes y líneas salen del contenido, sin fechas ni orden
  de filesystem.

### 4. El recorrido es uno y el trabajo se reparte

`analyze` recorre una vez y decide por fichero: el código va a los parsers, al grafo y a los ciclos;
el resto va a una pasada léxica —tamaño, y líneas si es texto— más los enlaces cuando es `.md`.
Nada de tree-sitter para el resto y ninguna lectura binaria completa: de un asset se guarda su
tamaño, no su contenido.

El coste añadido es **leer** los ficheros que el mapa ignoraba, no analizarlos. En este repositorio
es casi el doble de recorrido y sigue siendo una fracción de lo que cuesta parsear el código.

### 5. El código no paga por esto

- El diff, las reglas, la acción y el MCP siguen leyendo **solo** el snapshot del código: ni un
  documento en un comentario de PR ni en una violación.
- `codarch analyze` y `codarch serve` escriben los dos artefactos; la acción de GitHub no lo usa.
- Los dos salen de la misma pasada. Si el resto falta o es de otro proyecto, la app no enseña la
  pestaña: no hay emparejamiento por checksum ni campo nuevo en `meta`.

### 6. La vista

Pestañas del escenario: **`Mapa` y `El resto`**. Hoy las pestañas solo existen cuando un plugin trae
vista propia ([ADR 0028](../0021-0030/0028-los-plugins.md)); con el resto pasan a existir cuando el
segundo snapshot está cargado.

El raíl izquierdo no se mueve: sigue siendo el dock de bloques del mapa activo
([ADR 0083](../0081-0090/0083-el-dock-de-herramientas.md)), y para el resto enseña **Vista** —área
por bytes o por líneas y color por tipo—, **Estratos** y **Leyenda**, agrupados por `kind`.

La ficha de un fichero que no es código enseña su tipo, su tamaño, sus líneas y sus enlaces; la de
una carpeta suma bytes y líneas y cuenta por tipo. No enseña símbolos, complejidad ni riesgo: no
existen.

### 7. Las reglas del resto llegan después, y son suyas

Enlaces rotos, documento huérfano, frontmatter que no cuadra y la gemela de idioma. La gemela
`docs/en/` es de este repositorio, no del producto: se **declara** en `.codarch.yml` cuando esa fase
llegue, no se adivina por el nombre de una carpeta, igual que el alcance
([ADR 0038](../0031-0040/0038-el-alcance-del-analisis.md)).

## Consecuencias

- El estado del repo pasa a tener dos artefactos y dos checksums. Ninguno cambia de significado y el
  del código **no** cambia: es la propiedad que hace que este corte sea seguro.
- El recorrido lee más ficheros y el análisis de una carpeta en el navegador también
  ([ADR 0020](../0011-0020/0020-analisis-en-el-navegador.md)): el navegador necesita los documentos
  para dibujarlos, y eso es más descarga.
- El mapa del resto nace sin riesgo, sin deuda y sin complejidad. Su color es el tipo y su orden, el
  tamaño: no hay una segunda verdad que inventar.
- El escritorio y la web ganan un segundo archivo que cargar, y el `serve` una ruta más que servir.
- Los bloques del raíl dejan de ser «del mapa» y pasan a ser «del mapa activo»; la leyenda necesita
  su versión por tipo.
- El tamaño de un asset sale del puerto de ficheros: quien no sepa `stat` —el navegador— lo mide a 0
  hasta que decida cómo dar tamaños al cargar el resto. Los ficheros de texto no tienen ese problema:
  sus bytes salen del contenido.
- Dos artefactos pueden desincronizarse en disco: el que se escribe antes de un fallo. La app pide
  los dos de la misma pasada y no mezcla.

## Alternativas descartadas

- **Una lente `docs` dentro del snapshot del código.** Es la opción barata y rompe lo que hace útil al
  checksum: los documentos entrarían en el árbol, en el diff del PR, en las reglas y en el riesgo.
- **Un mapa por tipo desde el principio** —documentos, configuración y assets por separado—. Tres
  mapas y tres formatos antes de tener uno que se lea.
- **Todo en un solo mapa.** El área y el riesgo dejarían de significar lo mismo para los dos
  públicos, y el proyecto pequeño de código se vería como un proyecto de documentación.
- **Solo contar lo que falta, sin mapa.** Responde «cuánto queda fuera», no «cómo es lo que queda
  fuera», que es la pregunta que abre esto.
- **Un `kind: doc` en el árbol del código, filtrado al pintar.** El formato, el diff y las reglas lo
  ven igual; el problema no era de pintado.

## Hoja de ruta

Fase **M64 — El mapa de lo que no es código**.

- ✅ El recorrido se reparte en una pasada: el código al parser, el resto a la pasada léxica.
- ✅ El snapshot del resto: árbol, `bytes`, `loc`, la lente `rest` con su `kind`, los enlaces entre
  documentos, checksum propio y un test de determinismo.
- ⬜ `codarch analyze` y `serve` escriben `.codarch/rest.cc.json`; el diff, las reglas y la acción no
  lo miran.
- ⬜ La web y el escritorio cargan el resto; el escenario gana `Mapa` y `El resto`.
- ⬜ Vista, Estratos y Leyenda por tipo en el raíl del resto.
- ⬜ La ficha de un fichero que no es código y la de carpeta con el resto dentro.
- ⬜ Las reglas del resto, en su ADR: enlaces rotos, huérfanos, frontmatter y la gemela declarada.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
