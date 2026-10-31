---
title: "Lo que carga el config, en un fichero suelto"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**Qué era**: `npm run web:build` fallaba antes de empezar, y el build del escritorio con él:

```
Cannot find module '…/packages/schema/src/chains'
imported from '…/packages/schema/src/index.ts'
```

`vite.config.ts` importa `@codarch/plugin-api/build`, que importaba `findRepoConfig` de `@codarch/schema`.
Vite carga su configuración dejando los paquetes como externos, así que ese import lo resuelve el Node del
sistema: Node 24 quita los tipos de TypeScript sobre la marcha, pero resuelve los imports relativos
pidiendo la extensión. `index.ts` dice `from "./chains"` y ahí se acaba.

**Qué cambia**: el paquete expone lo que un build necesita saber de `.codarch/` sin arrastrar el paquete
entero: `@codarch/schema/artifacts` → `artifacts.ts`, un fichero suelto sin imports relativos.
`plugin-api/build.ts` lee de ahí `CONFIG_FILE_NAMES` y hace la búsqueda del fichero de configuración en
seis líneas; `@codarch/schema` sigue teniendo la suya, con la misma lista.

**Por qué así**: lo que carga una configuración corre antes que cualquier resolución de Vite, así que la
regla es que su grafo sea de ficheros sueltos o JavaScript. Copiar los dos nombres en `plugin-api` habría
sido más corto y es justo lo que el registro de nombres existe para evitar (ADR 0101): la lista se queda
en un sitio y el módulo que la necesita la importa.

**Verificado**: `web:build` escribe el bundle (Vite dice «built in 1.70s») y el del escritorio también (`184ms`);
typecheck y lint sin mensajes; la suite entera en verde. El gráfico de plugins no cambia: los manifiestos
salen de `.codarch.yml` igual que antes.

**Veredicto**: arreglo.
