---
title: Abrir el repo
date: "2026-10-22"
category: chore
verdict: fase
---

**Qué es**: que el código fuente de CodArch sea público. El código ya sale —el CLI está en npm
y la acción en su propio repo público—; lo que seguía privado era el repo y sus documentos.

**Por qué**: el **registro público de plugins** necesita que el repo sea público: nadie publica
un plugin en un repo que no puede ver. Y el **clean-room** (ADR 0001) se lee mejor cuando la
implementación está a la vista.

**Decisión**: [ADR 0033](../../adr/0031-0040/0033-abrir-el-repo.md). La licencia se queda en
**MIT**, la marca no se concede con ella, y antes de abrir van los papeles:
`SECURITY.md`, `CONTRIBUTING.md`, `NOTICE.md`, `TRADEMARK.md` y la nota de privacidad.

**Veredicto**: **fase M22**, en la hoja de
[ADR 0033](../../adr/0031-0040/0033-abrir-el-repo.md). Las medidas ya están y el repo es
público.
