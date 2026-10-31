/**
 * Cuándo el snapshot que llega del renderer ya está en `.codarch/`.
 *
 * El live escribe el snapshot en el proceso principal y después avisa al
 * renderer; el renderer, al abrir o al refrescar, devuelve el proyecto por IPC.
 * Si el disco ya tiene ese mismo snapshot no hay nada que rehacer: serializar
 * el snapshot entero para dejarlo igual era trabajo de más en el proceso
 * principal (ADR 0056). «Ese mismo snapshot» son sus dos identidades: el
 * checksum del código y el del historial (ADR 0103). El calor cambia sin que
 * cambie el código, y un snapshot con otro historial sí es otro snapshot.
 *
 * Vive fuera de `main.ts` para probarlo sin Electron.
 */

/** El checksum del snapshot, si es un `cc.json` con `meta.checksum`. */
export function snapshotChecksum(snapshot: unknown): string | null {
  const checksum = (snapshot as { meta?: { checksum?: unknown } } | null)?.meta
    ?.checksum;
  return typeof checksum === "string" && checksum !== "" ? checksum : null;
}

/** El checksum del historial del snapshot, o `null` si no lo trae (ADR 0103). */
export function snapshotHistoryChecksum(snapshot: unknown): string | null {
  const checksum = (
    snapshot as { meta?: { historyChecksum?: unknown } } | null
  )?.meta?.historyChecksum;
  return typeof checksum === "string" && checksum !== "" ? checksum : null;
}

/**
 * ¿El `.codarch/snapshot.cc.json` de ahora es ya este snapshot?
 *
 * Se comparan las dos identidades: mismo código y mismo historial. Sin el
 * segundo, un commit nuevo se perdería en disco y la app seguiría enseñando el
 * calor viejo aunque lo hubiera recibido.
 */
export function sameSnapshot(
  snapshot: unknown,
  persistedChecksum: string,
  persistedHistoryChecksum = ""
): boolean {
  const checksum = snapshotChecksum(snapshot);
  const history = snapshotHistoryChecksum(snapshot) ?? "";
  return (
    checksum !== null &&
    checksum === persistedChecksum &&
    history === persistedHistoryChecksum
  );
}
