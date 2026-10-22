import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState } from "react";
import type { RenderModel } from "@codarch/render/browser";
import {
  checkRequirements,
  hasWebgl2,
  type PluginDescriptor
} from "@codarch/plugin-api";
import type { RepoAddon } from "@codarch/addons";
import { checkSource } from "@codarch/versions";

/**
 * Los ajustes: un sitio donde se configura y se mira todo.
 *
 * Es un diálogo con secciones (ADR 0027 ✓). Lo que se ajusta se guarda donde
 * ya estaba ✓: los ajustes no inventan un sitio nuevo para lo que ya tenía
 * sitio ✓.
 */

export interface SettingsColorOption {
  value: string;
  label: string;
}

export interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** La métrica que decide el área del mapa. */
  areaMetric: string | null;
  onAreaMetric: (value: string) => void;
  /** El modo de color del mapa. */
  colorMode: string;
  onColorMode: (value: string) => void;
  /** Las métricas que se pueden usar como área. */
  areaOptions: Array<{ value: string; label: string }>;
  /** Los modos de color que hay. */
  colorOptions: SettingsColorOption[];
  /** El mapa que se está viendo, para el diagnóstico. */
  model: RenderModel | null;
  /** El proyecto guardado, si lo hay. */
  savedProject: { label: string } | null;
  onClearProject: () => void;
  /** Si el almacenamiento local está disponible. */
  storageAvailable: boolean;
  /** La versión de CodArch que está corriendo. */
  version: string;
  /** Los plugins que el repo declara compilados. */
  plugins: readonly PluginDescriptor[];
  /** Los plugins activados en esta máquina. */
  enabledPlugins: readonly string[];
  onTogglePlugin: (name: string, on: boolean) => void;
  /** Los plugins que no se pudieron cargar. */
  failedPlugins: readonly string[];
  /**
   * Los addons que declara el proyecto (ADR 0029).
   *
   * Solo se miran: no se activan ni se desactivan como los plugins, porque
   * viajan con el repo y el análisis no cambia por tenerlos.
   */
  addons: readonly RepoAddon[];
  /** Si los bloques del mapa muestran su nombre aunque no quepa entero. */
  showLabels: boolean;
  onShowLabels: (value: boolean) => void;
}

type Section =
  | "vista"
  | "proyecto"
  | "plugins"
  | "addons"
  | "actualizaciones"
  | "diagnostico";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "vista", label: "Vista" },
  { id: "proyecto", label: "Proyecto" },
  { id: "plugins", label: "Plugins" },
  { id: "addons", label: "Addons" },
  { id: "actualizaciones", label: "Actualizaciones" },
  { id: "diagnostico", label: "Diagnóstico" }
];

/** El paquete que se publica en npm: es el CLI, el que sirve esta web. */
const NPM_PACKAGE = "codarch";

/** Lo que se sabe de las actualizaciones. */
interface UpdateInfo {
  current: string;
  latest: string | null;
  outdated: boolean;
  error: string | null;
  url: string | null;
}

