import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { assignProfileEspecialidad } from "../../services/especialidadService";
import { createProfile } from "../../services/profileService";
import AsistenciaGeneral from "./AsistenciaGeneral";
import CronogramaGeneral from "./CronogramaGeneral";
import DriveBreadcrumb from "./drive/DriveBreadcrumb";
import DriveFolderCard from "./drive/DriveFolderCard";
import EvaluacionActitudinal from "./EvaluacionActitudinal";
import FirmaAsistencia from "./FirmaAsistencia";
import MaterialAcademico from "./MaterialAcademico";
import NotasGenerales from "./NotasGenerales";
import PresentacionesPonentes from "./PresentacionesPonentes";
import "./drive/drive.css";

const ROOT_VIEW = "root";
const GENERAL_VIEW = "datos-generales";
const RECURSOS_VIEW = "datos-recurso";
const RECURSO_DETAIL_VIEW = "recurso";
const CRONOGRAMA_VIEW = "cronograma";
const ASISTENCIA_VIEW = "asistencia";
const EVALUACIONES_VIEW = "evaluaciones";
const NOTAS_VIEW = "mis-notas";
const CAPACITACIONES_VIEW = "capacitaciones";
const REPORTES_VIEW = "reportes";
const CONFIG_VIEW = "configuracion";

const MOCK_RESOURCES = [
  {
    id: "mock-recurso-1",
    profile_id: "mock-recurso-1",
    nombre: "Recurso UCI 001",
    correo: "recurso001@campusuci.test",
    cum: "UCI-001",
    rol: "Estudiante",
    servicio: "UCI",
    area: "Hemodiálisis",
  },
  {
    id: "mock-recurso-2",
    profile_id: "mock-recurso-2",
    nombre: "Recurso UCI 002",
    correo: "recurso002@campusuci.test",
    cum: "UCI-002",
    rol: "Estudiante",
    servicio: "UCI",
    area: "Hemodiálisis",
  },
  {
    id: "mock-recurso-3",
    profile_id: "mock-recurso-3",
    nombre: "Recurso UCI 003",
    correo: "recurso003@campusuci.test",
    cum: "UCI-003",
    rol: "Estudiante",
    servicio: "UCI",
    area: "Hemodiálisis",
  },
];

const RESOURCE_FOLDERS = [
  {
    key: "datos-personales",
    title: "Datos personales",
    description: "Información base del recurso: CUM, correo, rol, servicio, área y estado.",
    icon: "file",
    tone: "slate",
    badge: "Perfil",
  },
  {
    key: "pasantia",
    title: "Pasantía",
    description: "Actividades prácticas, horas acumuladas y seguimiento de pasantía.",
    icon: "folder",
    tone: "blue",
    badge: "Académico",
  },
  {
    key: "notas",
    title: "Notas",
    description: "Registro de notas, evaluaciones por área, promedio y estado académico.",
    icon: "folder",
    tone: "indigo",
    badge: "Notas",
  },
  {
    key: "asistencia",
    title: "Asistencia",
    description: "Asistencia individual por clase, módulo y actividad registrada.",
    icon: "folder",
    tone: "green",
    badge: "Asistencia",
  },
  {
    key: "evaluacion-actitudinal",
    title: "Evaluación Actitudinal",
    description: "Criterios actitudinales, observaciones y promedio individual.",
    icon: "file",
    tone: "slate",
    badge: "Actitud",
  },
  {
    key: "consolidado-final",
    title: "Consolidado Final",
    description: "Resumen final de asistencia, notas, pasantía, cumplimiento y resultado.",
    icon: "file",
    tone: "green",
    badge: "Final",
  },
  {
    key: "evidencias-certificados",
    title: "Evidencias / Certificados",
    description: "Documentos, certificados, constancias y evidencias del expediente.",
    icon: "folder",
    tone: "blue",
    badge: "Evidencias",
  },
];

const RESOURCE_FORM_INITIAL = {
  nombre: "",
  correo: "",
  cum: "",
  area: "",
  estado: "Activo",
};

