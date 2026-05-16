import { supabase } from "../supabaseClient";
import { getExpedientesByEspecialidad } from "./especialidadService";
import { normalizeRole } from "../auth/roles";
import { normalizeSpecialtyRecord } from "../utils/especialidadesCatalog";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getClasesAcademicas(especialidadId = null) {
  let query = supabase
    .from("especialidad_clases_virtuales")
    .select(`
      *,
      especialidades:especialidad_id (
        id,
        nombre
      )
    `)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (especialidadId) {
    query = query.eq("especialidad_id", especialidadId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((item) => ({
    ...item,
    especialidades: item.especialidades ? normalizeSpecialtyRecord(item.especialidades) : item.especialidades,
  }));
}

export async function getProximasClasesAcademicas(especialidadId = null) {
  let query = supabase
    .from("especialidad_clases_virtuales")
    .select(`
      *,
      especialidades:especialidad_id (
        id,
        nombre
      )
    `)
    .gte("fecha", todayDate())
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (especialidadId) {
    query = query.eq("especialidad_id", especialidadId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((item) => ({
    ...item,
    especialidades: item.especialidades ? normalizeSpecialtyRecord(item.especialidades) : item.especialidades,
  }));
}

export async function getAsistenciaByClase(claseId) {
  if (!claseId) return [];

  const { data, error } = await supabase
    .from("especialidad_asistencia")
    .select(`
      *,
      profiles:profile_id (
        id,
        nombre,
        correo,
        cum,
        avatar_url
      )
    `)
    .eq("clase_id", claseId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function registrarAsistencia({ claseId, profileId, estado = "ausente", comentario = "" }) {
  if (!claseId) throw new Error("Seleccioná una clase.");
  if (!profileId) throw new Error("Falta profile_id del recurso.");

  const payload = {
    clase_id: claseId,
    profile_id: profileId,
    estado,
    comentario: comentario?.trim() || null,
  };

  const { data, error } = await supabase
    .from("especialidad_asistencia")
    .upsert(payload, { onConflict: "clase_id,profile_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAsistencia(id, payload) {
  if (!id) throw new Error("Falta id de asistencia.");

  const { data, error } = await supabase
    .from("especialidad_asistencia")
    .update({
      estado: payload.estado,
      comentario: payload.comentario?.trim() || null,
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

export async function getResumenAsistencia({ profileId, especialidadId }) {
  const historial = await getAsistenciaRecurso({ profileId, especialidadId });
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

export async function getAsistenciaRecurso({ profileId, especialidadId = null }) {
  if (!profileId) return [];

  const { data, error } = await supabase
    .from("especialidad_asistencia")
    .select(`
      *,
      clase:clase_id (
        id,
        especialidad_id,
        titulo,
        docente,
        fecha,
        hora_inicio,
        hora_fin,
        estado,
        especialidades:especialidad_id (
          id,
          nombre
        )
      )
    `)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data || []).map((item) => ({
    ...item,
    clase: item.clase
      ? {
          ...item.clase,
          especialidades: item.clase.especialidades
            ? normalizeSpecialtyRecord(item.clase.especialidades)
            : item.clase.especialidades,
        }
      : item.clase,
  }));
  return especialidadId
    ? rows.filter((item) => item.clase?.especialidad_id === especialidadId)
    : rows;
}
