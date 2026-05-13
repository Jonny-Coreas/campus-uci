import { useMemo, useState } from "react";
import DriveFolderCard from "./drive/DriveFolderCard";

const MODULES = [
  {
    key: "modulo-1",
    title: "Módulo 1",
    description: "Evaluaciones introductorias y controles académicos iniciales.",
  },
  {
    key: "modulo-2",
    title: "Módulo 2",
    description: "Evaluaciones clínicas aplicadas, casos y actividades prácticas.",
  },
  {
    key: "modulo-3",
    title: "Módulo 3",
    description: "Evaluaciones finales, integración de competencias y cierre académico.",
  },
];

const MOCK_NOTES = {
  "modulo-1": [
    {
      recurso: "Recurso UCI 001",
      evaluacion: "Quiz diagnóstico",
      nota: 8.5,
      observaciones: "Buen dominio conceptual.",
    },
    {
      recurso: "Recurso UCI 002",
      evaluacion: "Caso clínico inicial",
      nota: 7.2,
      observaciones: "Reforzar interpretación de signos.",
    },
  ],
  "modulo-2": [],
  "modulo-3": [
    {
      recurso: "Recurso UCI 001",
      evaluacion: "Evaluación integradora",
      nota: 9,
      observaciones: "Desempeño sobresaliente.",
    },
  ],
};

function estadoFromNota(nota) {
  return Number(nota) >= 7 ? "Aprobado" : "Reprobado";
}

function porcentajeFromNota(nota) {
  const n = Number(nota);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n * 10)}%`;
}

export default function NotasGenerales() {
  const [moduleActive, setModuleActive] = useState(null);

  const rows = useMemo(() => {
    if (!moduleActive) return [];
    return MOCK_NOTES[moduleActive.key] || [];
  }, [moduleActive]);

  if (!moduleActive) {
    return (
      <section className="drive-grid" aria-label="Módulos de notas generales">
        {MODULES.map((module) => (
          <DriveFolderCard
            key={module.key}
            title={module.title}
            description={module.description}
            icon="folder"
            tone="indigo"
            badge="Notas"
            meta="Abrir módulo"
            onOpen={() => setModuleActive(module)}
          />
        ))}
      </section>
    );
  }

  return (
    <section className="drive-module-view" aria-label={moduleActive.title}>
      <div className="drive-module-header">
        <div>
          <span className="drive-info-label">Notas Generales</span>
          <h2>{moduleActive.title}</h2>
          <p>
            Tabla académica preparada para conectarse posteriormente con
            especialidad_notas.
          </p>
        </div>

        <button
          type="button"
          className="drive-module-back"
          onClick={() => setModuleActive(null)}
        >
          ← Volver a módulos
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="drive-empty-state">Sin evaluaciones registradas</div>
      ) : (
        <div className="drive-notes-table-wrap">
          <table className="drive-notes-table">
            <thead>
              <tr>
                <th>Recurso</th>
                <th>Evaluación</th>
                <th>Nota</th>
                <th>Porcentaje</th>
                <th>Estado</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.recurso}-${row.evaluacion}`}>
                  <td>{row.recurso}</td>
                  <td>{row.evaluacion}</td>
                  <td>{row.nota}</td>
                  <td>{porcentajeFromNota(row.nota)}</td>
                  <td>
                    <span className={`drive-status ${estadoFromNota(row.nota).toLowerCase()}`}>
                      {estadoFromNota(row.nota)}
                    </span>
                  </td>
                  <td>{row.observaciones || "Sin observaciones"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
