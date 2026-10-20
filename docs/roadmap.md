# Roadmap

Cada milestone deja el producto funcionando y verificable. Nada de big-bang.

---

## M0 — Modelo y mapa, sin parsers

**Objetivo:** validar el modelo de datos y el render 2D sin escribir un solo parser.

Entrada: un `cc.json` real de CodeCharta (el de su propia `visualization/`).

```
$ codarch render codecharta.cc.json -o map.html
```

Criterios de aceptación:

- [ ] Importa `cc.json` 1.x y 2.x, validando contra su JSON Schema.
- [ ] Treemap 2D: área = `rloc`, color = métrica elegible, altura/borde = jerarquía.
- [ ] Hover con métricas, búsqueda, clic para enfocar una carpeta.
- [ ] HTML único, sin servidor, sin red, < 500 KB.
- [ ] 5k nodos renderizados en < 500 ms.
- [ ] Salida determinista: mismo input, mismo HTML (salvo hash de build).
- [ ] Comparación visual lado a lado con el mapa de CodeCharta del mismo commit.

**Por qué primero:** elimina el riesgo del modelo y del render antes de invertir en parsers. Y nos
obliga a mirar los datos del rival con nuestros propios ojos.

## M1 — Parser propio de TypeScript

- [ ] Recorrido del repo, normalización de rutas, `.gitignore`.
- [ ] tree-sitter: `loc`, `sloc`, `functions`, `maxComplexity`, `maxFunctionLength`.
- [ ] Resolución de imports: relativos, `tsconfig` paths, workspaces, `index.ts`, type-only, dinámicos.
- [ ] Grafo: `fanIn`, `fanOut`, ciclos, niveles.
- [ ] `codarch analyze . -o .codarch/` produce snapshot + mapa.
- [ ] Test de determinismo en CI (dos ejecuciones, mismo checksum).
- [ ] Benchmark sobre CodeCharta `visualization/`: < 3 s, < 500 MB.

## M2 — Diff y PR

- [ ] `codarch diff base.cc.json head.cc.json` → ciclos nuevos, capas violadas, hotspots movidos.
- [ ] `report.json` estable y versionado.
- [ ] GitHub Action: comentario en el PR + artefacto con el mapa.
- [ ] Reglas en `.codarch.yml`: capas, prohibiciones, umbrales.
- [ ] Doble política sobre el mismo commit (aviso vs bloqueo).

## M3 — MCP

- [ ] `get_architecture_map`, `find_hotspots`, `check_change_impact`, `list_violations`, `explain_module`.
- [ ] Las herramientas devuelven datos del snapshot, nunca texto inventado.
- [ ] El agente puede pedir el mapa de un PR concreto.

## M4 — Lente de migración

- [ ] LOC por lenguaje y estado por fichero.
- [ ] Aristas `ffi` (napi/WASM) y conteo de cruces.
- [ ] "Deuda de migración" ponderada por complejidad, no por líneas.
- [ ] Validación: usarla para planificar la migración de este propio repo a Rust.

## Después

Lente de dominio · evolución temporal · símbolos · 3D · plugins.
