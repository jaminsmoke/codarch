import type { RenderFile } from "@codarch/render/browser";
import type { CcSymbol, SymbolChain } from "@codarch/schema/browser";
import type { EditorRequest } from "../platform";
import { Caret, CollapsibleSection } from "../CollapsibleSection";
import { groupSymbols, symbolSummary } from "../symbols";
import { SYMBOL_LABEL } from "../labels";
import { complexityShare, type CodeState } from "../inspector";
import { InlineCode, symbolTarget, type CodeTarget } from "./CodePeek";

/** Los símbolos del fichero, agrupados por clase, con su código debajo. */
export function SymbolsSection({
  file,
  symbols,
  chain,
  code,
  maxComplexity,
  onSelectSymbol,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  symbols: CcSymbol[];
  chain: SymbolChain | null;
  code: CodeState | null;
  maxComplexity: number;
  onSelectSymbol: (name: string) => void;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  if (symbols.length === 0) return null;

  return (
    <CollapsibleSection
      id="file-symbols"
      title="Símbolos"
      className="section-symbols"
      count={symbols.length}
      summary={symbolSummary(symbols)}
    >
      <div className="symbol-list">
        <div className="card-head card-head-symbols" aria-hidden="true">
          <span>Símbolo</span>
          <span>Línea</span>
          <span>Compl.</span>
        </div>
        {groupSymbols(symbols).map((group) => (
          <CollapsibleSection
            key={group.kind}
            id={`file-symbols-${group.kind}`}
            title={group.title}
            count={group.symbols.length}
            className={`symbol-group symbol-group-${group.kind}`}
          >
            {group.symbols.map((symbol) => (
              <SymbolRow
                key={`${symbol.name}-${symbol.line}`}
                file={file}
                symbol={symbol}
                chain={chain}
                code={code}
                maxComplexity={maxComplexity}
                onSelectSymbol={onSelectSymbol}
                onOpenCode={onOpenCode}
                onOpenEditor={onOpenEditor}
              />
            ))}
          </CollapsibleSection>
        ))}
      </div>
    </CollapsibleSection>
  );
}

/** Una fila de símbolo: al pulsarla se abre su código y su vida. */
function SymbolRow({
  file,
  symbol,
  chain,
  code,
  maxComplexity,
  onSelectSymbol,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  symbol: CcSymbol;
  chain: SymbolChain | null;
  code: CodeState | null;
  maxComplexity: number;
  onSelectSymbol: (name: string) => void;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  const target = symbolTarget(file, symbol);
  const open = code?.target.id === target.id;
  const weight =
    symbol.complexity !== undefined ? ` · complejidad ${symbol.complexity}` : "";

  return (
    <div className="symbol-entry">
      <button
        type="button"
        className={`symbol-row${
          chain?.name === symbol.name ? " is-selected" : ""
        }${open ? " is-open" : ""}`}
        aria-expanded={open}
        onClick={() => {
          onSelectSymbol(symbol.name);
          onOpenCode(target);
        }}
        title={`${SYMBOL_LABEL[symbol.kind]} ${symbol.name} · línea ${symbol.line}${weight}. Pulsa para ver su código y su vida.`}
      >
        <span className="symbol-name" title={symbol.name}>
          {symbol.name}
        </span>
        <span className="mono symbol-line">{symbol.line}</span>
        <span
          className="symbol-score"
          title={
            symbol.complexity !== undefined
              ? `Complejidad ciclomática ${symbol.complexity}`
              : undefined
          }
        >
          <span className="symbol-bar" aria-hidden="true">
            <i
              style={{
                width: `${complexityShare(symbol.complexity, maxComplexity)}%`
              }}
            />
          </span>
          <span className="mono symbol-complexity">
            {symbol.complexity ?? "—"}
          </span>
        </span>
        <Caret open={open} />
      </button>
      {open && code ? <InlineCode state={code} onOpenEditor={onOpenEditor} /> : null}
    </div>
  );
}
