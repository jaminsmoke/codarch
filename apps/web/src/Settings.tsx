import SharedSettings, {
  type SettingsComponent,
  type SettingsProps as SharedSettingsProps,
  type SettingsUpdateAdapter
} from "@codarch/ui/Settings";
import { hasWebgl2, hasWebgpu } from "@codarch/plugin-api";
import {
  checkSource,
  CLI_VERSION,
  DESKTOP_VERSION,
  DOCKER_VERSION,
  ENGINE_VERSION,
  MCP_VERSION,
  WEB_VERSION
} from "@codarch/versions";

/** El paquete que se publica en npm: es el CLI, el que sirve esta web. */
const NPM_PACKAGE = "codarch";

/** Las piezas versionadas que enseña la sección Componentes (ADR 0065). */
const COMPONENTS: SettingsComponent[] = [
  {
    name: "Motor",
    version: ENGINE_VERSION,
    detail: "El análisis, el modelo y las reglas. Viaja dentro de cada app."
  },
  {
    name: "CLI",
    version: CLI_VERSION,
    detail: "Se actualiza con npm; si sirve esta web, manda su versión."
  },
  {
    name: "Web",
    version: WEB_VERSION,
    detail: "Se recarga al publicar una versión nueva; no se instala."
  },
  {
    name: "Escritorio",
    version: DESKTOP_VERSION,
    detail: "Se actualiza con su release y se reinicia al cerrar."
  },
  {
    name: "MCP",
    version: MCP_VERSION,
    detail: "Lo lanza el cliente; al actualizarlo, se reinicia el proceso."
  },
  {
    name: "Docker",
    version: DOCKER_VERSION,
    detail: "La imagen de GHCR; se actualiza al bajar la etiqueta nueva."
  }
];

/** Las capacidades no cambian durante la sesión ✓. */
const webgl2 = hasWebgl2();
const webgpu = hasWebgpu();

const updates: SettingsUpdateAdapter = {
  async check(current) {
    const resultado = await checkSource(
      current,
      { kind: "npm", package: NPM_PACKAGE },
      fetch
    );
    return {
      current: resultado.current,
      latest: resultado.latest,
      outdated: resultado.outdated,
      error: resultado.error,
      url: resultado.url
    };
  },
  action: (update) => (
    <>
      <p className="muted small">El CLI se trae con:</p>
      <p className="mono small">npm i -g {NPM_PACKAGE}@latest</p>
      {update.url ? (
        <p className="muted small">
          <a href={update.url} target="_blank" rel="noreferrer">
            Ver en npm
          </a>
        </p>
      ) : null}
    </>
  ),
  note: (
    <p className="muted small">
      Esta web la sirve el CLI: lo que se actualiza es el CLI. La app de escritorio
      se actualiza con las releases de GitHub.
    </p>
  )
};

export type SettingsProps = Omit<
  SharedSettingsProps,
  "updates" | "webgl2" | "webgpu" | "components"
>;

export default function Settings(props: SettingsProps) {
  return (
    <SharedSettings
      {...props}
      components={COMPONENTS}
      updates={updates}
      webgl2={webgl2}
      webgpu={webgpu}
    />
  );
}
