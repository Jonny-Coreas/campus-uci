export function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

export function isAdmin(profile) {
  return normalizeRole(profile?.rol) === "admin";
}

export function isAdminOrJefe(profile) {
  const role = normalizeRole(profile?.rol);
  return role === "admin" || role === "jefe";
}

export function isDocente(profile) {
  return normalizeRole(profile?.rol) === "docente";
}

export function isRecurso(profile) {
  return !isAdminOrJefe(profile) && !isDocente(profile);
}
