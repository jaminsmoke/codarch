---
title: "App de escritorio"
description: "Instaladores para Windows y Linux: el mismo mapa, analizando con git contra el disco."
section: usar
sidebar:
  label: "App de escritorio"
  order: 50
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
| Linux | `codarch-<versión>-x64.AppImage` | se ejecuta sin instalar nada (`chmod +x` y abrir) |

macOS no se publica: sin firma ni notarización, Gatekeeper bloquea la app. Los instaladores van **sin
firmar**; ver [Preguntas frecuentes](faq.md#windows-o-linux-avisan-de-que-el-instalador-no-está-firmado).

> 📸 **Captura pendiente (escritorio-release):** la página de la última release en GitHub con la
> lista de assets (`.exe`, `.deb`, `.AppImage`) visible.

## Qué aporta frente a la webapp

- **Diálogos nativos** para elegir carpeta o fichero.
- **Menú nativo y atajos**: `Ctrl+O` analiza una carpeta, `Ctrl+Shift+O` abre un JSON.
- **"Abrir con"**: abrir una carpeta, un `cc.json` o un `report.json` desde el explorador la analiza y
  la muestra.
- El estado del repo se guarda en su carpeta `.codarch/`.

> 📸 **Captura pendiente (escritorio-mapa):** la app de escritorio en Windows recién analizada una
> carpeta con `Ctrl+O`, el mapa dibujado y el menú **Archivo** desplegado.

## Actualizar

La app busca versiones nuevas en las Releases y se actualiza sola. El AppImage lo hace sin permisos;
el `.deb` pide la contraseña de administrador, como cualquier paquete. Ver
[Actualizaciones](updates.md).
