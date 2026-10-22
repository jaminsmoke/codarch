import { Link } from "react-router-dom";
import captura from "../../../../docs/images/atlas.png";

/**
 * La portada: qué es CodArch ✓, cómo se ve ✓, cómo se instala ✓ ✅.
 */
export default function Home() {
  return (
    <>
      <section className="portada">
        <h1>
          El mapa <span className="destacado">vivo</span> de la arquitectura de tu
          software
        </h1>
        <p className="lema">
          CodArch analiza tu repositorio y lo dibuja: un treemap de ficheros y
          carpetas con el riesgo de cada bloque, la complejidad de cada función y
          la deuda de migración. El mismo mapa aparece en el pull request, en el
          CI y en tu agente.
        </p>
        <div className="acciones">
          <a className="boton principal" href="https://www.npmjs.com/package/codarch">
            Instalar
          </a>
          <Link className="boton" to="/guia/">
            La guía
          </Link>
          <Link className="boton" to="/docs/model">
            El modelo
          </Link>
        </div>
        <p>
          <span className="aviso">
            <span>🧪</span>
            <span>
              <b>Alpha.</b> La funcionalidad está; el producto todavía no. Las
              versiones llevan prerelease y no hay soporte.
            </span>
          </span>
        </p>
      </section>

      <figure className="captura">
        <img src={captura} alt="El atlas de CodArch sobre su propio repositorio: cada bloque es una carpeta o un fichero, el color es el riesgo y el inspector cuenta los símbolos del fichero." />
        <figcaption>
          CodArch analizando su propio repo: 210 ficheros, 59 carpetas, el riesgo
          por bloque y el inspector con los símbolos del fichero.
        </figcaption>
      </figure>

      <section className="seccion">
        <h2>Qué hay</h2>
        <p>
          Todo sale del mismo modelo: <code>cc.json</code>, con su checksum
          determinista. El checksum no depende de quién mira, así que el mapa del
          PR, el del CI y el del agente son el mismo.
        </p>
        <div className="piezas">
          <article className="pieza">
            <h3>El CLI</h3>
            <p>
              Analiza, compara, dibuja y sirve. Es lo que se instala:{" "}
              <code>npm i -g codarch@next</code>.
            </p>
            <a href="https://github.com/jaminsmoke/codarch">Ver el código</a>
          </article>
          <article className="pieza">
            <h3>La GitHub Action</h3>
            <p>
              Comenta el pull request con el mapa, el diff y las violaciones, y
              bloquea si la política del repo se incumple.
            </p>
            <a href="https://github.com/jaminsmoke/codarch-action">Usarla</a>
          </article>
          <article className="pieza">
            <h3>El MCP</h3>
            <p>
              Seis consultas de solo lectura para que tu agente pregunte por la
              arquitectura sin inventarse nada.
            </p>
            <Link to="/docs/mcp">Ver las consultas</Link>
          </article>
          <article className="pieza">
            <h3>La app web y la de escritorio</h3>
            <p>
              El mapa con el inspector, la vista de PR y el historial. La web
              analiza en el navegador; el escritorio, contra el disco de verdad.
            </p>
            <Link to="/docs/roadmap">Ver el camino</Link>
          </article>
          <article className="pieza">
            <h3>Las extensiones</h3>
            <p>
              Los plugins añaden vistas; los addons aportan conocimiento
              declarativo: capas, reglas y vistas guardadas. Ninguno puede tocar
              el modelo, así que el checksum no cambia.
            </p>
            <Link to="/guia/">Ver la guía</Link>
          </article>
          <article className="pieza">
            <h3>Las reglas</h3>
            <p>
              En <code>.codarch.yml</code>: capas, dependencias prohibidas,
              umbrales y ciclos. Solo bloquean las violaciones introducidas.
            </p>
            <Link to="/docs/rules">Ver las reglas</Link>
          </article>
        </div>
      </section>

      <section className="seccion">
        <h2>Transparencia</h2>
        <p>
          Cada decisión del producto está escrita, con su contexto y sus
          alternativas descartadas. Y cada fase del camino, con lo que se hizo y
          lo que quedó.
        </p>
        <div className="acciones">
          <Link className="boton" to="/adrs">
            Las decisiones
          </Link>
          <Link className="boton" to="/docs/roadmap">
            El roadmap
          </Link>
          <Link className="boton" to="/guia/">
            La guía
          </Link>
        </div>
      </section>
    </>
  );
}
