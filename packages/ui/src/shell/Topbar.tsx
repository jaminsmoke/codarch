import { useRef, type ReactNode } from "react";
import type { AddonView as SavedView } from "@codarch/addons";
import type { CodarchApp } from "../app/types";
import { viewStateFromSaved } from "../viewState";
import mark from "../brand-mark.json";

/**
 * La cabecera: la marca, los huecos de cada plataforma y el menú de vistas
 * guardadas (ADR 0029).
 *
 * El menú es un `<details>` de toda la vida, así que se abre y se cierra solo;
 * el único gesto propio es cerrarlo al elegir una vista, que es lo que espera
 * quien acaba de pulsarla.
 */
export function Topbar({
  app,
  actions,
  trailing
}: {
  app: CodarchApp;
  actions?: ReactNode;
  trailing?: ReactNode;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { addonsWithViews, applyView } = app;

  const applySavedView = (saved: SavedView) => {
    menuRef.current?.removeAttribute("open");
    applyView(viewStateFromSaved(saved.state));
  };

  return (
    <header className="topbar">
      <div className="brand">
        <CodarchMark />
        <span className="brand-lockup">
          <span className="brand-mark">CODARCH</span>
          <span className="brand-sub">atlas de arquitectura</span>
        </span>
      </div>
      <div className="topbar-actions">
        {actions}
        {addonsWithViews.length > 0 ? (
          <details className="open-menu" ref={menuRef}>
            <summary className="button ghost">Vistas</summary>
            <div className="open-menu-panel">
              {addonsWithViews.map((addon) => (
                <div key={addon.name} className="open-menu-group">
                  <span
                    className="open-menu-label"
                    title={addon.description ?? addon.title}
                  >
                    {addon.title}
                  </span>
                  {addon.views.map((saved) => (
                    <button
                      key={`${addon.name}:${saved.id}`}
                      type="button"
                      title={saved.description ?? saved.title}
                      onClick={() => applySavedView(saved)}
                    >
                      {saved.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
        ) : null}
        {trailing}
      </div>
    </header>
  );
}

/**
 * La marca de la casa: el mapa en miniatura del icono de la app.
 *
 * Un bloque grande con su pieza en la esquina y una columna de tres al otro
 * lado, separadas por las juntas del marco. La geometría vive en
 * `brand-mark.json`, que también lee el generador de iconos
 * (`npm run icons`): la cabecera, el favicon y los iconos del escritorio son
 * el mismo dibujo, no tres parecidos.
 */
function CodarchMark() {
  return (
    <svg
      className="brand-mark-icon"
      viewBox={`0 0 ${mark.viewBox} ${mark.viewBox}`}
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        width={mark.viewBox}
        height={mark.viewBox}
        rx={mark.background.radius}
        fill={mark.background.fill}
      />
      {mark.blocks.map((block) => (
        <rect
          key={`${block.x}-${block.y}`}
          x={block.x}
          y={block.y}
          width={block.width}
          height={block.height}
          fill={block.fill}
        />
      ))}
    </svg>
  );
}
