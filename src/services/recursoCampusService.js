import { supabase } from "../supabaseClient";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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
  const userId = profile?.user_id || session?.user?.id || null;
  const candidates = [];

  if (profileId) {
    candidates.push(
      supabase
        .from("usuario_especialidad")
        .select("id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at")
        .eq("profile_id", profileId)
        .neq("activo", false)
        .order("created_at", { ascending: false })
        .limit(1),
    );
  }

  if (userId) {
    candidates.push(
      supabase
        .from("usuario_especialidad")
        .select("id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at")
        .eq("user_id", userId)
        .neq("activo", false)
        .order("created_at", { ascending: false })
        .limit(1),
    );
  }

  if (profileId) {
    candidates.push(
      supabase
        .from("usuario_especialidad")
        .select("id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at")
        .eq("user_id", profileId)
        .neq("activo", false)
        .order("created_at", { ascending: false })
        .limit(1),
    );
  }

  for (const query of candidates) {
    const { data, error } = await query;
    if (!error && data?.[0]) return data[0];
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
  return data || [];
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

  const [clases, tareas, notas] = await Promise.all([
    getClases(especialidadId),
    getTareas(especialidadId),
    getNotas({ especialidadId, profile }),
  ]);

  const entregas = await getEntregas({ tareas, profile, session });
  const entregasByTarea = new Map(entregas.map((item) => [item.tarea_id, item]));
  const tareasPendientes = tareas.filter((tarea) => !entregasByTarea.has(tarea.id));
  const tareasEntregadas = tareas.filter((tarea) => entregasByTarea.has(tarea.id));
  const aprobadas = entregas.filter((item) => item.estado === "aprobada");
  const rechazadas = entregas.filter((item) => item.estado === "rechazada");
  const promedio = calculatePromedio(notas);
  const progreso = calculateProgress({ asignacion, tareas, entregas, promedio });

  return {
    asignacion,
    especialidad,
    clases,
    tareas,
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
