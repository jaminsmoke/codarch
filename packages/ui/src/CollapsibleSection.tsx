import { useId, useState, type ReactNode } from "react";
import { localStore } from "./storage";
import { readSectionClosed, writeSectionClosed } from "./sections";

/**
 * El encabezado de una subsección.
 *
 * Lleva el tinte de su sección en la etiqueta, la pleca flexible que ya
 * separaba grupos y, a la derecha, la cuenta en palabras —«1 nueva · 1
 * existente»—. Lo comparten la ficha del fichero y Cambios, para que una
 * subsección se lea igual en las dos pestañas.
 */
export function GroupHead({
  label,
  summary
}: {
  label: string;
  summary?: string;
}) {
  return (
    <div className="rule-group-head">
      <span className="rule-group-title">{label}</span>
      <span className="symbol-group-line" aria-hidden="true" />
      {summary ? (
        <span className="rule-group-summary" title={summary}>
          {summary}
        </span>
      ) : null}
    </div>
  );
}

/**
 * El galón de un desplegable, con la caja de 18 px de las filas de Cambios
 * (ADR 0079).
 *
 * Es el mismo control en toda la app: una sección que se pliega, un grupo de
 * símbolos, un fichero del cambio o un símbolo que enseña su código. El glifo
 * basta; el `aria-expanded` lo lleva el botón que lo contiene.
 */
export function Caret({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      className={`caret${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {open ? "▾" : "▸"}
    </span>
  );
}

/**
 * Una sección que se puede plegar (ADR 0061).
 *
 * El título es un botón de verdad: `aria-expanded` y `aria-controls` dicen lo
 * que hay debajo, y el galón de la derecha lo enseña. Cuando está cerrada, el
 * resumen mantiene el dato importante a la vista sin abrir nada. El estado se
 * recuerda entre pestañas y visitas porque vive en el almacenamiento local.
 */
export function CollapsibleSection({
  id,
  title,
  count,
  summary,
  defaultOpen = true,
  className,
  children
}: {
  /** Identificador estable para recordar el estado. */
  id: string;
  title: string;
  /** Un número opcional junto al título, por ejemplo las métricas que hay. */
  count?: number;
  /** Lo que se lee cuando la sección está cerrada. */
  summary?: string;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const panelId = useId();
  const [closed, setClosed] = useState(() =>
    readSectionClosed(localStore(), id, !defaultOpen)
  );

  const toggle = () => {
    setClosed((current) => {
      const next = !current;
      writeSectionClosed(localStore(), id, next);
      return next;
    });
  };

  return (
    <section
      className={`collapsible${closed ? " is-closed" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <button
        type="button"
        className="collapsible-head"
        aria-expanded={!closed}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="collapsible-title">{title}</span>
        {count !== undefined ? (
          <span className="collapsible-count">{count}</span>
        ) : null}
        {closed && summary ? (
          <span className="collapsible-summary">{summary}</span>
        ) : null}
        <Caret open={!closed} className="collapsible-caret" />
      </button>
      <div id={panelId} className="collapsible-body" hidden={closed}>
        {children}
      </div>
    </section>
  );
}
