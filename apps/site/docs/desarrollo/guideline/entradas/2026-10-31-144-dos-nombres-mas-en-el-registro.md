---
title: "El `.gitignore` y la configuración se escriben en un solo sitio"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: dos nombres más del producto repartidos por el código, y uno de ellos con un fallo real.
La línea `.codarch/` del `.gitignore` se añadía en **cuatro sitios** —`analyze`, `codarch lint`,
`serve` y el escritorio—, cada uno con su comprobación de «si la carpeta nace ahora». Y el nombre de la
configuración, `.codarch.yml` / `.codarch.yaml`, estaba en **seis**: addons, métricas, el registro de
plugins del build, `codarch installed`, el MCP y el lector de la web. Cinco buscaban los dos nombres;
el build de plugins **solo el `.yml`**, así que un repo con `.codarch.yaml` veía su `plugins:` y sus
addons ignorados en el bundle mientras `analyze` los leía. Ese es el fallo que esconde la duplicación:
no es que el código esté repetido, es que una copia se quedó atrás.

**Qué cambia**: los dos nombres entran en el registro del [ADR 0101](../../adr/0101-0110/0101-la-carpeta-es-del-producto.md).
`CONFIG_FILE_NAMES` declara los dos ficheros de configuración y `findRepoConfig(root)` los busca en
orden; de ahí salen `findProjectConfig` de métricas, los addons, el build de plugins, `codarch
installed` y el MCP. `ensureStateIgnored(root)` en `@codarch/parsers` es la única forma de tocar el
`.gitignore`: comprueba que `.codarch/` no exista y escribe `STATE_IGNORE_ENTRY`, y el CLI, `serve` y el
escritorio la llaman.

**Lo que no se toca, y por qué**: las listas de carpetas ignoradas siguen siendo siete. Se parecen
—todas llevan `node_modules`— pero no son lo mismo: el análisis respeta el `.gitignore` del repo y solo
excluye lo suyo; el lint salta `dist` al **buscar** su configuración, no al medir; `resolve` salta las
carpetas que no son paquetes del workspace; `source` niega las que no se sirven; y el servidor no
publica `coverage`. Unificarlas ahorraría seis líneas y rompería cinco comportamientos. La regla es
unificar lo que debe coincidir, no lo que se escribe igual.

**Verificado**: un repo con `.codarch.yaml` y `plugins:` compila su plugin (test nuevo en
`plugin-api`), `findRepoConfig` prefiere `.yml` cuando están los dos y devuelve `null` sin
configuración, y el registro no admite dos papeles con el mismo nombre ni nombres con rutas. El
`.gitignore` se añade una vez y no se toca si la carpeta ya existía (dos casos nuevos). Lint sin
mensajes, typecheck limpio, **1418 tests** en verde.

**Veredicto**: arreglo.
