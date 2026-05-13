import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const emptyForm = {
  semana: "",
  fecha: new Date().toISOString().slice(0, 10),
  tema: "",
  contenido: "",
  actividad: "",
  evaluacion: "",
};

export default function Capacitaciones({
  especialidad = null,
  recurso = null,
  embedded = true,
}) {
  const especialidadId = especialidad?.id || null;
  const especialidadNombre = especialidad?.nombre || "ECMO";

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const duracion = `${rows.length} semanas`;

  useEffect(() => {
    loadCronograma();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId]);

  async function loadCronograma() {
    if (!especialidadId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("especialidad_cronograma_clases")
        .select("*")
        .eq("especialidad_id", especialidadId)
        .order("orden", { ascending: true });

      if (error) throw error;

      setRows(data || []);
    } catch (error) {
      console.error("Error cargando cronograma:", error);
      alert(`No se pudo cargar el cronograma: ${error.message || error}`);
      setRows([]);
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
      semana: row.semana || "",
      fecha: row.fecha || new Date().toISOString().slice(0, 10),
      tema: row.tema || "",
      contenido: row.contenido || "",
      actividad: row.actividad || "",
      evaluacion: row.evaluacion || "",
    });
    setShowForm(true);
  }

  async function guardar(e) {
    e.preventDefault();

    if (!form.semana.trim()) return alert("Falta la semana.");
    if (!form.fecha) return alert("Falta la fecha.");
    if (!form.tema.trim()) return alert("Falta el tema principal.");
    if (!form.contenido.trim()) return alert("Falta el contenido destacado.");

    if (!especialidadId) {
      const localRow = {
        ...form,
        id: editingId || `local-${Date.now()}`,
        orden: rows.length + 1,
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
        created_by: authData?.user?.id || null,
        semana: form.semana.trim(),
        fecha: form.fecha || null,
        tema: form.tema.trim(),
        contenido: form.contenido.trim(),
        actividad: form.actividad.trim() || null,
        evaluacion: form.evaluacion.trim() || null,
        orden:
          rows.find((row) => row.id === editingId)?.orden ||
          rows.length + 1,
      };

      if (editingId && !String(editingId).startsWith("demo-")) {
        const { error } = await supabase
          .from("especialidad_cronograma_clases")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { data: insertedCronograma, error } = await supabase
          .from("especialidad_cronograma_clases")
          .insert(payload)
          .select("*")
          .single();

        if (error) throw error;

        if (insertedCronograma?.id && recurso?.profile_id) {
          const asistenciaPayload = {
            especialidad_id: especialidadId,
            recurso_id: recurso.profile_id,
            cronograma_id: insertedCronograma.id,
            created_by: authData?.user?.id || null,
            fecha: insertedCronograma.fecha || form.fecha || null,
            actividad: insertedCronograma.tema || form.tema.trim(),
            tipo: insertedCronograma.actividad || form.actividad.trim() || "Clase en vivo",
            modalidad: "Online en vivo",
            estado: "Pendiente",
            observaciones: null,
          };

          const { error: asistenciaError } = await supabase
            .from("especialidad_asistencia")
            .insert(asistenciaPayload);

          if (asistenciaError) {
            console.warn("No se pudo crear asistencia automática:", asistenciaError.message || asistenciaError);
          }
        }
      }

      resetForm();
      setShowForm(false);
      await loadCronograma();
    } catch (error) {
      console.error("Error guardando cronograma:", error);
      alert(`No se pudo guardar: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  async function borrar(row) {
    const ok = window.confirm("¿Seguro que querés borrar esta fila del cronograma?");
    if (!ok) return;

    if (String(row.id).startsWith("demo-") || String(row.id).startsWith("local-")) {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("especialidad_cronograma_clases")
        .delete()
        .eq("id", row.id);

      if (error) throw error;
      await loadCronograma();
    } catch (error) {
      console.error("Error borrando fila:", error);
      alert(`No se pudo borrar: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
  }, [rows]);

  return (
    <div style={embedded ? wrapperEmbedded : wrapperFull}>
      <section style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={labelStyle}>CARPETA ACTIVA</div>
            <h2 style={titleStyle}>🗓️ Cronograma</h2>
            <p style={subtitleStyle}>
              Planificación editable de clases académicas nivel PRO en {especialidadNombre}.
              {recurso?.nombre ? ` Expediente de ${recurso.nombre}.` : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={badgeStyle}>NIVEL PRO</span>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm((prev) => !prev);
              }}
              style={btnPrimary}
            >
              {showForm ? "Cerrar" : "+ Agregar tema"}
            </button>
          </div>
        </div>

        {showForm ? (
          <form onSubmit={guardar} style={formCardStyle}>
            <h3 style={formTitleStyle}>{editingId ? "Editar tema" : "Nuevo tema del cronograma"}</h3>

            <div style={formGridStyle}>
              <label style={fieldStyle}>
                <span style={miniLabel}>Semana</span>
                <input
                  value={form.semana}
                  onChange={(e) => setField("semana", e.target.value)}
                  placeholder="Semana 1"
                  style={inputStyle}
                />
              </label>

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
                <span style={miniLabel}>Evaluación</span>
                <input
                  value={form.evaluacion}
                  onChange={(e) => setField("evaluacion", e.target.value)}
                  placeholder="✅ Quiz / Caso clínico / Examen"
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={fieldStyle}>
              <span style={miniLabel}>Tema principal</span>
              <input
                value={form.tema}
                onChange={(e) => setField("tema", e.target.value)}
                placeholder="Ej: Fundamentos avanzados de ECMO"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={miniLabel}>Contenido destacado</span>
              <textarea
                value={form.contenido}
                onChange={(e) => setField("contenido", e.target.value)}
                placeholder="Describe el contenido principal de la clase..."
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              />
            </label>

            <label style={fieldStyle}>
              <span style={miniLabel}>Actividad</span>
              <input
                value={form.actividad}
                onChange={(e) => setField("actividad", e.target.value)}
                placeholder="Clase en vivo, taller, simulación, lectura..."
                style={inputStyle}
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={loading} style={btnSave}>
                {loading ? "Guardando..." : editingId ? "Actualizar tema" : "Guardar tema"}
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
            <h3 style={tableTitleStyle}>Cronograma de clases – Nivel PRO</h3>
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
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Tema principal</th>
                  <th style={thStyle}>Contenido destacado</th>
                  <th style={thStyle}>Actividad</th>
                  <th style={thStyle}>Evaluación</th>
                  <th style={thStyle}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={tdStyle}>
                      No hay temas registrados todavía.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((item) => (
                    <tr key={item.id}>
                      <td style={tdSemanaStyle}>🗓️ {item.semana}</td>
                      <td style={tdStyle}>{item.fecha || "—"}</td>
                      <td style={tdStrongStyle}>{item.tema}</td>
                      <td style={tdStyle}>{item.contenido}</td>
                      <td style={tdStyle}>{item.actividad || "—"}</td>
                      <td style={tdEvalStyle}>{item.evaluacion || "—"}</td>
                      <td style={tdActionStyle}>
                        <button type="button" onClick={() => startEdit(item)} style={btnTinyBlue}>
                          Editar
                        </button>
                        <button type="button" onClick={() => borrar(item)} style={btnTinyRed}>
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

        <div style={noteGridStyle}>
          <div style={noteBoxStyle}>
            <strong>📘 Uso académico:</strong>
            <span> aquí podés editar todos los temas del cronograma por semana.</span>
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
  minWidth: 1080,
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

const tdActionStyle = {
  ...tdStyle,
  whiteSpace: "nowrap",
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

const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid #00AEEF",
  background: "#00AEEF",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
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

