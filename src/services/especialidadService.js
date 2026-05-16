import { supabase } from "../supabaseClient";
import { getProfilesByIds, getProfilesByUserIds } from "./profileService";
import { normalizeSpecialtyRecords } from "../utils/especialidadesCatalog";

const ASIGNACIONES_TABLE = "usuario_especialidad";
const ASSIGNMENT_SELECTS = [
  "id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at",
  "id, profile_id, especialidad_id, progreso, activo, estado, created_at",
  "id, profile_id, user_id, especialidad_id, progreso, activo, created_at",
  "id, profile_id, especialidad_id, progreso, activo, created_at",
  "id, profile_id, user_id, especialidad_id, progreso, estado, created_at",
  "id, profile_id, especialidad_id, progreso, estado, created_at",
  "id, profile_id, user_id, especialidad_id, progreso, created_at",
  "id, profile_id, especialidad_id, progreso, created_at",
  "id, profile_id, user_id, especialidad_id, progreso, activo, estado",
  "id, profile_id, especialidad_id, progreso, activo, estado",
  "id, profile_id, user_id, especialidad_id, progreso, activo",
  "id, profile_id, especialidad_id, progreso, activo",
  "id, profile_id, user_id, especialidad_id, progreso, estado",
  "id, profile_id, especialidad_id, progreso, estado",
  "id, profile_id, user_id, especialidad_id, progreso",
  "id, profile_id, especialidad_id, progreso",
  "id, user_id, especialidad_id, progreso, activo, created_at",
  "id, user_id, especialidad_id, progreso, created_at",
  "id, user_id, especialidad_id, progreso, activo",
  "id, user_id, especialidad_id, progreso",
  "id, user_id, usuario_id, especialidad_id, progreso, activo, created_at",
  "id, usuario_id, especialidad_id, progreso, activo, created_at",
  "id, usuario_id, especialidad_id, progreso, created_at",
  "id, especialidad_id, progreso, created_at",
  "id, user_id, usuario_id, especialidad_id, progreso, activo",
  "id, usuario_id, especialidad_id, progreso, activo",
  "id, usuario_id, especialidad_id, progreso",
  "id, especialidad_id, progreso",
];

function logSupabaseDiagnostic(context, details = {}) {
  console.info(`[Campus UCI][Supabase] ${context}`, details);
}

