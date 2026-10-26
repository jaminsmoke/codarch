---
title: Tres instalaciones, tres sitios para las preferencias
date: "2026-10-24"
category: chore
verdict: adr
---

**Qué es**: dejar escrito dónde vive cada cosa en las tres formas de instalar CodArch —npm, Docker y
escritorio— y por qué la carpeta de instalación no guarda estado.

**Por qué**: había dudas razonables. Si el escritorio debía guardar su configuración en la carpeta de
instalación, si Docker podía tenerla en un volumen y si los plugins y addons se instalan en la app o
en el repositorio.

**Qué quedó decidido**: el proyecto vive siempre en su repo (`.codarch.yml`, `.codarch/`,
`.codarch-history/`, `plugins/` y `addons/`). Las preferencias, los plugins activados y la última
raíz son de la máquina: `localStorage` en la web y el perfil de Electron en el escritorio. La carpeta
de instalación solo tiene código porque las actualizaciones la reemplazan. Docker no tiene estado ni
volumen de configuración: el repo se monta en solo lectura y el libro de cadenas, que es una caché,
se calcula y se devuelve aunque no pueda escribir. Los plugins son código del repo y se compilan
(ADR 0028); los addons son declarativos y funcionan en las tres. Instalar un plugin en la app no
existe en v1 y necesitaría cargar código externo con sandbox y su propio ADR.

**Veredicto**: [ADR 0053](../../adr/0051-0060/0053-la-configuracion-no-se-mezcla.md), sin fase
abierta; es arquitectura de la entrega.
