import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  Link,
  Paperclip,
  Save,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getEspecialidadesPermitidas } from "../../services/docenteService";
import {
  createCronogramaClase,
  deleteCronogramaClase,
  getCronogramaClases,
  updateCronogramaClase,
} from "../../services/cronogramaService";
import { supabase } from "../../supabaseClient";

const initialForm = {
  titulo: "",
  tipo: "",
  especialidad_id: "",
  modulo: "",
  docente: "",
  recurso: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  duracion: "",
  descripcion: "",
  modalidad: "Presencial",
  recurrente: false,
  enlace_virtual: "",
  adjunto_referencia: "",
};

function pickFirstEspecialidad(especialidades = []) {
  return especialidades.find((item) => item.activa !== false) || especialidades[0] || null;
}

function calculateDuration(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return "";
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes <= 0) return "";
  return `${minutes} min`;
}

function buildCronogramaPayload(form, status, createdBy = null) {
  const contenido = [
    form.descripcion?.trim(),
    form.docente ? `Docente: ${form.docente}` : "",
    form.recurso ? `Recurso / Aula / Sala: ${form.recurso}` : "",
    form.modalidad ? `Modalidad: ${form.modalidad}` : "",
    form.hora_inicio ? `Hora inicio: ${form.hora_inicio}` : "",
    form.hora_fin ? `Hora fin: ${form.hora_fin}` : "",
    form.duracion ? `Duracion: ${form.duracion}` : "",
    form.enlace_virtual ? `Enlace: ${form.enlace_virtual}` : "",
    form.recurrente ? "Clase recurrente: Si" : "",
    form.adjunto_referencia ? `Material de apoyo: ${form.adjunto_referencia}` : "",
  ].filter(Boolean).join("\n\n");

  return {
    especialidad_id: form.especialidad_id,
    created_by: createdBy,
    semana: form.modulo?.trim() || "General",
    fecha: form.fecha || null,
    tema: form.titulo?.trim(),
    contenido,
    actividad: form.tipo || "Clase",
    evaluacion: `Estado: ${status}`,
  };
}

