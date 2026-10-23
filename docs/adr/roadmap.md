# Roadmap

Cada milestone deja el producto funcionando y verificable. Nada de big-bang.

## Estado

Hoy CodArch tiene:

- **CLI** (`codarch`): `analyze`, `diff`, `render`, `inspect` y `serve`. Publicado en npm.
- **Modelo** `cc.json` 2.x: árbol de ficheros, métricas, grafo de dependencias, ciclos, lente de
  migración y checksum determinista. Es la verdad del producto y la comparten todas las apps.
- **Reglas** de arquitectura en `.codarch.yml`: capas, prohibiciones, umbrales y ciclos, con severidad
  y política de bloqueo.
- **MCP** de solo lectura: nueve consultas para agentes.
- **GitHub Action**: analiza base y head del PR, comenta el resultado y bloquea si la política falla.
- **App web**: mapa, inspector, vista de PR, nivel de detalle para repos grandes y análisis de una
  carpeta en el navegador con el mismo checksum que el CLI.
- **App de escritorio**: Electron con su propia interfaz, análisis nativo con git, menú del sistema
  e instaladores sin firmar.

Las fases M0–M22 están cerradas. M23 está en curso, M24 sin empezar, M25 cerrada, M26 cerrada,
M27 en curso y M28 en curso.

## Las fases

Cada fase vive en la **hoja de ruta de la decisión que la trae**: el ADR tiene un `## Hoja de ruta`
con lo abierto y lo que está en curso. Aquí solo está el **índice**; el detalle de lo hecho vive en
el **changelog** de cada decisión (`<adr>.changelog.md`, al lado del ADR). Si una fase crece, crece
en su ADR, no aquí.

```mermaid
flowchart TD
  subgraph base["Base: modelo, parser, diff"]
    M0["M0 · Modelo y mapa"] --> M1["M1 · Parser TS"]
    M1 --> M2["M2 · Diff y PR"]
    M2 --> M3["M3 · MCP y distribución"]
  end
  subgraph apps["Apps: migración, web, navegador, escritorio"]
    M4["M4 · Lente de migración"] --> M5["M5 · App web"]
    M5 --> M6["M6 · Análisis en el navegador"]
    M6 --> M7["M7 · App de escritorio"]
    M7 --> M26["M26 · La UI compartida"]
  end
  subgraph lentes["Lentes: migración, dominio, símbolos, tiempo"]
    M8["M8 · La migración donde faltaba"] --> M9["M9 · Lente de dominio"]
    M9 --> M10["M10 · Evolución temporal"]
    M10 --> M11["M11 · Lente de símbolos"]
    M11 --> M12["M12 · Vida de un símbolo"]
  end
  subgraph ext["Ajustes y extensiones"]
    M13["M13 · Los ajustes"] --> M14["M14 · Los plugins"]
    M14 --> M15["M15 · La vista 3D"]
    M15 --> M16["M16 · Los addons"]
    M16 --> M17["M17 · Instalar y quitar"]
  end
  subgraph docs["Documentos y web"]
    M18["M18 · Documentos ordenados"] --> M19["M19 · Iconos y diagramas"]
    M19 --> M20["M20 · La guía, en HTML"]
    M20 --> M21["M21 · Versiones y actualizaciones"]
    M21 --> M22["M22 · El repo, con sus papeles"]
    M22 --> M23["M23 · La web del proyecto"]
    M23 --> M24["M24 · Índice SQLite"]
  end
  subgraph delivery["Entrega"]
    M25["M25 · La entrega se automatiza"]
    M25 --> M27["M27 · La app web en Docker"]
    M26 --> M28["M28 · El escritorio se instala y se actualiza"]
  end
  M3 --> M4
  M7 --> M8
  M12 --> M13
  M17 --> M18
  M21 --> M25
```

