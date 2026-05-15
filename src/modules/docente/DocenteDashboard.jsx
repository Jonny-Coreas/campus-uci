import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  MessageSquare,
  Plus,
  Star,
  UsersRound,
} from "lucide-react";
import { motion } from "framer-motion";
import CampusLayout from "../../components/campus/CampusLayout";
import AvatarUpload from "../../components/campus/AvatarUpload";
import icuHero from "../../assets/icu-hero.png";
import { getDocenteDashboard, reviewEntrega } from "../../services/docenteService";

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

export default function DocenteDashboard({
  session,
  profile,
  onLogout,
  onAvatarUpdated,
  onOpenEspecializaciones,
  onOpenEvaluaciones,
  onOpenAsistencia,
  onOpenCronograma,
  onOpenMensajes,
  onOpenReportes,
  onOpenContenido,
  onOpenRecursos,
  onOpenTareas,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Docente Campus UCI";

  const menuItems = [
    { label: "Inicio" },
    { label: "Panel Docente" },
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

  return (
    <CampusLayout
      userName={displayName}
      userRole="Docente"
      userMeta={profile?.cum || profile?.servicio || "Campus UCI"}
      user={session?.user}
      profile={profile}
      menuItems={menuItems}
      activeItem="Panel Docente"
      onLogout={onLogout}
      onAvatarUpdated={onAvatarUpdated}
    >
      <div className="teacher-dashboard-page">
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
              <h2 className="hero-title">Bienvenido nuevamente, {firstName}</h2>
              <p className="hero-subtitle">Panel académico docente para asistencia, evaluaciones, entregas y seguimiento de formación UCI.</p>
              <div className="hero-specialty-row hero-meta">
                <span className="hero-badge hero-specialty-label">Rol docente</span>
                <strong className="hero-specialty-name">{profile?.servicio || "Campus Académico UCI"}</strong>
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

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}
        {loading ? <div className="cu-empty">Cargando panel docente...</div> : null}

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
        </section>

        <section className="teacher-grid">
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
        </section>
      </div>
    </CampusLayout>
  );
}
