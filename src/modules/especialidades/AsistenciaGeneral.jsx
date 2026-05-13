import { useMemo, useState } from "react";

const EMPTY_MODE = false;

const MOCK_ATTENDANCE = EMPTY_MODE
  ? []
  : [
      {
        fecha: "2026-05-04",
        modulo: "Módulo 1",
        clase: "Introducción a la especialidad",
        docente: "Dra. Martínez",
        recurso: "Recurso UCI 001",
        estado: "Asistió",
        observaciones: "Participación completa.",
      },
      {
        fecha: "2026-05-04",
        modulo: "Módulo 1",
        clase: "Introducción a la especialidad",
        docente: "Dra. Martínez",
        recurso: "Recurso UCI 002",
        estado: "Tarde",
        observaciones: "Ingreso 12 minutos tarde.",
      },
      {
        fecha: "2026-05-11",
        modulo: "Módulo 2",
        clase: "Manejo clínico aplicado",
        docente: "Dr. Coreas",
        recurso: "Recurso UCI 001",
        estado: "Justificado",
        observaciones: "Permiso institucional.",
      },
      {
        fecha: "2026-05-11",
        modulo: "Módulo 2",
        clase: "Manejo clínico aplicado",
        docente: "Dr. Coreas",
        recurso: "Recurso UCI 003",
        estado: "Faltó",
        observaciones: "Sin justificación registrada.",
      },
      {
        fecha: "2026-05-18",
        modulo: "Módulo 3",
        clase: "Evaluación integradora",
        docente: "Lic. Rivera",
        recurso: "Recurso UCI 002",
        estado: "Asistió",
        observaciones: "Asistencia completa.",
      },
    ];

const FILTER_ALL = "Todos";

function uniqueOptions(rows, key) {
  return [FILTER_ALL, ...new Set(rows.map((row) => row[key]).filter(Boolean))];
}

function statusClass(estado) {
  if (estado === "Asistió") return "aprobado";
  if (estado === "Faltó") return "reprobado";
  if (estado === "Justificado") return "justificado";
  return "pendiente";
}

function calculateSummary(rows) {
  const clasesProgramadas = new Set(rows.map((row) => `${row.fecha}-${row.modulo}-${row.clase}`)).size;
  const asistencias = rows.filter((row) => row.estado === "Asistió" || row.estado === "Tarde").length;
  const faltas = rows.filter((row) => row.estado === "Faltó").length;
  const justificadas = rows.filter((row) => row.estado === "Justificado").length;
  const porcentaje = clasesProgramadas > 0
    ? Math.round(((asistencias + justificadas) / rows.length) * 100)
    : null;

  return { clasesProgramadas, asistencias, faltas, justificadas, porcentaje };
}

export default function AsistenciaGeneral() {
  const [filters, setFilters] = useState({
    modulo: FILTER_ALL,
    recurso: FILTER_ALL,
    estado: FILTER_ALL,
    fecha: "",
  });

  const filteredRows = useMemo(() => {
    return MOCK_ATTENDANCE.filter((row) => {
      const matchesModulo = filters.modulo === FILTER_ALL || row.modulo === filters.modulo;
      const matchesRecurso = filters.recurso === FILTER_ALL || row.recurso === filters.recurso;
      const matchesEstado = filters.estado === FILTER_ALL || row.estado === filters.estado;
      const matchesFecha = !filters.fecha || row.fecha === filters.fecha;
      return matchesModulo && matchesRecurso && matchesEstado && matchesFecha;
    });
  }, [filters]);

  const summary = useMemo(() => calculateSummary(filteredRows), [filteredRows]);

  function setFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <section className="drive-module-view" aria-label="Asistencia general">
      <div className="drive-module-header">
        <div>
          <span className="drive-info-label">Asistencia</span>
          <h2>Control académico por clase</h2>
          <p>
            Vista preparada para calcular asistencia con base en clases registradas en
            el cronograma.
          </p>
        </div>
      </div>

      {MOCK_ATTENDANCE.length === 0 ? (
        <div className="drive-empty-state">
          No hay clases programadas para calcular asistencia
        </div>
      ) : (
        <>
          <div className="drive-filter-bar">
            <label>
              <span>Módulo</span>
              <select value={filters.modulo} onChange={(event) => setFilter("modulo", event.target.value)}>
                {uniqueOptions(MOCK_ATTENDANCE, "modulo").map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Recurso</span>
              <select value={filters.recurso} onChange={(event) => setFilter("recurso", event.target.value)}>
                {uniqueOptions(MOCK_ATTENDANCE, "recurso").map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Estado</span>
              <select value={filters.estado} onChange={(event) => setFilter("estado", event.target.value)}>
                {uniqueOptions(MOCK_ATTENDANCE, "estado").map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Fecha</span>
              <input
                type="date"
                value={filters.fecha}
                onChange={(event) => setFilter("fecha", event.target.value)}
              />
            </label>
          </div>

          <div className="drive-attendance-summary">
            <div>
              <span>Clases programadas</span>
              <strong>{summary.clasesProgramadas}</strong>
            </div>
            <div>
              <span>Asistencias</span>
              <strong>{summary.asistencias}</strong>
            </div>
            <div>
              <span>Faltas</span>
              <strong>{summary.faltas}</strong>
            </div>
            <div>
              <span>Justificadas</span>
              <strong>{summary.justificadas}</strong>
            </div>
            <div>
              <span>Porcentaje</span>
              <strong>{summary.clasesProgramadas > 0 ? `${summary.porcentaje}%` : "Sin datos"}</strong>
            </div>
          </div>

          <div className="drive-notes-table-wrap">
            <table className="drive-notes-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Módulo</th>
                  <th>Clase</th>
                  <th>Docente</th>
                  <th>Recurso</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.fecha}-${row.clase}-${row.recurso}`}>
                    <td>{row.fecha}</td>
                    <td>{row.modulo}</td>
                    <td>{row.clase}</td>
                    <td>{row.docente}</td>
                    <td>{row.recurso}</td>
                    <td>
                      <span className={`drive-status ${statusClass(row.estado)}`}>
                        {row.estado}
                      </span>
                    </td>
                    <td>{row.observaciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
