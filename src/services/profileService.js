import { supabase } from "../supabaseClient";

export const PROFILE_SELECT = "id, user_id, nombre, correo, rol, servicio, area, cum, activo, avatar_url";
export const PROFILE_SELECT_LEGACY = "id, user_id, nombre, correo, rol, servicio, area, cum, activo";

function isMissingAvatarColumn(error) {
  return error?.message?.includes("avatar_url") || error?.details?.includes("avatar_url");
}

function isMissingAvatarBucket(error) {
  const message = `${error?.message || ""} ${error?.error || ""} ${error?.details || ""}`.toLowerCase();
  return (
    message.includes("bucket not found") ||
    message.includes("bucket") && message.includes("not found") ||
    message.includes("not_found")
  );
}

export function buildFallbackProfile(session) {
  return {
    nombre: session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "Usuario Campus UCI",
    correo: session?.user?.email || "",
    rol: "personal",
    cum: "Sin CUM",
    activo: true,
  };
}

export async function getProfileByUserId(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingAvatarColumn(error)) {
    console.warn("profiles.avatar_url no existe todavía. Usando select legacy:", error);
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_LEGACY)
      .eq("user_id", userId)
      .maybeSingle();

    if (legacyError) throw legacyError;
    return legacyData;
  }

  if (error) throw error;
  return data;
}

export async function getActiveProfilesWithUser() {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .neq("activo", false)
    .order("nombre", { ascending: true });

  if (isMissingAvatarColumn(error)) {
    console.warn("profiles.avatar_url no existe todavía. Usando select legacy:", error);
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_LEGACY)
      .neq("activo", false)
      .order("nombre", { ascending: true });

    if (legacyError) throw legacyError;
    return (legacyData || []).filter((item) => item.user_id);
  }

  if (error) throw error;
  return (data || []).filter((item) => item.user_id);
}

export async function getProfilesByUserIds(userIds) {
  if (!userIds.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .in("user_id", userIds);

  if (isMissingAvatarColumn(error)) {
    console.warn("profiles.avatar_url no existe todavía. Usando select legacy:", error);
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_LEGACY)
      .in("user_id", userIds);

    if (legacyError) throw legacyError;
    return legacyData || [];
  }

  if (error) throw error;
  return data || [];
}

export async function getProfilesByIds(profileIds) {
  if (!profileIds.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .in("id", profileIds);

  if (isMissingAvatarColumn(error)) {
    console.warn("profiles.avatar_url no existe todavía. Usando select legacy:", error);
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_LEGACY)
      .in("id", profileIds);

    if (legacyError) throw legacyError;
    return legacyData || [];
  }

  if (error) throw error;
  return data || [];
}

export async function createProfile(payload) {
  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfileAvatar({ userId, avatarUrl }) {
  if (!userId) throw new Error("No se encontró el usuario autenticado para actualizar avatar_url.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function uploadProfileAvatar({ userId, file }) {
  if (!userId) throw new Error("No se encontró el usuario autenticado.");

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxBytes = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formato no permitido. Usa JPG, PNG o WEBP.");
  }

  if (file.size > maxBytes) {
    throw new Error("La imagen supera el máximo permitido de 5MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${userId}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (isMissingAvatarBucket(uploadError)) {
    console.error("Bucket avatars no existe o no está disponible:", uploadError);
    throw new Error('No se encontró el bucket público "avatars" en Supabase Storage.');
  }

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = publicData?.publicUrl;
  if (!avatarUrl) throw new Error("No se pudo obtener la URL pública del avatar.");

  return updateProfileAvatar({ userId, avatarUrl });
}

export async function getCumValuesByPrefix(prefix) {
  const { data, error } = await supabase
    .from("profiles")
    .select("cum")
    .ilike("cum", `${prefix}-%`);

  if (error) throw error;
  return data || [];
}
