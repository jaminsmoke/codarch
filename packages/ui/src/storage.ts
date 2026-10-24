/**
 * Tipos de almacenamiento compartidos entre la web y el escritorio.
 */

export interface ViewPreferences {
  areaMetric: string | null;
  colorMode: string;
  showLabels: boolean;
}

export interface SavedProject {
  snapshot: unknown;
  report: unknown | null;
  label: string;
  reportLabel: string | null;
  addons?: unknown[];
}
