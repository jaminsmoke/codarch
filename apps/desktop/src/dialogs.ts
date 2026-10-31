import { dialog, type OpenDialogOptions } from "electron";
import { getWindow } from "./window";

/**
 * Los diálogos del sistema para elegir una carpeta o un JSON.
 *
 * Hay portales de Linux que cierran el diálogo con la lista vacía y sin
 * marcarlo como cancelado. Antes eso se traducía en «no pasa nada»: ahora se
 * dice y se ofrece la salida por terminal.
 */

async function pickPaths(options: OpenDialogOptions): Promise<string | null> {
  const window = getWindow();
  if (!window) return null;
  const ask = async (parent: typeof window | null) => {
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    return result;
  };

  let result = await ask(window);
  // Hay portales de Linux (xdg-desktop-portal) que devuelven el diálogo
  // cerrado y sin rutas cuando lleva ventana padre. Sin padre vuelve a
  // funcionar, así que se reintenta una vez antes de darse por vencido.
  if (!result.canceled && result.filePaths.length === 0) {
    result = await ask(null);
  }
  if (result.canceled) return null;
  const picked = result.filePaths[0];
  if (!picked) {
    console.error("el diálogo no devolvió ninguna ruta");
    dialog.showErrorBox(
      "No se pudo elegir la carpeta",
      "El diálogo del sistema se cerró sin devolver una ruta. Prueba a abrirla desde la terminal con «codarch serve <carpeta>»."
    );
    return null;
  }
  console.log(`se abre ${picked}`);
  return picked;
}

/** Elige una carpeta con el diálogo del sistema. */
export async function pickFolder(): Promise<string | null> {
  return pickPaths({
    title: "Elige la carpeta del repositorio",
    properties: ["openDirectory"]
  });
}

/** Elige un fichero JSON con el diálogo del sistema. */
export async function pickFile(): Promise<string | null> {
  return pickPaths({
    title: "Elige un cc.json o un report.json",
    properties: ["openFile"],
    filters: [{ name: "CodArch", extensions: ["json"] }]
  });
}
