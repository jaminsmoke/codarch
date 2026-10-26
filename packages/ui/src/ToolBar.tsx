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

/** El engranaje de Ajustes, que antes estaba en la cabecera. */
function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm0 1.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"
      />
      <path
        fill="currentColor"
        d="M6.6.9h2.8l.3 1.6c.4.1.8.3 1.1.5l1.4-.9 2 2-.9 1.4c.2.4.4.7.5 1.1l1.6.3v2.8l-1.6.3c-.1.4-.3.8-.5 1.1l.9 1.4-2 2-1.4-.9c-.4.2-.7.4-1.1.5l-.3 1.6H6.6l-.3-1.6c-.4-.1-.8-.3-1.1-.5l-1.4.9-2-2 .9-1.4c-.2-.4-.4-.7-.5-1.1l-1.6-.3V6.9l1.6-.3c.1-.4.3-.8.5-1.1l-.9-1.4 2-2 1.4.9c.3-.2.7-.4 1.1-.5L6.6.9Z"
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
