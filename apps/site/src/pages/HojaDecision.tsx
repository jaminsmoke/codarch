import { Link, useParams } from "react-router-dom";
import { decisionPorNumero, hojaDecision } from "../lib/docs";

/**
 * La hoja de ruta de una decisión (ADR 0031 ✓): las fases de esa línea ✓.
 */
export default function HojaDecision() {
  const { numero } = useParams();
  const hoja = numero ? hojaDecision(numero) : undefined;
  const decision = numero ? decisionPorNumero(numero) : undefined;

  if (!hoja) {
    return (
      <div className="doc">
        <Link className="volver" to="/adrs">
          ← Las decisiones
        </Link>
        <h1>No está esa hoja de ruta</h1>
      </div>
    );
  }

  return (
    <article className="doc">
      <Link className="volver" to={`/adrs/${numero}`}>
        ← {decision?.titulo ?? "La decisión"}
      </Link>
      <p className="meta">
        {hoja.ruta}
        {hoja.fecha ? ` · ${hoja.fecha}` : ""}
      </p>
      <div dangerouslySetInnerHTML={{ __html: hoja.html }} />
    </article>
  );
}
