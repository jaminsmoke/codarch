# codarch

Mapa de arquitectura para equipos y agentes de IA. Analiza un repositorio TypeScript/JavaScript,
Java, Python, Go o C# y produce un snapshot interoperable con CodeCharta (`cc.json`), un mapa HTML
autocontenido y un diff de arquitectura para PR/CI.

> [!IMPORTANT]
> **🧪 Alpha.** La funcionalidad está ✓; el producto todavía no ✓. Las versiones llevan prerelease ✓
> (`0.3.1-alpha.3` ✓) y **no hay soporte** ✓. Lo que **sí** es estable ✓: el modelo `cc.json` 2.x ✓
> y su checksum ✓.

## Instalación

```bash
npm install -g codarch@next   # la alpha
codarch --version
```

`latest` se queda con la última versión normal ✓; las alphas viven en la etiqueta `next` ✓. Sin
instalación global:

```bash
npx codarch@next analyze .
```

Requiere Node 22 o superior. El análisis usa `git log` para churn y autores; sin historial se puede
pasar `--no-git`.

## Uso

```bash
# Snapshot en .codarch/
codarch analyze .

# Elegir salida y nombre del proyecto
codarch analyze . -o .codarch --project "Mi proyecto"

# Inspeccionar un cc.json existente (CodeCharta 1.x o 2.x)
codarch inspect mapa.cc.json --top 10

# Publicar la app con un cc.json dentro, sin volver a analizar
codarch render mapa.cc.json -o publico      # publico/data/snapshot.cc.json + la app

# Ver el mapa en un PNG, con el área y el color que se pidan
codarch shot mapa.cc.json --area maxComplexity --color rloc   # .codarch/shots/map-1.png

# Lint del repo con las herramientas que declara .codarch.yml, a .codarch/lint.json
codarch lint . --fail-on errors

# Comparar base y head, y bloquear el PR si hay violaciones nuevas
codarch diff base.cc.json head.cc.json -o report.json --config .codarch.yml --fail-on violations
```

Códigos de salida de `diff`: `0` sin bloqueo, `2` política incumplida, `1` error de lectura o
configuración.

## Servidor local

```bash
codarch serve .                 # analiza, sirve la web y reanaliza al cambiar ficheros
codarch serve . --no-watch      # solo análisis inicial; sin SSE
codarch serve . --no-web        # modo API para Vite u otro frontend
codarch serve . --port 8080
```

`serve` usa el mismo analizador que `analyze`, sirve la app web incluida en el paquete (la misma de
la web y el escritorio, ADR 0073) y expone el snapshot en `/data/snapshot.cc.json` y el mapa de lo
que no es código en `/data/rest.cc.json`; si existe
`.codarch/report.json`, también lo sirve para la vista de PR. El watch es **live por defecto**: reanaliza al guardar y refresca por SSE. No monitoriza GitHub
ni sustituye a la acción: es un visor local, y no está pensado para exponerse fuera de loopback.

## Lente de migración

La lente de migración sigue siendo JS/TS → Rust: mide los ficheros TS/JS, los de Rust y los
artefactos `.wasm`/`.node`, y no dice nada de los demás lenguajes del análisis (Java, Python, Go y
C#), que son nodos del mapa sin estado de migración. El snapshot incluye la lente `migration` y las
métricas `migrationDebt` (complejidad × consumidores) y `ffiCrossings`.

```bash
codarch inspect .codarch/snapshot.cc.json --metric migrationDebt --top 10
codarch render .codarch/snapshot.cc.json -o publico   # la app abre con la lente de migración
```

Rust se mide con un escáner léxico; las aristas napi no se inventan si el glue generado no está en el
fuente. Ver [`apps/site/docs/desarrollo/migration.md`](https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/desarrollo/migration.md).

## Reglas

`.codarch.yml` define capas, dependencias prohibidas, umbrales y ciclos. Solo bloquean las
violaciones **introducidas** con severidad `error`, así se puede adoptar en repos con deuda previa.

```yaml
version: 1

layers:
  - name: domain
    paths: [src/domain/**]
  - name: infrastructure
    paths: [src/infra/**]

rules:
  - name: domain-no-infra
    type: forbidden
    from: domain
    to: infrastructure
    severity: error
  - name: sin-ciclos
    type: cycles
    severity: error
```

## Integración

- GitHub Action repo-local: [`apps/github-action`](https://github.com/jaminsmoke/codarch/tree/main/apps/github-action).
- MCP de solo lectura para agentes: [`apps/site/docs/usar/mcp.md`](https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/usar/mcp.md).
- Modelo y formato: [`apps/site/docs/desarrollo/model.md`](https://github.com/jaminsmoke/codarch/blob/main/apps/site/docs/desarrollo/model.md).

## Licencia

MIT. El nombre «CodArch» y el logotipo no se conceden con la licencia:
[`TRADEMARK.md`](https://github.com/jaminsmoke/codarch/blob/main/TRADEMARK.md).
