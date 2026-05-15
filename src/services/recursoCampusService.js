import { supabase } from "../supabaseClient";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isUpcomingClass(clase) {
  const estado = String(clase?.estado || "programada").toLowerCase();
  if (["realizada", "finalizada", "cancelada"].includes(estado)) return false;
  if (!clase?.fecha) return false;

  const today = todayDate();
  if (String(clase.fecha).slice(0, 10) > today) return true;
  if (String(clase.fecha).slice(0, 10) < today) return false;

  if (!clase.hora_fin) return true;
  return String(clase.hora_fin).slice(0, 5) >= new Date().toTimeString().slice(0, 5);
}

function recentDate(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function uniqueById(items) {
  const map = new Map();
  items.filter(Boolean).forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
}

async function getAsignacionActiva({ profile, session }) {
  const profileId = profile?.id || null;
  const authUserId = session?.user?.id || null;
  const userIds = [...new Set([profile?.user_id, authUserId, profileId].filter(Boolean))];
  const candidates = [];

  if (profileId) {
    candidates.push(
      supabase
        .from("usuario_especialidad")
        .select("id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1),
    );
  }

  if (userIds.length) {
    candidates.push(
      supabase
        .from("usuario_especialidad")
        .select("id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(3),
    );
  }

  for (const query of candidates) {
    const { data, error } = await query;
    const activeAssignment = (data || []).find((item) => item.activo !== false && item.especialidad_id);
    if (!error && activeAssignment) {
      console.info("[Campus UCI] Asignación recurso resuelta:", {
        assignmentId: activeAssignment.id,
        profileId,
        authUserId,
        especialidadId: activeAssignment.especialidad_id,
      });
      return activeAssignment;
    }
    if (error) {
      console.warn("[Campus UCI] No se pudo consultar asignación del recurso:", error);
    }
  }

  return null;
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

async function getClases(especialidadId) {
  if (!especialidadId) return [];

  const { data, error } = await supabase
    .from("especialidad_clases_virtuales")
    .select("*")
    .eq("especialidad_id", especialidadId)
    .gte("fecha", todayDate())
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) throw error;
  return (data || []).filter(isUpcomingClass);
}

async function getTareas(especialidadId) {
  if (!especialidadId) return [];

  const { data, error } = await supabase
    .from("especialidad_tareas")
    .select("*")
    .eq("especialidad_id", especialidadId)
    .order("fecha_limite", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getAsignaturas(especialidadId) {
  if (!especialidadId) return [];

  const { data, error } = await supabase
    .from("especialidad_asignaturas")
    .select("id, especialidad_id, titulo, descripcion, imagen_url, orden, publicado, created_at")
    .eq("especialidad_id", especialidadId)
    .eq("publicado", true)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar asignaturas del recurso:", error);
    return [];
  }

  return data || [];
}

async function getSecciones(asignaturas) {
  const asignaturaIds = asignaturas.map((item) => item.id).filter(Boolean);
  if (!asignaturaIds.length) return [];

  const { data, error } = await supabase
    .from("especialidad_asignatura_secciones")
    .select("id, asignatura_id, titulo, tipo, descripcion, orden, publicado")
    .in("asignatura_id", asignaturaIds)
    .eq("publicado", true)
    .order("orden", { ascending: true });

  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar secciones del recurso:", error);
    return [];
  }

  return data || [];
}

async function getAvisos(especialidadId, asignaturas, secciones = []) {
  if (!especialidadId || !asignaturas.length) return [];
  const asignaturaIds = asignaturas.map((item) => item.id).filter(Boolean);
  const asignaturasById = new Map(asignaturas.map((item) => [item.id, item]));
  const seccionesById = new Map(secciones.map((item) => [item.id, item]));

  const { data, error } = await supabase
    .from("especialidad_avisos")
    .select("*")
    .in("asignatura_id", asignaturaIds)
    .eq("publicado", true)
    .gte("created_at", recentDate(45))
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar avisos del recurso:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    asignatura_titulo: asignaturasById.get(item.asignatura_id)?.titulo || "Asignatura",
    seccion_titulo: seccionesById.get(item.seccion_id)?.titulo || "",
  }));
}

async function getMateriales(especialidadId, asignaturas, secciones = []) {
  if (!especialidadId || !asignaturas.length) return [];
  const asignaturaIds = asignaturas.map((item) => item.id).filter(Boolean);
  const asignaturasById = new Map(asignaturas.map((item) => [item.id, item]));
  const seccionesById = new Map(secciones.map((item) => [item.id, item]));

  const { data, error } = await supabase
    .from("especialidad_materiales")
    .select("*")
    .in("asignatura_id", asignaturaIds)
    .eq("publicado", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar materiales del recurso:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    asignatura_titulo: asignaturasById.get(item.asignatura_id)?.titulo || "Asignatura",
    seccion_titulo: seccionesById.get(item.seccion_id)?.titulo || "",
  }));
}

