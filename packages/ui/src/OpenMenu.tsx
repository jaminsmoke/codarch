import { type ReactNode, type Ref } from "react";

/**
 * El menú «Abrir» de la cabecera, igual en la web y en el escritorio.
 *
 * Cada app decide qué se puede abrir (una carpeta, un cc.json, un reporte,
 * una URL…); el marcado y el comportamiento son los mismos: al elegir algo,
 * el menú se cierra (ADR 0049).
 */
export interface OpenMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export interface OpenMenuProps {
  items: OpenMenuItem[];
  /** Hueco para lo que solo tiene una plataforma (la carga por URL). */
  children?: ReactNode;
  ref?: Ref<HTMLDetailsElement>;
}

export function OpenMenu({ items, children, ref }: OpenMenuProps) {
  return (
    <details className="open-menu" ref={ref}>
      <summary className="button">
        <span className="button-label-long">Abrir repositorio o archivo</span>
        <span className="button-label-short">Abrir</span>
      </summary>
      <div className="open-menu-panel">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            title={item.title}
            onClick={(event) => {
              // Cerrar el menú antes de abrir un diálogo o cargar nada.
              event.currentTarget.closest("details")?.removeAttribute("open");
              item.onClick();
            }}
          >
            {item.label}
          </button>
        ))}
        {children}
      </div>
    </details>
  );
}
