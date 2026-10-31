import { existsSync } from "node:fs";
import path from "node:path";
import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import { checkSource } from "@codarch/versions";
import { VERSION } from "./version";
import { canAutoUpdate, canSelfRestart, resolveUpdateFeed } from "./updates";

/**
 * Las actualizaciones en segundo plano ✓ (ADR 0045).
 *
 * Windows y Linux instalan el paquete nuevo al cerrar ✓. macOS espera a tener
 * firma y notarización ✓; mientras tanto, la release sigue en los ajustes ✓.
 */

/**
 * Dónde se miran las actualizaciones.
 *
 * Las releases del escritorio se publican en este mismo repositorio ✓; para
 * que quien lo instale pueda comprobarlas ✓, el repositorio tiene que ser
 * **público** ✓. Se puede apuntar a otro con la variable de entorno ✓.
 */
export const UPDATE_REPO =
  process.env.CODARCH_UPDATE_REPO ?? "jaminsmoke/codarch";

/**
 * Apunta electron-updater a la release que hemos resuelto nosotros.
 *
 * Sin esto, la app mira la primera entrada del feed de GitHub, que no siempre
 * es una release con instaladores: desde que existe el `v1` de la acción, ese
 * feed empieza por una etiqueta sin `latest.yml` y la comprobación acababa en
 * 404. Devuelve la versión encontrada, o `null` si no se pudo preguntar.
 */
export async function pointToLatestRelease(): Promise<string | null> {
  try {
    const feed = await resolveUpdateFeed(UPDATE_REPO, VERSION, fetch);
    if (!feed) return null;
    autoUpdater.setFeedURL({ provider: "generic", url: feed.url });
    return feed.version;
  } catch (error) {
    console.error(`actualización: ${(error as Error).message}`);
    return null;
  }
}

/** Arranca la comprobación de fondo, si esta instalación puede actualizarse. */
export async function configureUpdates(): Promise<void> {
  if (!canAutoUpdate(process.platform, app.isPackaged)) return;

  // Sin `resources/app-update.yml` electron-updater no sabe a qué release
  // mirar y la comprobación falla sin que nadie lo vea. Mejor decirlo: un
  // instalador empaquetado sin esos metadatos no se actualiza nunca.
  const configuracion = path.join(process.resourcesPath, "app-update.yml");
  if (!existsSync(configuracion)) {
    console.warn(
      `no hay ${configuracion}: esta instalación no puede actualizarse sola`
    );
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // El producto está en alpha y publica prereleases ✓.
  autoUpdater.allowPrerelease = true;
  autoUpdater.on("error", (error) => {
    console.error(`actualización: ${error.message}`);
  });
  autoUpdater.on("update-downloaded", (info) => {
    // El AppImage se reemplaza a sí mismo y arranca la versión nueva; el .deb
    // lo instala el sistema al cerrar, con sus permisos (ADR 0045).
    if (!canSelfRestart(process.env)) {
      console.log(
        `actualización ${info.version} descargada; se instalará al cerrar`
      );
      return;
    }
    console.log(`actualización ${info.version} descargada`);
    const choice = dialog.showMessageBoxSync({
      type: "info",
      title: "Actualización lista",
      message: `CodArch ${info.version} ya está descargada.`,
      detail:
        "Puedes reiniciar ahora para usarla, o seguir trabajando y se aplicará al cerrar.",
      buttons: ["Reiniciar ahora", "Al cerrar"],
      defaultId: 0,
      cancelId: 1
    });
    // `isForceRunAfter`: la versión nueva arranca sola, que es medio punto de
    // la actualización desde el AppImage (el otro es no pedir permisos).
    if (choice === 0) autoUpdater.quitAndInstall(true, true);
  });
  if ((await pointToLatestRelease()) === null) {
    console.warn(
      "actualización: no se pudo resolver la última release; se reintenta en el siguiente arranque"
    );
    return;
  }

  await autoUpdater.checkForUpdatesAndNotify().catch((error: Error) => {
    console.error(`no se pudo comprobar la actualización: ${error.message}`);
  });
}

/**
 * Si hay una versión más nueva de la app (ADR 0032).
 *
 * El escritorio se actualiza con las releases de GitHub. La red la consulta
 * el proceso principal: el renderer no habla con la red.
 */
export async function checkUpdate(): Promise<{
  current: string;
  latest: string | null;
  outdated: boolean;
  error: string | null;
  url: string | null;
  canInstall: boolean;
}> {
  const resultado = await checkSource(
    VERSION,
    { kind: "github", repo: UPDATE_REPO, includePrereleases: true },
    fetch
  );
  return {
    current: VERSION,
    latest: resultado.latest,
    outdated: resultado.outdated,
    error: resultado.error,
    url: resultado.url,
    canInstall: canAutoUpdate(process.platform, app.isPackaged)
  };
}

/**
 * Descarga la actualización y reinicia la app con ella (ADR 0045).
 *
 * Es el botón de **Actualizaciones**: no hay que volver a bajar el instalador.
 * `electron-updater` cierra la ventana, aplica el paquete descargado y vuelve
 * a abrir la app nueva.
 */
export async function installUpdate(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  if (!canAutoUpdate(process.platform, app.isPackaged)) {
    return { ok: false, error: "esta instalación no puede actualizarse sola" };
  }
  try {
    if ((await pointToLatestRelease()) === null) {
      return {
        ok: false,
        error: "no se pudo encontrar la última release en GitHub"
      };
    }
    const resultado = await autoUpdater.checkForUpdates();
    if (!resultado?.isUpdateAvailable) {
      return { ok: false, error: "no hay ninguna versión nueva" };
    }
    await autoUpdater.downloadUpdate();
    // Un respiro para que el renderer pinte «Reiniciando…» antes del cierre.
    setTimeout(() => autoUpdater.quitAndInstall(true, true), 400);
    return { ok: true, error: null };
  } catch (cause) {
    return { ok: false, error: (cause as Error).message };
  }
}
