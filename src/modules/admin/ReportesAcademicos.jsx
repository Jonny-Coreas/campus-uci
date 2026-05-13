import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Download, FileSpreadsheet, Filter, Search, TriangleAlert } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { getReportesAcademicosData } from "../../services/expedienteAcademicoService";

function valueOrDash(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "Sin datos";
  return `${value}${suffix}`;
}

export default function ReportesAcademicos({ onBack = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [especialidadFilter, setEspecialidadFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");

  useEffect(() => {
    loadReportes();
  }, []);

  async function loadReportes() {
    setLoading(true);
    setError("");

    try {
      const result = await getReportesAcademicosData();
      setData(result);
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando reportes académicos:", loadError);
      setError(loadError.message || "No se pudieron cargar los reportes académicos.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRanking = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.ranking || []).filter((item) => {
      const matchesTerm = !term || [item.profile?.nombre, item.profile?.cum, item.profile?.correo, item.especialidad?.nombre]
        .some((value) => String(value || "").toLowerCase().includes(term));
      const matchesEspecialidad = !especialidadFilter || item.especialidad?.id === especialidadFilter;
      const isCritical = item.progreso < 60 || (item.promedio !== null && item.promedio < 7) || item.asistencia < 80 || item.tareasPendientes > 0;
      const matchesEstado = !estadoFilter || (estadoFilter === "critico" ? isCritical : !isCritical);
      return matchesTerm && matchesEspecialidad && matchesEstado;
    });
  }, [data, query, especialidadFilter, estadoFilter]);

  function exportPDF() {
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Reportes Académicos Campus UCI", 16, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Recursos: ${data?.resumen?.recursos || 0}`, 16, 32);
    pdf.text(`Promedio general: ${valueOrDash(data?.resumen?.promedioGeneral)}`, 16, 39);
    pdf.text(`Asistencia general: ${valueOrDash(Math.round(data?.resumen?.asistenciaGeneral || 0), "%")}`, 16, 46);
    pdf.text(`Recursos críticos: ${data?.resumen?.criticos || 0}`, 16, 53);

    filteredRanking.slice(0, 20).forEach((item, index) => {
      pdf.text(
        `${index + 1}. ${item.profile?.nombre || "Recurso"} · ${item.especialidad?.nombre || "Sin especialidad"} · Promedio ${valueOrDash(item.promedio)} · Progreso ${item.progreso}%`,
        16,
        68 + index * 6,
      );
    });

    pdf.save("Reportes_Academicos_Campus_UCI.pdf");
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const resumen = XLSX.utils.json_to_sheet([data?.resumen || {}]);
    const ranking = XLSX.utils.json_to_sheet(filteredRanking.map((item, index) => ({
      Ranking: index + 1,
      Recurso: item.profile?.nombre || "",
      CUM: item.profile?.cum || "",
      Correo: item.profile?.correo || "",
      Especialidad: item.especialidad?.nombre || "Sin especialidad",
      Promedio: item.promedio ?? "",
      Progreso: item.progreso,
      Asistencia: item.asistencia,
      Pendientes: item.tareasPendientes,
      Evidencias: item.evidencias,
    })));
    const especialidades = XLSX.utils.json_to_sheet((data?.especialidades || []).map((item) => ({
      Especialidad: item.nombre,
      Recursos: item.recursos,
      Promedio: item.promedio ?? "",
      Asistencia: Math.round(item.asistencia || 0),
      Progreso: Math.round(item.progreso || 0),
    })));

    XLSX.utils.book_append_sheet(workbook, resumen, "Resumen");
    XLSX.utils.book_append_sheet(workbook, ranking, "Ranking");
    XLSX.utils.book_append_sheet(workbook, especialidades, "Especialidades");
    XLSX.writeFile(workbook, "Reportes_Academicos_Campus_UCI.xlsx");
  }

  return (
    <div className="academic-report-page">
      <section className="record-hero">
        <div>
          <span>Reportes académicos</span>
          <h2>Expediente académico PRO</h2>
          <p>Ranking, promedios, asistencia, progreso global y recursos críticos con datos reales.</p>
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
      {loading ? <div className="cu-empty">Cargando reportes académicos...</div> : null}

      {data ? (
        <>
          <section className="record-stats-grid">
            <article className="record-stat-card blue"><BarChart3 size={24} /><small>Recursos</small><strong>{data.resumen.recursos}</strong></article>
            <article className="record-stat-card purple"><BarChart3 size={24} /><small>Promedio general</small><strong>{valueOrDash(data.resumen.promedioGeneral)}</strong></article>
            <article className="record-stat-card green"><BarChart3 size={24} /><small>Asistencia general</small><strong>{Math.round(data.resumen.asistenciaGeneral || 0)}%</strong></article>
            <article className="record-stat-card orange"><TriangleAlert size={24} /><small>Críticos</small><strong>{data.resumen.criticos}</strong></article>
          </section>

          <section className="report-filters">
            <div className="resources-search">
              <Search size={18} strokeWidth={2} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar recurso, CUM o especialidad..." />
            </div>
            <label>
              <Filter size={16} strokeWidth={2} aria-hidden="true" />
              <select value={especialidadFilter} onChange={(event) => setEspecialidadFilter(event.target.value)}>
                <option value="">Todas las especialidades</option>
                {data.especialidades.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              <select value={estadoFilter} onChange={(event) => setEstadoFilter(event.target.value)}>
                <option value="">Todos los estados</option>
                <option value="critico">Recursos críticos</option>
                <option value="estable">Recursos estables</option>
              </select>
            </label>
          </section>

          <section className="record-grid">
            <article className="record-panel wide">
              <div className="record-panel-head"><span>Ranking</span><h3>Recursos académicos</h3></div>
              {filteredRanking.length ? (
                <div className="academic-table-wrap">
                  <table className="academic-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Recurso</th>
                        <th>Especialidad</th>
                        <th>Promedio</th>
                        <th>Asistencia</th>
                        <th>Progreso</th>
                        <th>Pendientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRanking.map((item, index) => (
                        <tr key={item.profile?.id || index}>
                          <td>{index + 1}</td>
                          <td><strong>{item.profile?.nombre || "Sin nombre"}</strong><span>{item.profile?.cum || "Sin CUM"}</span></td>
                          <td>{item.especialidad?.nombre || "Sin especialidad"}</td>
                          <td>{valueOrDash(item.promedio)}</td>
                          <td>{item.asistencia}%</td>
                          <td><div className="resource-progress"><span><i style={{ width: `${item.progreso}%` }} /></span><strong>{item.progreso}%</strong></div></td>
                          <td>{item.tareasPendientes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="cu-empty">No hay recursos que coincidan con los filtros.</div>}
            </article>

            <article className="record-panel">
              <div className="record-panel-head"><span>Especialidades</span><h3>Promedio por especialidad</h3></div>
              {data.especialidades.length ? (
                <div className="record-list">
                  {data.especialidades.map((item) => (
                    <article key={item.id}>
                      <span className="academic-status abierta">{item.recursos}</span>
                      <div>
                        <strong>{item.nombre}</strong>
                        <small>Promedio {valueOrDash(item.promedio)} · Asistencia {Math.round(item.asistencia || 0)}%</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="cu-empty">Sin especialidades para reportar.</div>}
            </article>

            <article className="record-panel">
              <div className="record-panel-head"><span>Alertas</span><h3>Recursos críticos</h3></div>
              {data.recursosCriticos.length ? (
                <div className="record-list">
                  {data.recursosCriticos.slice(0, 8).map((item) => (
                    <article key={item.profile?.id}>
                      <span className="academic-status rechazada">Alerta</span>
                      <div>
                        <strong>{item.profile?.nombre || "Recurso"}</strong>
                        <small>Progreso {item.progreso}% · Asistencia {item.asistencia}% · Pendientes {item.tareasPendientes}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="cu-empty">No hay recursos críticos con los criterios actuales.</div>}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
