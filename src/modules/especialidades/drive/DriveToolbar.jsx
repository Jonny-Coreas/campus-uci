export default function DriveToolbar({
  title,
  subtitle,
  actions = null,
  onBack = null,
  backLabel = "Volver",
}) {
  return (
    <header className="drive-toolbar">
      <div className="drive-toolbar-main">
        {onBack ? (
          <button type="button" className="drive-back-button" onClick={onBack}>
            <span aria-hidden="true">←</span>
            {backLabel}
          </button>
        ) : null}

        <div>
          <p className="drive-eyebrow">CAMPUS UCI</p>
          <h2>{title}</h2>
          {subtitle ? <p className="drive-toolbar-subtitle">{subtitle}</p> : null}
        </div>
      </div>

      {actions ? <div className="drive-toolbar-actions">{actions}</div> : null}
    </header>
  );
}
