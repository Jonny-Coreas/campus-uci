import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeRole(value: unknown) {
  const role = String(value || "").trim().toLowerCase();
  if (["admin", "jefe", "docente", "recurso"].includes(role)) return role;
  if (["personal", "estudiante", "recurso / estudiante", "recurso/estudiante"].includes(role)) return "recurso";
  return "recurso";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Faltan variables de entorno de Supabase." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "").trim();

  if (!jwt) {
    return jsonResponse({ error: "No autorizado. Falta JWT." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser(jwt);
  if (callerError || !callerData?.user?.id) {
    return jsonResponse({ error: "No autorizado. JWT inválido." }, 401);
  }

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, user_id, rol, activo")
    .eq("user_id", callerData.user.id)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }

  const callerRole = normalizeRole(callerProfile?.rol);
  if (!callerProfile || callerProfile.activo === false || !["admin", "jefe"].includes(callerRole)) {
    return jsonResponse({ error: "Solo admin/jefe puede crear usuarios." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body JSON inválido." }, 400);
  }

  const email = String(body.email || body.correo || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const nombre = String(body.nombre || "").trim();
  const rol = normalizeRole(body.rol);
  const cum = String(body.cum || "").trim().toUpperCase() || null;
  const servicio = String(body.servicio || "").trim() || "UCI";
  const area = String(body.area || "").trim() || "UCI GENERAL";
  const especialidadId = String(body.especialidad_id || body.especialidadId || "").trim() || null;
  const avatarUrl = String(body.avatar_url || "").trim() || null;

  if (!email) return jsonResponse({ error: "El correo es obligatorio." }, 400);
  if (!nombre) return jsonResponse({ error: "El nombre es obligatorio." }, 400);
  if (!password || password.length < 6) {
    return jsonResponse({ error: "La contraseña temporal debe tener al menos 6 caracteres." }, 400);
  }

  const { data: authResult, error: createAuthError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol, full_name: nombre },
  });

  if (createAuthError || !authResult?.user?.id) {
    return jsonResponse({ error: createAuthError?.message || "No se pudo crear auth user." }, 400);
  }

  const authUser = authResult.user;

  const { data: profile, error: createProfileError } = await adminClient
    .from("profiles")
    .insert({
      user_id: authUser.id,
      nombre,
      correo: email,
      rol,
      servicio: "UCI",
      area: "UCI GENERAL",
      cum: null,
      activo: true,
      avatar_url: avatarUrl,
    })
    .select("id, user_id, nombre, correo, rol, servicio, area, cum, activo, avatar_url")
    .single();

  if (createProfileError || !profile?.id) {
    await adminClient.auth.admin.deleteUser(authUser.id);
    return jsonResponse({ error: createProfileError?.message || "No se pudo crear profile." }, 400);
  }

  let assignment = null;
  if (especialidadId) {
    const { data: existing } = await adminClient
      .from("usuario_especialidad")
      .select("id")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const payload = {
      profile_id: profile.id,
      user_id: authUser.id,
      especialidad_id: especialidadId,
      progreso: Number(body.progreso || 0) || 0,
      activo: true,
      estado: "en_proceso",
    };

    if (existing?.[0]?.id) {
      const { data, error } = await adminClient
        .from("usuario_especialidad")
        .update(payload)
        .eq("id", existing[0].id)
        .select("*")
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);
      assignment = data;
    } else {
      const { data, error } = await adminClient
        .from("usuario_especialidad")
        .insert(payload)
        .select("*")
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);
      assignment = data;
    }
  }

  return jsonResponse({
    user: {
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
    },
    profile,
    assignment,
  });
});
