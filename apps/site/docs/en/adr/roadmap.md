---
title: Roadmap
description: Every milestone leaves the product working and verifiable. No big bang.
section: producto
sidebar:
  label: Roadmap
  order: 0
---

Every milestone leaves the product working and verifiable. No big bang.

## Status

Today CodArch has:

- **CLI** (`codarch`): `analyze`, `diff`, `render`, `inspect` and `serve`. Published on npm.
- **Model** `cc.json` 2.x: file tree, metrics, dependency graph, cycles, migration lens and a
  deterministic checksum. It is the truth of the product and all apps share it.
- **Rules** of architecture in `.codarch.yml`: layers, forbidden dependencies, thresholds and
  cycles, with severity and a blocking policy.
- **MCP** read-only: twelve queries for agents.
- **GitHub Action**: analyses the PR's base and head, comments the result and blocks if the policy
  fails.
- **Web app**: map, inspector, PR view, level of detail for large repos and analysis of a folder in
  the browser with the same checksum as the CLI.
- **Desktop app**: Electron with its own interface, native analysis with git, system menu and
  unsigned installers.

Phases M0-M22 are closed. M23 is in progress, M24 not started, M25 closed, M26 closed, M27 closed,
M28 closed, M29 closed, M30 closed, M31 in progress, M32 closed, M33 closed, M34 in progress, M35
closed, M36 closed, M37 closed, M38 closed, M39 closed, M40 closed, M41 closed, M42 closed, M43
closed, M44 closed, M45 closed, M46 closed, M47 closed, M48 closed, M49 in progress, M50 closed,
M51 closed, M52 not started, M53 closed, M54 closed, M55 closed, M56 closed, M57 closed, M58 closed,
M59 closed and M60 closed.

## The phases

Each phase lives in the **roadmap of the decision that brings it**: the ADR has a `## Roadmap`
section with what is open and what is in progress. Here is only the **index**; the record of what
is done lives in the **guide feed** ([`/guia/`](/guia/)). If a phase grows, it grows in its ADR, not
here.

```mermaid
flowchart TD
  subgraph base["Base: model, parser, diff"]
    M0["M0 · Model and map"] --> M1["M1 · TS parser"]
    M1 --> M2["M2 · Diff and PR"]
    M2 --> M3["M3 · MCP and distribution"]
  end
  subgraph apps["Apps: migration, web, browser, desktop"]
    M4["M4 · Migration lens"] --> M5["M5 · Web app"]
    M5 --> M6["M6 · Analysis in the browser"]
    M6 --> M7["M7 · Desktop app"]
    M7 --> M26["M26 · Shared UI"]
    M26 --> M37["M37 · The file card and its lenses"]
    M37 --> M38["M38 · Rules get their tab"]
    M38 --> M39["M39 · Three tabs"]
    M39 --> M40["M40 · A metrics table"]
    M40 --> M41["M41 · The project frame"]
    M41 --> M42["M42 · Symbols collapse too"]
    M42 --> M43["M43 · Every symbol in the module"]
    M43 --> M44["M44 · The card hides nothing"]
    M44 --> M45["M45 · A version per component"]
    M45 --> M46["M46 · The action returns"]
    M46 --> M47["M47 · The card shows the code"]
    M47 --> M48["M48 · Editor and dependencies"]
    M48 --> M50["M50 · Two tabs"]
    M50 --> M51["M51 · The files of the change, in one list"]
    M51 --> M52["M52 · The table from base to head"]
  end
  subgraph lenses["Lenses: migration, domain, symbols, time"]
    M8["M8 · Migration where it was missing"] --> M9["M9 · Domain lens"]
    M9 --> M10["M10 · Time evolution"]
    M10 --> M11["M11 · Symbols lens"]
    M11 --> M12["M12 · Life of a symbol"]
  end
  subgraph ext["Settings and extensions"]
    M13["M13 · Settings"] --> M14["M14 · Plugins"]
    M14 --> M15["M15 · 3D view"]
    M15 --> M16["M16 · Addons"]
    M16 --> M17["M17 · Install and remove"]
  end
  subgraph docs["Documents and website"]
    M18["M18 · Ordered documents"] --> M19["M19 · Icons and diagrams"]
    M19 --> M20["M20 · The guide, in HTML"]
    M20 --> M21["M21 · Versions and updates"]
    M21 --> M22["M22 · The repo, with its papers"]
    M22 --> M23["M23 · The project website"]
    M23 --> M24["M24 · SQLite index"]
  end
  subgraph delivery["Delivery"]
    M25["M25 · Delivery is automated"]
    M25 --> M27["M27 · The web app in Docker"]
    M26 --> M28["M28 · The desktop installs and updates"]
  end
  M3 --> M4
  M7 --> M8
  M12 --> M13
  M17 --> M18
  M21 --> M25
```

