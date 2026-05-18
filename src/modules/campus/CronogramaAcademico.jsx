import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, Clock, ExternalLink, FileText, MapPin, UserRound, Video } from "lucide-react";
import { getAsistenciaRecurso, getClasesAcademicas } from "../../services/asistenciaService";
import { getEspecialidadActivaRecurso } from "../../services/campusContenidoService";
import { isRecurso } from "../../auth/roles";

const FILTERS = [
  { key: "proximas", label: "Próximas" },
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mes" },
];

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameMonth(value, baseDate) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  return date.getFullYear() === baseDate.getFullYear() && date.getMonth() === baseDate.getMonth();
}

function isWithinNextWeek(value) {
  if (!value) return false;
  const current = todayDate();
  const limit = dateKey(addDays(new Date(`${current}T00:00:00`), 7));
  return value >= current && value <= limit;
}

function specialtyTone(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("ecmo")) return "ecmo";
  if (lower.includes("uci")) return "uci";
  if (lower.includes("terapias")) return "terapias";
  if (lower.includes("cec")) return "cec";
  return "default";
}

function buildMonthDays(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const start = addDays(first, -startOffset);
  return Array.from({ length: 35 }, (_, index) => addDays(start, index));
}

function extractMeta(label, ...values) {
  const text = values.filter(Boolean).join("\n");
  const match = text.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function getCleanDescription(clase) {
  const text = clase.contenido || clase.descripcion || "";
  const clean = String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^(Docente|Recurso \/ Aula \/ Sala|Modalidad|Hora inicio|Hora fin|Duracion|Enlace|Clase recurrente|Material de apoyo):/i.test(line))
    .join(" ");

  return clean || "Temario pendiente de publicar.";
}

function formatClassTime(clase) {
  const start = clase.hora_inicio || "--:--";
  const end = clase.hora_fin || "--:--";
  return `${start} - ${end}`;
}

function chipClass(value = "") {
  const normalized = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("virtual")) return "virtual";
  if (normalized.includes("hibrida")) return "hibrida";
  if (normalized.includes("presencial")) return "presencial";
  if (normalized.includes("cancel")) return "cancelada";
  if (normalized.includes("final") || normalized.includes("realiz")) return "finalizada";
  if (normalized.includes("evalu")) return "evaluacion";
  return "programada";
}

