/**
 * Cuándo el snapshot que llega del renderer ya está en `.codarch/`.
 *
 * El live escribe el snapshot en el proceso principal y después avisa al
 * renderer; el renderer, al abrir o al refrescar, devuelve el proyecto por IPC.
 * Si el disco ya tiene ese mismo checksum no hay nada que rehacer: serializar
 * el snapshot entero para dejarlo igual era trabajo de más en el proceso
 * principal (ADR 0056).
 *
 * Vive fuera de `main.ts` para probarlo sin Electron.
 */

/** El checksum del snapshot, si es un `cc.json` con `meta.checksum`. */
export function snapshotChecksum(snapshot: unknown): string | null {
  const checksum = (snapshot as { meta?: { checksum?: unknown } } | null)?.meta
    ?.checksum;
  return typeof checksum === "string" && checksum !== "" ? checksum : null;
}

/** ¿El `.codarch/snapshot.cc.json` de ahora es ya este snapshot? */
export function sameSnapshot(
  snapshot: unknown,
  persistedChecksum: string
): boolean {
  const checksum = snapshotChecksum(snapshot);
  return checksum !== null && checksum === persistedChecksum;
}
