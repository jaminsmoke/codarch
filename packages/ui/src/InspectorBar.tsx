import type { ReactNode } from "react";
import type { InspectorTab } from "./viewState";

/**
 * La barra de actividad del inspector (ADR 0079).
 *
 * El panel derecho elige su apartado con iconos en una franja fija, no con
 * pestañas de texto: la tira vivía dentro del scroll y se iba al bajar por una
 * ficha larga, y cada apartado nuevo le quitaba ancho al contenido.
 *
 * Las secciones son datos: añadir una es una entrada aquí y su hoja en el
 * panel. El orden de la lista es el orden de la barra.
 */

interface InspectorSection {
  id: InspectorTab;
  /** El nombre que lee el tooltip y el lector de pantalla. */
  label: string;
  /** Qué enseña la hoja, para el tooltip. */
  hint: string;
  icon: ReactNode;
}

/** El documento: la ficha del fichero seleccionado. */
function FileIcon() {
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
      <path d="M5 2.5h5L14 6.5v9H5z" />
      <path d="M10 2.5v4h4" />
    </svg>
  );
}

/** El contenedor: la ficha de la carpeta seleccionada. */
function FolderIcon() {
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
      <path d="M2.5 4.5h5l1.5 2h6.5v7h-13z" />
      <path d="M2.5 6.5h13" />
    </svg>
  );
}

/** Dos flechas: lo que difiere del último commit. */
function ChangesIcon() {
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
      <path d="M3.5 6.5h9.5" />
      <path d="M10.5 4 13 6.5 10.5 9" />
      <path d="M14.5 11.5H5" />
      <path d="M7.5 9 5 11.5 7.5 14" />
    </svg>
  );
}

/** Los apartados del inspector, en el orden en que se pintan. */
export const INSPECTOR_SECTIONS: readonly InspectorSection[] = [
  {
    id: "file",
    label: "Fichero",
    hint: "la ficha del fichero seleccionado",
    icon: <FileIcon />
  },
  {
    id: "folder",
    label: "Carpeta",
    hint: "la ficha de la carpeta seleccionada",
    icon: <FolderIcon />
  },
  {
    id: "changes",
    label: "Cambios",
    hint: "lo que difiere del último commit",
    icon: <ChangesIcon />
  }
];

/** El nombre de un apartado, para anunciar el panel que se está leyendo. */
export function inspectorLabel(tab: InspectorTab): string {
  return INSPECTOR_SECTIONS.find((section) => section.id === tab)?.label ?? "";
}

export function InspectorBar({
  active,
  alert,
  closed = false,
  panelId,
  onSelect
}: {
  active: InspectorTab;
  /** Hay cambios sin commitear: el punto va sobre el icono de Cambios. */
  alert: boolean;
  /** La hoja está plegada: la entrada activa es la que la vuelve a abrir. */
  closed?: boolean;
  /** La hoja que las entradas abren y pliegan. */
  panelId?: string;
  onSelect: (tab: InspectorTab) => void;
}) {
  return (
    <nav className="inspector-bar" aria-label="Inspector">
      {INSPECTOR_SECTIONS.map((section) => {
        const current = section.id === active;
        // Plegada, ninguna entrada se marca como la hoja a la vista, igual que
        // el dock de herramientas (ADR 0079 · ADR 0083).
        const visible = current && !closed;
        const marked = alert && section.id === "changes";
        const name = marked
          ? `${section.label}, con cambios sin commitear`
          : section.label;
        return (
          <button
            key={section.id}
            type="button"
            className={`inspector-tab${visible ? " is-active" : ""}`}
            aria-current={visible ? "page" : undefined}
            aria-expanded={current ? !closed : undefined}
            aria-controls={current ? panelId : undefined}
            aria-label={
              current ? `${name}, ${closed ? "mostrar" : "ocultar"}` : name
            }
            title={`${section.label} · ${section.hint}`}
            onClick={() => onSelect(section.id)}
          >
            {section.icon}
            {marked ? <i className="inspector-dot" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </nav>
  );
}
