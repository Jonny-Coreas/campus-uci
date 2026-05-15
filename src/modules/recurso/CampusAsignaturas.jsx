import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpenCheck, GraduationCap } from "lucide-react";
import {
  getAsignaturasByEspecialidad,
  getEspecialidadActivaRecurso,
} from "../../services/campusContenidoService";

export default function CampusAsignaturas({
  session = null,
  profile = null,
  onBack = null,
  onOpenAsignatura = null,
}) {
  const [especialidad, setEspecialidad] = useState(null);
  const [asignaturas, setAsignaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const { especialidad: activeEspecialidad } = await getEspecialidadActivaRecurso({ profile, session });
        const rows = await getAsignaturasByEspecialidad(activeEspecialidad?.id, { onlyPublished: true });
        if (alive) {
          setEspecialidad(activeEspecialidad);
          setAsignaturas(rows);
        }
      } catch (loadError) {
        console.error("[Campus UCI] Error cargando asignaturas:", loadError);
        if (alive) setError(loadError.message || "No se pudieron cargar las asignaturas.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [profile, session]);

  return (
    <div className="moodle-page">
      <section className="moodle-hero">
        <div>
          <span>Campus Moodle UCI</span>
          <h2>Asignaturas</h2>
          <p>{especialidad?.nombre || "Especialidad asignada"} · módulos académicos publicados para tu formación.</p>
        </div>
        <button type="button" className="academic-secondary-action" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2} />
          Volver
        </button>
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}
      {loading ? <div className="cu-empty">Cargando asignaturas...</div> : null}

      {!loading && asignaturas.length === 0 ? (
        <div className="cu-empty">
          <BookOpenCheck size={24} strokeWidth={1.9} />
          No hay asignaturas publicadas para tu especialidad.
        </div>
      ) : null}

      <section className="moodle-course-grid">
        {asignaturas.map((asignatura, index) => (
          <button
            type="button"
            className="moodle-course-card"
            key={asignatura.id}
            onClick={() => onOpenAsignatura?.(asignatura)}
          >
            <div
              className="moodle-course-image"
              style={{
                backgroundImage: asignatura.imagen_url
                  ? `linear-gradient(135deg, rgba(5,45,130,.15), rgba(20,184,166,.12)), url(${asignatura.imagen_url})`
                  : undefined,
              }}
            >
              {!asignatura.imagen_url ? <GraduationCap size={46} strokeWidth={1.7} /> : null}
              <span>Módulo {index + 1}</span>
            </div>
            <div className="moodle-course-body">
              <strong>{asignatura.titulo}</strong>
              <p>{asignatura.descripcion || "Contenido académico de la especialidad."}</p>
              <small>Abrir asignatura</small>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