function logSupabaseWarning(context, error, details = {}) {
  console.warn(`[Campus UCI][Supabase] ${context}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    ...details,
  });
}

export async function getEspecialidades() {
  const { data, error } = await supabase
    .from("especialidades")
    .select("id, nombre, descripcion, activa")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return normalizeSpecialtyRecords(data || []);
}

export async function getActiveAssignmentsByEspecialidad(especialidadId) {
  logSupabaseDiagnostic("Cargando asignaciones de especialidad", {
    table: ASIGNACIONES_TABLE,
    especialidadId,
    supportedRelations: ["profile_id -> profiles.id", "legacy user_id -> profiles.id/profiles.user_id"],
  });

  for (const select of ASSIGNMENT_SELECTS) {
    const includesActivo = select.includes("activo");
    const includesCreatedAt = select.includes("created_at");
    let query = supabase
      .from(ASIGNACIONES_TABLE)
      .select(select)
      .eq("especialidad_id", especialidadId);

    if (includesCreatedAt) {
      query = query.order("created_at", { ascending: true });
    }

    if (includesActivo) {
      query = query.eq("activo", true);
    }

    const { data, error } = await query;

    if (!error) {
      logSupabaseDiagnostic("Asignaciones cargadas correctamente", {
        table: ASIGNACIONES_TABLE,
        select,
        rows: data?.length || 0,
        filteredByActivo: includesActivo,
        orderedByCreatedAt: includesCreatedAt,
      });
      return data || [];
    }

    logSupabaseWarning("Falló consulta de asignaciones; probando fallback", error, {
      table: ASIGNACIONES_TABLE,
      select,
      filteredByActivo: includesActivo,
      orderedByCreatedAt: includesCreatedAt,
    });
  }

  logSupabaseWarning("No se pudieron cargar asignaciones; se devuelve lista vacía", null, {
    table: ASIGNACIONES_TABLE,
    especialidadId,
  });
  return [];
}

export async function upsertUserEspecialidad({ userId, especialidadId, progreso = 0 }) {
  const { data: existente, error: checkError } = await supabase
    .from("usuario_especialidad")
    .select("id")
    .eq("user_id", userId)
    .eq("especialidad_id", especialidadId)
    .maybeSingle();

  if (checkError) throw checkError;

  const payload = {
    progreso: Number(progreso) || 0,
    activo: true,
  };

  if (existente?.id) {
    const { error } = await supabase
      .from("usuario_especialidad")
      .update(payload)
      .eq("id", existente.id);

    if (error) throw error;
    return existente.id;
  }

  const { data, error } = await supabase
    .from("usuario_especialidad")
    .insert({
      user_id: userId,
      especialidad_id: especialidadId,
      ...payload,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function assignUserEspecialidad({ userId, especialidadId, progreso = 0 }) {
  const { error } = await supabase.from("usuario_especialidad").insert({
    user_id: userId,
    especialidad_id: especialidadId,
    progreso: Number(progreso) || 0,
    activo: true,
  });

  if (error) throw error;
}

export async function assignProfileEspecialidad({ usuarioId, especialidadId, progreso = 0 }) {
  logSupabaseDiagnostic("Asociando profile a especialidad", {
    table: ASIGNACIONES_TABLE,
    profileId: usuarioId,
    especialidadId,
    relation: "profile_id -> profiles.id",
  });

  const { data: existente, error: checkError } = await supabase
    .from(ASIGNACIONES_TABLE)
    .select("id")
    .eq("profile_id", usuarioId)
    .eq("especialidad_id", especialidadId)
    .maybeSingle();

  if (checkError) {
    logSupabaseWarning("Falló búsqueda de asignación por profile_id", checkError, {
      table: ASIGNACIONES_TABLE,
      profileId: usuarioId,
      especialidadId,
    });
    throw checkError;
  }

  const payload = {
    profile_id: usuarioId,
    especialidad_id: especialidadId,
    progreso: Number(progreso) || 0,
    activo: true,
    estado: "en_proceso",
  };

  console.log("[Campus UCI][Supabase] Payload usuario_especialidad", payload);

  if (existente?.id) {
    const updatePayloads = [
      payload,
      {
        profile_id: usuarioId,
        especialidad_id: especialidadId,
        progreso: Number(progreso) || 0,
        activo: true,
      },
      {
        profile_id: usuarioId,
        especialidad_id: especialidadId,
        progreso: Number(progreso) || 0,
      },
    ];

    for (const updatePayload of updatePayloads) {
      const { error } = await supabase
        .from(ASIGNACIONES_TABLE)
        .update(updatePayload)
        .eq("id", existente.id);

      if (!error) {
        logSupabaseDiagnostic("Asignación existente actualizada", {
          table: ASIGNACIONES_TABLE,
          asignacionId: existente.id,
          payload: updatePayload,
        });
        return existente.id;
      }

      logSupabaseWarning("Falló actualización de asignación existente; probando fallback", error, {
        table: ASIGNACIONES_TABLE,
        payload: updatePayload,
        asignacionId: existente.id,
      });
    }

    const finalUpdateError = new Error("No se pudo actualizar la asignación existente.");
    logSupabaseWarning("Fallaron todos los intentos de actualización de asignación", finalUpdateError, {
      table: ASIGNACIONES_TABLE,
      asignacionId: existente.id,
    });
    throw finalUpdateError;
  }

  const insertPayloads = [
    payload,
    {
      profile_id: usuarioId,
      especialidad_id: especialidadId,
      progreso: Number(progreso) || 0,
      activo: true,
    },
    {
      profile_id: usuarioId,
      especialidad_id: especialidadId,
      progreso: Number(progreso) || 0,
    },
  ];

  for (const insertPayload of insertPayloads) {
    const { data, error } = await supabase
      .from(ASIGNACIONES_TABLE)
      .insert(insertPayload)
      .select("id")
      .single();

    if (!error) {
      logSupabaseDiagnostic("Profile asociado a especialidad correctamente", {
        table: ASIGNACIONES_TABLE,
        asignacionId: data?.id || null,
        payload: insertPayload,
      });
      return data?.id || null;
    }

    logSupabaseWarning("Falló inserción de asignación; probando fallback", error, {
      table: ASIGNACIONES_TABLE,
      payload: insertPayload,
    });
  }

  const finalError = new Error("No se pudo insertar la asignación en usuario_especialidad.");
  logSupabaseWarning("Fallaron todos los intentos de asociación", finalError, {
    table: ASIGNACIONES_TABLE,
    profileId: usuarioId,
    especialidadId,
  });
  throw finalError;
}

export async function getExpedientesByEspecialidad(especialidadId) {
  try {
    const asignaciones = await getActiveAssignmentsByEspecialidad(especialidadId);
    const currentProfileIds = [...new Set(asignaciones.map((item) => item.profile_id).filter(Boolean))];
    const userIds = [...new Set(asignaciones.map((item) => item.user_id).filter(Boolean))];
    const legacyProfileIds = [...new Set(asignaciones.map((item) => item.usuario_id).filter(Boolean))];
    const profileIds = [...new Set([...currentProfileIds, ...userIds, ...legacyProfileIds])];

    logSupabaseDiagnostic("Resolviendo perfiles de expedientes", {
      table: "profiles",
      profileIds,
      userIds,
      profileRelation: "profile_id -> profiles.id",
      legacyRelation: "user_id -> profiles.user_id",
      legacyUserIdAsProfileRelation: "user_id -> profiles.id",
      legacyUsuarioIdRelation: "usuario_id -> profiles.id",
    });

    const [perfilesPorId, perfilesPorUserId] = await Promise.all([
      getProfilesByIds(profileIds).catch((error) => {
        logSupabaseWarning("Falló carga de profiles por id; continúa con fallback", error, {
          table: "profiles",
          ids: profileIds,
        });
        return [];
      }),
      getProfilesByUserIds(userIds).catch((error) => {
        logSupabaseWarning("Falló carga de profiles por user_id; continúa con fallback", error, {
          table: "profiles",
          userIds,
        });
        return [];
      }),
    ]);
    const perfilesById = new Map(perfilesPorId.map((perfil) => [perfil.id, perfil]));
    const perfilesByUserId = new Map(perfilesPorUserId.map((perfil) => [perfil.user_id, perfil]));

    const expedientes = asignaciones.map((asignacion) => {
      const perfil =
        perfilesById.get(asignacion.profile_id) ||
        perfilesById.get(asignacion.user_id) ||
        perfilesById.get(asignacion.usuario_id) ||
        perfilesByUserId.get(asignacion.user_id) ||
        {};

      return {
        id: asignacion.id,
        assignment_id: asignacion.id,
        profile_id: perfil.id || asignacion.profile_id || asignacion.user_id || asignacion.usuario_id || null,
        user_id: asignacion.user_id || null,
        usuario_id: asignacion.usuario_id || null,
        especialidad_id: asignacion.especialidad_id,
        progreso: asignacion.progreso ?? 0,
        estado: asignacion.estado || "en_proceso",
        nombre: perfil.nombre || "Sin nombre registrado",
        correo: perfil.correo || "",
        cum: perfil.cum || "Sin CUM",
        rol: perfil.rol || "",
        servicio: perfil.servicio || "",
        area: perfil.area || "",
        activo: perfil.activo !== false,
      };
    });

    logSupabaseDiagnostic("Expedientes resueltos", {
      especialidadId,
      asignaciones: asignaciones.length,
      perfilesPorProfileId: currentProfileIds.length,
      perfilesPorId: perfilesPorId.length,
      perfilesPorUserId: perfilesPorUserId.length,
      expedientes: expedientes.length,
    });

    return expedientes;
  } catch (error) {
    logSupabaseWarning("Error inesperado cargando expedientes; se devuelve lista vacía", error, {
      table: ASIGNACIONES_TABLE,
      especialidadId,
    });
    return [];
  }
}
