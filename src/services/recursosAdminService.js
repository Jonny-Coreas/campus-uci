import { supabase } from "../supabaseClient";

const PROFILE_SELECT = "id, user_id, nombre, correo, rol, servicio, area, cum, activo, avatar_url";
const ASSIGNMENT_SELECT = "id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at";

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function coerceAcademicRole(value) {
  const role = normalizeRole(value);
  if (role === "docente") return "docente";
  if (role === "admin") return "admin";
  if (role === "jefe") return "jefe";
  if (["recurso", "estudiante", "personal", "recurso / estudiante", "recurso/estudiante"].includes(role)) {
    return "recurso";
  }
  return "recurso";
}

function isAcademicResource(profile) {
  const role = normalizeRole(profile?.rol || "recurso");
  return !["admin", "jefe", "supervisor"].includes(role);
}

function sanitizeFileName(name = "avatar") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

async function uploadAvatarForUser({ userId, file }) {
  if (!file) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxBytes = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formato de avatar no permitido. Usá JPG, PNG o WEBP.");
  }

  if (file.size > maxBytes) {
    throw new Error("El avatar no puede superar 5MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${userId}-${Date.now()}-${sanitizeFileName(file.name)}.${extension}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data?.publicUrl || null;
}

export async function getRecursos() {
  const [{ data: profiles, error: profilesError }, { data: asignaciones, error: asignacionesError }, { data: especialidades, error: especialidadesError }] =
    await Promise.all([
      supabase.from("profiles").select(PROFILE_SELECT).order("nombre", { ascending: true }),
      supabase.from("usuario_especialidad").select(ASSIGNMENT_SELECT).order("created_at", { ascending: false }),
      supabase.from("especialidades").select("id, nombre, descripcion, activa").order("nombre", { ascending: true }),
    ]);

  if (profilesError) throw profilesError;
  if (asignacionesError) throw asignacionesError;
  if (especialidadesError) throw especialidadesError;

  const especialidadesById = new Map((especialidades || []).map((item) => [item.id, item]));

  return (profiles || [])
    .filter(isAcademicResource)
    .map((profile) => {
      const asignacion = (asignaciones || []).find(
        (item) =>
          item.profile_id === profile.id ||
          item.user_id === profile.user_id ||
          item.user_id === profile.id,
      );
      const especialidad = especialidadesById.get(asignacion?.especialidad_id);

      return {
        ...profile,
        asignacion_id: asignacion?.id || null,
        especialidad_id: asignacion?.especialidad_id || "",
        especialidad_nombre: especialidad?.nombre || "Sin especialidad",
        progreso: Number(asignacion?.progreso || 0),
        estado_academico: asignacion?.estado || "sin_asignar",
        asignacion_activa: asignacion?.activo !== false,
      };
    });
}

export async function assignEspecialidad({ profileId, userId, especialidadId, progreso = 0 }) {
  if (!profileId) throw new Error("Falta profile_id para asignar especialidad.");
  if (!especialidadId) throw new Error("Seleccioná una especialidad.");

  const { data: existente, error: checkError } = await supabase
    .from("usuario_especialidad")
    .select("id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (checkError) throw checkError;

  const payload = {
    profile_id: profileId,
    user_id: userId || null,
    especialidad_id: especialidadId,
    progreso: Number(progreso) || 0,
    activo: true,
    estado: "en_proceso",
  };

  if (existente?.[0]?.id) {
    const { error } = await supabase
      .from("usuario_especialidad")
      .update(payload)
      .eq("id", existente[0].id);

    if (error) throw error;
    return existente[0].id;
  }

  const { data, error } = await supabase
    .from("usuario_especialidad")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function createUserWithEdgeFunction(payload) {
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: payload,
  });

  if (error) {
    console.error("[Campus UCI] admin-create-user Edge Function error completo:", error);
    console.error("[Campus UCI] error context:", error.context);

    let realMessage = error.message || "Error desconocido al crear usuario";

    try {
      if (error.context && typeof error.context.json === "function") {
        const json = await error.context.json();
        realMessage = json?.error || JSON.stringify(json);
      }
    } catch (e) {
      console.error("[Campus UCI] No se pudo leer el body del error:", e);
    }

    throw new Error(realMessage);
  }

  if (data?.error) {
    console.error("[Campus UCI] admin-create-user respondió error:", data);
    throw new Error(data.error);
  }

  return data;
}

export async function createRecurso(form) {
  const email = form.correo?.trim().toLowerCase();
  const password = form.password?.trim();
  const role = coerceAcademicRole(form.rol);

  if (!form.nombre?.trim()) throw new Error("El nombre es obligatorio.");
  if (!email) throw new Error("El correo es obligatorio.");
  if (!password || password.length < 6) {
    throw new Error("La contraseña temporal debe tener al menos 6 caracteres.");
  }

  const result = await createUserWithEdgeFunction({
    email,
    password,
    nombre: form.nombre.trim(),
    rol: role,
    cum: form.cum?.trim().toUpperCase() || null,
    servicio: form.servicio?.trim() || "UCI",
    area: form.area?.trim() || null,
    especialidad_id: form.especialidadId || null,
    progreso: Number(form.progreso || 0) || 0,
  });

  const profile = result?.profile;
  const userId = result?.user?.id || profile?.user_id;
  if (!profile?.id || !userId) throw new Error("La Edge Function no devolvió profile/user válido.");

  if (form.avatarFile) {
    const avatarUrl = await uploadAvatarForUser({ userId, file: form.avatarFile });
    const { data: updatedProfile, error: avatarError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id)
      .select(PROFILE_SELECT)
      .single();

    if (avatarError) {
      console.warn("[Campus UCI] Usuario creado, pero no se pudo guardar avatar_url:", avatarError);
      return profile;
    }
    return updatedProfile;
  }

  return profile;
}

export async function updateRecurso(id, form) {
  if (!id) throw new Error("Falta id del recurso.");

  const payload = {
    nombre: form.nombre?.trim(),
    correo: form.correo?.trim().toLowerCase(),
    rol: coerceAcademicRole(form.rol),
    servicio: form.servicio?.trim() || null,
    area: form.area?.trim() || null,
    cum: form.cum?.trim().toUpperCase() || null,
    activo: form.activo !== false,
  };

  if (form.avatarFile && form.user_id) {
    payload.avatar_url = await uploadAvatarForUser({ userId: form.user_id, file: form.avatarFile });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw error;

  if (form.especialidadId) {
    await assignEspecialidad({
      profileId: data.id,
      userId: data.user_id,
      especialidadId: form.especialidadId,
      progreso: form.progreso || 0,
    });
  }

  return data;
}

export async function toggleActivo(id, activo) {
  if (!id) throw new Error("Falta id del recurso.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ activo: Boolean(activo) })
    .eq("id", id)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw error;

  const assignmentIds = [data.id, data.user_id].filter(Boolean);
  if (assignmentIds.length) {
    const { error: assignmentError } = await supabase
      .from("usuario_especialidad")
      .update({ activo: Boolean(activo) })
      .or(`profile_id.eq.${data.id},user_id.in.(${assignmentIds.join(",")})`);

    if (assignmentError) {
      console.warn("[Campus UCI] No se pudo sincronizar activo en usuario_especialidad:", assignmentError);
    }
  }

  return data;
}

export async function deleteRecursoDefinitivo(resource) {
  const profileId = resource?.id;
  if (!profileId) throw new Error("Falta id del recurso para eliminar.");

  const userIds = [...new Set([resource?.user_id, profileId].filter(Boolean))];

  const assignmentFilters = [`profile_id.eq.${profileId}`];
  if (userIds.length) assignmentFilters.push(`user_id.in.(${userIds.join(",")})`);

  const { error: assignmentError } = await supabase
    .from("usuario_especialidad")
    .delete()
    .or(assignmentFilters.join(","));

  if (assignmentError) throw assignmentError;

  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (profileError) {
    const message = String(profileError.message || "");
    if (message.toLowerCase().includes("foreign key")) {
      throw new Error(
        "No se pudo eliminar el perfil porque tiene datos académicos relacionados. Desactivá el recurso para conservar historial.",
      );
    }
    throw profileError;
  }

  return {
    deletedProfileId: profileId,
    authUserDeleted: false,
  };
}
