import React, { useEffect, useState } from "react";
import "./App.css";
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  Layers,
  MessageSquare,
  MonitorPlay,
  PlaySquare,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import icuHero from "./assets/icu-hero.png";
import CapacitacionesEspecialidad from "./modules/especialidades/CapacitacionesEspecialidad";
import CampusLayout from "./components/campus/CampusLayout";
import AvatarUpload from "./components/campus/AvatarUpload";
import EspecialidadDrive from "./modules/especialidades/EspecialidadDrive";
import ClasesVirtuales from "./modules/especialidades/ClasesVirtuales";
import TareasEspecialidad from "./modules/especialidades/TareasEspecialidad";
import EntregasTareaAdmin from "./modules/especialidades/EntregasTareaAdmin";
import EntregaTareaRecurso from "./modules/especialidades/EntregaTareaRecurso";
import MiCampus from "./modules/recurso/MiCampus";
import RecursosAdmin from "./modules/admin/RecursosAdmin";
import IndexCarpetaAcademica from "./CarpetaAcademica/IndexCarpetaAcademica";
import { isAdmin, isAdminOrJefe, normalizeRole } from "./auth/roles";
import {
  getCurrentSession,
  onAuthStateChange,
  signInWithPassword,
  signOut,
} from "./services/authService";
import {
  buildFallbackProfile,
  createProfile,
  getActiveProfilesWithUser,
  getCumValuesByPrefix,
  getProfileByUserId,
} from "./services/profileService";
import {
  assignUserEspecialidad,
  getEspecialidades,
  getExpedientesByEspecialidad,
  upsertUserEspecialidad,
} from "./services/especialidadService";


function Icon({ name, className = "" }) {
  const icons = {
    shield: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2 19 6v5.2c0 4.35-2.88 8.34-7 9.6-4.12-1.26-7-5.25-7-9.6V6l7-2.8Z" />
        <path d="m9.4 12.1 1.7 1.7 3.8-4" />
      </svg>
    ),
    mail: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" />
        <path d="m4.5 7 7.5 6 7.5-6" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
        <path d="M8.5 10.5V8.2a3.5 3.5 0 0 1 7 0v2.3" />
      </svg>
    ),
    eye: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    eyeOff: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 3 18 18" />
        <path d="M10.7 5.3A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3.1 4.2" />
        <path d="M6.4 6.8A16.2 16.2 0 0 0 2.5 12S6 19 12 19c1.9 0 3.5-.6 4.8-1.4" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </svg>
    ),
    cap: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m2.5 9.5 9.5-4 9.5 4-9.5 4-9.5-4Z" />
        <path d="M6.5 11.2v4.1c2.8 2.3 8.2 2.3 11 0v-4.1" />
        <path d="M21.5 9.5v5" />
      </svg>
    ),
    checklist: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="4.5" width="14" height="16" rx="2" />
        <path d="M9 4.5h6v3H9z" />
        <path d="m8.5 12 1.5 1.5 3-3" />
        <path d="M14.5 12.8h2" />
        <path d="M8.5 17h8" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 19.5h15" />
        <rect x="6" y="11" width="3" height="6" rx="1" />
        <rect x="11" y="7" width="3" height="10" rx="1" />
        <rect x="16" y="4.5" width="3" height="12.5" rx="1" />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 11 8.5-7 8.5 7" />
        <path d="M6 10.5v9h12v-9" />
        <path d="M9.5 19.5v-5h5v5" />
      </svg>
    ),
    userPlus: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M18 8v6" />
        <path d="M15 11h6" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
        <path d="M14 7l5 5-5 5" />
        <path d="M19 12H9" />
      </svg>
    ),
  };

  return <span className={`app-icon ${className}`}>{icons[name] || null}</span>;
}

function getSpecialtyInitials(name = "") {
  const cleaned = String(name || "").trim();

  if (!cleaned) return "UC";

  const words = cleaned
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return (words[0] || cleaned).slice(0, 2).toUpperCase();
}

function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await signInWithPassword({ email, password });

      if (error) {
        setErrorMsg("Correo o contraseña incorrectos. Verificá tus datos e intentá de nuevo.");
        return;
      }

      onLoginSuccess?.(data?.session || null);
    } catch (error) {
      console.error("Error login:", error);
      setErrorMsg("Ocurrió un problema al iniciar sesión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-photo-bg" />
      <div className="login-bg-overlay" />
      <div className="login-orb login-orb-right" />
      <div className="login-orb login-orb-left" />
      <div className="login-dots" />
      <div className="login-lines" />

      <main className="login-layout">
        <section className="login-left-panel">
          <img src="/logo-rnh.png" alt="Red Nacional de Hospitales" className="login-logo" />

          <div className="login-copy">
            <span className="pill">CAMPUS UCI</span>
            <h1>
              Especializaciones
              <br />
              <strong>Críticas</strong>
            </h1>
            <p>
              Plataforma institucional para el seguimiento de formación especializada,
              avances, evaluaciones y evidencias del personal de UCI.
            </p>
          </div>

          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon"><Icon name="cap" /></div>
              <span>Formación<br />Especializada</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Icon name="checklist" /></div>
              <span>Evaluaciones<br />Continuas</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Icon name="chart" /></div>
              <span>Avances<br />Individuales</span>
            </div>
          </div>
        </section>

        <section className="login-right-panel">
          <div className="login-card">
            <div className="shield-circle"><Icon name="shield" /></div>
            <div className="access-pill">ACCESO INSTITUCIONAL</div>
            <h2>Iniciar sesión</h2>
            <p>Ingresa con tu correo asignado</p>

            {errorMsg ? <div className="login-error">⚠️ {errorMsg}</div> : null}

            <form onSubmit={handleLogin} className="login-form">
              <label>Correo institucional</label>
              <div className="input-row">
                <div className="input-icon"><Icon name="mail" /></div>
                <input
                  type="email"
                  placeholder="uci@especialidades.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <label>Contraseña</label>
              <div className="input-row">
                <div className="input-icon"><Icon name="lock" /></div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Introduce tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>

              <div className="login-options">
                <label className="remember-option">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Recordarme</span>
                </label>
                <button type="button" className="forgot-button">¿Olvidaste tu contraseña?</button>
              </div>

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? <span className="loading-dot">Entrando...</span> : "Entrar"}
              </button>
            </form>

            <div className="secure-footer">
              <span />
              <Icon name="lock" />
              <p>Acceso seguro y restringido</p>
              <span />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProgressPill({ value }) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  return (
    <div className="cu-progress-wrap">
      <div className="cu-progress-track">
        <div className="cu-progress-bar" style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{safeValue}%</strong>
    </div>
  );
}

const DASHBOARD_ICONS = {
  especializaciones: BookOpenCheck,
  normativas: ShieldCheck,
  autogestion: UserRoundPlus,
  historicos: BarChart3,
  reportes: BarChart3,
  biblioteca: BookOpen,
  tutoriales: PlaySquare,
  cronograma: CalendarDays,
  asistencia: ClipboardCheck,
  evaluaciones: BookOpenCheck,
  presentaciones: PlaySquare,
  firma: FileText,
};

function DashboardIcon({ type }) {
  const IconComponent = DASHBOARD_ICONS[type] || BookOpen;
  return <IconComponent size={38} strokeWidth={1.8} aria-hidden="true" />;
}

