import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, CalendarDays, Download, FileCheck2, FileSpreadsheet, GraduationCap } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import AvatarUpload from "../../components/campus/AvatarUpload";
import { getExpedienteRecurso } from "../../services/expedienteAcademicoService";

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(String(value).slice(0, 10) + "T00:00:00"));
}

function displayValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "Sin datos";
  return `${value}${suffix}`;
}

export default function ExpedienteAcademico({
  session = null,
  profile = null,
  onBack = null,
  onAvatarUpdated = null,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName =
    data?.profile?.nombre ||
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    "Recurso Campus UCI";

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!profile?.id) {
        setData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await getExpedienteRecurso(profile.id);
        if (alive) setData(result);
      } catch (loadError) {
        console.error("[Campus UCI] Error cargando expediente académico:", loadError);
        if (alive) setError(loadError.message || "No se pudo cargar el expediente académico.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [profile?.id]);

  const stats = useMemo(() => data?.resumen || {}, [data]);
  const exportRows = useMemo(() => {
    if (!data) return [];
    return [
      ["Nombre", data.profile?.nombre || ""],
      ["CUM", data.profile?.cum || ""],
      ["Especialidad", data.especialidad?.nombre || ""],
      ["Progreso", `${stats.progreso || 0}%`],
      ["Promedio", stats.promedio ?? "Sin datos"],
      ["Asistencia", `${stats.asistenciaPorcentaje || 0}%`],
      ["Tareas completadas", stats.tareasCompletadas || 0],
      ["Tareas pendientes", stats.tareasPendientes || 0],
      ["Evidencias", stats.evidencias || 0],
    ];
  }, [data, stats]);

  function exportPDF() {
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Expediente Académico Campus UCI", 16, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    exportRows.forEach(([label, value], index) => {
      pdf.text(`${label}: ${value}`, 16, 32 + index * 7);
    });

    pdf.save(`Expediente_${displayName.replace(/\s+/g, "_")}.pdf`);
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const resumen = XLSX.utils.aoa_to_sheet([["Campo", "Valor"], ...exportRows]);
    const notas = XLSX.utils.json_to_sheet((data?.notas || []).map((nota) => ({
      Actividad: nota.actividad || "Evaluación",
      Area: nota.area || "",
      Nota: nota.nota ?? "",
      Estado: nota.estado || "",
      Observaciones: nota.observaciones || "",
      Fecha: nota.created_at || "",
    })));
    const asistencia = XLSX.utils.json_to_sheet((data?.asistencia || []).map((item) => ({
      Fecha: item.clase?.fecha || "",
      Clase: item.clase?.titulo || "",
      Docente: item.clase?.docente || "",
      Estado: item.estado || "",
      Comentario: item.comentario || "",
    })));
    const tareas = XLSX.utils.json_to_sheet((data?.tareas || []).map((tarea) => ({
      Tarea: tarea.titulo || "",
      Limite: tarea.fecha_limite || "",
      Puntaje: tarea.puntaje ?? "",
      Estado: tarea.estado || "",
    })));

    XLSX.utils.book_append_sheet(workbook, resumen, "Resumen");
    XLSX.utils.book_append_sheet(workbook, notas, "Notas");
    XLSX.utils.book_append_sheet(workbook, asistencia, "Asistencia");
    XLSX.utils.book_append_sheet(workbook, tareas, "Tareas");
    XLSX.writeFile(workbook, `Expediente_${displayName.replace(/\s+/g, "_")}.xlsx`);
  }

  return (
    <div className="academic-record-page">
      <section className="record-hero">
        <div className="record-identity">
          <AvatarUpload
            user={session?.user}
            profile={data?.profile || profile}
            name={displayName}
            size="lg"
            editable={false}
            onAvatarUpdated={onAvatarUpdated}
          />
          <div>
            <span>Expediente académico digital</span>
            <h2>{displayName}</h2>
            <p>
              {data?.profile?.cum || profile?.cum || "Sin CUM"} · {data?.especialidad?.nombre || "Sin especialidad asignada"}
            </p>
          </div>
        </div>
        <div className="record-actions">
          <button type="button" className="academic-secondary-action" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Volver
          </button>
          <button type="button" className="academic-secondary-action" onClick={exportPDF} disabled={!data}>
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            PDF
          </button>
          <button type="button" className="academic-submit" onClick={exportExcel} disabled={!data}>
            <FileSpreadsheet size={16} strokeWidth={2} aria-hidden="true" />
            Excel
          </button>
        </div>
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}
      {loading ? <div className="cu-empty">Cargando expediente académico...</div> : null}

      {!loading && !data?.profile ? (
        <div className="cu-empty">No se encontró perfil académico para construir el expediente.</div>
      ) : null}

      {data?.profile ? (
        <>
          <section className="record-stats-grid">
            <article className="record-stat-card blue">
              <GraduationCap size={24} strokeWidth={1.9} />
              <small>Progreso global</small>
              <strong>{stats.progreso || 0}%</strong>
              <span><i style={{ width: `${stats.progreso || 0}%` }} /></span>
            </article>
            <article className="record-stat-card purple">
              <Award size={24} strokeWidth={1.9} />
              <small>Promedio</small>
              <strong>{displayValue(stats.promedio)}</strong>
            </article>
            <article className="record-stat-card green">
              <CalendarDays size={24} strokeWidth={1.9} />
              <small>Asistencia</small>
              <strong>{stats.asistenciaPorcentaje || 0}%</strong>
            </article>
            <article className="record-stat-card orange">
              <FileCheck2 size={24} strokeWidth={1.9} />
              <small>Tareas</small>
              <strong>{stats.tareasCompletadas || 0}/{stats.tareasTotal || 0}</strong>
              <em>{stats.tareasPendientes || 0} pendientes</em>
            </article>
          </section>

          <section className="record-grid">
            <article className="record-panel">
              <div className="record-panel-head"><span>Notas</span><h3>Historial de notas</h3></div>
              {data.notas.length ? (
                <div className="record-timeline">
                  {data.notas.map((nota) => (
                    <article key={nota.id}>
                      <strong>{nota.actividad || "Evaluación"}</strong>
                      <small>{nota.area || "Área académica"} · Nota {nota.nota ?? "Sin nota"}</small>
                      <p>{nota.observaciones || "Sin observaciones."}</p>
                    </article>
                  ))}
                </div>
              ) : <div className="cu-empty">Sin notas registradas.</div>}
            </article>

            <article className="record-panel">
              <div className="record-panel-head"><span>Asistencia</span><h3>Historial de asistencia</h3></div>
              {data.asistencia.length ? (
                <div className="record-list">
                  {data.asistencia.map((item) => (
                    <article key={item.id}>
                      <span className={`attendance-badge ${item.estado}`}>{item.estado}</span>
                      <div>
                        <strong>{item.clase?.titulo || "Clase"}</strong>
                        <small>{formatDate(item.clase?.fecha)} · {item.clase?.docente || "Docente pendiente"}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="cu-empty">Sin asistencia registrada.</div>}
            </article>

            <article className="record-panel">
              <div className="record-panel-head"><span>Tareas</span><h3>Historial de tareas</h3></div>
              {data.tareas.length ? (
                <div className="record-list">
                  {data.tareas.map((tarea) => (
                    <article key={tarea.id}>
                      <span className={`academic-status ${tarea.estado}`}>{tarea.estado}</span>
                      <div>
                        <strong>{tarea.titulo}</strong>
                        <small>Límite: {formatDate(tarea.fecha_limite)} · {Number(tarea.puntaje || 0)} pts</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="cu-empty">Sin tareas asignadas.</div>}
            </article>

            <article className="record-panel">
              <div className="record-panel-head"><span>Evidencias</span><h3>Entregas y retroalimentación</h3></div>
              {data.entregas.length ? (
                <div className="record-timeline">
                  {data.entregas.map((entrega) => (
                    <article key={entrega.id}>
                      <strong>{entrega.archivo_nombre || entrega.tarea?.titulo || "Evidencia"}</strong>
                      <small>{entrega.estado || "entregada"} · Nota {entrega.nota ?? "Sin nota"}</small>
                      <p>{entrega.retroalimentacion || entrega.comentario || "Pendiente de retroalimentación."}</p>
                    </article>
                  ))}
                </div>
              ) : <div className="cu-empty">Sin evidencias enviadas.</div>}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