const GENERAL_FOLDERS = [
  {
    key: "presentaciones-ponentes",
    title: "Presentaciones Ponentes",
    description: "Material preparado por ponentes, clases magistrales y recursos visuales de apoyo.",
    tone: "blue",
    badge: "Ponentes",
  },
  {
    key: "notas-generales",
    title: "Notas",
    description: "Notas generales de la especialidad, criterios académicos y registros compartidos.",
    tone: "indigo",
    badge: "Académico",
  },
  {
    key: "firma-asistencia",
    title: "Firma de Asistencia",
    description: "Control documental de firmas por sesión, clase o actividad académica.",
    tone: "green",
    badge: "Asistencia",
  },
  {
    key: "evaluacion-actitudinal",
    title: "Evaluación Actitudinal",
    description: "Instrumentos para evaluar conducta, participación, responsabilidad y desempeño.",
    tone: "slate",
    badge: "Actitudinal",
  },
  {
    key: "asistencia-general",
    title: "Asistencia",
    description: "Resumen general de asistencia de la especialidad y sesiones registradas.",
    tone: "green",
    badge: "General",
  },
  {
    key: "cronograma-general",
    title: "Cronograma",
    description: "Planificación de clases, actividades, evaluaciones y fechas relevantes.",
    tone: "blue",
    badge: "Calendario",
  },
  {
    key: "material-academico",
    title: "Material Académico",
    description: "Documentos, guías, lecturas, protocolos y material de estudio compartido.",
    tone: "indigo",
    badge: "Material",
  },
];

const MENU_ITEMS = [
  { label: "Dashboard", view: ROOT_VIEW },
  { label: "Especialidades", action: "back" },
  { label: "Recursos", view: RECURSOS_VIEW },
  { label: "Cronograma", view: CRONOGRAMA_VIEW },
  { label: "Asistencia", view: ASISTENCIA_VIEW },
  { label: "Evaluaciones", view: EVALUACIONES_VIEW },
  { label: "Mis Notas", view: NOTAS_VIEW },
  { label: "Capacitaciones", view: CAPACITACIONES_VIEW },
  { label: "Reportes", view: REPORTES_VIEW },
  { label: "Configuración", view: CONFIG_VIEW },
];

const VIEW_LABELS = {
  [ROOT_VIEW]: "Dashboard",
  [GENERAL_VIEW]: "Datos Generales",
  [RECURSOS_VIEW]: "Datos por Recurso",
  [RECURSO_DETAIL_VIEW]: "Expediente",
  [CRONOGRAMA_VIEW]: "Cronograma",
  [ASISTENCIA_VIEW]: "Asistencia",
  [EVALUACIONES_VIEW]: "Evaluaciones",
  [NOTAS_VIEW]: "Mis Notas",
  [CAPACITACIONES_VIEW]: "Capacitaciones",
  [REPORTES_VIEW]: "Reportes",
  [CONFIG_VIEW]: "Configuración",
};

const SECTION_COPY = {
  [CRONOGRAMA_VIEW]: {
    title: "Cronograma",
    badge: "Datos Generales",
    description:
      "Planificación general de clases, semanas académicas, actividades y evaluaciones de la especialidad.",
    cards: ["Clases programadas", "Actividades académicas", "Evaluaciones calendarizadas"],
  },
  [ASISTENCIA_VIEW]: {
    title: "Asistencia",
    badge: "Por Recurso",
    description:
      "Seguimiento de asistencia por recurso, sesiones de pasantía, ausencias y justificaciones.",
    cards: ["Registro de asistencia", "Pasantía", "Justificaciones"],
  },
  [EVALUACIONES_VIEW]: {
    title: "Evaluaciones",
    badge: "Académico",
    description:
      "Gestión de evaluaciones, resultados, participantes y evidencias de aprendizaje.",
    cards: ["Evaluaciones base", "Resultados", "Participantes"],
  },
  [NOTAS_VIEW]: {
    title: "Mis Notas",
    badge: "Por Recurso",
    description:
      "Consulta y administración de notas por área, actividad, promedio y estado académico.",
    cards: ["Notas por área", "Promedio", "Estado académico"],
  },
  [CAPACITACIONES_VIEW]: {
    title: "Capacitaciones",
    badge: "Datos Generales",
    description:
      "Bitácora de capacitaciones, horas acumuladas, personal que impartió y personal que recibió.",
    cards: ["Bitácora", "Horas", "Participantes"],
  },
  [REPORTES_VIEW]: {
    title: "Reportes",
    badge: "Consolidado",
    description:
      "Resumen ejecutivo de recursos, avances, notas, asistencia y consolidado final.",
    cards: ["Consolidado final", "Avance general", "Exportaciones"],
  },
  [CONFIG_VIEW]: {
    title: "Configuración",
    badge: "Administración",
    description:
      "Parámetros de la especialidad, permisos, configuración académica y ajustes operativos.",
    cards: ["Parámetros", "Permisos", "Ajustes"],
  },
};

const ATTENDANCE_OK = new Set(["Asistió", "Tardanza", "Justificado"]);

