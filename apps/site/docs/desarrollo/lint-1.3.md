---
title: El artefacto de lint 1.3
description: "Contrato de cobertura del lint. La medida vive en coverage, los hallazgos en files, y scopeHealth dice el estado de un fichero, una carpeta o el proyecto sin guardar nada más."
section: desarrollo
sidebar:
  label: Artefacto de lint 1.3
  order: 4
---

El esquema es **1.3**. Los nombres no cambian: `lint.repmod.json` para el código y `lint-rest.repmod.json` para los documentos. No hay estado guardado aparte ni salud por carpeta en el fichero. La vista que junta los dos se calcula al leer, con `scopeHealthMerged` ([ADR 0109](adr/0101-0110/0109-la-salud-del-lint-se-lee-junta.md)): no se escribe y no entra en el checksum.

La cobertura es la única verdad de **qué se miró**. `files` solo guarda hallazgos. La config sigue en `meta.tools` y `meta.systems`; quien consume deriva un bloque `config` y no lo duplica en el fichero.

Una ruta es relativa, con `/`, NFC por segmento y sin cambiar mayúsculas. Es la misma función al escribir, al leer y al buscar.

## El artefacto

```ts
type LintArtifact = {
  schemaVersion: "1.3"
  domain: "code" | "docs"
  meta: {
    checksum: string
    tools: string[]
    systems: { name: string; config: string | null; rules?: unknown[]; note?: string }[]
    tree?: string
  }
  files: Record<string, { errors: number; warnings: number; messages: LintMessage[] }>
  summary: {
    files: number
    errors: number
    warnings: number
    messages: number
    measured?: number
  }
  coverage: { tools: Record<string, ToolCoverage> }
}
```

`summary` es el ámbito de **proyecto** contado otra vez. `measured` solo aparece si la cobertura lo deriva. Un cero que no sale de una enumeración válida no se escribe.

Un 1.0, 1.1 o 1.2 se lee. En memoria queda en 1.3 con `coverage.legacy: true` y cada herramienta en `unknown` + `legacy-global`. `measured` no se hereda.

## Cobertura de una herramienta

```ts
type ToolCoverage =
  | { outcome: "enumerated"; measuredPaths: string[]; eligiblePaths: string[] | null }
  | { outcome: "unknown"; eligiblePaths: null; reasons: Reason[] }
  | { outcome: "failed" | "missing"; eligiblePaths: null; reasons: Reason[] }

type Reason = {
  code:
    | "legacy-global"
    | "tool-failed"
    | "tool-missing"
    | "unknown-eligibility"
    | "unknown-paths"
    | "not-eligible"
    | "not-found"
    | "no-eligible"
    | "freshness-unverified"
  text?: string
}
```

`measuredPaths: []` solo si la herramienta enumeró de verdad y no miró a nadie. Un parseo vacío o fallido no es esa lista: es `ok: false`.

```ts
type AdapterEnumeration =
  | { ok: true; measuredPaths: string[] }
  | { ok: false; reason: Reason }
```

ESLint y Checkstyle enumeran y dejan `eligiblePaths: null`. El código no llega a `complete`. oxlint, Biome, Ruff, go vet y dotnet quedan en `unknown` + `unknown-eligibility`; sus hallazgos se conservan.

## scopeHealth

```ts
scopeHealth(artifact | null, scope, snapshot?) => ScopeHealth

type Scope = { kind: "file" | "folder" | "project"; path: string }
type Snapshot = { treeHash: string | null; paths: readonly string[] }

type ScopeHealth = {
  domain: "code" | "docs"
  scope: Scope
  coverage: {
    state: "unmeasured" | "unknown" | "partial" | "complete"
    eligible: number | null
    measured: number | null
    byTool: Record<string, {
      state: "unmeasured" | "unknown" | "partial" | "complete"
      eligible: number | null
      measured: number | null
      reasons: Reason[]
    }>
    reasons: Reason[]
  }
  fresh: boolean | null
  counts: {
    errors: number
    warnings: number
    info: number
    findings: number
    filesWithFindings: number
  }
  affectedFiles: { path: string; counts: ScopeHealth["counts"] }[]
  messages: LintMessage[]
}
```

`messages` solo se rellena en un fichero. En carpeta y proyecto es `[]`.

Las cuentas son la suma exacta de `affectedFiles`, también en la raíz. Salen de los mensajes. La cobertura no las cambia: un `unknown` o un `partial` no tira un hallazgo válido.

Un número que no se sabe es `null`, nunca `0`. El `0` solo aparece cuando una enumeración válida lo dice.

`fresh` es ortogonal al estado. `true` si `meta.tree` es el checksum del snapshot (`cc.json` en código, `rest.cc.json` en documentos). `false` si los dos existen y no coinciden. `null` si no se puede comparar, y entonces entra `freshness-unverified`. Un árbol viejo no borra un `partial`.

Limpio de verdad solo si `complete` y `fresh === true` y `findings === 0` y `eligible > 0`. `fresh === null` se lee «frescura sin verificar»: no hubo comparación, y el motivo es `freshness-unverified`. `fresh === false` se lee «resultado de otro árbol / desactualizado». No son la misma frase.

## Estados

### unmeasured

