import React, { useMemo, useState } from "react";
import Evaluaciones from "./Evaluaciones";
import Capacitaciones from "./Capacitaciones";
import Asistencia from "./Asistencia";
import MisNotas from "./MisNotas";

const CARPETAS = [
  {
    key: "evaluaciones",
    nombre: "Evaluaciones",
    icono: "📝",
    descripcion: "Exámenes, pruebas clínicas, simulaciones y resultados académicos.",
    componente: Evaluaciones,
  },
  {
    key: "capacitaciones",
    nombre: "Cronograma",
    icono: "🗓️",
    descripcion: "Planificación de clases, actividades y evaluaciones.",
    componente: Capacitaciones,
  },
  {
    key: "asistencia",
    nombre: "Asistencia",
    icono: "🗂️",
    descripcion: "Registro de asistencia a clases, talleres y sesiones académicas.",
    componente: Asistencia,
  },
  {
    key: "mis-notas",
    nombre: "Mis notas",
    icono: "📊",
    descripcion: "Historial académico, promedio general y estado de aprobación.",
    componente: MisNotas,
  },
];

export default function IndexCarpetaAcademica({
  profile = null,
  especialidad = null,
  recurso = null,
  evaluacionActiva = {},
  setEvaluacionActiva = null,
  onBack = null,
}) {
  const [carpetaActiva, setCarpetaActiva] = useState("evaluaciones");

  const carpeta = useMemo(() => {
    return CARPETAS.find((item) => item.key === carpetaActiva) || CARPETAS[0];
  }, [carpetaActiva]);

  const ComponenteActivo = carpeta.componente;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>CAMPUS UCI</div>

          <h1 style={titleStyle}>Carpeta Académica</h1>

          <p style={subtitleStyle}>
            {especialidad?.nombre
              ? `Gestión académica de ${especialidad.nombre}`
              : "Gestión académica hospitalaria por especialidad"}

            {recurso?.nombre
              ? ` · Expediente de ${recurso.nombre}`
              : ""}
          </p>
        </div>

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={backButtonStyle}
          >
            ⬅ Volver
          </button>
        ) : null}
      </div>

      <div style={layoutStyle}>
        <aside style={sidebarStyle}>
          <div style={sidebarTitleStyle}>Carpetas</div>

          <div style={{ display: "grid", gap: 10 }}>
            {CARPETAS.map((item) => {
              const active = item.key === carpetaActiva;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCarpetaActiva(item.key)}
                  style={{
                    ...folderButtonStyle,
                    ...(active ? folderButtonActiveStyle : {}),
                  }}
                >
                  <span style={folderIconStyle}>
                    {item.icono}
                  </span>

                  <span style={{ minWidth: 0 }}>
                    <span style={folderNameStyle}>
                      {item.nombre}
                    </span>

                    <span style={folderDescStyle}>
                      {item.descripcion}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main style={mainStyle}>
          <div style={activeHeaderStyle}>
            <div>
              <div style={activeLabelStyle}>
                Carpeta activa
              </div>

              <div style={activeTitleStyle}>
                {carpeta.icono} {carpeta.nombre}
              </div>

              <div style={activeDescStyle}>
                {carpeta.descripcion}
              </div>
            </div>
          </div>

          <div style={contentStyle}>
            <ComponenteActivo
              profile={profile}
              especialidad={especialidad}
              recurso={recurso}
              evaluacionActiva={evaluacionActiva}
              setEvaluacionActiva={setEvaluacionActiva}
              embedded={true}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

const pageStyle = {
  width: "100%",
  minHeight: "100%",
  background: "#f6f8fc",
  padding: 18,
  boxSizing: "border-box",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 16,
};

const eyebrowStyle = {
  color: "#00AEEF",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 1.8,
};

const titleStyle = {
  margin: "4px 0 0",
  color: "#223b78",
  fontSize: 36,
  lineHeight: 1.05,
  fontWeight: 900,
  letterSpacing: -0.8,
};

const subtitleStyle = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 14,
  fontWeight: 700,
};

const layoutStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(250px, 310px) minmax(0, 1fr)",
  gap: 16,
  alignItems: "start",
};

const sidebarStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 22,
  background: "white",
  padding: 14,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  position: "sticky",
  top: 14,
};

const sidebarTitleStyle = {
  fontWeight: 900,
  color: "#223b78",
  marginBottom: 12,
  fontSize: 16,
};

const folderButtonStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "38px 1fr",
  gap: 10,
  alignItems: "center",
  textAlign: "left",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  borderRadius: 16,
  padding: 11,
  cursor: "pointer",
};

const folderButtonActiveStyle = {
  border: "2px solid #00AEEF",
  background: "#eff6ff",
  boxShadow: "0 8px 20px rgba(0, 174, 239, 0.12)",
};

const folderIconStyle = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  borderRadius: 14,
  background: "#f1f5f9",
  fontSize: 20,
};

const folderNameStyle = {
  display: "block",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 900,
};

const folderDescStyle = {
  display: "block",
  marginTop: 3,
  color: "#64748b",
  fontSize: 11,
  lineHeight: 1.25,
};

const mainStyle = {
  minWidth: 0,
  display: "grid",
  gap: 14,
};

const activeHeaderStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 22,
  background: "white",
  padding: 16,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const activeLabelStyle = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: 1,
};

const activeTitleStyle = {
  marginTop: 4,
  color: "#223b78",
  fontSize: 24,
  fontWeight: 900,
};

const activeDescStyle = {
  marginTop: 5,
  color: "#64748b",
  fontSize: 14,
  fontWeight: 700,
};

const contentStyle = {
  minWidth: 0,
};

const backButtonStyle = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid #00AEEF",
  background: "white",
  color: "#0077a3",
  cursor: "pointer",
  fontWeight: 900,
};