function getDisplayName(session, profile) {
  return (
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Usuario"
  );
}

function getResourceId(recurso) {
  return recurso?.profile_id || recurso?.id || recurso?.usuario_id || recurso?.user_id || null;
}

function getProgressLabel(progress) {
  if (!progress?.hasData) return "Sin datos";
  return `${progress.value}%`;
}

function countCompletedResources(usuarios = [], progressByResource = {}) {
  return usuarios.filter((item) => {
    const progress = progressByResource[getResourceId(item)];
    return progress?.hasData && Number(progress.value) >= 100;
  }).length;
}

function calculateResourceProgress({ cronogramaCount = 0, asistencias = [], notas = [], evaluaciones = [] }) {
  const components = [];

  if (cronogramaCount > 0) {
    const asistenciasValidas = asistencias.filter((item) => ATTENDANCE_OK.has(item.estado)).length;
    components.push(Math.min(100, Math.round((asistenciasValidas / cronogramaCount) * 100)));
  }

  const notaScores = notas
    .map((item) => Number(item.nota))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(100, value * 10)));

  const evaluacionScores = evaluaciones
    .flatMap((item) => item.especialidad_capacitaciones_participantes || [])
    .map((item) => Number(item.evaluacion))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(100, value * 10)));

  const academicScores = [...notaScores, ...evaluacionScores];
  if (academicScores.length > 0) {
    components.push(
      Math.round(academicScores.reduce((acc, value) => acc + value, 0) / academicScores.length),
    );
  }

  if (components.length === 0) {
    return {
      hasData: false,
      value: 0,
      label: "Pendiente de iniciar",
    };
  }

  const value = Math.round(components.reduce((acc, item) => acc + item, 0) / components.length);

  return {
    hasData: true,
    value,
    label: `${value}%`,
  };
}

async function safeSelect(query, label) {
  const { data, error } = await query;
  if (error) {
    console.warn(`No se pudo cargar ${label}:`, error.message || error);
    return [];
  }
  return data || [];
}

function RootFolders({
  usuarios = [],
  progressByResource = {},
  loadingProgress = false,
  onOpenGeneral,
  onOpenRecursos,
}) {
  const totalRecursos = usuarios.length;
  const completados = countCompletedResources(usuarios, progressByResource);

  return (
    <section className="drive-grid drive-root-grid" aria-label="Carpetas de especialidad">
      <DriveFolderCard
        title="Datos Generales"
        description="Información institucional, cronograma, evaluaciones base y listado general de recursos."
        icon="folder"
        tone="blue"
        badge="Generales"
        meta="Abrir carpeta"
        onOpen={onOpenGeneral}
      />

      <DriveFolderCard
        title="Datos por Recurso"
        description="Expedientes individuales con datos personales, pasantía, notas y consolidado final."
        icon="users"
        tone="green"
        badge="Por Recurso"
        meta={loadingProgress ? `${totalRecursos} recursos · calculando avances` : `${totalRecursos} recursos · ${completados} completados`}
        onOpen={onOpenRecursos}
      />
    </section>
  );
}

function FolderStructureInfo({ totalRecursos = 0 }) {
  return (
    <section className="drive-structure-info" aria-label="Estructura de carpetas">
      <div>
        <span className="drive-info-label">Estructura de carpetas</span>
        <h2>Organización académica por especialidad y recurso</h2>
        <p>
          La carpeta raíz conserva los datos comunes de la especialidad y separa los
          expedientes individuales para consultar pasantía, notas y consolidado final por recurso.
        </p>
      </div>

      <div className="drive-structure-steps">
        <div>
          <strong>01</strong>
          <span>Datos Generales</span>
        </div>
        <div>
          <strong>02</strong>
          <span>{totalRecursos} expedientes</span>
        </div>
        <div>
          <strong>03</strong>
          <span>Consolidado final</span>
        </div>
      </div>
    </section>
  );
}

function DatosGeneralesPreview({ onOpenFolder }) {
  return (
    <section className="drive-grid" aria-label="Datos generales">
      {GENERAL_FOLDERS.map((folder) => (
        <DriveFolderCard
          key={folder.key}
          title={folder.title}
          description={folder.description}
          icon="folder"
          tone={folder.tone}
          badge={folder.badge}
          meta="Abrir carpeta"
          onOpen={() => onOpenFolder?.(folder)}
        />
      ))}
    </section>
  );
}

