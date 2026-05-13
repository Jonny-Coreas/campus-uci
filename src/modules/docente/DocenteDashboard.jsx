import React, { useEffect, useState } from "react";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  Star,
} from "lucide-react";
import CampusLayout from "../../components/campus/CampusLayout";
import { getDocenteDashboard, reviewEntrega } from "../../services/docenteService";

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
}

export default function DocenteDashboard({
  session,
  profile,
  onLogout,
  onAvatarUpdated,
  onOpenEvaluaciones,
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
    { label: "Calendario", onClick: () => document.getElementById("docente-clases")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Evaluaciones", onClick: onOpenEvaluaciones },
    { label: "Documentos", onClick: () => document.getElementById("docente-entregas")?.scrollIntoView({ behavior: "smooth" }) },
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

  return (
    <CampusLayout
      userName={displayName}
      userRole="Docente"
      userMeta={profile?.cum || profile?.servicio || "Campus UCI"}
      user={session?.user}
      profile={profile}
      menuItems={menuItems}
      activeItem="Inicio"
      onLogout={onLogout}
      onAvatarUpdated={onAvatarUpdated}
    >
      <div className="teacher-dashboard-page">
        <section className="teacher-hero-card">
          <div>
            <span>Panel docente</span>
            <h2>Bienvenido(a), {displayName.split(" ")[0] || "Docente"}</h2>
            <p>Gestioná clases, revisión de evidencias y evaluaciones académicas de Campus UCI.</p>
          </div>
          <button type="button" className="academic-submit" onClick={onOpenEvaluaciones}>
            <BookOpenCheck size={17} strokeWidth={2} aria-hidden="true" />
            Crear evaluación
          </button>
        </section>

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}
        {loading ? <div className="cu-empty">Cargando panel docente...</div> : null}

        <section className="teacher-stats-grid">
          <article className="teacher-stat-card">
            <span className="student-stat-icon blue"><CalendarDays size={23} strokeWidth={1.9} /></span>
            <div><small>Próximas clases</small><strong>{stats.proximasClases || 0}</strong></div>
          </article>
          <article className="teacher-stat-card">
            <span className="student-stat-icon green"><ClipboardList size={23} strokeWidth={1.9} /></span>
            <div><small>Tareas creadas</small><strong>{stats.tareas || 0}</strong></div>
          </article>
          <article className="teacher-stat-card">
            <span className="student-stat-icon purple"><FileCheck2 size={23} strokeWidth={1.9} /></span>
            <div><small>Por revisar</small><strong>{stats.pendientesRevision || 0}</strong></div>
          </article>
          <article className="teacher-stat-card">
            <span className="student-stat-icon orange"><Award size={23} strokeWidth={1.9} /></span>
            <div><small>Evaluaciones</small><strong>{stats.evaluaciones || 0}</strong></div>
          </article>
        </section>

        <section className="teacher-quick-grid">
          <button type="button" onClick={onOpenEvaluaciones}><Star size={22} strokeWidth={1.9} /> Evaluaciones</button>
          <button type="button" onClick={() => document.getElementById("docente-entregas")?.scrollIntoView({ behavior: "smooth" })}><FileCheck2 size={22} strokeWidth={1.9} /> Revisar entregas</button>
          <button type="button" onClick={() => document.getElementById("docente-clases")?.scrollIntoView({ behavior: "smooth" })}><CalendarDays size={22} strokeWidth={1.9} /> Mis clases</button>
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
