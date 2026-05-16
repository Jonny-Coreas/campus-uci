import { supabase } from "../supabaseClient";
import { getExpedientesByEspecialidad } from "./especialidadService";
import { reviewEntregaTarea } from "./clasesTareasService";
import { isAdminOrJefe, isDocente, normalizeRole } from "../auth/roles";
import { normalizeSpecialtyRecords } from "../utils/especialidadesCatalog";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function estadoFromNota(nota) {
  return Number(nota) >= 7 ? "Aprobado" : "Reprobado";
}

function porcentajeFromNota(nota) {
  const n = Number(nota);
  return Number.isFinite(n) ? Number((n * 10).toFixed(2)) : 0;
}

async function getEspecialidades() {
  const { data, error } = await supabase
    .from("especialidades")
    .select("id, nombre, descripcion, activa")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return normalizeSpecialtyRecords(data || []);
}

export async function getEspecialidadesPermitidas(profile = null, especialidades = []) {
  if (isAdminOrJefe(profile)) return especialidades;
  if (!isDocente(profile)) return [];

  const profileId = profile?.id || null;
  const userIds = [...new Set([profile?.user_id, profileId].filter(Boolean))];
  const queries = [];

  if (profileId) {
    queries.push(
      supabase
        .from("usuario_especialidad")
        .select("especialidad_id, activo")
        .eq("profile_id", profileId),
    );
  }

  if (userIds.length) {
    queries.push(
      supabase
        .from("usuario_especialidad")
        .select("especialidad_id, activo")
        .in("user_id", userIds),
    );
  }

  const results = await Promise.all(
    queries.map((query) =>
      query.then(({ data, error }) => {
        if (error) {
          console.warn("[Campus UCI] No se pudieron cargar especialidades del docente:", error);
          return [];
        }
        return data || [];
      }),
    ),
  );

  const allowedIds = new Set(
    results
      .flat()
      .filter((item) => item.activo !== false && item.especialidad_id)
      .map((item) => item.especialidad_id),
  );

  return especialidades.filter((item) => allowedIds.has(item.id));
}

function onlyRecursos(rows = []) {
  return rows.filter((item) => normalizeRole(item?.rol) === "recurso");
}

function idsFromEspecialidades(especialidades = []) {
  return especialidades.map((item) => item.id).filter(Boolean);
}

function applyEspecialidadScope(query, especialidadIds = []) {
  if (!especialidadIds.length) return query;
  return query.in("especialidad_id", especialidadIds);
}

export async function getMisClases(profile = null, especialidadIds = null) {
  if (Array.isArray(especialidadIds) && especialidadIds.length === 0) return [];

  const docenteName = profile?.nombre || "";
  let query = supabase
    .from("especialidad_clases_virtuales")
    .select("*")
    .gte("fecha", todayDate())
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (Array.isArray(especialidadIds)) {
    query = applyEspecialidadScope(query, especialidadIds);
  }

  if (docenteName) {
    query = query.ilike("docente", `%${docenteName}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar clases por docente; usando vista general:", error);
    let fallbackQuery = supabase
      .from("especialidad_clases_virtuales")
      .select("*")
      .gte("fecha", todayDate())
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });

    if (Array.isArray(especialidadIds)) {
      fallbackQuery = applyEspecialidadScope(fallbackQuery, especialidadIds);
    }

    const fallback = await fallbackQuery;
    if (fallback.error) throw fallback.error;
    return fallback.data || [];
  }

  return data || [];
}

export async function getMisTareas(especialidadIds = null) {
  if (Array.isArray(especialidadIds) && especialidadIds.length === 0) return [];

  let query = supabase
    .from("especialidad_tareas")
    .select("*")
    .order("fecha_limite", { ascending: true });

  if (Array.isArray(especialidadIds)) {
    query = applyEspecialidadScope(query, especialidadIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEntregasPendientes(tareas = []) {
  const tareaIds = tareas.map((item) => item.id).filter(Boolean);
  if (!tareaIds.length) return [];

  const { data, error } = await supabase
    .from("especialidad_tarea_entregas")
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
    .in("tarea_id", tareaIds)
    .eq("estado", "entregada")
    .order("fecha_entrega", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getNotasRecientes(especialidadIds = null) {
  if (Array.isArray(especialidadIds) && especialidadIds.length === 0) return [];

  let query = supabase
    .from("especialidad_notas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (Array.isArray(especialidadIds)) {
    query = applyEspecialidadScope(query, especialidadIds);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar notas recientes:", error);
    return [];
  }

  return data || [];
}

export async function getDocenteDashboard(profile = null) {
  const especialidades = await getEspecialidades();
  const especialidadesPermitidas = await getEspecialidadesPermitidas(profile, especialidades);
  const especialidadIds = isAdminOrJefe(profile) ? null : idsFromEspecialidades(especialidadesPermitidas);

  const [clases, tareas, notasRecientes] = await Promise.all([
    getMisClases(profile, especialidadIds),
    getMisTareas(especialidadIds),
    getNotasRecientes(especialidadIds),
  ]);
  const entregasPendientes = await getEntregasPendientes(tareas);

  return {
    especialidades,
    especialidadesPermitidas,
    clases,
    tareas,
    entregasPendientes,
    notasRecientes,
    stats: {
      proximasClases: clases.length,
      tareas: tareas.length,
      pendientesRevision: entregasPendientes.length,
      evaluaciones: notasRecientes.length,
    },
  };
}

export async function reviewEntrega(id, form) {
  return reviewEntregaTarea(id, form);
}

export async function getRecursosEvaluacion(especialidadId) {
  if (!especialidadId) return [];
  const rows = await getExpedientesByEspecialidad(especialidadId);
  return onlyRecursos(rows);
}

export async function createEvaluacion(payload) {
  return registrarNota(payload);
}

export async function registrarNota({
  especialidadId,
  recursoId,
  area,
  actividad,
  nota,
  observaciones,
  createdBy,
}) {
  if (!especialidadId) throw new Error("Seleccioná una especialidad.");
  if (!recursoId) throw new Error("Seleccioná un recurso.");
  if (!actividad?.trim()) throw new Error("Indicá el nombre de la evaluación.");

  const numericNota = Number(nota);
  if (!Number.isFinite(numericNota) || numericNota < 0 || numericNota > 10) {
    throw new Error("La nota debe estar entre 0 y 10.");
  }

  const payload = {
    especialidad_id: especialidadId,
    recurso_id: recursoId,
    area: area?.trim() || "Evaluación docente",
    actividad: actividad.trim(),
    nota: numericNota,
    porcentaje: porcentajeFromNota(numericNota),
    estado: estadoFromNota(numericNota),
    observaciones: observaciones?.trim() || null,
    created_by: createdBy || null,
  };

  const { data, error } = await supabase
    .from("especialidad_notas")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
