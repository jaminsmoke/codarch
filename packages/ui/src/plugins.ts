import { useCallback, useEffect, useMemo, useState } from "react";
import type { PluginDescriptor, PluginModule } from "@codarch/plugin-api";
import { plugins as descriptors } from "virtual:codarch-plugins";
import { nextEnabledPlugins } from "./pluginState";

/**
 * Los plugins de la app.
 *
 * El registro lo genera el build ✓ (solo los plugins que el repo declara
 * compilados ✓). El usuario activa los que quiera ✓ desde los ajustes ✓, y su
 * código se descarga **la primera vez que se usa** ✓.
 *
 * Un plugin que no carga no rompe la app ✓: se queda en el store y avisa ✓.
 *
 * El almacenamiento lo inyecta cada app ✓: esta pieza no toca `localStorage` ni
 * el puente del escritorio ✓.
 */

/** Lo que la UI necesita para recordar los plugins activados. */
export interface PluginStore {
  read(): string[];
  write(names: readonly string[]): void;
}

export interface PluginRuntime {
  /** Todos los plugins compilados. */
  descriptors: readonly PluginDescriptor[];
  /** Los nombres de los activados. */
  enabled: string[];
  /** Activa o desactiva un plugin. */
  toggle: (name: string, on: boolean) => void;
  /** El módulo de un plugin ya cargado. */
  moduleOf: (name: string) => PluginModule | null;
  /** Los errores al cargar. */
  failed: string[];
}

export function usePlugins(store: PluginStore): PluginRuntime {
  const [enabled, setEnabled] = useState<string[]>(() => store.read());
  const [loaded, setLoaded] = useState<Record<string, PluginModule>>({});
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      for (const descriptor of descriptors) {
        const name = descriptor.manifest.name;
        if (!enabled.includes(name)) continue;
        if (loaded[name]) continue;
        try {
          const module = await descriptor.load();
          if (cancelled) return;
          setLoaded((current) => ({ ...current, [name]: module }));
        } catch {
          if (cancelled) return;
          setFailed((current) =>
            current.includes(name) ? current : [...current, name]
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, loaded]);

  const toggle = useCallback(
    (name: string, on: boolean) => {
      setEnabled((current) => {
        const next = nextEnabledPlugins(current, name, on);
        store.write(next);
        return next;
      });
    },
    [store]
  );

  const moduleOf = useCallback(
    (name: string) => loaded[name] ?? null,
    [loaded]
  );

  return useMemo(
    () => ({ descriptors, enabled, toggle, moduleOf, failed }),
    [enabled, toggle, moduleOf, failed]
  );
}
