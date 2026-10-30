export function Header({
  phase,
  chips = [],
  onBack,
  backDisabled,
  backLabel = "← Back",
  backTitle,
  actions = [],
  title = "Impostor"
}: {
  phase: string;
  chips?: string[];
  onBack?: () => void;
  backDisabled?: boolean;
  backLabel?: string;
  backTitle?: string;
  actions?: { label: string; onClick: () => void }[];
  title?: string;
}) {
  return (
    <div className="hdr">
      <div className="hdr-row">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="hdr-logo">?</div>
          <div className="hdr-title">{title}</div>
          <div className="tag" style={{ padding: "4px 10px", letterSpacing: "0.16em", color: "#f5c518" }}>{phase}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          {chips.map((c) => (
            <span key={c} className="tag" style={{ color: "rgba(242,239,230,0.62)" }}>{c}</span>
          ))}
          {onBack && (
            <button type="button" className="btn btn-d btn-hdr" onClick={onBack} disabled={backDisabled} title={backTitle}>{backLabel}</button>
          )}
          {actions.map((a) => (
            <button key={a.label} type="button" className="btn btn-s btn-hdr" onClick={a.onClick}>{a.label}</button>
          ))}
        </div>
      </div>
      <div className="hazard" />
    </div>
  );
}
