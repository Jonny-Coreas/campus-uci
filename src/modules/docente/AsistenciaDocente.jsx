import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Clock, MapPin, Save } from "lucide-react";
import {
  getAsistenciaByClase,
  getClasesAcademicas,
  getRecursosAsistenciaByClase,
  registrarAsistencia,
} from "../../services/asistenciaService";
import { getEspecialidadesPermitidas } from "../../services/docenteService";
import { buildDraftKey, useLocalDraft } from "../../hooks/useLocalDraft";

const ESTADOS = [
  { value: "asistio", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "tardia", label: "Tardanza" },
  { value: "justificada", label: "Justificada" },
];

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatClassOption(clase) {
  return [
    formatDate(clase.fecha),
    clase.titulo || clase.tema || "Clase",
    clase.especialidades?.nombre || "Especialidad",
    clase.modalidad || "Modalidad",
    `${clase.hora_inicio || "--:--"}${clase.hora_fin ? ` - ${clase.hora_fin}` : ""}`,
  ].join(" · ");
}

function isAsistenciaDraftEmpty(value) {
  const entries = Object.values(value?.asistenciaMap || {});
  return !String(value?.selectedClaseId || "").trim()
    && entries.every((item) => !String(item?.comentario || "").trim() && (item?.estado || "ausente") === "ausente");
}

