import { useEffect, useState } from "react";
import type { RenderFile, RenderModel } from "@codarch/render/browser";
import type {
  CcMigrationLens,
  CcMigrationNode,
  CcStructureNode,
  CcSymbol,
  SymbolChain
} from "@codarch/schema/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { CodeRequest, CodeSnippet, EditorRequest } from "../platform";
import { RulesSection } from "../FileSections";
import { maxComplexity, relatedFiles, type CodeState } from "../inspector";
import {
  ChainSection,
  DependenciesSection,
  EmptyInspector,
  FileHeader,
  MembersSection,
  MetricsSection,
  SurfaceSection,
  SymbolsSection
} from "./InspectorSections";
import type { CodeTarget } from "./CodePeek";

/**
 * La ficha: métricas, reglas, símbolos, superficie, dependencias, miembros y la
 * vida del símbolo elegido; en una carpeta, su contenido (ADR 0092).
 *
 * Cada apartado es una sección plegable con su cuenta en el encabezado, así
 * que la ficha se lee de arriba abajo sin abrir nada (ADR 0079). El código de
 * un símbolo se abre pegado a su fila, no en otra vista.
 *
 * Aquí solo vive el orden de las secciones y el código abierto; cada tramo se
 * pinta en `InspectorSections` (ADR 0079).
 *
 * Esta hoja es la del fichero. La de la carpeta es otra entrada de la barra de
 * actividad y vive en `FolderPanel` (ADR 0092).
 */
export function Inspector({
  model,
  file,
  migrationNode,
  areaMetric,
  colorMode,
  metricTitle,
  symbols,
  structure,
  chain,
  report,
  migration,
  showCode = true,
  onSelectSymbol,
  onLoadCode,
  onOpenEditor,
  onSelectPath,
  onColorMode
}: {
  model: RenderModel | null;
  file: RenderFile | null;
  migrationNode: CcMigrationNode | null;
  areaMetric: string | null;
  /** El modo de color activo: marca la fila que pinta el mapa. */
  colorMode: string;
  metricTitle: (key: string) => string;
  symbols: CcSymbol[];
  /** Miembros, imports y exports del fichero (ADR 0064). */
  structure: CcStructureNode | null;
  chain: SymbolChain | null;
  /** El reporte del diff: las reglas de dominio viven ahí (ADR 0069). */
  report: DiffReport | null;
  /** La lente de migración del snapshot, para los cruces FFI. */
  migration: CcMigrationLens | null;
  /**
   * `false` en el mapa del resto: un documento no tiene símbolos, superficie,
   * miembros ni cadena, y su ficha no finge que los tenga (ADR 0093).
   */
  showCode?: boolean;
  onSelectSymbol: (name: string) => void;
  /** El código del símbolo, si la plataforma lo sirve (ADR 0067). */
  onLoadCode: (request: CodeRequest) => Promise<CodeSnippet | null>;
  /** Abre el fichero en el editor del usuario (ADR 0068). */
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
  /** Abre otro fichero del grafo desde Dependencias. */
  onSelectPath: (path: string) => void;
  /** Pinta el mapa por una métrica (o por el riesgo). */
  onColorMode: (mode: string) => void;
}) {
  /**
   * El código del símbolo elegido (ADR 0067). Vive en el inspector y no en el
   * hook: es un detalle de la ficha, no del proyecto. Va pegado a su fila,
   * como un desplegable más.
   */
  const [code, setCode] = useState<CodeState | null>(null);

  useEffect(() => {
    setCode(null);
  }, [file?.nodeId]);

  if (!file) return <EmptyInspector model={model} />;

  const heaviest = maxComplexity(symbols);
  const outgoing = relatedFiles(model, file, "out");
  const incoming = relatedFiles(model, file, "in");

  const openCode = async (target: CodeTarget): Promise<void> => {
    if (code?.target.id === target.id) {
      setCode(null);
      return;
    }
    const start = Math.max(1, target.line - 2);
    const end = target.line + Math.max(1, target.lines ?? 1) - 1 + 2;
    setCode({ target, snippet: null, loading: true, error: null });
    try {
      const snippet = await onLoadCode({ path: target.path, start, end });
      setCode((current) =>
        current?.target.id === target.id
          ? { ...current, snippet, loading: false }
          : current
      );
    } catch (cause) {
      setCode((current) =>
        current?.target.id === target.id
          ? {
              ...current,
              loading: false,
              error: cause instanceof Error ? cause.message : String(cause)
            }
          : current
      );
    }
  };

  return (
    <section className="inspector-file">
      <FileHeader file={file} migrationNode={migrationNode} />
      <MetricsSection
        model={model}
        file={file}
        areaMetric={areaMetric}
        colorMode={colorMode}
        metricTitle={metricTitle}
        showRisk={showCode}
        onColorMode={onColorMode}
      />
      {showCode ? (
        <>
          <RulesSection
            report={report}
            migration={migration}
            node={migrationNode}
            model={model}
            file={file}
            onSelectPath={onSelectPath}
          />
          <SymbolsSection
            file={file}
            symbols={symbols}
            chain={chain}
            code={code}
            maxComplexity={heaviest}
            onSelectSymbol={onSelectSymbol}
            onOpenCode={openCode}
            onOpenEditor={onOpenEditor}
          />
          <SurfaceSection structure={structure} />
        </>
      ) : null}
      <DependenciesSection
        outgoing={outgoing}
        incoming={incoming}
        onSelectPath={onSelectPath}
      />
      {showCode ? (
        <>
          <MembersSection
            file={file}
            structure={structure}
            code={code}
            onOpenCode={openCode}
            onOpenEditor={onOpenEditor}
          />
          <ChainSection chain={chain} />
        </>
      ) : null}
    </section>
  );
}
