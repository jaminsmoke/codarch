import { Link } from "react-router-dom";
import { decisiones } from "../lib/docs";

/**
 * El índice de las decisiones (ADR 0034).
 *
 * Sale del markdown del repo ✓: el título ✓, la fecha ✓ y el estado ✓ de cada
 * ADR ✓ son los que tiene escritos ✓ ✓.
 */
export default function IndiceDecisiones() {
  const lista = decisiones();

  return (
    <article className="doc">
      <h1>Las decisiones</h1>
      <p>
        Cada decisión del producto está escrita: qué se decidió, por qué, qué
        alternativas se descartaron y qué consecuencias teve. Y cada una lleva
        su hoja de ruta al lado, con las fases de esa línea.
      </p>
      <table>
        <thead>
          <tr>
            <th>ADR</th>
            <th>Decisión</th>
            <th>Fecha</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((decision) => (
            <tr key={decision.numero}>
              <td className="mono">
                <Link to={`/adrs/${decision.numero}`}>{decision.numero}</Link>
              </td>
              <td>{decision.titulo}</td>
              <td className="mono">{decision.fecha ?? "—"}</td>
              <td>{decision.estado ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
