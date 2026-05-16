import { supabase } from "../supabaseClient";
import { normalizeSpecialtyRecord } from "../utils/especialidadesCatalog";

const ASIGNATURAS_TABLE = "especialidad_asignaturas";
const SECCIONES_TABLE = "especialidad_asignatura_secciones";
const MATERIALES_TABLE = "especialidad_materiales";
const FOROS_TABLE = "especialidad_foros";
const AVISOS_TABLE = "especialidad_avisos";
const MATERIALES_BUCKET = "campus-materiales";

function sanitizeFileName(name = "material") {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function getStoragePathFromPublicUrl(url = "") {
  if (!url || !String(url).includes(`/${MATERIALES_BUCKET}/`)) return "";
  const path = String(url).split(`/${MATERIALES_BUCKET}/`).pop() || "";
  return decodeURIComponent(path.split("?")[0] || "");
}

async function getAsignacionActiva({ profile, session }) {
  const profileId = profile?.id || null;
  const authUserId = session?.user?.id || null;
  const userIds = [...new Set([profile?.user_id, authUserId, profileId].filter(Boolean))];
  const queries = [];

  if (profileId) {
    queries.push(supabase.from("usuario_especialidad").select("*").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(3));
  }

  if (userIds.length) {
    queries.push(supabase.from("usuario_especialidad").select("*").in("user_id", userIds).order("created_at", { ascending: false }).limit(3));
  }

  for (const query of queries) {
    const { data, error } = await query;
    const activeAssignment = (data || []).find((item) => item.activo !== false && item.especialidad_id);
    if (!error && activeAssignment) return activeAssignment;
    if (error) console.warn("[Campus UCI] No se pudo consultar asignación de contenido:", error);
  }

  return null;
}

export async function getEspecialidadActivaRecurso({ profile, session }) {
  const asignacion = await getAsignacionActiva({ profile, session });
  if (!asignacion?.especialidad_id) return { asignacion: null, especialidad: null };

  const { data, error } = await supabase
    .from("especialidades")
    .select("id, nombre, descripcion, activa")
    .eq("id", asignacion.especialidad_id)
    .maybeSingle();

  if (error) throw error;
  return { asignacion, especialidad: data ? normalizeSpecialtyRecord(data) : null };
}

export async function getAsignaturasByEspecialidad(especialidadId, { onlyPublished = true } = {}) {
  if (!especialidadId) return [];

  let query = supabase
    .from(ASIGNATURAS_TABLE)
    .select("*")
    .eq("especialidad_id", especialidadId)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });

  if (onlyPublished) query = query.eq("publicado", true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAsignaturaDetalle(asignaturaId, { onlyPublished = true } = {}) {
  if (!asignaturaId) throw new Error("Falta asignatura_id.");

  const { data: asignatura, error: asignaturaError } = await supabase
    .from(ASIGNATURAS_TABLE)
    .select("*, especialidades:especialidad_id(id, nombre, descripcion)")
    .eq("id", asignaturaId)
    .maybeSingle();

  if (asignaturaError) throw asignaturaError;
  if (!asignatura) return null;

  const filterPublished = (query) => (onlyPublished ? query.eq("publicado", true) : query);

  const [seccionesRes, materialesRes, forosRes, avisosRes, tareasRes, clasesRes] = await Promise.all([
    filterPublished(supabase.from(SECCIONES_TABLE).select("*").eq("asignatura_id", asignaturaId)).order("orden", { ascending: true }),
    filterPublished(supabase.from(MATERIALES_TABLE).select("*").eq("asignatura_id", asignaturaId)).order("orden", { ascending: true }),
    filterPublished(supabase.from(FOROS_TABLE).select("*").eq("asignatura_id", asignaturaId)).order("orden", { ascending: true }),
    filterPublished(supabase.from(AVISOS_TABLE).select("*").eq("asignatura_id", asignaturaId)).order("orden", { ascending: true }),
    supabase.from("especialidad_tareas").select("*").eq("especialidad_id", asignatura.especialidad_id).order("fecha_limite", { ascending: true }),
    supabase.from("especialidad_clases_virtuales").select("*").eq("especialidad_id", asignatura.especialidad_id).order("fecha", { ascending: true }),
  ]);

  [seccionesRes, materialesRes, forosRes, avisosRes, tareasRes, clasesRes].forEach((result) => {
    if (result.error) throw result.error;
  });

  return {
    asignatura: {
      ...asignatura,
      especialidades: asignatura.especialidades
        ? normalizeSpecialtyRecord(asignatura.especialidades)
        : asignatura.especialidades,
    },
    secciones: seccionesRes.data || [],
    materiales: materialesRes.data || [],
    foros: forosRes.data || [],
    avisos: avisosRes.data || [],
    tareas: tareasRes.data || [],
    clases: clasesRes.data || [],
  };
}

export async function createAsignatura(form) {
  const payload = {
    especialidad_id: form.especialidad_id,
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    imagen_url: form.imagen_url?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
    created_by: form.created_by || null,
  };

  const { data, error } = await supabase.from(ASIGNATURAS_TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateAsignatura(id, form) {
  const payload = {
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    imagen_url: form.imagen_url?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
  };

  const { data, error } = await supabase.from(ASIGNATURAS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteAsignatura(id) {
  if (!id) throw new Error("Falta id de la asignatura para eliminar.");

  const { error } = await supabase.from(ASIGNATURAS_TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function createSeccion(form) {
  const payload = {
    asignatura_id: form.asignatura_id,
    tipo: form.tipo || "semana",
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
    created_by: form.created_by || null,
  };

  const { data, error } = await supabase.from(SECCIONES_TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateSeccion(id, form) {
  const payload = {
    tipo: form.tipo || "semana",
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
  };

  const { data, error } = await supabase.from(SECCIONES_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteSeccion(id) {
  if (!id) throw new Error("Falta id de la sección para eliminar.");

  const { error } = await supabase.from(SECCIONES_TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadMaterialFile({ especialidadId, asignaturaId, file }) {
  if (!file) return {};
  const path = `${especialidadId}/${asignaturaId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(MATERIALES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(MATERIALES_BUCKET).getPublicUrl(path);
  return {
    archivo_url: data?.publicUrl || "",
    archivo_nombre: file.name,
    archivo_tipo: file.type || "archivo",
  };
}

export async function createMaterial(form) {
  const filePayload = form.file
    ? await uploadMaterialFile({
        especialidadId: form.especialidad_id || "general",
        asignaturaId: form.asignatura_id,
        file: form.file,
      })
    : {};

  const payload = {
    asignatura_id: form.asignatura_id,
    seccion_id: form.seccion_id || null,
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    tipo: form.tipo || "documento",
    enlace_url: form.enlace_url?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
    created_by: form.created_by || null,
    ...filePayload,
  };

  const { data, error } = await supabase.from(MATERIALES_TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateMaterial(id, form) {
  const payload = {
    seccion_id: form.seccion_id || null,
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    tipo: form.tipo || "documento",
    enlace_url: form.enlace_url?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
  };

  const { data, error } = await supabase.from(MATERIALES_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteMaterial(material) {
  const id = material?.id || material;
  if (!id) throw new Error("Falta id del material para eliminar.");

  const storagePath = getStoragePathFromPublicUrl(material?.archivo_url);
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(MATERIALES_BUCKET)
      .remove([storagePath]);

    // La eliminación del registro no debe quedar bloqueada si Storage falla por permisos
    // o porque el archivo ya no existe. El error queda visible en consola para auditoría.
    if (storageError) {
      console.warn("[Campus UCI] No se pudo eliminar archivo de campus-materiales:", storageError);
    }
  }

  const { error } = await supabase.from(MATERIALES_TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function createForo(form) {
  const payload = {
    asignatura_id: form.asignatura_id,
    seccion_id: form.seccion_id || null,
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
    created_by: form.created_by || null,
  };

  const { data, error } = await supabase.from(FOROS_TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateForo(id, form) {
  const payload = {
    seccion_id: form.seccion_id || null,
    titulo: form.titulo?.trim(),
    descripcion: form.descripcion?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
  };

  const { data, error } = await supabase.from(FOROS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteForo(id) {
  if (!id) throw new Error("Falta id del foro para eliminar.");

  const { error } = await supabase.from(FOROS_TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function createAviso(form) {
  const payload = {
    asignatura_id: form.asignatura_id,
    seccion_id: form.seccion_id || null,
    titulo: form.titulo?.trim(),
    contenido: form.contenido?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
    created_by: form.created_by || null,
  };

  const { data, error } = await supabase.from(AVISOS_TABLE).insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateAviso(id, form) {
  const payload = {
    seccion_id: form.seccion_id || null,
    titulo: form.titulo?.trim(),
    contenido: form.contenido?.trim() || null,
    orden: Number(form.orden) || 0,
    publicado: form.publicado !== false,
  };

  const { data, error } = await supabase.from(AVISOS_TABLE).update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteAviso(id) {
  if (!id) throw new Error("Falta id del aviso para eliminar.");

  const { error } = await supabase.from(AVISOS_TABLE).delete().eq("id", id);
  if (error) throw error;
}
