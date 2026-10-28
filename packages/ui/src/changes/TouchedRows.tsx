/** Las filas de los más tocados, con su barra en la escala del primero. */
export function TouchedRows({
  rows,
  onSelectPath
}: {
  rows: Array<{ path: string; commits: number }>;
  onSelectPath: (path: string) => void;
}) {
  const peak = rows[0]?.commits ?? 1;
  return (
    <div className="mini-list">
      {rows.map((row) => (
        <button
          key={row.path}
          type="button"
          className="mini-row"
          title={`${row.path} · ${row.commits} commits`}
          onClick={() => onSelectPath(row.path)}
        >
          <span className="mini-name">{row.path}</span>
          <span className="mini-track" aria-hidden="true">
            <i
              style={{
                width: `${Math.max(4, (row.commits / peak) * 100)}%`,
                background: "var(--rust)"
              }}
            />
          </span>
          <span className="mono">{row.commits}</span>
        </button>
      ))}
    </div>
  );
}
