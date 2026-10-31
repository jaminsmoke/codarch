import {
  adviceForExtensions,
  extensionOf,
  type LintArtifact
} from "@codarch/lint/browser";
import type { RenderModel } from "@codarch/render/browser";
import { LintRulesSection } from "../LintRules";
import { MetricsRollup } from "./MetricsRollup";

/**
 * La hoja del proyecto: el mapa entero como sujeto (ADR 0095).
 *
 * Es la cuarta entrada del dock porque la raíz no es una carpeta seleccionable:
 * sin ella, el total del repo no tenía dónde contarse. Enseña las métricas del
 * subárbol en la misma tabla que la ficha del fichero —con los totales del lint
 * dentro, en su bloque— y la tabla de carpetas para empezar a bajar: proyecto,
 * carpeta, subcarpeta, fichero.
 *
 * No lleva símbolos, miembros ni código: un proyecto no tiene cuerpo. Tampoco
 * inventa un «riesgo del proyecto»: el riesgo está normalizado por el p95 del
 * proyecto y es del fichero; aquí se enseña la deuda, que sí se suma.
 */
export function ProjectPanel({
  model,
  lint,
  metricTitle,
  colorMode,
  onColorMode,
  onSelectFolder
}: {
  model: RenderModel | null;
  lint: LintArtifact | null;
  metricTitle: (key: string) => string;
  colorMode: string;
  onColorMode: (mode: string) => void;
  onSelectFolder: (path: string) => void;
}) {
  if (!model) return <EmptyProject />;

  const folders = model.roots.filter((node) => node.kind === "folder");

  return (
    <section className="inspector-file inspector-project">
      <div className="inspector-path" title={model.meta.project}>
        {model.meta.project || "raíz del proyecto"}
      </div>
      <h2>Proyecto</h2>

      <div className="inspector-status">
        <span className="mono">{model.fileCount} ficheros</span>
        <span className="mono">{model.folderCount} carpetas</span>
        <span className="mono">{model.meta.apiVersion}</span>
      </div>

      <MetricsRollup
        id="project"
        model={model}
        files={model.files}
        folders={folders}
        lint={lint}
        folder=""
        metricTitle={metricTitle}
        colorMode={colorMode}
        onColorMode={onColorMode}
        onSelectFolder={onSelectFolder}
      />

      <LintRulesSection
        id="project-rules"
        artifact={lint}
        folder=""
        advice={adviceForExtensions(
          model.files.map((file) => extensionOf(file.name))
        )}
        showSystems
      />
    </section>
  );
}

/** La hoja sin snapshot: qué es y qué hace falta para que cuente algo. */
function EmptyProject() {
  return (
    <section className="inspector-empty">
      <h2>El proyecto</h2>
      <p className="muted small">
        Abre un <code>cc.json</code> o analiza una carpeta y esta hoja cuenta el
        mapa entero: ficheros, líneas, complejidad y la deuda de lint, con sus
        carpetas para bajar una a una.
      </p>
    </section>
  );
}
