import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const ESTADOS = ["Pendiente", "Asistió", "Ausente", "Tardanza", "Justificado"];
const TIPOS = ["Clase en vivo", "Taller práctico", "Simulación", "Foro", "Examen", "Práctica supervisada"];
const MODALIDADES = ["Online en vivo", "Presencial", "Mixta", "Grabación", "Simulación clínica"];

const DEMO_ROWS = [
  { fecha: "2024-05-06", actividad: "Fundamentos avanzados de ECMO", tipo: "Clase en vivo", modalidad: "Online en vivo", estado: "Asistió", observaciones: "—" },
  { fecha: "2024-05-13", actividad: "Manejo hemodinámico en ECMO", tipo: "Clase en vivo", modalidad: "Online en vivo", estado: "Asistió", observaciones: "—" },
  { fecha: "2024-05-20", actividad: "Anticoagulación y complicaciones", tipo: "Taller práctico", modalidad: "Online en vivo", estado: "Asistió", observaciones: "Participación activa" },
  { fecha: "2024-05-27", actividad: "ECMO en escenarios complejos", tipo: "Simulación", modalidad: "Online en vivo", estado: "Asistió", observaciones: "—" },
  { fecha: "2024-06-03", actividad: "Destete y decanulación", tipo: "Clase en vivo", modalidad: "Online en vivo", estado: "Ausente", observaciones: "Sin justificación" },
  { fecha: "2024-06-10", actividad: "Complicaciones neurológicas", tipo: "Taller práctico", modalidad: "Online en vivo", estado: "Asistió", observaciones: "—" },
  { fecha: "2024-06-17", actividad: "Gestión del programa de ECMO", tipo: "Foro", modalidad: "Online en vivo", estado: "Asistió", observaciones: "Aporte en foro" },
  { fecha: "2024-06-24", actividad: "Revisión y certificación final", tipo: "Examen", modalidad: "Online en vivo", estado: "Asistió", observaciones: "—" },
];

const emptyForm = {
  fecha: new Date().toISOString().slice(0, 10),
  actividad: "",
  tipo: "Clase en vivo",
  modalidad: "Online en vivo",
  estado: "Pendiente",
  observaciones: "",
};