export default function AsistenciaDocente({ profile = null, especialidades = [], onBack = null }) {
  const [clases, setClases] = useState([]);
  const [selectedClaseId, setSelectedClaseId] = useState("");
  const [especialidadId, setEspecialidadId] = useState("");
  const [especialidadesPermitidas, setEspecialidadesPermitidas] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [asistenciaMap, setAsistenciaMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedClase = useMemo(
    () => clases.find((clase) => clase.id === selectedClaseId) || null,
    [clases, selectedClaseId],
  );
  const draftKey = buildDraftKey("asistenciaDocente", profile?.id || profile?.user_id || "docente", selectedClaseId || "sin-clase");
  const { hasDraft, clearDraft } = useLocalDraft({
    key: draftKey,
    value: { selectedClaseId, asistenciaMap },
    enabled: true,
    isEmpty: isAsistenciaDraftEmpty,
    onRestore: (draft) => {
      if (draft.selectedClaseId) setSelectedClaseId(draft.selectedClaseId);
      if (draft.asistenciaMap) setAsistenciaMap(draft.asistenciaMap);
    },
  });

  useEffect(() => {
    let alive = true;

    async function loadPermitidas() {
      const rows = await getEspecialidadesPermitidas(profile, especialidades);
      if (!alive) return;
      setEspecialidadesPermitidas(rows);
      setEspecialidadId((current) => (rows.some((item) => item.id === current) ? current : rows[0]?.id || ""));
    }

    loadPermitidas();
    return () => {
      alive = false;
    };
  }, [especialidades, profile]);

  useEffect(() => {
    loadClases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId]);

  useEffect(() => {
    loadClaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClaseId]);

  async function loadClases() {
    setLoading(true);
    setMessage("");

    try {
      if (!especialidadId) {
        setClases([]);
        setSelectedClaseId("");
        return;
      }

      const data = await getClasesAcademicas(especialidadId);
      setClases(data);
      setSelectedClaseId((current) => (data.some((clase) => clase.id === current) ? current : data?.[0]?.id || ""));
    } catch (error) {
      console.error("[Campus UCI] Error cargando clases para asistencia:", error);
      setMessage(error.message || "No se pudieron cargar las clases.");
    } finally {
      setLoading(false);
    }
  }

  async function loadClaseData() {
    if (!selectedClaseId || !selectedClase) {
      setRecursos([]);
      setAsistenciaMap({});
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const [resourceRows, asistenciaRows] = await Promise.all([
        getRecursosAsistenciaByClase(selectedClase),
        getAsistenciaByClase(selectedClaseId),
      ]);

      const map = asistenciaRows.reduce((acc, row) => {
        acc[row.profile_id] = {
          id: row.id,
          estado: row.estado || "ausente",
          comentario: row.comentario || "",
        };
        return acc;
      }, {});

      setRecursos(resourceRows);
      setAsistenciaMap((current) => ({ ...map, ...current }));
    } catch (error) {
      console.error("[Campus UCI] Error cargando recursos/asistencia:", error);
      setMessage(error.message || "No se pudo cargar la asistencia.");
    } finally {
      setLoading(false);
    }
  }

  function setAsistencia(profileId, name, value) {
    setAsistenciaMap((prev) => ({
      ...prev,
      [profileId]: {
        estado: "ausente",
        comentario: "",
        ...(prev[profileId] || {}),
        [name]: value,
      },
    }));
  }

  async function guardarAsistencia() {
    if (!selectedClaseId) return;
    setSaving(true);
    setMessage("");

    try {
      await Promise.all(
        recursos.map((recurso) => {
          const profileId = recurso.profile_id || recurso.id;
          const current = asistenciaMap[profileId] || { estado: "ausente", comentario: "" };
          return registrarAsistencia({
            claseId: selectedClaseId,
            profileId,
            especialidadId: selectedClase?.especialidad_id || especialidadId,
            estado: current.estado,
            comentario: current.comentario,
            clase: selectedClase,
            registradoPor: profile?.id || profile?.user_id || null,
          });
        }),
      );

      setMessage("Asistencia guardada correctamente.");
      clearDraft();
      await loadClaseData();
    } catch (error) {
      console.error("[Campus UCI] Error guardando asistencia:", error);
      setMessage(error.message || "No se pudo guardar la asistencia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="attendance-page">
      <section className="schedule-hero">
        <div>
          <span className="dashboard-section-head-label">Docente</span>
          <h2>Control de asistencia</h2>
          <p>Seleccioná una clase y registrá asistencia por recurso académico.</p>
        </div>
        {onBack ? (
          <button type="button" className="academic-secondary-action" onClick={onBack}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            Volver
          </button>
        ) : null}
      </section>

      {message ? <div className="cu-alert">{message}</div> : null}

      <section className="attendance-panel">
        <div className="academic-form">
          {hasDraft ? (
            <div className="draft-notice">
              <span>Borrador de asistencia restaurado automáticamente.</span>
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  setAsistenciaMap({});
                  setMessage("");
                }}
              >
                Limpiar borrador
              </button>
            </div>
          ) : null}
          <label>
            Especialidad
            <span className="academic-inline-select">
              <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
              <select value={especialidadId} onChange={(event) => setEspecialidadId(event.target.value)}>
                {especialidadesPermitidas.map((especialidad) => (
                  <option key={especialidad.id} value={especialidad.id}>{especialidad.nombre}</option>
                ))}
              </select>
            </span>
          </label>

          <label>
            Clase
            <select value={selectedClaseId} onChange={(event) => setSelectedClaseId(event.target.value)}>
              <option value="">{loading ? "Cargando clases..." : "Seleccionar clase"}</option>
              {clases.map((clase) => (
                <option key={clase.id} value={clase.id}>
                  {formatClassOption(clase)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedClase ? (
          <article className="attendance-class-summary">
            <div>
              <span>Clase seleccionada</span>
              <h3>{selectedClase.titulo || selectedClase.tema || "Clase académica"}</h3>
              <p>{selectedClase.contenido || selectedClase.descripcion || "Sin temario adicional."}</p>
            </div>
            <div className="attendance-class-meta">
              <small><CalendarDays size={14} /> {formatDate(selectedClase.fecha)}</small>
              <small><Clock size={14} /> {selectedClase.hora_inicio || "--:--"} {selectedClase.hora_fin ? `- ${selectedClase.hora_fin}` : ""}</small>
              <small><MapPin size={14} /> {selectedClase.especialidades?.nombre || "Especialidad"} · {selectedClase.modalidad || "Modalidad"}</small>
            </div>
          </article>
        ) : null}

        {loading ? <div className="cu-empty">Cargando asistencia...</div> : null}

        {!loading && selectedClaseId && recursos.length === 0 ? (
          <div className="cu-empty">No hay recursos asignados a esta especialidad.</div>
        ) : null}

        {recursos.length ? (
          <>
            <div className="attendance-table-wrap">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Recurso</th>
                    <th>Especialidad</th>
                    <th>CUM</th>
                    <th>Estado</th>
                    <th>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {recursos.map((recurso) => {
                    const profileId = recurso.profile_id || recurso.id;
                    const current = asistenciaMap[profileId] || { estado: "ausente", comentario: "" };
                    return (
                      <tr key={profileId}>
                        <td><strong>{recurso.nombre}</strong><span>{recurso.correo || "Sin correo"}</span></td>
                        <td>{recurso.especialidad_nombre || selectedClase?.especialidades?.nombre || "Especialidad"}</td>
                        <td>{recurso.cum || "Sin CUM"}</td>
                        <td>
                          <select value={current.estado} onChange={(event) => setAsistencia(profileId, "estado", event.target.value)}>
                            {ESTADOS.map((estado) => (
                              <option key={estado.value} value={estado.value}>{estado.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={current.comentario}
                            onChange={(event) => setAsistencia(profileId, "comentario", event.target.value)}
                            placeholder="Observación opcional"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" className="academic-submit" onClick={guardarAsistencia} disabled={saving}>
              <Save size={16} strokeWidth={2} aria-hidden="true" />
              {saving ? "Guardando..." : "Guardar asistencia"}
            </button>
          </>
        ) : null}
      </section>
    </div>
  );
}
