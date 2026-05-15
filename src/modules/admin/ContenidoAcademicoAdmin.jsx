import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpenCheck,
  Eye,
  EyeOff,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  createAsignatura,
  createAviso,
  createForo,
  createMaterial,
  createSeccion,
  deleteAsignatura,
  deleteAviso,
  deleteForo,
  deleteMaterial,
  deleteSeccion,
  getAsignaturaDetalle,
  getAsignaturasByEspecialidad,
  updateAsignatura,
  updateAviso,
  updateForo,
  updateMaterial,
  updateSeccion,
} from "../../services/campusContenidoService";

const SECTION_PRESETS = [
  { titulo: "Bienvenida", tipo: "bienvenida", orden: 0 },
  { titulo: "Calendario", tipo: "calendario", orden: 1 },
  { titulo: "Semana 1", tipo: "semana", orden: 2 },
  { titulo: "Semana 2", tipo: "semana", orden: 3 },
  { titulo: "Semana 3", tipo: "semana", orden: 4 },
  { titulo: "Semana 4", tipo: "semana", orden: 5 },
  { titulo: "Semana 5", tipo: "semana", orden: 6 },
  { titulo: "Semana 6", tipo: "semana", orden: 7 },
];

const emptyAsignatura = {
  titulo: "",
  descripcion: "",
  imagen_url: "",
  orden: 0,
  publicado: true,
};

const emptySeccion = {
  tipo: "semana",
  titulo: "",
  descripcion: "",
  orden: 0,
  publicado: true,
};

const emptyMaterial = {
  seccion_id: "",
  titulo: "",
  descripcion: "",
  tipo: "documento",
  enlace_url: "",
  orden: 0,
  publicado: true,
  file: null,
};

const emptyAviso = {
  seccion_id: "",
  titulo: "",
  contenido: "",
  orden: 0,
  publicado: true,
};

const emptyForo = {
  seccion_id: "",
  titulo: "",
  descripcion: "",
  orden: 0,
  publicado: true,
};

function getCreatorId(profile, session) {
  return profile?.id || session?.user?.id || null;
}

function pickFirstEspecialidad(especialidades = []) {
  return especialidades.find((item) => item.activa !== false)?.id || especialidades[0]?.id || "";
}

function sectionLabel(secciones, id) {
  if (!id) return "Bienvenida";
  return secciones.find((item) => item.id === id)?.titulo || "Sección";
}

