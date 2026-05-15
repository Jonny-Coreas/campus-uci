import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Pencil, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import AvatarUpload from "../../components/campus/AvatarUpload";
import {
  createRecurso,
  deleteRecursoDefinitivo,
  getRecursos,
  toggleActivo,
  updateRecurso,
} from "../../services/recursosAdminService";
import { buildDraftKey, useLocalDraft } from "../../hooks/useLocalDraft";
import { isAdminOrJefe } from "../../auth/roles";

const initialForm = {
  id: "",
  user_id: "",
  nombre: "",
  correo: "",
  password: "",
  rol: "recurso",
  cum: "",
  servicio: "UCI",
  area: "",
  especialidadId: "",
  progreso: 0,
  activo: true,
  avatarFile: null,
};

function normalizeAcademicRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "jefe") return "jefe";
  if (role === "docente") return "docente";
  return "recurso";
}

function buildFormFromResource(resource) {
  return {
    id: resource.id || "",
    user_id: resource.user_id || "",
    nombre: resource.nombre || "",
    correo: resource.correo || "",
    password: "",
    rol: normalizeAcademicRole(resource.rol),
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
    rol: normalizeAcademicRole(form.rol),
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
  profile = null,
  especialidades = [],
  allowedEspecialidadIds = null,
  onBack = null,
}) {
  const [recursos, setRecursos] = useState([]);
  const [query, setQuery] = useState("");
  const [especialidadFilter, setEspecialidadFilter] = useState("");
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
        rol: normalizeAcademicRole(draft.rol),
        password: "",
        avatarFile: null,
      }));
      setAvatarDraftName(draft.avatarFileName || "");
    },
  });
  const canManageResources = isAdminOrJefe(profile);

  useEffect(() => {
    loadRecursos();
  }, []);

  const filteredRecursos = useMemo(() => {
    const scopedResources = Array.isArray(allowedEspecialidadIds)
      ? recursos.filter((item) => allowedEspecialidadIds.includes(item.especialidad_id))
      : recursos;
    const byEspecialidad = especialidadFilter
      ? scopedResources.filter((item) => item.especialidad_id === especialidadFilter)
      : scopedResources;
    const term = query.trim().toLowerCase();
    if (!term) return byEspecialidad;

    return byEspecialidad.filter((item) =>
      [item.nombre, item.correo, item.cum, item.especialidad_nombre, item.servicio, item.area]
        .some((value) => String(value || "").toLowerCase().includes(term)),
    );
  }, [allowedEspecialidadIds, especialidadFilter, query, recursos]);

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
    setForm((prev) => ({ ...prev, [name]: name === "rol" ? normalizeAcademicRole(value) : value }));
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
        setMessage("Usuario creado con correo, contraseña temporal, profile y especialidad. Puede iniciar sesión sin confirmar correo.");
      }

      clearDraft();
      closeModal();
      await loadRecursos();
    } catch (error) {
      const contextError = error?.context?.error;
      const message =
        contextError?.error ||
        contextError?.message ||
        error?.message ||
        JSON.stringify(error, Object.getOwnPropertyNames(error)) ||
        "No se pudo guardar el recurso.";

      console.error("[Campus UCI] Error guardando recurso:", {
        message: error?.message,
        contextError,
        serializedError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        rawError: error,
      });
      setMessage(`No se pudo guardar el recurso: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(resource) {
    if (!canManageResources) return;
    setMessage("");

    try {
      await toggleActivo(resource.id, resource.activo === false);
      await loadRecursos();
    } catch (error) {
      console.error("[Campus UCI] Error cambiando estado:", error);
      setMessage(error.message || "No se pudo cambiar el estado del recurso.");
    }
  }

  async function handleDelete(resource) {
    if (!canManageResources) return;

    const resourceName = resource.nombre || resource.correo || "este recurso";
    const confirmed = window.confirm(
      `Esta acción no se puede deshacer.\n\nSe eliminará el profile y sus asignaciones en usuario_especialidad para: ${resourceName}.\n\nSi el recurso tiene entregas, asistencia, notas u otros datos académicos relacionados, Supabase puede bloquear la eliminación y deberás desactivarlo.\n\n¿Continuar?`,
    );
    if (!confirmed) return;

    const strongConfirm = window.prompt(
      `Confirmación fuerte requerida.\n\nEscribí ELIMINAR para borrar definitivamente a ${resourceName}.`,
    );
    if (strongConfirm !== "ELIMINAR") {
      setMessage("Eliminación cancelada. No se hicieron cambios.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const result = await deleteRecursoDefinitivo(resource);
      await loadRecursos();
      setMessage(
        result.authUserDeleted
          ? "Recurso eliminado definitivamente."
          : "Recurso eliminado de profiles y usuario_especialidad. El usuario de auth.users no se puede borrar desde este frontend.",
      );
    } catch (error) {
      console.error("[Campus UCI] Error eliminando recurso:", error);
      setMessage(error.message || "No se pudo eliminar el recurso. Recomendación: desactivarlo para conservar historial.");
    } finally {
      setSaving(false);
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
          {canManageResources ? (
            <button type="button" className="academic-submit" onClick={openCreate}>
              <Plus size={16} strokeWidth={2.1} aria-hidden="true" />
              Nuevo recurso
            </button>
          ) : null}
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
          <select
            className="resources-filter-select"
            value={especialidadFilter}
            onChange={(event) => setEspecialidadFilter(event.target.value)}
          >
            <option value="">Todas las especialidades</option>
            {especialidades.map((especialidad) => (
              <option key={especialidad.id} value={especialidad.id}>{especialidad.nombre}</option>
            ))}
          </select>
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
                        {canManageResources ? (
                          <>
                            <button type="button" onClick={() => openEdit(resource)}>
                              <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                              Editar
                            </button>
                            <button
                              type="button"
                              className={resource.activo === false ? "" : "danger"}
                              onClick={() => handleToggle(resource)}
                              disabled={saving}
                            >
                              {resource.activo === false ? (
                                <UserCheck size={14} strokeWidth={2} aria-hidden="true" />
                              ) : (
                                <UserX size={14} strokeWidth={2} aria-hidden="true" />
                              )}
                              {resource.activo === false ? "Activar" : "Desactivar"}
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDelete(resource)}
                              disabled={saving}
                              title="Eliminar profile y asignaciones. No elimina auth.users desde frontend."
                            >
                              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                              Eliminar definitivo
                            </button>
                          </>
                        ) : null}
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
              {canManageResources ? null : (
                <div className="cu-alert">
                  <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                  Solo admin/jefe puede crear, editar, desactivar o eliminar recursos.
                </div>
              )}

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

              <label>
                Rol académico
                <select value={form.rol} onChange={(event) => setField("rol", event.target.value)}>
                  <option value="recurso">Recurso / estudiante</option>
                  <option value="docente">Docente</option>
                  <option value="jefe">Jefe</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

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
                <button type="submit" className="academic-submit" disabled={saving || !canManageResources}>
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
