---
title: Linux se actualiza sin contraseña
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: en Linux solo se publicaba el `.deb`. Instalar quedaba bien —entrada de menú, app en el sistema—, pero cada actualización pasa por `dpkg`/`apt` y la contraseña de administrador, y al terminar la app no puede volver a abrirse sola. El ADR 0045 había dejado el AppImage fuera con un argumento razonable pero incompleto: «es un ejecutable, no un instalador».

**Qué cambió**: el release publica `codarch-<versión>-x64.AppImage` junto al `.deb`, y el workflow sube también su `.blockmap`. Cuando la app corre como AppImage, al descargar la actualización pregunta **Reiniciar ahora** o **Al cerrar**; en el primer caso `quitAndInstall` escribe el binario nuevo en la carpeta del usuario y arranca la versión nueva, sin permisos. Con `.deb` todo sigue igual: la aplica el sistema al cerrar y pide permiso. El ADR 0045 queda revisado con su nota de por qué cambió la decisión.

**Números**: dos formatos en Linux en vez de uno y un artefacto más por release —con su `.blockmap`—; el `.deb` no cambia ni de nombre ni de contenido. Dos tests nuevos para saber cuándo la app puede reiniciarse sola (`canSelfRestart`).

**Veredicto**: [ADR 0045](../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md), hecho.
