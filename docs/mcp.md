# MCP: arquitectura para agentes

CodArch expone su modelo a agentes mediante un servidor **MCP local, de solo lectura y por stdio**.
No analiza código dentro de MCP: lee un snapshot `cc.json` ya generado y, si existe, el
`report.json` del diff. Así el agente ve los mismos hechos que el CLI, el mapa y el comentario del PR.

La decisión está en [ADR 0013](adr/0013-mcp-readonly.md).

## Requisitos

1. Un snapshot:

   ```bash
   npm run analyze -- .
   # .codarch/snapshot.cc.json
   ```

2. Opcionalmente, un reporte de diff:

   ```bash
   npm run diff -- base.cc.json head.cc.json -o .codarch/report.json
   ```

   En la GitHub Action, los artefactos quedan en
   `.codarch/action-artifacts/head/snapshot.cc.json` y `.codarch/action-artifacts/report.json`.

Sin reporte, el mapa y las métricas funcionan; las consultas de cambios y violaciones responden
`available: false` con un motivo, en vez de inventar datos.

## Arranque

El lanzador resuelve `tsx` desde el propio repositorio, así que puede invocarse desde cualquier
directorio:

```bash
node apps/mcp/bin/codarch-mcp.mjs \
  --root . \
  --snapshot .codarch/snapshot.cc.json \
  --report .codarch/report.json
```

Es un servidor stdio: no imprime un prompt ni termina. `stdout` queda reservado para JSON-RPC; los
mensajes de estado van a `stderr`. Para ver la ayuda:

```bash
npm run mcp -- --help
```

No uses `npm run mcp` como comando del cliente MCP: npm puede escribir avisos en `stdout` y romper el
protocolo. Usa el lanzador con `node` o el comando directo equivalente.

### Configuración del cliente

Ejemplo genérico (Claude Desktop, Cursor u otro cliente MCP con configuración JSON). Sustituye
`C:/ruta/repo` por la ruta absoluta de tu checkout:

```json
{
  "mcpServers": {
    "codarch": {
      "command": "node",
      "args": [
        "C:/ruta/repo/apps/mcp/bin/codarch-mcp.mjs",
        "--root", "C:/ruta/repo",
        "--snapshot", ".codarch/snapshot.cc.json",
        "--report", ".codarch/report.json"
      ]
    }
  }
}
```

Las rutas de `--snapshot` y `--report` son relativas a `--root`. Si el cliente permite `cwd`, puedes
usar rutas relativas y omitir `--root`, pero el lanzador no depende de ello.

Para no cargar reporte:

```json
"args": ["C:/ruta/repo/apps/mcp/bin/codarch-mcp.mjs", "--root", "C:/ruta/repo", "--no-report"]
```

### Opciones

| Opción | Por defecto | Uso |
|---|---|---|
| `--root <dir>` | cwd | Raíz del proyecto y base de las rutas relativas |
| `-s`, `--snapshot <file>` | `.codarch/snapshot.cc.json` | Snapshot `cc.json` 2.x (o 1.x normalizable) |
| `-r`, `--report <file>` | `.codarch/report.json` | Reporte del diff; si no existe, se sigue sin él |
| `--no-report` | — | No cargar reporte |
| `-h`, `--help` | — | Ayuda |
| `-v`, `--version` | — | Versión |

Un `--report` explícito que no existe es un error. El reporte por defecto ausente no lo es.

## Herramientas

Todas las rutas de entrada son relativas al proyecto. También se acepta el id de un fichero y el
nombre de la raíz como prefijo (`mi-proyecto/src/a.ts`). Se rechazan rutas absolutas y `..`.

### `get_architecture_map`

Árbol compacto de carpetas y ficheros con tamaño, complejidad máxima, riesgo y cambios.

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `folder` | string | raíz | Carpeta desde la que empezar |
| `depth` | 1–6 | 2 | Niveles de descendientes |
| `limit` | 1–100 | 20 | Máximo de hijos por carpeta |
| `includeFiles` | boolean | true | Incluir hojas de fichero |

Cada carpeta declara `files` (todos sus descendientes), `childFolders`, `metrics.size`,
`metrics.maxComplexity`, `metrics.risk` y, si hay reporte, `changes` con añadidos, cambiados,
eliminados, hotspots y violaciones. Los hijos que no caben en `limit` se resumen en `truncated`.

### `find_hotspots`

Ranking de ficheros por riesgo o por una métrica del snapshot.

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `scope` | `snapshot` \| `diff` | `snapshot` | Valores actuales o deltas del reporte |
| `metric` | string | `risk` | `risk` o una métrica presente en el snapshot |
| `folder` | string | raíz | Filtrar por carpeta |
| `limit` | 1–100 | 10 | Número de resultados |
| `minValue` | number | 0 | Valor mínimo exclusivo |

En `scope: "diff"` la métrica la decide el reporte (`hotspotMetric`); si pasas otra, la herramienta
falla con un mensaje claro. Los hotspots de diff incluyen `base`, `head` y `delta`.

### `check_change_impact`

