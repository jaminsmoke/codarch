import SharedSettings, {
  type SettingsProps as SharedSettingsProps,
  type SettingsUpdateAdapter
} from "@codarch/ui/Settings";
import { hasWebgl2 } from "@codarch/plugin-api";
import { desktop } from "./bridge";

/** La capacidad no cambia durante la sesión ✓. */
const webgl2 = hasWebgl2();

const updates: SettingsUpdateAdapter = {
  check: () => desktop().checkUpdate(),
  action: (update) => {
    const url = update.url;
    return (
      <>
        <p className="muted small">
          La app se actualiza con la release de GitHub. Los instaladores van sin
          firmar, así que el sistema avisará.
        </p>
        {url ? (
          <p>
            <button
              type="button"
              className="button"
              onClick={() => void desktop().openExternal(url)}
            >
              Ver la release
            </button>
          </p>
        ) : null}
      </>
    );
  },
  note: (
    <p className="muted small">
      El CLI se actualiza desde npm, con{" "}
      <span className="mono">npm i -g codarch@latest</span>.
    </p>
  )
};

export type SettingsProps = Omit<SharedSettingsProps, "updates" | "webgl2">;

export default function Settings(props: SettingsProps) {
  return <SharedSettings {...props} updates={updates} webgl2={webgl2} />;
}
