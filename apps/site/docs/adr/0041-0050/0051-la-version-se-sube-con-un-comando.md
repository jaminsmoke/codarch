---
title: ADR 0051 — La versión se sube con un comando
description: "Semver mayor.menor.parche: por defecto sube el parche, menor y mayor se piden a mano, y la web lleva la misma versión que el escritorio. Los formatos no se suben solos."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: La versión se sube con un comando
  order: 51
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

ADR 0041 dejó una versión para el producto en `versions.json`, un manifiesto generado y un
comprobador que el CI ejecuta. Funcionaba, pero subir la versión seguía siendo a mano: tocar
`versions.json`, dejar que el comando la propague, acordarse del lock y decidir qué número tocaba.
Además:

- `apps/web` se quedaba en `0.0.0` aunque es una superficie del producto; la app enseñaba «web»
  cuando no había servidor.
- No había una forma de decir «sube el parche»: se escribía el número entero cada vez.
- Era fácil colar cambios ajenos en el commit del bump, o subir la versión desde una rama o con el
  árbol sucio.
- Los formatos (`cc.json`, reporte, config, historial, cadenas) son contratos: subirlos por inercia
  rompería la compatibilidad que prometen.

## Decisión

### 1. Semver, y se sube el parche por defecto

La versión es `mayor.menor.parche`. Lo normal es subir el **parche** (`0.3.2 → 0.3.3`). `menor` y
`mayor` se piden a mano, porque cambian la promesa: `0.4.0` y `1.0.0` no son un arreglo más.

Desde una prerelease, `patch` sale a la estable del mismo núcleo (`0.3.1-alpha.8 → 0.3.1`): es como
se cierra una tanda de alphas.

### 2. La versión la llevan las apps del producto

`package.json` de la raíz, CLI, escritorio, MCP y **web** llevan la versión del producto. Los
paquetes internos (`schema`, `parsers`, `ui`…) y el sitio se quedan en `0.0.0`: no se publican y no
tienen número propio. `npm run version` falla si alguno se pone una versión por su cuenta.

La web enseña la versión que sirve el CLI y, sin servidor, `PRODUCT_VERSION`. No hay un número que
subir aparte.

### 3. Un comando hace el bump

```bash
npm run release                  # parche: 0.3.2 → 0.3.3
npm run release -- minor         # menor:  0.3.2 → 0.4.0
npm run release -- major         # mayor:  0.3.2 → 1.0.0
npm run release -- 0.4.0-beta.1  # una versión exacta
npm run release -- --dry-run     # calcula y no toca nada
```

El comando exige estar en `main` y el árbol limpio; calcula la siguiente versión
(`nextProductVersion`), ejecuta `npm run version`, hace commit **solo** de los ficheros de versión y
hace push. El push es lo que ve el workflow del escritorio para publicar. Con `--no-push` se queda
commiteado.

El CLI sigue aparte (`npm run publish:cli`, necesita OTP) y el pin de la acción se actualiza después
de publicar (ADR 0041, §4).

### 4. Los formatos no se suben solos

`cc.json`, el reporte, `.codarch.yml`, el historial y el libro de cadenas son contratos con el
pasado: un lector viejo tiene que seguir entendiendo un fichero, y uno nuevo tiene que decir qué
versión escribe. Su número lo decide una persona cuando cambia el formato, con
`npm run version -- --schema` (o `--report`, `--config`, `--history`, `--chains`). Automatizarlos
sería prometer compatibilidad que no se ha revisado.

## Consecuencias

- Una release es un comando; el número no se teclea y el commit no se lleva nada de más.
- La web y el escritorio dicen la misma versión, salga de donde salga.
- Los paquetes internos no pueden desviarse en silencio.
- Sigue habiendo un paso manual para el CLI (OTP) y otro para el pin de la acción.

## Alternativas descartadas

- **Subir la versión en el CI en cada push a `main`:** una release por commit, sin poder agrupar
  cambios y con commits de bot. Si algún día se quiere, va detrás de una etiqueta en el PR.
- **Automatizar también los formatos:** rompería la compatibilidad que el producto promete.
- **Dejar la web en `0.0.0`:** es una superficie del producto; el número debe coincidir.
- **Versionar el sitio:** es documentación, no un artefacto con compatibilidad.

## Hoja de ruta

Sin fases abiertas: es una decisión de mantenimiento.

### Ideas abiertas

- Notas de release sacadas de la guía desde la última etiqueta, en vez del cuerpo genérico.
- Reintentar una release cuando la etiqueta existe pero le faltan artefactos.
- Auto-bump en el CI detrás de una etiqueta en el PR, si el paso manual molesta.