Dependientes (quién importa) y/o dependencias (a quién importa) de un fichero o carpeta.

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `path` | string | — | Ruta o id del fichero/carpeta |
| `direction` | `dependents` \| `dependencies` \| `both` | `dependents` | Sentido del recorrido |
| `depth` | 1–8 | 2 | Saltos máximos |
| `limit` | 1–200 | 50 | Nodos impactados |

Devuelve los nodos con `depth`, `directions`, `risk` y, si hay reporte, su estado de cambio. Incluye
pertenencia a ciclos, violaciones relacionadas y `summary.truncated`.

### `list_violations`

Lista las violaciones del reporte separando `introduced`, `existing` y `resolved`.

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `status` | `all` \| `introduced` \| `existing` \| `resolved` | `all` | Estado |
| `severity` | `all` \| `info` \| `warn` \| `error` | `all` | Severidad |
| `type` | `all` \| `forbidden` \| `threshold` \| `cycles` | `all` | Tipo de regla |
| `rule` | string | — | Nombre exacto de regla |
| `limit` | 1–100 | 20 | Resultados |

Solo las violaciones `introduced` con severidad `error` bloquean el gate del diff; MCP las muestra
todas para que el agente pueda explicar deuda previa sin confundirla con un fallo nuevo.

### `get_migration_plan`

Plan de migración a otro lenguaje: cuánto queda, dónde y cómo ha cambiado.

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `folder` | string | raíz | Acotar el plan a una carpeta |
| `limit` | 1–100 | 15 | Ficheros con más deuda |

Devuelve `summary` (estado por lenguaje y por categoría `js`/`rust`/`bridge`/`native`, deuda total,
cruces FFI y ficheros puente), `topDebt` (los ficheros con más deuda, con su lenguaje, su estado y
sus cruces) y `changes` (si hay `report.json`: los ficheros cuya deuda ha crecido o se ha reducido, y
el delta total de deuda). Si el snapshot no tiene la lente de migración, `available` es `false` y lo
dice.

### `get_history`

La línea del tiempo del repositorio: las fotos guardadas con `codarch analyze --history`.

| Parámetro | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `snapshot` | string | — | Foto concreta: un trozo de su fecha o de su checksum |
| `limit` | 1–100 | 10 | Máximo de entradas |

Sin `snapshot` devuelve la línea del tiempo (fecha, checksum, ficheros, rloc, deuda, calor y los
ficheros más tocados). Con `snapshot` devuelve además esa foto.

### `explain_module`

Ficha de un fichero o carpeta:

- métricas, riesgo y ranking de riesgo del fichero;
- aristas de entrada y salida con peso y type-only;
- ciclo (pertenencia y tamaño);
- estado en el diff, cambios y hotspot;
- violaciones que mencionan la ruta.

Para una carpeta agrega sus ficheros, muestra los de mayor riesgo y resume las aristas que salen o
entran del conjunto. `limit` (1–50, por defecto 5) controla las aristas y ficheros de detalle.

## Comportamiento y límites

- **Solo lectura.** No hay herramientas para analizar, escribir reglas, crear snapshots ni modificar
  el repositorio.
- **Sin red.** No consulta GitHub; para un PR, apunta a los artefactos que ya existen en disco.
- **Sin prosa inventada.** El servidor devuelve JSON con los campos observados. El agente decide cómo
  explicarlo.
- **Determinista.** El mismo snapshot y reporte producen el mismo resultado; no se añaden timestamps.
- **Ciclos verificados.** Se calculan con SCC sobre las aristas del snapshot, no se copian de
  métricas opcionales.
- **Agregación de carpetas.** Tamaño = suma; complejidad = máximo; riesgo = máximo. Solo aparecen los
  hijos directos en cada nivel.
- **Recorte explícito.** `truncated` indica cuántos hijos o nodos quedaron fuera. Los límites evitan
  respuestas gigantes; no cambian los datos subyacentes.
- **Errores.** Una ruta inexistente, una métrica desconocida o un reporte inválido devuelven
  `isError` con un mensaje accionable; no devuelven datos parciales silenciosos.

## Estructura

```
apps/mcp/
├── bin/codarch-mcp.mjs   lanzador sin ruido de npm
├── src/store.ts          índice del snapshot/reporte, rutas, riesgo, ciclos, agregados
├── src/tools.ts          las seis consultas
├── src/server.ts         registro MCP y esquemas de entrada
├── src/index.ts          entrada stdio y opciones
└── test/                 29 tests, incluido transporte en memoria
```

El servidor carga e indexa una vez; las llamadas trabajan en memoria. `npm test` cubre las
herramientas, el servidor y el transporte MCP en memoria. También hay una prueba manual con stdio
frente a los artefactos de la acción.

## Lo que no hace todavía

- Servidor HTTP/SSE remoto, autenticación o multi-repo.
- Refresco automático al cambiar el snapshot; hay que reiniciar el servidor o iniciar otro proceso.
- Herramientas de escritura o de análisis.
- Navegación a nivel de símbolo; los nodos son ficheros (ADR 0006).
- Publicación del paquete npm. Por ahora se ejecuta desde el checkout.
