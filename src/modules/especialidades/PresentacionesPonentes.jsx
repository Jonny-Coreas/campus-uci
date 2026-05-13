import { useState } from "react";
import DriveFolderCard from "./drive/DriveFolderCard";

const MODULES = [
  {
    key: "modulo-1",
    title: "Módulo 1",
    description: "Fundamentos, conceptos base y material introductorio de la especialidad.",
  },
  {
    key: "modulo-2",
    title: "Módulo 2",
    description: "Manejo clínico, protocolos y recursos de soporte para la práctica.",
  },
  {
    key: "modulo-3",
    title: "Módulo 3",
    description: "Integración avanzada, casos aplicados y cierre académico del bloque.",
  },
];

const FILES_BY_MODULE = {
  "modulo-1": [
    { type: "pdf", title: "Introducción al módulo.pdf", meta: "PDF" },
    { type: "ppt", title: "Clase magistral inicial.pptx", meta: "PowerPoint" },
    { type: "video", title: "Video de bienvenida.mp4", meta: "Video" },
    { type: "guide", title: "Guía clínica base.docx", meta: "Guía clínica" },
  ],
  "modulo-2": [
    { type: "pdf", title: "Protocolos del módulo.pdf", meta: "PDF" },
    { type: "ppt", title: "Presentación de casos.pptx", meta: "PowerPoint" },
    { type: "video", title: "Demostración práctica.mp4", meta: "Video" },
    { type: "guide", title: "Guía clínica aplicada.docx", meta: "Guía clínica" },
  ],
  "modulo-3": [
    { type: "pdf", title: "Resumen final.pdf", meta: "PDF" },
    { type: "ppt", title: "Cierre académico.pptx", meta: "PowerPoint" },
    { type: "video", title: "Discusión de escenarios.mp4", meta: "Video" },
    { type: "guide", title: "Guía clínica avanzada.docx", meta: "Guía clínica" },
  ],
};

function FileIcon({ type }) {
  const label = {
    pdf: "PDF",
    ppt: "PPT",
    video: "▶",
    guide: "DOC",
  }[type] || "DOC";

  return <span className={`drive-file-icon ${type}`}>{label}</span>;
}

export default function PresentacionesPonentes() {
  const [moduleActive, setModuleActive] = useState(null);

  if (!moduleActive) {
    return (
      <section className="drive-grid" aria-label="Módulos de presentaciones ponentes">
        {MODULES.map((module) => (
          <DriveFolderCard
            key={module.key}
            title={module.title}
            description={module.description}
            icon="folder"
            tone="blue"
            badge="Módulo"
            meta="Abrir módulo"
            onOpen={() => setModuleActive(module)}
          />
        ))}
      </section>
    );
  }

  const files = FILES_BY_MODULE[moduleActive.key] || [];

  return (
    <section className="drive-module-view" aria-label={moduleActive.title}>
      <div className="drive-module-header">
        <div>
          <span className="drive-info-label">Presentaciones Ponentes</span>
          <h2>{moduleActive.title}</h2>
          <p>{moduleActive.description}</p>
        </div>

        <button
          type="button"
          className="drive-module-back"
          onClick={() => setModuleActive(null)}
        >
          ← Volver a módulos
        </button>
      </div>

      <div className="drive-file-grid">
        {files.map((file) => (
          <article className="drive-file-card" key={`${moduleActive.key}-${file.title}`}>
            <FileIcon type={file.type} />
            <div>
              <strong>{file.title}</strong>
              <span>{file.meta}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
