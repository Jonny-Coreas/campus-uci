import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, MonitorPlay, Plus } from "lucide-react";
import {
  createClaseVirtual,
  deleteClaseVirtual,
  getClasesVirtualesByEspecialidad,
  updateClaseVirtual,
} from "../../services/clasesTareasService";
import { buildDraftKey, useLocalDraft } from "../../hooks/useLocalDraft";

const initialForm = {
  titulo: "",
  descripcion: "",
  docente: "",
  fecha: new Date().toISOString().slice(0, 10),
  hora_inicio: "08:00",
  hora_fin: "09:00",
  enlace_virtual: "",
  estado: "programada",
};

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function isUpcoming(row) {
  if (!row.fecha) return false;
  const today = new Date().toISOString().slice(0, 10);
  return row.fecha >= today && row.estado === "programada";
}

function mapClaseToForm(row) {
  return {
    titulo: row.titulo || "",
    descripcion: row.descripcion || "",
    docente: row.docente || "",
    fecha: row.fecha || new Date().toISOString().slice(0, 10),
    hora_inicio: row.hora_inicio || "08:00",
    hora_fin: row.hora_fin || "09:00",
    enlace_virtual: row.enlace_virtual || "",
    estado: row.estado || "programada",
  };
}

function isClaseDraftEmpty(value) {
  return !String(value?.titulo || "").trim()
    && !String(value?.descripcion || "").trim()
    && !String(value?.docente || "").trim()
    && !String(value?.enlace_virtual || "").trim()
    && value?.fecha === initialForm.fecha
    && value?.hora_inicio === initialForm.hora_inicio
    && value?.hora_fin === initialForm.hora_fin
    && value?.estado === initialForm.estado;
}

