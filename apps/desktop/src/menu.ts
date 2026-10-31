import { Menu, shell } from "electron";
import { menuTemplate, type MenuActions } from "./menu-template";

/** El menú listo para `Menu.setApplicationMenu`. */
export function buildMenu(actions: MenuActions): Menu {
  return Menu.buildFromTemplate(menuTemplate(actions));
}

/** La documentación se abre en el navegador del sistema, no dentro. */
export function openDocs(): void {
  void shell.openExternal("https://github.com/jaminsmoke/codarch");
}
