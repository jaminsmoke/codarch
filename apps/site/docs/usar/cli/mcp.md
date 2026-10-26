---
title: "codarch-mcp"
description: "El servidor MCP de CodArch: un binario aparte, de solo lectura y por stdio."
section: producto
sidebar:
  label: "mcp"
  order: 27
---

El MCP **no es un subcomando** de `codarch`: es un binario aparte, `codarch-mcp`, que un agente
arranca por stdio. Lee un snapshot ya generado (con [`codarch analyze`](/docs/usar/cli/analyze/)) y,
si existen, los reportes del diff. Las herramientas que expone están en [MCP](/docs/mcp/).

:::note
El paquete `codarch` de npm instala solo el binario `codarch`. Hoy `codarch-mcp` se ejecuta desde
un clon del repositorio (`apps/mcp/bin/codarch-mcp.mjs`, tras `npm ci`).
:::

## Uso

```sh
node apps/mcp/bin/codarch-mcp.mjs [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `-s, --snapshot <file>` | Snapshot cc.json. Por defecto `.codarch/snapshot.cc.json`. |
| `-r, --report <file>` | `report.json` del diff. Por defecto `.codarch/report.json`. |
| `--no-report` | No carga reporte. |
| `--head-report <file>` | Reporte del working tree contra HEAD. Por defecto `.codarch/head-report.json`; manda sobre `--report`. |
| `--no-head-report` | No carga ese reporte. |
| `--root <dir>` | Raíz del proyecto. Por defecto el cwd. |
| `-h, --help` | Ayuda. |
| `-v, --version` | Versión. |

## Salida

stdout queda reservado para el protocolo MCP; los mensajes de estado (`codarch-mcp <versión> listo: …`
y los errores) van a stderr. Configuración de ejemplo para un cliente MCP:

```json
{
  "command": "node",
  "args": ["/ruta/repo/apps/mcp/bin/codarch-mcp.mjs",
           "--root", "/ruta/repo",
           "--snapshot", ".codarch/snapshot.cc.json",
           "--report", ".codarch/report.json"]
}
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Ayuda o versión impresas, o el servidor terminó con normalidad. |
| `1` | Opción inválida, o no se pudo cargar el snapshot o arrancar el servidor. |
