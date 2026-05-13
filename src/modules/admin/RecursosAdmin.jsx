import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Search, UserCheck, UserX } from "lucide-react";
import AvatarUpload from "../../components/campus/AvatarUpload";
import {
  createRecurso,
  getRecursos,
  toggleActivo,
  updateRecurso,
} from "../../services/recursosAdminService";
import { buildDraftKey, useLocalDraft } from "../../hooks/useLocalDraft";

const initialForm = {
  id: "",
  user_id: "",
  nombre: "",
  correo: "",
  password: "",
  cum: "",
  servicio: "UCI",
  area: "",
  especialidadId: "",
  progreso: 0,
  activo: true,
  avatarFile: null,
};

function buildFormFromResource(resource) {
  return {
    id: resource.id || "",
    user_id: resource.user_id || "",
    nombre: resource.nombre || "",
    correo: resource.correo || "",
    password: "",
    cum: resource.cum || "",
    servicio: resource.servicio || "UCI",
    area: resource.area || "",
    especialidadId: resource.especialidad_id || "",
    progreso: Number(resource.progreso || 0),
    activo: resource.activo !== false,
    avatarFile: null,
  };
}

function sanitizeResourceDraft(form, avatarFileName = "") {
  return {
    id: form.id || "",
    user_id: form.user_id || "",
    nombre: form.nombre || "",
    correo: form.correo || "",
    cum: form.cum || "",
    servicio: form.servicio || "UCI",
    area: form.area || "",
    especialidadId: form.especialidadId || "",
    progreso: form.progreso ?? 0,
    activo: form.activo !== false,
    avatarFileName,
  };
}

function isResourceDraftEmpty(value) {
  return !String(value?.nombre || "").trim()
    && !String(value?.correo || "").trim()
    && !String(value?.cum || "").trim()
    && String(value?.servicio || "UCI") === "UCI"
    && !String(value?.area || "").trim()
    && !String(value?.especialidadId || "").trim()
    && Number(value?.progreso || 0) === 0
    && value?.activo !== false
    && !String(value?.avatarFileName || "").trim();
}

