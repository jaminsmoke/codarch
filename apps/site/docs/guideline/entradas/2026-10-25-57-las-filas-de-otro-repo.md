---
title: Las filas de otro repo
date: "2026-10-25"
category: fix
verdict: arreglo
---

**Qué era**: la app arrastraba datos del repositorio anterior. **Historia** seguía enseñando las fotos del que abriste antes y **Más reescritos** mostraba diez filas con 0 —o las de otro proyecto— incluso en una carpeta vacía, porque los dos paneles cargan una vez al montarse y nunca volvían a preguntar. El título de la ventana se quedaba además con la carpeta del primer repo, y era la carpeta y no el proyecto. En la CLI, `analyze` avisaba de que no hay TS/JS pero terminaba con código 0, y llamaba «sin git» a un repo git que no tenía ficheros TS/JS. Y el menú del escritorio ponía «Ctrl+Comma», que es como Electron pinta el atajo de la coma.

**Qué cambió**: Historia y calor llevan una `key` por proyecto, así que se remontan al abrir otro repo y vuelven a preguntar; el calor solo lista símbolos que se han reescrito alguna vez (ruido mayor que 0), que es justo lo que la lista promete. El título manda el nombre del proyecto del snapshot —`CodArch · <proyecto>`—, con la carpeta como respaldo, y se fija también en `document.title` porque hay gestores de ventanas en Linux que solo hacen caso a ese. `analyze` sale con código 1 cuando no hay TS/JS que dibujar y el churn dice «sin ficheros TS/JS» en vez de «sin git». Ajustes pierde el atajo pintado en el menú; `Ctrl+,` (Cmd en mac) lo atiende la UI y abre el diálogo en la web y en el escritorio.

**Números**: tres ficheros de UI, dos del escritorio y uno de la CLI; cuatro tests nuevos o ajustados (calor sin ceros, título con nombre de proyecto, `analyze` con código 1). Ni `cc.json`, ni el checksum, ni `report.json` cambian.

**Veredicto**: arreglo, hecho. Lo que no se arregla desde el paquete: instalar con Node 20 seguirá fallando al compilar `tree-sitter` —hace falta Node 22— y en Linux la actualización depende del `.deb`, porque el AppImage no se publica (ADR 0045).