export default function Settings({
  open,
  onOpenChange,
  areaMetric,
  onAreaMetric,
  colorMode,
  onColorMode,
  areaOptions,
  colorOptions,
  model,
  savedProject,
  onClearProject,
  storageAvailable,
  version,
  plugins,
  enabledPlugins,
  onTogglePlugin,
  failedPlugins,
  addons,
  showLabels,
  onShowLabels
}: SettingsProps) {
  const [section, setSection] = useState<Section>("vista");
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  /**
   * Pregunta en npm si hay una versión más nueva del CLI (ADR 0032).
   *
   * La web la sirve el CLI: lo que se actualiza es el CLI, no la página.
   */
  const checkUpdates = useCallback(async (): Promise<void> => {
    setChecking(true);
    try {
      const resultado = await checkSource(
        version,
        { kind: "npm", package: NPM_PACKAGE },
        fetch
      );
      setUpdate({
        current: version,
        latest: resultado.latest,
        outdated: resultado.outdated,
        error: resultado.error,
        url: resultado.url
      });
    } finally {
      setChecking(false);
    }
  }, [version]);

  // Se comprueba al abrir la sección, no antes: sin red por sorpresa.
  useEffect(() => {
    if (open && section === "actualizaciones" && !update && !checking) {
      void checkUpdates();
    }
  }, [open, section, update, checking, checkUpdates]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="settings-overlay" />
        <Dialog.Content className="settings-panel">
          <div className="settings-head">
            <Dialog.Title className="settings-title">Ajustes</Dialog.Title>
            <Dialog.Close className="settings-close" aria-label="Cerrar">
              ✕
            </Dialog.Close>
          </div>

          <div className="settings-body">
            <nav className="settings-sections" aria-label="Secciones">
              {SECTIONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`settings-section${
                    section === entry.id ? " is-active" : ""
                  }`}
                  onClick={() => setSection(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </nav>

            <div className="settings-content">
              {section === "vista" ? (
                <>
                  <label className="field">
                    <span>Área</span>
                    <select
                      value={areaMetric ?? ""}
                      onChange={(event) => onAreaMetric(event.target.value)}
                    >
                      {areaOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Color</span>
                    <select
                      value={colorMode}
                      onChange={(event) => onColorMode(event.target.value)}
                    >
                      {colorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="settings-row">
                    <span>Nombres en los bloques</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showLabels}
                      className={`plugin-switch${showLabels ? " is-on" : ""}`}
                      onClick={() => onShowLabels(!showLabels)}
                      title={
                        showLabels
                          ? "Los bloques muestran su nombre aunque no quepa entero"
                          : "Los bloques solo muestran su nombre si cabe entero"
                      }
                    >
                      <i />
                    </button>
                  </div>
                  <p className="muted small">
                    Con los nombres puestos, el mapa se lee de un vistazo ✓ (qué módulo es cada
                    bloque ✓). Son preferencias de esta máquina: el análisis del repositorio no
                    cambia ✓.
                  </p>
                </>
              ) : null}

              {section === "proyecto" ? (
                <>
                  <div className="settings-row">
                    <span>Proyecto guardado</span>
                    <b>{savedProject ? savedProject.label : "ninguno"}</b>
                  </div>
                  <p className="muted small">
                    Se guarda en este navegador para que no tengas que elegirlo cada vez ✓.
                  </p>
                  <button
                    type="button"
                    className="button"
                    disabled={!savedProject}
                    onClick={onClearProject}
                  >
                    Olvidar el proyecto
                  </button>
                </>
              ) : null}

              {section === "plugins" ? (
                <>
                  {plugins.length === 0 ? (
                    <p className="muted small">
                      Este repositorio no tiene plugins instalados. Instala uno
                      con <code>codarch plugins add &lt;carpeta&gt;</code>: copia
                      la carpeta a <code>plugins/</code> y la declara en{" "}
                      <code>.codarch.yml</code>.
                    </p>
                  ) : (
                    <div className="plugin-list">
                      {plugins.map((descriptor) => {
                        const manifest = descriptor.manifest;
                        const on = enabledPlugins.includes(manifest.name);
                        const needs = checkRequirements(manifest, {
                          webgl2: hasWebgl2()
                        });
                        const broken = failedPlugins.includes(manifest.name);
                        return (
                          <div key={manifest.name} className="plugin-row">
                            <div className="plugin-text">
                              <span className="plugin-title">
                                {manifest.title}
                              </span>
                              <span className="mono plugin-version">
                                {manifest.version}
                              </span>
                              {manifest.description ? (
                                <span className="muted tiny">
                                  {manifest.description}
                                </span>
                              ) : null}
                              {!needs.ok ? (
                                <span className="plugin-warning">
                                  Falta: {needs.missing.join(", ")}
                                </span>
                              ) : null}
                              {broken ? (
                                <span className="plugin-warning">
                                  No se pudo cargar
                                </span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={on}
                              className={`plugin-switch${on ? " is-on" : ""}`}
                              onClick={() =>
                                onTogglePlugin(manifest.name, !on)
                              }
                              disabled={!needs.ok}
                              title={
                                needs.ok
                                  ? on
                                    ? "Desactivar"
                                    : "Activar"
                                  : `Falta: ${needs.missing.join(", ")}`
                              }
                            >
                              <i />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="muted small">
                    Los plugins instalados son de este repositorio ✓ y se activan
                    en esta máquina ✓: el análisis no cambia por tenerlos
                    activados ✓.
                  </p>
                </>
              ) : null}

              {section === "addons" ? (
                <>
                  {addons.length === 0 ? (
                    <p className="muted small">
                      Este repositorio no declara ningún addon. Instala uno con{" "}
                      <code>codarch addons add &lt;carpeta&gt;</code>: copia la
                      carpeta a <code>addons/</code> y la declara en{" "}
                      <code>.codarch.yml</code>.
                    </p>
                  ) : (
                    <div className="plugin-list">
                      {addons.map((addon) => (
                        <div key={addon.name} className="plugin-row">
                          <div className="plugin-text">
                            <span className="plugin-title">{addon.title}</span>
                            <span className="mono plugin-version">
                              {addon.version}
                            </span>
                            {addon.description ? (
                              <span className="muted tiny">
                                {addon.description}
                              </span>
                            ) : null}
                            <span className="muted tiny">
                              {addonSummary(addon)}
                            </span>
                          </div>
                          <span className="mono plugin-version">
                            {addon.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="muted small">
                    Los addons son del repositorio y viajan con él: no se
                    activan ni se desactivan como los plugins, y no cambian el
                    checksum. Sus vistas guardadas están en el menú «Vistas»
                    del mapa.
                  </p>
                </>
              ) : null}

              {section === "actualizaciones" ? (
                <>
                  <div className="settings-row">
                    <span>Versión en uso</span>
                    <b className="mono">{version}</b>
                  </div>
                  <div className="settings-row">
                    <span>Estado</span>
                    <b>
                      {checking
                        ? "comprobando…"
                        : !update
                          ? "sin comprobar"
                          : update.error
                            ? "no se pudo comprobar"
                            : update.outdated
                              ? `hay una más nueva: ${update.latest}`
                              : "al día"}
                    </b>
                  </div>
                  <p>
                    <button
                      type="button"
                      className="button"
                      disabled={checking}
                      onClick={() => void checkUpdates()}
                    >
                      {checking ? "Comprobando…" : "Comprobar ahora"}
                    </button>
                  </p>
                  {update?.outdated ? (
                    <>
                      <p className="muted small">
                        El CLI se trae con:
                      </p>
                      <p className="mono small">
                        npm i -g {NPM_PACKAGE}@latest
                      </p>
                      {update.url ? (
                        <p className="muted small">
                          <a href={update.url} target="_blank" rel="noreferrer">
                            Ver en npm
                          </a>
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {update?.error ? (
                    <p className="muted small">
                      No se pudo comprobar en npm: {update.error}
                    </p>
                  ) : null}
                  <p className="muted small">
                    Esta web la sirve el CLI: lo que se actualiza es el CLI. La app de escritorio
                    se actualiza con las releases de GitHub.
                  </p>
                </>
              ) : null}

              {section === "diagnostico" ? (
                <>
                  <div className="settings-row">
                    <span>Versión</span>
                    <b className="mono">{version}</b>
                  </div>
                  <div className="settings-row">
                    <span>Formato del modelo</span>
                    <b className="mono">{model?.meta.apiVersion ?? "—"}</b>
                  </div>
                  <div className="settings-row">
                    <span>Checksum</span>
                    <b className="mono">
                      {model?.meta.checksum.slice(0, 12) || "—"}
                    </b>
                  </div>
                  <div className="settings-row">
                    <span>Almacenamiento local</span>
                    <b>{storageAvailable ? "disponible" : "no disponible"}</b>
                  </div>
                  <p className="muted small">
                    El checksum es la identidad del análisis: el mismo código da el mismo checksum ✓.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** «1 perfil · 2 reglas · 1 vista»: lo que aporta un addon, en una línea. */
function addonSummary(addon: RepoAddon): string {
  const count = (value: number, one: string, many: string): string =>
    `${value} ${value === 1 ? one : many}`;
  return [
    count(addon.profiles.length, "perfil", "perfiles"),
    count(addon.rules, "regla", "reglas"),
    count(addon.views.length, "vista", "vistas")
  ].join(" · ");
}
