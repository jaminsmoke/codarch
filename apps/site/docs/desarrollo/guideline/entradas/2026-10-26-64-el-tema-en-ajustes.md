---
title: El tema, en Ajustes
date: "2026-10-26"
category: feature
verdict: idea
---

**Qué es**: elegir el tema de la app —claro, oscuro o el del sistema— en una sección **General** de Ajustes, con las hojas y los cuatro tokens del marco (ADR 0082) como palancas.

**Por qué**: hoy hay un solo tema: hojas claras y armazón oscuro. Quien trabaja de noche o en una pantalla mala no tiene cómo cambiarlo, y cuando el sistema va en oscuro el navegador puede forzar su modo oscuro sobre la página, que apaga los grises y se lleva por delante las lentes: el color del mapa y de la deuda dejan de significar lo mismo. Un tema propio conserva el significado porque elige los colores, no los invierte.

**Qué falta**: decidir dónde vive la preferencia —el `.codarch/` del repositorio, como el resto del estado (ADR 0050), o el almacenamiento de la app, como las secciones plegadas—; si el tema del escritorio sigue al del sistema operativo o se elige aparte; y cómo se comprueba el contraste de cada par, a mano con valores fijos o con una herramienta que lo mida. Eso último decide si entra una dependencia de estilos o de contraste, o si basta con anotar los ratios junto a los tokens.

**Tamaño**: una sección de Ajustes, tres opciones y una copia de la paleta. Lo caro no es el selector: es el segundo tema completo, con sus hojas, sus líneas y sus acentos comprobados sobre el fondo nuevo.
