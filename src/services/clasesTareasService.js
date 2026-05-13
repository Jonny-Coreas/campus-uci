import { supabase } from "../supabaseClient";

const CLASES_TABLE = "especialidad_clases_virtuales";
const TAREAS_TABLE = "especialidad_tareas";

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
