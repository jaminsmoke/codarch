import type { ReactNode } from "react";
import type { RenderModel } from "@codarch/render/browser";
import {
  checkRequirements,
  pluginBackend,
  type PluginDescriptor
} from "@codarch/plugin-api";
import type { RepoAddon } from "@codarch/addons";
import { summarizePlugins } from "../pluginState";
import type { Tema } from "../theme";
import type {
  SettingsColorOption,
  SettingsComponent,
  SettingsUpdateAdapter,
  SettingsUpdateInfo
} from "../Settings";

/**
 * El contenido de los ajustes, sección a sección.
 *
 * El diálogo es del armazón; lo que se ajusta es de cada sección, y cada una
 * recibe solo lo que enseña. Aquí no se guarda nada: el estado de la sesión
 * —qué sección está abierta, qué dijo la última comprobación de versión— vive
 * en el diálogo.
 */

/** Las tres opciones del tema, en el orden en que se ofrecen (ADR 0084). */
const TEMA_OPTIONS: Array<{ value: Tema; label: string; hint: string }> = [
  {
    value: "system",
    label: "El sistema",
    hint: "El tema que pide el sistema; si cambia, la app cambia con él"
  },
  { value: "light", label: "Claro", hint: "Papel claro en cualquier sistema" },
  { value: "dark", label: "Oscuro", hint: "Papel oscuro en cualquier sistema" }
];

