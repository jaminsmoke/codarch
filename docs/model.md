# Modelo de datos

**Estado:** M1 implementado. `packages/schema` valida `cc.json` 2.x, normaliza 1.x y comparte la
identidad canónica; `packages/parsers` produce snapshots 2.0 con métricas y grafo.

Si el modelo está bien, el resto es barato. Esta es la pieza que hay que discutir antes de escribir
código, porque cambiarla después contamina el CLI, el mapa, el bot y el MCP a la vez.

---

## Tres capas, una sola verdad

```
identidad        árbol de ficheros y carpetas, con ids estables
señales          lentes aditivas: métricas, dependencias, dominio, migración…
grafo            aristas tipadas entre ids, no dentro del árbol
```

La jerarquía de carpetas es **una proyección** del grafo, no al revés. Un módulo puede vivir en
`src/payments` y depender de `src/infra`, y esa relación no cabe en un árbol.

La forma es deliberadamente la de `cc.json` 2.x: `{ meta, files, lenses }`. Adoptarla nos da
interoperabilidad gratis y nos obliga a una separación que ya estábamos buscando.

## Snapshot

```ts
type Snapshot = {
  meta: {
    projectName: string
    apiVersion: "2.0"
    checksum: string          // md5 canónico de files + lenses
    commitHash?: string
  }
  files: FileNode[]           // raíz única (normalmente una carpeta)
  lenses: {
    metrics: MetricsLens
    dependency: DependencyLens
    [name: string]: unknown   // lentes futuras se preservan
  }
}
```

Un snapshot es **inmutable**. Analizar dos commits produce dos snapshots; el diff es una consulta
entre ambos, nunca un tercer formato.

### Identidad

```ts
type FileNode = {
  id: string        // sha256("File/src/App.ts")[:16]
  name: string
  type: 'File' | 'Folder'
  contentHash?: string
  children?: FileNode[]
}
```

Reglas:

- El id depende **solo** del tipo y la ruta canónica. Renombrar cambia la identidad; mover, también.
- Rutas normalizadas con `/`, sin rutas absolutas ni `..`, excluyendo la raíz del proyecto.
- El id de carpeta usa la misma regla con prefijo `Folder/`.
- Nada de mtime, usuario ni hora en el payload.
- `packages/schema/src/identity.ts` es la única implementación de esta regla.

### Compatibilidad con `cc.json` 1.x

El importador acepta el formato antiguo y lo convierte a este modelo antes de validarlo:

- Nodos y `attributes` → `files` + `lenses.metrics.attributes`, con ids generados por la misma
  regla (`sha256(type + ruta canónica)[:16]`, raíz excluida).
- `edges[].fromNodeName` / `toNodeName` → ids de nodo; se aceptan rutas con o sin raíz y con o sin
  `/` inicial.
- `attributeTypes` y `attributeDescriptors` se reparten entre métricas y dependencias.
- `blacklist`, `markedPackages` y `fixedPosition` son estado de vista: se descartan.
- Varias raíces 1.x se envuelven en una raíz sintética para cumplir el contrato 2.x.

El checksum 1.x no se reutiliza: cubre otro payload y daría una garantía falsa.

## Lentes

Cada lente es un mapa `id → datos`. Desconocida = se preserva tal cual al reexportar.

| Lente | Contenido | v1 |
|---|---|---|
| `metrics` | atributos numéricos por nodo + descriptores | sí |
| `dependency` | aristas, niveles, ciclos, capas | sí |
| `risk` | score compuesto, violaciones | derivada en render, no se almacena |
| `migration` | LOC por lenguaje, estado, frontera FFI | después |
| `domain` | palabras, frecuencia, tf-idf | después |
| `evolution` | series temporales, acoplamiento temporal | después |

### Métricas

```ts
type AttributeDescriptor = {
  title?: string
  description?: string
  direction?: -1 | 1        // -1: menor es mejor; 1: mayor es mejor; 0/ausente: neutral
  hintLowValue?: string
  hintHighValue?: string
}
```

`direction` no es decoración: permite que el mismo motor pinte "rojo = malo" sin que la UI tenga que
saber qué es la complejidad ciclomática.

Métricas actuales del analizador:

| Grupo | Métricas |
|---|---|
| Parser | `loc`, `rloc`, `functions`, `maxComplexity`, `maxFunctionLength` |
| Imports | `imports`, `externalImports`, `builtinImports`, `typeOnlyImports`, `unresolvedImports` |
| Grafo | `fanIn`, `fanOut`, `inCycle`, `cycleSize`, `dependencyLevel` |
| Historial | `number_of_commits`, `number_of_authors` |

