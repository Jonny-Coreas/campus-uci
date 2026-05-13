import React, { useEffect, useState } from "react";
import { ArrowLeft, CalendarCheck, Clock, FileCheck2, UserX } from "lucide-react";
import { getResumenAsistencia } from "../../services/asistenciaService";

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function MiAsistencia({ profile = null, especialidad = null, onBack = null }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, especialidad?.id]);

  async function loadAsistencia() {
    setLoading(true);
    setError("");

    try {
      const data = await getResumenAsistencia({
        profileId: profile?.id,
        especialidadId: especialidad?.id || null,
      });
      setSummary(data);
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando Mi Asistencia:", loadError);
      setError(loadError.message || "No se pudo cargar la asistencia.");
    } finally {
      setLoading(false);
    }
  }

  const stats = summary || {
    total: 0,
    asistidas: 0,
    tardias: 0,
    ausencias: 0,
    justificadas: 0,
    porcentaje: 0,
    historial: [],
  };

  return (
    <div className="attendance-page">
      <section className="schedule-hero">
        <div>
          <span className="dashboard-section-head-label">Mi Campus</span>
          <h2>Mi asistencia</h2>
          <p>Resumen individual de asistencia, tardías, ausencias y justificaciones.</p>
        </div>
        {onBack ? (
          <button type="button" className="academic-secondary-action" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Volver
          </button>
        ) : null}
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}
      {loading ? <div className="cu-empty">Cargando asistencia...</div> : null}

      <section className="attendance-summary-grid">
        <article className="student-stat-card">
          <span className="student-stat-icon blue"><CalendarCheck size={23} strokeWidth={1.9} /></span>
          <div><small>Asistencia</small><strong>{stats.porcentaje}%</strong></div>
        </article>
        <article className="student-stat-card">
          <span className="student-stat-icon green"><FileCheck2 size={23} strokeWidth={1.9} /></span>
          <div><small>Asistidas</small><strong>{stats.asistidas}</strong></div>
        </article>
        <article className="student-stat-card">
          <span className="student-stat-icon purple"><Clock size={23} strokeWidth={1.9} /></span>
          <div><small>Tardías</small><strong>{stats.tardias}</strong></div>
        </article>
        <article className="student-stat-card">
          <span className="student-stat-icon orange"><UserX size={23} strokeWidth={1.9} /></span>
          <div><small>Ausencias</small><strong>{stats.ausencias}</strong></div>
        </article>
      </section>

      <section className="attendance-panel">
        <div className="student-panel-head">
          <span>Historial</span>
          <h3>Clases registradas</h3>
        </div>

        {stats.historial.length ? (
          <div className="student-list">
            {stats.historial.map((item) => (
              <article key={item.id}>
                <div className="student-task-row">
                  <div>
                    <strong>{item.clase?.titulo || "Clase académica"}</strong>
                    <small>{formatDate(item.clase?.fecha)} · {item.clase?.hora_inicio} - {item.clase?.hora_fin}</small>
                    <p>{item.comentario || item.clase?.especialidades?.nombre || "Campus UCI"}</p>
                  </div>
                  <span className={`attendance-badge ${item.estado}`}>{item.estado}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="cu-empty">Sin asistencia registrada.</div>
        )}
      </section>
    </div>
  );
}
