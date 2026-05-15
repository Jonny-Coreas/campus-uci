import React, { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileUp, MessageSquare } from "lucide-react";
import {
  getEntregaByTareaAndRecurso,
  submitEntregaTarea,
} from "../../services/clasesTareasService";
import { buildDraftKey, useLocalDraft } from "../../hooks/useLocalDraft";
import { parseTaskInstructions } from "../../utils/taskMetadata";

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
  const [restoredFileName, setRestoredFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const profileId = profile?.id || null;
  const userId = profile?.user_id || session?.user?.id || null;
  const recursoId = profileId || userId;
  const tareaDetalle = parseTaskInstructions(tarea?.instrucciones || "");
  const draftKey = buildDraftKey("entregaTareaRecurso", recursoId, especialidad?.id, tarea?.id);
  const { hasDraft, clearDraft } = useLocalDraft({
    key: draftKey,
    value: {
      comentario,
      archivoNombre: file?.name || restoredFileName || "",
    },
    enabled: Boolean(tarea?.id && recursoId),
    isEmpty: (value) => !String(value?.comentario || "").trim() && !String(value?.archivoNombre || "").trim(),
    onRestore: (draft) => {
      setComentario(draft.comentario || "");
      setRestoredFileName(draft.archivoNombre || "");
    },
  });

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
      setComentario((current) => current || data?.comentario || "");
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
      clearDraft();
      setFile(null);
      setRestoredFileName("");
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
              <span>Detalle de tarea</span>
              <h3>Instrucciones</h3>
            </div>
          </div>

          <div className="delivery-review-card">
            <span className={`academic-status ${entrega?.estado || "pendiente"}`}>
              {entrega?.estado || "pendiente"}
            </span>
            <h4>{tarea?.titulo || "Tarea académica"}</h4>
            <p>{tareaDetalle.description || "Sin instrucciones adicionales."}</p>
            <small>Fecha límite: {tarea?.fecha_limite || "Sin fecha"} · {Number(tarea?.puntaje || 0)} puntos</small>

            {tareaDetalle.attachments.length ? (
              <div className="delivery-feedback-box">
                <FileUp size={18} strokeWidth={1.9} aria-hidden="true" />
                <div>
                  <strong>Adjuntos del docente</strong>
                  {tareaDetalle.attachments.map((attachment) => (
                    <a key={attachment.url} className="delivery-link" href={attachment.url} target="_blank" rel="noreferrer">
                      Descargar {attachment.nombre || "archivo"} <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="academic-panel">
          <div className="academic-panel-head compact">
            <div>
              <span>Evidencia</span>
              <h3>{entrega ? "Actualizar entrega" : "Enviar entrega"}</h3>
            </div>
          </div>

          <form className="academic-form" onSubmit={handleSubmit}>
            {hasDraft ? (
              <div className="draft-notice">
                <span>
                  Borrador restaurado automáticamente.
                  {restoredFileName ? ` Debes volver a seleccionar el archivo: ${restoredFileName}.` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearDraft();
                    setComentario(entrega?.comentario || "");
                    setRestoredFileName("");
                    setFile(null);
                  }}
                >
                  Limpiar borrador
                </button>
              </div>
            ) : null}
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
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  setFile(nextFile);
                  setRestoredFileName(nextFile?.name || "");
                }}
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
