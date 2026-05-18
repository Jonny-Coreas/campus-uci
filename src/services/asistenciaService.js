import { supabase } from "../supabaseClient";
import { getExpedientesByEspecialidad } from "./especialidadService";
import { normalizeRole } from "../auth/roles";
import { normalizeSpecialtyRecord } from "../utils/especialidadesCatalog";
import { getCronogramaClases } from "./cronogramaService";

const ASISTENCIA_TABLE = "inasistencia_registros";

export async function getClasesAcademicas(especialidadId = null) {
  return getCronogramaClases(especialidadId);
}

export async function getProximasClasesAcademicas(especialidadId = null) {
  return getCronogramaClases(especialidadId, { upcomingOnly: true });
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

  const byCronogramaId = await supabase
    .from(ASISTENCIA_TABLE)
    .select("*")
    .eq("cronograma_id", claseId)
    .order("created_at", { ascending: true });

  if (!byCronogramaId.error) return (byCronogramaId.data || []).map(normalizeAttendanceRow);

  console.warn("[Campus UCI] No se pudo cargar asistencia por cronograma_id; intentando clase_id:", byCronogramaId.error);

  const byClaseId = await supabase
    .from(ASISTENCIA_TABLE)
    .select("*")
    .eq("clase_id", claseId)
    .order("created_at", { ascending: true });

  if (byClaseId.error) throw byCronogramaId.error;
  return (byClaseId.data || []).map(normalizeAttendanceRow);
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

  const payload = {
    especialidad_id: especialidadId,
    recurso_id: profileId,
    cronograma_id: claseId,
    fecha: clase?.fecha || null,
    actividad: clase?.titulo || clase?.tema || "Clase académica",
    tipo: clase?.actividad || "Clase",
    modalidad: clase?.modalidad || "Académica",
    estado,
    observaciones: comentario?.trim() || null,
    registrado_por: registradoPor || null,
  };

  const existing = await supabase
    .from(ASISTENCIA_TABLE)
    .select("id")
    .eq("cronograma_id", claseId)
    .eq("recurso_id", profileId)
    .maybeSingle();

  if (existing.error) throw existing.error;

  let fallback = existing.data?.id
    ? await supabase.from(ASISTENCIA_TABLE).update(payload).eq("id", existing.data.id).select("*").single()
    : await supabase.from(ASISTENCIA_TABLE).insert(payload).select("*").single();

  if (fallback.error && /registrado_por|schema cache/i.test(fallback.error.message || "")) {
    const compatiblePayload = { ...payload };
    delete compatiblePayload.registrado_por;
    fallback = existing.data?.id
      ? await supabase.from(ASISTENCIA_TABLE).update(compatiblePayload).eq("id", existing.data.id).select("*").single()
      : await supabase.from(ASISTENCIA_TABLE).insert(compatiblePayload).select("*").single();
  }

  if (fallback.error) throw fallback.error;
  return fallback.data;
}

export async function updateAsistencia(id, payload) {
  if (!id) throw new Error("Falta id de asistencia.");

  const { data, error } = await supabase
    .from(ASISTENCIA_TABLE)
    .update({
      estado: payload.estado,
      observaciones: payload.comentario?.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
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

async function safeAttendanceQuery(column, value) {
  if (!value) return [];

  const { data, error } = await supabase
    .from(ASISTENCIA_TABLE)
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`[Campus UCI] No se pudo cargar asistencia por ${column}:`, error);
    return [];
  }

  return data || [];
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

  const results = await Promise.all(
    identifiers.flatMap((id) => [
      safeAttendanceQuery("profile_id", id),
      safeAttendanceQuery("recurso_id", id),
    ]),
  );

  const baseRows = dedupeAttendance(results.flat()).map((item) => ({
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
