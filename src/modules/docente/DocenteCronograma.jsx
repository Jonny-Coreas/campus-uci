import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import ClasesVirtuales from "../especialidades/ClasesVirtuales";
import { getEspecialidadesPermitidas } from "../../services/docenteService";

function pickFirstEspecialidad(especialidades = []) {
  return especialidades.find((item) => item.activa !== false) || especialidades[0] || null;
}

export default function DocenteCronograma({
  profile = null,
  especialidades = [],
  onBack = null,
}) {
  const [especialidadId, setEspecialidadId] = useState(() => pickFirstEspecialidad(especialidades)?.id || "");
  const [especialidadesPermitidas, setEspecialidadesPermitidas] = useState([]);

  const selectedEspecialidad = useMemo(
    () => especialidadesPermitidas.find((item) => item.id === especialidadId) || pickFirstEspecialidad(especialidadesPermitidas),
    [especialidadId, especialidadesPermitidas],
  );

  useEffect(() => {
    let alive = true;

    async function loadPermitidas() {
      const rows = await getEspecialidadesPermitidas(profile, especialidades);
      if (!alive) return;
      setEspecialidadesPermitidas(rows);
      setEspecialidadId((current) => (rows.some((item) => item.id === current) ? current : rows[0]?.id || ""));
    }

    loadPermitidas();
    return () => {
      alive = false;
    };
  }, [especialidades, profile]);

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
              {especialidadesPermitidas.map((item) => (
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
        <div className="cu-empty">No hay especialidades asignadas para programar clases.</div>
      )}
    </div>
  );
}