function DatosGeneralesFolderPlaceholder({ folder }) {
  if (folder.key === "presentaciones-ponentes") {
    return <PresentacionesPonentes />;
  }

  if (folder.key === "notas-generales") {
    return <NotasGenerales />;
  }

  if (folder.key === "firma-asistencia") {
    return <FirmaAsistencia />;
  }

  if (folder.key === "evaluacion-actitudinal") {
    return <EvaluacionActitudinal />;
  }

  if (folder.key === "asistencia-general") {
    return <AsistenciaGeneral />;
  }

  if (folder.key === "cronograma-general") {
    return <CronogramaGeneral />;
  }

  if (folder.key === "material-academico") {
    return <MaterialAcademico />;
  }

  return (
    <section className="drive-section-panel" aria-label={folder.title}>
      <div className="drive-section-copy">
        <span className="drive-info-label">Datos Generales</span>
        <h2>{folder.title}</h2>
        <p>{folder.description}</p>
      </div>

      <div className="drive-section-card-grid">
        <article className="drive-section-card">
          <strong>Contenido pendiente</strong>
          <span>Esta carpeta está lista para conectar archivos, registros o módulos existentes.</span>
        </article>
        <article className="drive-section-card">
          <strong>Vista Drive</strong>
          <span>La navegación y el breadcrumb ya están preparados para esta sección.</span>
        </article>
        <article className="drive-section-card">
          <strong>Sin conexión Supabase</strong>
          <span>Por ahora no escribe ni modifica datos en ninguna tabla.</span>
        </article>
      </div>
    </section>
  );
}