| Phase | What | Status | Decision |
|---|---|---|---|
| M0 | Model and map, without parsers | closed | [ADR 0005](0001-0010/0005-2d-first.md) |
| M1 | Our own TypeScript parser | closed | [ADR 0003](0001-0010/0003-typescript-first.md) |
| M2 | Diff and PR | closed | [ADR 0010](0001-0010/0010-diff-entre-snapshots.md) |
| M3 | MCP and distribution | closed | [ADR 0014](0011-0020/0014-distribucion-cli-npm.md) |
| M4 | Migration lens | closed | [ADR 0016](0011-0020/0016-lente-migracion.md) |
| M5 | Web app | closed | [ADR 0008](0001-0010/0008-diseno-mapa-2d.md) |
| M5.1 | Usage basics | closed | [ADR 0008](0001-0010/0008-diseno-mapa-2d.md) |
| M6 | Analysis in the browser | closed | [ADR 0020](0011-0020/0020-analisis-en-el-navegador.md) |
| M7 | Desktop app | closed | [ADR 0021](0021-0030/0021-app-de-escritorio.md) |
| M8 | Migration, where it was still missing | closed | [ADR 0022](0021-0030/0022-la-migracion-donde-faltaba.md) |
| M9 | Domain lens, step by step | closed | [ADR 0023](0021-0030/0023-lente-de-dominio-por-pasos.md) |
| M10 | Time evolution | closed | [ADR 0024](0021-0030/0024-evolucion-temporal.md) |
| M11 | The symbols lens | closed | [ADR 0025](0021-0030/0025-lente-de-simbolos.md) |
| M12 | The life of a symbol | closed | [ADR 0026](0021-0030/0026-la-vida-de-un-simbolo.md) |
| M13 | Settings | closed | [ADR 0027](0021-0030/0027-los-ajustes.md) |
| M14 | Plugins | closed | [ADR 0028](0021-0030/0028-los-plugins.md) |
| M15 | The 3D view | closed | [ADR 0028](0021-0030/0028-los-plugins.md) |
| M16 | Addons | closed | [ADR 0029](0021-0030/0029-los-addons.md) |
| M17 | Installing and removing plugins and addons | closed | [ADR 0030](0021-0030/0030-instalar-y-quitar.md) |
| M18 | Ordered documents | closed | [ADR 0031](0031-0040/0031-los-documentos.md) |
| M19 | Documents, with icons and diagrams | closed | [ADR 0031](0031-0040/0031-los-documentos.md) |
| M20 | The guide, in HTML | closed | [ADR 0031](0031-0040/0031-los-documentos.md) |
| M21 | Versions and updates | closed | [ADR 0032](0031-0040/0032-las-versiones-y-las-actualizaciones.md) |
| M22 | The repo, with its papers | closed | [ADR 0033](0031-0040/0033-abrir-el-repo.md) |
| M23 | The project website | in progress | [ADR 0034](0031-0040/0034-la-web-del-proyecto.md#hoja-de-ruta) |
| M24 | The SQLite index of the documents | not started | [ADR 0036](0031-0040/0036-el-roadmap-en-el-adr-y-el-changelog.md#hoja-de-ruta) |
| M25 | Delivery is automated | closed | [ADR 0042](0041-0050/0042-la-entrega-se-automatiza.md#hoja-de-ruta) |
| M26 | Shared UI | closed | [ADR 0043](0041-0050/0043-la-ui-compartida.md#hoja-de-ruta) |
| M27 | The web app in Docker | closed | [ADR 0044](0041-0050/0044-la-web-en-docker.md#hoja-de-ruta) |
| M28 | The desktop installs and updates | closed | [ADR 0045](0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md#hoja-de-ruta) |
| M29 | Documents with Starlight | closed | [ADR 0046](0041-0050/0046-los-documentos-con-starlight.md#hoja-de-ruta) |
| M30 | The changelog is the guide | closed | [ADR 0047](0041-0050/0047-el-changelog-es-la-guia.md#hoja-de-ruta) |
| M31 | The site in two languages | in progress | [ADR 0046](0041-0050/0046-los-documentos-con-starlight.md#hoja-de-ruta) |
| M32 | The desktop persists in `.codarch/` | closed | [ADR 0048](0041-0050/0048-el-escritorio-persiste-en-codarch.md#hoja-de-ruta) |
| M33 | Shared orchestration | closed | [ADR 0049](0041-0050/0049-la-orquestacion-se-comparte.md#hoja-de-ruta) |
| M34 | The state lives in the repository | in progress | [ADR 0050](0041-0050/0050-el-repositorio-guarda-su-estado.md#hoja-de-ruta) |
| M35 | The second lint net | closed | [ADR 0054](0051-0060/0054-el-lint-por-app.md#hoja-de-ruta) |
| M36 | Live does not re-analyse | closed | [ADR 0056](0051-0060/0056-el-live-no-repite-el-analisis.md#hoja-de-ruta) |
| M37 | The file card talks about its lenses | closed | [ADR 0057](0051-0060/0057-la-ficha-del-fichero-habla-de-sus-lentes.md#hoja-de-ruta) |
| M38 | Rules get their own tab | closed | [ADR 0058](0051-0060/0058-las-reglas-tienen-su-pestana.md#hoja-de-ruta) |
| M39 | Three tabs | closed | [ADR 0059](0051-0060/0059-tres-pestanas.md#hoja-de-ruta) |
| M40 | The card reads as a table | closed | [ADR 0060](0051-0060/0060-la-ficha-se-lee-en-una-tabla.md#hoja-de-ruta) |
| M41 | The project frame | closed | [ADR 0061](0061-0070/0061-el-marco-del-proyecto.md#hoja-de-ruta) |
| M42 | Symbols collapse too | closed | [ADR 0062](0061-0070/0062-los-simbolos-tambien-se-pliegan.md#hoja-de-ruta) |
| M43 | Every symbol in the module | closed | [ADR 0063](0061-0070/0063-todos-los-simbolos.md#hoja-de-ruta) |
| M44 | The card hides nothing | closed | [ADR 0064](0061-0070/0064-la-ficha-no-esconde-nada.md#hoja-de-ruta) |
| M45 | A version per component | closed | [ADR 0065](0061-0070/0065-cada-componente-su-version.md#hoja-de-ruta) |
| M46 | The action returns to the monorepo | closed | [ADR 0066](0061-0070/0066-la-accion-vuelve-al-monorepo.md#hoja-de-ruta) |
| M47 | The card shows the code | closed | [ADR 0067](0061-0070/0067-la-ficha-ensena-el-codigo.md#hoja-de-ruta) |
| M48 | The card opens the editor and its dependencies | closed | [ADR 0068](0061-0070/0068-la-ficha-abre-el-editor-y-sus-dependencias.md#hoja-de-ruta) |
| M49 | The card's language, across the report | in progress | [ADR 0061](0061-0070/0061-el-marco-del-proyecto.md#hoja-de-ruta) |
| M50 | Two tabs: the file and the change | closed | [ADR 0069](0061-0070/0069-dos-pestanas.md#hoja-de-ruta) |
| M51 | The files of the change, in one list | closed | [ADR 0070](0061-0070/0070-los-ficheros-del-cambio-en-una-lista.md#hoja-de-ruta) |
| M52 | The change table goes from base to head | not started | [ADR 0071](0061-0070/0071-la-tabla-de-cambios-va-de-base-a-head.md#hoja-de-ruta) |
| M53 | Changes since the last commit | closed | [ADR 0072](0071-0080/0072-cambios-desde-el-ultimo-commit.md#hoja-de-ruta) |
| M54 | One single interface | closed | [ADR 0073](0071-0080/0073-una-sola-interfaz.md#hoja-de-ruta) |
| M55 | One single analysis session | closed | [ADR 0074](0071-0080/0074-una-sola-sesion.md#hoja-de-ruta) |
| M56 | Changes are git | closed | [ADR 0075](0071-0080/0075-cambios-es-de-git.md#hoja-de-ruta) |
| M57 | Newlines are not code | closed | [ADR 0076](0071-0080/0076-las-lineas-no-son-codigo.md#hoja-de-ruta) |
| M58 | The diff, when the file opens | closed | [ADR 0077](0071-0080/0077-el-diff-al-abrir-el-fichero.md#hoja-de-ruta) |
| M59 | Debt balance | closed | [ADR 0078](0071-0080/0078-el-balance-de-deuda.md#hoja-de-ruta) |
| M60 | The inspector with an activity bar | closed | [ADR 0079](0071-0080/0079-el-inspector-con-barra-de-actividad.md#hoja-de-ruta) |

## How to read this

- A phase **is born in the roadmap of its decision** (`## Roadmap` in the ADR); here only its line is
  added.
- A decision that grows **grows its roadmap** and leaves what is done in the **guide**, not in this
  file.
- Ideas that are **not a phase yet** live in the [guide](/guia/), in chronological order.
- The index of **decisions** —with their date and status— is in [`docs/adr/index.md`](index.md).
