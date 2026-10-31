import type { MenuItemConstructorOptions } from "electron";

/**
 * La plantilla del menú nativo, como dato puro.
 *
 * Vive aparte del `Menu` de Electron —solo un tipo, que no llega al
 * runtime— para poder comprobarla en las pruebas: rótulos, atajos y roles, y
 * que cada entrada llame a su acción. Los `role` traen su rótulo en inglés; aquí
 * se les pone el nuestro.
 */

export interface MenuActions {
  /** «Analizar carpeta…»: abre el diálogo y analiza lo elegido. */
  analizarCarpeta(): void;
  /** «Abrir cc.json…»: abre el diálogo y pinta lo elegido. */
  abrirFichero(): void;
  abrirAjustes(): void;
  abrirDocumentacion(): void;
}

/** La plantilla, por plataforma: macOS tiene su menú de aplicación. */
export function menuTemplate(
  actions: MenuActions,
  platform: NodeJS.Platform = process.platform,
  appName = "CodArch"
): MenuItemConstructorOptions[] {
  const isMac = platform === "darwin";
  /** En Windows y Linux el `&` marca el mnemónico: Alt+A abre Archivo. */
  const accel = (label: string): string => (isMac ? label : `&${label}`);
  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: appName,
      submenu: [
        { role: "about", label: "Acerca de CodArch" },
        { type: "separator" },
        { role: "services", label: "Servicios" },
        { type: "separator" },
        { role: "hide", label: "Ocultar CodArch" },
        { role: "hideOthers", label: "Ocultar otros" },
        { role: "unhide", label: "Mostrar todo" },
        { type: "separator" },
        { role: "quit", label: "Salir de CodArch" }
      ]
    });
  }

  template.push({
    label: accel("Archivo"),
    submenu: [
      {
        label: "Analizar carpeta…",
        accelerator: "CmdOrCtrl+O",
        click: () => actions.analizarCarpeta()
      },
      {
        // Sin `accelerator`: Electron pinta «Ctrl+Comma» en Linux y Windows,
        // que no es lo que dice la tecla. El atajo lo atiende la UI.
        label: "Ajustes…",
        click: () => actions.abrirAjustes()
      },
      {
        label: "Abrir cc.json…",
        accelerator: "CmdOrCtrl+Shift+O",
        click: () => actions.abrirFichero()
      },
      { type: "separator" },
      isMac
        ? { role: "close", label: "Cerrar" }
        : { role: "quit", label: "Salir" }
    ]
  });

  template.push({
    label: accel("Edición"),
    submenu: [
      { role: "undo", label: "Deshacer" },
      { role: "redo", label: "Rehacer" },
      { type: "separator" },
      { role: "cut", label: "Cortar" },
      { role: "copy", label: "Copiar" },
      { role: "paste", label: "Pegar" },
      { role: "selectAll", label: "Seleccionar todo" }
    ]
  });

  template.push({
    label: accel("Ver"),
    submenu: [
      { role: "reload", label: "Recargar" },
      { role: "forceReload", label: "Forzar recarga" },
      { role: "toggleDevTools", label: "Herramientas de desarrollo" },
      { type: "separator" },
      { role: "resetZoom", label: "Tamaño real" },
      { role: "zoomIn", label: "Acercar" },
      { role: "zoomOut", label: "Alejar" },
      { type: "separator" },
      { role: "togglefullscreen", label: "Pantalla completa" }
    ]
  });

  template.push({
    label: accel("Ayuda"),
    submenu: [
      {
        label: "Documentación",
        click: () => actions.abrirDocumentacion()
      }
    ]
  });

  return template;
}
