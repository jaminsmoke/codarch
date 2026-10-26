---
title: Roadmap
description: Cada milestone deja el producto funcionando y verificable. Nada de big-bang.
section: construir
sidebar:
  label: Roadmap
  order: 0
---

Cada milestone deja el producto funcionando y verificable. Nada de big-bang.

## Estado

Hoy CodArch tiene:

- **CLI** (`codarch`): `analyze`, `diff`, `render`, `inspect` y `serve`. Publicado en npm.
- **Modelo** `cc.json` 2.x: árbol de ficheros, métricas, grafo de dependencias, ciclos, lente de
  migración y checksum determinista. Es la verdad del producto y la comparten todas las apps.
- **Reglas** de arquitectura en `.codarch.yml`: capas, prohibiciones, umbrales y ciclos, con severidad
  y política de bloqueo.
- **MCP** de solo lectura: doce consultas para agentes.
- **GitHub Action**: analiza base y head del PR, comenta el resultado y bloquea si la política falla.
- **App web**: mapa, inspector, vista de PR, nivel de detalle para repos grandes y análisis de una
  carpeta en el navegador con el mismo checksum que el CLI.
- **App de escritorio**: Electron con su propia interfaz, análisis nativo con git, menú del sistema
  e instaladores sin firmar.

Las fases M0-M22 están cerradas. M23 está en curso, M24 sin empezar, M25 cerrada, M26 cerrada,
M27 cerrada, M28 cerrada, M29 cerrada, M30 cerrada, M31 en curso, M32 cerrada, M33 cerrada, M34 en
curso, M35 cerrada, M36 cerrada, M37 cerrada, M38 cerrada, M39 cerrada, M40 cerrada, M41 cerrada, M42 cerrada, M43 cerrada, M44 cerrada, M45 cerrada, M46 cerrada, M47 cerrada, M48 cerrada, M49 en curso, M50 cerrada, M51 cerrada, M52 no empezada, M53 cerrada, M54 cerrada, M55 cerrada, M56 cerrada, M57 cerrada, M58 cerrada, M59 cerrada y M60 cerrada.

## Las fases

