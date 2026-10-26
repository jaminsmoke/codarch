---
title: CodArch no analiza el sistema
date: "2026-10-24"
category: security
verdict: adr
---

**Qué es**: una guarda que rechaza analizar la raíz de un volumen, las carpetas del sistema
operativo y la carpeta personal entera; y la regla escrita de que CodArch solo mira hacia abajo.

**Por qué**: con la vigilancia del escritorio (M34), elegir `C:\Windows` o `/usr` habría recorrido y
vigilado el sistema entero. No había nada que lo impidiera ni una regla sobre hacia dónde se mira.

**Qué cambió**: `protectedRootReason` en `@codarch/parsers` decide si una carpeta se puede analizar;
el CLI (`analyze`, `serve`) y el escritorio (analizar, restaurar, abrir con el sistema y vigilar) lo
comprueban antes. La carpeta elegida es el techo: no se buscan `.codarch` ni configuración hacia
arriba, y la vigilancia cubre exactamente esa raíz. Para decidir se resuelve la ruta real, pero la
raíz analizada no se normaliza ni se reescribe; los enlaces simbólicos no se siguen.

**Veredicto**: **ADR 0052**, sin fase abierta; es una guarda de seguridad.
