import { supabase, supabaseUrl } from "../supabaseClient";
import { getExpedientesByEspecialidad } from "./especialidadService";
import { normalizeRole } from "../auth/roles";
import { normalizeSpecialtyRecord } from "../utils/especialidadesCatalog";
import { getCronogramaClases } from "./cronogramaService";

const ASISTENCIA_TABLE = "especialidad_asistencia";

function logAsistenciaTableError(context, error) {
  console.error(`[Campus UCI] Error ${context} en ${ASISTENCIA_TABLE}:`, error);
  console.error("[Campus UCI] VITE_SUPABASE_URL activo:", supabaseUrl);
  console.error("[Campus UCI] Tabla solicitada exactamente:", ASISTENCIA_TABLE);
}

export async function getClasesAcademicas(especialidadId = null) {
  return getCronogramaClases(especialidadId);
}

export async function getProximasClasesAcademicas(especialidadId = null) {
  return getCronogramaClases(especialidadId, { upcomingOnly: true });
}

async function selectAsistenciaRows() {
  const { data, error } = await supabase
    .from(ASISTENCIA_TABLE)
    .select("*");

  if (error) {
    logAsistenciaTableError("leyendo asistencia", error);
    throw error;
  }
  return data || [];
}

function normalizeAttendanceRow(item = {}) {
  const estadoRaw = String(item.estado || "").toLowerCase();
  const estado = estadoRaw === "presente" || estadoRaw === "asistió" || estadoRaw === "asistio"
    ? "asistio"
    : estadoRaw === "tardanza" || estadoRaw === "tarde"
      ? "tardia"
      : estadoRaw === "justificado"
        ? "justificada"
        : item.estado;
  return {
    ...item,
    estado,
    profile_id: item.profile_id || item.recurso_id,
    clase_id: item.clase_id || item.cronograma_id,
    comentario: item.comentario || item.observaciones || "",
  };
}

export async function getAsistenciaByClase(claseId) {
  if (!claseId) return [];

  const rows = await selectAsistenciaRows();
  return rows
    .filter((item) => item.cronograma_id === claseId || item.clase_id === claseId)
    .map(normalizeAttendanceRow);
}

export async function registrarAsistencia({
  claseId,
  profileId,
  especialidadId = null,
  estado = "ausente",
  comentario = "",
  clase = null,
  registradoPor = null,
}) {
  if (!claseId) throw new Error("Seleccioná una clase.");
  if (!profileId) throw new Error("Falta profile_id del recurso.");

  void especialidadId;
  void clase;
  void registradoPor;

  const payload = {
    clase_id: claseId,
    profile_id: profileId,
    estado,
    comentario: comentario?.trim() || null,
  };

  const existing = await supabase
    .from(ASISTENCIA_TABLE)
    .select("*");

  if (existing.error) {
    logAsistenciaTableError("buscando registro existente", existing.error);
    throw existing.error;
  }
  const existingRow = (existing.data || []).find((item) =>
    (item.cronograma_id === claseId || item.clase_id === claseId)
    && (item.recurso_id === profileId || item.profile_id === profileId),
  );

  let fallback = existingRow?.id
    ? await supabase.from(ASISTENCIA_TABLE).update(payload).eq("id", existingRow.id).select("*").single()
    : await supabase.from(ASISTENCIA_TABLE).insert(payload).select("*").single();

  if (fallback.error) {
    logAsistenciaTableError("guardando asistencia", fallback.error);
    throw fallback.error;
  }
  return fallback.data;
}

export async function updateAsistencia(id, payload) {
  if (!id) throw new Error("Falta id de asistencia.");

  const { data, error } = await supabase
    .from(ASISTENCIA_TABLE)
    .update({
      estado: payload.estado,
      comentario: payload.comentario?.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logAsistenciaTableError("actualizando asistencia", error);
    throw error;
  }
  return data;
}

export async function getRecursosAsistenciaByClase(clase) {
  if (!clase?.especialidad_id) return [];
  const rows = await getExpedientesByEspecialidad(clase.especialidad_id);
  return rows.filter((item) => normalizeRole(item?.rol) === "recurso");
}

export async function getResumenAsistencia({ profileId, profile = null, session = null, especialidadId }) {
  const historial = await getAsistenciaRecurso({ profileId, profile, session, especialidadId });
  const total = historial.length;
  const asistidas = historial.filter((item) => item.estado === "asistio").length;
  const tardias = historial.filter((item) => item.estado === "tardia").length;
  const ausencias = historial.filter((item) => item.estado === "ausente").length;
  const justificadas = historial.filter((item) => item.estado === "justificada").length;
  const porcentaje = total ? Math.round(((asistidas + tardias + justificadas) / total) * 100) : 0;

  return {
    total,
    asistidas,
    tardias,
    ausencias,
    justificadas,
    porcentaje,
    historial,
  };
}

function uniqueIds(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function dedupeAttendance(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.id || `${row.clase_id || row.cronograma_id}-${row.profile_id || row.recurso_id}`;
    if (!key || map.has(key)) return;
    map.set(key, row);
  });
  return [...map.values()];
}

async function enrichWithCronograma(rows = [], especialidadId = null) {
  const cronogramaIds = uniqueIds(
    rows
      .filter((item) => !item.clase?.especialidad_id)
      .map((item) => item.cronograma_id || item.clase_id),
  );

  if (!cronogramaIds.length) return rows;

  const cronogramaRows = await getCronogramaClases(especialidadId);
  const cronogramaById = new Map(cronogramaRows.map((item) => [item.id, item]));

  return rows.map((item) => {
    if (item.clase?.especialidad_id) return item;
    const cronograma = cronogramaById.get(item.cronograma_id || item.clase_id);
    if (!cronograma) return item;

    return {
      ...item,
      especialidad_id: item.especialidad_id || cronograma.especialidad_id,
      clase: {
        id: cronograma.id,
        especialidad_id: cronograma.especialidad_id,
        titulo: cronograma.titulo || cronograma.tema || item.actividad || "Clase académica",
        docente: cronograma.docente,
        fecha: cronograma.fecha || item.fecha,
        hora_inicio: cronograma.hora_inicio || "",
        hora_fin: cronograma.hora_fin || "",
        estado: cronograma.estado,
        especialidades: cronograma.especialidades,
      },
    };
  });
}

export async function getAsistenciaRecurso({ profileId, profile = null, session = null, especialidadId = null }) {
  const identifiers = uniqueIds([
    profileId,
    profile?.id,
    profile?.user_id,
    session?.user?.id,
  ]);

  if (!identifiers.length) return [];

  const allRows = await selectAsistenciaRows();
  const results = allRows.filter((item) =>
    identifiers.includes(item.recurso_id)
    || identifiers.includes(item.profile_id),
  );

  const baseRows = dedupeAttendance(results).map((item) => ({
    ...normalizeAttendanceRow(item),
    clase: item.clase
      ? {
          ...item.clase,
          especialidades: item.clase.especialidades
            ? normalizeSpecialtyRecord(item.clase.especialidades)
            : item.clase.especialidades,
        }
      : item.clase,
  }));

  const rows = await enrichWithCronograma(baseRows, especialidadId);
  return especialidadId
    ? rows.filter((item) => (item.clase?.especialidad_id || item.especialidad_id) === especialidadId)
    : rows;
}
