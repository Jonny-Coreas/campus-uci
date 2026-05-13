import { useMemo, useState } from "react";
import DriveFolderCard from "./drive/DriveFolderCard";

const CATEGORIES = [
  {
    key: "guias-clinicas",
    title: "Guías clínicas",
    description: "Documentos de referencia clínica y rutas de atención.",
    tone: "green",
  },
  {
    key: "protocolos",
    title: "Protocolos",
    description: "Protocolos institucionales y procedimientos operativos.",
    tone: "blue",
  },
  {
    key: "normativas",
    title: "Normativas",
    description: "Normas, lineamientos y documentos regulatorios.",
    tone: "slate",
  },
  {
    key: "articulos",
    title: "Artículos científicos",
    description: "Lecturas, publicaciones y evidencia científica.",
    tone: "indigo",
  },
  {
    key: "videos",
    title: "Videos",
    description: "Recursos audiovisuales, demostraciones y clases grabadas.",
    tone: "blue",
  },
  {
    key: "bibliografia",
    title: "Bibliografía",
    description: "Libros, capítulos y fuentes recomendadas.",
    tone: "green",
  },
];

const MOCK_MATERIALS = {
  "guias-clinicas": [
    {
      nombre: "Guía clínica inicial de nefrología crítica",
      tipo: "PDF",
      fecha: "2026-05-02",
      fuente: "Comité académico UCI",
      estado: "Disponible",
    },
  ],
  protocolos: [
    {
      nombre: "Protocolo de manejo intrahospitalario",
      tipo: "Documento",
      fecha: "2026-05-06",
      fuente: "Dirección médica",
      estado: "Disponible",
    },
    {
      nombre: "Checklist de seguridad del paciente",
      tipo: "PDF",
      fecha: "2026-05-08",
      fuente: "Calidad hospitalaria",
      estado: "Pendiente",
    },
  ],
  normativas: [],
  articulos: [
    {
      nombre: "Revisión científica de terapias renales",
      tipo: "Artículo",
      fecha: "2026-04-25",
      fuente: "Journal académico",
      estado: "Disponible",
    },
  ],
  videos: [
    {
      nombre: "Clase grabada de introducción",
      tipo: "Video",
      fecha: "2026-05-04",
      fuente: "Campus UCI",
      estado: "Disponible",
    },
  ],
  bibliografia: [],
};

function statusClass(estado) {
  return estado === "Disponible" ? "aprobado" : "pendiente";
}

export default function MaterialAcademico() {
  const [categoryActive, setCategoryActive] = useState(null);

  const rows = useMemo(() => {
    if (!categoryActive) return [];
    return MOCK_MATERIALS[categoryActive.key] || [];
  }, [categoryActive]);

  if (!categoryActive) {
    return (
      <section className="drive-grid" aria-label="Categorías de material académico">
        {CATEGORIES.map((category) => (
          <DriveFolderCard
            key={category.key}
            title={category.title}
            description={category.description}
            icon="folder"
            tone={category.tone}
            badge="Material"
            meta="Abrir categoría"
            onOpen={() => setCategoryActive(category)}
          />
        ))}
      </section>
    );
  }

  return (
    <section className="drive-module-view" aria-label={categoryActive.title}>
      <div className="drive-module-header">
        <div>
          <span className="drive-info-label">Material Académico</span>
          <h2>{categoryActive.title}</h2>
          <p>{categoryActive.description}</p>
        </div>

        <div className="drive-module-actions">
          <button type="button" className="drive-upload-button">
            Subir material
          </button>
          <button
            type="button"
            className="drive-module-back"
            onClick={() => setCategoryActive(null)}
          >
            ← Volver a categorías
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="drive-empty-state">Sin material académico cargado</div>
      ) : (
        <div className="drive-notes-table-wrap">
          <table className="drive-notes-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Autor/Fuente</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${categoryActive.key}-${row.nombre}`}>
                  <td>{row.nombre}</td>
                  <td>{row.tipo}</td>
                  <td>{row.fecha}</td>
                  <td>{row.fuente}</td>
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
      )}
    </section>
  );
}