No hubo medida. Sin artefacto, o la herramienta falló o no está, o el universo válido está vacío (`no-eligible`), o el fichero no entra (`not-eligible`) o el snapshot prueba que no está (`not-found`). No es «medido y limpio».

```json
{
  "domain": "code",
  "scope": { "kind": "project", "path": "" },
  "coverage": {
    "state": "unmeasured",
    "eligible": null,
    "measured": null,
    "byTool": {},
    "reasons": [{ "code": "freshness-unverified" }]
  },
  "fresh": null,
  "counts": { "errors": 0, "warnings": 0, "info": 0, "findings": 0, "filesWithFindings": 0 },
  "affectedFiles": [],
  "messages": []
}
```

### unknown

Algo se midió, o el artefacto es viejo, pero la cobertura no se puede cerrar. Siempre en 1.0–1.2 (`legacy-global`) y en un adaptador que no enumera (`unknown-eligibility`). ESLint con `eligiblePaths: null` también es `unknown`: hay `measured`, no hay universo, y no es `complete`.

```json
{
  "domain": "code",
  "coverage": {
    "state": "unknown",
    "eligible": null,
    "measured": 2,
    "byTool": {
      "eslint": {
        "state": "unknown",
        "eligible": null,
        "measured": 2,
        "reasons": [{ "code": "unknown-eligibility" }]
      }
    },
    "reasons": [{ "code": "unknown-eligibility" }, { "code": "freshness-unverified" }]
  },
  "fresh": null,
  "counts": { "errors": 0, "warnings": 0, "info": 0, "findings": 0, "filesWithFindings": 0 }
}
```

Con hallazgos a cero y `measured` conocido, la frase es «medidos, sin hallazgos, universo no verificado».

### partial

Hay una enumeración válida y otra herramienta falló, no está o no se sabe. Lo viejo del árbol no lo borra.

```json
{
  "coverage": {
    "state": "partial",
    "eligible": null,
    "measured": 1,
    "byTool": {
      "eslint": {
        "state": "unknown",
        "eligible": null,
        "measured": 1,
        "reasons": [{ "code": "unknown-eligibility" }]
      },
      "oxlint": {
        "state": "unmeasured",
        "eligible": null,
        "measured": null,
        "reasons": [{ "code": "tool-failed", "text": "la salida no es JSON" }]
      }
    },
    "reasons": [
      { "code": "tool-failed", "text": "la salida no es JSON" },
      { "code": "unknown-eligibility" }
    ]
  },
  "fresh": false
}
```

### complete

Todas las herramientas aplicables terminaron y el universo se conoce. En documentos, `eligiblePaths` y `measuredPaths` son los mismos documentos. En el código de esta entrega no se da: ESLint y Checkstyle no dicen el universo.

```json
{
  "domain": "docs",
  "coverage": {
    "state": "complete",
    "eligible": 2,
    "measured": 2,
    "byTool": {
      "codarch": {
        "state": "complete",
        "eligible": 2,
        "measured": 2,
        "reasons": []
      }
    },
    "reasons": []
  },
  "fresh": true,
  "counts": { "errors": 0, "warnings": 0, "info": 0, "findings": 0, "filesWithFindings": 0 }
}
```

Eso, con `eligible > 0` y `fresh === true`, es limpio y al día. Si `fresh` es `null`, la frase es «frescura sin verificar». Si es `false`, «resultado de otro árbol / desactualizado».

## Códigos

| Código | Cuándo |
|---|---|
| `legacy-global` | Artefacto 1.0–1.2. `measured` null. |
| `legacy-version` | Lo añade `scopeHealthMerged` a un legado. No está en el fichero. No pasa a `complete`. |
| `tool-failed` | El proceso escribió algo que no se pudo leer. |
| `tool-missing` | El comando no está. |
| `unknown-eligibility` | No se sabe a quién debía mirar. oxlint, Biome, Ruff, go vet, dotnet, y ESLint o Checkstyle con `eligiblePaths: null`. |
| `unknown-paths` | No hay snapshot, así que no se puede decir que el fichero no está. |
| `not-eligible` | El universo está probado y el fichero no entra. Estado `unmeasured`. |
| `not-found` | El snapshot prueba que el fichero no está. Estado `unmeasured`. |
| `no-eligible` | `eligiblePaths: []` válido. Estado `unmeasured`, `eligible: 0`. No es limpio. |
| `freshness-unverified` | `fresh` es `null`. No cambia el estado. |

`not-eligible` no se dice si el universo es `null`. `not-found` no se dice si no hay snapshot: entonces es `unknown` + `unknown-paths`.

## Documentos

La cobertura del resto es **por documento, no por regla**. Un documento entra en `eligiblePaths` y en `measuredPaths` aunque una regla no haya podido leer el frontmatter. Que el frontmatter falte o no se lea no es una revisión exhaustiva del texto: es un hallazgo de esa regla, y el documento sigue contando como medido. Una configuración o un asset no entra: nadie los juzgó.

## El riesgo

El índice no lee el artefacto entero. Lee `scopeHealth` de cada fichero y suma un término antes de gamma. La fórmula y los casos —`fresh` true, false y null, universo desconocido, no aplicable, no encontrado— están en [el riesgo](riesgo.md).