function SidebarMenu({ activeView, onNavigate, onBack }) {
  return (
    <aside className="drive-sidebar" aria-label="Navegación Campus UCI">
      <div className="drive-sidebar-brand">
        <div className="drive-sidebar-logo">UCI</div>
        <div>
          <strong>Campus UCI</strong>
          <span>Especialidades</span>
        </div>
      </div>

      <nav className="drive-sidebar-menu">
        {MENU_ITEMS.map((item) => (
          <button
            type="button"
            className={item.view === activeView ? "active" : ""}
            key={item.label}
            onClick={() => {
              if (item.action === "back") {
                onBack?.();
                return;
              }

              onNavigate?.(item.view);
            }}
          >
            <span className="drive-menu-dot" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function FolderIllustration() {
  return (
    <div className="drive-folder-illustration" aria-hidden="true">
      <div className="drive-folder-back" />
      <div className="drive-folder-front">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function Topbar({ onBack }) {
  return (
    <header className="drive-topbar">
      <button type="button" className="drive-topbar-back" onClick={onBack}>
        <span aria-hidden="true">←</span>
        Volver a especialidades
      </button>

      <div className="drive-topbar-actions">
        <button type="button" className="drive-icon-button" aria-label="Notificaciones">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 9.5a6 6 0 0 0-12 0c0 6-2.2 6.8-2.2 6.8h16.4S18 15.5 18 9.5Z" />
            <path d="M9.5 19a2.6 2.6 0 0 0 5 0" />
          </svg>
        </button>

        <div className="drive-user-chip">
          <div className="drive-user-avatar">A</div>
          <div>
            <strong>Admin UCI</strong>
            <span>Campus UCI</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function DatosPorRecursoPreview({
  usuarios = [],
  progressByResource = {},
  loadingProgress = false,
  onOpenRecurso,
  onAddRecurso,
}) {
  if (!usuarios.length) {
    return (
      <section className="drive-module-view" aria-label="Expedientes por recurso">
        <div className="drive-module-header">
          <div>
            <span className="drive-info-label">Datos por Recurso</span>
            <h2>Expedientes individuales</h2>
            <p>No hay recursos asignados a esta especialidad todavía.</p>
          </div>
          <div className="drive-module-actions">
            <button type="button" className="drive-upload-button" onClick={onAddRecurso}>
              Agregar recurso
            </button>
          </div>
        </div>

        <div className="drive-placeholder">
          Crea el primer expediente individual para organizar datos personales, pasantía, notas,
          asistencia y consolidado final.
        </div>
      </section>
    );
  }

  return (
    <section className="drive-module-view" aria-label="Expedientes por recurso">
      <div className="drive-module-header">
        <div>
          <span className="drive-info-label">Datos por Recurso</span>
          <h2>Expedientes individuales</h2>
          <p>
            Cada recurso conserva su carpeta individual con datos personales, pasantía, notas,
            asistencia, evaluación actitudinal, consolidado final y evidencias.
          </p>
        </div>
        <div className="drive-module-actions">
          <button type="button" className="drive-upload-button" onClick={onAddRecurso}>
            Agregar recurso
          </button>
        </div>
      </div>

      <div className="drive-grid">
        {usuarios.map((recurso) => {
          const progress = progressByResource[getResourceId(recurso)];

          return (
            <DriveFolderCard
              key={recurso.id || recurso.user_id || recurso.profile_id}
              title={recurso.nombre || "Recurso sin nombre"}
              description={`${recurso.cum || "Sin CUM"} · ${recurso.correo || "Sin correo"}`}
              icon="users"
              tone={recurso.estado === "Inactivo" ? "slate" : "green"}
              badge={recurso.estado === "Inactivo" ? "Inactivo" : loadingProgress ? "Calculando" : getProgressLabel(progress)}
              meta={progress?.hasData ? "Abrir expediente" : "Pendiente de iniciar"}
              onOpen={() => onOpenRecurso?.(recurso)}
            />
          );
        })}
      </div>
    </section>
  );
}

function AddResourceModal({
  form,
  especialidadNombre,
  saving = false,
  error = "",
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="drive-modal-backdrop" role="presentation">
      <section className="drive-modal" role="dialog" aria-modal="true" aria-labelledby="add-resource-title">
        <header className="drive-modal-header">
          <div>
            <span className="drive-info-label">Nuevo expediente</span>
            <h2 id="add-resource-title">Agregar recurso</h2>
            <p>El recurso se guardará en Supabase y quedará asociado a la especialidad actual.</p>
          </div>
          <button type="button" className="drive-modal-close" aria-label="Cerrar" onClick={onClose}>
            x
          </button>
        </header>

        <form className="drive-resource-form" onSubmit={onSubmit}>
          {error ? <div className="drive-form-alert">{error}</div> : null}

          <label>
            Nombre completo
            <input
              required
              type="text"
              disabled={saving}
              value={form.nombre}
              onChange={(event) => onChange("nombre", event.target.value)}
              placeholder="Nombre y apellido"
            />
          </label>

          <label>
            Correo
            <input
              type="email"
              required
              disabled={saving}
              value={form.correo}
              onChange={(event) => onChange("correo", event.target.value)}
              placeholder="correo@campusuci.test"
            />
          </label>

          <label>
            CUM
            <input
              type="text"
              disabled={saving}
              value={form.cum}
              onChange={(event) => onChange("cum", event.target.value)}
              placeholder="UCI-000"
            />
          </label>

          <label>
            Servicio/área
            <input
              type="text"
              disabled={saving}
              value={form.area}
              onChange={(event) => onChange("area", event.target.value)}
              placeholder="UCI / Hemodiálisis"
            />
          </label>

          <label>
            Especialidad actual
            <input type="text" value={especialidadNombre} readOnly />
          </label>

          <label>
            Estado
            <select
              value={form.estado}
              disabled
              onChange={(event) => onChange("estado", event.target.value)}
            >
              <option value="Activo">Activo</option>
            </select>
          </label>

          <footer className="drive-modal-actions">
            <button type="button" className="drive-secondary-button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="drive-upload-button" disabled={saving}>
              {saving ? "Guardando..." : "Guardar recurso"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function RecursoFolders({ recurso, progress, loadingProgress = false, onOpenFolder }) {
  const nombre = recurso?.nombre || "Recurso sin nombre";

  return (
    <section className="drive-grid" aria-label={`Carpetas internas de ${nombre}`}>
      {RESOURCE_FOLDERS.map((folder) => (
        <DriveFolderCard
          key={folder.key}
          title={folder.title}
          description={folder.description}
          icon={folder.icon}
          tone={folder.tone}
          badge={folder.key === "notas" && loadingProgress ? "Calculando" : folder.badge}
          meta={folder.key === "notas" && progress?.hasData ? getProgressLabel(progress) : "Abrir carpeta"}
          onOpen={() => onOpenFolder?.(folder)}
        />
      ))}
    </section>
  );
}

function RecursoFolderPlaceholder({ recurso, folder }) {
  return (
    <section className="drive-section-panel" aria-label={folder.title}>
      <div className="drive-section-copy">
        <span className="drive-info-label">Expediente individual</span>
        <h2>{folder.title}</h2>
        <p>{folder.description}</p>
      </div>

      <div className="drive-section-card-grid">
        <article className="drive-section-card">
          <strong>{recurso?.nombre || "Recurso sin nombre"}</strong>
          <span>{recurso?.cum || "Sin CUM"} · {recurso?.correo || "Sin correo"}</span>
        </article>
        <article className="drive-section-card">
          <strong>Mock temporal</strong>
          <span>Esta carpeta queda lista para conectar datos reales en una fase posterior.</span>
        </article>
        <article className="drive-section-card">
          <strong>Sin cambios Supabase</strong>
          <span>No modifica tablas ni escribe información en la base de datos.</span>
        </article>
      </div>
    </section>
  );
}

function SectionPlaceholder({ section }) {
  const config = SECTION_COPY[section] || SECTION_COPY[CONFIG_VIEW];

  return (
    <section className="drive-section-panel" aria-label={config.title}>
      <div className="drive-section-copy">
        <span className="drive-info-label">{config.badge}</span>
        <h2>{config.title}</h2>
        <p>{config.description}</p>
      </div>

      <div className="drive-section-card-grid">
        {config.cards.map((card) => (
          <article className="drive-section-card" key={card}>
            <strong>{card}</strong>
            <span>Listo para conectar con los módulos existentes.</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function EspecialidadDrive({
  session = null,
  profile = null,
  especialidad = null,
  usuarios = [],
  loading = false,
  error = "",
  onBack = null,
  onRecursosChanged = null,
}) {
  const [view, setView] = useState(ROOT_VIEW);
  const [recursoActivo, setRecursoActivo] = useState(null);
  const [resourceFolder, setResourceFolder] = useState(null);
  const [generalFolder, setGeneralFolder] = useState(null);
  const [localResources, setLocalResources] = useState([]);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState(RESOURCE_FORM_INITIAL);
  const [savingResource, setSavingResource] = useState(false);
  const [resourceFormError, setResourceFormError] = useState("");
  const [progressByResource, setProgressByResource] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(false);

  const displayName = getDisplayName(session, profile);
  const baseResources = usuarios.length || especialidad?.id ? usuarios : MOCK_RESOURCES;
  const displayResources = [...baseResources, ...localResources];
  const totalRecursos = displayResources.length;
  const completados = countCompletedResources(displayResources, progressByResource);

  useEffect(() => {
    let alive = true;

    async function loadProgress() {
      const especialidadId = especialidad?.id;
      const recursoIds = usuarios.map(getResourceId).filter(Boolean);

      if (!especialidadId || recursoIds.length === 0) {
        setProgressByResource({});
        return;
      }

      setLoadingProgress(true);

      try {
        const [cronograma, asistencias, notas, evaluaciones] = await Promise.all([
          safeSelect(
            supabase
              .from("especialidad_cronograma_clases")
              .select("id")
              .eq("especialidad_id", especialidadId),
            "cronograma",
          ),
          safeSelect(
            supabase
              .from("especialidad_asistencia")
              .select("id, recurso_id, estado")
              .eq("especialidad_id", especialidadId)
              .in("recurso_id", recursoIds),
            "asistencia",
          ),
          safeSelect(
            supabase
              .from("especialidad_notas")
              .select("id, recurso_id, nota")
              .eq("especialidad_id", especialidadId)
              .in("recurso_id", recursoIds),
            "notas",
          ),
          safeSelect(
            supabase
              .from("especialidad_capacitaciones")
              .select("id, recurso_id, especialidad_capacitaciones_participantes(evaluacion)")
              .eq("especialidad_id", especialidadId)
              .in("recurso_id", recursoIds),
            "evaluaciones",
          ),
        ]);

        if (!alive) return;

        const nextProgress = recursoIds.reduce((acc, recursoId) => {
          acc[recursoId] = calculateResourceProgress({
            cronogramaCount: cronograma.length,
            asistencias: asistencias.filter((item) => item.recurso_id === recursoId),
            notas: notas.filter((item) => item.recurso_id === recursoId),
            evaluaciones: evaluaciones.filter((item) => item.recurso_id === recursoId),
          });
          return acc;
        }, {});

        setProgressByResource(nextProgress);
      } finally {
        if (alive) setLoadingProgress(false);
      }
    }

    loadProgress();

    return () => {
      alive = false;
    };
  }, [especialidad?.id, usuarios]);

  const breadcrumbItems = useMemo(() => {
    const base = [
      {
        key: ROOT_VIEW,
        label: especialidad?.nombre || "Especialidad",
        view: ROOT_VIEW,
      },
    ];

    if (view === GENERAL_VIEW) {
      base.push({ key: GENERAL_VIEW, label: "Datos Generales", view: GENERAL_VIEW });

      if (generalFolder) {
        base.push({
          key: generalFolder.key,
          label: generalFolder.title,
          view: GENERAL_VIEW,
          generalFolder,
        });
      }
    }

    if (view === RECURSOS_VIEW) {
      base.push({ key: RECURSOS_VIEW, label: "Datos por Recurso", view: RECURSOS_VIEW });
    }

    if (view === RECURSO_DETAIL_VIEW) {
      base.push({ key: RECURSOS_VIEW, label: "Datos por Recurso", view: RECURSOS_VIEW });
      base.push({
        key: RECURSO_DETAIL_VIEW,
        label: recursoActivo?.nombre || "Expediente",
        view: RECURSO_DETAIL_VIEW,
      });

      if (resourceFolder) {
        base.push({
          key: resourceFolder.key,
          label: resourceFolder.title,
          view: RECURSO_DETAIL_VIEW,
          resourceFolder,
        });
      }
    }

    if (SECTION_COPY[view]) {
      base.push({ key: view, label: VIEW_LABELS[view], view });
    }

    return base;
  }, [especialidad?.nombre, generalFolder, resourceFolder, recursoActivo?.nombre, view]);

  function handleBreadcrumbNavigate(item) {
    if (item.generalFolder) return;
    if (item.resourceFolder) return;

    if (item.view === GENERAL_VIEW) {
      setGeneralFolder(null);
    }

    if (item.view === RECURSO_DETAIL_VIEW) {
      setResourceFolder(null);
    }

    openView(item.view || ROOT_VIEW);
  }

  function openView(nextView = ROOT_VIEW) {
    setView(nextView);

    if (nextView !== RECURSO_DETAIL_VIEW) {
      setRecursoActivo(null);
      setResourceFolder(null);
    }

    if (nextView !== GENERAL_VIEW) {
      setGeneralFolder(null);
    }
  }

  function handleBack() {
    if (view === RECURSO_DETAIL_VIEW) {
      if (resourceFolder) {
        setResourceFolder(null);
        return;
      }

      setView(RECURSOS_VIEW);
      setRecursoActivo(null);
      return;
    }

    if (view !== ROOT_VIEW) {
      if (view === GENERAL_VIEW && generalFolder) {
        setGeneralFolder(null);
        return;
      }

      setView(ROOT_VIEW);
      return;
    }

    onBack?.();
  }

  function handleResourceFormChange(field, value) {
    setResourceForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleOpenResourceModal() {
    setResourceForm(RESOURCE_FORM_INITIAL);
    setResourceFormError("");
    setShowResourceModal(true);
  }

  function handleCloseResourceModal(force = false) {
    if (savingResource && force !== true) return;
    setShowResourceModal(false);
    setResourceForm(RESOURCE_FORM_INITIAL);
    setResourceFormError("");
  }

  async function handleCreateResource(event) {
    event.preventDefault();

    if (!especialidad?.id) {
      setResourceFormError("No hay una especialidad activa para asociar el recurso.");
      return;
    }

    if (!resourceForm.nombre.trim() || !resourceForm.correo.trim()) {
      setResourceFormError("Completá nombre completo y correo.");
      return;
    }

    setSavingResource(true);
    setResourceFormError("");

    try {
      const areaValue = resourceForm.area.trim() || "Sin servicio/área";
      const profilePayload = {
        nombre: resourceForm.nombre.trim(),
        correo: resourceForm.correo.trim().toLowerCase(),
        cum: resourceForm.cum.trim() || null,
        servicio: areaValue,
        area: areaValue,
        rol: "personal",
        activo: true,
      };

      console.info("[Campus UCI][Supabase] Creando recurso en profiles", {
        table: "profiles",
        especialidad: especialidad?.nombre,
        payload: profilePayload,
      });

      const insertedProfile = await createProfile({
        ...profilePayload,
      });

      console.info("[Campus UCI][Supabase] Recurso creado en profiles", {
        table: "profiles",
        profileId: insertedProfile?.id,
        correo: insertedProfile?.correo,
      });

      await assignProfileEspecialidad({
        usuarioId: insertedProfile.id,
        especialidadId: especialidad.id,
        progreso: 0,
      });

      await onRecursosChanged?.();
      setLocalResources([]);
      handleCloseResourceModal(true);
    } catch (error) {
      console.error("[Campus UCI][Supabase] Error exacto creando recurso desde Drive", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error,
      });
      setResourceFormError(
        error?.message
          ? `No se pudo guardar el recurso: ${error.message}`
          : "No se pudo guardar el recurso. Revisá permisos/RLS y columnas de Supabase.",
      );
    } finally {
      setSavingResource(false);
    }
  }

  const title =
    view === GENERAL_VIEW
      ? generalFolder?.title || "Datos Generales"
      : view === RECURSOS_VIEW
        ? "Datos por Recurso"
        : view === RECURSO_DETAIL_VIEW
          ? resourceFolder?.title || recursoActivo?.nombre || "Expediente del recurso"
          : SECTION_COPY[view]?.title || especialidad?.nombre || "Especialidad";

  const subtitle =
    view === ROOT_VIEW
      ? `Carpeta raíz de ${especialidad?.nombre || "la especialidad"} para gestión académica de ${displayName}.`
      : view === GENERAL_VIEW && generalFolder
        ? generalFolder.description
      : view === RECURSO_DETAIL_VIEW
        ? resourceFolder?.description || "Expediente individual organizado en datos personales, pasantía, notas, asistencia, evaluación actitudinal, consolidado final y evidencias."
        : SECTION_COPY[view]?.description || "Vista preparada para conectar los módulos existentes en la siguiente fase.";

  return (
    <div className="drive-shell">
      <SidebarMenu activeView={view} onNavigate={openView} onBack={onBack} />

      <main className="drive-main">
        <Topbar onBack={view === ROOT_VIEW ? onBack : handleBack} />

        <div className="drive-container">
          <DriveBreadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

          <section className="drive-hero">
            <div className="drive-hero-copy">
              <span className="drive-hero-kicker">Especialidad activa</span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>

            <FolderIllustration />
          </section>

          <section className="drive-summary-card" aria-label="Resumen de especialidad">
            <div className="drive-summary-title">
              <span>Especialidad</span>
              <strong>{especialidad?.nombre || "Hemodiálisis"}</strong>
              <p>
                {especialidad?.descripcion ||
                  "Organización académica por datos generales y expedientes individuales."}
              </p>
            </div>

            <div className="drive-summary-metrics">
              <div className="drive-stat">
                <span>Recursos</span>
                <strong>{totalRecursos}</strong>
              </div>
              <div className="drive-stat">
                <span>Completados</span>
                <strong>{completados}</strong>
              </div>
              <div className="drive-stat">
                <span>Estado</span>
                <strong>{especialidad?.activa === false ? "Inactiva" : "Activa"}</strong>
              </div>
            </div>
          </section>

          {error ? <div className="drive-placeholder">{error}</div> : null}

          {loading ? (
            <div className="drive-placeholder">Cargando estructura de especialidad...</div>
          ) : null}

          {!loading && view === ROOT_VIEW ? (
            <>
              <RootFolders
                usuarios={displayResources}
                progressByResource={progressByResource}
                loadingProgress={loadingProgress}
                onOpenGeneral={() => openView(GENERAL_VIEW)}
                onOpenRecursos={() => openView(RECURSOS_VIEW)}
              />
              <FolderStructureInfo totalRecursos={totalRecursos} />
            </>
          ) : null}

          {!loading && view === GENERAL_VIEW ? (
            generalFolder ? (
              <DatosGeneralesFolderPlaceholder folder={generalFolder} />
            ) : (
              <DatosGeneralesPreview onOpenFolder={setGeneralFolder} />
            )
          ) : null}

          {!loading && view === RECURSOS_VIEW ? (
            <DatosPorRecursoPreview
              usuarios={displayResources}
              progressByResource={progressByResource}
              loadingProgress={loadingProgress}
              onAddRecurso={handleOpenResourceModal}
              onOpenRecurso={(recurso) => {
                setRecursoActivo(recurso);
                setResourceFolder(null);
                setView(RECURSO_DETAIL_VIEW);
              }}
            />
          ) : null}

          {!loading && view === RECURSO_DETAIL_VIEW && !resourceFolder ? (
            <RecursoFolders
              recurso={recursoActivo}
              progress={progressByResource[getResourceId(recursoActivo)]}
              loadingProgress={loadingProgress}
              onOpenFolder={setResourceFolder}
            />
          ) : null}

          {!loading && view === RECURSO_DETAIL_VIEW && resourceFolder ? (
            <RecursoFolderPlaceholder recurso={recursoActivo} folder={resourceFolder} />
          ) : null}

          {!loading && SECTION_COPY[view] ? (
            <SectionPlaceholder section={view} />
          ) : null}

          {showResourceModal ? (
            <AddResourceModal
              form={resourceForm}
              especialidadNombre={especialidad?.nombre || "Especialidad actual"}
              saving={savingResource}
              error={resourceFormError}
              onChange={handleResourceFormChange}
              onClose={handleCloseResourceModal}
              onSubmit={handleCreateResource}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
