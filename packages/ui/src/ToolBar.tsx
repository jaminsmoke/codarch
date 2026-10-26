import type { ReactNode } from "react";

/**
 * La barra del dock de herramientas (ADR 0083).
 *
 * Es la hermana izquierda de la barra del inspector (ADR 0079): un icono por
 * herramienta, pegados al borde y fuera del scroll de la hoja. Hoy hay una
 * herramienta —las vistas del mapa— y una acción que antes vivía en la
 * cabecera: Ajustes, al pie, separada del resto.
 *
 * Las herramientas son datos: añadir una es una entrada aquí y su hoja en el
 * dock. El orden de la lista es el orden de la barra.
 */

interface ToolEntry {
  id: "map";
  /** El nombre que lee el tooltip y el lector de pantalla. */
  label: string;
  /** Qué enseña la hoja, para el tooltip. */
  hint: string;
  icon: ReactNode;
}

/** Las vistas del mapa: los controles de área y color, los estratos y la leyenda. */
function MapToolsIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 2.2 15.6 5.6 9 9 2.4 5.6z" />
      <path d="m2.4 8.9 6.6 3.4 6.6-3.4" />
      <path d="m2.4 12.3 6.6 3.4 6.6-3.4" />
    </svg>
  );
}

/**
 * El engranaje de Ajustes, que antes estaba en la cabecera.
 *
 * A 16 px, un engranaje de trazo se convierte en una mancha de líneas. Este va
 * relleno con el agujero del centro recortado por dentro: la silueta de ocho
 * dientes se lee y el hueco del buje no se tapa.
 */
function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M7.8 2.51L10.2 2.51L10.16 4.96A4.2 4.2 0 0 1 11.04 5.33L12.74 3.56L14.44 5.26L12.67 6.96A4.2 4.2 0 0 1 13.04 7.84L15.49 7.8L15.49 10.2L13.04 10.16A4.2 4.2 0 0 1 12.67 11.04L14.44 12.74L12.74 14.44L11.04 12.67A4.2 4.2 0 0 1 10.16 13.04L10.2 15.49L7.8 15.49L7.84 13.04A4.2 4.2 0 0 1 6.96 12.67L5.26 14.44L3.56 12.74L5.33 11.04A4.2 4.2 0 0 1 4.96 10.16L2.51 10.2L2.51 7.8L4.96 7.84A4.2 4.2 0 0 1 5.33 6.96L3.56 5.26L5.26 3.56L6.96 5.33A4.2 4.2 0 0 1 7.84 4.96ZM11.6 9a2.6 2.6 0 1 0 -5.2 0a2.6 2.6 0 1 0 5.2 0Z"
      />
    </svg>
  );
}

/** Las herramientas del dock, en el orden en que se pintan. */
export const TOOL_ENTRIES: readonly ToolEntry[] = [
  {
    id: "map",
    label: "Mapa",
    hint: "las vistas y los estratos del mapa",
    icon: <MapToolsIcon />
  }
];

/** El nombre de una herramienta, para anunciar su hoja. */
export function toolLabel(id: ToolEntry["id"]): string {
  return TOOL_ENTRIES.find((entry) => entry.id === id)?.label ?? "";
}

export function ToolBar({
  open,
  settingsOpen,
  panelId,
  onToggleOpen,
  onOpenSettings
}: {
  /** Las herramientas están a la vista. */
  open: boolean;
  /** El diálogo de Ajustes está abierto. */
  settingsOpen: boolean;
  /** La hoja que abre y cierra la herramienta del mapa. */
  panelId: string;
  onToggleOpen: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <nav className="tool-bar" aria-label="Herramientas">
      {TOOL_ENTRIES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={`tool-tab${open ? " is-active" : ""}`}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${entry.label}, ${open ? "ocultar" : "mostrar"}`}
          title={`${entry.label} · ${entry.hint}`}
          onClick={onToggleOpen}
        >
          {entry.icon}
        </button>
      ))}
      <span className="tool-spacer" aria-hidden="true" />
      <button
        type="button"
        className={`tool-tab${settingsOpen ? " is-active" : ""}`}
        aria-haspopup="dialog"
        aria-label="Ajustes"
        title="Ajustes · el proyecto, los plugins y los addons"
        onClick={onOpenSettings}
      >
        <SettingsIcon />
      </button>
    </nav>
  );
}
