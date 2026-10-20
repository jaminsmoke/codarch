# codarch

Mapa de arquitectura para equipos y agentes de IA. Analiza un repositorio TypeScript/JavaScript y
produce un snapshot interoperable con CodeCharta (`cc.json`), un mapa HTML autocontenido y un diff
de arquitectura para PR/CI.

## Instalación

```bash
npm install -g codarch
codarch --version
```

Sin instalación global:

```bash
npx codarch analyze .
```

Requiere Node 22 o superior. El análisis usa `git log` para churn y autores; sin historial se puede
pasar `--no-git`.

## Uso

```bash
# Snapshot + mapa en .codarch/
codarch analyze .

# Elegir salida y título
codarch analyze . -o .codarch --title "Mi proyecto"

# Inspeccionar un cc.json existente (CodeCharta 1.x o 2.x)
codarch inspect mapa.cc.json --top 10

# Renderizar un cc.json sin volver a analizar
codarch render mapa.cc.json -o mapa.html --area rloc --color risk

# Comparar base y head, y bloquear el PR si hay violaciones nuevas
codarch diff base.cc.json head.cc.json -o report.json --config .codarch.yml --fail-on violations
```

Códigos de salida de `diff`: `0` sin bloqueo, `2` política incumplida, `1` error de lectura o
configuración.

## Lente de migración

`analyze` mide TS/JS, Rust y artefactos `.wasm`/`.node`. El snapshot incluye la lente `migration` y
las métricas `migrationDebt` (complejidad × consumidores) y `ffiCrossings`.

```bash
codarch inspect .codarch/snapshot.cc.json --metric migrationDebt --top 10
codarch render .codarch/snapshot.cc.json --area rloc --color migrationDebt -o migration.html
```

Rust se mide con un escáner léxico; las aristas napi no se inventan si el glue generado no está en el
fuente. Ver [`docs/migration.md`](https://github.com/jaminsmoke/codarch/blob/main/docs/migration.md).

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
- MCP de solo lectura para agentes: [`docs/mcp.md`](https://github.com/jaminsmoke/codarch/blob/main/docs/mcp.md).
- Modelo y formato: [`docs/model.md`](https://github.com/jaminsmoke/codarch/blob/main/docs/model.md).

## Licencia

MIT.
