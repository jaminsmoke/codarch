---
title: La carpeta .codarch solo guarda el estado
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: limpiar la `.codarch/` de este repositorio de desarrollo. Tenía **752 MB**: perfiles de
Chromium de las pruebas con la app real (`chrome-cdp*`, decenas de MB cada uno), capturas, fixtures,
repos de mentira, scripts sueltos y un `.codarch` dentro de `.codarch`. Quedan **1,5 MB** con los cinco
ficheros que le tocan.

**Por qué**: `.codarch/` no es un cajón de pruebas. Desde el ADR 0048 y el ADR 0050 es el **estado del
repositorio analizado**, y viaja con cada repo, no con la app; lo que es de la app vive en su ruta de
instalación (`userData` del escritorio, `localStorage` de la web). Y está en `.gitignore` (ADR 0050),
así que nada de eso se estaba versionando: solo ensuciaba el disco y el análisis —cada `.codarch/`
nuevo se ignora, pero los 752 MB estaban ahí—.

**Qué queda** (lo que escriben el CLI y las apps para este repo):

| Fichero | Quién lo escribe |
|---|---|
| `snapshot.cc.json` | `codarch analyze` y el escritorio |
| `map.html` | `codarch analyze` |
| `report.json` | el análisis de PR |
| `preferences.json` | la vista del repo (ADR 0053) |
| `chains.json` | el libro de cadenas, derivado (ADR 0026) |

Y fuera de `.codarch/`: `.codarch.yml` (la configuración, versionada) y `.codarch-history/` (las fotos
del historial, compartidas, ADR 0024).

**La regla**: las sondas y las capturas de las pruebas van al **temporal del sistema**, no al repo. El
`.codarch/` de un proyecto solo tiene lo que va a leer la app.

**Veredicto**: arreglo de higiene; no necesita ADR.
