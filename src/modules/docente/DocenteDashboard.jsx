import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  MessageSquare,
  Plus,
  Save,
  Search,
  Star,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import CampusLayout from "../../components/campus/CampusLayout";
import AvatarUpload from "../../components/campus/AvatarUpload";
import icuHero from "../../assets/icu-hero.png";
import {
  getDocenteDashboard,
  reviewEntrega,
  updateAsistenciaDocente,
  updateNotaDocente,
} from "../../services/docenteService";

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
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
        <circle className="value" cx="54" cy="54" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <strong>{safeValue}%</strong>
      <span>avance</span>
    </div>
  );
}

function shortChartLabel(value = "") {
  const clean = String(value || "Sin nombre").trim().replace(/\s+/g, " ");
  if (!clean || clean === "Sin nombre") return "Sin datos";
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length <= 2) return clean;
  return `${parts[0]} ${parts[1]}`;
}

function MiniBarChart({ title, items = [], suffix = "", max = 100 }) {
  const validItems = items.filter((item) => Number(item.value) > 0);
  const visibleItems = (validItems.length ? validItems : items).slice(0, 8);
  const isHorizontal = title === "Cumplimiento de clases";
  const hasUsefulData = validItems.length > 0;

  return (
    <article className={`teacher-pro-chart ${isHorizontal ? "teacher-pro-horizontal-chart" : ""}`}>
      <div className="record-panel-head"><span>Gráfica</span><h3>{title}</h3></div>
      {visibleItems.length && hasUsefulData ? (
        <div className={isHorizontal ? "teacher-pro-bars teacher-pro-horizontal-bars" : "teacher-pro-bars teacher-pro-vertical-bars"}>
          {visibleItems.map((item) => {
            const value = Number(item.value) || 0;
            const percent = max ? Math.min(100, (value / max) * 100) : 0;
            const label = shortChartLabel(item.label);
            return (
              <div className="teacher-pro-bar-row" key={`${item.label}-${item.value}`} title={`${label}: ${value}${suffix}`}>
                <strong>{value}{suffix}</strong>
                <span><i style={isHorizontal ? { width: `${percent}%` } : { height: `${percent}%` }} /></span>
                <small>{label}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="teacher-pro-chart-empty">
          <BarChart3 size={28} strokeWidth={1.8} aria-hidden="true" />
          <strong>Sin datos para graficar</strong>
          <span>La información aparecerá cuando existan registros reales.</span>
        </div>
      )}
      <button type="button" className="teacher-chart-action">Ver todos</button>
    </article>
  );
}

function DonutChart({ title, approved = 0, failed = 0 }) {
  const total = Math.max(0, Number(approved) || 0) + Math.max(0, Number(failed) || 0);
  const approvedPercent = total ? Math.round((approved / total) * 100) : 0;

  return (
    <article className="teacher-pro-chart teacher-pro-donut-card">
      <div className="record-panel-head"><span>Gráfica</span><h3>{title}</h3></div>
      {total ? (
        <div className="teacher-pro-donut-layout">
          <div className="teacher-pro-donut" style={{ "--approved": `${approvedPercent}%` }}>
            <strong>{total}</strong>
            <span>Total</span>
          </div>
          <div className="teacher-pro-donut-legend">
            <p><i className="ok" /> Aprobados <strong>{approved}</strong></p>
            <p><i className="bad" /> Reprobados <strong>{failed}</strong></p>
          </div>
        </div>
      ) : (
        <div className="teacher-pro-chart-empty">
          <Award size={28} strokeWidth={1.8} aria-hidden="true" />
          <strong>Sin datos de aprobación aún</strong>
          <span>El resumen se mostrará cuando existan notas registradas.</span>
        </div>
      )}
      <button type="button" className="teacher-chart-action">Ver detalle</button>
    </article>
  );
}

function statusClass(value = "") {
  return String(value || "").toLowerCase().replace(/\s+/g, "-");
}

export default function DocenteDashboard({
  session,
  profile,
  onLogout,
  onAvatarUpdated,
  onOpenInicio,
  onOpenEspecializaciones,
  onOpenPanelDocente,
  onOpenEvaluaciones,
  onOpenAsistencia,
  onOpenCronograma,
  onOpenMensajes,
  onOpenReportes,
  onOpenContenido,
  onOpenRecursos,
  onOpenTareas,
  proMode = false,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [selectedEspecialidadId, setSelectedEspecialidadId] = useState("");
  const [resourceQuery, setResourceQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);

  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Docente Campus UCI";

  const menuItems = [
    { label: "Inicio", onClick: onOpenInicio },
    { label: "Panel Docente", onClick: onOpenPanelDocente },
    { label: "Especializaciones", onClick: onOpenEspecializaciones },
    { label: "Materiales", onClick: onOpenContenido },
    { label: "Calendario", onClick: onOpenCronograma },
    { label: "Asistencia", onClick: onOpenAsistencia },
    { label: "Evaluaciones", onClick: onOpenEvaluaciones },
    { label: "Tareas", onClick: onOpenTareas },
    { label: "Recursos", onClick: onOpenRecursos },
    { label: "Reportes", onClick: onOpenReportes },
    { label: "Mensajes", onClick: onOpenMensajes },
    { label: "Documentos", onClick: () => document.getElementById("docente-entregas")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Biblioteca", onClick: () => document.getElementById("docente-entregas")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Configuración" },
  ];

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const result = await getDocenteDashboard(profile);
      setData(result);
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando dashboard docente:", loadError);
      setError(loadError.message || "No se pudo cargar el dashboard docente.");
    } finally {
      setLoading(false);
    }
  }

  async function quickReview(entrega, estado) {
    setSavingId(entrega.id);
    setError("");

    try {
      await reviewEntrega(entrega.id, {
        estado,
        nota: entrega.nota ?? "",
        retroalimentacion: estado === "aprobada" ? "Entrega aprobada por docente." : "Requiere correcciones.",
      });
      await loadDashboard();
    } catch (reviewError) {
      console.error("[Campus UCI] Error revisando entrega:", reviewError);
      setError(reviewError.message || "No se pudo revisar la entrega.");
    } finally {
      setSavingId(null);
    }
  }

  const stats = data?.stats || {};
  const firstName = displayName.split(" ")[0] || displayName;
  const specialtyScope = data?.especialidadesPermitidas || [];
  const specialtyScopeName = specialtyScope.length > 1
    ? `${specialtyScope.length} especialidades asignadas`
    : specialtyScope[0]?.nombre || "Sin especialidad asignada";
  const specialtyScopeDetail = specialtyScope.length
    ? specialtyScope.map((item) => item.nombre).join(" · ")
    : "Solicitá asignación académica para ver métricas del panel.";
  const accessCards = [
    { title: "Asistencia", description: "Registrar asistencia por clase y recurso.", icon: CalendarDays, action: onOpenAsistencia },
    { title: "Evaluaciones", description: "Crear evaluaciones y registrar notas.", icon: Star, action: onOpenEvaluaciones },
    { title: "+ Nueva tarea", description: "Crear tareas visibles para recursos.", icon: Plus, action: onOpenTareas },
    { title: "Entregas", description: "Revisar evidencias pendientes.", icon: FileCheck2, action: () => document.getElementById("docente-entregas")?.scrollIntoView({ behavior: "smooth" }) },
    { title: "Contenido Académico", description: "Gestionar asignaturas, semanas, materiales y avisos.", icon: BookOpenCheck, action: onOpenContenido },
    { title: "Cronograma", description: "Consultar clases y agenda académica.", icon: ClipboardList, action: onOpenCronograma },
    { title: "Recursos asignados", description: "Consultar recursos por especialidad y progreso.", icon: UsersRound, action: onOpenRecursos },
    { title: "Reportes Académicos", description: "Analizar ranking, progreso y alertas.", icon: BarChart3, action: onOpenReportes },
  ];
  const recentActivity = [
    { title: "Próximas clases", detail: `${stats.proximasClases || 0} programadas`, tone: "blue", icon: CalendarDays },
    { title: "Entregas pendientes", detail: `${stats.pendientesRevision || 0} por revisar`, tone: "green", icon: FileCheck2 },
    { title: "Evaluaciones recientes", detail: `${stats.evaluaciones || 0} registros`, tone: "purple", icon: BookOpenCheck },
  ];
  function renderQuickPanelContent() {
    return (
      <div className="teacher-drawer-stack">
        <section className="side-block right-card">
          <div className="side-block-head">
            <h3><CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" /> Próximas clases</h3>
            <span>{data?.clases?.length || 0}</span>
          </div>
          <div className="event-list">
            {(data?.clases || []).slice(0, 4).map((clase) => (
              <article key={clase.id}>
                <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <strong>{clase.titulo || "Clase"}</strong>
                  <small>{formatDate(clase.fecha)} · {clase.hora_inicio || "Sin hora"}</small>
                </div>
              </article>
            ))}
            {!(data?.clases || []).length ? <div className="cu-empty">Sin clases próximas.</div> : null}
          </div>
        </section>

        <section className="side-block right-card">
          <div className="side-block-head">
            <h3><Star size={22} strokeWidth={1.8} aria-hidden="true" /> Acciones rápidas</h3>
            <span>PRO</span>
          </div>
          <div className="quick-actions-grid">
            <button type="button" className="quick-action" onClick={onOpenAsistencia}><span className="quick-icon green"><CalendarDays size={20} /></span><strong>Asistencia</strong><small>Marcar clase</small></button>
            <button type="button" className="quick-action" onClick={onOpenEvaluaciones}><span className="quick-icon purple"><BookOpenCheck size={20} /></span><strong>Notas</strong><small>Registrar nota</small></button>
            <button type="button" className="quick-action" onClick={onOpenTareas}><span className="quick-icon blue"><Plus size={20} /></span><strong>Tareas</strong><small>Nueva tarea</small></button>
            <button type="button" className="quick-action" onClick={onOpenContenido}><span className="quick-icon orange"><ClipboardList size={20} /></span><strong>Material</strong><small>Publicar</small></button>
          </div>
        </section>

        <section className="side-block right-card">
          <div className="side-block-head">
            <h3><Video size={22} strokeWidth={1.8} aria-hidden="true" /> Clases grabadas</h3>
            <span>{data?.clasesGrabadas?.length || 0}</span>
          </div>
          <div className="teacher-video-list">
            {(data?.clasesGrabadas || []).slice(0, 4).map((clase) => (
              <a key={clase.id} href={clase.enlace_virtual} target="_blank" rel="noreferrer">
                <span><Video size={20} /></span>
                <div>
                  <strong>{clase.titulo || "Clase grabada"}</strong>
                  <small>{clase.duracion} · {clase.tipo_video}</small>
                </div>
              </a>
            ))}
            {!(data?.clasesGrabadas || []).length ? <div className="cu-empty">Sin enlaces publicados.</div> : null}
          </div>
        </section>

        <section className="side-block right-card">
          <div className="side-block-head">
            <h3><MessageSquare size={22} strokeWidth={1.8} aria-hidden="true" /> Notificaciones</h3>
            <span>{stats.pendientesRevision || 0}</span>
          </div>
          <article className="side-notice">
            <strong>{stats.pendientesRevision ? "Entregas por revisar" : "Sin alertas pendientes"}</strong>
            <p>{stats.pendientesRevision ? `${stats.pendientesRevision} entregas esperan revisión docente.` : "No hay notificaciones críticas en tus especialidades."}</p>
          </article>
        </section>

        <section className="side-block right-card">
          <div className="side-block-head">
            <h3><MessageSquare size={22} strokeWidth={1.8} aria-hidden="true" /> Mensajes / avisos</h3>
            <span>0</span>
          </div>
          <article className="side-notice">
            <strong>Sin mensajes nuevos</strong>
            <p>Los mensajes académicos se mostrarán aquí cuando existan comunicaciones registradas.</p>
          </article>
        </section>
      </div>
    );
  }
  const filteredResources = useMemo(() => {
    const term = resourceQuery.trim().toLowerCase();
    return (data?.recursos || []).filter((recurso) => {
      const matchesEspecialidad = !selectedEspecialidadId || recurso.especialidad_id === selectedEspecialidadId;
      const matchesTerm = !term || [recurso.nombre, recurso.correo, recurso.cum, recurso.especialidad_nombre]
        .some((value) => String(value || "").toLowerCase().includes(term));
      return matchesEspecialidad && matchesTerm;
    });
  }, [data?.recursos, resourceQuery, selectedEspecialidadId]);
  const filteredCharts = useMemo(() => {
    const resourceIds = new Set(filteredResources.map((item) => item.profile_id || item.id));
    const scopedResources = filteredResources.length || selectedEspecialidadId ? filteredResources : (data?.recursos || []);
    const notas = (data?.notas || []).filter((nota) => !resourceIds.size || resourceIds.has(nota.recurso_id));
    const asistencia = (data?.asistencia || []).filter((row) => !resourceIds.size || resourceIds.has(row.profile_id));
    const clases = (data?.todasClases || []).filter((clase) => !selectedEspecialidadId || clase.especialidad_id === selectedEspecialidadId);
    const monthly = new Map();

    notas.forEach((nota) => {
      const key = String(nota.created_at || "").slice(0, 7) || "Sin fecha";
      const current = monthly.get(key) || [];
      current.push(Number(nota.nota));
      monthly.set(key, current);
    });

    const aprobados = scopedResources.filter((item) => Number(item.promedio) >= 7).length;
    const reprobados = scopedResources.filter((item) => item.promedio !== null && Number(item.promedio) < 7).length;
    const realizadas = clases.filter((clase) => ["realizada", "finalizada"].includes(String(clase.estado || "").toLowerCase())).length;
    const canceladas = clases.filter((clase) => String(clase.estado || "").toLowerCase() === "cancelada").length;

    return {
      asistenciaPorRecurso: scopedResources.map((item) => ({ label: item.nombre || "Recurso", value: item.asistenciaPorcentaje || 0 })),
      promedioPorRecurso: scopedResources.map((item) => ({ label: item.nombre || "Recurso", value: item.promedio ?? 0 })),
      evolucionMensual: [...monthly.entries()].map(([label, values]) => ({
        label,
        value: values.length ? Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2)) : 0,
      })),
      aprobadosReprobados: [
        { label: "Aprobados", value: aprobados },
        { label: "Reprobados", value: reprobados },
      ],
      cumplimientoClases: [
        { label: "Realizadas", value: realizadas },
        { label: "Programadas", value: Math.max(0, clases.length - realizadas - canceladas) },
        { label: "Canceladas", value: canceladas },
      ],
      distribucionEspecialidad: selectedEspecialidadId
        ? []
        : (data?.charts?.distribucionEspecialidad || []),
      asistenciaTotal: asistencia.length,
    };
  }, [data, filteredResources, selectedEspecialidadId]);

  function isInAllowedScope(especialidadId) {
    if (!especialidadId) return false;
    if (!specialtyScope.length) return false;
    return specialtyScope.some((item) => item.id === especialidadId);
  }

  function openResource(resource) {
    setSelectedResource(resource);
    setEditingNote(null);
    setEditingAttendance(null);
  }

  async function saveNoteEdit(event) {
    event.preventDefault();
    if (!editingNote) return;
    if (!isInAllowedScope(editingNote.especialidad_id)) {
      setError("No podés editar notas fuera de tus especialidades asignadas.");
      return;
    }

    setSavingId(editingNote.id);
    setError("");
    try {
      await updateNotaDocente({
        id: editingNote.id,
        especialidadId: editingNote.especialidad_id,
        form: editingNote,
        profile,
      });
      setEditingNote(null);
      await loadDashboard();
    } catch (saveError) {
      console.error("[Campus UCI] Error editando nota docente:", saveError);
      setError(saveError.message || "No se pudo editar la nota.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveAttendanceEdit(event) {
    event.preventDefault();
    if (!editingAttendance) return;
    const clase = data?.todasClases?.find((item) => item.id === editingAttendance.clase_id);
    if (!isInAllowedScope(clase?.especialidad_id)) {
      setError("No podés editar asistencia fuera de tus especialidades asignadas.");
      return;
    }

    setSavingId(editingAttendance.id);
    setError("");
    try {
      await updateAsistenciaDocente({
        id: editingAttendance.id,
        claseId: editingAttendance.clase_id,
        estado: editingAttendance.estado,
        comentario: editingAttendance.comentario,
        profile,
      });
      setEditingAttendance(null);
      await loadDashboard();
    } catch (saveError) {
      console.error("[Campus UCI] Error editando asistencia docente:", saveError);
      setError(saveError.message || "No se pudo editar la asistencia.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <CampusLayout
      userName={displayName}
      userRole="Docente"
      userMeta={profile?.cum || profile?.servicio || "Campus UCI"}
      user={session?.user}
      profile={profile}
      menuItems={menuItems}
      activeItem={proMode ? "Panel Docente" : "Inicio"}
      onLogout={onLogout}
      onAvatarUpdated={onAvatarUpdated}
      layoutVariant={proMode ? "teacher-pro-layout" : ""}
    >
      <div className={proMode ? "teacher-dashboard-page teacher-pro-page" : "teacher-dashboard-page"}>
        {proMode ? (
          <header className="teacher-pro-topbar">
            <div className="teacher-pro-title-area">
              <button type="button" className="teacher-pro-menu-button" aria-label="Menú docente">
                <span />
                <span />
                <span />
              </button>
              <div>
                <h1>Panel Docente</h1>
                <p>{specialtyScopeDetail}</p>
              </div>
            </div>

            <label className="teacher-pro-search">
              <Search size={18} strokeWidth={2} aria-hidden="true" />
              <input
                value={resourceQuery}
                onChange={(event) => setResourceQuery(event.target.value)}
                placeholder="Buscar recurso, clase, evaluación..."
              />
            </label>

            <div className="teacher-pro-date">
              <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
              <span>12 may. 2025 - 15 may. 2025</span>
            </div>

            <button type="button" className="teacher-pro-export" onClick={() => window.print()}>
              <Download size={16} strokeWidth={2} aria-hidden="true" />
              Exportar reporte
            </button>

            <div className="teacher-pro-user">
              <AvatarUpload user={session?.user} profile={profile} name={displayName} size="sm" editable={false} onAvatarUpdated={onAvatarUpdated} />
              <div>
                <strong>{displayName}</strong>
                <span>{profile?.rol || "Docente"}</span>
              </div>
            </div>
          </header>
        ) : (
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
            <AvatarUpload user={session?.user} profile={profile} name={displayName} size="lg" onAvatarUpdated={onAvatarUpdated} />
          </div>

          <div className="hero-content">
            <div className="hero-text">
              <h2 className="hero-title">{proMode ? "Panel Docente" : `Bienvenido nuevamente, ${firstName}`}</h2>
              <p className="hero-subtitle">
                {proMode
                  ? `Dashboard académico de ${displayName} para seguimiento, análisis y edición controlada por especialidad.`
                  : "Panel académico docente para asistencia, evaluaciones, entregas y seguimiento de formación UCI."}
              </p>
              <div className="hero-specialty-row hero-meta">
                <span className="hero-badge hero-specialty-label">Rol docente</span>
                <strong className="hero-specialty-name" title={specialtyScopeDetail}>{specialtyScopeName}</strong>
              </div>
              <div className="hero-progress-line" aria-label="Actividad docente">
                <span style={{ width: `${Math.min(100, (stats.evaluaciones || 0) * 10)}%` }} />
              </div>
              <div className="hero-actions">
                <button type="button" onClick={onOpenCronograma}>Ver cronograma</button>
                <button type="button" onClick={onOpenEvaluaciones}>Mis evaluaciones</button>
              </div>
            </div>
          </div>

          <div className="progress-area">
            <div className="progress-ring-box">
              <ProgressRing value={Math.min(100, (stats.evaluaciones || 0) * 10)} />
            </div>
          </div>
        </motion.header>
        )}

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}
        {!loading && !specialtyScope.length ? (
          <div className="cu-alert">No tenés especialidades asignadas. El panel docente no mostrará clases, tareas, entregas ni notas hasta que administración te asigne una especialidad.</div>
        ) : null}
        {loading ? <div className="cu-empty">Cargando panel docente...</div> : null}

        {proMode ? (
          <>
            <section className="teacher-pro-filter-block">
              <div className="teacher-pro-filter-label">
                <strong>Filtrar por especialidad</strong>
                <span>{selectedEspecialidadId ? specialtyScope.find((item) => item.id === selectedEspecialidadId)?.nombre : "Todas"}</span>
              </div>
              <div className="teacher-pro-pills" aria-label="Filtro rápido por especialidad">
                <button type="button" className={!selectedEspecialidadId ? "active" : ""} onClick={() => setSelectedEspecialidadId("")}>Todas</button>
                {specialtyScope.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={selectedEspecialidadId === item.id ? "active" : ""}
                    onClick={() => setSelectedEspecialidadId(item.id)}
                  >
                    {item.nombre}
                  </button>
                ))}
              </div>
            </section>

          <section className="stats-grid teacher-pro-kpis">
            <article className="stat-card">
              <span className="stat-icon blue"><UsersRound size={23} strokeWidth={1.9} /></span>
              <div><small>Recursos asignados</small><strong>{stats.recursos || 0}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon purple"><Award size={23} strokeWidth={1.9} /></span>
              <div><small>Promedio general</small><strong>{stats.promedioGeneral ?? "--"}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon green"><FileCheck2 size={23} strokeWidth={1.9} /></span>
              <div><small>Asistencia promedio</small><strong>{Math.round(stats.asistenciaGeneral || 0)}%</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon orange"><BarChart3 size={23} strokeWidth={1.9} /></span>
              <div><small>Riesgo académico</small><strong>{stats.riesgo || 0}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon blue"><CalendarDays size={23} strokeWidth={1.9} /></span>
              <div><small>Clases programadas</small><strong>{stats.clasesProgramadas || 0}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon green"><ClipboardList size={23} strokeWidth={1.9} /></span>
              <div><small>Tareas pendientes</small><strong>{stats.tareasPendientes || 0}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon purple"><FileCheck2 size={23} strokeWidth={1.9} /></span>
              <div><small>Evaluaciones pendientes</small><strong>{stats.pendientesRevision || 0}</strong></div>
            </article>
          </section>
          </>
        ) : (
          <section className="stats-grid">
            <article className="stat-card">
              <span className="stat-icon blue"><CalendarDays size={23} strokeWidth={1.9} /></span>
              <div><small>Próximas clases</small><strong>{stats.proximasClases || 0}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon green"><ClipboardList size={23} strokeWidth={1.9} /></span>
              <div><small>Tareas creadas</small><strong>{stats.tareas || 0}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon purple"><FileCheck2 size={23} strokeWidth={1.9} /></span>
              <div><small>Por revisar</small><strong>{stats.pendientesRevision || 0}</strong></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon orange"><Award size={23} strokeWidth={1.9} /></span>
              <div><small>Evaluaciones</small><strong>{stats.evaluaciones || 0}</strong></div>
            </article>
          </section>
        )}

        {!proMode ? (
          <section className="dashboard-access-card">
            <div className="dashboard-section-head">
              <span>Campus docente</span>
              <h3>Accesos principales</h3>
            </div>
            <div className="cu-portal-card-grid access-grid" aria-label="Accesos docentes">
              {accessCards.map((card) => {
                const AccessIcon = card.icon;
                return (
                  <motion.button
                    type="button"
                    className="cu-portal-card access-card"
                    key={card.title}
                    onClick={card.action}
                    whileHover={{ y: -4, scale: 1.015 }}
                  >
                    <span className="cu-portal-card-icon"><AccessIcon size={38} strokeWidth={1.8} aria-hidden="true" /></span>
                    <strong>{card.title}</strong>
                    <span>{card.description}</span>
                    <i className="cu-portal-card-arrow" aria-hidden="true"><ArrowRight size={16} strokeWidth={2.1} /></i>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ) : null}

        {proMode ? (
          <>
            <section className="teacher-pro-workspace">
              <div className="teacher-pro-main-column">
                <section className="teacher-pro-charts">
                  <MiniBarChart title="Asistencia por recurso" items={filteredCharts.asistenciaPorRecurso} suffix="%" max={100} />
                  <MiniBarChart title="Promedio de notas por recurso" items={filteredCharts.promedioPorRecurso} max={10} />
                  <DonutChart
                    title="Aprobados vs Reprobados"
                    approved={filteredCharts.aprobadosReprobados?.[0]?.value || 0}
                    failed={filteredCharts.aprobadosReprobados?.[1]?.value || 0}
                  />
                  <MiniBarChart title="Evolución mensual de notas" items={filteredCharts.evolucionMensual} max={10} />
                  <MiniBarChart title="Cumplimiento de clases" items={filteredCharts.cumplimientoClases} max={Math.max(1, data?.todasClases?.length || 0)} />
                  <MiniBarChart title="Distribución por especialidad" items={filteredCharts.distribucionEspecialidad} max={Math.max(1, stats.recursos || 0)} />
                </section>

                <section className="teacher-panel teacher-pro-resources">
                  <div className="record-panel-head wide">
                    <span>Recursos</span>
                    <h3>Recursos académicos asignados</h3>
                  </div>
                  {filteredResources.length ? (
                    <div className="academic-table-wrap">
                      <table className="academic-table">
                        <thead>
                          <tr>
                            <th>Recurso</th>
                            <th>Especialidad</th>
                            <th>CUM</th>
                            <th>Asistencia</th>
                            <th>Promedio notas</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResources.map((resource) => (
                            <tr key={resource.profile_id || resource.id}>
                              <td><strong>{resource.nombre || "Sin nombre"}</strong><span>{resource.correo || "Sin correo"}</span></td>
                              <td>{resource.especialidad_nombre || "Sin especialidad"}</td>
                              <td>{resource.cum || "Sin CUM"}</td>
                              <td>{resource.asistenciaPorcentaje || 0}%</td>
                              <td>{resource.promedio ?? "Sin datos"}</td>
                              <td><span className={`teacher-status ${statusClass(resource.estadoAcademico)}`}>{resource.estadoAcademico}</span></td>
                              <td>
                                <div className="academic-row-actions">
                                  <button type="button" onClick={() => openResource(resource)} aria-label={`Ver expediente de ${resource.nombre || "recurso"}`} title="Ver expediente">
                                    <Eye size={16} strokeWidth={2} aria-hidden="true" />
                                  </button>
                                  <button type="button" onClick={() => openResource(resource)} disabled={!isInAllowedScope(resource.especialidad_id)} aria-label={`Editar ${resource.nombre || "recurso"}`} title="Editar">
                                    <Edit3 size={16} strokeWidth={2} aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="cu-empty">No hay recursos que coincidan con el filtro actual.</div>
                  )}
                </section>
              </div>

            </section>
          </>
        ) : null}

        {proMode ? (
          <button
            type="button"
            className="teacher-floating-tab"
            onClick={() => setQuickPanelOpen((current) => !current)}
            aria-label="Abrir panel académico"
            aria-expanded={quickPanelOpen}
          >
            <Bell size={18} strokeWidth={2} aria-hidden="true" />
            <span>Panel rápido</span>
            {(stats.pendientesRevision || data?.clases?.length || data?.clasesGrabadas?.length) ? (
              <i>{Math.min(9, (stats.pendientesRevision || 0) + (data?.clases?.length || 0) + (data?.clasesGrabadas?.length || 0))}</i>
            ) : null}
          </button>
        ) : null}

        {proMode && quickPanelOpen ? (
          <div className="teacher-drawer-backdrop teacher-left-drawer-backdrop" role="presentation" onClick={() => setQuickPanelOpen(false)}>
            <aside className="teacher-drawer teacher-left-drawer" role="dialog" aria-modal="true" aria-label="Panel rápido docente" onClick={(event) => event.stopPropagation()}>
              <div className="teacher-drawer-head">
                <div>
                  <span>Panel académico</span>
                  <h3>Panel rápido</h3>
                </div>
                <button type="button" onClick={() => setQuickPanelOpen(false)} aria-label="Cerrar panel">
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
              {renderQuickPanelContent()}
            </aside>
          </div>
        ) : null}

        {!proMode ? <section className="lower-grid">
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
                    <span className={`activity-icon ${item.tone}`}><ActivityIcon size={19} strokeWidth={1.9} aria-hidden="true" /></span>
                    <div><strong>{item.title}</strong><small>{item.detail}</small></div>
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
              <button type="button" className="quick-action" onClick={onOpenAsistencia}><span className="quick-icon green"><CalendarDays size={21} /></span><strong>Asistencia</strong><small>Marcar clase</small></button>
              <button type="button" className="quick-action" onClick={onOpenEvaluaciones}><span className="quick-icon purple"><BookOpenCheck size={21} /></span><strong>Evaluaciones</strong><small>Registrar nota</small></button>
              <button type="button" className="quick-action" onClick={onOpenReportes}><span className="quick-icon orange"><BarChart3 size={21} /></span><strong>Reportes</strong><small>Ver avances</small></button>
              <button type="button" className="quick-action" onClick={onOpenMensajes}><span className="quick-icon blue"><MessageSquare size={21} /></span><strong>Mensajes</strong><small>Comunicación</small></button>
            </div>
          </article>
        </section> : null}

        {!proMode ? <section className="teacher-grid">
          <article className="teacher-panel" id="docente-clases">
            <div className="student-panel-head">
              <span>Agenda</span>
              <h3>Próximas clases</h3>
            </div>
            {data?.clases?.length ? (
              <div className="student-list">
                {data.clases.slice(0, 6).map((clase) => (
                  <article key={clase.id}>
                    <strong>{clase.titulo}</strong>
                    <small>{formatDate(clase.fecha)} · {clase.hora_inicio} - {clase.hora_fin}</small>
                    <p>{clase.docente || "Docente asignado"}</p>
                  </article>
                ))}
              </div>
            ) : <div className="cu-empty">Sin clases próximas.</div>}
          </article>

          <article className="teacher-panel">
            <div className="student-panel-head">
              <span>Tareas</span>
              <h3>Tareas creadas</h3>
            </div>
            {data?.tareas?.length ? (
              <div className="student-list">
                {data.tareas.slice(0, 6).map((tarea) => (
                  <article key={tarea.id}>
                    <strong>{tarea.titulo}</strong>
                    <small>Límite: {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</small>
                    <p>{tarea.estado || "abierta"}</p>
                  </article>
                ))}
              </div>
            ) : <div className="cu-empty">Sin tareas registradas.</div>}
          </article>

          <article className="teacher-panel" id="docente-entregas">
            <div className="student-panel-head">
              <span>Revisión</span>
              <h3>Entregas pendientes</h3>
            </div>
            {data?.entregasPendientes?.length ? (
              <div className="student-list">
                {data.entregasPendientes.slice(0, 6).map((entrega) => (
                  <article key={entrega.id}>
                    <strong>{entrega.profiles?.nombre || entrega.profile_id || "Recurso"}</strong>
                    <small>{entrega.archivo_nombre || "Evidencia enviada"}</small>
                    <p>{entrega.comentario || "Sin comentario."}</p>
                    <div className="academic-row-actions">
                      <button type="button" onClick={() => quickReview(entrega, "aprobada")} disabled={savingId === entrega.id}>
                        Aprobar
                      </button>
                      <button type="button" className="danger" onClick={() => quickReview(entrega, "rechazada")} disabled={savingId === entrega.id}>
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="cu-empty">Sin entregas pendientes.</div>}
          </article>

          <article className="teacher-panel">
            <div className="student-panel-head">
              <span>Notas</span>
              <h3>Evaluaciones recientes</h3>
            </div>
            {data?.notasRecientes?.length ? (
              <div className="student-list compact">
                {data.notasRecientes.map((nota) => (
                  <article key={nota.id}>
                    <strong>{nota.actividad || "Evaluación"}</strong>
                    <small>{nota.area || "Área académica"}</small>
                    <p>Nota: {nota.nota ?? "Sin nota"} · {nota.estado || "Sin estado"}</p>
                  </article>
                ))}
              </div>
            ) : <div className="cu-empty">Sin evaluaciones recientes.</div>}
          </article>

        </section> : null}

        {proMode && selectedResource ? (
          <div className="resources-modal-backdrop" role="presentation">
            <section className="resources-modal teacher-resource-modal" role="dialog" aria-modal="true" aria-label="Expediente docente">
              <div className="resources-modal-head">
                <div>
                  <span>Expediente docente</span>
                  <h3>{selectedResource.nombre || "Recurso académico"}</h3>
                </div>
                <button type="button" onClick={() => setSelectedResource(null)} aria-label="Cerrar expediente">
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="teacher-resource-summary">
                <article><small>Especialidad</small><strong>{selectedResource.especialidad_nombre || "Sin especialidad"}</strong></article>
                <article><small>CUM</small><strong>{selectedResource.cum || "Sin CUM"}</strong></article>
                <article><small>Asistencia</small><strong>{selectedResource.asistenciaPorcentaje || 0}%</strong></article>
                <article><small>Promedio</small><strong>{selectedResource.promedio ?? "Sin datos"}</strong></article>
                <article><small>Estado</small><strong>{selectedResource.estadoAcademico}</strong></article>
              </div>

              <div className="teacher-resource-grid">
                <article className="record-panel">
                  <div className="record-panel-head"><span>Datos generales</span><h3>Perfil</h3></div>
                  <div className="record-list">
                    <article><strong>Correo</strong><small>{selectedResource.correo || "Sin correo"}</small></article>
                    <article><strong>Servicio / área</strong><small>{selectedResource.servicio || selectedResource.area || "Sin servicio"}</small></article>
                    <article><strong>Progreso</strong><small>{selectedResource.progreso || 0}%</small></article>
                  </div>
                </article>

                <article className="record-panel">
                  <div className="record-panel-head"><span>Evaluaciones</span><h3>Notas</h3></div>
                  {selectedResource.notas?.length ? (
                    <div className="record-list">
                      {selectedResource.notas.map((nota) => (
                        <article key={nota.id}>
                          <div>
                            <strong>{nota.actividad || "Evaluación"}</strong>
                            <small>{nota.area || "Área"} · Nota {nota.nota ?? "Sin nota"} · {nota.estado || "Sin estado"}</small>
                            <p>{nota.observaciones || "Sin observaciones docentes."}</p>
                          </div>
                          {isInAllowedScope(nota.especialidad_id) ? (
                            <button type="button" className="academic-secondary-action" onClick={() => setEditingNote({ ...nota })}>
                              <Edit3 size={14} strokeWidth={2} /> Editar
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : <div className="cu-empty">Sin notas registradas.</div>}
                </article>

                <article className="record-panel">
                  <div className="record-panel-head"><span>Asistencia</span><h3>Historial</h3></div>
                  {selectedResource.asistencia?.length ? (
                    <div className="record-list">
                      {selectedResource.asistencia.map((row) => {
                        const clase = data?.todasClases?.find((item) => item.id === row.clase_id) || row.clase;
                        return (
                          <article key={row.id}>
                            <div>
                              <strong>{clase?.titulo || "Clase"}</strong>
                              <small>{formatDate(clase?.fecha)} · {row.estado}</small>
                              <p>{row.comentario || "Sin observación."}</p>
                            </div>
                            {isInAllowedScope(clase?.especialidad_id) ? (
                              <button type="button" className="academic-secondary-action" onClick={() => setEditingAttendance({ ...row })}>
                                <Edit3 size={14} strokeWidth={2} /> Editar
                              </button>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : <div className="cu-empty">Sin asistencia registrada.</div>}
                </article>

                <article className="record-panel">
                  <div className="record-panel-head"><span>Tareas</span><h3>Actividades</h3></div>
                  {selectedResource.tareas?.length ? (
                    <div className="record-list">
                      {selectedResource.tareas.map((tarea) => (
                        <article key={tarea.id}>
                          <strong>{tarea.titulo}</strong>
                          <small>Límite {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</small>
                        </article>
                      ))}
                    </div>
                  ) : <div className="cu-empty">Sin tareas asignadas.</div>}
                </article>
              </div>

              {editingNote ? (
                <form className="teacher-inline-editor" onSubmit={saveNoteEdit}>
                  <div className="record-panel-head"><span>Edición controlada</span><h3>Editar nota</h3></div>
                  <input value={editingNote.area || ""} onChange={(event) => setEditingNote((prev) => ({ ...prev, area: event.target.value }))} placeholder="Área" />
                  <input value={editingNote.actividad || ""} onChange={(event) => setEditingNote((prev) => ({ ...prev, actividad: event.target.value }))} placeholder="Evaluación" />
                  <input type="number" min="0" max="10" step="0.01" value={editingNote.nota ?? ""} onChange={(event) => setEditingNote((prev) => ({ ...prev, nota: event.target.value }))} placeholder="Nota" />
                  <textarea rows={3} value={editingNote.observaciones || ""} onChange={(event) => setEditingNote((prev) => ({ ...prev, observaciones: event.target.value }))} placeholder="Observaciones docentes" />
                  <div className="academic-row-actions">
                    <button type="submit" disabled={savingId === editingNote.id}><Save size={14} /> Guardar nota</button>
                    <button type="button" onClick={() => setEditingNote(null)}>Cancelar</button>
                  </div>
                </form>
              ) : null}

              {editingAttendance ? (
                <form className="teacher-inline-editor" onSubmit={saveAttendanceEdit}>
                  <div className="record-panel-head"><span>Edición controlada</span><h3>Editar asistencia</h3></div>
                  <select value={editingAttendance.estado || "ausente"} onChange={(event) => setEditingAttendance((prev) => ({ ...prev, estado: event.target.value }))}>
                    <option value="asistio">Asistió</option>
                    <option value="tardia">Tardía</option>
                    <option value="ausente">Ausente</option>
                    <option value="justificada">Justificada</option>
                  </select>
                  <textarea rows={3} value={editingAttendance.comentario || ""} onChange={(event) => setEditingAttendance((prev) => ({ ...prev, comentario: event.target.value }))} placeholder="Comentario" />
                  <div className="academic-row-actions">
                    <button type="submit" disabled={savingId === editingAttendance.id}><Save size={14} /> Guardar asistencia</button>
                    <button type="button" onClick={() => setEditingAttendance(null)}>Cancelar</button>
                  </div>
                </form>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </CampusLayout>
  );
}
