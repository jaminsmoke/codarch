---
title: Actualizar desde la ventana
date: "2026-10-24"
category: feature
verdict: arreglo
---

**Qué es**: un botón **Actualizar y reiniciar** en **Ajustes → Actualizaciones** que descarga la
versión nueva, la instala y vuelve a abrir la app.

**Por qué**: el escritorio ya avisaba de que había una versión nueva, pero solo ofrecía el enlace a
la release. Para actualizar había que bajar el instalador otra vez, que es justo lo que la
actualización automática quería evitar. El actualizador descargaba en segundo plano y aplicaba al
cerrar, pero desde la ventana no se podía hacer nada.

**Qué cambió**: el proceso principal expone `codarch:install-update`. Comprueba si hay versión
nueva, descarga (si no estaba ya descargada), y llama a `quitAndInstall` con reinicio: la app se
cierra, se aplica el paquete y se abre la versión nueva. El botón cuenta lo que pasa
(**Descargando…**, **Reiniciando…**) y, si algo falla, lo dice en los ajustes. Donde la app no puede
instalarse sola (desarrollo y macOS) el botón no aparece y se queda el enlace a la release.

**Veredicto**: **arreglo**, dentro de
[ADR 0045](../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md) (M28).
