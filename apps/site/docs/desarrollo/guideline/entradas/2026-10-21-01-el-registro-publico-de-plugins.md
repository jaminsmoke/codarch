---
title: El registro público de plugins
date: "2026-10-21"
category: feature
verdict: idea
---

**Qué es**: que terceros publiquen plugins y que las apps los puedan instalar. Hoy los plugins
son **del repo**: un equipo que escribe una regla para todo el mundo tiene que repartirla como
código.

**Por qué**: el valor de los plugins está en que los use **gente que no es CodArch**.

**Qué falta**: la confianza. Un plugin es código arbitrario → hace falta **firma** (quién
lo publica), un **registro** (dónde se busca) y una **política de versiones** (qué pasa
cuando el plugin cambia el snapshot → el checksum).

**Veredicto**: **fase + ADR**. Es una decisión de producto (abrir la puerta a terceros) y
afecta a la distribución.

**Una mitad ya está resuelta**: los **addons**
([ADR 0029](../../adr/0021-0030/0029-los-addons.md)) son **datos** —perfiles, reglas y vistas
guardadas— y repartir datos no necesita firmar código: basta un zip y un hash (véase
*Los addons*). Lo que sigue haciendo falta es **firmar y distribuir plugins** (código), que es
la otra mitad.

**Tamaño**: medio. Lo difícil no es el registro (un índice y un endpoint) sino la firma y
las reglas.
