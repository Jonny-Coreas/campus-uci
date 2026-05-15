const TASK_META_START = "[[campus_uci_task_meta:";
const TASK_META_END = "]]";

export function buildTaskInstructions({ description = "", asignaturaId = "", attachments = [] } = {}) {
  const cleanDescription = String(description || "").trim();
  const meta = {
    asignatura_id: asignaturaId || null,
    attachments: (attachments || []).filter((item) => item?.url),
  };

  return `${cleanDescription}\n\n${TASK_META_START}${JSON.stringify(meta)}${TASK_META_END}`.trim();
}

export function parseTaskInstructions(instructions = "") {
  const text = String(instructions || "");
  const start = text.lastIndexOf(TASK_META_START);
  const end = start >= 0 ? text.indexOf(TASK_META_END, start) : -1;

  if (start < 0 || end < 0) {
    return {
      description: text,
      asignaturaId: "",
      attachments: [],
    };
  }

  const description = text.slice(0, start).trim();
  const raw = text.slice(start + TASK_META_START.length, end);

  try {
    const meta = JSON.parse(raw);
    return {
      description,
      asignaturaId: meta?.asignatura_id || "",
      attachments: Array.isArray(meta?.attachments) ? meta.attachments : [],
    };
  } catch {
    return {
      description,
      asignaturaId: "",
      attachments: [],
    };
  }
}
