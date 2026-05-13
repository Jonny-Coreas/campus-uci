import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  Star,
  Sun,
} from "lucide-react";
import AvatarUpload from "./AvatarUpload";
import "./campus-layout.css";

const DEFAULT_MENU = [
  "Inicio",
  "Especializaciones",
  "Calendario",
  "Asistencia",
  "Evaluaciones",
  "Mensajes",
  "Notificaciones",
  "Documentos",
  "Biblioteca",
  "Configuración",
];

const MENU_ICONS = {
  Inicio: Home,
  Especializaciones: GraduationCap,
  Calendario: CalendarDays,
  Asistencia: ClipboardCheck,
  Evaluaciones: Star,
  Mensajes: MessageSquare,
  Notificaciones: Bell,
  Documentos: FolderOpen,
  Biblioteca: BookOpen,
  Configuración: Settings,
};

function CampusMenuIcon({ label, icon }) {
  if (typeof icon !== "string") {
    const IconComponent = icon || MENU_ICONS[label] || Home;
    return <IconComponent size={23} strokeWidth={1.8} aria-hidden="true" />;
  }

  const IconComponent = MENU_ICONS[label] || Home;
  return <IconComponent size={23} strokeWidth={1.8} aria-hidden="true" />;
}

export default function CampusLayout({
  userName = "Usuario Campus UCI",
  userRole = "Personal",
  userMeta = "",
  menuItems = DEFAULT_MENU,
  activeItem = "Inicio",
  onMenuSelect,
  onLogout,
  user = null,
  profile = null,
  onAvatarUpdated,
  children,
  rightPanel,
  footer = null,
}) {
  const normalizedMenuItems = menuItems.map((item) => (
    typeof item === "string" ? { label: item } : item
  ));

  return (
    <div className="campus-layout dashboard-shell">
      <aside className="campus-sidebar sidebar" aria-label="Navegación Campus UCI">
        <div className="campus-profile">
          <AvatarUpload
            user={user}
            profile={profile}
            name={userName}
            size="md"
            onAvatarUpdated={onAvatarUpdated}
          />
          <strong>{userName}</strong>
          <span>{userRole}</span>
          {userMeta ? <small>{userMeta}</small> : null}
        </div>

        <nav className="campus-menu">
          {normalizedMenuItems.map((item) => (
            <button
              type="button"
              className={item.label === activeItem ? "active" : ""}
              key={item.label}
              onClick={() => {
                item.onClick?.();
                onMenuSelect?.(item.label);
              }}
            >
              <span className="campus-menu-icon" aria-hidden="true">
                <CampusMenuIcon label={item.label} icon={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="campus-logout" onClick={onLogout}>
          <span className="campus-menu-icon" aria-hidden="true">
            <LogOut size={23} strokeWidth={1.8} />
          </span>
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <div className="campus-workspace campus-page dashboard-main">
        <header className="campus-header">
          <div className="campus-header-center">
            <img src="/logo-rnh.png" alt="Red Nacional de Hospitales" />
            <strong>ESPECIALIZACIONES UCI</strong>
          </div>

          <div className="campus-header-actions" aria-label="Accesos rápidos">
            <button type="button" aria-label="Modo claro"><Sun size={22} strokeWidth={1.8} /></button>
            <button type="button" aria-label="Notificaciones"><Bell size={22} strokeWidth={1.8} /></button>
            <AvatarUpload
              user={user}
              profile={profile}
              name={userName}
              size="sm"
              editable={false}
              onAvatarUpdated={onAvatarUpdated}
            />
          </div>
        </header>

        <main className="campus-main dashboard-content">
          <div className="dashboard-grid">
            <section className="campus-center-column left-column">
              {children}
            </section>
          </div>
        </main>

        <footer className="campus-footer">
          {footer || (
            <>
              <span>Contacto: campusuci@redhospitales.local</span>
              <span>Redes institucionales</span>
              <span>Soporte académico</span>
              <span>© 2026 Red Nacional de Hospitales</span>
            </>
          )}
        </footer>
      </div>

      {rightPanel ? (
        <aside className="right-hover-zone" aria-label="Panel académico">
          <div className="right-hover-tab" aria-hidden="true">
            Panel académico
          </div>

          <div className="right-drawer">
            <div className="right-drawer-head">
              <span>Campus UCI</span>
              <strong>Panel académico</strong>
            </div>
            {rightPanel}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
