import { Link } from "react-router-dom";
import { useTitulo } from "../lib/titulo";

/** Cuando no hay nada en esa ruta. */
export default function NoEncontrada() {
  useTitulo("Aquí no hay nada");
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-20">
      <p className="font-mono text-xs tracking-[0.22em] text-muted uppercase">
        404
      </p>
      <h1 className="font-display mt-1 text-4xl font-bold tracking-tight">
        Aquí no hay nada
      </h1>
      <p className="mt-3 text-ink-soft">
        Quizá querías la <Link to="/">portada</Link>, la{" "}
        <Link to="/guia/">guía</Link> o los{" "}
        <Link to="/docs/">documentos</Link>.
      </p>
    </div>
  );
}
