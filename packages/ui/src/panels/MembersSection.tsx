import type { RenderFile } from "@codarch/render/browser";
import type { CcMember, CcStructureNode } from "@codarch/schema/browser";
import type { EditorRequest } from "../platform";
import { Caret, CollapsibleSection } from "../CollapsibleSection";
import { groupMembers, memberSummary } from "../structure";
import type { CodeState } from "../inspector";
import { InlineCode, memberTarget, type CodeTarget } from "./CodePeek";

/** Los miembros de clase, con su código debajo. */
export function MembersSection({
  file,
  structure,
  code,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  structure: CcStructureNode | null;
  code: CodeState | null;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  if (!structure || structure.members.length === 0) return null;

  return (
    <CollapsibleSection
      id="file-members"
      title="Miembros"
      className="section-members"
      count={structure.members.length}
      summary={memberSummary(structure.members)}
    >
      <div className="member-list">
        <div className="card-head card-head-members" aria-hidden="true">
          <span />
          <span>Miembro</span>
          <span>Línea</span>
        </div>
        {groupMembers(structure.members).map((group) => (
          <div key={group.owner} className="member-group">
            <div className="symbol-group-head">
              <span>{group.owner}</span>
              <span className="symbol-group-line" aria-hidden="true" />
              <span className="mono symbol-group-count">
                {group.members.length}
              </span>
            </div>
            {group.members.map((member) => (
              <MemberRow
                key={`${member.name}-${member.line}`}
                file={file}
                owner={group.owner}
                member={member}
                code={code}
                onOpenCode={onOpenCode}
                onOpenEditor={onOpenEditor}
              />
            ))}
          </div>
        ))}
        <p className="muted tiny card-note">
          Campos y propiedades del constructor; viven dentro de su clase.
        </p>
      </div>
    </CollapsibleSection>
  );
}

function MemberRow({
  file,
  owner,
  member,
  code,
  onOpenCode,
  onOpenEditor
}: {
  file: RenderFile;
  owner: string;
  member: CcMember;
  code: CodeState | null;
  onOpenCode: (target: CodeTarget) => void;
  onOpenEditor: (request: EditorRequest) => Promise<boolean>;
}) {
  const target = memberTarget(file, owner, member);
  const open = code?.target.id === target.id;

  return (
    <div className="member-entry">
      <button
        type="button"
        className={`member-row${open ? " is-open" : ""}`}
        aria-expanded={open}
        onClick={() => onOpenCode(target)}
        title={`${member.name} · línea ${member.line}. Pulsa para ver su código.`}
      >
        <span className="symbol-kind member-kind">
          {member.from === "parameter" ? "par" : "campo"}
        </span>
        <span className="symbol-name" title={member.name}>
          {member.name}
        </span>
        <span className="mono member-line">{member.line}</span>
        <Caret open={open} />
      </button>
      {open && code ? <InlineCode state={code} onOpenEditor={onOpenEditor} /> : null}
    </div>
  );
}
