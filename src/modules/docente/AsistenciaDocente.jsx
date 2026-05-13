import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import {
  getAsistenciaByClase,
  getProximasClasesAcademicas,
  getRecursosAsistenciaByClase,
  registrarAsistencia,
} from "../../services/asistenciaService";
import { buildDraftKey, useLocalDraft } from "../../hooks/useLocalDraft";

const ESTADOS = [
  { value: "asistio", label: "Asistió" },
  { value: "tardia", label: "Tardía" },
  { value: "ausente", label: "Ausente" },
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

function isAsistenciaDraftEmpty(value) {
  const entries = Object.values(value?.asistenciaMap || {});
  return !String(value?.selectedClaseId || "").trim()
    && entries.every((item) => !String(item?.comentario || "").trim() && (item?.estado || "ausente") === "ausente");
}

export default function AsistenciaDocente({ profile = null, onBack = null }) {
  const [clases, setClases] = useState([]);
  const [selectedClaseId, setSelectedClaseId] = useState("");
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
    loadClases();
  }, []);

  useEffect(() => {
    loadClaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClaseId]);

  async function loadClases() {
    setLoading(true);
    setMessage("");

    try {
      const data = await getProximasClasesAcademicas();
      setClases(data);
      setSelectedClaseId((current) => current || data?.[0]?.id || "");
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
            estado: current.estado,
            comentario: current.comentario,
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
            Clase
            <select value={selectedClaseId} onChange={(event) => setSelectedClaseId(event.target.value)}>
              <option value="">{loading ? "Cargando clases..." : "Seleccionar clase"}</option>
              {clases.map((clase) => (
                <option key={clase.id} value={clase.id}>
                  {formatDate(clase.fecha)} · {clase.titulo} · {clase.especialidades?.nombre || "Especialidad"}
                </option>
              ))}
            </select>
          </label>
        </div>

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
