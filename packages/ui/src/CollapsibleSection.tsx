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
 * Una sección que se puede plegar (ADR 0061).
 *
 * El título es un botón de verdad: `aria-expanded` y `aria-controls` dicen lo
 * que hay debajo, y el chevron lo enseña. Cuando está cerrada, el resumen de la
 * derecha mantiene el dato importante a la vista sin abrir nada. El estado se
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
        <span className="collapsible-chevron" aria-hidden="true">
          <svg viewBox="0 0 10 10" width="8" height="8">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 3.5 5 6.5 8 3.5"
            />
          </svg>
        </span>
        <span className="collapsible-title">{title}</span>
        {count !== undefined ? (
          <span className="collapsible-count">{count}</span>
        ) : null}
        {closed && summary ? (
          <span className="collapsible-summary">{summary}</span>
        ) : null}
      </button>
      <div id={panelId} className="collapsible-body" hidden={closed}>
        {children}
      </div>
    </section>
  );
}
