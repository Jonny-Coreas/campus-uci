import React, { useMemo } from "react";

const CRONOGRAMA_BASE = [
  {
    semana: "Semana 1",
    tema: "Fundamentos avanzados de ECMO",
    contenido: "Fisiología avanzada, indicaciones, contraindicaciones y modalidades.",
    actividad: "Clase en vivo + lecturas",
    evaluacion: "✅ Quiz",
  },
  {
    semana: "Semana 2",
    tema: "Manejo hemodinámico en ECMO",
    contenido: "Monitoreo avanzado, flujos, vasoactivos y objetivos clínicos.",
    actividad: "Casos clínicos interactivos",
    evaluacion: "✅ Caso clínico",
  },
  {
    semana: "Semana 3",
    tema: "Anticoagulación y complicaciones",
    contenido: "Estrategias de anticoagulación, sangrado, trombosis y hemólisis.",
    actividad: "Taller práctico + discusión",
    evaluacion: "✅ Quiz",
  },
  {
    semana: "Semana 4",
    tema: "ECMO en escenarios complejos",
    contenido: "ECMO en ECPR, falla ventricular derecha y pacientes pediátricos.",
    actividad: "Simulación clínica",
    evaluacion: "✅ Caso clínico",
  },
  {
    semana: "Semana 5",
    tema: "Destete y decanulación",
    contenido: "Criterios de destete, pruebas, proceso y seguimiento.",
    actividad: "Clase en vivo + protocolos",
    evaluacion: "✅ Quiz",
  },
  {
    semana: "Semana 6",
    tema: "Complicaciones neurológicas y monitoreo avanzado",
    contenido: "Monitoreo neurológico, sedación, prevención y manejo.",
    actividad: "Taller de simulación",
    evaluacion: "✅ Caso clínico",
  },
  {
    semana: "Semana 7",
    tema: "Gestión del programa de ECMO",
    contenido: "Organización, equipo multidisciplinario e indicadores de calidad.",
    actividad: "Foro + trabajo en equipo",
    evaluacion: "✅ Proyecto",
  },
  {
    semana: "Semana 8",
    tema: "Revisión y certificación final",
    contenido: "Repaso integral de contenidos, resolución de casos y examen final.",
    actividad: "Examen final en línea",
    evaluacion: "✅ Examen final",
  },
];

function buildCronograma(especialidadNombre = "") {
  const nombre = String(especialidadNombre || "").toLowerCase();

  if (nombre.includes("hemo")) {
    return [
      {
        semana: "Semana 1",
        tema: "Fundamentos de hemodiálisis en UCI",
        contenido: "Principios, indicaciones, objetivos terapéuticos y seguridad del paciente.",
        actividad: "Clase en vivo + lectura dirigida",
        evaluacion: "✅ Quiz",
      },
      {
        semana: "Semana 2",
        tema: "Accesos vasculares y preparación del equipo",
        contenido: "Catéteres, líneas, cebado, verificación y prevención de infecciones.",
        actividad: "Demostración práctica",
        evaluacion: "✅ Checklist",
      },
      {
        semana: "Semana 3",
        tema: "Parámetros y prescripción de hemodiálisis",
        contenido: "Flujo sanguíneo, dializado, ultrafiltración, anticoagulación y alarmas.",
        actividad: "Casos clínicos",
        evaluacion: "✅ Caso clínico",
      },
      {
        semana: "Semana 4",
        tema: "Monitoreo del paciente crítico",
        contenido: "Signos de alarma, hipotensión, balance hídrico y respuesta clínica.",
        actividad: "Simulación clínica",
        evaluacion: "✅ Quiz",
      },
      {
        semana: "Semana 5",
        tema: "Complicaciones intradiálisis",
        contenido: "Hipotensión, coagulación del circuito, arritmias, sangrado y eventos adversos.",
        actividad: "Taller de resolución",
        evaluacion: "✅ Caso clínico",
      },
      {
        semana: "Semana 6",
        tema: "Bioseguridad y control de infecciones",
        contenido: "Limpieza, desinfección, manipulación de catéter y trazabilidad.",
        actividad: "Práctica supervisada",
        evaluacion: "✅ Checklist",
      },
      {
        semana: "Semana 7",
        tema: "Gestión de calidad en terapia dialítica",
        contenido: "Indicadores, registros, seguridad, continuidad y trabajo multidisciplinario.",
        actividad: "Foro + análisis",
        evaluacion: "✅ Proyecto",
      },
      {
        semana: "Semana 8",
        tema: "Evaluación integral y certificación",
        contenido: "Repaso general, casos integrados y evaluación final.",
        actividad: "Examen final",
        evaluacion: "✅ Examen final",
      },
    ];
  }

  return CRONOGRAMA_BASE;
}

