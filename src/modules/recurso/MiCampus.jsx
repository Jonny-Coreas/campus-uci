import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  X,
  CheckCircle2,
  Clock,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  PlaySquare,
  ShieldCheck,
  UploadCloud,
  UserRoundPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import CampusLayout from "../../components/campus/CampusLayout";
import AvatarUpload from "../../components/campus/AvatarUpload";
import icuHero from "../../assets/icu-hero.png";
import { getMiCampusData } from "../../services/recursoCampusService";
import { parseTaskInstructions } from "../../utils/taskMetadata";
import { isSeen, markSeen } from "../../utils/resourceSeen";

function firstName(name = "Usuario") {
  return String(name || "Usuario").trim().split(/\s+/)[0] || "Usuario";
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function isToday(value) {
  if (!value) return false;
  return String(value).slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function isDueSoon(value, days = 7) {
  if (!value) return false;
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const limit = new Date(current);
  limit.setDate(limit.getDate() + days);
  const due = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return due >= current && due <= limit;
}

function ProgressCircle({ value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="cu-premium-progress-ring" aria-label={`Progreso académico ${safeValue}%`}>
      <svg viewBox="0 0 112 112" aria-hidden="true">
        <circle cx="56" cy="56" r={radius} className="track" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          className="value"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong>{safeValue}%</strong>
      <span>avance</span>
    </div>
  );
}

export default function MiCampus({
  session,
  profile,
  onLogout,
  onAvatarUpdated,
  onOpenEspecializaciones,
  onOpenEntregaTarea,
  onOpenAsistencia,
  onOpenCronograma,
  onOpenMensajes,
  onOpenExpediente,
  onOpenAsignaturas,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailItem, setDetailItem] = useState(null);
  const [, setSeenVersion] = useState(0);

  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Usuario Campus UCI";

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getMiCampusData({ profile, session });
        if (alive) setData(result);
      } catch (loadError) {
        console.error("[Campus UCI] Error cargando Mi Campus:", loadError);
        if (alive) setError(loadError.message || "No se pudo cargar Mi Campus.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [profile, session]);

  const tareasConEntrega = useMemo(() => {
    const entregasByTarea = data?.entregasByTarea || new Map();
    return (data?.tareas || []).map((tarea) => ({
      ...tarea,
      entrega: entregasByTarea.get(tarea.id) || null,
    }));
  }, [data]);

  const pendingTask = tareasConEntrega.find((tarea) => !tarea.entrega) || tareasConEntrega[0] || null;
  const stats = data?.stats || {};
  const novedades = data?.novedades || {};
  const pendingNewsCount = (novedades.tareasPendientes?.length || 0) + (novedades.proximasClases?.length || 0);
  const specialtyName = data?.especialidad?.nombre || "Sin especialidad asignada";
  const clasesHoy = (data?.clases || []).filter((clase) => isToday(clase.fecha));
  const tareasPendientes = novedades.tareasPendientes || [];
  const tareasNuevas = (data?.tareas || []).filter((tarea) => {
    if ((tarea.estado || "abierta") !== "abierta") return false;
    if (data?.entregasByTarea?.has?.(tarea.id)) return false;
    if (!tarea.created_at) return true;
    const createdAt = new Date(tarea.created_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return createdAt >= sevenDaysAgo;
  });
  const entregasRevisadas = (data?.entregas || []).filter((entrega) =>
    ["revisada", "aprobada", "rechazada"].includes(entrega.estado),
  );
  const notasNuevas = data?.notas || [];
  const avisosRecientes = novedades.avisosRecientes || [];
  const materialesRecientes = novedades.materialesRecientes || [];
  const avisosNoLeidos = avisosRecientes.filter((aviso) => !isSeen({ profileId: profile?.id, type: "aviso", id: aviso.id }));
  const materialesNoVistos = materialesRecientes.filter((material) => !isSeen({ profileId: profile?.id, type: "material", id: material.id }));
  const tareasPorVencer = tareasConEntrega.filter((tarea) =>
    !tarea.entrega && (tarea.estado || "abierta") === "abierta" && isDueSoon(tarea.fecha_limite),
  );
  const hasEspecialidad = Boolean(data?.especialidad?.id || data?.asignacion?.especialidad_id);
  const hasPublishedContent = Boolean(
    (data?.tareas || []).length ||
    (data?.clases || []).length ||
    (data?.asignaturas || []).length ||
    avisosRecientes.length ||
    materialesRecientes.length,
  );
  const accessCards = [
    { title: "Asignaturas", description: "Módulos y semanas de tu especialidad.", icon: BookOpenCheck, action: onOpenAsignaturas },
    { title: "Normativas y Políticas", description: "Lineamientos académicos e institucionales.", icon: ShieldCheck, action: onOpenExpediente },
    { title: "Autogestión", description: "Perfil, expediente y seguimiento personal.", icon: UserRoundPlus, action: onOpenExpediente },
    { title: "Históricos", description: "Trazabilidad académica y avances previos.", icon: BarChart3, action: onOpenExpediente },
    { title: "Biblioteca Digital", description: "Materiales publicados por asignatura.", icon: BookOpen, action: onOpenAsignaturas },
    { title: "Tutoriales", description: "Videos, guías y recursos de apoyo.", icon: PlaySquare, action: onOpenAsignaturas },
    { title: "Mis cursos", description: "Acceso directo a tus asignaturas activas.", icon: GraduationCap, action: onOpenAsignaturas },
  ];
  const recentActivity = [
    { title: "Tareas pendientes", detail: `${stats.pendientes || 0} por entregar`, tone: "blue", icon: ClipboardList },
    { title: "Evidencias entregadas", detail: `${stats.entregadas || 0} registradas`, tone: "green", icon: FileCheck2 },
    { title: "Promedio académico", detail: stats.promedio ?? "Sin datos", tone: "purple", icon: Award },
  ];
  const menuItems = [
    { label: "Inicio" },
    { label: "Especializaciones", onClick: onOpenEspecializaciones },
    { label: "Asignaturas", onClick: onOpenAsignaturas },
    { label: "Calendario", onClick: onOpenCronograma },
    { label: "Asistencia", onClick: onOpenAsistencia },
    { label: "Evaluaciones", onClick: () => document.getElementById("mi-campus-notas")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Expediente", onClick: onOpenExpediente },
    { label: "Mensajes", onClick: onOpenMensajes },
    { label: "Documentos", onClick: () => document.getElementById("mi-campus-evidencias")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Biblioteca", onClick: () => document.getElementById("mi-campus-evidencias")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Configuración" },
  ];

  function openEntrega(tarea) {
    if (!tarea || !data?.especialidad) return;
    onOpenEntregaTarea?.({ tarea, especialidad: data.especialidad });
  }

  function openDetail(type, item) {
    if (!item) return;
    if (type === "aviso") {
      markSeen({ profileId: profile?.id, type: "aviso", id: item.id });
      setSeenVersion((value) => value + 1);
    }
    if (type === "material") {
      markSeen({ profileId: profile?.id, type: "material", id: item.id });
      setSeenVersion((value) => value + 1);
    }
    if (type === "material" && (item.archivo_url || item.enlace_url)) {
      window.open(item.archivo_url || item.enlace_url, "_blank", "noopener,noreferrer");
      return;
    }
    setDetailItem({ type, item });
  }

  function renderDetailBody() {
    if (!detailItem) return null;
    const { type, item } = detailItem;

    if (type === "clase") {
      return (
        <>
          <div className="student-detail-grid">
            <div><span>Fecha</span><strong>{formatDate(item.fecha)}</strong></div>
            <div><span>Hora inicio</span><strong>{item.hora_inicio || "Sin hora"}</strong></div>
            <div><span>Hora fin</span><strong>{item.hora_fin || "Sin hora"}</strong></div>
            <div><span>Docente</span><strong>{item.docente || "Pendiente"}</strong></div>
            <div><span>Estado</span><strong>{item.estado || "programada"}</strong></div>
            <div><span>Asignatura</span><strong>{item.asignatura_titulo || "Sin asignatura"}</strong></div>
            <div><span>Sección</span><strong>{item.seccion_titulo || "Sin sección"}</strong></div>
            <div><span>Modalidad</span><strong>{item.modalidad || "Virtual/Académica"}</strong></div>
          </div>
          <p>{item.descripcion || "Clase programada sin descripción adicional."}</p>
          {item.enlace_virtual ? <a href={item.enlace_virtual} target="_blank" rel="noreferrer">Abrir enlace virtual</a> : null}
        </>
      );
    }

    if (type === "aviso") {
      return (
        <>
          <div className="student-detail-grid">
            <div><span>Asignatura</span><strong>{item.asignatura_titulo || "Asignatura"}</strong></div>
            <div><span>Sección</span><strong>{item.seccion_titulo || "General"}</strong></div>
            <div><span>Publicado</span><strong>{item.created_at ? formatDate(String(item.created_at).slice(0, 10)) : "Sin fecha"}</strong></div>
          </div>
          <p>{item.contenido || "Aviso académico publicado."}</p>
        </>
      );
    }

    if (type === "material") {
      return (
        <>
          <div className="student-detail-grid">
            <div><span>Asignatura</span><strong>{item.asignatura_titulo || "Asignatura"}</strong></div>
            <div><span>Sección</span><strong>{item.seccion_titulo || "General"}</strong></div>
            <div><span>Tipo</span><strong>{item.tipo || item.archivo_tipo || "material"}</strong></div>
            <div><span>Archivo</span><strong>{item.archivo_nombre || "Sin archivo"}</strong></div>
          </div>
          <p>{item.descripcion || "Material académico publicado."}</p>
          {item.archivo_url || item.enlace_url ? <a href={item.archivo_url || item.enlace_url} target="_blank" rel="noreferrer">Abrir material</a> : null}
        </>
      );
    }

    return null;
  }

  const rightPanel = (
    <div className="dashboard-side-panel student-right-panel">
      <section className="side-block right-card">
        <div className="side-block-head">
          <h3><Bell size={22} strokeWidth={1.8} aria-hidden="true" /> Notificaciones</h3>
          <span>{tareasPendientes.length + tareasNuevas.length + entregasRevisadas.length + notasNuevas.length + avisosNoLeidos.length + materialesNoVistos.length}</span>
        </div>
        <div className="event-list">
          {tareasPendientes.slice(0, 2).map((tarea) => (
            <article key={`pending-${tarea.id}`} role="button" tabIndex={0} onClick={() => openEntrega(tarea)} onKeyDown={(event) => event.key === "Enter" && openEntrega(tarea)}>
              <ClipboardList size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>Tarea pendiente</strong><small>{tarea.titulo} · vence {formatDate(tarea.fecha_limite)}</small></div>
            </article>
          ))}
          {entregasRevisadas.slice(0, 2).map((entrega) => (
            <article key={`review-${entrega.id}`}>
              <FileCheck2 size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>Entrega {entrega.estado}</strong><small>{entrega.retroalimentacion || entrega.archivo_nombre || "Revisión académica disponible."}</small></div>
            </article>
          ))}
          {notasNuevas.slice(0, 2).map((nota) => (
            <article key={`nota-${nota.id}`}>
              <Award size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>Nota registrada</strong><small>{nota.actividad || nota.area || "Evaluación"} · {nota.nota ?? "Sin nota"}</small></div>
            </article>
          ))}
          {avisosNoLeidos.slice(0, 2).map((aviso) => (
            <article key={`aviso-${aviso.id}`} role="button" tabIndex={0} onClick={() => openDetail("aviso", aviso)} onKeyDown={(event) => event.key === "Enter" && openDetail("aviso", aviso)}>
              <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>{aviso.titulo}</strong><small>{aviso.asignatura_titulo || "Aviso académico"}</small></div>
            </article>
          ))}
          {materialesNoVistos.slice(0, 2).map((material) => (
            <article key={`material-${material.id}`} role="button" tabIndex={0} onClick={() => openDetail("material", material)} onKeyDown={(event) => event.key === "Enter" && openDetail("material", material)}>
              <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>Material publicado</strong><small>{material.titulo} · {material.asignatura_titulo || "Asignatura"}</small></div>
            </article>
          ))}
          {!tareasPendientes.length && !tareasNuevas.length && !entregasRevisadas.length && !notasNuevas.length && !avisosNoLeidos.length && !materialesNoVistos.length ? (
            <article>
              <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>Sin notificaciones</strong><small>No hay novedades académicas pendientes.</small></div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="side-block right-card">
        <div className="side-block-head">
          <h3><CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" /> Calendario académico</h3>
          <span>Hoy</span>
        </div>
        {clasesHoy.length ? (
          <div className="event-list">
            {clasesHoy.map((clase) => (
              <article key={clase.id} role="button" tabIndex={0} onClick={() => openDetail("clase", clase)} onKeyDown={(event) => event.key === "Enter" && openDetail("clase", clase)}>
                <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
                <div><strong>{clase.titulo}</strong><small>{clase.hora_inicio} - {clase.hora_fin} · {clase.docente || "Docente pendiente"}</small></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="calendar-card">
            <strong>Hoy</strong>
            <div>
              <span>{specialtyName}</span>
              <small>Sin clases programadas para hoy.</small>
            </div>
          </div>
        )}
      </section>

      <section className="side-block right-card">
        <div className="side-block-head">
          <h3><Clock size={22} strokeWidth={1.8} aria-hidden="true" /> Próximos eventos</h3>
          <span>{(novedades.proximasClases?.length || 0) + tareasPorVencer.length + avisosNoLeidos.length + materialesNoVistos.length}</span>
        </div>
        <div className="event-list">
          {(novedades.proximasClases || []).slice(0, 3).map((clase) => (
            <article key={`class-${clase.id}`} role="button" tabIndex={0} onClick={() => openDetail("clase", clase)} onKeyDown={(event) => event.key === "Enter" && openDetail("clase", clase)}>
              <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>{clase.titulo}</strong><small>{formatDate(clase.fecha)} · {clase.hora_inicio} - {clase.hora_fin}</small></div>
            </article>
          ))}
          {tareasPorVencer.slice(0, 3).map((tarea) => (
            <article key={`due-${tarea.id}`} role="button" tabIndex={0} onClick={() => openEntrega(tarea)} onKeyDown={(event) => event.key === "Enter" && openEntrega(tarea)}>
              <ClipboardList size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>{tarea.titulo}</strong><small>Vence {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</small></div>
            </article>
          ))}
          {avisosNoLeidos.slice(0, 2).map((aviso) => (
            <article key={`event-aviso-${aviso.id}`} role="button" tabIndex={0} onClick={() => openDetail("aviso", aviso)} onKeyDown={(event) => event.key === "Enter" && openDetail("aviso", aviso)}>
              <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>{aviso.titulo}</strong><small>{aviso.asignatura_titulo || "Aviso académico"}</small></div>
            </article>
          ))}
          {materialesNoVistos.slice(0, 2).map((material) => (
            <article key={`event-material-${material.id}`} role="button" tabIndex={0} onClick={() => openDetail("material", material)} onKeyDown={(event) => event.key === "Enter" && openDetail("material", material)}>
              <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>{material.titulo}</strong><small>{material.asignatura_titulo || "Material académico"}</small></div>
            </article>
          ))}
          {!(novedades.proximasClases || []).length && !tareasPorVencer.length && !avisosNoLeidos.length && !materialesNoVistos.length ? (
            <article>
              <Clock size={18} strokeWidth={1.8} aria-hidden="true" />
              <div><strong>Sin próximos eventos</strong><small>No hay clases, tareas por vencer ni avisos recientes.</small></div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <CampusLayout
      userName={displayName}
      userRole={profile?.rol || "Recurso en formación"}
      userMeta={profile?.cum || "Sin CUM"}
      user={session?.user}
      profile={profile}
      menuItems={menuItems}
      activeItem="Inicio"
      onLogout={onLogout}
      onAvatarUpdated={onAvatarUpdated}
      rightPanel={rightPanel}
    >
      <div className="student-campus-page">
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
              <h2 className="hero-title">Bienvenido nuevamente, {firstName(displayName)}</h2>
              <p className="hero-subtitle">Seguimiento académico personal, tareas, asistencia, evidencias y expediente de formación UCI.</p>
              <div className="hero-specialty-row hero-meta">
                <span className="hero-badge hero-specialty-label">Especialidad activa</span>
                <strong className="hero-specialty-name">{specialtyName}</strong>
                {pendingNewsCount ? <span className="hero-news-badge">{pendingNewsCount} novedades</span> : null}
              </div>
              <div className="hero-progress-line" aria-label={`Progreso académico ${stats.progreso || 0}%`}>
                <span style={{ width: `${stats.progreso || 0}%` }} />
              </div>
              <div className="hero-actions">
                <button type="button" onClick={onOpenCronograma}>Ver cronograma</button>
                <button type="button" onClick={onOpenExpediente}>Mi expediente</button>
              </div>
            </div>
          </div>

          <div className="progress-area">
            <div className="progress-ring-box">
              <ProgressCircle value={stats.progreso || 0} />
            </div>
          </div>
        </motion.header>

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}

        {loading ? (
          <div className="cu-empty">Cargando Mi Campus...</div>
        ) : (
          <>
            {!hasEspecialidad ? (
              <div className="cu-alert">Aún no tienes una especialidad asignada.</div>
            ) : null}
            {hasEspecialidad && !hasPublishedContent ? (
              <div className="cu-empty">No hay contenido publicado todavía.</div>
            ) : null}
            <section className="stats-grid">
              <article className="stat-card">
                <span className="stat-icon blue"><ClipboardList size={23} strokeWidth={1.9} /></span>
                <div><small>Pendientes</small><strong>{stats.pendientes || 0}</strong></div>
              </article>
              <article className="stat-card">
                <span className="stat-icon green"><FileCheck2 size={23} strokeWidth={1.9} /></span>
                <div><small>Entregadas</small><strong>{stats.entregadas || 0}</strong></div>
              </article>
              <article className="stat-card">
                <span className="stat-icon purple"><CheckCircle2 size={23} strokeWidth={1.9} /></span>
                <div><small>Aprobadas</small><strong>{stats.aprobadas || 0}</strong></div>
              </article>
              <article className="stat-card">
                <span className="stat-icon orange"><Award size={23} strokeWidth={1.9} /></span>
                <div><small>Promedio</small><strong>{stats.promedio ?? "Sin datos"}</strong></div>
              </article>
            </section>

            <section className="student-news-panel" aria-label="Novedades académicas">
              <div className="student-panel-head">
                <span>Novedades</span>
                <h3>Actividad nueva de tu especialidad</h3>
              </div>
              <div className="student-news-grid">
                <article>
                  <div className="student-news-title">
                    <span className={novedades.tareasPendientes?.length ? "news-dot active" : "news-dot"} />
                    <strong>Tareas abiertas</strong>
                    {novedades.tareasPendientes?.length ? <em>{novedades.tareasPendientes.length}</em> : null}
                  </div>
                  {novedades.tareasPendientes?.length ? (
                    <div className="student-list compact">
                      {novedades.tareasPendientes.slice(0, 3).map((tarea) => (
                        <article key={tarea.id} className="student-clickable-card" role="button" tabIndex={0} onClick={() => openEntrega(tarea)} onKeyDown={(event) => event.key === "Enter" && openEntrega(tarea)}>
                          <strong>{tarea.titulo}</strong>
                          <small>Límite: {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</small>
                          {parseTaskInstructions(tarea.instrucciones || "").attachments.length ? <p>Incluye adjunto del docente.</p> : null}
                          <button type="button" onClick={(event) => { event.stopPropagation(); openEntrega(tarea); }}>
                            Entregar tarea <ArrowRight size={14} strokeWidth={2} />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>No tenés tareas abiertas pendientes.</p>
                  )}
                </article>

                <article>
                  <div className="student-news-title">
                    <span className={novedades.proximasClases?.length ? "news-dot active green" : "news-dot"} />
                    <strong>Próximas clases</strong>
                    {novedades.proximasClases?.length ? <em>{novedades.proximasClases.length}</em> : null}
                  </div>
                  {novedades.proximasClases?.length ? (
                    <div className="student-list compact">
                      {novedades.proximasClases.slice(0, 3).map((clase) => (
                        <article key={clase.id} className="student-clickable-card" role="button" tabIndex={0} onClick={() => openDetail("clase", clase)} onKeyDown={(event) => event.key === "Enter" && openDetail("clase", clase)}>
                          <strong>{clase.titulo}</strong>
                          <small>{formatDate(clase.fecha)} · {clase.hora_inicio} - {clase.hora_fin}</small>
                          <p>{clase.docente || "Docente pendiente"}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>No hay clases próximas programadas.</p>
                  )}
                </article>

                <article>
                  <div className="student-news-title">
                    <span className={avisosNoLeidos.length ? "news-dot active teal" : "news-dot"} />
                    <strong>Avisos recientes</strong>
                    {avisosNoLeidos.length ? <em>{avisosNoLeidos.length}</em> : null}
                  </div>
                  {avisosRecientes.length ? (
                    <div className="student-list compact">
                      {avisosRecientes.slice(0, 3).map((aviso) => (
                        <article key={aviso.id} className="student-clickable-card" role="button" tabIndex={0} onClick={() => openDetail("aviso", aviso)} onKeyDown={(event) => event.key === "Enter" && openDetail("aviso", aviso)}>
                          <strong>{aviso.titulo}</strong>
                          <small>{aviso.asignatura_titulo || "Asignatura"}</small>
                          <p>{aviso.contenido || "Aviso académico publicado."}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>Sin avisos recientes publicados.</p>
                  )}
                </article>

                <article>
                  <div className="student-news-title">
                    <span className={materialesNoVistos.length ? "news-dot active green" : "news-dot"} />
                    <strong>Materiales recientes</strong>
                    {materialesNoVistos.length ? <em>{materialesNoVistos.length}</em> : null}
                  </div>
                  {materialesRecientes.length ? (
                    <div className="student-list compact">
                      {materialesRecientes.slice(0, 3).map((material) => (
                        <article key={material.id} className="student-clickable-card" role="button" tabIndex={0} onClick={() => openDetail("material", material)} onKeyDown={(event) => event.key === "Enter" && openDetail("material", material)}>
                          <strong>{material.titulo}</strong>
                          <small>{material.asignatura_titulo || "Asignatura"}</small>
                          {material.archivo_url || material.enlace_url ? (
                            <a href={material.archivo_url || material.enlace_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Abrir material</a>
                          ) : <p>{material.descripcion || "Material académico publicado."}</p>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>Sin materiales recientes publicados.</p>
                  )}
                </article>
              </div>
            </section>

            <section className="dashboard-access-card">
              <div className="dashboard-section-head">
                <span>Campus recurso</span>
                <h3>Accesos principales</h3>
              </div>
              <div className="cu-portal-card-grid access-grid" aria-label="Accesos del recurso">
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
                  <button type="button" className="quick-action" onClick={() => openEntrega(pendingTask)} disabled={!pendingTask}><span className="quick-icon blue"><UploadCloud size={21} /></span><strong>Entregar tarea</strong><small>Evidencia</small></button>
                  <button type="button" className="quick-action" onClick={onOpenAsistencia}><span className="quick-icon green"><CheckCircle2 size={21} /></span><strong>Mi asistencia</strong><small>Historial</small></button>
                  <button type="button" className="quick-action" onClick={onOpenExpediente}><span className="quick-icon orange"><GraduationCap size={21} /></span><strong>Expediente</strong><small>Reporte</small></button>
                  <button type="button" className="quick-action" onClick={onOpenMensajes}><span className="quick-icon purple"><Bell size={21} /></span><strong>Novedades</strong><small>{pendingNewsCount ? `${pendingNewsCount} alertas` : "Sin alertas"}</small></button>
                </div>
              </article>
            </section>

            <section className="student-campus-grid">
              <article className="student-panel" id="mi-campus-clases">
                <div className="student-panel-head">
                  <span>Agenda</span>
                  <h3>Próximas clases</h3>
                </div>
                {data?.clases?.length ? (
                  <div className="student-list">
                    {data.clases.slice(0, 5).map((clase) => (
                      <article key={clase.id} className="student-clickable-card" role="button" tabIndex={0} onClick={() => openDetail("clase", clase)} onKeyDown={(event) => event.key === "Enter" && openDetail("clase", clase)}>
                        <strong>{clase.titulo}</strong>
                        <small>{formatDate(clase.fecha)} · {clase.hora_inicio} - {clase.hora_fin}</small>
                        <p>{clase.docente || "Docente pendiente"}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cu-empty">Sin clases programadas.</div>
                )}
              </article>

              <article className="student-panel" id="mi-campus-tareas">
                <div className="student-panel-head">
                  <span>Tareas</span>
                  <h3>Últimas tareas</h3>
                </div>
                {tareasConEntrega.length ? (
                  <div className="student-list">
                    {tareasConEntrega.slice(0, 6).map((tarea) => (
                      <article key={tarea.id} className="student-clickable-card" role="button" tabIndex={0} onClick={() => openEntrega(tarea)} onKeyDown={(event) => event.key === "Enter" && openEntrega(tarea)}>
                        <div className="student-task-row">
                          <div>
                            <strong>{tarea.titulo}</strong>
                            <small>Límite: {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</small>
                          </div>
                          <span className={`academic-status ${tarea.entrega?.estado || "pendiente"}`}>
                            {tarea.entrega?.estado || "pendiente"}
                          </span>
                        </div>
                        <button type="button" onClick={(event) => { event.stopPropagation(); openEntrega(tarea); }}>
                          {tarea.entrega ? "Ver entrega" : "Entregar tarea"} <ArrowRight size={14} strokeWidth={2} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cu-empty">Sin tareas asignadas.</div>
                )}
              </article>

              <article className="student-panel" id="mi-campus-notas">
                <div className="student-panel-head">
                  <span>Notas</span>
                  <h3>Últimas notas</h3>
                </div>
                {data?.notas?.length ? (
                  <div className="student-list compact">
                    {data.notas.map((nota) => (
                      <article key={nota.id}>
                        <strong>{nota.actividad || nota.area || "Evaluación"}</strong>
                        <small>{nota.area || "Área académica"}</small>
                        <p>Nota: {nota.nota ?? "Sin nota"} · {nota.estado || "Sin estado"}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cu-empty">Sin notas registradas.</div>
                )}
              </article>

              <article className="student-panel" id="mi-campus-evidencias">
                <div className="student-panel-head">
                  <span>Evidencias</span>
                  <h3>Mis evidencias</h3>
                </div>
                {data?.entregas?.length ? (
                  <div className="student-list compact">
                    {data.entregas.slice(0, 5).map((entrega) => (
                      <article key={entrega.id}>
                        <strong>{entrega.archivo_nombre || "Evidencia enviada"}</strong>
                        <small>{entrega.estado || "entregada"}</small>
                        <p>{entrega.retroalimentacion || "Pendiente de retroalimentación."}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cu-empty">Sin evidencias enviadas.</div>
                )}
              </article>
            </section>
          </>
        )}
        {detailItem ? (
          <div className="student-detail-backdrop" role="presentation" onClick={() => setDetailItem(null)}>
            <section className="student-detail-modal" role="dialog" aria-modal="true" aria-label="Detalle académico" onClick={(event) => event.stopPropagation()}>
              <div className="student-detail-head">
                <div>
                  <span>{detailItem.type === "clase" ? "Programación de clase" : detailItem.type === "aviso" ? "Aviso académico" : "Material académico"}</span>
                  <h3>{detailItem.item?.titulo || "Detalle académico"}</h3>
                </div>
                <button type="button" onClick={() => setDetailItem(null)} aria-label="Cerrar detalle">
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
              <div className="student-detail-body">
                {renderDetailBody()}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </CampusLayout>
  );
}
