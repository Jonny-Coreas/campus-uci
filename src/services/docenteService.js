import { supabase, supabaseUrl } from "../supabaseClient";
import { getExpedientesByEspecialidad } from "./especialidadService";
import { reviewEntregaTarea } from "./clasesTareasService";
import { isAdminOrJefe, isDocente, normalizeRole } from "../auth/roles";
import { normalizeSpecialtyRecords } from "../utils/especialidadesCatalog";
import { getCronogramaClases } from "./cronogramaService";

const ASISTENCIA_TABLE = "especialidad_asistencia";

async function selectAsistenciaRows() {
  const { data, error } = await supabase
    .from(ASISTENCIA_TABLE)
    .select("*");

  if (error) {
    console.warn(`[Campus UCI] No se pudo cargar ${ASISTENCIA_TABLE}:`, error);
    console.error("[Campus UCI] VITE_SUPABASE_URL activo:", supabaseUrl);
    console.error("[Campus UCI] Tabla solicitada exactamente:", ASISTENCIA_TABLE);
    return [];
  }

  return data || [];
}

function estadoFromNota(nota) {
  return Number(nota) >= 7 ? "Aprobado" : "Reprobado";
}

function porcentajeFromNota(nota) {
  const n = Number(nota);
  return Number.isFinite(n) ? Number((n * 10).toFixed(2)) : 0;
}