export default function Capacitaciones({
  especialidad = null,
  recurso = null,
  embedded = true,
}) {
  const especialidadNombre = especialidad?.nombre || "ECMO";
  const cronograma = useMemo(() => buildCronograma(especialidadNombre), [especialidadNombre]);
  const duracion = `${cronograma.length} semanas`;

  return (
    <div style={embedded ? wrapperEmbedded : wrapperFull}>
      <section style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={labelStyle}>CARPETA ACTIVA</div>
            <h2 style={titleStyle}>🗓️ Cronograma</h2>
            <p style={subtitleStyle}>
              Planificación de clases académicas {especialidadNombre}.
              {recurso?.nombre ? ` Expediente de ${recurso.nombre}.` : ""}
            </p>
          </div>

          <span style={badgeStyle}>ECMO</span>
        </div>

        <div style={tableCardStyle}>
          <div style={tableHeaderStyle}>
            <h3 style={tableTitleStyle}>Cronograma de clases</h3>
            <div style={metaRowStyle}>
              <span>🗓️ Duración total: <strong>{duracion}</strong></span>
              <span>|</span>
              <span>🕘 Modalidad: <strong>Online en vivo + Grabaciones</strong></span>
            </div>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Semana</th>
                  <th style={thStyle}>Tema principal</th>
                  <th style={thStyle}>Contenido destacado</th>
                  <th style={thStyle}>Actividad</th>
                  <th style={thStyle}>Evaluación</th>
                </tr>
              </thead>

              <tbody>
                {cronograma.map((item) => (
                  <tr key={item.semana}>
                    <td style={tdSemanaStyle}>🗓️ {item.semana}</td>
                    <td style={tdStrongStyle}>{item.tema}</td>
                    <td style={tdStyle}>{item.contenido}</td>
                    <td style={tdStyle}>{item.actividad}</td>
                    <td style={tdEvalStyle}>{item.evaluacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={noteGridStyle}>
          <div style={noteBoxStyle}>
            <strong>📘 Uso académico:</strong>
            <span> este cronograma organiza clases, temas y actividades por semana.</span>
          </div>

          <div style={noteBoxStyle}>
            <strong>📝 Evaluaciones:</strong>
            <span> las notas, casos clínicos y resultados se registran en la carpeta Evaluaciones.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

const wrapperEmbedded = { width: "100%" };

const wrapperFull = {
  minHeight: "100vh",
  background: "#f6f8fc",
  padding: 18,
};

const panelStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 22,
  background: "white",
  padding: 18,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 18,
};

const labelStyle = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 2.2,
};

const titleStyle = {
  margin: "4px 0 4px",
  color: "#223b78",
  fontSize: 34,
  lineHeight: 1,
  fontWeight: 900,
};

const subtitleStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 15,
  fontWeight: 800,
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  background: "#e0f2fe",
  color: "#00AEEF",
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: 1.8,
};

const tableCardStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 20,
  overflow: "hidden",
  background: "white",
};

const tableHeaderStyle = {
  padding: "18px 18px 10px",
};

const tableTitleStyle = {
  margin: 0,
  color: "#223b78",
  fontSize: 22,
  fontWeight: 900,
};

const metaRowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: 10,
  color: "#64748b",
  fontSize: 14,
  fontWeight: 800,
};

const tableWrapStyle = { overflowX: "auto" };

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 980,
};

const thStyle = {
  background: "#1e3a8a",
  color: "white",
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: 14,
  fontWeight: 650,
  verticalAlign: "top",
};

const tdSemanaStyle = {
  ...tdStyle,
  color: "#00AEEF",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const tdStrongStyle = {
  ...tdStyle,
  color: "#111827",
  fontWeight: 900,
};

const tdEvalStyle = {
  ...tdStyle,
  color: "#0f172a",
  fontWeight: 900,
};

const noteGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 16,
};

const noteBoxStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 16,
  background: "#f8fbff",
  padding: 14,
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.5,
};
