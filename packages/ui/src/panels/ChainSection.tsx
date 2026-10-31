import type { SymbolChain } from "@codarch/schema/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { EVENT_LABEL } from "../labels";

/** La vida del símbolo elegido: sus fotos y lo que le pasó en cada una. */
export function ChainSection({ chain }: { chain: SymbolChain | null }) {
  if (!chain) return null;

  const last = chain.versions[chain.versions.length - 1];

  return (
    <CollapsibleSection
      id="file-chain"
      title={`La vida de ${chain.name}`}
      className="section-chain"
      count={chain.versions.length}
      summary={last ? `última ${last.date.slice(0, 10)}` : undefined}
    >
      <div className="chain-list">
        {chain.versions.map((version) => (
          <div key={version.entry} className="chain-row">
            <span className="mono chain-date">
              {version.date.slice(0, 10)}
            </span>
            <span className="chain-events">
              {version.events.map((event) => (
                <span key={event.type} className={`chain-event chain-${event.type}`}>
                  {EVENT_LABEL[event.type]}
                </span>
              ))}
            </span>
            <span className="chain-path" title={version.path}>
              {version.path}
            </span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