Todas se emiten como `absolute`. Las métricas se agregan por fichero; los símbolos quedan para una
lente posterior. Las dos métricas de historial solo aparecen si `git` está disponible y el análisis
no se ejecuta con `--no-git`.

### Aristas

```ts
type Edge = {
  fromId: string
  toId: string
  attributes?: {
    weight: number       // imports entre los dos ficheros
    typeOnly: number     // cuántos son solo tipos
  }
  isCyclic?: boolean
}
```

El snapshot actual no guarda `kind` por arista: agrega peso y type-only. El parser sí distingue
`static`, `export`, `dynamic`, `require` y `import x = require()`; esa información se usa para
clasificar y podría añadirse como atributo si el diff la necesita.

`isCyclic` se **deriva** del grafo y se cachea en el snapshot como optimización; siempre se puede
recalcular. Un componente cíclico es un SCC de tamaño > 1 o un self-loop.

### La lente de migración

Es nuestra lente propia, y nace de un caso real: este proyecto migrará de TypeScript a Rust.

```ts
type MigrationNode = {
  languages: Record<string, number>   // { ts: 820, rust: 120 }
  status: 'js' | 'rust' | 'bridge' | 'native'
  boundary?: number                   // cruces FFI por fichero
}
```

Permite responder preguntas que ninguna herramienta actual responde bien:

- ¿Cuánto queda por migrar, ponderado por complejidad y no por líneas?
- ¿Dónde está la frontera napi/WASM y cuántos cruces hay?
- ¿La migración está reduciendo el acoplamiento o solo moviéndolo?
- ¿Qué módulos migrados siguen siendo llamados desde JS y a qué coste?

Si la herramienta no sirve para gestionar su propia migración, no sirve.

## Reglas y violaciones

Las reglas viven en `.codarch.yml` y se evalúan al hacer diff, no al analizar. El snapshot dice
**cómo es**; las reglas dicen **cómo debería ser**. Mezclarlos impediría comparar el mismo commit
contra dos políticas distintas.

```yaml
version: 1
layers:
  - name: domain
    paths: [src/domain/**]
  - name: infra
    paths: [src/infra/**]
rules:
  - name: domain-no-infra
    type: forbidden
    from: domain
    to: infra
    severity: error
  - name: complejidad
    type: threshold
    metric: maxComplexity
    max: 40
    severity: warn
  - name: sin-ciclos
    type: cycles
    severity: error
```

El reporte de diff añade:

```ts
type RuleReport = {
  configured: boolean
  summary: {
    layers, rules,
    introduced, existing, resolved,
    introducedErrors, introducedWarnings
  }
  violations: {
    introduced: RuleViolation[]
    existing: RuleViolation[]
    resolved: RuleViolation[]
  }
}

type RuleViolation = {
  key: string              // estable entre base y head
  rule: string
  type: 'forbidden' | 'threshold' | 'cycles'
  severity: 'info' | 'warn' | 'error'
  message: string
  files: string[]          // solo para mostrar
  edge?: { fromId, toId, from, to }
  metric?: { name, value, min?, max? }
  cycle?: { size, nodes }
}
```

Solo las violaciones introducidas con severidad `error` bloquean con `--fail-on violations`. La
deuda existente se publica, pero no impide mergear. Ver [`rules.md`](rules.md) y
[ADR 0011](adr/0011-reglas-de-arquitectura.md).

## Delta

`packages/metrics` implementa `diffSnapshots(base, head, { rules })`. No guarda el delta: lo calcula
entre dos snapshots inmutables. `rules` es opcional; si falta, `rules.configured` es `false`.

```ts
type DiffReport = {
  schemaVersion: '1.0'
  base: { projectName, checksum, files, folders, edges }
  head: { projectName, checksum, files, folders, edges }
  summary: {
    addedFiles, removedFiles, changedFiles,
    addedEdges, removedEdges,
    cyclicEdgesAdded, cyclicEdgesRemoved,
    introducedCycles, fixedCycles, hotspots
  }
  rules: RuleReport
  files: {
    added: DiffFile[]      // id, path, metrics
    removed: DiffFile[]
    changed: Array<{ id, path, changes: MetricChange[] }>
  }
  edges: {
    added: EdgeChange[]
    removed: EdgeChange[]
    cyclicAdded: EdgeChange[]
    cyclicRemoved: EdgeChange[]
  }
  cycles: {
    introduced: CycleComponent[]   // SCCs de tamaño > 1 o self-loops
    fixed: CycleComponent[]
  }
  hotspots: Hotspot[]
  hotspotMetric: string | null
}
```