function ProgressRing({ value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="cu-premium-progress-ring" aria-label={`Progreso académico ${safeValue}%`}>
      <svg viewBox="0 0 108 108" aria-hidden="true">
        <circle className="track" cx="54" cy="54" r={radius} />
        <motion.circle
          className="value"
          cx="54"
          cy="54"
          r={radius}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <strong>{safeValue}%</strong>
      <span>avance</span>
    </div>
  );
}

function Sidebar({ profile, onLogout }) {
  const roleLabel = profile?.rol || "Personal";
  return (
    <aside className="cu-sidebar">
      <div className="cu-brand">
        <div className="cu-brand-mark">UCI</div>
        <div>
          <h1>Campus UCI</h1>
          <p>Especializaciones críticas</p>
        </div>
      </div>

      <nav className="cu-nav">
        <button className="active"><Icon name="home" /> Inicio</button>
        <button><Icon name="cap" /> Especializaciones</button>
        <button><Icon name="checklist" /> Evaluaciones</button>
        <button><Icon name="chart" /> Evidencias</button>
        <button><span>◷</span> Historial</button>
        {isAdmin(profile) ? <button><span>⚙</span> Panel jefe</button> : null}
      </nav>

      <div className="cu-sidebar-card">
        <div className="cu-mini-avatar">👤</div>
        <div>
          <span>{profile?.cum || "Sin CUM"}</span>
          <strong>{roleLabel}</strong>
        </div>
        <button onClick={onLogout}><Icon name="logout" /> Cerrar sesión</button>
      </div>
    </aside>
  );
}