function formFromClase(clase) {
  return {
    ...initialForm,
    titulo: clase.tema || clase.titulo || "",
    tipo: clase.actividad || "",
    especialidad_id: clase.especialidad_id || "",
    modulo: clase.semana || "",
    docente: clase.docente || "",
    recurso: "",
    fecha: clase.fecha || "",
    hora_inicio: clase.hora_inicio || "",
    hora_fin: clase.hora_fin || "",
    duracion: clase.duracion || "",
    descripcion: clase.contenido || clase.descripcion || "",
    modalidad: clase.modalidad || "Presencial",
    recurrente: /Clase recurrente:\s*Si/i.test(clase.contenido || ""),
    enlace_virtual: clase.enlace_virtual || "",
    adjunto_referencia: "",
  };
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function DocenteCronograma({
  profile = null,
  especialidades = [],
  onBack = null,
}) {
  const [especialidadesPermitidas, setEspecialidadesPermitidas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classes, setClasses] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [detailClass, setDetailClass] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedEspecialidad = useMemo(
    () => especialidadesPermitidas.find((item) => item.id === form.especialidad_id) || null,
    [especialidadesPermitidas, form.especialidad_id],
  );

  useEffect(() => {
    let alive = true;

    async function loadPermitidas() {
      const rows = await getEspecialidadesPermitidas(profile, especialidades);
      if (!alive) return;
      const first = pickFirstEspecialidad(rows);
      setEspecialidadesPermitidas(rows);
      setForm((current) => ({
        ...current,
        especialidad_id: rows.some((item) => item.id === current.especialidad_id)
          ? current.especialidad_id
          : first?.id || "",
        docente: current.docente || profile?.nombre || "",
      }));
    }

    loadPermitidas();
    return () => {
      alive = false;
    };
  }, [especialidades, profile]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      duracion: calculateDuration(current.hora_inicio, current.hora_fin),
    }));
  }, [form.hora_inicio, form.hora_fin]);

  useEffect(() => {
    loadClases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.especialidad_id]);

  function updateField(field, value) {
    setMessage("");
    setError("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    if (!form.especialidad_id) return "Selecciona una especialidad.";
    if (!form.titulo.trim()) return "Escribí el título de la actividad.";
    if (!form.tipo) return "Selecciona el tipo de actividad.";
    if (!form.fecha) return "Selecciona la fecha.";
    if (!form.hora_inicio || !form.hora_fin) return "Selecciona hora inicio y hora fin.";
    if (form.modalidad === "Virtual" && !form.enlace_virtual.trim()) return "Agregá el enlace para la clase virtual.";
    return "";
  }

  async function loadClases() {
    if (!form.especialidad_id) {
      setClasses([]);
      return;
    }

    setLoadingClasses(true);
    try {
      const rows = await getCronogramaClases(form.especialidad_id);
      setClasses(rows);
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando clases del cronograma:", loadError);
      setError(loadError.message || "No se pudieron cargar las clases programadas.");
    } finally {
      setLoadingClasses(false);
    }
  }

  async function saveCronograma(status) {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload = buildCronogramaPayload(form, status, authData?.user?.id || null);

      if (editingId) {
        await updateCronogramaClase(editingId, payload);
      } else {
        await createCronogramaClase(payload);
      }

      setMessage(status === "borrador" ? "Borrador guardado correctamente." : "Cronograma guardado correctamente.");
      setEditingId("");
      setForm((current) => ({
        ...initialForm,
        especialidad_id: current.especialidad_id,
        docente: profile?.nombre || current.docente,
        modalidad: "Presencial",
      }));
      await loadClases();
    } catch (saveError) {
      console.error("[Campus UCI] Error guardando cronograma:", saveError);
      setError(saveError.message || "No se pudo guardar el cronograma.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(clase) {
    setEditingId(clase.id);
    setDetailClass(null);
    setForm(formFromClase(clase));
    setMessage("Modo edición activo. Actualizá los campos y guardá los cambios.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeClase(clase) {
    const ok = window.confirm("¿Seguro que deseas eliminar esta clase del cronograma? Esta acción no se puede deshacer.");
    if (!ok) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteCronogramaClase(clase.id);
      setMessage("Clase eliminada correctamente.");
      await loadClases();
    } catch (deleteError) {
      console.error("[Campus UCI] Error eliminando clase del cronograma:", deleteError);
      setError(deleteError.message || "No se pudo eliminar la clase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cronograma-pro-page">
      <section className="cronograma-pro-shell">
        <header className="cronograma-pro-header">
          <div className="cronograma-pro-title">
            <span className="cronograma-pro-icon"><CalendarDays size={35} strokeWidth={1.9} /></span>
            <div>
              <h2>Cronograma <em>PRO</em></h2>
              <p>Programación de clases, módulos, docentes y actividades académicas.</p>
            </div>
          </div>

          {onBack ? (
            <button type="button" className="cronograma-back-btn" onClick={onBack}>
              <ArrowLeft size={18} strokeWidth={2.1} />
              Volver al panel
            </button>
          ) : null}
        </header>

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}
        {message ? <div className="cu-success">{message}</div> : null}

        <div className="cronograma-pro-layout">
          <form className="cronograma-pro-form" onSubmit={(event) => event.preventDefault()}>
            <div className="cronograma-form-head">
              <span />
              <h3>{editingId ? "Editar cronograma" : "Registrar nuevo cronograma"}</h3>
              <p>Completa la información para programar una nueva clase o actividad académica.</p>
            </div>

            <div className="cronograma-field-grid two">
              <label>
                <strong>Título de la actividad <b>*</b></strong>
                <input value={form.titulo} onChange={(event) => updateField("titulo", event.target.value)} placeholder="Ej. Clase: Introducción a la Terapia Sustitutiva" />
              </label>
              <label>
                <strong>Tipo de actividad <b>*</b></strong>
                <select value={form.tipo} onChange={(event) => updateField("tipo", event.target.value)}>
                  <option value="">Selecciona un tipo</option>
                  <option>Clase teórica</option>
                  <option>Clase práctica</option>
                  <option>Simulación</option>
                  <option>Evaluación</option>
                  <option>Taller</option>
                </select>
              </label>
              <label>
                <strong>Especialidad <b>*</b></strong>
                <span className="cronograma-input-icon"><UsersRound size={18} /><select value={form.especialidad_id} onChange={(event) => updateField("especialidad_id", event.target.value)}>
                  <option value="">Selecciona la especialidad</option>
                  {especialidadesPermitidas.map((item) => (
                    <option key={item.id} value={item.id}>{item.nombre}</option>
                  ))}
                </select></span>
              </label>
              <label>
                <strong>Módulo / Unidad <b>*</b></strong>
                <span className="cronograma-input-icon purple"><BookOpen size={18} /><input value={form.modulo} onChange={(event) => updateField("modulo", event.target.value)} placeholder="Selecciona el módulo o unidad" /></span>
              </label>
              <label>
                <strong>Docente <b>*</b></strong>
                <span className="cronograma-input-icon blue"><UserRound size={18} /><input value={form.docente} onChange={(event) => updateField("docente", event.target.value)} placeholder="Selecciona el docente" /></span>
              </label>
              <label>
                <strong>Recurso / Aula / Sala <b>*</b></strong>
                <span className="cronograma-input-icon orange"><Building2 size={18} /><input value={form.recurso} onChange={(event) => updateField("recurso", event.target.value)} placeholder="Selecciona el recurso o aula" /></span>
              </label>
            </div>

            <div className="cronograma-field-card">
              <div className="cronograma-field-grid four">
                <label>
                  <strong>Fecha <b>*</b></strong>
                  <span className="cronograma-input-icon blue"><CalendarDays size={18} /><input type="date" value={form.fecha} onChange={(event) => updateField("fecha", event.target.value)} /></span>
                </label>
                <label>
                  <strong>Hora inicio <b>*</b></strong>
                  <span className="cronograma-input-icon"><Clock3 size={18} /><input type="time" value={form.hora_inicio} onChange={(event) => updateField("hora_inicio", event.target.value)} /></span>
                </label>
                <label>
                  <strong>Hora fin <b>*</b></strong>
                  <span className="cronograma-input-icon"><Clock3 size={18} /><input type="time" value={form.hora_fin} onChange={(event) => updateField("hora_fin", event.target.value)} /></span>
                </label>
                <label>
                  <strong>Duración</strong>
                  <span className="cronograma-input-icon cronograma-duration-input"><input value={form.duracion} readOnly placeholder="Ej. 90 min" /><Clock3 size={18} /></span>
                </label>
              </div>

              <div className="cronograma-field-grid two align-start">
                <label>
                  <strong>Descripción / Temario</strong>
                  <textarea value={form.descripcion} onChange={(event) => updateField("descripcion", event.target.value)} rows={5} maxLength={500} placeholder="Describe el contenido, objetivos o temas que se abordarán en esta sesión..." />
                  <small>{form.descripcion.length} / 500</small>
                </label>

                <div className="cronograma-mode-block">
                  <strong>Modalidad <b>*</b></strong>
                  <div className="cronograma-mode-options">
                    {["Presencial", "Virtual", "Híbrida"].map((item) => (
                      <button type="button" key={item} className={form.modalidad === item ? "active" : ""} onClick={() => updateField("modalidad", item)}>
                        <span /> {item}
                      </button>
                    ))}
                  </div>

                  {(form.modalidad === "Virtual" || form.modalidad === "Híbrida") ? (
                    <label className="cronograma-inline-link">
                      <strong>Enlace de clase</strong>
                      <span className="cronograma-input-icon"><Link size={18} /><input value={form.enlace_virtual} onChange={(event) => updateField("enlace_virtual", event.target.value)} placeholder="https://..." /></span>
                    </label>
                  ) : null}

                  <label className="cronograma-switch-row">
                    <div>
                      <strong>Clase recurrente</strong>
                      <small>Activa si esta clase se repetirá en varias fechas</small>
                    </div>
                    <span className="cronograma-switch-control">
                      <input type="checkbox" checked={form.recurrente} onChange={(event) => updateField("recurrente", event.target.checked)} />
                      <i />
                    </span>
                  </label>
                </div>
              </div>

              <label className="cronograma-file-box">
                <Paperclip size={23} strokeWidth={1.9} />
                <div>
                  <strong>Archivos adjuntos <span>(opcional)</span></strong>
                  <small>Guías, presentaciones, documentos o enlaces de apoyo.</small>
                </div>
                <span className="cronograma-file-action"><Upload size={16} /> Seleccionar archivos</span>
                <input value={form.adjunto_referencia} onChange={(event) => updateField("adjunto_referencia", event.target.value)} placeholder="Pega un enlace externo o referencia de material" />
              </label>
            </div>
          </form>

          <aside className="cronograma-pro-side">
            <section>
              <h3>Resumen del cronograma</h3>
              <div className="cronograma-summary-empty">
                <CalendarCheck size={58} strokeWidth={1.8} />
                {form.titulo || selectedEspecialidad ? (
                  <>
                    <strong>{form.titulo || "Actividad pendiente de título"}</strong>
                    <span>{selectedEspecialidad?.nombre || "Especialidad pendiente"} · {form.fecha || "Sin fecha"} · {form.hora_inicio || "--:--"}</span>
                  </>
                ) : (
                  <span>Completa la información para ver el resumen de tu cronograma.</span>
                )}
              </div>
            </section>

            <section>
              <h3>Consejos <em>PRO</em></h3>
              {[
                "Programa con anticipación",
                "Incluye objetivos claros",
                "Adjunta material de apoyo",
                "Revisa la disponibilidad del recurso",
                "Notifica a los participantes",
              ].map((item) => (
                <p key={item}><CheckCircle2 size={17} /> {item}</p>
              ))}
            </section>
          </aside>
        </div>

        <section className="cronograma-programmed-section">
          <div className="cronograma-programmed-head">
            <div>
              <span>Calendario académico</span>
              <h3>Clases programadas</h3>
            </div>
            <strong>{classes.length} registros</strong>
          </div>

          {loadingClasses ? <div className="cu-empty">Cargando clases programadas...</div> : null}
          {!loadingClasses && !classes.length ? (
            <div className="cu-empty">Aún no hay clases registradas para esta especialidad.</div>
          ) : null}

          {classes.length ? (
            <div className="cronograma-programmed-grid">
              {classes.map((clase) => (
                <article className="cronograma-class-card" key={clase.id}>
                  <div className="cronograma-class-date">
                    <CalendarDays size={18} strokeWidth={2} />
                    <span>{formatDate(clase.fecha)}</span>
                  </div>
                  <div className="cronograma-class-main">
                    <span className={`academic-status ${clase.estado || "programada"}`}>{clase.estado || "programada"}</span>
                    <h4>{clase.titulo}</h4>
                    <p>{clase.especialidades?.nombre || selectedEspecialidad?.nombre || "Especialidad"} · {clase.modalidad || "Modalidad por definir"}</p>
                    <small>{clase.hora_inicio || "--:--"} {clase.hora_fin ? `- ${clase.hora_fin}` : ""} · {clase.docente || "Docente pendiente"}</small>
                    {clase.actividad ? <em>{clase.actividad}</em> : null}
                  </div>
                  <div className="cronograma-class-actions">
                    <button type="button" onClick={() => setDetailClass(clase)} title="Ver clase"><Eye size={16} /></button>
                    <button type="button" onClick={() => startEdit(clase)} title="Editar clase"><Edit3 size={16} /></button>
                    <button type="button" onClick={() => removeClase(clase)} title="Eliminar clase"><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {detailClass ? (
          <div className="student-detail-backdrop" role="presentation" onClick={() => setDetailClass(null)}>
            <section className="student-detail-modal cronograma-detail-modal" role="dialog" aria-modal="true" aria-label="Detalle de clase" onClick={(event) => event.stopPropagation()}>
              <div className="student-detail-head">
                <div>
                  <span>Clase programada</span>
                  <h3>{detailClass.titulo}</h3>
                </div>
                <button type="button" onClick={() => setDetailClass(null)} aria-label="Cerrar detalle">×</button>
              </div>
              <div className="student-detail-body">
                <p><strong>Fecha:</strong> {formatDate(detailClass.fecha)}</p>
                <p><strong>Hora:</strong> {detailClass.hora_inicio || "--:--"} {detailClass.hora_fin ? `- ${detailClass.hora_fin}` : ""}</p>
                <p><strong>Especialidad:</strong> {detailClass.especialidades?.nombre || selectedEspecialidad?.nombre || "Especialidad"}</p>
                <p><strong>Modalidad:</strong> {detailClass.modalidad || "No indicada"}</p>
                <p><strong>Docente:</strong> {detailClass.docente || "Pendiente"}</p>
                <p><strong>Actividad:</strong> {detailClass.actividad || "Clase académica"}</p>
                <p><strong>Contenido:</strong></p>
                <pre className="cronograma-detail-text">{detailClass.contenido || "Sin descripción registrada."}</pre>
                {detailClass.enlace_virtual ? (
                  <a href={detailClass.enlace_virtual} target="_blank" rel="noreferrer" className="academic-primary-action">Abrir enlace</a>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        <footer className="cronograma-pro-actions">
          <button type="button" className="cronograma-cancel" onClick={editingId ? () => {
            setEditingId("");
            setForm((current) => ({ ...initialForm, especialidad_id: current.especialidad_id, docente: profile?.nombre || current.docente, modalidad: "Presencial" }));
          } : onBack}>{editingId ? "Cancelar edición" : "Cancelar"}</button>
          <div>
            <button type="button" className="cronograma-draft" disabled={saving} onClick={() => saveCronograma("borrador")}>Guardar borrador</button>
            <button type="button" className="cronograma-save" disabled={saving} onClick={() => saveCronograma("programada")}>
              <Save size={17} /> {editingId ? "Guardar cambios" : "Guardar cronograma"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
