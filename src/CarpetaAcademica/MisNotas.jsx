import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const AREAS_DEFAULT = [
  "Área 1",
  "Área 2",
  "Área 3",
  "Evaluación final",
  "Simulación clínica",
  "Competencias",
];

const ACTIVIDADES_DEFAULT = [
  "PI1",
  "EP1",
  "PI2",
  "EP2",
  "PI3",
  "EP3",
  "Nota 1",
  "Nota 2",
  "Nota 3",
  "Final",
];

const emptyForm = {
  area: "Área 1",
  actividad: "Nota 1",
  nota: "",
  observaciones: "",
};

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function estadoFromNota(nota) {
  return Number(nota) >= 7 ? "Aprobado" : "Reprobado";
}

function porcentajeFromNota(nota) {
  const n = numberValue(nota);
  return Number((n * 10).toFixed(2));
}

export default function MisNotas({
  especialidad = null,
  recurso = null,
  profile = null,
  embedded = true,
  readOnly = false,
}) {
  const especialidadId = especialidad?.id || null;
  const recursoId = recurso?.profile_id || recurso?.id || null;

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarNotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId, recursoId]);

  async function cargarNotas() {
    if (!especialidadId || !recursoId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("especialidad_notas")
        .select("*")
        .eq("especialidad_id", especialidadId)
        .eq("recurso_id", recursoId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRows(data || []);
    } catch (error) {
      console.error("Error cargando notas:", error);
      alert(`No se pudieron cargar las notas: ${error.message || error}`);
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
    if (readOnly) return;
    setEditingId(row.id);
    setForm({
      area: row.area || "Área 1",
      actividad: row.actividad || "Nota 1",
      nota: row.nota ?? "",
      observaciones: row.observaciones || "",
    });
    setShowForm(true);
  }

  async function guardarNota(e) {
    e.preventDefault();
    if (readOnly) return;

    const nota = numberValue(form.nota);
    const porcentaje = porcentajeFromNota(nota);

    if (!form.area.trim()) return alert("Falta el área.");
    if (!form.actividad.trim()) return alert("Falta la actividad.");
    if (form.nota === "") return alert("Falta la nota.");
    if (nota < 0 || nota > 10) return alert("La nota debe estar entre 0 y 10.");

    if (!especialidadId || !recursoId) {
      const localRow = {
        ...form,
        id: editingId || `local-${Date.now()}`,
        nota,
        porcentaje,
        estado: estadoFromNota(nota),
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
        area: form.area.trim(),
        actividad: form.actividad.trim(),
        nota,
        porcentaje,
        estado: estadoFromNota(nota),
        observaciones: form.observaciones.trim() || null,
        created_by: authData?.user?.id || profile?.user_id || null,
      };

      if (editingId && !String(editingId).startsWith("local-")) {
        const { error } = await supabase
          .from("especialidad_notas")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("especialidad_notas")
          .insert(payload);

        if (error) throw error;
      }

      resetForm();
      setShowForm(false);
      await cargarNotas();
    } catch (error) {
      console.error("Error guardando nota:", error);
      alert(`No se pudo guardar la nota: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  async function borrarNota(row) {
    if (readOnly) return;
    const ok = window.confirm("¿Seguro que querés borrar esta nota?");
    if (!ok) return;

    if (String(row.id).startsWith("local-")) {
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("especialidad_notas")
        .delete()
        .eq("id", row.id);

      if (error) throw error;
      await cargarNotas();
    } catch (error) {
      console.error("Error borrando nota:", error);
      alert(`No se pudo borrar: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = rows.length;
    const promedio = total
      ? rows.reduce((acc, item) => acc + numberValue(item.nota), 0) / total
      : 0;

    const aprobadas = rows.filter((r) => numberValue(r.nota) >= 7).length;
    const reprobadas = rows.filter((r) => numberValue(r.nota) < 7).length;
    const estado = total === 0 ? "Pendiente" : promedio >= 7 ? "Aprobado" : "Reprobado";

    return {
      total,
      promedio,
      aprobadas,
      reprobadas,
      estado,
    };
  }, [rows]);

  const groupedAreas = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      const area = row.area || "Sin área";
      if (!map.has(area)) map.set(area, []);
      map.get(area).push(row);
    });

    return Array.from(map.entries()).map(([area, items]) => {
      const promedio = items.length
        ? items.reduce((acc, item) => acc + numberValue(item.nota), 0) / items.length
        : 0;

      return { area, items, promedio };
    });
  }, [rows]);

  const statusColor = stats.estado === "Aprobado" ? "#16a34a" : stats.estado === "Reprobado" ? "#dc2626" : "#64748b";

  return (
    <div style={embedded ? wrapperEmbedded : wrapperFull}>
      <section style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <div style={labelStyle}>CARPETA ACTIVA</div>
            <h2 style={titleStyle}>📊 Mis notas</h2>
            <p style={subtitleStyle}>
              Historial académico, promedio general y estado del recurso en formación.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={badgeStyle}>HISTORIAL ACADÉMICO</span>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm((prev) => !prev);
                }}
                style={btnPrimary}
              >
                {showForm ? "Cerrar" : "+ Agregar nota"}
              </button>
            ) : null}
          </div>
        </div>

        <div style={profileCardStyle}>
          <div style={avatarStyle}>
            {String(recurso?.nombre || "U").slice(0, 1).toUpperCase()}
          </div>

          <div>
            <h3 style={profileNameStyle}>{recurso?.nombre || "Recurso en formación"}</h3>
            <div style={profileInfoStyle}>CUM: {recurso?.cum || "No asignado"}</div>
            <div style={profileInfoStyle}>Email: {recurso?.correo || "No registrado"}</div>
            <div style={profileInfoStyle}>
              Especialidad: {especialidad?.nombre || "Especialidad UCI"}
            </div>
            <div style={profileCumStyle}>Promedio general: {stats.promedio.toFixed(2)}</div>
          </div>
        </div>

        <div style={summaryGridStyle}>
          <Metric icon="📚" value={stats.total} label="Notas registradas" tone="#0ea5e9" />
          <Metric icon="✅" value={stats.aprobadas} label="Notas aprobadas" tone="#16a34a" />
          <Metric icon="⚠️" value={stats.reprobadas} label="Notas reprobadas" tone="#f97316" />
          <Metric icon="%" value={stats.promedio.toFixed(2)} label="Promedio académico" tone="#9333ea" />
        </div>

        <div style={statusBoxStyle}>
          <span>Estado académico:</span>
          <strong style={{ color: statusColor }}>{stats.estado}</strong>
        </div>

        {showForm && !readOnly ? (
          <form onSubmit={guardarNota} style={formCardStyle}>
            <h3 style={formTitleStyle}>{editingId ? "Editar nota" : "Nueva nota"}</h3>

            <div style={formGridStyle}>
              <label style={fieldStyle}>
                <span style={miniLabel}>Área</span>
                <input
                  list="areas-campus-uci"
                  value={form.area}
                  onChange={(e) => setField("area", e.target.value)}
                  style={inputStyle}
                  placeholder="Área 1"
                />
                <datalist id="areas-campus-uci">
                  {AREAS_DEFAULT.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>

              <label style={fieldStyle}>
                <span style={miniLabel}>Actividad</span>
                <input
                  list="actividades-campus-uci"
                  value={form.actividad}
                  onChange={(e) => setField("actividad", e.target.value)}
                  style={inputStyle}
                  placeholder="Nota 1"
                />
                <datalist id="actividades-campus-uci">
                  {ACTIVIDADES_DEFAULT.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </label>
            </div>

            <div style={formGridStyle}>
              <label style={fieldStyle}>
                <span style={miniLabel}>Nota 0-10</span>
                <input
                  value={form.nota}
                  onChange={(e) => setField("nota", e.target.value.replace(/[^\d.]/g, ""))}
                  style={inputStyle}
                  placeholder="Ej: 9.10"
                />
              </label>

              <div style={autoPercentBoxStyle}>
                <span style={miniLabel}>Porcentaje automático</span>
                <strong style={autoPercentValueStyle}>
                  {porcentajeFromNota(form.nota).toFixed(0)}%
                </strong>
                <small style={autoPercentHelpStyle}>
                  Se calcula automáticamente según la nota registrada.
                </small>
              </div>
            </div>

            <label style={fieldStyle}>
              <span style={miniLabel}>Observaciones</span>
              <input
                value={form.observaciones}
                onChange={(e) => setField("observaciones", e.target.value)}
                style={inputStyle}
                placeholder="Observaciones académicas"
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={loading} style={btnSave}>
                {loading ? "Guardando..." : editingId ? "Actualizar nota" : "Guardar nota"}
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
            <h3 style={sectionTitleStyle}>Historial de notas</h3>
            <p style={sectionSubtitleStyle}>Ciclo actual e historial académico del recurso.</p>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Área</th>
                  <th style={thStyle}>Actividad</th>
                  <th style={thStyle}>Nota</th>
                  <th style={thStyle}>Porcentaje</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Observaciones</th>
                  {!readOnly ? <th style={thStyle}>Acción</th> : null}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} style={tdStyle}>No hay notas registradas todavía.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStrongStyle}>{row.area || "—"}</td>
                      <td style={tdStyle}>{row.actividad || "—"}</td>
                      <td style={tdNotaStyle}>{Number(row.nota || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{Number(row.porcentaje ?? porcentajeFromNota(row.nota)).toFixed(0)}%</td>
                      <td style={{ ...tdStyle, color: row.estado === "Aprobado" ? "#16a34a" : "#dc2626", fontWeight: 900 }}>
                        {row.estado || estadoFromNota(row.nota)}
                      </td>
                      <td style={tdStyle}>{row.observaciones || "—"}</td>
                      {!readOnly ? (
                        <td style={tdActionStyle}>
                          <button type="button" onClick={() => startEdit(row)} style={btnTinyBlue}>
                            Editar
                          </button>
                          <button type="button" onClick={() => borrarNota(row)} style={btnTinyRed}>
                            Borrar
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {groupedAreas.length > 0 ? (
          <div style={areasGridStyle}>
            {groupedAreas.map((group) => (
              <div key={group.area} style={areaCardStyle}>
                <div style={areaTitleStyle}>{group.area}</div>
                <div style={areaPromStyle}>{group.promedio.toFixed(2)}</div>
                <div style={areaSubStyle}>Promedio del área</div>
              </div>
            ))}
          </div>
        ) : null}
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

const profileCardStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 20,
  background: "#f8fbff",
  padding: 18,
  display: "flex",
  alignItems: "center",
  gap: 18,
  marginBottom: 16,
};

const avatarStyle = {
  width: 92,
  height: 92,
  borderRadius: 999,
  background: "#dbeafe",
  color: "#223b78",
  display: "grid",
  placeItems: "center",
  fontSize: 34,
  fontWeight: 900,
  flexShrink: 0,
};

const profileNameStyle = {
  margin: 0,
  color: "#223b78",
  fontSize: 26,
  fontWeight: 900,
};

const profileInfoStyle = {
  color: "#334155",
  fontSize: 14,
  fontWeight: 750,
  marginTop: 4,
};

const profileCumStyle = {
  color: "#223b78",
  fontSize: 16,
  fontWeight: 900,
  marginTop: 6,
  textDecoration: "underline",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginBottom: 16,
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

const statusBoxStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 16,
  background: "white",
  padding: 14,
  marginBottom: 16,
  color: "#334155",
  fontSize: 16,
  fontWeight: 900,
  display: "flex",
  gap: 10,
  alignItems: "center",
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

const autoPercentBoxStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 14,
  padding: "11px 12px",
  background: "white",
  display: "grid",
  alignContent: "center",
  minHeight: 78,
};

const autoPercentValueStyle = {
  color: "#223b78",
  fontSize: 28,
  fontWeight: 900,
  marginTop: 4,
};

const autoPercentHelpStyle = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  marginTop: 2,
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

const sectionTitleStyle = {
  margin: 0,
  color: "#223b78",
  fontSize: 18,
  fontWeight: 900,
};

const sectionSubtitleStyle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
};

const tableWrapStyle = {
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 900,
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

const tdStrongStyle = {
  ...tdStyle,
  color: "#111827",
  fontWeight: 900,
};

const tdNotaStyle = {
  ...tdStyle,
  color: "#223b78",
  fontWeight: 900,
  fontSize: 16,
};

const tdActionStyle = {
  ...tdStyle,
  whiteSpace: "nowrap",
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

const areasGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 16,
};

const areaCardStyle = {
  border: "1px solid #dbeafe",
  borderRadius: 16,
  background: "#f8fbff",
  padding: 14,
};

const areaTitleStyle = {
  color: "#334155",
  fontWeight: 900,
  fontSize: 14,
};

const areaPromStyle = {
  color: "#223b78",
  fontWeight: 900,
  fontSize: 28,
  marginTop: 8,
};

const areaSubStyle = {
  color: "#64748b",
  fontWeight: 800,
  fontSize: 12,
};
