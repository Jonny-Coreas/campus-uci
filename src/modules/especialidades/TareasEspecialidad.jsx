import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Plus, Star } from "lucide-react";
import {
  createTarea,
  deleteTarea,
  getTareasByEspecialidad,
  updateTarea,
} from "../../services/clasesTareasService";

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  titulo: "",
  instrucciones: "",
  fecha_publicacion: today,
  fecha_limite: today,
  puntaje: 100,
  estado: "abierta",
};

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function mapTareaToForm(row) {
  return {
    titulo: row.titulo || "",
    instrucciones: row.instrucciones || "",
    fecha_publicacion: row.fecha_publicacion || today,
    fecha_limite: row.fecha_limite || today,
    puntaje: Number(row.puntaje || 0),
    estado: row.estado || "abierta",
  };
}

export default function TareasEspecialidad({
  especialidad = null,
  canManageAcademic = false,
  onBack = null,
  onOpenEntregas = null,
  onOpenEntregaRecurso = null,
}) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(true);

  const especialidadId = especialidad?.id || null;
  const abiertas = useMemo(() => rows.filter((row) => row.estado === "abierta").length, [rows]);

  useEffect(() => {
    loadTareas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId]);

  async function loadTareas() {
    if (!especialidadId) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getTareasByEspecialidad(especialidadId);
      setRows(data);
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando tareas:", loadError);
      setError(loadError.message || "No se pudieron cargar las tareas.");
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

  function startEdit(row) {
    setForm(mapTareaToForm(row));
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
      setError("El título de la tarea es obligatorio.");
      return;
    }

    if (!form.fecha_publicacion || !form.fecha_limite) {
      setError("Fecha de publicación y fecha límite son obligatorias.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await updateTarea(editingId, form);
      } else {
        await createTarea(especialidadId, form);
      }
      resetForm();
      setShowForm(false);
      await loadTareas();
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando tarea:", saveError);
      setError(saveError.message || "No se pudo guardar la tarea.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const confirmed = window.confirm(`¿Eliminar la tarea "${row.titulo}"?`);
    if (!confirmed) return;

    setDeletingId(row.id);
    setError("");

    try {
      await deleteTarea(row.id);
      if (editingId === row.id) resetForm();
      await loadTareas();
    } catch (deleteError) {
      console.error("[Campus UCI] Error eliminando tarea:", deleteError);
      setError(deleteError.message || "No se pudo eliminar la tarea.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="academic-module-page">
      <section className="academic-module-hero">
        <div>
          <span className="dashboard-section-head-label">Fase 2 · Tareas</span>
          <h2>{especialidad?.nombre || "Especialidad"}</h2>
          <p>
            Creación y seguimiento de actividades académicas asignadas por especialidad.
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
          <span className="specialty-stat-icon blue"><ClipboardList size={23} strokeWidth={1.9} /></span>
          <div><small>Total tareas</small><strong>{rows.length}</strong></div>
        </article>
        <article className="academic-summary-card">
          <span className="specialty-stat-icon green"><Star size={23} strokeWidth={1.9} /></span>
          <div><small>Abiertas</small><strong>{abiertas}</strong></div>
        </article>
      </section>

      <section className="academic-module-grid">
        {canManageAcademic ? (
        <article className="academic-panel">
          <div className="academic-panel-head">
            <div>
              <span>Administración</span>
              <h3>{editingId ? "Editar tarea" : "Crear tarea"}</h3>
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
              {showForm ? "Ocultar" : "Nueva tarea"}
            </button>
          </div>

          {showForm ? (
            <form className="academic-form" onSubmit={handleSubmit}>
              <label>
                Título
                <input value={form.titulo} onChange={(event) => setField("titulo", event.target.value)} required />
              </label>
              <label>
                Instrucciones
                <textarea value={form.instrucciones} onChange={(event) => setField("instrucciones", event.target.value)} rows={4} />
              </label>
              <div className="academic-form-row">
                <label>
                  Fecha publicación
                  <input type="date" value={form.fecha_publicacion} onChange={(event) => setField("fecha_publicacion", event.target.value)} required />
                </label>
                <label>
                  Fecha límite
                  <input type="date" value={form.fecha_limite} onChange={(event) => setField("fecha_limite", event.target.value)} required />
                </label>
              </div>
              <div className="academic-form-row">
                <label>
                  Puntaje
                  <input type="number" min="0" step="0.01" value={form.puntaje} onChange={(event) => setField("puntaje", event.target.value)} />
                </label>
                <label>
                  Estado
                  <select value={form.estado} onChange={(event) => setField("estado", event.target.value)}>
                    <option value="abierta">Abierta</option>
                    <option value="cerrada">Cerrada</option>
                  </select>
                </label>
              </div>
              <div className="academic-form-actions">
                <button type="submit" className="academic-submit" disabled={saving}>
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar tarea"}
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
        ) : (
          <article className="academic-panel">
            <div className="academic-panel-head compact">
              <div>
                <span>Entrega de evidencias</span>
                <h3>Mis tareas asignadas</h3>
              </div>
            </div>
            <div className="cu-empty">
              Seleccioná una tarea del listado y usá “Entregar tarea” para subir tu evidencia.
            </div>
          </article>
        )}

        <article className="academic-panel">
          <div className="academic-panel-head compact">
            <div>
              <span>Seguimiento</span>
              <h3>Tareas abiertas</h3>
            </div>
          </div>

          {loading ? (
            <div className="cu-empty">Cargando tareas...</div>
          ) : rows.filter((row) => row.estado === "abierta").length === 0 ? (
            <div className="cu-empty">No hay tareas abiertas.</div>
          ) : (
            <div className="academic-card-list">
              {rows.filter((row) => row.estado === "abierta").slice(0, 5).map((row) => (
                <article className="academic-list-card" key={row.id}>
                  <span className={`academic-status ${row.estado}`}>{row.estado}</span>
                  <strong>{row.titulo}</strong>
                  <small>Entrega: {formatDate(row.fecha_limite)} · {Number(row.puntaje || 0)} pts</small>
                  <p>{row.instrucciones || "Sin instrucciones adicionales"}</p>
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
            <h3>Tareas registradas</h3>
          </div>
        </div>

        {loading ? (
          <div className="cu-empty">Cargando tareas...</div>
        ) : rows.length === 0 ? (
          <div className="cu-empty">No hay tareas registradas.</div>
        ) : (
          <div className="academic-table-wrap">
            <table className="academic-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Publicación</th>
                  <th>Límite</th>
                  <th>Puntaje</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.titulo}</strong><span>{row.instrucciones || "Sin instrucciones"}</span></td>
                    <td>{formatDate(row.fecha_publicacion)}</td>
                    <td>{formatDate(row.fecha_limite)}</td>
                    <td>{Number(row.puntaje || 0)}</td>
                    <td><span className={`academic-status ${row.estado}`}>{row.estado}</span></td>
                    <td>
                      <div className="academic-row-actions">
                        {canManageAcademic ? (
                          <>
                            <button type="button" onClick={() => onOpenEntregas?.(row)}>Ver entregas</button>
                            <button type="button" onClick={() => startEdit(row)}>Editar</button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDelete(row)}
                              disabled={deletingId === row.id}
                            >
                              {deletingId === row.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => onOpenEntregaRecurso?.(row)}>
                            Entregar tarea
                          </button>
                        )}
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
