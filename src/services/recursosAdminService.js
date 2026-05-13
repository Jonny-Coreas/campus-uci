import { createClient } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://tiakdzfaeqsutyfutkrb.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_r1D15BZrKDf6celB66CXKw_0oliHU2s";

const PROFILE_SELECT = "id, user_id, nombre, correo, rol, servicio, area, cum, activo, avatar_url";
const ASSIGNMENT_SELECT = "id, profile_id, user_id, especialidad_id, progreso, activo, estado, created_at";

function authClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function isAcademicResource(profile) {
  const role = normalizeRole(profile?.rol || "personal");
  return !["admin", "jefe", "docente", "supervisor"].includes(role);
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

export async function createRecurso(form) {
  const email = form.correo?.trim().toLowerCase();
  const password = form.password?.trim();

  if (!form.nombre?.trim()) throw new Error("El nombre es obligatorio.");
  if (!email) throw new Error("El correo es obligatorio.");
  if (!password || password.length < 6) {
    throw new Error("La contraseña temporal debe tener al menos 6 caracteres.");
  }

  const { data: authData, error: authError } = await authClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: form.nombre.trim(),
        role: "personal",
      },
    },
  });

  if (authError) throw authError;
  const authUser = authData?.user;
  if (!authUser?.id) {
    throw new Error("Supabase Auth no devolvió el usuario creado.");
  }

  const avatarUrl = await uploadAvatarForUser({ userId: authUser.id, file: form.avatarFile });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: authUser.id,
      nombre: form.nombre.trim(),
      correo: email,
      rol: "personal",
      servicio: form.servicio?.trim() || "UCI",
      area: form.area?.trim() || null,
      cum: form.cum?.trim().toUpperCase() || null,
      activo: form.activo !== false,
      avatar_url: avatarUrl,
    })
    .select(PROFILE_SELECT)
    .single();

  if (profileError) throw profileError;

  if (form.especialidadId) {
    await assignEspecialidad({
      profileId: profile.id,
      userId: profile.user_id,
      especialidadId: form.especialidadId,
      progreso: form.progreso || 0,
    });
  }

  return profile;
}

export async function updateRecurso(id, form) {
  if (!id) throw new Error("Falta id del recurso.");

  const payload = {
    nombre: form.nombre?.trim(),
    correo: form.correo?.trim().toLowerCase(),
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
  return data;
}
