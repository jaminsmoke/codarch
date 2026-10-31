/**
 * La identidad de un snapshot, tal como la consumen la app y el live
 * (ADR 0103).
 *
 * `checksum` depende del código y `historyChecksum` del historial: un
 * snapshot con el mismo código y otro historial no es otro árbol, es el mismo
 * árbol con otro calor. Comparar solo el primero perdería el calor nuevo;
 * comparar los dos como si fueran uno obligaría a reabrir el mapa.
 */
export interface SnapshotIdentity {
  checksum?: string;
  historyChecksum?: string;
}

/**
 * Cómo se relacionan dos snapshots.
 *
 * `tree`: otro código (o falta el checksum de alguno), así que es otra vista.
 * `heat`: mismo código y otro historial, así que se refresca el calor sin
 * tocar la vista. `same`: nada que refrescar.
 *
 * Esa variedad la usan la app (aviso de refresco, ADR 0074) y el escritorio
 * (si reescribe el snapshot, ADR 0056) para no decidir cada uno lo suyo.
 */
export type SnapshotRelation = "same" | "heat" | "tree";

/** Compara dos identidades por el código primero y por el historial después. */
export function snapshotRelation(
  previous: SnapshotIdentity | null | undefined,
  next: SnapshotIdentity | null | undefined
): SnapshotRelation {
  const before = previous?.checksum;
  const after = next?.checksum;
  if (!before || !after || before !== after) return "tree";
  return (previous?.historyChecksum ?? "") === (next?.historyChecksum ?? "")
    ? "same"
    : "heat";
}
