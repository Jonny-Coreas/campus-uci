import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileCheck2, MessageSquare, Star } from "lucide-react";
import {
  getEntregasByTarea,
  reviewEntregaTarea,
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

function getRecursoName(entrega) {
  return entrega?.profiles?.nombre || entrega?.profiles?.correo || entrega?.profile_id || entrega?.user_id || "Recurso sin identificar";
}

function buildReviewForm(entrega) {
  return {
    estado: entrega.estado || "revisada",
    nota: entrega.nota ?? "",
    retroalimentacion: entrega.retroalimentacion || "",
  };
}

export default function EntregasTareaAdmin({ tarea = null, especialidad = null, onBack = null }) {
  const [entregas, setEntregas] = useState([]);
  const [reviewForms, setReviewForms] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const total = entregas.length;
    const entregadas = entregas.filter((item) => item.estado === "entregada").length;
    const revisadas = entregas.filter((item) => ["revisada", "aprobada", "rechazada"].includes(item.estado)).length;
    return { total, entregadas, revisadas };
  }, [entregas]);

  useEffect(() => {
    loadEntregas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarea?.id]);

  async function loadEntregas() {
    if (!tarea?.id) {
      setEntregas([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getEntregasByTarea(tarea.id);
      setEntregas(data);
      setReviewForms(
        data.reduce((acc, entrega) => {
          acc[entrega.id] = buildReviewForm(entrega);
          return acc;
        }, {}),
      );
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando entregas:", loadError);
      setError(loadError.message || "No se pudieron cargar las entregas.");
    } finally {
      setLoading(false);
    }
  }

  function setReviewField(entregaId, name, value) {
    setReviewForms((prev) => ({
      ...prev,
      [entregaId]: {
        ...(prev[entregaId] || {}),
        [name]: value,
      },
    }));
  }

  async function handleReview(entregaId) {
    setSavingId(entregaId);
    setError("");

    try {
      await reviewEntregaTarea(entregaId, reviewForms[entregaId] || {});
      await loadEntregas();
    } catch (reviewError) {
      console.error("[Campus UCI] Error revisando entrega:", reviewError);
      setError(reviewError.message || "No se pudo guardar la revisión.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="academic-module-page">
      <section className="academic-module-hero">
        <div>
          <span className="dashboard-section-head-label">Fase 3 · Entregas</span>
          <h2>{tarea?.titulo || "Entregas de tarea"}</h2>
          <p>
            Revisión de evidencias, calificación y retroalimentación para {especialidad?.nombre || "la especialidad"}.
          </p>
        </div>
        <button type="button" className="specialty-back-button" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2.1} aria-hidden="true" />
          Volver a tareas
        </button>
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}

      <section className="academic-summary-grid three">
        <article className="academic-summary-card">
          <span className="specialty-stat-icon blue"><FileCheck2 size={23} strokeWidth={1.9} /></span>
          <div><small>Total entregas</small><strong>{stats.total}</strong></div>
        </article>
        <article className="academic-summary-card">
          <span className="specialty-stat-icon green"><MessageSquare size={23} strokeWidth={1.9} /></span>
          <div><small>Entregadas</small><strong>{stats.entregadas}</strong></div>
        </article>
        <article className="academic-summary-card">
          <span className="specialty-stat-icon purple"><Star size={23} strokeWidth={1.9} /></span>
          <div><small>Revisadas</small><strong>{stats.revisadas}</strong></div>
        </article>
      </section>

      <section className="academic-panel">
        <div className="academic-panel-head compact">
          <div>
            <span>Revisión admin</span>
            <h3>Entregas recibidas</h3>
          </div>
        </div>

        {loading ? (
          <div className="cu-empty">Cargando entregas...</div>
        ) : entregas.length === 0 ? (
          <div className="cu-empty">Todavía no hay entregas registradas para esta tarea.</div>
        ) : (
          <div className="delivery-review-grid">
            {entregas.map((entrega) => {
              const form = reviewForms[entrega.id] || buildReviewForm(entrega);
              return (
                <article className="delivery-review-card" key={entrega.id}>
                  <div className="delivery-review-head">
                    <div>
                      <span className={`academic-status ${entrega.estado}`}>{entrega.estado}</span>
                      <h4>{getRecursoName(entrega)}</h4>
                      <p>{entrega.profiles?.cum || entrega.profiles?.servicio || "Recurso Campus UCI"}</p>
                    </div>
                    <small>{formatDate(entrega.fecha_entrega || entrega.created_at)}</small>
                  </div>

                  <div className="delivery-file-box">
                    <strong>{entrega.archivo_nombre || "Sin archivo adjunto"}</strong>
                    <span>{entrega.archivo_tipo || "Evidencia académica"}</span>
                    {entrega.archivo_url ? (
                      <a href={entrega.archivo_url} target="_blank" rel="noreferrer">
                        Abrir evidencia <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>

                  <p className="delivery-comment">{entrega.comentario || "Sin comentario del recurso."}</p>

                  <div className="academic-form delivery-review-form">
                    <div className="academic-form-row">
                      <label>
                        Estado
                        <select value={form.estado} onChange={(event) => setReviewField(entrega.id, "estado", event.target.value)}>
                          <option value="revisada">Revisada</option>
                          <option value="aprobada">Aprobada</option>
                          <option value="rechazada">Rechazada</option>
                          <option value="entregada">Entregada</option>
                        </select>
                      </label>
                      <label>
                        Nota
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.nota}
                          onChange={(event) => setReviewField(entrega.id, "nota", event.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      Retroalimentación
                      <textarea
                        rows={3}
                        value={form.retroalimentacion}
                        onChange={(event) => setReviewField(entrega.id, "retroalimentacion", event.target.value)}
                      />
                    </label>
                    <button type="button" className="academic-submit" onClick={() => handleReview(entrega.id)} disabled={savingId === entrega.id}>
                      {savingId === entrega.id ? "Guardando..." : "Guardar revisión"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
