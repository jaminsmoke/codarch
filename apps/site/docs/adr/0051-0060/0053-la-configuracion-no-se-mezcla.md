---
title: ADR 0053 — La configuración de la app no se mezcla con la del repo
description: "El proyecto vive siempre en su repositorio. Las preferencias y los plugins activados son de la máquina: localStorage en la web, el perfil de Electron en el escritorio. La carpeta de instalación no guarda estado y Docker no tiene configuración propia."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: La configuración de la app no se mezcla con la del repo
  order: 53
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

CodArch se instala de tres formas y conviene que las tres digan lo mismo sobre qué se guarda y
dónde:

- la **web servida por el CLI** instalado con npm;
- la **web en Docker**;
- el **escritorio** con su instalador (no hay ejecutable portable).

El proyecto ya vive en su repositorio (ADR 0050). Pero la configuración de la app —preferencias de
vista, plugins activados y la última raíz— no tenía una regla escrita por distribución, y había
dudas razonables: si el escritorio debe guardarla en su carpeta de instalación, si Docker puede
tenerla en un volumen y si los plugins y addons se instalan en la app o en el repo.

## Decisión

### 1. Lo del proyecto, en el repositorio

`.codarch.yml`, `.codarch/`, `.codarch-history/`, `plugins/` y `addons/` son del repositorio
analizado, con cualquier distribución. La app no guarda una copia maestra de nada de eso.

### 2. Lo de la máquina, en su almacén local

Las preferencias de vista del repositorio viven además en el propio repo, en
`.codarch/preferences.json`, y mandan sobre las de la máquina. Los plugins activados y la última
raíz viven en el almacén de la plataforma:

- **web** (npm o Docker): el `localStorage` del navegador;
- **escritorio**: el perfil de Electron (`app.getPath("userData")`, hoy
  `%APPDATA%\@codarch\desktop` en Windows).

**La carpeta de instalación no guarda estado.** Las actualizaciones la reemplazan, y en muchos
sistemas ni siquiera es escribible por el usuario. Lo instalado es código; lo configurado es del
usuario.

### 3. La web con npm no tiene estado de servidor

El CLI sirve la app y analiza; no guarda configuración. Abrir un `cc.json` a mano deja una copia de
comodidad en `localStorage` (con tope de tamaño), pero la verdad sigue siendo el `.codarch/` del
repo cuando lo hay.

### 4. Docker es sin estado

El contenedor no tiene configuración propia ni un volumen para ella: las preferencias están en el
navegador de quien lo abre. El repositorio se monta en **solo lectura** (ADR 0044), así que `serve`
no escribe el análisis; el libro de cadenas es una caché opcional y, si no puede escribir, se
calcula y se devuelve igual. Si algún día hace falta configuración de servidor, será una decisión
aparte con su volumen.

### 5. Plugins y addons son del repo, no de la app

- Un **plugin es código del repositorio** (`plugins/<nombre>/`), se declara en `.codarch.yml` y se
  compila en el build (ADR 0028). Instalarlo es copiarlo al repo (ADR 0030); **activarlo** es de la
  máquina y se guarda donde las preferencias. No hay una carpeta de plugins de la app: cargar
  código desde fuera del repo se saltaría el modelo de seguridad y la promesa de que el checksum
  depende del código.
- Un **addon es conocimiento declarativo** (`addons/<nombre>/`), también en el repo y declarado en
  `.codarch.yml` (ADR 0029). No se compila y funciona en las tres distribuciones.

Consecuencia práctica: la web de npm y la de Docker enseñan los plugins que van compilados en el
paquete publicado (hoy, la vista 3D). Los plugins propios de un repo necesitan construir la app
desde ese repo; es una limitación de v1, no un fallo.

### 6. macOS, cuando exista

El perfil irá a `~/Library/Application Support/CodArch`, no dentro del `.app`, que también se
reemplaza al actualizar.

## Consecuencias

- Una sola verdad por proyecto y tres almacenes locales pequeños para las preferencias.
- Actualizar la app no borra la configuración.
- Docker sigue siendo de solo lectura y sin estado; no hay un volumen que mantener.
- Instalar un plugin es una operación del repo, no de la app; una tienda de plugins de la app
  requeriría cargar código externo con sandbox y su propio ADR.

## Alternativas descartadas

- **Guardar la configuración en la carpeta de instalación:** las actualizaciones la reemplazan y en
  Windows `Program Files` no es escribible. Se perdería en cada versión.
- **Un volumen de Docker para la configuración:** las preferencias son del navegador, no del
  contenedor; un fichero de servidor sería una función nueva, no persistencia de lo que ya hay.
- **Plugins instalados en la app:** saltaría ADR 0028 y haría que el mismo repo se viera distinto
  según la máquina.
- **Una configuración global compartida entre escritorio y web:** cada superficie tiene su almacén y
  sus permisos; compartirla obligaría a un servicio.

## Hoja de ruta

Sin fases abiertas: es una decisión de arquitectura de la entrega.

### Ideas abiertas

- Una tienda de plugins de la app, si se decide cargar código externo con sandbox.
- Configuración de servidor para Docker, si un equipo la pide.
