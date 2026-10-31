---
title: "El proceso principal del escritorio, por responsabilidad"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `apps/desktop/src/main.ts` tenía **1160 líneas** y siete trabajos: crear la ventana, tender el
puente con el renderer, vigilar el repo, reanalizar, escribir `.codarch/`, abrir carpetas y ficheros, el
menú nativo, los diálogos del sistema, dieciséis manejadores de IPC y las actualizaciones. Todo eso con
estado mutable en el ámbito del módulo (`window`, `lastRoot`, `repositoryWatcher`, `storedChecksums`) que
cualquier función podía tocar. Nada de eso se podía probar sin arrancar Electron: las pruebas que había
leían el fichero como texto.

**Qué cambia**: el fichero se parte por costura, no por tamaño:

| Módulo | Qué es |
|---|---|
| `main.ts` (126 líneas) | el ciclo de vida y el cableado |
| `window.ts` | la ventana, el título y los envíos al renderer |
| `persistence.ts` | todo lo que se lee y se escribe en `.codarch/` |
| `live.ts` | el vigilante y la decisión de reanalizar (ADR 0056) |
| `targets.ts` | abrir una carpeta o un JSON |
| `menu.ts` / `menu-template.ts` | el menú, con la plantilla como dato puro |
| `dialogs.ts` | los diálogos del sistema |
| `ipc.ts` | la puerta del renderer, con sus dieciséis manejadores |
| `updater.ts` | comprobar, descargar e instalar |
| `session.ts` | la raíz abierta y el proceso que analiza |

La dependencia va en un sentido: `main` cablea, los módulos no se conocen entre sí más que por lo que
necesitan. `live` y `targets` reciben sus funciones —enviar, avisar, analizar— en vez de leer globales.

**Por qué así**: lo que no se puede probar se rompe sin que nadie lo vea. La persistencia, el menú, abrir
una ruta y la decisión de reanalizar no necesitan Electron: ahora tienen 29 pruebas nuevas con repositorios
de verdad en un directorio temporal y analizadores de mentira. Y `main.ts` dice de un vistazo qué piezas
existen.

**Verificado**: 169 ficheros y **1447 tests** en verde (eran 1418), lint sin mensajes, typecheck limpio y
el build del proceso principal (`build:main`) escribe sus tres bundle. El menú se comprueba por plataforma
—mnemónicos en Linux y Windows, menú de aplicación en macOS, atajos y acciones—, la persistencia contra
`.codarch/` real, y el repo vivo en sus cuatro decisiones: nada nuevo, snapshot nuevo, solo el resto, o
nada que hacer.

**Dos cosas que se ven al partir**: el manejador `codarch:analyze` escribía artefactos sin limpiar la
carpeta (ahora limpia, como el resto de pasadas), y la ventana cerrada dejaba una referencia viva que
cualquier envío posterior habría usado (ahora se suelta al cerrarse).

**Veredicto**: arreglo.