export default function Asistencia({
  especialidad = null,
  recurso = null,
  profile = null,
  embedded = true,
}) {
  const especialidadId = especialidad?.id || null;
  const recursoId = recurso?.profile_id || recurso?.id || null;

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId, recursoId]);

  async function cargarAsistencia() {
    if (!especialidadId || !recursoId) {
      setRows(DEMO_ROWS.map((row, index) => ({ ...row, id: `demo-${index}` })));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("especialidad_asistencia")
        .select("*")
        .eq("especialidad_id", especialidadId)
        .eq("recurso_id", recursoId)
        .order("fecha", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setRows([]);
      } else {
        setRows(data);
      }
    } catch (error) {
      console.error("Error cargando asistencia:", error);
      alert(`No se pudo cargar asistencia: ${error.message || error}`);
      setRows(DEMO_ROWS.map((row, index) => ({ ...row, id: `demo-${index}` })));
    } finally {
      setLoading(false);
    }
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      fecha: row.fecha || new Date().toISOString().slice(0, 10),
      actividad: row.actividad || "",
      tipo: row.tipo || "Clase en vivo",
      modalidad: row.modalidad || "Online en vivo",
      estado: row.estado || "Asistió",
      observaciones: row.observaciones || "",
    });
    setShowForm(true);
  }

  async function guardar(e) {
    e.preventDefault();

    if (!form.fecha) return alert("Falta la fecha.");
    if (!form.actividad.trim()) return alert("Falta la actividad.");

    if (!especialidadId || !recursoId) {
      const localRow = {
        ...form,
        id: editingId || `local-${Date.now()}`,
      };

      if (editingId) {
        setRows((prev) => prev.map((row) => (row.id === editingId ? localRow : row)));
      } else {
        setRows((prev) => [...prev, localRow]);
      }

      resetForm();
      setShowForm(false);
      return;
    }

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();

      const payload = {
        especialidad_id: especialidadId,
        recurso_id: recursoId,
        created_by: authData?.user?.id || profile?.user_id || null,
        fecha: form.fecha,
        actividad: form.actividad.trim(),
        tipo: form.tipo,
        modalidad: form.modalidad,
        estado: form.estado,
        observaciones: form.observaciones.trim() || null,
      };

      if (editingId && !String(editingId).startsWith("demo-") && !String(editingId).startsWith("local-")) {
        const { error } = await supabase
          .from("especialidad_asistencia")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("especialidad_asistencia")
          .insert(payload);

        if (error) throw error;
      }

      resetForm();
      setShowForm(false);
      await cargarAsistencia();
    } catch (error) {
      console.error("Error guardando asistencia:", error);
      alert(`No se pudo guardar: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  async function borrar(row) {
    const ok = window.confirm("¿Seguro que querés borrar este registro de asistencia?");
    if (!ok) return;

    if (String(row.id).startsWith("demo-") || String(row.id).startsWith("local-")) {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("especialidad_asistencia")
        .delete()
        .eq("id", row.id);

      if (error) throw error;
      await cargarAsistencia();
    } catch (error) {
      console.error("Error borrando asistencia:", error);
      alert(`No se pudo borrar: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const asistencias = rows.filter((r) => r.estado === "Asistió" || r.estado === "Tardanza" || r.estado === "Justificado").length;
    const ausencias = rows.filter((r) => r.estado === "Ausente").length;
    const pendientes = rows.filter((r) => r.estado === "Pendiente").length;
    const porcentaje = total ? (asistencias / total) * 100 : 0;

    return { total, asistencias, ausencias, pendientes, porcentaje };
  }, [rows]);

  function estadoIcon(estado) {
    if (estado === "Asistió") return "✅";
    if (estado === "Ausente") return "❌";
    if (estado === "Tardanza") return "🕘";
    if (estado === "Justificado") return "🟡";
    if (estado === "Pendiente") return "⏳";
    return "—";
  }

  function estadoColor(estado) {
    if (estado === "Asistió") return "#16a34a";
    if (estado === "Ausente") return "#dc2626";
    if (estado === "Tardanza") return "#ca8a04";
    if (estado === "Justificado") return "#9333ea";
    if (estado === "Pendiente") return "#64748b";
    return "#334155";
  }

  return (
    <div style={embedded ? wrapperEmbedded : wrapperFull}>
      <section style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={labelStyle}>CARPETA ACTIVA</div>
            <h2 style={titleStyle}>🗂️ Asistencia</h2>
            <p style={subtitleStyle}>
              Registro de asistencia conectado automáticamente al cronograma académico.
              {recurso?.nombre ? ` Expediente de ${recurso.nombre}.` : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={badgeStyle}>{especialidad?.nombre || "Especialidad"}</span>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm((prev) => !prev);
              }}
              style={btnPrimary}
            >
              {showForm ? "Cerrar" : "+ Registro manual"}
            </button>
          </div>
        </div>

        <div style={summaryCardStyle}>
          <h3 style={sectionTitleStyle}>Resumen general</h3>

          <div style={summaryGridStyle}>
            <Metric icon="🗓️" value={stats.total} label="Clases programadas" tone="#0ea5e9" />
            <Metric icon="✅" value={stats.asistencias} label="Asistencias" tone="#16a34a" />
            <Metric icon="🕘" value={stats.ausencias} label="Ausencias" tone="#f59e0b" />
            <Metric icon="⏳" value={stats.pendientes} label="Pendientes" tone="#64748b" />
            <Metric icon="%" value={`${stats.porcentaje.toFixed(1)}%`} label="Porcentaje de asistencia" tone="#9333ea" />
          </div>
        </div>

        {showForm ? (
          <form onSubmit={guardar} style={formCardStyle}>
            <h3 style={formTitleStyle}>{editingId ? "Editar asistencia" : "Nuevo registro de asistencia"}</h3>

            <div style={formGridStyle}>
              <label style={fieldStyle}>
                <span style={miniLabel}>Fecha</span>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setField("fecha", e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                <span style={miniLabel}>Estado</span>
                <select
                  value={form.estado}
                  onChange={(e) => setField("estado", e.target.value)}
                  style={inputStyle}
                >
                  {ESTADOS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label style={fieldStyle}>
              <span style={miniLabel}>Actividad</span>
              <input
                value={form.actividad}
                onChange={(e) => setField("actividad", e.target.value)}
                placeholder="Ej: Fundamentos avanzados de ECMO"
                style={inputStyle}
              />
            </label>

            <div style={formGridStyle}>
              <label style={fieldStyle}>
                <span style={miniLabel}>Tipo</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setField("tipo", e.target.value)}
                  style={inputStyle}
                >
                  {TIPOS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span style={miniLabel}>Modalidad</span>
                <select
                  value={form.modalidad}
                  onChange={(e) => setField("modalidad", e.target.value)}
                  style={inputStyle}
                >
                  {MODALIDADES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <label style={fieldStyle}>
              <span style={miniLabel}>Observaciones</span>
              <input
                value={form.observaciones}
                onChange={(e) => setField("observaciones", e.target.value)}
                placeholder="Ej: Participación activa / Sin justificación"
                style={inputStyle}
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={loading} style={btnSave}>
                {loading ? "Guardando..." : editingId ? "Actualizar asistencia" : "Guardar asistencia"}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                style={btnSecondary}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        <div style={tableCardStyle}>
          <div style={tableHeaderStyle}>
            <h3 style={sectionTitleStyle}>Registro de asistencia</h3>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Actividad</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Modalidad</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Observaciones</th>
                  <th style={thStyle}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={tdStyle}>No hay registros de asistencia todavía.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdDateStyle}>🗓️ {row.fecha || "—"}</td>
                      <td style={tdStrongStyle}>{row.actividad || "—"}</td>
                      <td style={tdStyle}>
                        <span style={tagStyle}>{row.tipo || "—"}</span>
                      </td>
                      <td style={tdStyle}>{row.modalidad || "—"}</td>
                      <td style={{ ...tdStyle, color: estadoColor(row.estado), fontWeight: 900 }}>
                        {estadoIcon(row.estado)} {row.estado || "—"}
                      </td>
                      <td style={tdStyle}>{row.observaciones || "—"}</td>
                      <td style={tdActionStyle}>
                        <button type="button" onClick={() => startEdit(row)} style={btnTinyBlue}>
                          Editar
                        </button>
                        <button type="button" onClick={() => borrar(row)} style={btnTinyRed}>
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={footerNoteStyle}>
          ℹ️ La asistencia mínima requerida para aprobación es del 80%.
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, value, label, tone }) {
  return (
    <div style={metricStyle}>
      <div style={{ ...metricIconStyle, background: `${tone}22`, color: tone }}>{icon}</div>
      <div>
        <div style={metricValueStyle}>{value}</div>
        <div style={metricLabelStyle}>{label}</div>
      </div>
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

const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid #00AEEF",
  background: "#00AEEF",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const summaryCardStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 20,
  background: "white",
  padding: 16,
  marginBottom: 16,
};

const sectionTitleStyle = {
  margin: 0,
  color: "#223b78",
  fontSize: 18,
  fontWeight: 900,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginTop: 14,
};

const metricStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "white",
};

const metricIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: 21,
  fontWeight: 900,
};

const metricValueStyle = {
  color: "#223b78",
  fontSize: 26,
  fontWeight: 900,
  lineHeight: 1,
};

const metricLabelStyle = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  marginTop: 4,
};

const formCardStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 20,
  background: "#f8fbff",
  padding: 16,
  display: "grid",
  gap: 12,
  marginBottom: 16,
};

const formTitleStyle = {
  margin: 0,
  color: "#223b78",
  fontSize: 20,
  fontWeight: 900,
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const miniLabel = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #dbeafe",
  borderRadius: 14,
  padding: "11px 12px",
  outline: "none",
  background: "white",
  color: "#0f172a",
  fontWeight: 700,
};

const btnSave = {
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const btnSecondary = {
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid #dbeafe",
  background: "white",
  color: "#223b78",
  cursor: "pointer",
  fontWeight: 900,
};

const tableCardStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 20,
  overflow: "hidden",
  background: "white",
};

const tableHeaderStyle = {
  padding: "16px 16px 10px",
};

const tableWrapStyle = {
  overflowX: "auto",
};

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

const tdDateStyle = {
  ...tdStyle,
  color: "#64748b",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const tdStrongStyle = {
  ...tdStyle,
  color: "#111827",
  fontWeight: 900,
};

const tdActionStyle = {
  ...tdStyle,
  whiteSpace: "nowrap",
};

const tagStyle = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  background: "#e0f2fe",
  color: "#00AEEF",
  fontSize: 12,
  fontWeight: 900,
};

const btnTinyBlue = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #00AEEF",
  background: "#e0f2fe",
  color: "#0077a3",
  cursor: "pointer",
  fontWeight: 900,
  marginRight: 6,
};

const btnTinyRed = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fee2e2",
  color: "#991b1b",
  cursor: "pointer",
  fontWeight: 900,
};

const footerNoteStyle = {
  marginTop: 16,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
};
