# CodArch Desktop

App de escritorio de CodArch. Electron con su propia interfaz: **no importa nada de `apps/web`**.
Las dos apps no se importan la una a la otra ([ADR 0021](../../docs/adr/0021-0030/0021-app-de-escritorio.md));
lo que comparten es el motor y la presentación pura de `packages/ui`
([ADR 0043](../../docs/adr/0041-0050/0043-la-ui-compartida.md)).

Lo que es el mismo en las dos: el motor, los `packages/`. El modelo, las métricas y el checksum
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
└── renderer/      la interfaz (React), con las piezas puras de `@codarch/ui`
```

- El **proceso principal** hace el análisis con el mismo `analyzeRepository` que el CLI, así que el
  snapshot tiene el mismo checksum.
- El **preload** expone `window.codarch` con cuatro operaciones: `pickFolder`, `pickFile`,
  `analyze` y `readJson`. El renderer no tiene acceso a Node.
- El **renderer** dibuja el mapa con `@codarch/render/browser`, el mismo motor que la web.

## Instaladores

Se empaquetan con electron-builder, **sin firmar** (en Windows y macOS el sistema avisa al
instalador de que no viene de un desarrollador identificado; firmarlo cuesta dinero).

| Plataforma | Artefactos |
|---|---|
| Windows | `codarch-<versión>-setup.exe` (NSIS) y `codarch-<versión>-x64.exe` (portable) |
| macOS | `codarch-<versión>-x64.dmg` y `codarch-<versión>-arm64.dmg` |
| Linux | `codarch-<versión>-x86_64.AppImage` y `.deb` |

```bash
npm run package --workspace @codarch/desktop    # para la plataforma actual
npm run package:dir --workspace @codarch/desktop  # sin instalador, solo la carpeta
```

El workflow `.github/workflows/desktop.yml` los construye para los tres sistemas. El release lo crea
el propio workflow: al subir a `main` una versión nueva en `versions.json`, compara con el último
release `desktop-v*`; si es mayor, empaqueta y crea el tag y el release en la misma ejecución. No se
empuja `desktop-v*` a mano: el tag solo debe existir cuando los instaladores ya están construidos.

Un `workflow_dispatch` construye los instaladores para probarlos, pero solo publica si la versión es
mayor que la del último release.

En Windows hace falta la carga de trabajo de C++ de Visual Studio Build Tools: electron-builder
recompila los módulos nativos (tree-sitter) para el ABI de Electron.

## Límites

- No hay firma de código: macOS lo bloquea en la primera apertura y hay que abrirlo a mano.
- El icono es el de Electron por defecto.
- El menú es el de Electron con las acciones de CodArch añadidas: no hay todavía archivos recientes
  ni menú en el Dock de macOS.
- El proyecto abierto se recuerda en `localStorage` (como en la web), no en un fichero de
  configuración.