export default function RecursosAdmin({
  session = null,
  especialidades = [],
  onBack = null,
}) {
  const [recursos, setRecursos] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [avatarDraftName, setAvatarDraftName] = useState("");
  const draftKey = buildDraftKey(
    "recursosAdmin",
    session?.user?.id || "admin",
    editingId || "nuevo",
  );
  const { hasDraft, clearDraft } = useLocalDraft({
    key: draftKey,
    value: sanitizeResourceDraft(form, form.avatarFile?.name || avatarDraftName),
    enabled: showModal,
    isEmpty: isResourceDraftEmpty,
    onRestore: (draft) => {
      setForm((prev) => ({
        ...prev,
        ...draft,
        password: "",
        avatarFile: null,
      }));
      setAvatarDraftName(draft.avatarFileName || "");
    },
  });

  useEffect(() => {
    loadRecursos();
  }, []);

  const filteredRecursos = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return recursos;

    return recursos.filter((item) =>
      [item.nombre, item.correo, item.cum, item.especialidad_nombre, item.servicio, item.area]
        .some((value) => String(value || "").toLowerCase().includes(term)),
    );
  }, [query, recursos]);

  async function loadRecursos() {
    setLoading(true);
    setMessage("");

    try {
      const data = await getRecursos();
      setRecursos(data);
    } catch (error) {
      console.error("[Campus UCI] Error cargando recursos:", error);
      setMessage(`No se pudieron cargar los recursos: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(initialForm);
    setAvatarDraftName("");
    setShowModal(true);
    setMessage("");
  }

  function openEdit(resource) {
    setEditingId(resource.id);
    setForm(buildFormFromResource(resource));
    setAvatarDraftName("");
    setShowModal(true);
    setMessage("");
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(initialForm);
    setAvatarDraftName("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      if (editingId) {
        await updateRecurso(editingId, form);
        setMessage("Recurso actualizado correctamente.");
      } else {
        await createRecurso(form);
        setMessage("Recurso creado con usuario de acceso y especialidad asignada.");
      }

      clearDraft();
      closeModal();
      await loadRecursos();
    } catch (error) {
      console.error("[Campus UCI] Error guardando recurso:", error);
      setMessage(error.message || "No se pudo guardar el recurso.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(resource) {
    setMessage("");

    try {
      await toggleActivo(resource.id, resource.activo === false);
      await loadRecursos();
    } catch (error) {
      console.error("[Campus UCI] Error cambiando estado:", error);
      setMessage(error.message || "No se pudo cambiar el estado del recurso.");
    }
  }

  return (
    <div className="resources-admin-page">
      <section className="resources-admin-hero">
        <div>
          <span className="dashboard-section-head-label">Administración</span>
          <h2>Recursos Académicos</h2>
          <p>
            Usuarios reales con acceso independiente, perfil académico y asignación a especialidad.
          </p>
        </div>
        <div className="resources-admin-actions">
          <button type="button" className="academic-secondary-action" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2.1} aria-hidden="true" />
            Volver
          </button>
          <button type="button" className="academic-submit" onClick={openCreate}>
            <Plus size={16} strokeWidth={2.1} aria-hidden="true" />
            Nuevo recurso
          </button>
        </div>
      </section>

      {message ? <div className="cu-alert">{message}</div> : null}

      <section className="resources-admin-panel">
        <div className="resources-toolbar">
          <div className="resources-search">
            <Search size={18} strokeWidth={2} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="Buscar por nombre, CUM, correo o especialidad..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <span>{filteredRecursos.length} recursos</span>
        </div>

        {loading ? (
          <div className="cu-empty">Cargando recursos...</div>
        ) : filteredRecursos.length === 0 ? (
          <div className="cu-empty">No hay recursos académicos registrados.</div>
        ) : (
          <div className="resources-table-wrap">
            <table className="resources-table">
              <thead>
                <tr>
                  <th>Recurso</th>
                  <th>CUM</th>
                  <th>Especialidad</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecursos.map((resource) => (
                  <tr key={resource.id}>
                    <td>
                      <div className="resource-person-cell">
                        <AvatarUpload
                          user={session?.user}
                          profile={resource}
                          name={resource.nombre}
                          size="sm"
                          editable={false}
                        />
                        <div>
                          <strong>{resource.nombre || "Sin nombre"}</strong>
                          <span>{resource.correo || "Sin correo"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{resource.cum || "Sin CUM"}</td>
                    <td>
                      <strong>{resource.especialidad_nombre}</strong>
                      <span>{resource.servicio || resource.area || "Campus UCI"}</span>
                    </td>
                    <td>
                      <div className="resource-progress">
                        <span><i style={{ width: `${resource.progreso}%` }} /></span>
                        <strong>{resource.progreso}%</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`resource-status ${resource.activo === false ? "inactive" : "active"}`}>
                        {resource.activo === false ? "Inactivo" : "Activo"}
                      </span>
                    </td>
                    <td>
                      <div className="academic-row-actions">
                        <button type="button" onClick={() => openEdit(resource)}>
                          <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className={resource.activo === false ? "" : "danger"}
                          onClick={() => handleToggle(resource)}
                        >
                          {resource.activo === false ? (
                            <UserCheck size={14} strokeWidth={2} aria-hidden="true" />
                          ) : (
                            <UserX size={14} strokeWidth={2} aria-hidden="true" />
                          )}
                          {resource.activo === false ? "Activar" : "Desactivar"}
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

      {showModal ? (
        <div className="resources-modal-backdrop" role="presentation">
          <section className="resources-modal" role="dialog" aria-modal="true" aria-label={editingId ? "Editar recurso" : "Crear recurso"}>
            <div className="resources-modal-head">
              <div>
                <span>{editingId ? "Edición" : "Nuevo usuario"}</span>
                <h3>{editingId ? "Editar recurso" : "Crear recurso académico"}</h3>
              </div>
              <button type="button" onClick={closeModal}>Cerrar</button>
            </div>

            <form className="academic-form" onSubmit={handleSubmit}>
              {hasDraft ? (
                <div className="draft-notice">
                  <span>
                    Borrador restaurado automáticamente.
                    {avatarDraftName ? ` Debes volver a seleccionar el avatar: ${avatarDraftName}.` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearDraft();
                      setForm(initialForm);
                      setAvatarDraftName("");
                    }}
                  >
                    Limpiar borrador
                  </button>
                </div>
              ) : null}
              <div className="academic-form-row">
                <label>
                  Nombre completo
                  <input value={form.nombre} onChange={(event) => setField("nombre", event.target.value)} required />
                </label>
                <label>
                  Correo
                  <input type="email" value={form.correo} onChange={(event) => setField("correo", event.target.value)} required />
                </label>
              </div>

              {!editingId ? (
                <label>
                  Contraseña temporal
                  <input type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} required minLength={6} />
                </label>
              ) : null}

              <div className="academic-form-row">
                <label>
                  CUM
                  <input value={form.cum} onChange={(event) => setField("cum", event.target.value.toUpperCase())} />
                </label>
                <label>
                  Especialidad
                  <select value={form.especialidadId} onChange={(event) => setField("especialidadId", event.target.value)}>
                    <option value="">Sin especialidad</option>
                    {especialidades.map((especialidad) => (
                      <option key={especialidad.id} value={especialidad.id}>
                        {especialidad.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="academic-form-row">
                <label>
                  Servicio
                  <input value={form.servicio} onChange={(event) => setField("servicio", event.target.value)} />
                </label>
                <label>
                  Área
                  <input value={form.area} onChange={(event) => setField("area", event.target.value)} />
                </label>
              </div>

              <div className="academic-form-row">
                <label>
                  Progreso académico
                  <input type="number" min="0" max="100" value={form.progreso} onChange={(event) => setField("progreso", event.target.value)} />
                </label>
                <label>
                  Avatar opcional
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null;
                      setField("avatarFile", nextFile);
                      setAvatarDraftName(nextFile?.name || "");
                    }}
                  />
                </label>
              </div>

              <label className="resources-check">
                <input type="checkbox" checked={form.activo} onChange={(event) => setField("activo", event.target.checked)} />
                Usuario activo
              </label>

              <div className="academic-form-actions">
                <button type="submit" className="academic-submit" disabled={saving}>
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear usuario recurso"}
                </button>
                <button type="button" className="academic-secondary-action" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
