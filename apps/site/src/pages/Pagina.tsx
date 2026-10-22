import { Link, useParams } from "react-router-dom";
import { paginaPorNombre } from "../lib/docs";

/**
 * Una página de documentación: el markdown del repo, generado (ADR 0034).
 */
export default function Pagina() {
  const { nombre } = useParams();
  const documento = nombre ? paginaPorNombre(nombre) : undefined;

  if (!documento) {
    return (
      <div className="doc">
        <Link className="volver" to="/">
          ← Volver
        </Link>
        <h1>No está esa página</h1>
        <p>De las que hay: el modelo, las reglas, el MCP, la migración, el roadmap…</p>
      </div>
    );
  }

  return (
    <article className="doc">
      <p className="meta">
        {documento.ruta}
        {documento.fecha ? ` · ${documento.fecha}` : ""}
      </p>
      <div dangerouslySetInnerHTML={{ __html: documento.html }} />
    </article>
  );
}
