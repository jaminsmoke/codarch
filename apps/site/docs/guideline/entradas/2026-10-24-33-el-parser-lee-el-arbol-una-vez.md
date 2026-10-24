---
title: El parser lee el árbol una vez
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que analizar un fichero deje de recorrer su árbol de sintaxis cuatro y cinco veces. Antes
lo recorrían `measureSource` (métricas), `collectImports` (importaciones) y `collectSymbols`
(símbolos), y encima cada función se medía aparte (complejidad) y cada símbolo se recorría otra vez
para calcular el hash de su cuerpo.

**Por qué**: en el binding nativo de tree-sitter cada acceso a `children` **vuelve a materializar**
los hijos de ese nodo en JS. El perfil de un análisis lo dejaba claro: `get children`,
`unmarshalNodes` y `unmarshalNode` se llevaban cerca de la mitad del tiempo, y cada pasada pagaba otra
vez lo mismo por el mismo árbol.

**Qué cambió**:

- `ts/tree.ts` (`analyzeTree`): un solo recorrido devuelve métricas, importaciones y símbolos. La
  complejidad de cada función se mide al pasar por ella y se guarda por posición, para que el símbolo
  la reutilice sin volver a medirla.
- `ts/parser.ts` y `ts/wasm-parser.ts` usan `analyzeTree`. Las dos rutas —nativa (CLI, servidor,
  proceso principal del escritorio) y WASM (navegador)— dan lo mismo, así que el checksum no cambia.
- Los hijos se piden **una vez por nodo** (`const children = node.children`) en el recorrido y en el
  hash del cuerpo. Antes se pedían dos y tres veces en el mismo nodo, con su materialización cada vez.

**Medido** (este repositorio, 89 ficheros de `packages` y `apps`, mediana de cuatro pasadas con
calentamiento): 1 975 ms con las tres pasadas, **636 ms** con una sola; **68 % menos**. En el análisis
completo de este repositorio (274 ficheros), el CLI baja de **5 330 ms a 2 590 ms** (51 % menos). De
paso, la primera pasada ya ganó un 25 % antes de tocar el hash del cuerpo: la ganancia estaba, sobre
todo, en no repetir el mismo recorrido.

**Cómo se comprobó que no cambia nada**: `test/tree.test.ts` compara `analyzeTree` con las tres
funciones por separado, fichero a fichero, sobre ocho casos con trampa (comentarios, importaciones de
todos los tipos, sobrecargas, anidamiento, TSX) y sobre los ~200 ficheros del propio repositorio, y
comprueba también que dos pasadas dan lo mismo. Además se analizó `packages/schema` con el parser
viejo y con el nuevo: mismo checksum (`5d07a868…`) y mismas cifras. Las dos funciones viejas se
quedan: hay quien solo quiere métricas o solo importaciones.

**Queda abierto**:

- Analizar una **subcarpeta** no hereda los `.gitignore` de arriba: `codarch analyze apps/cli`
  se traga `apps/cli/dist/` (la web empaquetada) y tarda **20 s** en 38 ficheros, mientras el
  repositorio entero tarda 2,6 s. El analizador aplica los `.gitignore` que hay dentro de la raíz que
  se le da, y ese `dist/` lo ignora el `.gitignore` de la raíz del repo.
- El hash del cuerpo y la complejidad siguen recorriendo el subárbol de cada función por su cuenta.
  Lo siguiente sería hacerlos en el mismo recorrido (una pila de contextos de hash) o pasar a
  `TreeCursor`, que no materializa los hijos en JS.

**Veredicto**: arreglo de rendimiento; no necesita ADR. Lo ganan las dos apps: el parser vive en
`@codarch/parsers` y lo usan el CLI, el proceso auxiliar del escritorio y el Worker de la web.
