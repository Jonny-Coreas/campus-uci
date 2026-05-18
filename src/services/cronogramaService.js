import { supabase } from "../supabaseClient";
import { normalizeSpecialtyRecord } from "../utils/especialidadesCatalog";

const CRONOGRAMA_TABLE = "especialidad_cronograma_clases";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function extractUrl(...values) {
  const text = values.filter(Boolean).join("\n");
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match?.[0] || null;
}

function extractMeta(label, ...values) {
  const text = values.filter(Boolean).join("\n");
  const match = text.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function normalizeEstado(row) {
  const explicit = String(row?.estado || "").trim();
  if (explicit) return explicit;

  const evaluacion = String(row?.evaluacion || "");
  if (/borrador/i.test(evaluacion)) return "borrador";
  if (/cancelad/i.test(evaluacion)) return "cancelada";
  if (/realizad|finalizad/i.test(evaluacion)) return "realizada";
  return "programada";
}

export function normalizeCronogramaClase(row = {}) {
  const contenido = row.contenido || row.descripcion || "";
  const actividad = row.actividad || "";
  const evaluacion = row.evaluacion || "";
  const titulo = row.titulo || row.tema || actividad || "Clase programada";
  const horaInicio = row.hora_inicio || row.hora || extractMeta("Hora inicio", contenido, actividad, evaluacion);
  const horaFin = row.hora_fin || extractMeta("Hora fin", contenido, actividad, evaluacion);
  const docente = row.docente || extractMeta("Docente", contenido, actividad, evaluacion);
  const modalidad = row.modalidad || extractMeta("Modalidad", contenido, actividad, evaluacion);
  const enlace = row.enlace_virtual || row.enlace || extractUrl(contenido, actividad, evaluacion);

  return {
    ...row,
    titulo,
    tema: row.tema || titulo,
    descripcion: contenido,
    contenido,
    actividad,
    evaluacion,
    hora_inicio: horaInicio || "",
    hora_fin: horaFin || "",
    docente: docente || "",
    modalidad: modalidad || "",
    enlace_virtual: enlace,
    estado: normalizeEstado(row),
    especialidades: row.especialidades ? normalizeSpecialtyRecord(row.especialidades) : row.especialidades,
    source_table: CRONOGRAMA_TABLE,
  };
}

function applyEspecialidadFilter(query, especialidadIdOrIds) {
  if (Array.isArray(especialidadIdOrIds)) {
    return especialidadIdOrIds.length ? query.in("especialidad_id", especialidadIdOrIds) : query;
  }
  return especialidadIdOrIds ? query.eq("especialidad_id", especialidadIdOrIds) : query;
}

export async function getCronogramaClases(especialidadIdOrIds = null, { upcomingOnly = false, limit = null } = {}) {
  if (Array.isArray(especialidadIdOrIds) && especialidadIdOrIds.length === 0) return [];

  let query = supabase
    .from(CRONOGRAMA_TABLE)
    .select(`
      *,
      especialidades:especialidad_id (
        id,
        nombre,
        descripcion
      )
    `)
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true });

  query = applyEspecialidadFilter(query, especialidadIdOrIds);
  if (upcomingOnly) query = query.gte("fecha", todayDate());
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeCronogramaClase);
}

export async function createCronogramaClase(form) {
  if (!form?.especialidad_id) throw new Error("Seleccioná una especialidad.");
  if (!form?.tema?.trim()) throw new Error("Escribí el tema o título de la clase.");

  const payload = {
    especialidad_id: form.especialidad_id,
    created_by: form.created_by || null,
    semana: form.semana?.trim() || null,
    fecha: form.fecha || null,
    tema: form.tema.trim(),
    contenido: form.contenido?.trim() || null,
    actividad: form.actividad?.trim() || null,
    evaluacion: form.evaluacion?.trim() || null,
    orden: Number(form.orden) || 0,
  };

  const { data, error } = await supabase
    .from(CRONOGRAMA_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeCronogramaClase(data);
}

export async function updateCronogramaClase(id, form) {
  if (!id) throw new Error("Falta id del cronograma.");

  const payload = {
    semana: form.semana?.trim() || null,
    fecha: form.fecha || null,
    tema: form.tema?.trim(),
    contenido: form.contenido?.trim() || null,
    actividad: form.actividad?.trim() || null,
    evaluacion: form.evaluacion?.trim() || null,
    orden: Number(form.orden) || 0,
  };

  const { data, error } = await supabase
    .from(CRONOGRAMA_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeCronogramaClase(data);
}

export async function deleteCronogramaClase(id) {
  if (!id) throw new Error("Falta id del cronograma.");

  const { error } = await supabase
    .from(CRONOGRAMA_TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}