function average(values = []) {
  const valid = values.map(Number).filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return Number((valid.reduce((acc, value) => acc + value, 0) / valid.length).toFixed(2));
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function okAttendance(estado) {
  return ["asistio", "asistió", "presente", "tardia", "tardanza", "tarde", "justificada", "justificado"].includes(String(estado || "").toLowerCase());
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

function assertEspecialidadPermitida(especialidadId, especialidadIds = null) {
  if (!especialidadId) throw new Error("Falta especialidad_id.");
  if (Array.isArray(especialidadIds) && !especialidadIds.includes(especialidadId)) {
    throw new Error("No tenés permiso para modificar datos de esta especialidad.");
  }
}

export async function getMisClases(especialidadIds = null) {
  if (Array.isArray(especialidadIds) && especialidadIds.length === 0) return [];

  try {
    return await getCronogramaClases(especialidadIds, { upcomingOnly: true });
  } catch (error) {
    console.warn("[Campus UCI] No se pudieron cargar clases reales del cronograma docente:", error);
    return [];
  }
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

async function getClasesPanel(especialidadIds = null) {
  if (Array.isArray(especialidadIds) && especialidadIds.length === 0) return [];

  try {
    return await getCronogramaClases(especialidadIds);
  } catch (error) {
    console.warn("[Campus UCI] No se pudieron cargar clases reales para panel docente:", error);
    return [];
  }
}

async function getNotasPanel(especialidadIds = null) {
  if (Array.isArray(especialidadIds) && especialidadIds.length === 0) return [];

  let query = supabase
    .from("especialidad_notas")
    .select("*")
    .order("created_at", { ascending: false });

  if (Array.isArray(especialidadIds)) {
    query = applyEspecialidadScope(query, especialidadIds);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar notas para panel docente:", error);
    return [];
  }
  return data || [];
}

async function getAsistenciaPanel(clases = []) {
  const claseIds = clases.map((item) => item.id).filter(Boolean);
  if (!claseIds.length) return [];

  const rows = await selectAsistenciaRows();
  return rows.filter((item) =>
    claseIds.includes(item.cronograma_id)
    || claseIds.includes(item.clase_id),
  ).map((item) => ({
    ...item,
    profile_id: item.profile_id || item.recurso_id,
    clase_id: item.clase_id || item.cronograma_id,
    comentario: item.comentario || item.observaciones || "",
  }));
}

async function getRecursosPanel(especialidadesPermitidas = []) {
  const recursos = await Promise.all(
    especialidadesPermitidas.map((especialidad) =>
      getExpedientesByEspecialidad(especialidad.id)
        .then((rows) =>
          onlyRecursos(rows).map((row) => ({
            ...row,
            especialidad_id: row.especialidad_id || especialidad.id,
            especialidad_nombre: especialidad.nombre,
          })),
        )
        .catch((error) => {
          console.warn("[Campus UCI] No se pudieron cargar recursos docentes:", especialidad.id, error);
          return [];
        }),
    ),
  );

  const byProfile = new Map();
  recursos.flat().forEach((item) => {
    const key = item.profile_id || item.id || item.user_id;
    if (!key || byProfile.has(key)) return;
    byProfile.set(key, item);
  });
  return [...byProfile.values()];
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

  const scopedEspecialidades = isAdminOrJefe(profile) ? especialidades : especialidadesPermitidas;
  const [clases, todasClases, tareas, notasRecientes, notas, recursos] = await Promise.all([
    getMisClases(especialidadIds),
    getClasesPanel(especialidadIds),
    getMisTareas(especialidadIds),
    getNotasRecientes(especialidadIds),
    getNotasPanel(especialidadIds),
    getRecursosPanel(scopedEspecialidades),
  ]);
  const asistencia = await getAsistenciaPanel(todasClases);
  const entregasPendientes = await getEntregasPendientes(tareas);
  const tareasAbiertas = tareas.filter((item) => String(item.estado || "abierta").toLowerCase() === "abierta");
  const recursosById = new Map(recursos.map((item) => [item.profile_id || item.id, item]));
  const clasesById = new Map(todasClases.map((item) => [item.id, item]));
  const tareasById = new Map(tareas.map((item) => [item.id, item]));

  const recursosResumen = recursos.map((recurso) => {
    const recursoId = recurso.profile_id || recurso.id;
    const notasRecurso = notas.filter((nota) => nota.recurso_id === recursoId);
    const promedio = average(notasRecurso.map((nota) => nota.nota));
    const asistenciaRecurso = asistencia.filter((row) => row.profile_id === recursoId);
    const asistenciaOk = asistenciaRecurso.filter((row) => okAttendance(row.estado)).length;
    const asistenciaPorcentaje = asistenciaRecurso.length
      ? clampPercent((asistenciaOk / asistenciaRecurso.length) * 100)
      : 0;
    const estado = promedio !== null && promedio < 7
      ? "Reprobado"
      : promedio !== null && promedio >= 9 && asistenciaPorcentaje >= 90
        ? "Excelente"
        : promedio !== null && (promedio < 7.5 || asistenciaPorcentaje < 80)
          ? "Riesgo"
          : "Activo";

    return {
      ...recurso,
      profile_id: recursoId,
      promedio,
      asistenciaPorcentaje,
      notas: notasRecurso,
      asistencia: asistenciaRecurso,
      estadoAcademico: estado,
      tareas: tareas.filter((tarea) => tarea.especialidad_id === recurso.especialidad_id),
    };
  });

  const evolucionMensual = new Map();
  notas.forEach((nota) => {
    const key = String(nota.created_at || "").slice(0, 7) || "Sin fecha";
    const current = evolucionMensual.get(key) || [];
    current.push(nota.nota);
    evolucionMensual.set(key, current);
  });

  const aprobados = recursosResumen.filter((item) => Number(item.promedio) >= 7).length;
  const reprobados = recursosResumen.filter((item) => item.promedio !== null && Number(item.promedio) < 7).length;
  const clasesRealizadas = todasClases.filter((clase) => ["realizada", "finalizada"].includes(String(clase.estado || "").toLowerCase())).length;
  const clasesCanceladas = todasClases.filter((clase) => String(clase.estado || "").toLowerCase() === "cancelada").length;
  const clasesProgramadas = todasClases.length;
  const distribucionEspecialidad = scopedEspecialidades.map((especialidad) => ({
    id: especialidad.id,
    nombre: especialidad.nombre,
    recursos: recursosResumen.filter((item) => item.especialidad_id === especialidad.id).length,
  }));
  const clasesGrabadas = todasClases
    .filter((clase) => clase.enlace_virtual)
    .map((clase) => ({
      ...clase,
      tipo_video: "Enlace externo",
      duracion: clase.duracion || "No indicada",
      estado_publicacion: String(clase.estado || "programada").toLowerCase() === "cancelada" ? "borrador" : "publicada",
    }));
  const promedioGeneral = average(recursosResumen.map((item) => item.promedio));
  const asistenciaGeneral = average(recursosResumen.map((item) => item.asistenciaPorcentaje)) ?? 0;

  return {
    especialidades,
    especialidadesPermitidas,
    clases,
    todasClases,
    tareas,
    entregasPendientes,
    notasRecientes,
    notas,
    asistencia,
    recursos: recursosResumen,
    charts: {
      asistenciaPorRecurso: recursosResumen.map((item) => ({
        label: item.nombre || item.correo || "Recurso",
        value: item.asistenciaPorcentaje,
      })),
      promedioPorRecurso: recursosResumen.map((item) => ({
        label: item.nombre || item.correo || "Recurso",
        value: item.promedio ?? 0,
      })),
      evolucionMensual: [...evolucionMensual.entries()].map(([label, values]) => ({
        label,
        value: average(values) ?? 0,
      })),
      aprobadosReprobados: [
        { label: "Aprobados", value: aprobados },
        { label: "Reprobados", value: reprobados },
      ],
      cumplimientoClases: [
        { label: "Realizadas", value: clasesRealizadas },
        { label: "Programadas", value: Math.max(0, clasesProgramadas - clasesRealizadas - clasesCanceladas) },
        { label: "Canceladas", value: clasesCanceladas },
      ],
      distribucionEspecialidad,
    },
    clasesGrabadas,
    tareasAbiertas,
    recursosById,
    clasesById,
    tareasById,
    stats: {
      recursos: recursosResumen.length,
      promedioGeneral,
      asistenciaGeneral,
      riesgo: recursosResumen.filter((item) => ["Riesgo", "Reprobado"].includes(item.estadoAcademico)).length,
      proximasClases: clases.length,
      clasesProgramadas,
      tareas: tareas.length,
      tareasPendientes: tareasAbiertas.length,
      pendientesRevision: entregasPendientes.length,
      evaluaciones: notasRecientes.length,
    },
  };
}

export async function reviewEntrega(id, form) {
  return reviewEntregaTarea(id, form);
}

export async function updateNotaDocente({ id, especialidadId, form, profile = null }) {
  if (!id) throw new Error("Falta id de nota.");
  const especialidades = await getEspecialidades();
  const especialidadesPermitidas = await getEspecialidadesPermitidas(profile, especialidades);
  const especialidadIds = isAdminOrJefe(profile) ? null : idsFromEspecialidades(especialidadesPermitidas);
  assertEspecialidadPermitida(especialidadId, especialidadIds);

  const nota = Number(form.nota);
  if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
    throw new Error("La nota debe estar entre 0 y 10.");
  }

  const payload = {
    area: form.area?.trim() || "Evaluación docente",
    actividad: form.actividad?.trim() || "Evaluación",
    nota,
    porcentaje: porcentajeFromNota(nota),
    estado: estadoFromNota(nota),
    observaciones: form.observaciones?.trim() || null,
  };

  const { data, error } = await supabase
    .from("especialidad_notas")
    .update(payload)
    .eq("id", id)
    .eq("especialidad_id", especialidadId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAsistenciaDocente({ id, claseId, estado, comentario, profile = null }) {
  if (!id) throw new Error("Falta id de asistencia.");
  if (!claseId) throw new Error("Falta clase_id.");

  const especialidades = await getEspecialidades();
  const especialidadesPermitidas = await getEspecialidadesPermitidas(profile, especialidades);
  const especialidadIds = isAdminOrJefe(profile) ? null : idsFromEspecialidades(especialidadesPermitidas);

  const { data: clase, error: claseError } = await supabase
    .from("especialidad_cronograma_clases")
    .select("id, especialidad_id")
    .eq("id", claseId)
    .maybeSingle();

  if (claseError) throw claseError;
  assertEspecialidadPermitida(clase?.especialidad_id, especialidadIds);

  const result = await supabase
    .from(ASISTENCIA_TABLE)
    .update({
      estado,
      comentario: comentario?.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (!result.error) return result.data;
  console.error(`[Campus UCI] Error actualizando ${ASISTENCIA_TABLE}:`, result.error);
  console.error("[Campus UCI] VITE_SUPABASE_URL activo:", supabaseUrl);
  console.error("[Campus UCI] Tabla solicitada exactamente:", ASISTENCIA_TABLE);
  throw result.error;
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
