---
title: "App de escritorio"
description: "Instaladores para Windows y Linux: el mismo mapa, analizando con git contra el disco."
section: usar
sidebar:
  label: "App de escritorio"
  order: 41
---

La app de escritorio es CodArch en una ventana nativa (Electron). Analiza con el mismo motor que el
CLI, así que el snapshot tiene el mismo checksum, pero lo hace contra el disco de verdad y con git:
el snapshot lleva churn y no hay límites del navegador.

## Instalar

Descarga el instalador de tu sistema desde las
[Releases del repositorio](https://github.com/jaminsmoke/codarch/releases):

| Sistema | Fichero | Qué hace |
|---|---|---|
| Windows | `codarch-<versión>-setup.exe` (NSIS) | instala por usuario en `%LOCALAPPDATA%\Programs\CodArch`, sin pedir administrador |
| Linux | `codarch-<versión>-amd64.deb` | instala la app en el sistema, con su entrada de menú |
| Linux | `codarch-<versión>-x86_64.AppImage` | se ejecuta sin instalar nada (`chmod +x` y abrir) |

macOS no se publica: sin firma ni notarización, Gatekeeper bloquea la app. Los instaladores van **sin
firmar**; ver [Preguntas frecuentes](preguntas-frecuentes.md#windows-o-linux-avisan-de-que-el-instalador-no-está-firmado).

![La release v0.3.37 en GitHub con sus instaladores: .deb, setup.exe y AppImage](../images/escritorio-release.png)

## La ventana

La ventana muestra la misma interfaz que la [webapp](webapp.md): el panel VISTA, el mapa y el
inspector.

![La app de escritorio con un repo abierto](../images/escritorio-ventana.png)

## Menús Archivo, Edición, Ver y Ayuda

Además de la interfaz, la app tiene menús nativos: **Archivo**, **Edición**, **Ver** y **Ayuda**.

![La barra de menús nativa con el menú Archivo desplegado](../images/escritorio-menus.png)

## Elige la carpeta del repositorio

Para analizar un repo, ábrelo desde el menú Archivo o desde **ABRIR REPOSITORIO O ARCHIVO**. Se abre
el diálogo nativo **Elige la carpeta del repositorio**.

- **Atajos**: `Ctrl+O` analiza una carpeta, `Ctrl+Shift+O` abre un JSON.
- **Una ruta al arrancar**: la app acepta como argumento una carpeta, un `cc.json` o un `report.json`
  y lo abre nada más arrancar. Los instaladores no registran asociaciones de ficheros, así que la app
  no sale sola en «Abrir con»: elígela a mano en ese menú del explorador o pásale la ruta desde un
  terminal (`/opt/CodArch/codarch /ruta/al/repo` con el `.deb`, `./codarch-<versión>-x86_64.AppImage /ruta/al/repo`
  con el AppImage).

![El diálogo «Elige la carpeta del repositorio»](../images/escritorio-abrir-carpeta.png)

![La app de escritorio en Linux tras analizar una carpeta, con el mapa dibujado y el menú Archivo desplegado](../images/escritorio-mapa.png)

## La carpeta .codarch/

El estado del repo se guarda en su carpeta `.codarch/`, no en la app. Lo que escribe CodArch ahí:

| Fichero | Qué es |
|---|---|
| `snapshot.cc.json` | el último snapshot |
| `head-report.json` | lo tocado desde el último commit |
| `report.json` | el reporte de un diff, solo si se ha cargado uno |
| `chains.json` | el libro de cadenas de símbolos |
| `preferences.json` | las preferencias de la vista |

Las fotos del historial no van aquí, sino en `.codarch-history/`, en la raíz del repo. Un mapa
estático tampoco: [`codarch render`](cli/render.md) copia la webapp entera a la carpeta que le digas,
con el snapshot en `data/snapshot.cc.json`.

![`ls -la .codarch/` en un terminal del repo de ejemplo, con snapshot.cc.json, head-report.json, chains.json y preferences.json; el map.html que también aparece es un resto de esa copia de trabajo y CodArch no lo escribe](../images/escritorio-codarch-carpeta.png)

## Ajustes › Actualizaciones

Las actualizaciones solo aparecen en **Ajustes › Actualizaciones**: ahí se ve la versión instalada y
si está al día. No hay banner; si hay una versión nueva, el aviso sale en esa sección. El AppImage se
actualiza sin permisos; el `.deb` pide la contraseña de administrador, como cualquier paquete. Ver
[Actualizaciones](actualizaciones.md).

![Ajustes › Actualizaciones con la versión 0.3.37 al día](../images/escritorio-actualizaciones.png)