export default function ClasesVirtuales({ especialidad = null, profile = null, onBack = null }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(true);

  const especialidadId = especialidad?.id || null;
  const draftKey = buildDraftKey(
    "clasesVirtuales",
    profile?.id || profile?.user_id || "usuario",
    especialidadId,
    editingId || "nuevo",
  );
  const proximasClases = useMemo(() => rows.filter(isUpcoming).slice(0, 4), [rows]);
  const { hasDraft, clearDraft } = useLocalDraft({
    key: draftKey,
    value: form,
    enabled: Boolean(especialidadId),
    isEmpty: isClaseDraftEmpty,
    onRestore: (draft) => {
      setForm((prev) => ({ ...prev, ...draft }));
      setShowForm(true);
    },
  });

  useEffect(() => {
    loadClases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId]);

  async function loadClases() {
    if (!especialidadId) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getClasesVirtualesByEspecialidad(especialidadId);
      setRows(data);
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando clases virtuales:", loadError);
      setError(loadError.message || "No se pudieron cargar las clases virtuales.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function clearLocalDraft() {
    clearDraft();
    resetForm();
    setError("");
  }

  function startEdit(row) {
    setForm(mapClaseToForm(row));
    setEditingId(row.id);
    setShowForm(true);
    setError("");
  }

  function cancelEdit() {
    resetForm();
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.titulo.trim()) {
      setError("El título de la clase es obligatorio.");
      return;
    }

    if (!form.fecha || !form.hora_inicio || !form.hora_fin) {
      setError("Fecha, hora de inicio y hora de fin son obligatorias.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await updateClaseVirtual(editingId, form);
      } else {
        await createClaseVirtual(especialidadId, form);
      }
      clearDraft();
      resetForm();
      setShowForm(false);
      await loadClases();
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando clase virtual:", saveError);
      setError(saveError.message || "No se pudo guardar la clase virtual.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const confirmed = window.confirm(`¿Eliminar la clase virtual "${row.titulo}"?`);
    if (!confirmed) return;

    setDeletingId(row.id);
    setError("");

    try {
      await deleteClaseVirtual(row.id);
      if (editingId === row.id) resetForm();
      await loadClases();
    } catch (deleteError) {
      console.error("[Campus UCI] Error eliminando clase virtual:", deleteError);
      setError(deleteError.message || "No se pudo eliminar la clase virtual.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="academic-module-page">
      <section className="academic-module-hero">
        <div>
          <span className="dashboard-section-head-label">Fase 2 · Clases virtuales</span>
          <h2>{especialidad?.nombre || "Especialidad"}</h2>
          <p>
            Programación de clases en línea, enlaces de acceso y seguimiento de próximas
            sesiones académicas.
          </p>
        </div>
        <button type="button" className="specialty-back-button" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2.1} aria-hidden="true" />
          Volver a la especialidad
        </button>
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}

      <section className="academic-summary-grid">
        <article className="academic-summary-card">
          <span className="specialty-stat-icon blue"><MonitorPlay size={23} strokeWidth={1.9} /></span>
          <div><small>Total clases</small><strong>{rows.length}</strong></div>
        </article>
        <article className="academic-summary-card">
          <span className="specialty-stat-icon green"><CalendarDays size={23} strokeWidth={1.9} /></span>
          <div><small>Próximas</small><strong>{proximasClases.length}</strong></div>
        </article>
      </section>

      <section className="academic-module-grid">
        <article className="academic-panel">
          <div className="academic-panel-head">
            <div>
              <span>Administración</span>
              <h3>{editingId ? "Editar clase virtual" : "Programar clase virtual"}</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showForm) {
                  cancelEdit();
                } else {
                  resetForm();
                  setShowForm(true);
                }
              }}
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              {showForm ? "Ocultar" : "Nueva clase"}
            </button>
          </div>

          {showForm ? (
            <form className="academic-form" onSubmit={handleSubmit}>
              {hasDraft ? (
                <div className="draft-notice">
                  <span>Borrador restaurado automáticamente.</span>
                  <button type="button" onClick={clearLocalDraft}>Limpiar borrador</button>
                </div>
              ) : null}
              <label>
                Título
                <input value={form.titulo} onChange={(event) => setField("titulo", event.target.value)} required />
              </label>
              <label>
                Descripción
                <textarea value={form.descripcion} onChange={(event) => setField("descripcion", event.target.value)} rows={3} />
              </label>
              <div className="academic-form-row">
                <label>
                  Docente
                  <input value={form.docente} onChange={(event) => setField("docente", event.target.value)} />
                </label>
                <label>
                  Estado
                  <select value={form.estado} onChange={(event) => setField("estado", event.target.value)}>
                    <option value="programada">Programada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </label>
              </div>
              <div className="academic-form-row three">
                <label>
                  Fecha
                  <input type="date" value={form.fecha} onChange={(event) => setField("fecha", event.target.value)} required />
                </label>
                <label>
                  Hora inicio
                  <input type="time" value={form.hora_inicio} onChange={(event) => setField("hora_inicio", event.target.value)} required />
                </label>
                <label>
                  Hora fin
                  <input type="time" value={form.hora_fin} onChange={(event) => setField("hora_fin", event.target.value)} required />
                </label>
              </div>
              <label>
                Enlace virtual
                <input type="url" value={form.enlace_virtual} onChange={(event) => setField("enlace_virtual", event.target.value)} placeholder="https://..." />
              </label>
              <div className="academic-form-actions">
                <button type="submit" className="academic-submit" disabled={saving}>
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar clase"}
                </button>
                {editingId ? (
                  <button type="button" className="academic-secondary-action" onClick={cancelEdit} disabled={saving}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
        </article>

        <article className="academic-panel">
          <div className="academic-panel-head compact">
            <div>
              <span>Agenda</span>
              <h3>Próximas clases</h3>
            </div>
          </div>

          {loading ? (
            <div className="cu-empty">Cargando clases...</div>
          ) : proximasClases.length === 0 ? (
            <div className="cu-empty">No hay próximas clases programadas.</div>
          ) : (
            <div className="academic-card-list">
              {proximasClases.map((row) => (
                <article className="academic-list-card" key={row.id}>
                  <span className={`academic-status ${row.estado}`}>{row.estado}</span>
                  <strong>{row.titulo}</strong>
                  <small>{formatDate(row.fecha)} · {row.hora_inicio} - {row.hora_fin}</small>
                  <p>{row.docente || "Docente pendiente"}</p>
                  {row.enlace_virtual ? (
                    <a href={row.enlace_virtual} target="_blank" rel="noreferrer">
                      Abrir enlace <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="academic-panel">
        <div className="academic-panel-head compact">
          <div>
            <span>Listado</span>
            <h3>Clases virtuales registradas</h3>
          </div>
        </div>

        {loading ? (
          <div className="cu-empty">Cargando clases...</div>
        ) : rows.length === 0 ? (
          <div className="cu-empty">No hay clases virtuales registradas.</div>
        ) : (
          <div className="academic-table-wrap">
            <table className="academic-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Docente</th>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Estado</th>
                  <th>Enlace</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.titulo}</strong><span>{row.descripcion || "Sin descripción"}</span></td>
                    <td>{row.docente || "Pendiente"}</td>
                    <td>{formatDate(row.fecha)}</td>
                    <td>{row.hora_inicio} - {row.hora_fin}</td>
                    <td><span className={`academic-status ${row.estado}`}>{row.estado}</span></td>
                    <td>
                      {row.enlace_virtual ? (
                        <a href={row.enlace_virtual} target="_blank" rel="noreferrer">Abrir</a>
                      ) : "Sin enlace"}
                    </td>
                    <td>
                      <div className="academic-row-actions">
                        <button type="button" onClick={() => startEdit(row)}>Editar</button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(row)}
                          disabled={deletingId === row.id}
                        >
                          {deletingId === row.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
