import { useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { createForoRespuesta, getForoRespuestas } from "../../services/foroService";

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

export default function ForoDetalle({ foro = null, profile = null }) {
  const [respuestas, setRespuestas] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRespuestas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foro?.id]);

  async function loadRespuestas() {
    if (!foro?.id) return;
    setLoading(true);
    setError("");

    try {
      setRespuestas(await getForoRespuestas(foro.id));
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando foro:", loadError);
      setError(loadError.message || "No se pudo cargar el foro.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createForoRespuesta({
        foroId: foro.id,
        profileId: profile?.id,
        mensaje,
      });
      setMensaje("");
      await loadRespuestas();
    } catch (saveError) {
      console.error("[Campus UCI] Error respondiendo foro:", saveError);
      setError(saveError.message || "No se pudo publicar la respuesta. Verificá que exista la tabla de respuestas del foro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="forum-detail">
      <p>{foro?.descripcion || "Foro académico de discusión."}</p>
      {error ? <div className="cu-alert">⚠️ {error}</div> : null}

      <div className="forum-response-list">
        {loading ? <div className="cu-empty">Cargando respuestas...</div> : null}
        {!loading && !respuestas.length ? (
          <div className="cu-empty">
            <MessageSquare size={22} strokeWidth={1.9} />
            Participación en foro próximamente. Aún no hay respuestas.
          </div>
        ) : null}
        {respuestas.map((respuesta) => (
          <article key={respuesta.id} className="forum-response-card">
            <strong>{respuesta.profiles?.nombre || "Usuario Campus UCI"}</strong>
            <small>{formatDate(respuesta.created_at)}</small>
            <p>{respuesta.mensaje}</p>
          </article>
        ))}
      </div>

      <form className="forum-reply-form" onSubmit={handleSubmit}>
        <label>
          Responder foro
          <textarea
            rows={3}
            value={mensaje}
            onChange={(event) => setMensaje(event.target.value)}
            placeholder="Escribí tu comentario académico..."
          />
        </label>
        <button type="submit" className="academic-submit" disabled={saving || !mensaje.trim()}>
          <Send size={16} strokeWidth={2} />
          {saving ? "Publicando..." : "Publicar respuesta"}
        </button>
      </form>
    </div>
  );
}
