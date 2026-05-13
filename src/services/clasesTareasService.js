import { supabase } from "../supabaseClient";

const CLASES_TABLE = "especialidad_clases_virtuales";
const TAREAS_TABLE = "especialidad_tareas";
const ENTREGAS_TABLE = "especialidad_tarea_entregas";
const ENTREGAS_BUCKET = "campus-entregas";

function requireEspecialidadId(especialidadId) {
  if (!especialidadId) {
    throw new Error("Falta especialidad_id para consultar el módulo académico.");
  }
}

export async function getClasesVirtualesByEspecialidad(especialidadId) {
  requireEspecialidadId(especialidadId);

  const { data, error } = await supabase
    .from(CLASES_TABLE)
    .select("*")
    .eq("especialidad_id", especialidadId)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createClaseVirtual(especialidadId, form) {
  requireEspecialidadId(especialidadId);

  const payload = buildClaseVirtualPayload(especialidadId, form);

  const { data, error } = await supabase
    .from(CLASES_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

function buildClaseVirtualPayload(especialidadId, form) {
  return {
    especialidad_id: especialidadId,
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    docente: form.docente?.trim() || null,
    fecha: form.fecha,
    hora_inicio: form.hora_inicio,
    hora_fin: form.hora_fin,
    enlace_virtual: form.enlace_virtual?.trim() || null,
    estado: form.estado || "programada",
  };
}

export async function updateClaseVirtual(id, form) {
  if (!id) throw new Error("Falta id de la clase virtual para actualizar.");

  const payload = {
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    docente: form.docente?.trim() || null,
    fecha: form.fecha,
    hora_inicio: form.hora_inicio,
    hora_fin: form.hora_fin,
    enlace_virtual: form.enlace_virtual?.trim() || null,
    estado: form.estado || "programada",
  };

  const { data, error } = await supabase
    .from(CLASES_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClaseVirtual(id) {
  if (!id) throw new Error("Falta id de la clase virtual para eliminar.");

  const { error } = await supabase
    .from(CLASES_TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getTareasByEspecialidad(especialidadId) {
  requireEspecialidadId(especialidadId);

  const { data, error } = await supabase
    .from(TAREAS_TABLE)
    .select("*")
    .eq("especialidad_id", especialidadId)
    .order("fecha_limite", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTarea(especialidadId, form) {
  requireEspecialidadId(especialidadId);

  const payload = buildTareaPayload(especialidadId, form);

  const { data, error } = await supabase
    .from(TAREAS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

function buildTareaPayload(especialidadId, form) {
  return {
    especialidad_id: especialidadId,
    titulo: form.titulo?.trim(),
    instrucciones: form.instrucciones?.trim() || null,
    fecha_publicacion: form.fecha_publicacion,
    fecha_limite: form.fecha_limite,
    puntaje: Number(form.puntaje) || 0,
    estado: form.estado || "abierta",
  };
}

export async function updateTarea(id, form) {
  if (!id) throw new Error("Falta id de la tarea para actualizar.");

  const payload = {
    titulo: form.titulo?.trim(),
    instrucciones: form.instrucciones?.trim() || null,
    fecha_publicacion: form.fecha_publicacion,
    fecha_limite: form.fecha_limite,
    puntaje: Number(form.puntaje) || 0,
    estado: form.estado || "abierta",
  };

  const { data, error } = await supabase
    .from(TAREAS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTarea(id) {
  if (!id) throw new Error("Falta id de la tarea para eliminar.");

  const { error } = await supabase
    .from(TAREAS_TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getEntregasByTarea(tareaId) {
  if (!tareaId) throw new Error("Falta tarea_id para cargar entregas.");

  const { data, error } = await supabase
    .from(ENTREGAS_TABLE)
    .select(`
      *,
      profiles:profile_id (
        id,
        nombre,
        correo,
        cum,
        servicio,
        area,
        avatar_url
      )
    `)
    .eq("tarea_id", tareaId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getEntregaByTareaAndRecurso({ tareaId, profileId, userId }) {
  if (!tareaId) throw new Error("Falta tarea_id para cargar la entrega.");
  if (!profileId && !userId) throw new Error("Falta recurso para cargar la entrega.");

  let query = supabase
    .from(ENTREGAS_TABLE)
    .select("*")
    .eq("tarea_id", tareaId)
    .order("created_at", { ascending: false })
    .limit(1);

  query = profileId ? query.eq("profile_id", profileId) : query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) throw error;
  return data?.[0] || null;
}

function sanitizeFileName(name = "evidencia") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export async function uploadTareaEvidencia({ tareaId, recursoId, file }) {
  if (!tareaId) throw new Error("Falta tarea_id para subir evidencia.");
  if (!recursoId) throw new Error("Falta recurso para subir evidencia.");
  if (!file) throw new Error("Seleccioná un archivo para subir.");

  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("El archivo no puede superar 20MB.");
  }

  const filePath = `tareas/${tareaId}/${recursoId}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(ENTREGAS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    const message = String(uploadError.message || "").toLowerCase();
    if (message.includes("bucket") && message.includes("not found")) {
      throw new Error('No se encontró el bucket "campus-entregas" en Supabase Storage.');
    }
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(ENTREGAS_BUCKET)
    .getPublicUrl(filePath);

  return {
    archivo_url: data?.publicUrl || "",
    archivo_nombre: file.name,
    archivo_tipo: file.type || "archivo",
  };
}

export async function submitEntregaTarea({
  tareaId,
  profileId,
  userId,
  comentario,
  file,
}) {
  if (!tareaId) throw new Error("Falta tarea_id para registrar la entrega.");
  if (!profileId && !userId) throw new Error("No se encontró el recurso para registrar la entrega.");

  const recursoId = profileId || userId;
  const existing = await getEntregaByTareaAndRecurso({ tareaId, profileId, userId });
  const filePayload = file
    ? await uploadTareaEvidencia({ tareaId, recursoId, file })
    : {};

  const payload = {
    tarea_id: tareaId,
    profile_id: profileId || null,
    user_id: userId || null,
    comentario: comentario?.trim() || null,
    estado: "entregada",
    fecha_entrega: new Date().toISOString(),
    ...filePayload,
  };

  const query = existing?.id
    ? supabase.from(ENTREGAS_TABLE).update(payload).eq("id", existing.id)
    : supabase.from(ENTREGAS_TABLE).insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) throw error;
  return data;
}

export async function reviewEntregaTarea(id, form) {
  if (!id) throw new Error("Falta id de entrega para revisar.");

  const payload = {
    estado: form.estado || "revisada",
    nota: form.nota === "" || form.nota === null || form.nota === undefined
      ? null
      : Number(form.nota),
    retroalimentacion: form.retroalimentacion?.trim() || null,
  };

  const { data, error } = await supabase
    .from(ENTREGAS_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEntregaTarea(id) {
  if (!id) throw new Error("Falta id de entrega para eliminar.");

  const { error } = await supabase
    .from(ENTREGAS_TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}
