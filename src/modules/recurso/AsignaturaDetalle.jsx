import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, ClipboardList, ExternalLink, FileText, MessageSquare, PlaySquare, X } from "lucide-react";
import { getAsignaturaDetalle } from "../../services/campusContenidoService";
import { parseTaskInstructions } from "../../utils/taskMetadata";
import { markSeen } from "../../utils/resourceSeen";
import EntregaTareaRecurso from "../especialidades/EntregaTareaRecurso";
import ForoDetalle from "./ForoDetalle";

const DEFAULT_TABS = ["Bienvenida", "Calendario", "Semana 1", "Semana 2", "Semana 3", "Semana 4", "Semana 5", "Semana 6"];

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export default function AsignaturaDetalle({
  asignatura = null,
  session = null,
  profile = null,
  onBack = null,
}) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Bienvenida");
  const [detailItem, setDetailItem] = useState(null);
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
  const tareas = activeTab.startsWith("Semana") || activeTab === "Calendario"
    ? (data?.tareas || []).filter((tarea) => {
        const metadata = parseTaskInstructions(tarea.instrucciones || "");
        return !metadata.asignaturaId || metadata.asignaturaId === asignatura?.id;
      })
    : [];
  const clases = activeTab === "Calendario" ? data?.clases || [] : [];
  const especialidad = data?.asignatura?.especialidades || asignatura?.especialidades || null;

  function openDetail(type, item) {
    if (type === "aviso") markSeen({ profileId: profile?.id, type: "aviso", id: item?.id });
    if (type === "material") markSeen({ profileId: profile?.id, type: "material", id: item?.id });
    setDetailItem({ type, item });
  }

  function onKeyOpen(event, type, item) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(type, item);
    }
  }

  function renderDetailBody() {
    if (!detailItem) return null;
    const { type, item } = detailItem;

    if (type === "aviso") {
      return (
        <>
          <div className="student-detail-grid">
            <div><span>Fecha</span><strong>{formatDate(item.created_at)}</strong></div>
            <div><span>Asignatura</span><strong>{data?.asignatura?.titulo || asignatura?.titulo || "Asignatura"}</strong></div>
          </div>
          <p>{item.contenido || "Aviso académico publicado."}</p>
        </>
      );
    }

    if (type === "foro") {
      return (
        <ForoDetalle foro={item} profile={profile} />
      );
    }

    if (type === "clase") {
      return (
        <>
          <div className="student-detail-grid">
            <div><span>Fecha</span><strong>{formatDate(item.fecha)}</strong></div>
            <div><span>Hora inicio</span><strong>{item.hora_inicio || "Sin hora"}</strong></div>
            <div><span>Hora fin</span><strong>{item.hora_fin || "Sin hora"}</strong></div>
            <div><span>Docente</span><strong>{item.docente || "Pendiente"}</strong></div>
            <div><span>Estado</span><strong>{item.estado || "programada"}</strong></div>
            <div><span>Especialidad</span><strong>{especialidad?.nombre || "Campus UCI"}</strong></div>
          </div>
          <p>{item.descripcion || "Clase programada sin descripción adicional."}</p>
          {item.enlace_virtual ? (
            <a href={item.enlace_virtual} target="_blank" rel="noreferrer">
              Abrir enlace de clase <ExternalLink size={14} strokeWidth={2} />
            </a>
          ) : null}
        </>
      );
    }

    if (type === "material") {
      const url = item.archivo_url || item.enlace_url || "";
      return (
        <>
          <div className="student-detail-grid">
            <div><span>Tipo</span><strong>{item.tipo || item.archivo_tipo || "Material"}</strong></div>
            <div><span>Archivo</span><strong>{item.archivo_nombre || "Material académico"}</strong></div>
            <div><span>Asignatura</span><strong>{data?.asignatura?.titulo || asignatura?.titulo || "Asignatura"}</strong></div>
            <div><span>Fecha</span><strong>{formatDate(item.created_at)}</strong></div>
          </div>
          <p>{item.descripcion || "Material académico publicado."}</p>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer">
              Descargar / abrir material <ExternalLink size={14} strokeWidth={2} />
            </a>
          ) : null}
        </>
      );
    }

    if (type === "tarea") {
      return (
        <EntregaTareaRecurso
          tarea={item}
          especialidad={especialidad}
          profile={profile}
          session={session}
          onBack={() => setDetailItem(null)}
        />
      );
    }

    return null;
  }

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
                  <article key={aviso.id} className="moodle-clickable-item" role="button" tabIndex={0} onClick={() => openDetail("aviso", aviso)} onKeyDown={(event) => onKeyOpen(event, "aviso", aviso)}>
                    <Bell size={20} strokeWidth={1.8} />
                    <div><strong>{aviso.titulo}</strong><p>{aviso.contenido || "Aviso académico publicado."}</p></div>
                  </article>
                ))}
                {sectionMaterials.map((material) => (
                  <article key={material.id} className="moodle-clickable-item" role="button" tabIndex={0} onClick={() => openDetail("material", material)} onKeyDown={(event) => onKeyOpen(event, "material", material)}>
                    {material.tipo === "video" ? <PlaySquare size={20} strokeWidth={1.8} /> : <FileText size={20} strokeWidth={1.8} />}
                    <div>
                      <strong>{material.titulo}</strong>
                      <p>{material.descripcion || material.archivo_nombre || material.enlace_url || "Material académico."}</p>
                      {material.archivo_url || material.enlace_url ? (
                        <a href={material.archivo_url || material.enlace_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Abrir material</a>
                      ) : null}
                    </div>
                  </article>
                ))}
                {sectionForos.map((foro) => (
                  <article key={foro.id} className="moodle-clickable-item" role="button" tabIndex={0} onClick={() => openDetail("foro", foro)} onKeyDown={(event) => onKeyOpen(event, "foro", foro)}>
                    <MessageSquare size={20} strokeWidth={1.8} />
                    <div><strong>{foro.titulo}</strong><p>{foro.descripcion || "Foro académico de discusión."}</p></div>
                  </article>
                ))}
                {clases.map((clase) => (
                  <article key={clase.id} className="moodle-clickable-item" role="button" tabIndex={0} onClick={() => openDetail("clase", clase)} onKeyDown={(event) => onKeyOpen(event, "clase", clase)}>
                    <CalendarDays size={20} strokeWidth={1.8} />
                    <div><strong>{clase.titulo}</strong><p>{formatDate(clase.fecha)} · {clase.hora_inicio} - {clase.hora_fin}</p></div>
                  </article>
                ))}
                {tareas.map((tarea) => (
                  <article key={tarea.id} className="moodle-clickable-item" role="button" tabIndex={0} onClick={() => openDetail("tarea", tarea)} onKeyDown={(event) => onKeyOpen(event, "tarea", tarea)}>
                    <ClipboardList size={20} strokeWidth={1.8} />
                    <div>
                      <strong>{tarea.titulo}</strong>
                      <p>{parseTaskInstructions(tarea.instrucciones || "").description || "Tarea académica publicada."}</p>
                      <p>Entrega: {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>

          {detailItem ? (
            <div className="student-detail-backdrop" role="presentation" onClick={() => setDetailItem(null)}>
              <section className="student-detail-modal assignment-detail-modal" role="dialog" aria-modal="true" aria-label="Detalle de contenido" onClick={(event) => event.stopPropagation()}>
                <div className="student-detail-head">
                  <div>
                    <span>{detailItem.type === "tarea" ? "Tarea" : detailItem.type === "clase" ? "Clase" : detailItem.type === "foro" ? "Foro" : detailItem.type === "aviso" ? "Aviso" : "Material"}</span>
                    <h3>{detailItem.item?.titulo || "Detalle académico"}</h3>
                  </div>
                  <button type="button" onClick={() => setDetailItem(null)} aria-label="Cerrar detalle">
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>
                <div className="student-detail-body">
                  {renderDetailBody()}
                </div>
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
