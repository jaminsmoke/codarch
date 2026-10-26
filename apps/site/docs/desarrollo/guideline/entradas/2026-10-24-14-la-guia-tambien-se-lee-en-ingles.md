---
title: La guía también se lee en inglés
date: "2026-10-24"
category: docs
verdict: fase
---

**Qué es**: traducir la guía entera. Las entradas y las normas de `/en/guia/` dejan de ser el texto
español con un aviso encima y pasan a ser contenido inglés revisado. El aviso desaparece.

**Por qué**: la guía es el changelog del producto y la página que más se lee después de la portada.
Media guía traducida con un aviso era peor que no ofrecerla: quien entraba en inglés se encontraba
con un cartel que le pedía volver al español.

**Qué cambió**: cada entrada tiene su versión en `docs/en/guideline/entradas/` con el mismo nombre
de fichero, y las normas en `docs/en/guideline/normas.md`. La guía se carga por idioma
(`cargarGuia("en")`, colección `guiaEn`) y sus enlaces llevan a `/en/docs/...`: al ADR y no a la
versión española. Las fechas, categorías y veredictos ya se formateaban en el idioma de la página.
Un test comprueba que los dos directorios tienen exactamente las mismas entradas, así que añadir
una idea sin su traducción rompe la suite.

**Cobertura**: la guía, al 100 % (36 entradas y las normas). Los documentos siguen en 8 de 58
páginas: los 50 ADR son lo que falta. La interfaz no cambia.

**Veredicto**: **fase M31**, con la hoja de ruta en
[ADR 0046](../../adr/0041-0050/0046-los-documentos-con-starlight.md#m31--el-sitio-en-dos-idiomas).
