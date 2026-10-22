import { Link, useParams } from "react-router-dom";
import { decisionPorNumero, hojaDecision } from "../lib/docs";

/**
 * Una decisión: su ADR, generado del markdown del repo (ADR 0034).
 */
export default function Decision() {
  const { numero } = useParams();
  const decision = numero ? decisionPorNumero(numero) : undefined;
  const hoja = numero ? hojaDecision(numero) : undefined;

  if (!decision) {
    return (
      <div className="doc">
        <Link className="volver" to="/adrs">
          ← Las decisiones
        </Link>
        <h1>No está esa decisión</h1>
      </div>
    );
  }

  return (
    <article className="doc">
      <Link className="volver" to="/adrs">
        ← Las decisiones
      </Link>
      <p className="meta">
        {decision.ruta}
        {decision.fecha ? ` · ${decision.fecha}` : ""}
        {decision.estado ? ` · ${decision.estado}` : ""}
      </p>
      {hoja ? (
        <p>
          <Link className="boton" to={`/adrs/${decision.numero}/hoja`}>
            Su hoja de ruta
          </Link>
        </p>
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: decision.html }} />
    </article>
  );
}