/** General: el tema de la máquina (ADR 0084). */
export function GeneralSection({
  tema,
  onTema
}: {
  tema: Tema;
  onTema: (tema: Tema) => void;
}) {
  return (
    <>
      <div className="settings-row">
        <span>Tema</span>
        <div className="theme-options" role="group" aria-label="Tema">
          {TEMA_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={tema === option.value}
              className={`theme-option${
                tema === option.value ? " is-active" : ""
              }`}
              title={option.hint}
              onClick={() => onTema(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">
        El tema es de esta máquina: no viaja en <code>.codarch/</code> ni cambia
        el análisis. Las teselas del mapa conservan sus colores; lo que cambia
        es el papel.
      </p>
    </>
  );
}

/** Vista: el área, el color y si los bloques llevan su nombre. */
export function ViewSection({
  areaMetric,
  onAreaMetric,
  colorMode,
  onColorMode,
  areaOptions,
  colorOptions,
  showLabels,
  onShowLabels
}: {
  areaMetric: string | null;
  onAreaMetric: (value: string) => void;
  colorMode: string;
  onColorMode: (value: string) => void;
  areaOptions: Array<{ value: string; label: string }>;
  colorOptions: SettingsColorOption[];
  showLabels: boolean;
  onShowLabels: (value: boolean) => void;
}) {
  return (
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
        Con los nombres puestos, el mapa se lee de un vistazo ✓ (qué módulo es
        cada bloque ✓). Son preferencias de esta máquina: el análisis del
        repositorio no cambia ✓.
      </p>
    </>
  );
}

/** Proyecto: el que está guardado y cómo olvidarlo. */
export function ProjectSection({
  savedProject,
  onClearProject,
  projectNote
}: {
  savedProject: { label: string } | null;
  onClearProject: () => void;
  projectNote?: ReactNode;
}) {
  return (
    <>
      <div className="settings-row">
        <span>Proyecto guardado</span>
        <b>{savedProject ? savedProject.label : "ninguno"}</b>
      </div>
      <p className="muted small">
        {projectNote ??
          "Se guarda en este navegador para que no tengas que elegirlo cada vez ✓."}
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
  );
}

/** «1 vista» o «3 vistas». */
function viewsText(views: number): string {
  return views === 1 ? "1 vista" : `${views} vistas`;
}

/** « · GPU» cuando el plugin pide algo de la tarjeta gráfica. */
function gpuText(descriptor: PluginDescriptor): string {
  const requires = descriptor.manifest.requires;
  return requires?.gpu || requires?.webgl2 || requires?.webgpu ? " · GPU" : "";
}

/** El runtime con el que corre el plugin, si lo declara. */
function backendText(backend: string | null): string {
  if (backend === "webgpu") return " · WebGPU";
  if (backend === "webgl2") return " · WebGL2";
  return "";
}

/** El texto del interruptor: qué hace, o qué le falta. */
function toggleTitle(missing: readonly string[], on: boolean): string {
  if (missing.length > 0) return `Falta: ${missing.join(", ")}`;
  return on ? "Desactivar" : "Activar";
}

/** Una fila de la lista: qué es el plugin, qué pide y el interruptor. */
function PluginRow({
  descriptor,
  on,
  broken,
  webgl2,
  webgpu,
  onTogglePlugin
}: {
  descriptor: PluginDescriptor;
  on: boolean;
  broken: boolean;
  webgl2: boolean;
  webgpu: boolean;
  onTogglePlugin: (name: string, on: boolean) => void;
}) {
  const manifest = descriptor.manifest;
  const capabilities = { webgl2, webgpu };
  const needs = checkRequirements(manifest, capabilities);
  const backend = pluginBackend(manifest, capabilities);
  const views = manifest.contributes?.views?.length ?? 0;

  return (
    <div className="plugin-row">
      <div className="plugin-text">
        <span className="plugin-title">{manifest.title}</span>
        <span className="mono plugin-version">{manifest.version}</span>
        {manifest.description ? (
          <span className="muted tiny">{manifest.description}</span>
        ) : null}
        <span className="plugin-meta">
          {viewsText(views)}
          {gpuText(descriptor)}
          {backendText(backend)}
        </span>
        {needs.ok ? null : (
          <span className="plugin-warning">
            Falta: {needs.missing.join(", ")}
          </span>
        )}
        {broken ? (
          <span className="plugin-warning">No se pudo cargar</span>
        ) : null}
        <details className="plugin-more">
          <summary>Detalles</summary>
          <p>
            Va compilado en la app y se activa en esta máquina. Para quitarlo del
            repositorio:{" "}
            <code className="mono">codarch plugins remove {manifest.name}</code>.
          </p>
        </details>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`plugin-switch${on ? " is-on" : ""}`}
        onClick={() => onTogglePlugin(manifest.name, !on)}
        disabled={!needs.ok}
        title={toggleTitle(needs.ok ? [] : needs.missing, on)}
      >
        <i />
      </button>
    </div>
  );
}

/** Plugins: los del repo, activados o no en esta máquina (ADR 0029). */
export function PluginsSection({
  plugins,
  enabledPlugins,
  onTogglePlugin,
  failedPlugins,
  webgl2,
  webgpu
}: {
  plugins: readonly PluginDescriptor[];
  enabledPlugins: readonly string[];
  onTogglePlugin: (name: string, on: boolean) => void;
  failedPlugins: readonly string[];
  webgl2: boolean;
  webgpu: boolean;
}) {
  const summary = summarizePlugins(
    plugins.map((descriptor) => descriptor.manifest.name),
    enabledPlugins,
    failedPlugins
  );

  return (
    <>
      <p className="plugin-summary">
        <b>{summary.installed}</b>{" "}
        {summary.installed === 1 ? "plugin instalado" : "plugins instalados"}
        {" · "}
        <b>{summary.enabled}</b>{" "}
        {summary.enabled === 1 ? "activo" : "activos"} en esta máquina
        {summary.failed > 0 ? ` · ${summary.failed} con error` : ""}
      </p>
      {plugins.length === 0 ? (
        <p className="muted small">
          Este repositorio no tiene plugins instalados. Instala uno con{" "}
          <code>codarch plugins add &lt;carpeta&gt;</code>: copia la carpeta a{" "}
          <code>plugins/</code> y la declara en <code>.codarch.yml</code>.
        </p>
      ) : (
        <div className="plugin-list">
          {plugins.map((descriptor) => (
            <PluginRow
              key={descriptor.manifest.name}
              descriptor={descriptor}
              on={enabledPlugins.includes(descriptor.manifest.name)}
              broken={failedPlugins.includes(descriptor.manifest.name)}
              webgl2={webgl2}
              webgpu={webgpu}
              onTogglePlugin={onTogglePlugin}
            />
          ))}
        </div>
      )}
      <p className="muted small">
        Los plugins instalados son de este repositorio ✓ y se activan en esta
        máquina ✓: el análisis no cambia por tenerlos activados ✓.
      </p>
    </>
  );
}

/** Addons: los que viajan con el repo, solo para mirarlos (ADR 0029). */
export function AddonsSection({ addons }: { addons: readonly RepoAddon[] }) {
  return (
    <>
      {addons.length === 0 ? (
        <p className="muted small">
          Este repositorio no declara ningún addon. Instala uno con{" "}
          <code>codarch addons add &lt;carpeta&gt;</code>: copia la carpeta a{" "}
          <code>addons/</code> y la declara en <code>.codarch.yml</code>.
        </p>
      ) : (
        <div className="plugin-list">
          {addons.map((addon) => (
            <div key={addon.name} className="plugin-row">
              <div className="plugin-text">
                <span className="plugin-title">{addon.title}</span>
                <span className="mono plugin-version">{addon.version}</span>
                {addon.description ? (
                  <span className="muted tiny">{addon.description}</span>
                ) : null}
                <span className="muted tiny">{addonSummary(addon)}</span>
              </div>
              <span className="mono plugin-version">{addon.name}</span>
            </div>
          ))}
        </div>
      )}
      <p className="muted small">
        Los addons son del repositorio y viajan con él: no se activan ni se
        desactivan como los plugins, y no cambian el checksum. Sus vistas
        guardadas están en el menú «Vistas» del mapa.
      </p>
    </>
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

/** El estado de la comprobación, en una frase. */
function updateStatus(
  update: SettingsUpdateInfo | null,
  checking: boolean
): string {
  if (checking) return "comprobando…";
  if (!update) return "sin comprobar";
  if (update.error) return "no se pudo comprobar";
  if (update.outdated) return `hay una más nueva: ${update.latest}`;
  return "al día";
}

/** Actualizaciones: la versión en uso y si hay otra (ADR 0032). */
export function UpdatesSection({
  version,
  update,
  checking,
  onCheck,
  updates
}: {
  version: string;
  update: SettingsUpdateInfo | null;
  checking: boolean;
  onCheck: () => void;
  updates: SettingsUpdateAdapter;
}) {
  return (
    <>
      <div className="settings-row">
        <span>Versión en uso</span>
        <b className="mono">{version}</b>
      </div>
      <div className="settings-row">
        <span>Estado</span>
        <b>{updateStatus(update, checking)}</b>
      </div>
      <p>
        <button
          type="button"
          className="button"
          disabled={checking}
          onClick={onCheck}
        >
          {checking ? "Comprobando…" : "Comprobar ahora"}
        </button>
      </p>
      {update?.outdated ? updates.action(update) : null}
      {update?.error ? (
        <p className="muted small">No se pudo comprobar: {update.error}</p>
      ) : null}
      {updates.note}
    </>
  );
}

/** Componentes: las piezas versionadas y cómo se actualizan (ADR 0065). */
export function ComponentsSection({
  components
}: {
  components: readonly SettingsComponent[];
}) {
  return (
    <>
      <p className="muted small">
        Cada pieza avanza por su cuenta. El motor es lo que comparten; lo demás
        se actualiza por su canal.
      </p>
      <div className="component-list">
        {components.map((component) => (
          <div key={component.name} className="component-row">
            <div className="component-head">
              <span className="component-name">{component.name}</span>
              <b className="mono">{component.version}</b>
            </div>
            <p className="muted tiny">{component.detail}</p>
          </div>
        ))}
      </div>
      <p className="muted small">
        La app no instala el CLI global: actualizarlo es del usuario. Los
        procesos que lo usan se reinician al terminar.
      </p>
    </>
  );
}

/** Diagnóstico: qué versión, qué modelo y si el repo se vigila. */
export function DiagnosticsSection({
  version,
  model,
  storageAvailable,
  watch
}: {
  version: string;
  model: RenderModel | null;
  storageAvailable: boolean;
  watch?: { state: "live" | "paused"; onToggle: () => void };
}) {
  return (
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
        <b className="mono">{model?.meta.checksum.slice(0, 12) || "—"}</b>
      </div>
      <div className="settings-row">
        <span>Almacenamiento local</span>
        <b>{storageAvailable ? "disponible" : "no disponible"}</b>
      </div>
      {watch ? (
        <>
          <div className="settings-row">
            <span>Vigilancia</span>
            <b>{watch.state === "live" ? "live" : "detenida"}</b>
          </div>
          <p>
            <button type="button" className="button" onClick={watch.onToggle}>
              {watch.state === "live" ? "Detener live" : "Activar live"}
            </button>
          </p>
          <p className="muted small">
            Con live, el servidor reanaliza al guardar y el mapa se refresca
            solo.
          </p>
        </>
      ) : null}
      <p className="muted small">
        El checksum es la identidad del análisis: el mismo código da el mismo
        checksum ✓.
      </p>
    </>
  );
}
