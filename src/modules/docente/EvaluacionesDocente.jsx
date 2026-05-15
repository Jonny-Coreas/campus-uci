import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpenCheck, Save } from "lucide-react";
import {
  getEspecialidadesPermitidas,
  getRecursosEvaluacion,
  registrarNota,
} from "../../services/docenteService";
import { buildDraftKey, useLocalDraft } from "../../hooks/useLocalDraft";

const initialForm = {
  especialidadId: "",
  recursoId: "",
  area: "Evaluación docente",
  actividad: "",
  nota: "",
  observaciones: "",
};

function isEvaluacionDraftEmpty(value) {
  return !String(value?.especialidadId || "").trim()
    && !String(value?.recursoId || "").trim()
    && String(value?.area || "") === initialForm.area
    && !String(value?.actividad || "").trim()
    && !String(value?.nota || "").trim()
    && !String(value?.observaciones || "").trim();
}

export default function EvaluacionesDocente({
  session = null,
  profile = null,
  especialidades = [],
  onBack = null,
}) {
  const [form, setForm] = useState(initialForm);
  const [recursos, setRecursos] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loadingRecursos, setLoadingRecursos] = useState(false);
  const [especialidadesPermitidas, setEspecialidadesPermitidas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const draftKey = buildDraftKey(
    "evaluacionesDocente",
    profile?.id || profile?.user_id || session?.user?.id || "docente",
  );
  const { hasDraft, clearDraft } = useLocalDraft({
    key: draftKey,
    value: form,
    enabled: true,
    isEmpty: isEvaluacionDraftEmpty,
    onRestore: (draft) => setForm((prev) => ({ ...prev, ...draft })),
  });

  useEffect(() => {
    loadRecursos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.especialidadId]);

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

  async function loadRecursos() {
    if (!form.especialidadId) {
      setRecursos([]);
      return;
    }

    setLoadingRecursos(true);
    setMessage("");

    try {
      const data = await getRecursosEvaluacion(form.especialidadId);
      setRecursos(data);
    } catch (error) {
      console.error("[Campus UCI] Error cargando recursos para evaluación:", error);
      setMessage(error.message || "No se pudieron cargar recursos.");
    } finally {
      setLoadingRecursos(false);
    }
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const inserted = await registrarNota({
        especialidadId: form.especialidadId,
        recursoId: form.recursoId,
        area: form.area,
        actividad: form.actividad,
        nota: form.nota,
        observaciones: form.observaciones,
        createdBy: profile?.user_id || session?.user?.id || null,
      });

      setEvaluaciones((prev) => [inserted, ...prev]);
      clearDraft();
      setForm((prev) => ({
        ...initialForm,
        especialidadId: prev.especialidadId,
      }));
      setMessage("Evaluación registrada correctamente.");
    } catch (error) {
      console.error("[Campus UCI] Error registrando evaluación:", error);
      setMessage(error.message || "No se pudo registrar la evaluación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="teacher-dashboard-page">
      <section className="teacher-hero-card">
        <div>
          <span>Evaluaciones docente</span>
          <h2>Registrar evaluación</h2>
          <p>Creá evaluaciones, asigná puntajes y registrá notas reales por recurso académico.</p>
        </div>
        <button type="button" className="academic-secondary-action" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Volver
        </button>
      </section>

      {message ? <div className="cu-alert">{message}</div> : null}

      <section className="teacher-grid">
        <article className="teacher-panel">
          <div className="student-panel-head">
            <span>Nueva evaluación</span>
            <h3>Datos académicos</h3>
          </div>

          <form className="academic-form" onSubmit={handleSubmit}>
            {hasDraft ? (
              <div className="draft-notice">
                <span>Borrador restaurado automáticamente.</span>
                <button
                  type="button"
                  onClick={() => {
                    clearDraft();
                    setForm(initialForm);
                    setMessage("");
                  }}
                >
                  Limpiar borrador
                </button>
              </div>
            ) : null}
            <label>
              Especialidad
              <select value={form.especialidadId} onChange={(event) => setField("especialidadId", event.target.value)} required>
                <option value="">Seleccionar especialidad</option>
                {especialidadesPermitidas.map((especialidad) => (
                  <option key={especialidad.id} value={especialidad.id}>
                    {especialidad.nombre}
                  </option>
                ))}
              </select>
            </label>

            {!especialidadesPermitidas.length ? (
              <div className="cu-empty">No tenés especialidades asignadas para registrar evaluaciones.</div>
            ) : null}

            <label>
              Recurso
              <select value={form.recursoId} onChange={(event) => setField("recursoId", event.target.value)} required disabled={!form.especialidadId || loadingRecursos}>
                <option value="">{loadingRecursos ? "Cargando recursos..." : "Seleccionar recurso"}</option>
                {recursos.map((recurso) => (
                  <option key={recurso.profile_id || recurso.id} value={recurso.profile_id || recurso.id}>
                    {recurso.nombre} {recurso.cum ? `· ${recurso.cum}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="academic-form-row">
              <label>
                Área
                <input value={form.area} onChange={(event) => setField("area", event.target.value)} />
              </label>
              <label>
                Evaluación
                <input value={form.actividad} onChange={(event) => setField("actividad", event.target.value)} required />
              </label>
            </div>

            <label>
              Nota / Puntaje
              <input type="number" min="0" max="10" step="0.01" value={form.nota} onChange={(event) => setField("nota", event.target.value)} required />
            </label>

            <label>
              Observaciones
              <textarea rows={4} value={form.observaciones} onChange={(event) => setField("observaciones", event.target.value)} />
            </label>

            <button type="submit" className="academic-submit" disabled={saving}>
              <Save size={16} strokeWidth={2} aria-hidden="true" />
              {saving ? "Guardando..." : "Registrar nota"}
            </button>
          </form>
        </article>

        <article className="teacher-panel">
          <div className="student-panel-head">
            <span>Seguimiento</span>
            <h3>Recursos evaluados</h3>
          </div>

          {evaluaciones.length ? (
            <div className="student-list">
              {evaluaciones.map((evaluacion) => (
                <article key={evaluacion.id}>
                  <strong>{evaluacion.actividad || "Evaluación"}</strong>
                  <small>{evaluacion.area || "Área"} · Nota {evaluacion.nota}</small>
                  <p>{evaluacion.observaciones || "Sin observaciones."}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="cu-empty">
              <BookOpenCheck size={22} strokeWidth={1.9} aria-hidden="true" />
              Aún no registraste evaluaciones en esta sesión.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
