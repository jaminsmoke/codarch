---
title: La publicación, en su canal
date: "2026-10-23"
category: docs
verdict: arreglo
---

**Qué era**: en GitHub solo se veía el release del escritorio. El CLI parecía no estar publicado y la
web no tenía release, aunque el CLI vive en npm y la web en Pages.

**Qué se hizo**: el README dice dónde está cada pieza y la release del escritorio enlaza a la web, npm
y la acción. La app web del mapa sigue dentro del CLI; no se duplica el paquete ni se inventa un
release para la web.

**Por qué**: cada pieza tiene su canal. Un release con instaladores no es lo mismo que un deployment
de Pages ni que un paquete de npm.

**Decisión**: [ADR 0032](../../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.md) y
[ADR 0034](../../adr/0031-0040/0034-la-web-del-proyecto.md). No cambia el producto ni el checksum.

**Veredicto**: **arreglo**, dentro de M23.
