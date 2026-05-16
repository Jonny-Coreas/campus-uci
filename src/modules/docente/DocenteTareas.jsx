import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Save } from "lucide-react";
import { createTarea } from "../../services/clasesTareasService";
import { getEspecialidadesPermitidas } from "../../services/docenteService";
import { getAsignaturasByEspecialidad, uploadMaterialFile } from "../../services/campusContenidoService";
import { buildTaskInstructions } from "../../utils/taskMetadata";

const initialForm = {
  especialidadId: "",
  asignaturaId: "",
  titulo: "",
  descripcion: "",
  fechaLimite: new Date().toISOString().slice(0, 10),
  puntaje: 100,
  publicarAhora: true,
  archivo: null,
};

export default function DocenteTareas({
  profile = null,
  especialidades = [],
  onBack = null,
}) {
  const [especialidadesPermitidas, setEspecialidadesPermitidas] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadPermitidas() {
      const rows = await getEspecialidadesPermitidas(profile, especialidades);
      if (!alive) return;
      setEspecialidadesPermitidas(rows);
      setForm((prev) => ({
        ...prev,
        especialidadId: prev.especialidadId || rows[0]?.id || "",
      }));
    }

    loadPermitidas();
    return () => {
      alive = false;
    };
  }, [especialidades, profile]);

  useEffect(() => {
    let alive = true;

    async function loadAsignaturas() {
      if (!form.especialidadId) {
        setAsignaturas([]);
        return;
      }

      try {
        const rows = await getAsignaturasByEspecialidad(form.especialidadId, { onlyPublished: false });
        if (alive) setAsignaturas(rows);
      } catch (error) {
        console.warn("[Campus UCI] No se pudieron cargar asignaturas para tarea:", error);
        if (alive) setAsignaturas([]);
      }
    }

    loadAsignaturas();
    return () => {
      alive = false;
    };
  }, [form.especialidadId]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateAttachment(file) {
    if (!file) return;
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {
      throw new Error("Archivo no permitido. Usá PDF, Word, Excel, PowerPoint o imagen.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      validateAttachment(form.archivo);

      const attachmentPayload = form.archivo
        ? await uploadMaterialFile({
            especialidadId: form.especialidadId,
            asignaturaId: form.asignaturaId || "tareas",
            file: form.archivo,
          })
        : null;
      const attachments = attachmentPayload?.archivo_url
        ? [{
            nombre: attachmentPayload.archivo_nombre || form.archivo?.name || "Adjunto de tarea",
            tipo: attachmentPayload.archivo_tipo || form.archivo?.type || "archivo",
            url: attachmentPayload.archivo_url,
          }]
        : [];

      await createTarea(form.especialidadId, {
        titulo: form.titulo,
        instrucciones: buildTaskInstructions({
          description: form.descripcion,
          asignaturaId: form.asignaturaId,
          attachments,
        }),
        fecha_publicacion: new Date().toISOString().slice(0, 10),
        fecha_limite: form.fechaLimite,
        puntaje: form.puntaje,
        estado: form.publicarAhora ? "abierta" : "cerrada",
      });

      setForm((prev) => ({
        ...initialForm,
        especialidadId: prev.especialidadId,
      }));
      setMessage("Tarea creada correctamente. El recurso la verá en MiCampus si pertenece a esta especialidad.");
    } catch (error) {
      console.error("[Campus UCI] Error creando tarea docente:", error);
      setMessage(error.message || "No se pudo crear la tarea.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="teacher-dashboard-page">
      <section className="teacher-hero-card">
        <div>
          <span>Panel Docente</span>
          <h2>+ Nueva tarea</h2>
          <p>Publicá una tarea para los recursos asignados a la especialidad seleccionada.</p>
        </div>
        {onBack ? (
          <button type="button" className="academic-secondary-action" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Volver
          </button>
        ) : null}
      </section>

      {message ? <div className="cu-alert">{message}</div> : null}

      <section className="teacher-grid">
        <article className="teacher-panel">
          <div className="student-panel-head">
            <span>Tareas</span>
            <h3>Datos de publicación</h3>
          </div>

          <form className="academic-form" onSubmit={handleSubmit}>
            <label>
              Especialidad
              <select value={form.especialidadId} onChange={(event) => setField("especialidadId", event.target.value)} required>
                <option value="">Seleccionar especialidad</option>
                {especialidadesPermitidas.map((especialidad) => (
                  <option key={especialidad.id} value={especialidad.id}>{especialidad.nombre}</option>
                ))}
              </select>
            </label>

            <label>
              Asignatura / módulo
              <select value={form.asignaturaId} onChange={(event) => setField("asignaturaId", event.target.value)}>
                <option value="">Sin asignatura específica</option>
                {asignaturas.map((asignatura) => (
                  <option key={asignatura.id} value={asignatura.id}>{asignatura.titulo}</option>
                ))}
              </select>
            </label>

            <label>
              Título
              <input value={form.titulo} onChange={(event) => setField("titulo", event.target.value)} required />
            </label>

            <label>
              Descripción / instrucciones
              <textarea rows={5} value={form.descripcion} onChange={(event) => setField("descripcion", event.target.value)} required />
            </label>

            <div className="academic-form-row">
              <label>
                Fecha límite
                <input type="date" value={form.fechaLimite} onChange={(event) => setField("fechaLimite", event.target.value)} required />
              </label>
              <label>
                Puntos
                <input type="number" min="0" value={form.puntaje} onChange={(event) => setField("puntaje", event.target.value)} />
              </label>
            </div>

            <label className="academic-check-row">
              <input
                type="checkbox"
                checked={form.publicarAhora}
                onChange={(event) => setField("publicarAhora", event.target.checked)}
              />
              Publicar ahora
            </label>

            <label>
              Archivo adjunto
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
                onChange={(event) => setField("archivo", event.target.files?.[0] || null)}
              />
            </label>

            {!especialidadesPermitidas.length ? (
              <div className="cu-empty">No tenés especialidades asignadas para crear tareas.</div>
            ) : null}

            <button type="submit" className="academic-submit" disabled={saving || !especialidadesPermitidas.length}>
              <Save size={16} strokeWidth={2} aria-hidden="true" />
              {saving ? "Guardando..." : "Crear tarea"}
            </button>
          </form>
        </article>

        <article className="teacher-panel">
          <div className="student-panel-head">
            <span>Publicación</span>
            <h3>Destino</h3>
          </div>
          <div className="cu-empty">
            <ClipboardList size={22} strokeWidth={1.9} aria-hidden="true" />
            La tarea se guarda en el módulo actual de tareas y aparece como tarea abierta en MiCampus para recursos de la especialidad.
          </div>
        </article>
      </section>
    </div>
  );
}
