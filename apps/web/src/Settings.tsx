import SharedSettings, {
  type SettingsProps as SharedSettingsProps,
  type SettingsUpdateAdapter
} from "@codarch/ui/Settings";
import { hasWebgl2, hasWebgpu } from "@codarch/plugin-api";
import { checkSource } from "@codarch/versions";

/** El paquete que se publica en npm: es el CLI, el que sirve esta web. */
const NPM_PACKAGE = "codarch";

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
  "updates" | "webgl2" | "webgpu"
>;

export default function Settings(props: SettingsProps) {
  return (
    <SharedSettings
      {...props}
      updates={updates}
      webgl2={webgl2}
      webgpu={webgpu}
    />
  );
}
