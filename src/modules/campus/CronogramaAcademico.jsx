import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { getProximasClasesAcademicas } from "../../services/asistenciaService";
import { getEspecialidadActivaRecurso } from "../../services/campusContenidoService";
import { isRecurso } from "../../auth/roles";

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function CronogramaAcademico({
  especialidadId = null,
  session = null,
  profile = null,
  title = "Cronograma académico",
  onBack = null,
}) {
  const [clases, setClases] = useState([]);
  const [resolvedEspecialidad, setResolvedEspecialidad] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const effectiveEspecialidadId = especialidadId || resolvedEspecialidad?.id || null;

  useEffect(() => {
    let alive = true;

    async function resolveEspecialidad() {
      if (especialidadId || !isRecurso(profile)) {
        setResolvedEspecialidad(null);
        return;
      }

      try {
        const { especialidad } = await getEspecialidadActivaRecurso({ profile, session });
        if (alive) setResolvedEspecialidad(especialidad || null);
      } catch (loadError) {
        console.warn("[Campus UCI] No se pudo resolver especialidad del recurso para cronograma:", loadError);
        if (alive) setResolvedEspecialidad(null);
      }
    }

    resolveEspecialidad();
    return () => {
      alive = false;
    };
  }, [especialidadId, profile, session]);

  useEffect(() => {
    loadClases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEspecialidadId]);

  const grouped = useMemo(() => {
    return clases.reduce((acc, clase) => {
      const key = clase.fecha || "Sin fecha";
      acc[key] = acc[key] || [];
      acc[key].push(clase);
      return acc;
    }, {});
  }, [clases]);

  async function loadClases() {
    setLoading(true);
    setError("");

    try {
      const data = await getProximasClasesAcademicas(effectiveEspecialidadId);
      setClases(data);
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando cronograma:", loadError);
      setError(loadError.message || "No se pudo cargar el cronograma.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="schedule-page">
      <section className="schedule-hero">
        <div>
          <span className="dashboard-section-head-label">Agenda académica</span>
          <h2>{title}</h2>
          <p>Próximas clases, docentes, horarios y estado académico.</p>
        </div>
        {onBack ? (
          <button type="button" className="academic-secondary-action" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Volver
          </button>
        ) : null}
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}
      {loading ? <div className="cu-empty">Cargando cronograma...</div> : null}

      <section className="schedule-grid">
        {clases.length === 0 && !loading ? (
          <div className="cu-empty">Sin clases programadas.</div>
        ) : (
          Object.entries(grouped).map(([fecha, items]) => (
            <article className="schedule-day-card" key={fecha}>
              <div className="schedule-day-head">
                <CalendarDays size={20} strokeWidth={1.9} aria-hidden="true" />
                <strong>{formatDate(fecha)}</strong>
              </div>
              <div className="schedule-class-list">
                {items.map((clase) => (
                  <article key={clase.id}>
                    <span className={`academic-status ${clase.estado || "programada"}`}>
                      {clase.estado || "programada"}
                    </span>
                    <h3>{clase.titulo}</h3>
                    <p>{clase.especialidades?.nombre || "Especialidad UCI"} · {clase.docente || "Docente pendiente"}</p>
                    <small><Clock size={14} strokeWidth={2} aria-hidden="true" /> {clase.hora_inicio} - {clase.hora_fin}</small>
                  </article>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
