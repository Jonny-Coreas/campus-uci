import { supabase } from "../supabaseClient";
import { getRecursos } from "./recursosAdminService";

function uniqueById(items) {
  const map = new Map();
  items.filter(Boolean).forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
}

function average(values) {
  const valid = values.map(Number).filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return Number((valid.reduce((acc, value) => acc + value, 0) / valid.length).toFixed(2));
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function okAttendance(estado) {
  return ["asistio", "tardia", "justificada"].includes(String(estado || "").toLowerCase());
}

async function getProfile(profileId) {
  if (!profileId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id, nombre, correo, rol, servicio, area, cum, activo, avatar_url")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getAsignaciones(profile) {
  if (!profile?.id && !profile?.user_id) return [];

  const queries = [];
  const select = "id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at";

  if (profile?.id) {
    queries.push(supabase.from("usuario_especialidad").select(select).eq("profile_id", profile.id));
    queries.push(supabase.from("usuario_especialidad").select(select).eq("user_id", profile.id));
  }

  if (profile?.user_id) {
    queries.push(supabase.from("usuario_especialidad").select(select).eq("user_id", profile.user_id));
  }

  const results = await Promise.all(
    queries.map((query) =>
      query.then(({ data, error }) => {
        if (error) {
          console.warn("[Campus UCI] No se pudo consultar usuario_especialidad:", error);
          return [];
        }
        return data || [];
      }),
    ),
  );

  return uniqueById(results.flat())
    .filter((item) => item.activo !== false)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

async function getEspecialidad(especialidadId) {
  if (!especialidadId) return null;

  const { data, error } = await supabase
    .from("especialidades")
    .select("id, nombre, descripcion, activa")
    .eq("id", especialidadId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getTareas(especialidadId) {
  if (!especialidadId) return [];

  const { data, error } = await supabase
    .from("especialidad_tareas")
    .select("*")
    .eq("especialidad_id", especialidadId)
    .order("fecha_limite", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getEntregas({ tareas, profile }) {
  const tareaIds = tareas.map((item) => item.id).filter(Boolean);
  if (!tareaIds.length || (!profile?.id && !profile?.user_id)) return [];

  const queries = [];
  const select = `
    *,
    tarea:tarea_id (
      id,
      titulo,
      fecha_limite,
      puntaje,
      especialidad_id
    )
  `;

  if (profile?.id) {
    queries.push(supabase.from("especialidad_tarea_entregas").select(select).in("tarea_id", tareaIds).eq("profile_id", profile.id));
    queries.push(supabase.from("especialidad_tarea_entregas").select(select).in("tarea_id", tareaIds).eq("user_id", profile.id));
  }

  if (profile?.user_id) {
    queries.push(supabase.from("especialidad_tarea_entregas").select(select).in("tarea_id", tareaIds).eq("user_id", profile.user_id));
  }

  const results = await Promise.all(
    queries.map((query) =>
      query.then(({ data, error }) => {
        if (error) {
          console.warn("[Campus UCI] No se pudieron cargar entregas del expediente:", error);
          return [];
        }
        return data || [];
      }),
    ),
  );

  return uniqueById(results.flat()).sort(
    (a, b) => new Date(b.fecha_entrega || b.created_at || 0) - new Date(a.fecha_entrega || a.created_at || 0),
  );
}

export async function getHistorialNotas(profileId, especialidadId = null) {
  if (!profileId) return [];

  let query = supabase
    .from("especialidad_notas")
    .select("*")
    .eq("recurso_id", profileId)
    .order("created_at", { ascending: false });

  if (especialidadId) query = query.eq("especialidad_id", especialidadId);

  const { data, error } = await query;
  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar notas del expediente:", error);
    return [];
  }
  return data || [];
}

export async function getHistorialAsistencia(profileId, especialidadId = null) {
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
        especialidades:especialidad_id (
          id,
          nombre
        )
      )
    `)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[Campus UCI] No se pudo cargar asistencia del expediente:", error);
    return [];
  }

  const rows = data || [];
  return especialidadId ? rows.filter((item) => item.clase?.especialidad_id === especialidadId) : rows;
}

export async function getHistorialTareas(profileId, especialidadId = null) {
  const profile = await getProfile(profileId);
  const asignaciones = await getAsignaciones(profile);
  const especialidad = especialidadId || asignaciones[0]?.especialidad_id || null;
  return getTareas(especialidad);
}

export async function getHistorialEvidencias(profileId, especialidadId = null) {
  const profile = await getProfile(profileId);
  const tareas = await getHistorialTareas(profileId, especialidadId);
  return getEntregas({ tareas, profile });
}

export function calcularPromedioGlobal(notas = [], entregas = []) {
  const notaValues = notas.map((item) => item.nota);
  const entregaValues = entregas.map((item) => item.nota);
  return average([...notaValues, ...entregaValues]);
}

export function calcularProgresoGlobal({ asignacion = null, tareas = [], entregas = [], notas = [], asistenciaResumen = null }) {
  const assigned = Number(asignacion?.progreso);
  if (Number.isFinite(assigned) && assigned > 0) return clampPercent(assigned);

  const signals = [];
  if (tareas.length) signals.push((entregas.length / tareas.length) * 100);
  if (notas.length) signals.push(100);
  if (asistenciaResumen?.total) signals.push(asistenciaResumen.porcentaje);

  if (!signals.length) return 0;
  return clampPercent(signals.reduce((acc, value) => acc + value, 0) / signals.length);
}

export async function getResumenAcademico(profileId) {
  const expediente = await getExpedienteRecurso(profileId);
  return expediente.resumen;
}

export async function getExpedienteRecurso(profileId) {
  const profile = await getProfile(profileId);
  if (!profile) {
    return {
      profile: null,
      asignacion: null,
      especialidad: null,
      notas: [],
      asistencia: [],
      tareas: [],
      entregas: [],
      resumen: {
        promedio: null,
        progreso: 0,
        asistenciaPorcentaje: 0,
        tareasCompletadas: 0,
        tareasPendientes: 0,
        evidencias: 0,
      },
    };
  }

  const asignaciones = await getAsignaciones(profile);
  const asignacion = asignaciones[0] || null;
  const especialidad = await getEspecialidad(asignacion?.especialidad_id);
  const especialidadId = especialidad?.id || asignacion?.especialidad_id || null;

  const [notas, asistencia, tareas] = await Promise.all([
    getHistorialNotas(profile.id, especialidadId),
    getHistorialAsistencia(profile.id, especialidadId),
    getTareas(especialidadId),
  ]);
  const entregas = await getEntregas({ tareas, profile });
  const entregasByTarea = new Map(entregas.map((item) => [item.tarea_id, item]));
  const tareasCompletadas = tareas.filter((tarea) => entregasByTarea.has(tarea.id));
  const tareasPendientes = tareas.filter((tarea) => !entregasByTarea.has(tarea.id));
  const asistenciaTotal = asistencia.length;
  const asistenciaOk = asistencia.filter((item) => okAttendance(item.estado)).length;
  const asistenciaResumen = {
    total: asistenciaTotal,
    asistidas: asistencia.filter((item) => item.estado === "asistio").length,
    tardias: asistencia.filter((item) => item.estado === "tardia").length,
    ausentes: asistencia.filter((item) => item.estado === "ausente").length,
    justificadas: asistencia.filter((item) => item.estado === "justificada").length,
    porcentaje: asistenciaTotal ? clampPercent((asistenciaOk / asistenciaTotal) * 100) : 0,
  };
  const promedio = calcularPromedioGlobal(notas, entregas);
  const progreso = calcularProgresoGlobal({ asignacion, tareas, entregas, notas, asistenciaResumen });

  return {
    profile,
    asignacion,
    especialidad,
    notas,
    asistencia,
    tareas,
    entregas,
    tareasCompletadas,
    tareasPendientes,
    resumen: {
      promedio,
      progreso,
      asistenciaPorcentaje: asistenciaResumen.porcentaje,
      asistencia: asistenciaResumen,
      tareasCompletadas: tareasCompletadas.length,
      tareasPendientes: tareasPendientes.length,
      tareasTotal: tareas.length,
      evidencias: entregas.length,
      aprobadas: entregas.filter((item) => item.estado === "aprobada").length,
      rechazadas: entregas.filter((item) => item.estado === "rechazada").length,
    },
  };
}

export async function getReportesAcademicosData() {
  const recursos = await getRecursos();
  const expedientes = await Promise.all(
    recursos.map((recurso) =>
      getExpedienteRecurso(recurso.id).catch((error) => {
        console.warn("[Campus UCI] No se pudo cargar expediente para reporte:", recurso.id, error);
        return {
          profile: recurso,
          especialidad: { id: recurso.especialidad_id, nombre: recurso.especialidad_nombre },
          resumen: {
            promedio: null,
            progreso: Number(recurso.progreso || 0),
            asistenciaPorcentaje: 0,
            tareasCompletadas: 0,
            tareasPendientes: 0,
            tareasTotal: 0,
            evidencias: 0,
          },
          notas: [],
          asistencia: [],
          tareas: [],
          entregas: [],
        };
      }),
    ),
  );

  const ranking = expedientes
    .map((item) => ({
      profile: item.profile,
      especialidad: item.especialidad,
      promedio: item.resumen.promedio,
      progreso: item.resumen.progreso,
      asistencia: item.resumen.asistenciaPorcentaje,
      tareasPendientes: item.resumen.tareasPendientes,
      evidencias: item.resumen.evidencias,
    }))
    .sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1) || b.progreso - a.progreso);

  const byEspecialidad = new Map();
  expedientes.forEach((item) => {
    const key = item.especialidad?.id || "sin-especialidad";
    const current = byEspecialidad.get(key) || {
      id: key,
      nombre: item.especialidad?.nombre || "Sin especialidad",
      recursos: 0,
      promedios: [],
      asistencias: [],
      progresos: [],
    };
    current.recursos += 1;
    if (item.resumen.promedio !== null) current.promedios.push(item.resumen.promedio);
    current.asistencias.push(item.resumen.asistenciaPorcentaje);
    current.progresos.push(item.resumen.progreso);
    byEspecialidad.set(key, current);
  });

  const especialidades = [...byEspecialidad.values()].map((item) => ({
    ...item,
    promedio: average(item.promedios),
    asistencia: average(item.asistencias) ?? 0,
    progreso: average(item.progresos) ?? 0,
  }));

  const recursosCriticos = ranking.filter(
    (item) =>
      item.progreso < 60 ||
      (item.promedio !== null && item.promedio < 7) ||
      item.asistencia < 80 ||
      item.tareasPendientes > 0,
  );

  return {
    expedientes,
    ranking,
    especialidades,
    recursosCriticos,
    resumen: {
      recursos: expedientes.length,
      promedioGeneral: average(ranking.map((item) => item.promedio)),
      asistenciaGeneral: average(ranking.map((item) => item.asistencia)) ?? 0,
      progresoGeneral: average(ranking.map((item) => item.progreso)) ?? 0,
      criticos: recursosCriticos.length,
    },
  };
}