Reglas:

- Identidad por `id`; las rutas son solo para mostrar. Un rename es alta + baja.
- `MetricChange.delta` es `null` si la métrica solo existe en un lado.
- Aristas por `(fromId, toId)`, con peso y type-only agregados.
- Ciclos por SCC, comparando el conjunto de ids del componente. Un cambio de tamaño cuenta como un
  ciclo resuelto y otro introducido.
- Hotspots por `maxComplexity` (o `rloc` si falta), solo con delta positivo; un fichero nuevo parte
  de 0. Sin fórmula compuesta opaca.
- Las violaciones se comparan por clave estable entre base y head; solo las introducidas con
  severidad `error` bloquean con `--fail-on violations`.
- `report.json` es determinista y no tiene timestamps. Ver
  [ADR 0010](adr/0010-diff-entre-snapshots.md) y [ADR 0011](adr/0011-reglas-de-arquitectura.md).

## Pipeline de M1/M2/M3

```
walkSourceFiles(root)
  → .gitignore raíz + anidados, extensiones TS/JS, orden estable
ImportResolver(root, files)
  → relativos, .js→.ts, index, tsconfig paths, workspaces, builtins
TypeScriptParser.parse(source, path)
  → loc/rloc/functions/complejidad + imports tipados
collectGitChurn(root, files)
  → number_of_commits, number_of_authors (un solo git log)
buildGraph(files, links)
  → dedupe, fan-in/out, SCC, ciclos, niveles
buildSnapshot({ projectName, files, graph })
  → árbol, lentes metrics/dependency, checksum
diffSnapshots(base, head, { rules })
  → ficheros/aristas/ciclos/hotspots + violaciones introducidas/existentes/resueltas
loadArchitectureStore(snapshot, report)
  → índice de solo lectura, riesgo compartido, SCC, agregados de carpeta
MCP tools
  → mapa, hotspots, impacto, violaciones y explicación; sin reanalizar
```

Cada fase es pura o casi pura y tiene tests propios. El analizador no guarda árboles de tree-sitter:
procesa un fichero, extrae agregados y sigue.

## Determinismo

Para que el checksum signifique algo:

1. Serialización canónica: claves ordenadas, sin espacios, UTF-8.
2. Nodos ordenados por ruta; aristas por `(from, to)`; SCCs y ciclos ordenados.
3. Sin timestamps, rutas absolutas, nombres de usuario ni locale.
4. Números con representación estable (nada de `1.0` vs `1`).
5. Orden de recorrido del filesystem irrelevante por construcción.
6. Churn derivado del historial del commit, no de la hora de ejecución; sin fechas ni autores en el
   payload.

El checksum actual es MD5 de `{ files, lenses }` serializado canónicamente. MD5 es suficiente para
detectar cambios de payload; si más adelante se usa como identificador de caché entre máquinas,
se puede migrar a SHA-256 sin cambiar el contrato.

Test de conformidad: analizar el mismo commit dos veces produce el mismo snapshot y el mismo
checksum. Está en `packages/parsers/test/analyze.test.ts`.

## Preguntas abiertas

1. **¿Símbolos o solo ficheros?** La v1 agrega complejidad por fichero (`maxComplexity`,
   `functions`) sin modelar clases y funciones como nodos. Modelarlas da hotspots más precisos,
   pero multiplica el tamaño del grafo y el coste de los parsers.
2. **¿Aristas a nivel de símbolo?** Igual que arriba: `leafEdges` de cc.json 2.x existe, pero es
   otro orden de magnitud.
3. **¿Dónde vive la caché?** Un `.codarch/cache` con hashes de contenido permite análisis
   incremental. ¿Ficheros JSON o SQLite?
4. **¿El reporte es el snapshot?** Propongo que no: snapshot = datos; reporte = hallazgos derivados,
   con su propia versión.
5. **¿Churn dentro del snapshot o derivado?** Decidido en M2: dentro del snapshot como
   `number_of_commits` y `number_of_authors`, para que el diff sea autocontenido. Un shallow clone
   produce un warning; no hay ventana temporal relativa.
