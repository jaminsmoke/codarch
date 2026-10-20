# Modelo de datos — propuesta para debate

**Estado:** borrador · no implementado

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
    schemaVersion: string
    project: string
    commit: string          // sha corto
    checksum: string        // hash canónico de files + lenses
  }
  files: FileNode           // raíz única, con children
  lenses: Record<string, Lens>
}
```

Un snapshot es **inmutable**. Analizar dos commits produce dos snapshots; el diff es una consulta
entre ambos, nunca un tercer formato.

### Identidad

```ts
type FileNode = {
  id: string        // sha256("File/src/App.ts")[:16]  — igual que cc.json
  name: string
  type: 'File' | 'Folder'
  contentHash?: string
  children?: FileNode[]
}
```

Reglas:

- El id depende **solo** de la ruta y el tipo. Renombrar cambia la identidad; mover, también.
- Rutas normalizadas con `/`, sin rutas absolutas ni `..`.
- Nada de mtime, usuario ni hora en el payload.

## Lentes

Cada lente es un mapa `id → datos`. Desconocida = se preserva tal cual al reexportar.

| Lente | Contenido | v1 |
|---|---|---|
| `metrics` | atributos numéricos por nodo + descriptores | sí |
| `dependency` | aristas, niveles, ciclos, capas | sí |
| `migration` | LOC por lenguaje, estado, frontera FFI | sí (perro come perro) |
| `domain` | palabras, frecuencia, tf-idf | después |
| `risk` | score compuesto, violaciones | sí |
| `evolution` | churn, autores, acoplamiento temporal | después |

### Métricas

```ts
type MetricDescriptor = {
  unit?: 'lines' | 'ratio' | 'count' | 'ms'
  direction: 'lower-is-better' | 'higher-is-better' | 'neutral'
  aggregation: 'sum' | 'max' | 'mean' | 'none'
  description?: string
}
```

`direction` no es decoración: es lo que permite que el mismo motor pinte "rojo = malo" sin que la UI
tenga que saber qué es la complejidad ciclomática.

Métricas v1: `loc`, `sloc`, `functions`, `maxComplexity`, `imports`, `fanIn`, `fanOut`, `churn`.

### Aristas

```ts
type Edge = {
  from: string
  to: string
  kind: 'import' | 'type-import' | 'dynamic-import' | 're-export' | 'ffi'
  weight: number
  cyclic?: boolean
  upwards?: boolean
}
```

`cyclic` y `upwards` se **derivan** del grafo, no se almacenan como verdad. Se cachean en el
snapshot solo como optimización, y siempre se pueden recalcular.

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

```ts
type Rule =
  | { kind: 'layers'; order: string[][]; forbidUpward?: boolean }
  | { kind: 'forbidden'; from: string; to: string }
  | { kind: 'no-cycles' }
  | { kind: 'threshold'; metric: string; max: number }

type Violation = {
  rule: string
  severity: 'info' | 'warn' | 'error'
  nodes: string[]
  edges?: Edge[]
  message: string        // legible por humanos
  hint?: string          // accionable
}
```

Las reglas viven en la configuración del proyecto, no en el snapshot. El snapshot dice **cómo es**;
las reglas dicen **cómo debería ser**. Mezclarlos impediría comparar el mismo commit contra dos
políticas distintas.

## Delta

```ts
delta(base: Snapshot, head: Snapshot): {
  nodes: { added, removed, changed }
  edges: { added, removed }
  violations: { introduced, fixed }
  hotspots: RankedChange[]
}
```

Se calcula, no se almacena. Con ids estables y checksums, es una operación de conjuntos.

## Determinismo

Para que el checksum signifique algo:

1. Serialización canónica: claves ordenadas, sin espacios, UTF-8.
2. Nodos ordenados por ruta; aristas por `(from, to, kind)`.
3. Sin timestamps, rutas absolutas, nombres de usuario ni locale.
4. Números con representación estable (nada de `1.0` vs `1`).
5. Orden de recorrido del filesystem irrelevante por construcción.

Test de conformidad: analizar el mismo commit dos veces en dos máquinas produce el mismo checksum.

## Preguntas abiertas

1. **¿Símbolos o solo ficheros?** La v1 puede agregar complejidad por fichero (`maxComplexity`,
   `functions`) sin modelar clases y funciones como nodos. Modelarlas da hotspots mucho más
   precisos, pero multiplica el tamaño del grafo y el coste de los parsers.
2. **¿Aristas a nivel de símbolo?** Igual que arriba: `leafEdges` de cc.json 2.x existe, pero es
   otro orden de magnitud.
3. **¿Dónde vive la caché?** Un `.codarch/cache` con hashes de contenido permite análisis incremental.
   ¿Ficheros JSON o SQLite?
4. **¿El reporte es el snapshot?** Propongo que no: snapshot = datos; reporte = hallazgos derivados,
   con su propia versión.