async function getEntregas({ tareas, profile, session }) {
  if (!tareas.length) return [];

  const tareaIds = tareas.map((item) => item.id).filter(Boolean);
  const profileId = profile?.id || null;
  const userId = profile?.user_id || session?.user?.id || null;
  const queries = [];

  if (profileId) {
    queries.push(
      supabase
        .from("especialidad_tarea_entregas")
        .select("*")
        .in("tarea_id", tareaIds)
        .eq("profile_id", profileId),
    );
  }

  if (userId) {
    queries.push(
      supabase
        .from("especialidad_tarea_entregas")
        .select("*")
        .in("tarea_id", tareaIds)
        .eq("user_id", userId),
    );
  }

  const results = await Promise.all(
    queries.map((query) =>
      query.then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
    ),
  );

  return uniqueById(results.flat());
}

async function getNotas({ especialidadId, profile }) {
  const recursoId = profile?.id || null;
  if (!especialidadId || !recursoId) return [];

  const { data, error } = await supabase
    .from("especialidad_notas")
    .select("*")
    .eq("especialidad_id", especialidadId)
    .eq("recurso_id", recursoId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar notas del recurso:", error);
    return [];
  }

  return data || [];
}

function calculatePromedio(notas) {
  const values = notas.map((item) => Number(item.nota)).filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2));
}

function calculateProgress({ asignacion, tareas, entregas, promedio }) {
  const assignedProgress = Number(asignacion?.progreso);
  if (Number.isFinite(assignedProgress) && assignedProgress > 0) {
    return Math.max(0, Math.min(100, Math.round(assignedProgress)));
  }

  const signals = [];

  if (tareas.length) {
    signals.push((entregas.length / tareas.length) * 100);
  }

  if (promedio !== null) {
    signals.push(Math.max(0, Math.min(100, promedio * 10)));
  }

  if (!signals.length) return 0;
  return Math.round(signals.reduce((acc, value) => acc + value, 0) / signals.length);
}

export async function getMiCampusData({ profile, session }) {
  const asignacion = await getAsignacionActiva({ profile, session });
  const especialidad = await getEspecialidad(asignacion?.especialidad_id);
  const especialidadId = especialidad?.id || asignacion?.especialidad_id || null;

  if (!especialidadId) {
    console.warn("[Campus UCI] Recurso sin especialidad activa resuelta:", {
      profileId: profile?.id,
      profileUserId: profile?.user_id,
      authUserId: session?.user?.id,
    });
  }

  const [clasesBase, tareas, notas, asignaturas] = await Promise.all([
    getClases(especialidadId),
    getTareas(especialidadId),
    getNotas({ especialidadId, profile }),
    getAsignaturas(especialidadId),
  ]);

  const secciones = await getSecciones(asignaturas);
  const asignaturasById = new Map(asignaturas.map((item) => [item.id, item]));
  const seccionesById = new Map(secciones.map((item) => [item.id, item]));
  const clases = clasesBase.map((clase) => ({
    ...clase,
    asignatura_titulo: asignaturasById.get(clase.asignatura_id)?.titulo || "",
    seccion_titulo: seccionesById.get(clase.seccion_id)?.titulo || "",
  }));

  const [avisos, materiales] = await Promise.all([
    getAvisos(especialidadId, asignaturas, secciones),
    getMateriales(especialidadId, asignaturas, secciones),
  ]);
  const entregas = await getEntregas({ tareas, profile, session });
  const entregasByTarea = new Map(entregas.map((item) => [item.tarea_id, item]));
  const tareasAbiertas = tareas.filter((tarea) => (tarea.estado || "abierta") === "abierta");
  const tareasPendientes = tareasAbiertas.filter((tarea) => !entregasByTarea.has(tarea.id));
  const tareasEntregadas = tareas.filter((tarea) => entregasByTarea.has(tarea.id));
  const aprobadas = entregas.filter((item) => item.estado === "aprobada");
  const rechazadas = entregas.filter((item) => item.estado === "rechazada");
  const promedio = calculatePromedio(notas);
  const progreso = calculateProgress({ asignacion, tareas, entregas, promedio });
  const novedades = {
    tareasPendientes: tareasPendientes.slice(0, 5),
    proximasClases: clases.slice(0, 5),
    avisosRecientes: avisos.slice(0, 5),
    materialesRecientes: materiales.slice(0, 5),
  };

  return {
    asignacion,
    especialidad,
    clases,
    tareas,
    asignaturas,
    secciones,
    avisos,
    materiales,
    novedades,
    entregas,
    entregasByTarea,
    notas,
    stats: {
      pendientes: tareasPendientes.length,
      entregadas: tareasEntregadas.length,
      aprobadas: aprobadas.length,
      rechazadas: rechazadas.length,
      promedio,
      progreso,
    },
  };
}
