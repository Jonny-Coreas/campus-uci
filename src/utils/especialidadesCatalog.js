export const OFFICIAL_SPECIALTIES = [
  {
    nombre: "UCI",
    descripcion: "Unidad de Cuidados Intensivos",
  },
  {
    nombre: "ECMO",
    descripcion: "Oxigenación por Membrana Extracorpórea",
  },
  {
    nombre: "Terapias Lentas",
    descripcion: "Terapias Lentas",
    aliases: ["Hemodiálisis", "Hemodialisis"],
  },
  {
    nombre: "CEC",
    descripcion: "CEC",
  },
];

export function displaySpecialtyName(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hemodiálisis" || normalized === "hemodialisis") return "Terapias Lentas";
  return value || "";
}

export function displaySpecialtyDescription(nombre = "", descripcion = "") {
  const displayName = displaySpecialtyName(nombre);
  if (displayName === "ECMO") return "Oxigenación por Membrana Extracorpórea";
  if (displayName === "UCI") return "Unidad de Cuidados Intensivos";
  if (displayName === "CEC") return "CEC";
  if (displayName === "Terapias Lentas") return descripcion && !/hemodi[aá]lisis/i.test(descripcion)
    ? descripcion
    : "Terapias Lentas";
  return descripcion || "";
}

export function normalizeSpecialtyRecord(item = {}) {
  const nombre = displaySpecialtyName(item.nombre);
  return {
    ...item,
    nombre,
    descripcion: displaySpecialtyDescription(nombre, item.descripcion),
  };
}

export function normalizeSpecialtyRecords(items = []) {
  return (items || []).map(normalizeSpecialtyRecord);
}
