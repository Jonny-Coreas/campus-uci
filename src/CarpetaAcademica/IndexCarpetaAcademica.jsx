import React, { useMemo, useState } from "react";
import Evaluaciones from "./Evaluaciones";
import Capacitaciones from "./Capacitaciones";
import Asistencia from "./Asistencia";
import MisNotas from "./MisNotas";
import { isAdminOrJefe, isDocente, isRecurso } from "../auth/roles";

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
  const canManageAcademic = isAdminOrJefe(profile) || isDocente(profile);
  const readOnly = profile ? isRecurso(profile) : false;

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
              ? `${readOnly ? "Expediente e historial académico de" : "Gestión académica de"} ${especialidad.nombre}`
              : readOnly
                ? "Expediente académico hospitalario de consulta"
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
          {readOnly ? (
            <section style={summaryStyle}>
              <div style={summaryAvatarStyle}>
                {String(recurso?.nombre || profile?.nombre || "U").slice(0, 1).toUpperCase()}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={summaryLabelStyle}>Vista de consulta</div>
                <h2 style={summaryTitleStyle}>
                  {recurso?.nombre || profile?.nombre || "Recurso en formación"}
                </h2>
                <p style={summaryTextStyle}>
                  CUM: {recurso?.cum || profile?.cum || "No asignado"} · Especialidad:{" "}
                  {especialidad?.nombre || "Sin especialidad asignada"}
                </p>
              </div>

              <div style={summaryBadgeStyle}>Solo lectura</div>
            </section>
          ) : null}

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
              readOnly={readOnly}
              canManageAcademic={canManageAcademic}
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

const summaryStyle = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 14,
  border: "1px solid #dbeafe",
  borderRadius: 22,
  background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
  padding: 16,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
};

const summaryAvatarStyle = {
  width: 56,
  height: 56,
  borderRadius: 18,
  background: "linear-gradient(135deg, #2563eb, #0f766e)",
  color: "white",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 22,
  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.2)",
};

const summaryLabelStyle = {
  color: "#0284c7",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1.1,
  textTransform: "uppercase",
};

const summaryTitleStyle = {
  margin: "3px 0",
  color: "#0f2f68",
  fontSize: 22,
  lineHeight: 1.1,
};

const summaryTextStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const summaryBadgeStyle = {
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 900,
  padding: "8px 12px",
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
