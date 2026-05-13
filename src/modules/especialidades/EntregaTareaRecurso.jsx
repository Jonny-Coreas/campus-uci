import React, { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileUp, MessageSquare } from "lucide-react";
import {
  getEntregaByTareaAndRecurso,
  submitEntregaTarea,
} from "../../services/clasesTareasService";

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function EntregaTareaRecurso({
  tarea = null,
  especialidad = null,
  profile = null,
  session = null,
  onBack = null,
}) {
  const [entrega, setEntrega] = useState(null);
  const [comentario, setComentario] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const profileId = profile?.id || null;
  const userId = profile?.user_id || session?.user?.id || null;
  const recursoId = profileId || userId;

  useEffect(() => {
    loadEntrega();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarea?.id, profileId, userId]);

  async function loadEntrega() {
    if (!tarea?.id || !recursoId) {
      setEntrega(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getEntregaByTareaAndRecurso({
        tareaId: tarea.id,
        profileId,
        userId,
      });
      setEntrega(data);
      setComentario(data?.comentario || "");
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando entrega del recurso:", loadError);
      setError(loadError.message || "No se pudo cargar la entrega.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!recursoId) {
      setError("No se encontró el perfil del recurso para registrar la entrega.");
      return;
    }

    if (!file && !entrega?.archivo_url) {
      setError("Seleccioná un archivo de evidencia.");
      return;
    }

    setSaving(true);

    try {
      await submitEntregaTarea({
        tareaId: tarea.id,
        profileId,
        userId,
        comentario,
        file,
      });
      setFile(null);
      await loadEntrega();
    } catch (saveError) {
      console.error("[Campus UCI] Error enviando entrega:", saveError);
      setError(saveError.message || "No se pudo enviar la entrega.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="academic-module-page">
      <section className="academic-module-hero">
        <div>
          <span className="dashboard-section-head-label">Fase 3 · Entrega de tarea</span>
          <h2>{tarea?.titulo || "Entregar tarea"}</h2>
          <p>
            Subí tu evidencia académica para {especialidad?.nombre || "la especialidad"} y consultá la revisión docente.
          </p>
        </div>
        <button type="button" className="specialty-back-button" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2.1} aria-hidden="true" />
          Volver a tareas
        </button>
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}

      <section className="academic-module-grid">
        <article className="academic-panel">
          <div className="academic-panel-head compact">
            <div>
              <span>Evidencia</span>
              <h3>{entrega ? "Actualizar entrega" : "Enviar entrega"}</h3>
            </div>
          </div>

          <form className="academic-form" onSubmit={handleSubmit}>
            <label>
              Comentario del recurso
              <textarea
                rows={4}
                value={comentario}
                onChange={(event) => setComentario(event.target.value)}
                placeholder="Describe brevemente la evidencia enviada..."
              />
            </label>
            <label>
              Archivo de evidencia
              <input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <button type="submit" className="academic-submit" disabled={saving || loading}>
              <FileUp size={16} strokeWidth={2} aria-hidden="true" />
              {saving ? "Enviando..." : entrega ? "Actualizar entrega" : "Entregar tarea"}
            </button>
          </form>
        </article>

        <article className="academic-panel">
          <div className="academic-panel-head compact">
            <div>
              <span>Estado</span>
              <h3>Mi entrega</h3>
            </div>
          </div>

          {loading ? (
            <div className="cu-empty">Cargando entrega...</div>
          ) : !entrega ? (
            <div className="cu-empty">Aún no has enviado evidencia para esta tarea.</div>
          ) : (
            <div className="delivery-review-card">
              <span className={`academic-status ${entrega.estado}`}>{entrega.estado}</span>
              <h4>{entrega.archivo_nombre || "Evidencia enviada"}</h4>
              <p>{entrega.comentario || "Sin comentario registrado."}</p>
              <small>Fecha de entrega: {formatDate(entrega.fecha_entrega || entrega.created_at)}</small>

              {entrega.archivo_url ? (
                <a className="delivery-link" href={entrega.archivo_url} target="_blank" rel="noreferrer">
                  Abrir evidencia <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                </a>
              ) : null}

              <div className="delivery-feedback-box">
                <MessageSquare size={18} strokeWidth={1.9} aria-hidden="true" />
                <div>
                  <strong>Retroalimentación</strong>
                  <p>{entrega.retroalimentacion || "Pendiente de revisión."}</p>
                  <span>Nota: {entrega.nota ?? "Sin nota"}</span>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