Cada fase vive en la **hoja de ruta de la decisión que la trae**: el ADR tiene un `## Hoja de ruta`
con lo abierto y lo que está en curso. Aquí solo está el **índice**; el detalle de lo hecho vive en
el **feed de la guía** ([`/guia/`](/guia/)). Si una fase crece, crece en su ADR, no aquí.

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
    M26 --> M37["M37 · La ficha del fichero"]
    M37 --> M38["M38 · Las reglas tienen su pestaña"]
    M38 --> M39["M39 · Tres pestañas"]
    M39 --> M40["M40 · Una tabla de métricas"]
    M40 --> M41["M41 · El marco del proyecto"]
    M41 --> M42["M42 · Los símbolos también se pliegan"]
    M42 --> M43["M43 · Todos los símbolos del módulo"]
    M43 --> M44["M44 · La ficha no esconde nada"]
    M44 --> M45["M45 · Cada componente su versión"]
    M45 --> M46["M46 · La acción vuelve al monorepo"]
    M46 --> M47["M47 · La ficha enseña el código"]
    M47 --> M48["M48 · Editor y dependencias"]
    M48 --> M50["M50 · Dos pestañas"]
    M50 --> M51["M51 · Una lista de ficheros"]
    M51 --> M52["M52 · La tabla base → head"]
    M52 --> M53["M53 · Cambios desde el último commit"]
    M53 --> M54["M54 · Una sola interfaz"]
    M54 --> M55["M55 · Una sola sesión"]
    M55 --> M56["M56 · Cambios es de git"]
    M56 --> M57["M57 · Las líneas no son código"]
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
| M0 | Modelo y mapa, sin parsers | cerrada | [ADR 0005](0001-0010/0005-2d-first.md) |
| M1 | Parser propio de TypeScript | cerrada | [ADR 0003](0001-0010/0003-typescript-first.md) |
| M2 | Diff y PR | cerrada | [ADR 0010](0001-0010/0010-diff-entre-snapshots.md) |
| M3 | MCP y distribución | cerrada | [ADR 0014](0011-0020/0014-distribucion-cli-npm.md) |
| M4 | Lente de migración | cerrada | [ADR 0016](0011-0020/0016-lente-migracion.md) |
| M5 | App web | cerrada | [ADR 0008](0001-0010/0008-diseno-mapa-2d.md) |
| M5.1 | Básicos de uso | cerrada | [ADR 0008](0001-0010/0008-diseno-mapa-2d.md) |
| M6 | Análisis en el navegador | cerrada | [ADR 0020](0011-0020/0020-analisis-en-el-navegador.md) |
| M7 | App de escritorio | cerrada | [ADR 0021](0021-0030/0021-app-de-escritorio.md) |
| M8 | La migración, donde ya faltaba | cerrada | [ADR 0022](0021-0030/0022-la-migracion-donde-faltaba.md) |
| M9 | Lente de dominio, por pasos | cerrada | [ADR 0023](0021-0030/0023-lente-de-dominio-por-pasos.md) |
| M10 | La evolución temporal | cerrada | [ADR 0024](0021-0030/0024-evolucion-temporal.md) |
| M11 | La lente de símbolos | cerrada | [ADR 0025](0021-0030/0025-lente-de-simbolos.md) |
| M12 | La vida de un símbolo | cerrada | [ADR 0026](0021-0030/0026-la-vida-de-un-simbolo.md) |
| M13 | Los ajustes | cerrada | [ADR 0027](0021-0030/0027-los-ajustes.md) |
| M14 | Los plugins | cerrada | [ADR 0028](0021-0030/0028-los-plugins.md) |
| M15 | La vista 3D | cerrada | [ADR 0028](0021-0030/0028-los-plugins.md) |
| M16 | Los addons | cerrada | [ADR 0029](0021-0030/0029-los-addons.md) |
| M17 | Instalar y quitar plugins y addons | cerrada | [ADR 0030](0021-0030/0030-instalar-y-quitar.md) |
| M18 | Los documentos ordenados | cerrada | [ADR 0031](0031-0040/0031-los-documentos.md) |
| M19 | Los documentos, con iconos y diagramas | cerrada | [ADR 0031](0031-0040/0031-los-documentos.md) |
| M20 | La guía, en HTML | cerrada | [ADR 0031](0031-0040/0031-los-documentos.md) |
| M21 | Las versiones y las actualizaciones | cerrada | [ADR 0032](0031-0040/0032-las-versiones-y-las-actualizaciones.md) |
| M22 | El repo, con sus papeles | cerrada | [ADR 0033](0031-0040/0033-abrir-el-repo.md) |
| M23 | La web del proyecto | en curso | [ADR 0034](0031-0040/0034-la-web-del-proyecto.md#hoja-de-ruta) |
| M24 | El índice SQLite de los documentos | sin empezar | [ADR 0036](0031-0040/0036-el-roadmap-en-el-adr-y-el-changelog.md#hoja-de-ruta) |
| M25 | La entrega se automatiza | cerrada | [ADR 0042](0041-0050/0042-la-entrega-se-automatiza.md#hoja-de-ruta) |
| M26 | La UI compartida | cerrada | [ADR 0043](0041-0050/0043-la-ui-compartida.md#hoja-de-ruta) |
| M27 | La app web en Docker | cerrada | [ADR 0044](0041-0050/0044-la-web-en-docker.md#hoja-de-ruta) |
| M28 | El escritorio se instala y se actualiza | cerrada | [ADR 0045](0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md#hoja-de-ruta) |
| M29 | Los documentos con Starlight | cerrada | [ADR 0046](0041-0050/0046-los-documentos-con-starlight.md#hoja-de-ruta) |
| M30 | El changelog es la guía | cerrada | [ADR 0047](0041-0050/0047-el-changelog-es-la-guia.md#hoja-de-ruta) |
| M31 | El sitio en dos idiomas | en curso | [ADR 0046](0041-0050/0046-los-documentos-con-starlight.md#hoja-de-ruta) |
| M32 | El escritorio persiste en `.codarch/` | cerrada | [ADR 0048](0041-0050/0048-el-escritorio-persiste-en-codarch.md#hoja-de-ruta) |
| M33 | La orquestación compartida | cerrada | [ADR 0049](0041-0050/0049-la-orquestacion-se-comparte.md#hoja-de-ruta) |
| M34 | El estado vive en el repositorio | en curso | [ADR 0050](0041-0050/0050-el-repositorio-guarda-su-estado.md#hoja-de-ruta) |
| M35 | La segunda red del lint | cerrada | [ADR 0054](0051-0060/0054-el-lint-por-app.md#hoja-de-ruta) |
| M36 | El live no repite el análisis | cerrada | [ADR 0056](0051-0060/0056-el-live-no-repite-el-analisis.md#hoja-de-ruta) |
| M37 | La ficha del fichero habla de sus lentes | cerrada | [ADR 0057](0051-0060/0057-la-ficha-del-fichero-habla-de-sus-lentes.md#hoja-de-ruta) |
| M38 | Las reglas tienen su pestaña | cerrada | [ADR 0058](0051-0060/0058-las-reglas-tienen-su-pestana.md#hoja-de-ruta) |
| M39 | Tres pestañas | cerrada | [ADR 0059](0051-0060/0059-tres-pestanas.md#hoja-de-ruta) |
| M40 | Una tabla de métricas | cerrada | [ADR 0060](0051-0060/0060-la-ficha-se-lee-en-una-tabla.md#hoja-de-ruta) |
| M41 | El marco del proyecto | cerrada | [ADR 0061](0061-0070/0061-el-marco-del-proyecto.md#hoja-de-ruta) |
| M42 | Los símbolos también se pliegan | cerrada | [ADR 0062](0061-0070/0062-los-simbolos-tambien-se-pliegan.md#hoja-de-ruta) |
| M43 | Todos los símbolos del módulo | cerrada | [ADR 0063](0061-0070/0063-todos-los-simbolos.md#hoja-de-ruta) |
| M44 | La ficha no esconde nada | cerrada | [ADR 0064](0061-0070/0064-la-ficha-no-esconde-nada.md#hoja-de-ruta) |
| M45 | Cada componente su versión | cerrada | [ADR 0065](0061-0070/0065-cada-componente-su-version.md#hoja-de-ruta) |
| M46 | La acción vuelve al monorepo | cerrada | [ADR 0066](0061-0070/0066-la-accion-vuelve-al-monorepo.md#hoja-de-ruta) |
| M47 | La ficha enseña el código | cerrada | [ADR 0067](0061-0070/0067-la-ficha-ensena-el-codigo.md#hoja-de-ruta) |
| M48 | La ficha abre el editor y sus dependencias | cerrada | [ADR 0068](0061-0070/0068-la-ficha-abre-el-editor-y-sus-dependencias.md#hoja-de-ruta) |
| M49 | El lenguaje de la ficha, en todo el reporte | en curso | [ADR 0061](0061-0070/0061-el-marco-del-proyecto.md#hoja-de-ruta) |
| M50 | Dos pestañas: el fichero y el cambio | cerrada | [ADR 0069](0061-0070/0069-dos-pestanas.md#hoja-de-ruta) |
| M51 | Los ficheros del cambio, en una lista | cerrada | [ADR 0070](0061-0070/0070-los-ficheros-del-cambio-en-una-lista.md#hoja-de-ruta) |
| M52 | La tabla de Cambios va de base a head | no empezada | [ADR 0071](0061-0070/0071-la-tabla-de-cambios-va-de-base-a-head.md#hoja-de-ruta) |
| M53 | Cambios desde el último commit | cerrada | [ADR 0072](0071-0080/0072-cambios-desde-el-ultimo-commit.md#hoja-de-ruta) |
| M54 | Una sola interfaz | cerrada | [ADR 0073](0071-0080/0073-una-sola-interfaz.md#hoja-de-ruta) |
| M55 | Una sola sesión de análisis | cerrada | [ADR 0074](0071-0080/0074-una-sola-sesion.md#hoja-de-ruta) |
| M56 | Cambios es de git | cerrada | [ADR 0075](0071-0080/0075-cambios-es-de-git.md#hoja-de-ruta) |
| M57 | Las líneas no son código | cerrada | [ADR 0076](0071-0080/0076-las-lineas-no-son-codigo.md#hoja-de-ruta) |
| M58 | El diff, al abrir el fichero | cerrada | [ADR 0077](0071-0080/0077-el-diff-al-abrir-el-fichero.md#hoja-de-ruta) |
| M59 | Balance de deuda | cerrada | [ADR 0078](0071-0080/0078-el-balance-de-deuda.md#hoja-de-ruta) |
| M60 | El inspector con barra de actividad | cerrada | [ADR 0079](0071-0080/0079-el-inspector-con-barra-de-actividad.md#hoja-de-ruta) |

## Cómo se lee esto

- Una fase **nace en la hoja de ruta de su decisión** (`## Hoja de ruta` del ADR); aquí solo se le
  añade la línea.
- Una decisión que crece **agranda su hoja de ruta** y deja lo hecho en la **guía**, no en este
  fichero.
- Las ideas que todavía **no son fase** viven en la [guía](/guia/), por orden
  cronológico.
- El índice de las **decisiones** —con su fecha y su estado— está en [`docs/adr/index.md`](index.md).