export default function ContenidoAcademicoAdmin({
  session = null,
  profile = null,
  especialidades = [],
  onBack = null,
}) {
  const [especialidadId, setEspecialidadId] = useState(() => pickFirstEspecialidad(especialidades));
  const [asignaturas, setAsignaturas] = useState([]);
  const [asignaturaId, setAsignaturaId] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [asignaturaForm, setAsignaturaForm] = useState(emptyAsignatura);
  const [seccionForm, setSeccionForm] = useState(emptySeccion);
  const [materialForm, setMaterialForm] = useState(emptyMaterial);
  const [avisoForm, setAvisoForm] = useState(emptyAviso);
  const [foroForm, setForoForm] = useState(emptyForo);
  const [editingAsignaturaId, setEditingAsignaturaId] = useState("");
  const [editingSeccionId, setEditingSeccionId] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState("");
  const [editingAvisoId, setEditingAvisoId] = useState("");
  const [editingForoId, setEditingForoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedAsignatura = useMemo(
    () => asignaturas.find((item) => item.id === asignaturaId) || null,
    [asignaturas, asignaturaId],
  );
  const secciones = detalle?.secciones || [];

  useEffect(() => {
    if (!especialidadId && especialidades.length) {
      setEspecialidadId(pickFirstEspecialidad(especialidades));
    }
  }, [especialidadId, especialidades]);

  useEffect(() => {
    let alive = true;

    async function loadAsignaturas() {
      if (!especialidadId) return;
      setLoading(true);
      setError("");

      try {
        const rows = await getAsignaturasByEspecialidad(especialidadId, { onlyPublished: false });
        if (!alive) return;
        setAsignaturas(rows);
        setAsignaturaId((current) => (rows.some((item) => item.id === current) ? current : rows[0]?.id || ""));
      } catch (loadError) {
        console.error("[Campus UCI] Error cargando contenido académico:", loadError);
        if (alive) setError(loadError.message || "No se pudo cargar el contenido académico.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadAsignaturas();
    return () => {
      alive = false;
    };
  }, [especialidadId]);

  useEffect(() => {
    let alive = true;

    async function loadDetalle() {
      if (!asignaturaId) {
        setDetalle(null);
        return;
      }

      try {
        const result = await getAsignaturaDetalle(asignaturaId, { onlyPublished: false });
        if (alive) setDetalle(result);
      } catch (loadError) {
        console.error("[Campus UCI] Error cargando detalle de contenido:", loadError);
        if (alive) setError(loadError.message || "No se pudo cargar el detalle de la asignatura.");
      }
    }

    loadDetalle();
    return () => {
      alive = false;
    };
  }, [asignaturaId]);

  async function reloadAll(nextAsignaturaId = asignaturaId) {
    if (!especialidadId) return;
    const rows = await getAsignaturasByEspecialidad(especialidadId, { onlyPublished: false });
    setAsignaturas(rows);
    const activeId = nextAsignaturaId || rows[0]?.id || "";
    setAsignaturaId(activeId);
    if (activeId) setDetalle(await getAsignaturaDetalle(activeId, { onlyPublished: false }));
  }

  async function saveAsignatura(event) {
    event.preventDefault();
    if (!especialidadId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...asignaturaForm,
        especialidad_id: especialidadId,
        created_by: getCreatorId(profile, session),
      };
      const saved = editingAsignaturaId
        ? await updateAsignatura(editingAsignaturaId, payload)
        : await createAsignatura(payload);
      setAsignaturaForm(emptyAsignatura);
      setEditingAsignaturaId("");
      await reloadAll(saved.id);
      setMessage(editingAsignaturaId ? "Asignatura actualizada." : "Asignatura creada.");
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando asignatura:", saveError);
      setError(saveError.message || "No se pudo guardar la asignatura.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSeccion(event) {
    event.preventDefault();
    if (!asignaturaId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...seccionForm,
        asignatura_id: asignaturaId,
        created_by: getCreatorId(profile, session),
      };
      await (editingSeccionId ? updateSeccion(editingSeccionId, payload) : createSeccion(payload));
      setSeccionForm(emptySeccion);
      setEditingSeccionId("");
      await reloadAll(asignaturaId);
      setMessage(editingSeccionId ? "Sección actualizada." : "Sección creada.");
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando sección:", saveError);
      setError(saveError.message || "No se pudo guardar la sección.");
    } finally {
      setSaving(false);
    }
  }

  async function createBaseSections() {
    if (!asignaturaId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const existing = new Set(secciones.map((item) => item.titulo?.toLowerCase()));
      for (const section of SECTION_PRESETS) {
        if (!existing.has(section.titulo.toLowerCase())) {
          await createSeccion({
            ...section,
            asignatura_id: asignaturaId,
            descripcion: "",
            publicado: true,
            created_by: getCreatorId(profile, session),
          });
        }
      }
      await reloadAll(asignaturaId);
      setMessage("Secciones base listas.");
    } catch (saveError) {
      console.error("[Campus UCI] Error creando secciones base:", saveError);
      setError(saveError.message || "No se pudieron crear las secciones base.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMaterial(event) {
    event.preventDefault();
    if (!asignaturaId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...materialForm,
        asignatura_id: asignaturaId,
        especialidad_id: especialidadId,
        created_by: getCreatorId(profile, session),
      };
      await (editingMaterialId ? updateMaterial(editingMaterialId, payload) : createMaterial(payload));
      setMaterialForm(emptyMaterial);
      setEditingMaterialId("");
      await reloadAll(asignaturaId);
      setMessage(editingMaterialId ? "Material actualizado." : "Material publicado.");
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando material:", saveError);
      setError(saveError.message || "No se pudo guardar el material.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAviso(event) {
    event.preventDefault();
    if (!asignaturaId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...avisoForm,
        asignatura_id: asignaturaId,
        created_by: getCreatorId(profile, session),
      };
      await (editingAvisoId ? updateAviso(editingAvisoId, payload) : createAviso(payload));
      setAvisoForm(emptyAviso);
      setEditingAvisoId("");
      await reloadAll(asignaturaId);
      setMessage(editingAvisoId ? "Aviso actualizado." : "Aviso creado.");
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando aviso:", saveError);
      setError(saveError.message || "No se pudo guardar el aviso.");
    } finally {
      setSaving(false);
    }
  }

  async function saveForo(event) {
    event.preventDefault();
    if (!asignaturaId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...foroForm,
        asignatura_id: asignaturaId,
        created_by: getCreatorId(profile, session),
      };
      await (editingForoId ? updateForo(editingForoId, payload) : createForo(payload));
      setForoForm(emptyForo);
      setEditingForoId("");
      await reloadAll(asignaturaId);
      setMessage(editingForoId ? "Foro actualizado." : "Foro creado.");
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando foro:", saveError);
      setError(saveError.message || "No se pudo guardar el foro.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublication(type, item) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = { ...item, publicado: !item.publicado };
      if (type === "asignatura") await updateAsignatura(item.id, payload);
      if (type === "seccion") await updateSeccion(item.id, payload);
      if (type === "material") await updateMaterial(item.id, payload);
      if (type === "aviso") await updateAviso(item.id, payload);
      if (type === "foro") await updateForo(item.id, payload);
      await reloadAll(type === "asignatura" ? item.id : asignaturaId);
      setMessage(item.publicado ? "Contenido oculto." : "Contenido publicado.");
    } catch (saveError) {
      console.error("[Campus UCI] Error cambiando publicación:", saveError);
      setError(saveError.message || "No se pudo cambiar el estado de publicación.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContent(type, item) {
    const baseMessage = "¿Seguro que deseas eliminar este contenido? Esta acción no se puede deshacer.";
    const asignaturaMessage = `${baseMessage}\n\nEliminar una asignatura puede eliminar u ocultar secciones, materiales, avisos y foros asociados según las relaciones configuradas en Supabase. Si solo querés retirarla del recurso, usá Ocultar.`;
    const confirmed = window.confirm(type === "asignatura" ? asignaturaMessage : baseMessage);
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (type === "asignatura") await deleteAsignatura(item.id);
      if (type === "seccion") await deleteSeccion(item.id);
      if (type === "material") await deleteMaterial(item);
      if (type === "aviso") await deleteAviso(item.id);
      if (type === "foro") await deleteForo(item.id);

      const shouldMoveSelection = type === "asignatura" && item.id === asignaturaId;
      await reloadAll(shouldMoveSelection ? "" : asignaturaId);
      if (shouldMoveSelection) setAsignaturaId("");
      setMessage("Contenido eliminado correctamente.");
    } catch (deleteError) {
      console.error("[Campus UCI] Error eliminando contenido:", deleteError);
      setError(deleteError.message || "No se pudo eliminar el contenido. Podés ocultarlo si tiene relaciones dependientes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="content-admin-page">
      <section className="moodle-hero">
        <div>
          <span>Campus académico</span>
          <h2>Contenido Académico</h2>
          <p>Administración de asignaturas, semanas, materiales, avisos y foros publicados para recursos.</p>
        </div>
        <button type="button" className="academic-secondary-action" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2} />
          Volver
        </button>
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}
      {message ? <div className="cu-success">{message}</div> : null}

      <section className="content-admin-toolbar">
        <label>
          Especialidad
          <select value={especialidadId} onChange={(event) => setEspecialidadId(event.target.value)}>
            <option value="">Seleccionar especialidad</option>
            {especialidades.map((especialidad) => (
              <option value={especialidad.id} key={especialidad.id}>{especialidad.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Asignatura activa
          <select value={asignaturaId} onChange={(event) => setAsignaturaId(event.target.value)} disabled={!asignaturas.length}>
            <option value="">Seleccionar asignatura</option>
            {asignaturas.map((asignatura) => (
              <option value={asignatura.id} key={asignatura.id}>{asignatura.titulo}</option>
            ))}
          </select>
        </label>
      </section>

      {loading ? <div className="cu-empty">Cargando contenido...</div> : null}

      <section className="content-admin-layout">
        <div className="content-admin-column">
          <article className="content-admin-panel">
            <div className="record-panel-head">
              <span>Asignaturas</span>
              <h3>{editingAsignaturaId ? "Editar asignatura" : "Crear asignatura"}</h3>
            </div>
            <form className="academic-form-grid" onSubmit={saveAsignatura}>
              <label>Título<input value={asignaturaForm.titulo} onChange={(event) => setAsignaturaForm((current) => ({ ...current, titulo: event.target.value }))} required /></label>
              <label>Orden<input type="number" value={asignaturaForm.orden} onChange={(event) => setAsignaturaForm((current) => ({ ...current, orden: event.target.value }))} /></label>
              <label className="wide">Descripción<textarea value={asignaturaForm.descripcion} onChange={(event) => setAsignaturaForm((current) => ({ ...current, descripcion: event.target.value }))} /></label>
              <label className="wide">Imagen URL<input value={asignaturaForm.imagen_url} onChange={(event) => setAsignaturaForm((current) => ({ ...current, imagen_url: event.target.value }))} /></label>
              <label className="academic-checkbox"><input type="checkbox" checked={asignaturaForm.publicado} onChange={(event) => setAsignaturaForm((current) => ({ ...current, publicado: event.target.checked }))} /> Publicado</label>
              <div className="academic-form-actions wide">
                <button type="submit" disabled={saving || !especialidadId}><Plus size={16} /> {editingAsignaturaId ? "Guardar cambios" : "Crear asignatura"}</button>
                {editingAsignaturaId ? <button type="button" className="secondary" onClick={() => { setEditingAsignaturaId(""); setAsignaturaForm(emptyAsignatura); }}>Cancelar</button> : null}
              </div>
            </form>
          </article>

          <article className="content-admin-panel">
            <div className="record-panel-head">
              <span>Secciones</span>
              <h3>{editingSeccionId ? "Editar sección" : "Crear semana/sección"}</h3>
            </div>
            <form className="academic-form-grid" onSubmit={saveSeccion}>
              <label>Título<input value={seccionForm.titulo} onChange={(event) => setSeccionForm((current) => ({ ...current, titulo: event.target.value }))} required /></label>
              <label>Tipo<select value={seccionForm.tipo} onChange={(event) => setSeccionForm((current) => ({ ...current, tipo: event.target.value }))}><option value="bienvenida">Bienvenida</option><option value="calendario">Calendario</option><option value="semana">Semana</option></select></label>
              <label>Orden<input type="number" value={seccionForm.orden} onChange={(event) => setSeccionForm((current) => ({ ...current, orden: event.target.value }))} /></label>
              <label className="wide">Descripción<textarea value={seccionForm.descripcion} onChange={(event) => setSeccionForm((current) => ({ ...current, descripcion: event.target.value }))} /></label>
              <label className="academic-checkbox"><input type="checkbox" checked={seccionForm.publicado} onChange={(event) => setSeccionForm((current) => ({ ...current, publicado: event.target.checked }))} /> Publicado</label>
              <div className="academic-form-actions wide">
                <button type="submit" disabled={saving || !asignaturaId}>{editingSeccionId ? "Guardar cambios" : "Crear sección"}</button>
                <button type="button" className="secondary" onClick={createBaseSections} disabled={saving || !asignaturaId}>Crear semanas base</button>
                {editingSeccionId ? <button type="button" className="secondary" onClick={() => { setEditingSeccionId(""); setSeccionForm(emptySeccion); }}>Cancelar</button> : null}
              </div>
            </form>
          </article>

          <article className="content-admin-panel">
            <div className="record-panel-head">
              <span>Materiales</span>
              <h3>{editingMaterialId ? "Editar material" : "Subir material"}</h3>
            </div>
            <form className="academic-form-grid" onSubmit={saveMaterial}>
              <label>Título<input value={materialForm.titulo} onChange={(event) => setMaterialForm((current) => ({ ...current, titulo: event.target.value }))} required /></label>
              <label>Sección<select value={materialForm.seccion_id} onChange={(event) => setMaterialForm((current) => ({ ...current, seccion_id: event.target.value }))}><option value="">Bienvenida / general</option>{secciones.map((section) => <option value={section.id} key={section.id}>{section.titulo}</option>)}</select></label>
              <label>Tipo<select value={materialForm.tipo} onChange={(event) => setMaterialForm((current) => ({ ...current, tipo: event.target.value }))}><option value="documento">Documento</option><option value="pdf">PDF</option><option value="video">Video</option><option value="enlace">Enlace</option></select></label>
              <label>Orden<input type="number" value={materialForm.orden} onChange={(event) => setMaterialForm((current) => ({ ...current, orden: event.target.value }))} /></label>
              <label className="wide">Descripción<textarea value={materialForm.descripcion} onChange={(event) => setMaterialForm((current) => ({ ...current, descripcion: event.target.value }))} /></label>
              <label className="wide">Enlace URL<input value={materialForm.enlace_url} onChange={(event) => setMaterialForm((current) => ({ ...current, enlace_url: event.target.value }))} /></label>
              {!editingMaterialId ? <label className="wide">Archivo<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.mp4" onChange={(event) => setMaterialForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} /></label> : null}
              <label className="academic-checkbox"><input type="checkbox" checked={materialForm.publicado} onChange={(event) => setMaterialForm((current) => ({ ...current, publicado: event.target.checked }))} /> Publicado</label>
              <div className="academic-form-actions wide">
                <button type="submit" disabled={saving || !asignaturaId}><UploadCloud size={16} /> {editingMaterialId ? "Guardar cambios" : "Publicar material"}</button>
                {editingMaterialId ? <button type="button" className="secondary" onClick={() => { setEditingMaterialId(""); setMaterialForm(emptyMaterial); }}>Cancelar</button> : null}
              </div>
            </form>
          </article>

          <article className="content-admin-grid">
            <form className="content-admin-panel academic-form-grid" onSubmit={saveAviso}>
              <div className="record-panel-head wide"><span>Avisos</span><h3>{editingAvisoId ? "Editar aviso" : "Crear aviso"}</h3></div>
              <label>Título<input value={avisoForm.titulo} onChange={(event) => setAvisoForm((current) => ({ ...current, titulo: event.target.value }))} required /></label>
              <label>Sección<select value={avisoForm.seccion_id} onChange={(event) => setAvisoForm((current) => ({ ...current, seccion_id: event.target.value }))}><option value="">Bienvenida / general</option>{secciones.map((section) => <option value={section.id} key={section.id}>{section.titulo}</option>)}</select></label>
              <label className="wide">Contenido<textarea value={avisoForm.contenido} onChange={(event) => setAvisoForm((current) => ({ ...current, contenido: event.target.value }))} /></label>
              <button type="submit" disabled={saving || !asignaturaId}><Bell size={16} /> {editingAvisoId ? "Guardar aviso" : "Crear aviso"}</button>
            </form>

            <form className="content-admin-panel academic-form-grid" onSubmit={saveForo}>
              <div className="record-panel-head wide"><span>Foros</span><h3>{editingForoId ? "Editar foro" : "Crear foro"}</h3></div>
              <label>Título<input value={foroForm.titulo} onChange={(event) => setForoForm((current) => ({ ...current, titulo: event.target.value }))} required /></label>
              <label>Sección<select value={foroForm.seccion_id} onChange={(event) => setForoForm((current) => ({ ...current, seccion_id: event.target.value }))}><option value="">Bienvenida / general</option>{secciones.map((section) => <option value={section.id} key={section.id}>{section.titulo}</option>)}</select></label>
              <label className="wide">Descripción<textarea value={foroForm.descripcion} onChange={(event) => setForoForm((current) => ({ ...current, descripcion: event.target.value }))} /></label>
              <button type="submit" disabled={saving || !asignaturaId}><MessageSquare size={16} /> {editingForoId ? "Guardar foro" : "Crear foro"}</button>
            </form>
          </article>
        </div>

        <aside className="content-admin-column">
          <article className="content-admin-panel">
            <div className="record-panel-head">
              <span>Asignaturas</span>
              <h3>{selectedAsignatura?.titulo || "Sin asignatura seleccionada"}</h3>
            </div>
            <div className="content-list">
              {asignaturas.length ? asignaturas.map((asignatura) => (
                <article className={asignatura.id === asignaturaId ? "active" : ""} key={asignatura.id}>
                  <BookOpenCheck size={18} strokeWidth={1.8} />
                  <div><strong>{asignatura.titulo}</strong><small>{asignatura.publicado ? "Publicado" : "Oculto"}</small></div>
                  <button type="button" onClick={() => setAsignaturaId(asignatura.id)}>Abrir</button>
                  <button type="button" onClick={() => { setEditingAsignaturaId(asignatura.id); setAsignaturaForm({ titulo: asignatura.titulo || "", descripcion: asignatura.descripcion || "", imagen_url: asignatura.imagen_url || "", orden: asignatura.orden || 0, publicado: asignatura.publicado !== false }); }}><Pencil size={15} /></button>
                  <button type="button" onClick={() => togglePublication("asignatura", asignatura)}>{asignatura.publicado ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button type="button" className="danger" onClick={() => deleteContent("asignatura", asignatura)} disabled={saving}><Trash2 size={15} /></button>
                </article>
              )) : <div className="cu-empty">Sin asignaturas creadas.</div>}
            </div>
          </article>

          <article className="content-admin-panel">
            <div className="record-panel-head"><span>Contenido publicado</span><h3>Detalle de asignatura</h3></div>
            <div className="content-list compact">
              {secciones.map((section) => (
                <article key={section.id}>
                  <FileText size={17} strokeWidth={1.8} />
                  <div><strong>{section.titulo}</strong><small>{section.publicado ? "Publicado" : "Oculto"}</small></div>
                  <button type="button" onClick={() => { setEditingSeccionId(section.id); setSeccionForm({ tipo: section.tipo || "semana", titulo: section.titulo || "", descripcion: section.descripcion || "", orden: section.orden || 0, publicado: section.publicado !== false }); }}><Pencil size={15} /></button>
                  <button type="button" onClick={() => togglePublication("seccion", section)}>{section.publicado ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button type="button" className="danger" onClick={() => deleteContent("seccion", section)} disabled={saving}><Trash2 size={15} /></button>
                </article>
              ))}
              {(detalle?.materiales || []).map((material) => (
                <article key={material.id}>
                  <UploadCloud size={17} strokeWidth={1.8} />
                  <div><strong>{material.titulo}</strong><small>{sectionLabel(secciones, material.seccion_id)} · {material.publicado ? "Publicado" : "Oculto"}</small></div>
                  <button type="button" onClick={() => { setEditingMaterialId(material.id); setMaterialForm({ seccion_id: material.seccion_id || "", titulo: material.titulo || "", descripcion: material.descripcion || "", tipo: material.tipo || "documento", enlace_url: material.enlace_url || "", orden: material.orden || 0, publicado: material.publicado !== false, file: null }); }}><Pencil size={15} /></button>
                  <button type="button" onClick={() => togglePublication("material", material)}>{material.publicado ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button type="button" className="danger" onClick={() => deleteContent("material", material)} disabled={saving}><Trash2 size={15} /></button>
                </article>
              ))}
              {(detalle?.avisos || []).map((aviso) => (
                <article key={aviso.id}>
                  <Bell size={17} strokeWidth={1.8} />
                  <div><strong>{aviso.titulo}</strong><small>{sectionLabel(secciones, aviso.seccion_id)} · {aviso.publicado ? "Publicado" : "Oculto"}</small></div>
                  <button type="button" onClick={() => { setEditingAvisoId(aviso.id); setAvisoForm({ seccion_id: aviso.seccion_id || "", titulo: aviso.titulo || "", contenido: aviso.contenido || "", orden: aviso.orden || 0, publicado: aviso.publicado !== false }); }}><Pencil size={15} /></button>
                  <button type="button" onClick={() => togglePublication("aviso", aviso)}>{aviso.publicado ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button type="button" className="danger" onClick={() => deleteContent("aviso", aviso)} disabled={saving}><Trash2 size={15} /></button>
                </article>
              ))}
              {(detalle?.foros || []).map((foro) => (
                <article key={foro.id}>
                  <MessageSquare size={17} strokeWidth={1.8} />
                  <div><strong>{foro.titulo}</strong><small>{sectionLabel(secciones, foro.seccion_id)} · {foro.publicado ? "Publicado" : "Oculto"}</small></div>
                  <button type="button" onClick={() => { setEditingForoId(foro.id); setForoForm({ seccion_id: foro.seccion_id || "", titulo: foro.titulo || "", descripcion: foro.descripcion || "", orden: foro.orden || 0, publicado: foro.publicado !== false }); }}><Pencil size={15} /></button>
                  <button type="button" onClick={() => togglePublication("foro", foro)}>{foro.publicado ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button type="button" className="danger" onClick={() => deleteContent("foro", foro)} disabled={saving}><Trash2 size={15} /></button>
                </article>
              ))}
              {!secciones.length && !(detalle?.materiales || []).length && !(detalle?.avisos || []).length && !(detalle?.foros || []).length ? (
                <div className="cu-empty">Sin contenido para la asignatura seleccionada.</div>
              ) : null}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
