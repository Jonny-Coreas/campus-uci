import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, ClipboardList, FileText, MessageSquare, PlaySquare } from "lucide-react";
import { getAsignaturaDetalle } from "../../services/campusContenidoService";

const DEFAULT_TABS = ["Bienvenida", "Calendario", "Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5", "Semana 6"];

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export default function AsignaturaDetalle({ asignatura = null, onBack = null }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Bienvenida");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!asignatura?.id) return;
      setLoading(true);
      setError("");
      try {
        const result = await getAsignaturaDetalle(asignatura.id, { onlyPublished: true });
        if (alive) setData(result);
      } catch (loadError) {
        console.error("[Campus UCI] Error cargando detalle de asignatura:", loadError);
        if (alive) setError(loadError.message || "No se pudo cargar la asignatura.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [asignatura?.id]);

  const tabSections = useMemo(() => {
    const dbSections = data?.secciones || [];
    return DEFAULT_TABS.map((tab, index) => {
      const found = dbSections.find((section) => normalize(section.titulo) === normalize(tab));
      return found || { id: `default-${index}`, titulo: tab, orden: index, descripcion: "" };
    });
  }, [data]);

  const activeSection = tabSections.find((section) => section.titulo === activeTab) || tabSections[0];
  const sectionId = activeSection?.id?.startsWith?.("default-") ? null : activeSection?.id;
  const sectionMaterials = (data?.materiales || []).filter((item) => item.seccion_id === sectionId || (!item.seccion_id && activeTab === "Bienvenida"));
  const sectionForos = (data?.foros || []).filter((item) => item.seccion_id === sectionId || (!item.seccion_id && activeTab === "Bienvenida"));
  const sectionAvisos = (data?.avisos || []).filter((item) => item.seccion_id === sectionId || (!item.seccion_id && activeTab === "Bienvenida"));
  const tareas = activeTab.startsWith("Semana") || activeTab === "Calendario" ? data?.tareas || [] : [];
  const clases = activeTab === "Calendario" ? data?.clases || [] : [];

  return (
    <div className="moodle-page">
      <section className="moodle-hero">
        <div>
          <span>Especialidad &gt; Asignaturas &gt; {data?.asignatura?.titulo || asignatura?.titulo}</span>
          <h2>{data?.asignatura?.titulo || asignatura?.titulo || "Asignatura"}</h2>
          <p>{data?.asignatura?.descripcion || "Contenido académico por semanas y secciones."}</p>
        </div>
        <button type="button" className="academic-secondary-action" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2} />
          Volver a asignaturas
        </button>
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}
      {loading ? <div className="cu-empty">Cargando contenido...</div> : null}

      {!loading ? (
        <>
          <nav className="moodle-tabs" aria-label="Secciones de asignatura">
            {tabSections.map((section) => (
              <button
                type="button"
                className={section.titulo === activeTab ? "active" : ""}
                key={section.id}
                onClick={() => setActiveTab(section.titulo)}
              >
                {section.titulo}
              </button>
            ))}
          </nav>

          <section className="moodle-section-layout">
            <article className="moodle-content-panel">
              <div className="record-panel-head">
                <span>Sección</span>
                <h3>{activeTab}</h3>
              </div>
              <p>{activeSection?.descripcion || "Contenido publicado para esta sección."}</p>

              {sectionMaterials.length === 0 && sectionForos.length === 0 && sectionAvisos.length === 0 && tareas.length === 0 && clases.length === 0 ? (
                <div className="cu-empty">No hay contenido publicado en esta sección.</div>
              ) : null}

              <div className="moodle-resource-list">
                {sectionAvisos.map((aviso) => (
                  <article key={aviso.id}>
                    <Bell size={20} strokeWidth={1.8} />
                    <div><strong>{aviso.titulo}</strong><p>{aviso.contenido || "Aviso académico publicado."}</p></div>
                  </article>
                ))}
                {sectionMaterials.map((material) => (
                  <article key={material.id}>
                    {material.tipo === "video" ? <PlaySquare size={20} strokeWidth={1.8} /> : <FileText size={20} strokeWidth={1.8} />}
                    <div>
                      <strong>{material.titulo}</strong>
                      <p>{material.descripcion || material.archivo_nombre || material.enlace_url || "Material académico."}</p>
                      {material.archivo_url || material.enlace_url ? (
                        <a href={material.archivo_url || material.enlace_url} target="_blank" rel="noreferrer">Abrir material</a>
                      ) : null}
                    </div>
                  </article>
                ))}
                {sectionForos.map((foro) => (
                  <article key={foro.id}>
                    <MessageSquare size={20} strokeWidth={1.8} />
                    <div><strong>{foro.titulo}</strong><p>{foro.descripcion || "Foro académico de discusión."}</p></div>
                  </article>
                ))}
                {clases.map((clase) => (
                  <article key={clase.id}>
                    <CalendarDays size={20} strokeWidth={1.8} />
                    <div><strong>{clase.titulo}</strong><p>{formatDate(clase.fecha)} · {clase.hora_inicio} - {clase.hora_fin}</p></div>
                  </article>
                ))}
                {tareas.map((tarea) => (
                  <article key={tarea.id}>
                    <ClipboardList size={20} strokeWidth={1.8} />
                    <div><strong>{tarea.titulo}</strong><p>Entrega: {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</p></div>
                  </article>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
