# CodArch Desktop

App de escritorio de CodArch. Electron con su propia interfaz: **no importa nada de `apps/web`**.
Las dos apps se desarrollan por separado y ninguna depende de la otra
([ADR 0021](../../docs/adr/0021-app-de-escritorio.md)).

Lo que sí es el mismo en las dos: el motor, los `packages/`. El modelo, las métricas y el checksum
son la verdad del producto y llegan igual a la web y al escritorio.

## Qué aporta frente a la web

- **Analiza contra el disco de verdad**, con git: el snapshot lleva churn y no hay límites de
  memoria ni de permisos del navegador.
- **Diálogos nativos** para elegir carpeta o fichero.
- **Menú nativo y atajos**: `Cmd/Ctrl+O` analiza una carpeta, `Cmd/Ctrl+Shift+O` abre un JSON.
- **"Abrir con"**: al abrir una carpeta, un `cc.json` o un `report.json` desde el explorador de
  archivos, la app lo analiza y lo muestra.

## Uso

```bash
npm install                 # instala las dependencias del monorepo y el binario de Electron
npm run desktop:build       # proceso principal + preload + renderer
npm run desktop:start       # abre la app
```

Electron 45 no trae script de instalación: su binario se baja la primera vez que se usa el CLI. El
`postinstall` de este workspace lo adelanta, así que `npm install` deja todo listo. El download está
en la caché de Electron, así que repetirlo no cuesta nada.

## Cómo está montado

```
src/
├── main.ts        proceso principal: ventana, diálogos y análisis en proceso
├── preload.ts     puente: lo único que el renderer puede usar
└── renderer/      la interfaz (React), copia propia de la de la web
```

- El **proceso principal** hace el análisis con el mismo `analyzeRepository` que el CLI, así que el
  snapshot tiene el mismo checksum.
- El **preload** expone `window.codarch` con cuatro operaciones: `pickFolder`, `pickFile`,
  `analyze` y `readJson`. El renderer no tiene acceso a Node.
- El **renderer** dibuja el mapa con `@codarch/render/browser`, el mismo motor que la web.

## Límites

- Todavía no hay instalador firmado ni empaquetado para publicar: se ejecuta con `electron .`.
- El menú es el de Electron con las acciones de CodArch añadidas: no hay todavía archivos recientes
  ni menú en el Dock de macOS.
- El proyecto abierto se recuerda en `localStorage` (como en la web), no en un fichero de
  configuración.
