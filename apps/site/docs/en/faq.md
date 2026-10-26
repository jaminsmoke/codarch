---
title: "FAQ"
description: "Common questions: what to install, the web app, Docker, unsigned installers and privacy."
section: usar
sidebar:
  label: "FAQ"
  order: 100
---

## What do I install?

One of the three [Installation](installation.md) paths: the CLI with the web app (`npm i -g codarch`),
the web app alone with Docker, or the desktop app. All three produce the same `cc.json` with the same
checksum.

## Does `codarch serve` install the web app?

No. The web app already comes with `npm i -g codarch`; `codarch serve` only opens it and analyses the repo.

## Does the web app analyse in the browser?

No. It analyses through `codarch serve`, on your machine or inside the Docker container.

## Do I need to clone the CodArch repo to use Docker?

No: the `ghcr.io/jaminsmoke/codarch-web:latest` image and `docker run` are enough (see
[Web app](webapp.md)). `docker compose up --build` is only for those who cloned the repository.

## Windows or Linux warn that the installer is not signed

That is expected: the installers are **unsigned** because signing costs money and the project is in
alpha. On Windows, SmartScreen may say the app is not from an identified developer: click **More info
→ Run anyway**. On Linux, the AppImage needs execute permission (`chmod +x codarch-*.AppImage`).
Always download from the [official Releases](https://github.com/jaminsmoke/codarch/releases).

> 📸 **Pending screenshot (faq-smartscreen):** the Windows SmartScreen warning when opening
> `codarch-<version>-setup.exe`, with **More info** already clicked and the **Run anyway** button visible.

## Is there a macOS version?

No. Without signing or notarisation Gatekeeper blocks the app and the updater cannot apply it. On
macOS use the CLI or Docker.

## Does CodArch upload my code anywhere?

No. The analysis is local; the web app and the container listen on loopback only, and the MCP is
read-only over stdio.

## Why does the checksum change?

Because the code or the configuration that analyses it changed. It does not depend on the date, the
machine or who is looking: the map in the PR, in CI and in the agent is the same.
