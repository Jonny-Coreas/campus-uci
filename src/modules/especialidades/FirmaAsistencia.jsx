import { useMemo, useState } from "react";
import DriveFolderCard from "./drive/DriveFolderCard";

const MODULES = [
  {
    key: "modulo-1",
    title: "Módulo 1",
    description: "Evidencias de asistencia firmada de las clases introductorias.",
  },
  {
    key: "modulo-2",
    title: "Módulo 2",
    description: "Firmas y escaneos de asistencia de sesiones clínicas aplicadas.",
  },
  {
    key: "modulo-3",
    title: "Módulo 3",
    description: "Evidencias firmadas del cierre académico y actividades finales.",
  },
];

const MOCK_EVIDENCES = {
  "modulo-1": [
    {
      type: "photo",
      title: "Foto de hoja firmada",
      fecha: "2026-05-04",
      clase: "Introducción a la especialidad",
      docente: "Dra. Martínez",
      estado: "Cargado",
    },
    {
      type: "pdf",
      title: "PDF escaneado",
      fecha: "2026-05-06",
      clase: "Fundamentos clínicos",
      docente: "Dr. Coreas",
      estado: "Cargado",
    },
  ],
  "modulo-2": [],
  "modulo-3": [
    {
      type: "photo",
      title: "Foto de hoja firmada",
      fecha: "2026-06-01",
      clase: "Cierre de módulo",
      docente: "Lic. Rivera",
      estado: "Pendiente",
    },
  ],
};

function EvidenceIcon({ type }) {
  return (
    <span className={`drive-evidence-icon ${type}`}>
      {type === "pdf" ? "PDF" : "IMG"}
    </span>
  );
}

export default function FirmaAsistencia() {
  const [moduleActive, setModuleActive] = useState(null);

  const evidences = useMemo(() => {
    if (!moduleActive) return [];
    return MOCK_EVIDENCES[moduleActive.key] || [];
  }, [moduleActive]);

  if (!moduleActive) {
    return (
      <section className="drive-grid" aria-label="Módulos de firma de asistencia">
        {MODULES.map((module) => (
          <DriveFolderCard
            key={module.key}
            title={module.title}
            description={module.description}
            icon="folder"
            tone="green"
            badge="Firmas"
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
          <span className="drive-info-label">Firma de Asistencia</span>
          <h2>{moduleActive.title}</h2>
          <p>
            Evidencias visuales y escaneos de hojas de asistencia firmadas. La carga
            real se conectará después con Supabase Storage.
          </p>
        </div>

        <div className="drive-module-actions">
          <button type="button" className="drive-upload-button">
            Subir evidencia
          </button>
          <button
            type="button"
            className="drive-module-back"
            onClick={() => setModuleActive(null)}
          >
            ← Volver a módulos
          </button>
        </div>
      </div>

      {evidences.length === 0 ? (
        <div className="drive-empty-state">Sin evidencias cargadas</div>
      ) : (
        <div className="drive-evidence-grid">
          {evidences.map((item) => (
            <article className="drive-evidence-card" key={`${item.fecha}-${item.clase}`}>
              <div className="drive-evidence-preview">
                <EvidenceIcon type={item.type} />
              </div>

              <div className="drive-evidence-body">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.clase}</span>
                </div>

                <dl>
                  <div>
                    <dt>Fecha</dt>
                    <dd>{item.fecha}</dd>
                  </div>
                  <div>
                    <dt>Docente</dt>
                    <dd>{item.docente}</dd>
                  </div>
                </dl>

                <span className={`drive-status ${item.estado === "Cargado" ? "aprobado" : "pendiente"}`}>
                  {item.estado}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
