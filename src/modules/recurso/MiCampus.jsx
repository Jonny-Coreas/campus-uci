import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  UploadCloud,
} from "lucide-react";
import CampusLayout from "../../components/campus/CampusLayout";
import AvatarUpload from "../../components/campus/AvatarUpload";
import { getMiCampusData } from "../../services/recursoCampusService";

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

function ProgressCircle({ value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="student-progress-ring" aria-label={`Progreso académico ${safeValue}%`}>
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
  onOpenEntregaTarea,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const menuItems = [
    { label: "Inicio" },
    { label: "Calendario", onClick: () => document.getElementById("mi-campus-clases")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Evaluaciones", onClick: () => document.getElementById("mi-campus-notas")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Documentos", onClick: () => document.getElementById("mi-campus-evidencias")?.scrollIntoView({ behavior: "smooth" }) },
  ];

  function openEntrega(tarea) {
    if (!tarea || !data?.especialidad) return;
    onOpenEntregaTarea?.({ tarea, especialidad: data.especialidad });
  }

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
    >
      <div className="student-campus-page">
        <section className="student-hero-card">
          <div className="student-hero-avatar">
            <AvatarUpload
              user={session?.user}
              profile={profile}
              name={displayName}
              size="lg"
              onAvatarUpdated={onAvatarUpdated}
            />
          </div>

          <div className="student-hero-copy">
            <span>Mi Campus UCI</span>
            <h2>Bienvenido(a), {firstName(displayName)}</h2>
            <p>
              Seguimiento académico personal, clases, tareas y evidencias de tu formación UCI.
            </p>
            <div className="student-hero-meta">
              <strong>{data?.especialidad?.nombre || "Sin especialidad asignada"}</strong>
              <small>{profile?.cum || "Sin CUM"} · {profile?.servicio || profile?.area || "Recurso en formación"}</small>
            </div>
          </div>

          <ProgressCircle value={stats.progreso || 0} />
        </section>

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}

        {loading ? (
          <div className="cu-empty">Cargando Mi Campus...</div>
        ) : (
          <>
            <section className="student-stats-grid">
              <article className="student-stat-card">
                <span className="student-stat-icon blue"><ClipboardList size={23} strokeWidth={1.9} /></span>
                <div><small>Pendientes</small><strong>{stats.pendientes || 0}</strong></div>
              </article>
              <article className="student-stat-card">
                <span className="student-stat-icon green"><FileCheck2 size={23} strokeWidth={1.9} /></span>
                <div><small>Entregadas</small><strong>{stats.entregadas || 0}</strong></div>
              </article>
              <article className="student-stat-card">
                <span className="student-stat-icon purple"><CheckCircle2 size={23} strokeWidth={1.9} /></span>
                <div><small>Aprobadas</small><strong>{stats.aprobadas || 0}</strong></div>
              </article>
              <article className="student-stat-card">
                <span className="student-stat-icon orange"><Award size={23} strokeWidth={1.9} /></span>
                <div><small>Promedio</small><strong>{stats.promedio ?? "Sin datos"}</strong></div>
              </article>
            </section>

            <section className="student-quick-grid">
              <button type="button" onClick={() => openEntrega(pendingTask)} disabled={!pendingTask}>
                <UploadCloud size={22} strokeWidth={1.9} />
                <span>Entregar tarea</span>
              </button>
              <button type="button" onClick={() => document.getElementById("mi-campus-clases")?.scrollIntoView({ behavior: "smooth" })}>
                <CalendarDays size={22} strokeWidth={1.9} />
                <span>Mis clases</span>
              </button>
              <button type="button" onClick={() => document.getElementById("mi-campus-notas")?.scrollIntoView({ behavior: "smooth" })}>
                <BookOpenCheck size={22} strokeWidth={1.9} />
                <span>Mis notas</span>
              </button>
              <button type="button" onClick={() => document.getElementById("mi-campus-evidencias")?.scrollIntoView({ behavior: "smooth" })}>
                <FileCheck2 size={22} strokeWidth={1.9} />
                <span>Mis evidencias</span>
              </button>
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
                      <article key={clase.id}>
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

              <article className="student-panel">
                <div className="student-panel-head">
                  <span>Tareas</span>
                  <h3>Últimas tareas</h3>
                </div>
                {tareasConEntrega.length ? (
                  <div className="student-list">
                    {tareasConEntrega.slice(0, 6).map((tarea) => (
                      <article key={tarea.id}>
                        <div className="student-task-row">
                          <div>
                            <strong>{tarea.titulo}</strong>
                            <small>Límite: {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</small>
                          </div>
                          <span className={`academic-status ${tarea.entrega?.estado || "pendiente"}`}>
                            {tarea.entrega?.estado || "pendiente"}
                          </span>
                        </div>
                        <button type="button" onClick={() => openEntrega(tarea)}>
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
      </div>
    </CampusLayout>
  );
}
