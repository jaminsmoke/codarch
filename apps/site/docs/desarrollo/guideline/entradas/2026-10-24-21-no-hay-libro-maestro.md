---
title: No hay libro maestro fuera del repositorio
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: una pasada por todo lo que CodArch guarda, para confirmar que cada repositorio lleva su
propio estado y que en la ruta de la app no queda ningún libro maestro de proyectos.

**Por qué**: había dudas de si el snapshot, el libro de cadenas o la configuración vivían también en
la ruta nativa de CodArch. Y había un caso que mezclaba estados: abrir un `cc.json` suelto dejaba
`lastRoot` apuntando al repo anterior, así que su historial y sus cadenas se enseñaban con otro
snapshot y un reporte suelto podía acabar escrito en el `.codarch/` de aquel repo.

**Qué cambió**: el proceso principal deja de vigilar y olvida la raíz cuando lo que se abre es un
fichero suelto, y el adaptador no lo guarda como proyecto. Queda comprobado con tests que el libro de
cadenas vive en `<repo>/.codarch/chains.json`, el historial en `<repo>/.codarch-history/` y que el
proceso principal no escribe estado en el perfil de la app. En el perfil solo quedan las preferencias
de vista, los plugins activados y la última raíz: son de la máquina, no del proyecto.

**Veredicto**: arreglo, dentro de
[ADR 0050](../../adr/0041-0050/0050-el-repositorio-guarda-su-estado.md).
