function FolderIcon({ tone = "blue", icon = "folder" }) {
  return (
    <span className={`drive-folder-icon ${tone}`} aria-hidden="true">
      {icon === "users" ? (
        <svg viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.8 20a5.2 5.2 0 0 1 10.4 0" />
          <path d="M16 9.2a2.8 2.8 0 1 0 0-5.4" />
          <path d="M17 14.4a4.4 4.4 0 0 1 3.2 4.2" />
        </svg>
      ) : icon === "file" ? (
        <svg viewBox="0 0 24 24">
          <path d="M7 3.8h7l4 4v12.4H7z" />
          <path d="M14 3.8v4h4" />
          <path d="M9.5 12h5" />
          <path d="M9.5 15.5h5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24">
          <path d="M3.5 6.8A2.3 2.3 0 0 1 5.8 4.5h4.3l2 2h6.1a2.3 2.3 0 0 1 2.3 2.3v8.9a2.3 2.3 0 0 1-2.3 2.3H5.8a2.3 2.3 0 0 1-2.3-2.3z" />
        </svg>
      )}
    </span>
  );
}

export default function DriveFolderCard({
  title,
  description,
  meta,
  icon = "folder",
  tone = "blue",
  badge,
  disabled = false,
  onOpen,
}) {
  return (
    <button
      type="button"
      className="drive-folder-card"
      onClick={onOpen}
      disabled={disabled}
    >
      <span className="drive-folder-card-top">
        <FolderIcon icon={icon} tone={tone} />
        {badge ? <span className="drive-folder-badge">{badge}</span> : null}
      </span>

      <span className="drive-folder-title">{title}</span>
      {description ? <span className="drive-folder-description">{description}</span> : null}
      {meta ? <span className="drive-folder-meta">{meta}</span> : null}
    </button>
  );
}
