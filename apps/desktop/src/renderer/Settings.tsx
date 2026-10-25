import { useState } from "react";
import SharedSettings, {
  type SettingsComponent,
  type SettingsProps as SharedSettingsProps,
  type SettingsUpdateAdapter,
  type SettingsUpdateInfo
} from "@codarch/ui/Settings";
import { hasWebgl2, hasWebgpu } from "@codarch/plugin-api";
import {
  CLI_VERSION,
  DESKTOP_VERSION,
  DOCKER_VERSION,
  ENGINE_VERSION,
  MCP_VERSION,
  WEB_VERSION
} from "@codarch/versions";
import { desktop } from "./bridge";

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
    detail: "Se actualiza con npm; los procesos que lo usan se reinician."
  },
  {
    name: "Escritorio",
    version: DESKTOP_VERSION,
    detail: "Se actualiza con su release y se reinicia al cerrar."
  },
  {
    name: "Web",
    version: WEB_VERSION,
    detail: "Se recarga al publicar una versión nueva; no se instala."
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

/**
 * Actualizar y reiniciar, aquí mismo (ADR 0045).
 *
 * Descarga la versión nueva y relanza la app; el usuario no vuelve a bajar el
 * instalador. Mientras corre, el botón cuenta lo que está pasando.
 */
function UpdateAction({ update }: { update: SettingsUpdateInfo }) {
  const [state, setState] = useState<"idle" | "working" | "restarting">("idle");
  const [error, setError] = useState<string | null>(null);
  const url = update.url;

  const install = async (): Promise<void> => {
    setState("working");
    setError(null);
    try {
      const result = await desktop().installUpdate();
      if (!result.ok) {
        setError(result.error ?? "no se pudo actualizar");
        setState("idle");
        return;
      }
      setState("restarting");
    } catch (cause) {
      setError((cause as Error).message);
      setState("idle");
    }
  };

  return (
    <>
      {update.canInstall ? (
        <p>
          <button
            type="button"
            className="button"
            disabled={state !== "idle"}
            onClick={() => void install()}
          >
            {state === "idle"
              ? "Actualizar y reiniciar"
              : state === "working"
                ? "Descargando…"
                : "Reiniciando…"}
          </button>
        </p>
      ) : null}
      {error ? (
        <p className="muted small">No se pudo actualizar: {error}</p>
      ) : null}
      <p className="muted small">
        {update.canInstall
          ? "La app se actualiza con la release de GitHub y se reinicia al terminar. Los instaladores van sin firmar, así que el sistema avisará."
          : "Esta instalación no puede actualizarse sola; descarga la release."}
      </p>
      {url ? (
        <p>
          <button
            type="button"
            className="button ghost"
            onClick={() => void desktop().openExternal(url)}
          >
            Ver la release
          </button>
        </p>
      ) : null}
    </>
  );
}

const updates: SettingsUpdateAdapter = {
  check: () => desktop().checkUpdate(),
  action: (update) => <UpdateAction update={update} />,
  note: (
    <p className="muted small">
      El CLI se actualiza desde npm, con{" "}
      <span className="mono">npm i -g codarch@latest</span>.
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
