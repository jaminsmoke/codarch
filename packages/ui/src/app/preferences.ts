import { useEffect, useRef, type MutableRefObject } from "react";
import type { CcJson } from "@codarch/schema/browser";
import type { Plataforma } from "../platform";
import type { ViewPreferences } from "../storage";

/**
 * Guarda las preferencias de vista cuando cambian.
 *
 * Cada refresco trae un `cc` nuevo: escribir las mismas preferencias otra vez
 * sería un viaje al disco —y al proceso principal, en el escritorio— por nada.
 * Por eso se compara con lo último escrito y solo se guarda lo que cambió. La
 * copia viva queda en `preferencesRef` para que la próxima apertura las lea sin
 * esperar al disco.
 */
export function usePreferencesSync({
  cc,
  areaMetric,
  colorMode,
  showLabels,
  plataforma,
  preferencesRef
}: {
  cc: CcJson | null;
  areaMetric: string | null;
  colorMode: string;
  showLabels: boolean;
  plataforma: Plataforma;
  preferencesRef: MutableRefObject<ViewPreferences | null | undefined>;
}): void {
  /** Las preferencias que ya se escribieron, para no reescribirlas sin motivo. */
  const written = useRef<string | null>(null);

  useEffect(() => {
    if (!cc || !areaMetric) return;
    const preferences = { areaMetric, colorMode, showLabels };
    preferencesRef.current = preferences;
    const clave = JSON.stringify(preferences);
    if (clave === written.current) return;
    written.current = clave;
    plataforma.escribirPreferencias(preferences);
  }, [cc, areaMetric, colorMode, showLabels, plataforma, preferencesRef]);
}
