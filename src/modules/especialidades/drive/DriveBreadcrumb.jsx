export default function DriveBreadcrumb({ items = [], onNavigate }) {
  return (
    <nav className="drive-breadcrumb" aria-label="Ruta de especialidad">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span className="drive-breadcrumb-item" key={`${item.key}-${index}`}>
            {index > 0 ? <span className="drive-breadcrumb-separator">/</span> : null}
            <button
              type="button"
              className={isLast ? "current" : ""}
              onClick={() => !isLast && onNavigate?.(item)}
              disabled={isLast}
            >
              {item.label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
