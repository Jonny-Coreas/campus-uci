import { supabase } from "../supabaseClient";

const RESPUESTAS_TABLE = "especialidad_foro_respuestas";

export async function getForoRespuestas(foroId) {
  if (!foroId) return [];

  const { data, error } = await supabase
    .from(RESPUESTAS_TABLE)
    .select(`
      *,
      profiles:profile_id (
        id,
        nombre,
        correo,
        rol,
        avatar_url
      )
    `)
    .eq("foro_id", foroId)
    .eq("activo", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[Campus UCI] No se pudieron cargar respuestas del foro:", error);
    return [];
  }

  return data || [];
}

export async function createForoRespuesta({ foroId, profileId, mensaje }) {
  if (!foroId) throw new Error("Falta foro_id.");
  if (!profileId) throw new Error("Falta profile_id.");
  if (!mensaje?.trim()) throw new Error("Escribí un comentario.");

  const { data, error } = await supabase
    .from(RESPUESTAS_TABLE)
    .insert({
      foro_id: foroId,
      profile_id: profileId,
      mensaje: mensaje.trim(),
      activo: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
