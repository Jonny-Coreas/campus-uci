import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import ClasesVirtuales from "../especialidades/ClasesVirtuales";

function pickFirstEspecialidad(especialidades = []) {
  return especialidades.find((item) => item.activa !== false) || especialidades[0] || null;
}

export default function DocenteCronograma({
  profile = null,
  especialidades = [],
  onBack = null,
}) {
  const [especialidadId, setEspecialidadId] = useState(() => pickFirstEspecialidad(especialidades)?.id || "");

  const selectedEspecialidad = useMemo(
    () => especialidades.find((item) => item.id === especialidadId) || pickFirstEspecialidad(especialidades),
    [especialidadId, especialidades],
  );

  useEffect(() => {
    if (!especialidadId && especialidades.length) {
      setEspecialidadId(pickFirstEspecialidad(especialidades)?.id || "");
    }
  }, [especialidadId, especialidades]);

  return (
    <div className="academic-module-page">
      <section className="academic-module-hero">
        <div>
          <span className="dashboard-section-head-label">Panel Docente</span>
          <h2>Cronograma y clases</h2>
          <p>Programá clases virtuales, enlaces, horarios y estado académico por especialidad.</p>
        </div>

        <div className="resources-admin-actions">
          <label className="academic-inline-select">
            <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
            <select value={selectedEspecialidad?.id || ""} onChange={(event) => setEspecialidadId(event.target.value)}>
              {especialidades.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </label>

          {onBack ? (
            <button type="button" className="academic-secondary-action" onClick={onBack}>
              <ArrowLeft size={16} strokeWidth={2.1} aria-hidden="true" />
              Volver
            </button>
          ) : null}
        </div>
      </section>

      {selectedEspecialidad ? (
        <ClasesVirtuales
          especialidad={selectedEspecialidad}
          profile={profile}
          onBack={onBack}
        />
      ) : (
        <div className="cu-empty">No hay especialidades disponibles para programar clases.</div>
      )}
    </div>
  );
}