function PortalPlaceholder({
  config,
  onRegistrar,
  onAsignar,
  onCrearEvaluacion,
  onExportReporte,
}) {
  const quickActions = config.title === "Autogestión"
    ? [
        { label: "Registrar personal", onClick: onRegistrar },
        { label: "Asignar especialidad", onClick: onAsignar },
        { label: "Crear evaluación", onClick: onCrearEvaluacion },
      ]
    : config.title === "Historial académico"
      ? [{ label: "Exportar reporte", onClick: onExportReporte }]
      : [];

  return (
    <section className="cu-portal-placeholder" aria-label={config.title}>
      <div className="cu-portal-placeholder-head">
        <span className="cu-kicker">{config.badge}</span>
        <h2>{config.title}</h2>
        <p>{config.description}</p>
      </div>

      <div className="cu-portal-placeholder-grid">
        {config.items.map((item) => (
          <article className="cu-portal-placeholder-card" key={item}>
            <span aria-hidden="true">▣</span>
            <strong>{item}</strong>
            <p>Sección preparada para conectar datos reales en una fase posterior.</p>
          </article>
        ))}
      </div>

      {quickActions.length ? (
        <div className="cu-portal-placeholder-actions">
          {quickActions.map((action) => (
            <button type="button" key={action.label} onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}


function ExpedientesEspecialidad({
  session,
  profile,
  especialidad,
  usuarios,
  loading,
  error,
  onOpenExpediente,
  onOpenDrive,
  onOpenClasesVirtuales,
  onOpenTareas,
  canOpenDrive = false,
  canManageAcademic = false,
  onBack,
  onLogout,
}) {
  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Usuario";

  const totalUsuarios = usuarios.length;
  const promedio =
    totalUsuarios > 0
      ? Math.round(
          usuarios.reduce((acc, item) => acc + (Number(item.progreso) || 0), 0) /
            totalUsuarios,
        )
      : 0;

  const completados = usuarios.filter((item) => Number(item.progreso) >= 100).length;
  const specialtyDescription =
    especialidad?.descripcion ||
    "Recursos en formación, accesos académicos y seguimiento operativo de la especialidad en Campus UCI.";
  const specialtyStatus = especialidad?.activa === false || especialidad?.activo === false ? "Inactiva" : "Activa";
  const specialtyMenuItems = [
    { label: "Inicio", onClick: onBack },
    { label: "Especializaciones", onClick: onBack },
    { label: "Calendario" },
    { label: "Asistencia" },
    { label: "Evaluaciones" },
    { label: "Mensajes" },
    { label: "Notificaciones" },
    { label: "Documentos" },
    { label: "Biblioteca" },
    { label: "Configuración" },
  ];
  const specialtyAccessCards = [
    {
      title: "Expedientes",
      description: "Estructura académica tipo Drive con datos generales y datos por recurso.",
      icon: Layers,
      tone: "blue",
      action: canOpenDrive ? onOpenDrive : null,
      locked: !canOpenDrive,
    },
    {
      title: "Cronograma",
      description: "Programación de clases, módulos, docentes y actividades académicas.",
      icon: CalendarDays,
      tone: "green",
    },
    {
      title: "Clases Virtuales",
      description: "Programa sesiones en línea, enlaces virtuales y próximas clases.",
      icon: MonitorPlay,
      tone: "blue",
      action: canManageAcademic ? onOpenClasesVirtuales : null,
      locked: !canManageAcademic,
    },
    {
      title: "Tareas",
      description: "Crea actividades académicas, fechas límite y puntajes por especialidad.",
      icon: ClipboardList,
      tone: "green",
      action: onOpenTareas,
    },
    {
      title: "Asistencia",
      description: "Seguimiento de asistencia por clase, recurso y módulo.",
      icon: ClipboardCheck,
      tone: "purple",
    },
    {
      title: "Evaluaciones",
      description: "Evaluaciones académicas, actitudinales y resultados del recurso.",
      icon: BookOpenCheck,
      tone: "orange",
    },
    {
      title: "Mis Notas",
      description: "Resumen de notas, observaciones y porcentajes académicos.",
      icon: Award,
      tone: "blue",
    },
    {
      title: "Presentaciones Ponentes",
      description: "Material docente por módulo: PDFs, videos, guías y presentaciones.",
      icon: PlaySquare,
      tone: "green",
    },
    {
      title: "Biblioteca / Material académico",
      description: "Guías clínicas, protocolos, normativas y bibliografía de apoyo.",
      icon: BookOpen,
      tone: "purple",
    },
    {
      title: "Firma de Asistencia",
      description: "Evidencias, fotos y escaneos de hojas firmadas por clase.",
      icon: FileText,
      tone: "orange",
    },
    {
      title: "Reportes",
      description: "Consolidados, avances y reportes académicos de la especialidad.",
      icon: BarChart3,
      tone: "blue",
    },
  ];

  return (
    <CampusLayout
      userName={displayName}
      userRole={profile?.rol || "Personal"}
      userMeta={profile?.cum || "Sin CUM"}
      user={session?.user}
      profile={profile}
      menuItems={specialtyMenuItems}
      activeItem="Especializaciones"
      onLogout={onLogout}
    >
      <div className="specialty-page">
        <section className="specialty-hero-panel">
          <div className="specialty-hero-copy">
            <span className="dashboard-section-head-label">Especialidad activa</span>
            <h2>{especialidad?.nombre || "Especialidad"}</h2>
            <p>{specialtyDescription}</p>
            <button type="button" className="specialty-back-button" onClick={onBack}>
              <ArrowRight size={16} strokeWidth={2.1} aria-hidden="true" />
              Volver a especializaciones
            </button>
          </div>

          <article className="specialty-profile-card">
            <AvatarUpload
              user={session?.user}
              profile={profile}
              name={displayName}
              size="md"
              editable={false}
            />
            <div>
              <strong>{displayName}</strong>
              <span>{profile?.cum || "Sin CUM"} • {profile?.rol || "Personal"}</span>
            </div>
          </article>
        </section>

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}

        <section className="specialty-stats-grid" aria-label="Métricas de especialidad">
          <article className="specialty-stat-card">
            <span className="specialty-stat-icon blue"><UserRoundPlus size={23} strokeWidth={1.9} /></span>
            <div><small>Recursos</small><strong>{totalUsuarios}</strong></div>
          </article>
          <article className="specialty-stat-card">
            <span className="specialty-stat-icon green"><BarChart3 size={23} strokeWidth={1.9} /></span>
            <div><small>Completados</small><strong>{completados}</strong></div>
          </article>
          <article className="specialty-stat-card">
            <span className="specialty-stat-icon purple"><Clock size={23} strokeWidth={1.9} /></span>
            <div><small>Estado</small><strong>{specialtyStatus}</strong></div>
          </article>
          <article className="specialty-stat-card">
            <span className="specialty-stat-icon orange"><BookOpenCheck size={23} strokeWidth={1.9} /></span>
            <div><small>Progreso promedio</small><strong>{promedio}%</strong></div>
          </article>
        </section>

        <section className="specialty-access-panel">
          <div className="dashboard-section-head">
            <span>Campus académico</span>
            <h3>Accesos internos</h3>
          </div>

          <div className="specialty-access-grid">
            {specialtyAccessCards.map((card) => {
              const CardIcon = card.icon;
              return (
                <button
                  type="button"
                  className="specialty-access-card"
                  key={card.title}
                  onClick={card.action || undefined}
                  disabled={!card.action}
                >
                  <span className={`specialty-access-icon ${card.tone}`}>
                    <CardIcon size={31} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <strong>{card.title}</strong>
                  <small>{card.locked ? "Disponible para admin/jefe." : card.description}</small>
                  <i aria-hidden="true"><ArrowRight size={16} strokeWidth={2.1} /></i>
                </button>
              );
            })}
          </div>
        </section>

        <section className="cu-panel cu-specialties-panel">
          <div className="cu-panel-header">
            <div>
              <h3>Expedientes de {especialidad?.nombre || "especialidad"}</h3>
              <p>Personal registrado actualmente en esta formación.</p>
            </div>
            <span className="cu-badge">UCI</span>
          </div>

          {loading ? (
            <div className="cu-empty">Cargando expedientes...</div>
          ) : usuarios.length === 0 ? (
            <div className="cu-empty">
              No hay recursos asignados a esta especialidad todavía.
            </div>
          ) : (
            <div className="cu-specialty-grid">
              {usuarios.map((item) => {
                const nombre = item.nombre || "Sin nombre";
                const correo = item.correo || "Sin correo";
                const cum = item.cum || "Sin CUM";
                const progreso = Number(item.progreso) || 0;

                return (
                  <article className="cu-specialty-card" key={item.id}>
                    <div className="cu-specialty-icon">👤</div>
                    <h4>{nombre}</h4>
                    <p style={{ marginBottom: 6, fontWeight: 900, color: "#1d4ed8" }}>🆔 {cum}</p>
                    <p>{correo}</p>
                    <ProgressPill value={progreso} />
                    <button type="button" onClick={() => onOpenExpediente?.(item)}>Abrir expediente</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </CampusLayout>
  );
}

function EspecialidadAdminModuleLayout({
  session,
  profile,
  onBack,
  onLogout,
  children,
}) {
  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Usuario";

  const specialtyMenuItems = [
    { label: "Inicio", onClick: onBack },
    { label: "Especializaciones", onClick: onBack },
    { label: "Calendario" },
    { label: "Asistencia" },
    { label: "Evaluaciones" },
    { label: "Mensajes" },
    { label: "Notificaciones" },
    { label: "Documentos" },
    { label: "Biblioteca" },
    { label: "Configuración" },
  ];

  return (
    <CampusLayout
      userName={displayName}
      userRole={profile?.rol || "Personal"}
      userMeta={profile?.cum || "Sin CUM"}
      user={session?.user}
      profile={profile}
      menuItems={specialtyMenuItems}
      activeItem="Especializaciones"
      onLogout={onLogout}
    >
      {children}
    </CampusLayout>
  );
}




function FormShell({ session, profile, title, subtitle, children, onBack, onLogout }) {
  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Usuario";

  return (
    <div className="cu-shell">
      <Sidebar profile={profile} onLogout={onLogout} />

      <main className="cu-main">
        <header className="cu-topbar">
          <div className="cu-title-block">
            <span className="cu-kicker">PANEL RÁPIDO</span>
            <h2>
              {title}
              <br />
              <span>{subtitle}</span>
            </h2>
            <p>Gestión funcional de recursos y especializaciones del Campus UCI.</p>
          </div>

          <div className="cu-profile-card">
            <div className="cu-avatar">👤</div>
            <div>
              <strong>{displayName}</strong>
              <span>{profile?.cum || "Sin CUM"} • Campus UCI</span>
            </div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <button type="button" className="login-submit" style={{ width: "auto", padding: "12px 18px" }} onClick={onBack}>
            ← Volver al inicio
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}

function RegistrarPersonal({ session, profile, especialidades = [], onBack, onLogout, onCreated }) {
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    rol: "personal",
    servicio: "UCI",
    area: "",
    cum: "",
    especialidadId: "",
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [generatingCum, setGeneratingCum] = useState(false);
  const [cumAuto, setCumAuto] = useState(true);

  function getCumPrefix(currentForm = form) {
    const selectedEspecialidad = especialidades.find((esp) => esp.id === currentForm.especialidadId);
    const nombreEspecialidad = String(selectedEspecialidad?.nombre || "").toLowerCase();
    const rol = normalizeRole(currentForm.rol);

    if (rol === "admin") return "ADM";
    if (rol === "docente") return "DOC";
    if (rol === "supervisor") return "SUP";
    if (nombreEspecialidad.includes("ecmo")) return "ECMO";
    if (nombreEspecialidad.includes("hemo")) return "HEMO";

    return "UCI";
  }

  async function generarSiguienteCum(prefix) {
    const data = await getCumValuesByPrefix(prefix);

    const maxNumber = (data || [])
      .map((item) => String(item.cum || ""))
      .filter((value) => value.startsWith(`${prefix}-`))
      .map((value) => Number(value.split("-").pop()))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);

    return `${prefix}-${String(maxNumber + 1).padStart(3, "0")}`;
  }

  async function autogenerarCum(currentForm = form) {
    try {
      setGeneratingCum(true);
      const prefix = getCumPrefix(currentForm);
      const nuevoCum = await generarSiguienteCum(prefix);
      setForm((prev) => ({ ...prev, cum: nuevoCum }));
    } catch (error) {
      console.error("Error generando CUM:", error);
    } finally {
      setGeneratingCum(false);
    }
  }

  useEffect(() => {
    if (!cumAuto) return;
    autogenerarCum(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rol, form.especialidadId, especialidades.length, cumAuto]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function guardar(e) {
    e.preventDefault();
    setMensaje("");

    if (!form.nombre.trim() || !form.correo.trim()) {
      setMensaje("Completá nombre y correo.");
      return;
    }

    setSaving(true);

    try {
      const finalCum = form.cum.trim() || await generarSiguienteCum(getCumPrefix());

      const insertedProfile = await createProfile({
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        rol: form.rol,
        servicio: form.servicio,
        area: form.area,
        cum: finalCum || null,
        activo: form.activo,
      });

      let asignado = false;

      if (form.especialidadId && insertedProfile?.user_id) {
        try {
          await assignUserEspecialidad({
            userId: insertedProfile.user_id,
            especialidadId: form.especialidadId,
            progreso: 0,
          });
          asignado = true;
        } catch (asignacionError) {
          console.error("Error asignando especialidad:", asignacionError);
        }
      }

      setMensaje(
        asignado
          ? `✅ Personal registrado, CUM ${finalCum} generado y especialidad asignada.`
          : `✅ Personal registrado con CUM ${finalCum}. Para asignarlo a especialidad necesita usuario de acceso activo.`
      );
      setForm({
        nombre: "",
        correo: "",
        rol: "personal",
        servicio: "UCI",
        area: "",
        cum: "",
        especialidadId: "",
        activo: true,
      });
      setCumAuto(true);
      onCreated?.();
    } catch (error) {
      console.error("Error registrando personal:", error);
      setMensaje("⚠️ No se pudo registrar. Revisá permisos/RLS o columnas de profiles.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      session={session}
      profile={profile}
      title="Registrar personal"
      subtitle="Nuevo recurso"
      onBack={onBack}
      onLogout={onLogout}
    >
      <section className="cu-panel cu-specialties-panel">
        <div className="cu-panel-header">
          <div>
            <h3>Datos del recurso</h3>
            <p>Este registro crea el expediente base en profiles.</p>
          </div>
          <span className="cu-badge">UCI</span>
        </div>

        {mensaje ? <div className="cu-alert">{mensaje}</div> : null}

        <form onSubmit={guardar} className="login-form" style={{ maxWidth: 760 }}>
          <label>Nombre completo</label>
          <div className="input-row">
            <input
              type="text"
              placeholder="Ej. Jonathan Villalobos"
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              required
            />
          </div>

          <label>Correo</label>
          <div className="input-row">
            <input
              type="email"
              placeholder="correo@especialidades.com"
              value={form.correo}
              onChange={(e) => setField("correo", e.target.value)}
              required
            />
          </div>

          <label>CUM / Código único</label>
          <div className="input-row">
            <input
              type="text"
              placeholder={generatingCum ? "Generando CUM..." : "Se genera automático"}
              value={form.cum}
              onChange={(e) => {
                setCumAuto(e.target.value.trim() === "");
                setField("cum", e.target.value.toUpperCase());
              }}
            />
          </div>
          <p style={{ margin: "-6px 0 4px", color: "#667897", fontWeight: 800, fontSize: 12 }}>
            Código institucional automático según rol o especialidad. Podés editarlo manualmente si es necesario.
          </p>

          <label>Rol</label>
          <div className="input-row">
            <select value={form.rol} onChange={(e) => setField("rol", e.target.value)}>
              <option value="personal">Personal</option>
              <option value="admin">Admin</option>
              <option value="docente">Docente</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>

          <label>Servicio</label>
          <div className="input-row">
            <input
              type="text"
              value={form.servicio}
              onChange={(e) => setField("servicio", e.target.value)}
              placeholder="UCI"
            />
          </div>

          <label>Área</label>
          <div className="input-row">
            <input
              type="text"
              value={form.area}
              onChange={(e) => setField("area", e.target.value)}
              placeholder="Ej. UCI General"
            />
          </div>


          <label>Especialidad</label>
          <div className="input-row">
            <select
              value={form.especialidadId}
              onChange={(e) => setField("especialidadId", e.target.value)}
            >
              <option value="">Seleccionar especialidad</option>
              {especialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          <button className="login-submit" type="submit" disabled={saving || generatingCum}>
            {saving ? "Guardando..." : generatingCum ? "Generando CUM..." : "Guardar personal"}
          </button>
        </form>
      </section>
    </FormShell>
  );
}

function AsignarEspecialidad({
  session,
  profile,
  especialidades,
  onBack,
  onLogout,
  onAssigned,
}) {
  const [usuarios, setUsuarios] = useState([]);
  const [userId, setUserId] = useState("");
  const [especialidadId, setEspecialidadId] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let mounted = true;

    async function cargarUsuarios() {
      setLoading(true);
      setMensaje("");

      try {
        const data = await getActiveProfilesWithUser();
        if (!mounted) return;
        setUsuarios(data);
      } catch (error) {
        console.error("Error cargando usuarios:", error);
        if (mounted) setMensaje("⚠️ No se pudo cargar profiles. Revisá permisos/RLS.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    cargarUsuarios();

    return () => {
      mounted = false;
    };
  }, []);

  async function asignar(e) {
    e.preventDefault();
    setMensaje("");

    if (!userId || !especialidadId) {
      setMensaje("Seleccioná recurso y especialidad.");
      return;
    }

    setSaving(true);

    try {
      await upsertUserEspecialidad({ userId, especialidadId, progreso });

      setMensaje("✅ Especialidad asignada correctamente.");
      setUserId("");
      setEspecialidadId("");
      setProgreso(0);
      onAssigned?.();
    } catch (error) {
      console.error("Error asignando especialidad:", error);
      setMensaje("⚠️ No se pudo asignar. Revisá tabla usuario_especialidad y permisos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      session={session}
      profile={profile}
      title="Asignar especialidad"
      subtitle="Vincular recurso"
      onBack={onBack}
      onLogout={onLogout}
    >
      <section className="cu-panel cu-specialties-panel">
        <div className="cu-panel-header">
          <div>
            <h3>Asignación a especialidad</h3>
            <p>Seleccioná el recurso y la especialidad que está cursando.</p>
          </div>
          <span className="cu-badge">UCI</span>
        </div>

        {mensaje ? <div className="cu-alert">{mensaje}</div> : null}

        <form onSubmit={asignar} className="login-form" style={{ maxWidth: 820 }}>
          <label>Recurso</label>
          <div className="input-row">
            <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">{loading ? "Cargando recursos..." : "Seleccionar recurso"}</option>
              {usuarios.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.nombre || "Sin nombre"} {u.cum ? `— ${u.cum}` : ""} {u.correo ? `— ${u.correo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <label>Especialidad</label>
          <div className="input-row">
            <select value={especialidadId} onChange={(e) => setEspecialidadId(e.target.value)} required>
              <option value="">Seleccionar especialidad</option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          <label>Progreso inicial (%)</label>
          <div className="input-row">
            <input
              type="number"
              min="0"
              max="100"
              value={progreso}
              onChange={(e) => setProgreso(e.target.value)}
            />
          </div>

          <button className="login-submit" type="submit" disabled={saving || loading}>
            {saving ? "Asignando..." : "Asignar especialidad"}
          </button>
        </form>
      </section>
    </FormShell>
  );
}


function Dashboard({ session, profile, especialidades, loadingData, dataError, onLogout, onOpenEspecialidad, onOpenRegistrar, onOpenAsignar, onOpenCrearEvaluacion, onOpenRecursosAdmin, onExportReporte, onProfileUpdated }) {
  const [portalView, setPortalView] = useState("inicio");
  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Jonathan Villalobos";

  const activeSpecialties = especialidades.filter((item) => item.activa !== false);
  const firstName = displayName.split(" ")[0] || displayName;
  const activeSpecialtyName = activeSpecialties[0]?.nombre || "Especializaciones UCI";
  const academicProgress = 0;
  const quickStats = [
    { label: "Evaluaciones", value: "0", detail: "pendientes", tone: "blue", icon: BookOpenCheck },
    { label: "Asistencia", value: "--", detail: "por calcular", tone: "green", icon: ClipboardCheck },
    { label: "Promedio", value: "--", detail: "sin notas", tone: "purple", icon: Award },
    { label: "Módulos", value: "0", detail: "completados", tone: "orange", icon: Layers },
  ];
  const recentActivity = [
    { title: "Última evaluación", detail: "Sin evaluaciones registradas", tone: "blue", icon: BookOpenCheck },
    { title: "Última asistencia", detail: "Sin asistencia reciente", tone: "green", icon: ClipboardCheck },
    { title: "Última actividad", detail: activeSpecialties.length ? `${activeSpecialties.length} especialidades disponibles` : "Campus listo para iniciar", tone: "purple", icon: Activity },
  ];
  const portalViews = {
    inicio: "Inicio",
    especializaciones: "Especializaciones",
    recursos: "Recursos Académicos",
    calendario: "Calendario",
    asistencia: "Asistencia",
    evaluaciones: "Evaluaciones",
    biblioteca: "Biblioteca",
    tutoriales: "Tutoriales",
    historicos: "Históricos",
    reportes: "Reportes",
    presentaciones: "Presentaciones",
    firma: "Firma de Asistencia",
    normativas: "Normativas",
    autogestion: "Autogestión",
  };
  const placeholderContent = {
    calendario: {
      title: "Calendario Académico",
      badge: "Planificación",
      description: "Vista preparada para consultar clases, módulos, evaluaciones y actividades programadas.",
      items: ["Cronograma general", "Clases próximas", "Reprogramaciones"],
    },
    asistencia: {
      title: "Control de Asistencia",
      badge: "Seguimiento",
      description: "Espacio visual para revisar asistencias, ausencias, justificaciones y reportes por recurso.",
      items: ["Registro por clase", "Justificaciones", "Resumen por recurso"],
    },
    evaluaciones: {
      title: "Evaluaciones Académicas",
      badge: "Académico",
      description: "Panel preparado para gestionar evaluaciones, resultados y retroalimentación académica.",
      items: ["Evaluaciones activas", "Resultados", "Rúbricas"],
    },
    biblioteca: {
      title: "Biblioteca UCI",
      badge: "Material",
      description: "Repositorio visual para guías clínicas, protocolos, artículos y documentos académicos.",
      items: ["Guías clínicas", "Protocolos", "Bibliografía"],
    },
    tutoriales: {
      title: "Tutoriales y clases grabadas",
      badge: "Aprendizaje",
      description: "Sección para videos, clases grabadas y recursos de apoyo de Especializaciones UCI.",
      items: ["Clases grabadas", "Tutoriales de plataforma", "Material de apoyo"],
    },
    historicos: {
      title: "Historial académico",
      badge: "Históricos",
      description: "Vista para consultar avances, reportes históricos y trazabilidad de formación.",
      items: ["Avance por cohorte", "Reportes exportados", "Consolidados"],
    },
    reportes: {
      title: "Reportes Académicos",
      badge: "Reportes",
      description: "Panel preparado para consolidados, avances, trazabilidad y reportes de especialidad.",
      items: ["Consolidado final", "Avance por recurso", "Exportables"],
    },
    presentaciones: {
      title: "Presentaciones Ponentes",
      badge: "Material docente",
      description: "Acceso visual a presentaciones, guías, videos y documentos por módulo académico.",
      items: ["Módulo 1", "Módulo 2", "Módulo 3"],
    },
    firma: {
      title: "Firma de Asistencia",
      badge: "Evidencias",
      description: "Repositorio preparado para evidencias, fotos y escaneos de hojas firmadas.",
      items: ["Hojas firmadas", "PDF escaneado", "Pendientes de carga"],
    },
    normativas: {
      title: "Normativas y Políticas",
      badge: "Institucional",
      description: "Documentos normativos, políticas internas y lineamientos académicos del campus.",
      items: ["Políticas académicas", "Reglamentos", "Formatos institucionales"],
    },
    autogestion: {
      title: "Autogestión",
      badge: "Administración",
      description: "Accesos rápidos para registrar personal, asignar especialidades y mantener el campus.",
      items: ["Registrar personal", "Asignar especialidad", "Gestión operativa"],
    },
  };

  function openPortalView(nextView) {
    setPortalView(nextView);
  }

  const portalCards = [
    {
      title: "Especializaciones",
      description: "Especialidades, módulos académicos y expedientes activos.",
      icon: "especializaciones",
      action: () => openPortalView("especializaciones"),
    },
    {
      title: "Recursos Académicos",
      description: "Usuarios recurso con login, CUM, especialidad y progreso.",
      icon: "autogestion",
      action: onOpenRecursosAdmin,
    },
    {
      title: "Tutoriales",
      description: "Recursos de apoyo para el uso de la plataforma.",
      icon: "tutoriales",
      action: () => openPortalView("tutoriales"),
    },
    {
      title: "Normativas y Políticas",
      description: "Lineamientos institucionales y documentos base del Campus UCI.",
      icon: "normativas",
      action: () => openPortalView("normativas"),
    },
    {
      title: "Presentaciones Ponentes",
      description: "Material docente, presentaciones y guías por módulo.",
      icon: "presentaciones",
      action: () => openPortalView("presentaciones"),
    },
    {
      title: "Firma de Asistencia",
      description: "Evidencias, hojas firmadas y escaneos por clase.",
      icon: "firma",
      action: () => openPortalView("firma"),
    },
    {
      title: "Autogestión",
      description: "Registro, asignación y administración académica.",
      icon: "autogestion",
      action: () => openPortalView("autogestion"),
    },
  ];
  const quickActionCards = [
    { title: "Cronograma", detail: "Ver clases y módulos", tone: "blue", icon: CalendarDays, action: () => openPortalView("calendario") },
    { title: "Evaluaciones", detail: "Revisar pendientes", tone: "purple", icon: BookOpenCheck, action: () => openPortalView("evaluaciones") },
    { title: "Biblioteca", detail: "Abrir documentos", tone: "green", icon: BookOpen, action: () => openPortalView("biblioteca") },
    { title: "Reportes", detail: "Historial académico", tone: "orange", icon: BarChart3, action: () => openPortalView("reportes") },
  ];
  const campusMenuItems = [
    { label: "Inicio", icon: "⌂", onClick: () => openPortalView("inicio") },
    { label: "Especializaciones", icon: "▣", onClick: () => openPortalView("especializaciones") },
    { label: "Recursos Académicos", icon: UserRoundPlus, onClick: onOpenRecursosAdmin },
    { label: "Calendario", icon: "◷", onClick: () => openPortalView("calendario") },
    { label: "Asistencia", icon: "☑", onClick: () => openPortalView("asistencia") },
    { label: "Evaluaciones", icon: "◎", onClick: () => openPortalView("evaluaciones") },
    { label: "Mensajes", icon: "✉", onClick: () => openPortalView("inicio") },
    { label: "Notificaciones", icon: "!", onClick: () => openPortalView("inicio") },
    { label: "Documentos", icon: "□", onClick: () => openPortalView("biblioteca") },
    { label: "Biblioteca", icon: "▤", onClick: () => openPortalView("biblioteca") },
    { label: "Configuración", icon: "⚙", onClick: () => openPortalView("autogestion") },
  ];

  const rightPanel = (
    <div className="dashboard-side-panel">
      <section className="side-block right-card">
        <div className="side-block-head">
          <h3><Bell size={22} strokeWidth={1.8} aria-hidden="true" /> Notificaciones</h3>
          <span>{dataError ? "1" : "0"}</span>
        </div>
        <article className="side-notice">
          <strong>{dataError ? "Revisión requerida" : "Sin alertas pendientes"}</strong>
          <p>{dataError || "No hay notificaciones nuevas para mostrar."}</p>
        </article>
      </section>

      <section className="side-block right-card">
        <div className="side-block-head">
          <h3><CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" /> Calendario académico</h3>
          <span>Hoy</span>
        </div>
        <div className="calendar-card">
          <strong>12</strong>
          <div>
            <span>Mayo 2026</span>
            <small>Sin clases programadas para hoy.</small>
          </div>
        </div>
      </section>

      <section className="side-block right-card">
        <div className="side-block-head">
          <h3><Clock size={22} strokeWidth={1.8} aria-hidden="true" /> Próximos eventos</h3>
          <span>0</span>
        </div>
        <div className="event-list">
          <article>
            <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <strong>Programación pendiente</strong>
              <small>El cronograma se mostrará cuando existan clases registradas.</small>
            </div>
          </article>
          <article>
            <MessageSquare size={18} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <strong>Mensajes académicos</strong>
              <small>No hay comunicaciones nuevas.</small>
            </div>
          </article>
        </div>
      </section>

      <section className="side-block right-card side-specialties">
        <div className="side-block-head">
          <h3>Mis Especializaciones</h3>
          <span>{activeSpecialties.length}</span>
        </div>

        {loadingData ? (
          <div className="cu-empty">Cargando especialidades...</div>
        ) : activeSpecialties.length === 0 ? (
          <div className="cu-empty">No hay especialidades registradas.</div>
        ) : (
          <div className="cu-portal-course-list">
            {activeSpecialties.map((item) => (
              <button type="button" className="cu-portal-course" key={item.id} onClick={() => onOpenEspecialidad?.(item)}>
                <span>{getSpecialtyInitials(item.nombre)}</span>
                <div>
                  <strong>{item.nombre}</strong>
                  <small>{item.descripcion || "Especialización crítica de UCI."}</small>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <CampusLayout
      userName={displayName}
      userRole={profile?.rol || "Personal"}
      userMeta={profile?.cum || "Sin CUM"}
      menuItems={campusMenuItems}
      activeItem={portalViews[portalView] || "Inicio"}
      onLogout={onLogout}
      user={session?.user}
      profile={profile}
      onAvatarUpdated={onProfileUpdated}
      rightPanel={rightPanel}
    >
      <div className="cu-portal-view-shell" key={portalView}>
        {portalView === "inicio" ? (
          <>
          <motion.header
            className="hero-card"
            style={{
              backgroundImage: `
                linear-gradient(
                  90deg,
                  rgba(5,45,130,0.96) 0%,
                  rgba(8,74,190,0.90) 45%,
                  rgba(8,74,190,0.45) 72%,
                  rgba(8,74,190,0.15) 100%
                ),
                url(${icuHero})
              `,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="hero-avatar-wrapper">
              <AvatarUpload
                user={session?.user}
                profile={profile}
                name={displayName}
                size="lg"
                onAvatarUpdated={onProfileUpdated}
              />
            </div>

            <div className="hero-content">
              <div className="hero-text">
                <h2 className="hero-title">Bienvenido nuevamente, {firstName}</h2>
                <p className="hero-subtitle">Plataforma académica hospitalaria para gestionar especializaciones, evaluaciones, asistencia y avance profesional.</p>

                <div className="hero-specialty-row hero-meta">
                  <span className="hero-badge hero-specialty-label">Especialidad Activa</span>
                  <strong className="hero-specialty-name">{activeSpecialtyName}</strong>
                </div>

                <div className="hero-progress-line" aria-label={`Progreso académico ${academicProgress}%`}>
                  <span style={{ width: `${academicProgress}%` }} />
                </div>

                <div className="hero-actions">
                  <button type="button" onClick={() => openPortalView("calendario")}>Ver cronograma</button>
                  <button type="button" onClick={() => openPortalView("evaluaciones")}>Mis evaluaciones</button>
                </div>
              </div>
            </div>

            <div className="progress-area">
              <div className="progress-ring-box">
                <ProgressRing value={academicProgress} />
              </div>
            </div>
          </motion.header>

          {dataError ? <div className="cu-alert">⚠️ {dataError}</div> : null}

          <motion.section
            className="stats-grid"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.42, ease: "easeOut" }}
          >
            {quickStats.map((item) => {
              const StatIcon = item.icon;
              return (
                <motion.article className="stat-card" key={item.label} whileHover={{ y: -3, scale: 1.01 }}>
                  <span className={`stat-icon ${item.tone}`}><StatIcon size={24} strokeWidth={1.9} aria-hidden="true" /></span>
                  <div>
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                    <em>{item.detail}</em>
                  </div>
                </motion.article>
              );
            })}
          </motion.section>

          <section className="dashboard-access-card">
            <div className="dashboard-section-head">
              <span>Campus académico</span>
              <h3>Accesos principales</h3>
            </div>
            <div className="cu-portal-card-grid access-grid" aria-label="Accesos académicos">
              {portalCards.map((card) => (
                <motion.button
                  type="button"
                  className="cu-portal-card access-card"
                  key={card.title}
                  onClick={card.action}
                  disabled={!card.action}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.015 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <span className="cu-portal-card-icon"><DashboardIcon type={card.icon} /></span>
                  <strong>{card.title}</strong>
                  <span>{card.description}</span>
                  <i className="cu-portal-card-arrow" aria-hidden="true"><ArrowRight size={16} strokeWidth={2.1} /></i>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="lower-grid">
            <article className="activity-card">
              <div className="dashboard-section-head">
                <span>Seguimiento</span>
                <h3>Actividad reciente</h3>
              </div>
              <div className="activity-list">
                {recentActivity.map((item) => {
                  const ActivityIcon = item.icon;
                  return (
                    <article className="activity-item" key={item.title}>
                      <span className={`activity-icon ${item.tone}`}>
                        <ActivityIcon size={19} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>

            <article className="quick-actions-card">
              <div className="dashboard-section-head">
                <span>Operación</span>
                <h3>Acciones rápidas</h3>
              </div>
              <div className="quick-actions-grid">
                {quickActionCards.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <button type="button" className="quick-action" key={action.title} onClick={action.action}>
                      <span className={`quick-icon ${action.tone}`}>
                        <ActionIcon size={21} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <strong>{action.title}</strong>
                      <small>{action.detail}</small>
                    </button>
                  );
                })}
              </div>
            </article>
          </section>
          </>
        ) : null}

        {portalView === "especializaciones" ? (
          <section className="cu-portal-placeholder">
            <div className="cu-portal-placeholder-head">
              <span className="cu-kicker">Especializaciones UCI</span>
              <h2>Especializaciones</h2>
              <p>Selecciona una especialidad para abrir la vista actual de expedientes y Drive.</p>
            </div>

            {loadingData ? (
              <div className="cu-empty">Cargando especialidades...</div>
            ) : activeSpecialties.length === 0 ? (
              <div className="cu-empty">No hay especialidades registradas.</div>
            ) : (
              <div className="cu-portal-specialty-list">
                {activeSpecialties.map((item) => (
                  <button type="button" className="cu-portal-specialty-row" key={item.id} onClick={() => onOpenEspecialidad?.(item)}>
                    <span>{getSpecialtyInitials(item.nombre)}</span>
                    <div>
                      <strong>{item.nombre}</strong>
                      <small>{item.descripcion || "Especialización crítica de UCI."}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {placeholderContent[portalView] ? (
          <PortalPlaceholder
            config={placeholderContent[portalView]}
            onRegistrar={onOpenRegistrar}
            onAsignar={onOpenAsignar}
            onCrearEvaluacion={onOpenCrearEvaluacion}
            onExportReporte={onExportReporte}
          />
        ) : null}
      </div>
    </CampusLayout>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);
  const [especialidadActiva, setEspecialidadActiva] = useState(null);
  const [usuariosEspecialidad, setUsuariosEspecialidad] = useState([]);
  const [expedienteActivo, setExpedienteActivo] = useState(null);
  const [loadingUsuariosEspecialidad, setLoadingUsuariosEspecialidad] = useState(false);
  const [usuariosEspecialidadError, setUsuariosEspecialidadError] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [vista, setVista] = useState("dashboard");
  const [cursoEvaluacionActivo, setCursoEvaluacionActivo] = useState(null);
  const [tareaActiva, setTareaActiva] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await getCurrentSession();
      if (!mounted) return;
      if (error) console.error("Error sesión:", error);
      setSession(data?.session || null);
      setSessionLoading(false);
    };

    init();

    const { data } = onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession || null);
      if (!newSession) {
        setProfile(null);
        setEspecialidades([]);
        setEspecialidadActiva(null);
        setUsuariosEspecialidad([]);
        setVista("dashboard");
        setCursoEvaluacionActivo(null);
        setTareaActiva(null);
      }
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!session?.user?.id) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);

      try {
        const data = await getProfileByUserId(session.user.id);

        if (!mounted) return;

        setProfile(data || buildFallbackProfile(session));
      } catch (error) {
        console.error("Error inesperado perfil:", error);
        if (mounted) setProfile(buildFallbackProfile(session));
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    let mounted = true;

    const loadEspecialidades = async () => {
      if (!session?.user?.id) return;

      setLoadingData(true);
      setDataError("");

      try {
        const data = await getEspecialidades();

        if (!mounted) return;

        setEspecialidades(data);
      } catch (error) {
        console.error("Error inesperado especialidades:", error);
        if (mounted) {
          setDataError("No se pudieron cargar las especialidades. Mostrando base temporal.");
          setEspecialidades([]);
        }
      } finally {
        if (mounted) setLoadingData(false);
      }
    };

    loadEspecialidades();

    return () => {
      mounted = false;
    };
  }, [session]);


  async function handleOpenEspecialidad(especialidad) {
    if (!especialidad?.id) return;

    setEspecialidadActiva(especialidad);
    setExpedienteActivo(null);
    setTareaActiva(null);
    setUsuariosEspecialidad([]);
    setUsuariosEspecialidadError("");
    setLoadingUsuariosEspecialidad(true);

    try {
      const expedientes = await getExpedientesByEspecialidad(especialidad.id);
      setUsuariosEspecialidad(expedientes);
    } catch (error) {
      console.error("Error cargando expedientes:", error);
      setUsuariosEspecialidadError(
        "No se pudieron cargar los expedientes. Revisá que exista la tabla usuario_especialidad y sus registros.",
      );
      setUsuariosEspecialidad([]);
    } finally {
      setLoadingUsuariosEspecialidad(false);
    }
  }

  async function refreshUsuariosEspecialidad() {
    if (!especialidadActiva?.id) return;

    setUsuariosEspecialidadError("");
    setLoadingUsuariosEspecialidad(true);

    try {
      const expedientes = await getExpedientesByEspecialidad(especialidadActiva.id);
      setUsuariosEspecialidad(expedientes);
    } catch (error) {
      console.error("Error refrescando expedientes:", error);
      setUsuariosEspecialidadError(
        "No se pudieron actualizar los expedientes. Revisá usuario_especialidad y permisos.",
      );
    } finally {
      setLoadingUsuariosEspecialidad(false);
    }
  }


  function handleExportReporte() {
    const filas = [
      ["Especialidad", "Descripción", "Activa"],
      ...especialidades.map((item) => [
        item.nombre || "",
        item.descripcion || "",
        item.activa === false ? "No" : "Sí",
      ]),
    ];

    const csv = filas
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reporte_especialidades.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await signOut();
    setSession(null);
    setProfile(null);
    setEspecialidades([]);
    setEspecialidadActiva(null);
    setUsuariosEspecialidad([]);
    setVista("dashboard");
    setTareaActiva(null);
  }

  if (sessionLoading) return <div className="cu-loading">Cargando sesión...</div>;
  if (!session) return <LoginScreen onLoginSuccess={setSession} />;
  if (profileLoading) return <div className="cu-loading">Cargando perfil...</div>;


  if (vista === "registrar") {
    return (
      <RegistrarPersonal
        session={session}
        profile={profile}
        especialidades={especialidades}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      />
    );
  }

  if (vista === "asignar") {
    return (
      <AsignarEspecialidad
        session={session}
        profile={profile}
        especialidades={especialidades}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      />
    );
  }

  if (vista === "recursosAdmin" && isAdminOrJefe(profile)) {
    return (
      <EspecialidadAdminModuleLayout
        session={session}
        profile={profile}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      >
        <RecursosAdmin
          session={session}
          especialidades={especialidades}
          onBack={() => setVista("dashboard")}
        />
      </EspecialidadAdminModuleLayout>
    );
  }



  if (vista === "crearEvaluacion") {
    if (cursoEvaluacionActivo) {
      return (
        <FormShell
          session={session}
          profile={profile}
          title="Crear evaluación"
          subtitle={cursoEvaluacionActivo?.nombre || "Capacitación"}
          onBack={() => setCursoEvaluacionActivo(null)}
          onLogout={handleLogout}
        >
          <CapacitacionesEspecialidad
            profile={profile}
            especialidad={cursoEvaluacionActivo}
            onBack={() => setCursoEvaluacionActivo(null)}
          />
        </FormShell>
      );
    }

    return (
      <FormShell
        session={session}
        profile={profile}
        title="Crear evaluación"
        subtitle="Seleccionar curso"
        onBack={() => {
          setVista("dashboard");
          setCursoEvaluacionActivo(null);
        }}
        onLogout={handleLogout}
      >
        <section className="cu-panel cu-specialties-panel">
          <div className="cu-panel-header">
            <div>
              <h3>¿Para qué curso querés crear la evaluación?</h3>
              <p>Seleccioná una especialidad para abrir la bitácora académica.</p>
            </div>
            <span className="cu-badge">UCI</span>
          </div>

          {especialidades.length === 0 ? (
            <div className="cu-empty">No hay cursos/especialidades registradas.</div>
          ) : (
            <div className="cu-specialty-grid">
              {especialidades.map((item) => (
                <article className="cu-specialty-card" key={item.id}>
                  <div className="cu-specialty-icon">
                    {getSpecialtyInitials(item.nombre)}
                  </div>
                  <h4>{item.nombre}</h4>
                  <p>{item.descripcion || "Curso académico de especialización UCI."}</p>
                  <button type="button" onClick={() => setCursoEvaluacionActivo(item)}>
                    Crear evaluación
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </FormShell>
    );
  }

  if (vista === "expediente" && expedienteActivo && especialidadActiva) {
    return (
      <IndexCarpetaAcademica
        profile={profile}
        especialidad={especialidadActiva}
        recurso={expedienteActivo}
        onBack={() => {
          setVista("dashboard");
          setExpedienteActivo(null);
        }}
      />
    );
  }

  if (vista === "especialidadDrive" && especialidadActiva && isAdminOrJefe(profile)) {
    return (
      <div className="drive-app-view">
        <EspecialidadDrive
          session={session}
          profile={profile}
          especialidad={especialidadActiva}
          usuarios={usuariosEspecialidad}
          loading={loadingUsuariosEspecialidad}
          error={usuariosEspecialidadError}
          onRecursosChanged={refreshUsuariosEspecialidad}
          onBack={() => setVista("dashboard")}
        />
      </div>
    );
  }

  if (vista === "clasesVirtuales" && especialidadActiva && isAdminOrJefe(profile)) {
    return (
      <EspecialidadAdminModuleLayout
        session={session}
        profile={profile}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      >
        <ClasesVirtuales
          especialidad={especialidadActiva}
          onBack={() => setVista("dashboard")}
        />
      </EspecialidadAdminModuleLayout>
    );
  }

  if (vista === "tareasEspecialidad" && especialidadActiva && isAdminOrJefe(profile)) {
    return (
      <EspecialidadAdminModuleLayout
        session={session}
        profile={profile}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      >
        <TareasEspecialidad
          especialidad={especialidadActiva}
          canManageAcademic={isAdminOrJefe(profile)}
          onOpenEntregas={(tarea) => {
            setTareaActiva(tarea);
            setVista("entregasTareaAdmin");
          }}
          onOpenEntregaRecurso={(tarea) => {
            setTareaActiva(tarea);
            setVista("entregaTareaRecurso");
          }}
          onBack={() => setVista("dashboard")}
        />
      </EspecialidadAdminModuleLayout>
    );
  }

  if (vista === "tareasEspecialidad" && especialidadActiva) {
    return (
      <EspecialidadAdminModuleLayout
        session={session}
        profile={profile}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      >
        <TareasEspecialidad
          especialidad={especialidadActiva}
          canManageAcademic={false}
          onOpenEntregaRecurso={(tarea) => {
            setTareaActiva(tarea);
            setVista("entregaTareaRecurso");
          }}
          onBack={() => setVista("dashboard")}
        />
      </EspecialidadAdminModuleLayout>
    );
  }

  if (vista === "entregasTareaAdmin" && especialidadActiva && tareaActiva && isAdminOrJefe(profile)) {
    return (
      <EspecialidadAdminModuleLayout
        session={session}
        profile={profile}
        onBack={() => setVista("tareasEspecialidad")}
        onLogout={handleLogout}
      >
        <EntregasTareaAdmin
          tarea={tareaActiva}
          especialidad={especialidadActiva}
          onBack={() => setVista("tareasEspecialidad")}
        />
      </EspecialidadAdminModuleLayout>
    );
  }

  if (vista === "entregaTareaRecurso" && especialidadActiva && tareaActiva) {
    return (
      <EspecialidadAdminModuleLayout
        session={session}
        profile={profile}
        onBack={() => setVista("tareasEspecialidad")}
        onLogout={handleLogout}
      >
        <EntregaTareaRecurso
          tarea={tareaActiva}
          especialidad={especialidadActiva}
          profile={profile}
          session={session}
          onBack={() => setVista("tareasEspecialidad")}
        />
      </EspecialidadAdminModuleLayout>
    );
  }

  if (especialidadActiva) {
    return (
      <>
        <ExpedientesEspecialidad
          session={session}
          profile={profile}
          especialidad={especialidadActiva}
          usuarios={usuariosEspecialidad}
          loading={loadingUsuariosEspecialidad}
          error={usuariosEspecialidadError}
          onOpenExpediente={(item) => {
            setExpedienteActivo(item);
            setVista("expediente");
          }}
          onOpenDrive={() => setVista("especialidadDrive")}
          onOpenClasesVirtuales={() => setVista("clasesVirtuales")}
          onOpenTareas={() => setVista("tareasEspecialidad")}
          canOpenDrive={isAdminOrJefe(profile)}
          canManageAcademic={isAdminOrJefe(profile)}
          onBack={() => {
            setEspecialidadActiva(null);
            setExpedienteActivo(null);
            setTareaActiva(null);
            setUsuariosEspecialidad([]);
            setUsuariosEspecialidadError("");
          }}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (profile?.activo === false) {
    return (
      <div className="cu-loading">
        <div>
          <h2>Usuario inactivo</h2>
          <p>Tu usuario está desactivado. Consultá con administración.</p>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  if (!isAdminOrJefe(profile)) {
    return (
      <MiCampus
        session={session}
        profile={profile}
        onLogout={handleLogout}
        onAvatarUpdated={(updatedProfile) => {
          setProfile((currentProfile) => ({
            ...(currentProfile || {}),
            ...(updatedProfile || {}),
          }));
        }}
        onOpenEntregaTarea={({ tarea, especialidad }) => {
          setEspecialidadActiva(especialidad);
          setTareaActiva(tarea);
          setVista("entregaTareaRecurso");
        }}
      />
    );
  }

  return (
    <Dashboard
      session={session}
      profile={profile}
      especialidades={especialidades}
      loadingData={loadingData}
      dataError={dataError}
      onLogout={handleLogout}
      onOpenEspecialidad={handleOpenEspecialidad}
      onOpenRegistrar={() => setVista("registrar")}
      onOpenAsignar={() => setVista("asignar")}
      onOpenCrearEvaluacion={() => {
        setCursoEvaluacionActivo(null);
        setVista("crearEvaluacion");
      }}
      onOpenRecursosAdmin={() => setVista("recursosAdmin")}
      onExportReporte={handleExportReporte}
      onProfileUpdated={(updatedProfile) => {
        setProfile((currentProfile) => ({
          ...(currentProfile || {}),
          ...(updatedProfile || {}),
        }));
      }}
    />
  );
}
