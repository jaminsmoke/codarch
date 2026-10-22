import { Link } from "react-router-dom";

/** Cuando no hay nada en esa ruta. */
export default function NoEncontrada() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-20">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Aquí no hay nada
      </h1>
      <p className="mt-3 text-ink-soft">
        Quizá querías la <Link to="/guia/">guía</Link> o la{" "}
        <Link to="/">portada</Link>.
      </p>
    </div>
  );
}