export default function CronogramaAcademico({
  especialidadId = null,
  session = null,
  profile = null,
  title = "Cronograma académico",
  onBack = null,
}) {
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [resolvedEspecialidad, setResolvedEspecialidad] = useState(null);
  const [assignmentChecked, setAssignmentChecked] = useState(false);
  const [activeFilter, setActiveFilter] = useState("proximas");
  const [calendarBase, setCalendarBase] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const effectiveEspecialidadId = especialidadId || resolvedEspecialidad?.id || null;
  const specialtyName = resolvedEspecialidad?.nombre || clases[0]?.especialidades?.nombre || "Especialidad";

  useEffect(() => {
    let alive = true;

    async function resolveEspecialidad() {
      setAssignmentChecked(false);
      if (especialidadId || !isRecurso(profile)) {
        setResolvedEspecialidad(null);
        setAssignmentChecked(true);
        return;
      }

      try {
        const { especialidad } = await getEspecialidadActivaRecurso({ profile, session });
        if (alive) setResolvedEspecialidad(especialidad || null);
      } catch (loadError) {
        console.warn("[Campus UCI] No se pudo resolver especialidad del recurso para cronograma:", loadError);
        if (alive) setResolvedEspecialidad(null);
      } finally {
        if (alive) setAssignmentChecked(true);
      }
    }

    resolveEspecialidad();
    return () => {
      alive = false;
    };
  }, [especialidadId, profile, session]);

  useEffect(() => {
    if (isRecurso(profile) && !assignmentChecked) return;
    loadClases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEspecialidadId, assignmentChecked]);

  const asistenciaByClase = useMemo(() => {
    return new Map(asistencias.map((item) => [item.clase_id || item.clase?.id, item]));
  }, [asistencias]);

  const filteredClases = useMemo(() => {
    const today = todayDate();
    return clases.filter((clase) => {
      const fecha = String(clase.fecha || "").slice(0, 10);
      if (activeFilter === "hoy") return fecha === today;
      if (activeFilter === "semana") return isWithinNextWeek(fecha);
      if (activeFilter === "mes") return isSameMonth(fecha, calendarBase);
      return fecha >= today && !["realizada", "finalizada", "cancelada"].includes(String(clase.estado || "").toLowerCase());
    });
  }, [activeFilter, calendarBase, clases]);

  const grouped = useMemo(() => {
    return filteredClases.reduce((acc, clase) => {
      const key = clase.fecha || "Sin fecha";
      acc[key] = acc[key] || [];
      acc[key].push(clase);
      return acc;
    }, {});
  }, [filteredClases]);

  const monthDays = useMemo(() => buildMonthDays(calendarBase), [calendarBase]);
  const classesByDate = useMemo(() => {
    return clases.reduce((acc, clase) => {
      const key = String(clase.fecha || "").slice(0, 10);
      if (!key) return acc;
      acc[key] = acc[key] || [];
      acc[key].push(clase);
      return acc;
    }, {});
  }, [clases]);

  const summary = useMemo(() => {
    const evaluaciones = filteredClases.filter((clase) => String(clase.evaluacion || clase.actividad || "").toLowerCase().includes("evalu")).length;
    const presenciales = filteredClases.filter((clase) => String(clase.modalidad || "").toLowerCase().includes("presencial")).length;
    return {
      clases: filteredClases.length,
      evaluaciones,
      tareas: 0,
      presenciales,
    };
  }, [filteredClases]);

  async function loadClases() {
    if (isRecurso(profile) && !effectiveEspecialidadId) {
      setClases([]);
      setAsistencias([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [clasesData, asistenciaData] = await Promise.all([
        getClasesAcademicas(effectiveEspecialidadId),
        isRecurso(profile)
          ? getAsistenciaRecurso({ profileId: profile?.id, profile, session, especialidadId: effectiveEspecialidadId })
          : Promise.resolve([]),
      ]);
      setClases(clasesData);
      setAsistencias(asistenciaData);
      const firstDate = clasesData.find((item) => item.fecha)?.fecha;
      if (firstDate) setCalendarBase(new Date(`${firstDate}T00:00:00`));
    } catch (loadError) {
      console.error("[Campus UCI] Error cargando cronograma:", loadError);
      setError(loadError.message || "No se pudo cargar el cronograma.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="schedule-page student-calendar-page">
      <section className="schedule-hero">
        <div>
          <span className="dashboard-section-head-label">Mi calendario</span>
          <h2>{title}</h2>
          <p>Agenda académica, clases programadas, enlaces virtuales y materiales publicados para tu especialidad.</p>
          <div className="student-calendar-specialty">
            <span className={`specialty-dot ${specialtyTone(specialtyName)}`} />
            <strong>{effectiveEspecialidadId ? specialtyName : "Sin especialidad asignada"}</strong>
          </div>
        </div>
        {onBack ? (
          <button type="button" className="academic-secondary-action" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Volver
          </button>
        ) : null}
      </section>

      {error ? <div className="cu-alert">⚠️ {error}</div> : null}
      {loading ? <div className="cu-empty">Cargando cronograma...</div> : null}
      {!loading && isRecurso(profile) && assignmentChecked && !effectiveEspecialidadId ? (
        <div className="cu-empty">Aún no tienes una especialidad asignada.</div>
      ) : null}

      {effectiveEspecialidadId ? (
        <>
          <section className="student-calendar-toolbar">
            <div className="student-calendar-filters">
              {FILTERS.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  className={activeFilter === filter.key ? "active" : ""}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="student-calendar-month">
              <button type="button" onClick={() => setCalendarBase((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button>
              <strong>{new Intl.DateTimeFormat("es-SV", { month: "long", year: "numeric" }).format(calendarBase)}</strong>
              <button type="button" onClick={() => setCalendarBase((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button>
            </div>
          </section>

          <section className="student-calendar-layout">
            <article className="student-calendar-card">
              <div className="student-calendar-weekdays">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="student-calendar-grid">
                {monthDays.map((day) => {
                  const key = dateKey(day);
                  const dayClasses = classesByDate[key] || [];
                  const inMonth = day.getMonth() === calendarBase.getMonth();
                  return (
                    <button
                      type="button"
                      className={`student-calendar-day ${inMonth ? "" : "muted"} ${key === todayDate() ? "today" : ""}`}
                      data-active={key === selectedDate ? "true" : "false"}
                      key={key}
                      onClick={() => {
                        setActiveFilter("mes");
                        setCalendarBase(day);
                        setSelectedDate(key);
                      }}
                    >
                      <strong>{day.getDate()}</strong>
                      {dayClasses.length ? <span>{dayClasses.length}</span> : null}
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="student-calendar-summary">
              <span>Resumen</span>
              <h3>{summary.clases} {summary.clases === 1 ? "clase programada" : "clases programadas"}</h3>
              <div className="student-calendar-summary-list">
                <p><strong>{summary.evaluaciones}</strong> evaluaciones</p>
                <p><strong>{summary.tareas}</strong> tareas</p>
                <p><strong>{summary.presenciales}</strong> presencial</p>
              </div>
            </article>
          </section>

          <section className="schedule-grid">
            {filteredClases.length === 0 && !loading ? (
              <div className="cu-empty">Sin clases programadas para este filtro.</div>
            ) : (
              Object.entries(grouped).map(([fecha, items]) => (
                <article className="schedule-day-card" key={fecha}>
                  <div className="schedule-day-head">
                    <CalendarDays size={20} strokeWidth={1.9} aria-hidden="true" />
                    <strong>{formatDate(fecha)}</strong>
                  </div>
                  <div className="schedule-class-list">
                    {items.map((clase) => {
                      const asistencia = asistenciaByClase.get(clase.id);
                      const virtual = String(clase.modalidad || "").toLowerCase().includes("virtual") || clase.enlace_virtual;
                      const modalidad = clase.modalidad || "Modalidad por definir";
                      const aula = clase.recurso || extractMeta("Recurso / Aula / Sala", clase.contenido, clase.descripcion) || "Aula o sala por definir";
                      return (
                        <article key={clase.id} className={`student-class-card ${specialtyTone(clase.especialidades?.nombre || specialtyName)}`}>
                          <div className="student-class-card-head">
                            <div className="student-class-chip-row">
                              <span className={`student-class-chip ${chipClass(clase.estado || "programada")}`}>{clase.estado || "programada"}</span>
                              <span className={`student-class-chip ${chipClass(modalidad)}`}>{modalidad}</span>
                              {String(clase.evaluacion || clase.actividad || "").toLowerCase().includes("evalu") ? (
                                <span className="student-class-chip evaluacion">Evaluación</span>
                              ) : null}
                            </div>
                            {asistencia?.estado ? <span className="academic-status abierta">Asistencia: {asistencia.estado}</span> : null}
                          </div>
                          <h3>{clase.titulo}</h3>
                          <p className="student-class-description"><BookOpen size={14} strokeWidth={2} /> {getCleanDescription(clase)}</p>
                          <div className="student-class-meta-grid">
                            <small><UserRound size={14} strokeWidth={2} /> <span><b>Docente</b>{clase.docente || "Docente pendiente"}</span></small>
                            <small><MapPin size={14} strokeWidth={2} /> <span><b>Aula / sala</b>{aula}</span></small>
                            <small><CalendarDays size={14} strokeWidth={2} /> <span><b>Especialidad</b>{clase.especialidades?.nombre || specialtyName}</span></small>
                            <small><FileText size={14} strokeWidth={2} /> <span><b>Estado</b>{clase.estado || "programada"}</span></small>
                          </div>
                          <div className="student-class-timeline" aria-label="Duración de clase">
                            <strong>{clase.hora_inicio || "--:--"}</strong>
                            <span />
                            <strong>{clase.hora_fin || "--:--"}</strong>
                          </div>
                          <small><Clock size={14} strokeWidth={2} aria-hidden="true" /> {formatClassTime(clase)}</small>
                          {clase.evaluacion ? <small><FileText size={14} strokeWidth={2} /> {clase.evaluacion}</small> : null}
                          <div className="student-class-actions">
                            {virtual && clase.enlace_virtual ? (
                              <a href={clase.enlace_virtual} target="_blank" rel="noreferrer">
                                <Video size={15} strokeWidth={2} /> Entrar a clase
                              </a>
                            ) : null}
                            {clase.enlace_virtual ? (
                              <a href={clase.enlace_virtual} target="_blank" rel="noreferrer" className="secondary">
                                <ExternalLink size={15} strokeWidth={2} /> Ver materiales
                              </a>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