| Fase | Qué | Estado | Decisión |
|---|---|---|---|
| M0 | Modelo y mapa, sin parsers | cerrada | [ADR 0005](0001-0010/0005-2d-first.md) · [changelog](0001-0010/0005-2d-first.changelog.md) |
| M1 | Parser propio de TypeScript | cerrada | [ADR 0003](0001-0010/0003-typescript-first.md) · [changelog](0001-0010/0003-typescript-first.changelog.md) |
| M2 | Diff y PR | cerrada | [ADR 0010](0001-0010/0010-diff-entre-snapshots.md) · [changelog](0001-0010/0010-diff-entre-snapshots.changelog.md) |
| M3 | MCP y distribución | cerrada | [ADR 0014](0011-0020/0014-distribucion-cli-npm.md) · [changelog](0011-0020/0014-distribucion-cli-npm.changelog.md) |
| M4 | Lente de migración | cerrada | [ADR 0016](0011-0020/0016-lente-migracion.md) · [changelog](0011-0020/0016-lente-migracion.changelog.md) |
| M5 | App web | cerrada | [ADR 0008](0001-0010/0008-diseno-mapa-2d.md) · [changelog](0001-0010/0008-diseno-mapa-2d.changelog.md) |
| M5.1 | Básicos de uso | cerrada | [ADR 0008](0001-0010/0008-diseno-mapa-2d.md) · [changelog](0001-0010/0008-diseno-mapa-2d.changelog.md) |
| M6 | Análisis en el navegador | cerrada | [ADR 0020](0011-0020/0020-analisis-en-el-navegador.md) · [changelog](0011-0020/0020-analisis-en-el-navegador.changelog.md) |
| M7 | App de escritorio | cerrada | [ADR 0021](0021-0030/0021-app-de-escritorio.md) · [changelog](0021-0030/0021-app-de-escritorio.changelog.md) |
| M8 | La migración, donde ya faltaba | cerrada | [ADR 0022](0021-0030/0022-la-migracion-donde-faltaba.md) · [changelog](0021-0030/0022-la-migracion-donde-faltaba.changelog.md) |
| M9 | Lente de dominio, por pasos | cerrada | [ADR 0023](0021-0030/0023-lente-de-dominio-por-pasos.md) · [changelog](0021-0030/0023-lente-de-dominio-por-pasos.changelog.md) |
| M10 | La evolución temporal | cerrada | [ADR 0024](0021-0030/0024-evolucion-temporal.md) · [changelog](0021-0030/0024-evolucion-temporal.changelog.md) |
| M11 | La lente de símbolos | cerrada | [ADR 0025](0021-0030/0025-lente-de-simbolos.md) · [changelog](0021-0030/0025-lente-de-simbolos.changelog.md) |
| M12 | La vida de un símbolo | cerrada | [ADR 0026](0021-0030/0026-la-vida-de-un-simbolo.md) · [changelog](0021-0030/0026-la-vida-de-un-simbolo.changelog.md) |
| M13 | Los ajustes | cerrada | [ADR 0027](0021-0030/0027-los-ajustes.md) · [changelog](0021-0030/0027-los-ajustes.changelog.md) |
| M14 | Los plugins | cerrada | [ADR 0028](0021-0030/0028-los-plugins.md) · [changelog](0021-0030/0028-los-plugins.changelog.md) |
| M15 | La vista 3D | cerrada | [ADR 0028](0021-0030/0028-los-plugins.md) · [changelog](0021-0030/0028-los-plugins.changelog.md) |
| M16 | Los addons | cerrada | [ADR 0029](0021-0030/0029-los-addons.md) · [changelog](0021-0030/0029-los-addons.changelog.md) |
| M17 | Instalar y quitar plugins y addons | cerrada | [ADR 0030](0021-0030/0030-instalar-y-quitar.md) · [changelog](0021-0030/0030-instalar-y-quitar.changelog.md) |
| M18 | Los documentos ordenados | cerrada | [ADR 0031](0031-0040/0031-los-documentos.md) · [changelog](0031-0040/0031-los-documentos.changelog.md) |
| M19 | Los documentos, con iconos y diagramas | cerrada | [ADR 0031](0031-0040/0031-los-documentos.md) · [changelog](0031-0040/0031-los-documentos.changelog.md) |
| M20 | La guía, en HTML | cerrada | [ADR 0031](0031-0040/0031-los-documentos.md) · [changelog](0031-0040/0031-los-documentos.changelog.md) |
| M21 | Las versiones y las actualizaciones | cerrada | [ADR 0032](0031-0040/0032-las-versiones-y-las-actualizaciones.md) · [changelog](0031-0040/0032-las-versiones-y-las-actualizaciones.changelog.md) |
| M22 | El repo, con sus papeles | cerrada | [ADR 0033](0031-0040/0033-abrir-el-repo.md) · [changelog](0031-0040/0033-abrir-el-repo.changelog.md) |
| M23 | La web del proyecto | en curso | [ADR 0034](0031-0040/0034-la-web-del-proyecto.md#hoja-de-ruta) · [changelog](0031-0040/0034-la-web-del-proyecto.changelog.md) |
| M24 | El índice SQLite de los documentos | sin empezar | [ADR 0036](0031-0040/0036-el-roadmap-en-el-adr-y-el-changelog.md#hoja-de-ruta) |
| M25 | La entrega se automatiza | cerrada | [ADR 0042](0041-0050/0042-la-entrega-se-automatiza.md#hoja-de-ruta) · [changelog](0041-0050/0042-la-entrega-se-automatiza.changelog.md) |
| M26 | La UI compartida | cerrada | [ADR 0043](0041-0050/0043-la-ui-compartida.md#hoja-de-ruta) · [changelog](0041-0050/0043-la-ui-compartida.changelog.md) |
| M27 | La app web en Docker | en curso | [ADR 0044](0041-0050/0044-la-web-en-docker.md#hoja-de-ruta) · [changelog](0041-0050/0044-la-web-en-docker.changelog.md) |
| M28 | El escritorio se instala y se actualiza | en curso | [ADR 0045](0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md#hoja-de-ruta) · [changelog](0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.changelog.md) |

## Cómo se lee esto

- Una fase **nace en la hoja de ruta de su decisión** (`## Hoja de ruta` del ADR); aquí solo se le
  añade la línea.
- Una decisión que crece **agranda su hoja de ruta** y deja lo hecho en su **changelog**, no en este
  fichero.
- Las ideas que todavía **no son fase** viven en la [guía](../guideline/contenido.md), por orden
  cronológico.
- El índice de las **decisiones** —con su fecha y su estado— está en [`docs/adr/index.md`](index.md).
