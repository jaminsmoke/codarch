import { PLUGINS_KEY, localStore } from "./storage-local";

/**
 * Los plugins activados en esta máquina ✓.
 *
 * Es local ✓: el repo declara los que existen ✓ y cada quien activa los que
 * quiere ✓. El análisis no depende de esto ✓.
 */
export function readEnabledPlugins(
  storage: Storage | null = localStore()
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(PLUGINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((name): name is string => typeof name === "string");
  } catch {
    return [];
  }
}

export function writeEnabledPlugins(
  names: readonly string[],
  storage: Storage | null = localStore()
): void {
  if (!storage) return;
  try {
    storage.setItem(PLUGINS_KEY, JSON.stringify([...names]));
  } catch {
    // localStorage lleno o bloqueado: los plugins son opcionales.
  }
}
