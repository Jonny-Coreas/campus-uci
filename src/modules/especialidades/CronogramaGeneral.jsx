import { useMemo, useState } from "react";

const EMPTY_MODE = false;

const MOCK_CLASSES = EMPTY_MODE
  ? []
  : [
      {
        fecha: "2026-05-04",
        inicio: "08:00",
        fin: "10:00",
        modulo: "Módulo 1",
        tema: "Introducción a la especialidad",
        docente: "Dra. Martínez",
        modalidad: "Presencial",
        lugar: "Aula UCI 1",
        estado: "Realizada",
      },
      {
        fecha: "2026-05-11",
        inicio: "09:00",
        fin: "11:30",
        modulo: "Módulo 2",
        tema: "Manejo clínico aplicado",
        docente: "Dr. Coreas",
        modalidad: "Mixta",
        lugar: "Auditorio Hospitalario",
        estado: "Programada",
      },
      {
        fecha: "2026-05-18",
        inicio: "13:00",
        fin: "15:00",
        modulo: "Módulo 3",
        tema: "Evaluación integradora",
        docente: "Lic. Rivera",
        modalidad: "Online en vivo",
        lugar: "Campus virtual",
        estado: "Reprogramada",
      },
      {
        fecha: "2026-05-25",
        inicio: "08:30",
        fin: "10:30",
        modulo: "Módulo 1",
        tema: "Taller de protocolos",
        docente: "Dra. Martínez",
        modalidad: "Presencial",
        lugar: "Sala de simulación",
        estado: "Cancelada",
      },
    ];

const FILTER_ALL = "Todos";

function uniqueOptions(rows, key) {
  return [FILTER_ALL, ...new Set(rows.map((row) => row[key]).filter(Boolean))];
}

function statusClass(estado) {
  if (estado === "Realizada") return "aprobado";
  if (estado === "Cancelada") return "reprobado";
  if (estado === "Reprogramada") return "justificado";
  return "pendiente";
}

export default function CronogramaGeneral() {
  const [filters, setFilters] = useState({
    modulo: FILTER_ALL,
    docente: FILTER_ALL,
    estado: FILTER_ALL,
    fecha: "",
  });

  const filteredRows = useMemo(() => {
    return MOCK_CLASSES.filter((row) => {
      const matchesModulo = filters.modulo === FILTER_ALL || row.modulo === filters.modulo;
      const matchesDocente = filters.docente === FILTER_ALL || row.docente === filters.docente;
      const matchesEstado = filters.estado === FILTER_ALL || row.estado === filters.estado;
      const matchesFecha = !filters.fecha || row.fecha === filters.fecha;
      return matchesModulo && matchesDocente && matchesEstado && matchesFecha;
    });
  }, [filters]);

  function setFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <section className="drive-module-view" aria-label="Cronograma general">
      <div className="drive-module-header">
        <div>
          <span className="drive-info-label">Cronograma</span>
          <h2>Programación de clases</h2>
          <p>
            Programación académica por módulo, tema, ponente, modalidad y lugar.
            Esta vista queda lista para conectarse posteriormente al cronograma real.
          </p>
        </div>

        <button type="button" className="drive-upload-button">
          Agregar clase
        </button>
      </div>

      {MOCK_CLASSES.length === 0 ? (
        <div className="drive-empty-state">No hay clases programadas</div>
      ) : (
        <>
          <div className="drive-filter-bar">
            <label>
              <span>Módulo</span>
              <select value={filters.modulo} onChange={(event) => setFilter("modulo", event.target.value)}>
                {uniqueOptions(MOCK_CLASSES, "modulo").map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Docente</span>
              <select value={filters.docente} onChange={(event) => setFilter("docente", event.target.value)}>
                {uniqueOptions(MOCK_CLASSES, "docente").map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Estado</span>
              <select value={filters.estado} onChange={(event) => setFilter("estado", event.target.value)}>
                {uniqueOptions(MOCK_CLASSES, "estado").map((option) => (
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

          <div className="drive-notes-table-wrap">
            <table className="drive-notes-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora inicio</th>
                  <th>Hora fin</th>
                  <th>Módulo</th>
                  <th>Tema / Clase</th>
                  <th>Docente / Ponente</th>
                  <th>Modalidad</th>
                  <th>Aula / Lugar</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.fecha}-${row.inicio}-${row.tema}`}>
                    <td>{row.fecha}</td>
                    <td>{row.inicio}</td>
                    <td>{row.fin}</td>
                    <td>{row.modulo}</td>
                    <td>{row.tema}</td>
                    <td>{row.docente}</td>
                    <td>{row.modalidad}</td>
                    <td>{row.lugar}</td>
                    <td>
                      <span className={`drive-status ${statusClass(row.estado)}`}>
                        {row.estado}
                      </span>
                    </td>
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
