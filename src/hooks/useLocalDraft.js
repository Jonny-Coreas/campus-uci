import { useEffect, useMemo, useRef, useState } from "react";

function safeRead(key) {
  if (!key || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("[Campus UCI] No se pudo leer borrador local:", error);
    return null;
  }
}

function safeWrite(key, value) {
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("[Campus UCI] No se pudo guardar borrador local:", error);
  }
}

function safeRemove(key) {
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("[Campus UCI] No se pudo limpiar borrador local:", error);
  }
}

export function buildDraftKey(...parts) {
  return ["campusUciDraft", ...parts.map((part) => String(part || "none"))].join(":");
}

export function useLocalDraft({ key, value, onRestore, enabled = true, isEmpty = null }) {
  const [hasDraft, setHasDraft] = useState(false);
  const stableKey = useMemo(() => key || "", [key]);
  const hydratedRef = useRef(false);
  const skipNextWriteRef = useRef(false);

  useEffect(() => {
    if (!enabled || !stableKey) {
      setHasDraft(false);
      return;
    }

    skipNextWriteRef.current = true;
    const draft = safeRead(stableKey);
    if (draft?.value) {
      onRestore?.(draft.value);
      setHasDraft(true);
    } else {
      setHasDraft(false);
    }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, stableKey]);

  useEffect(() => {
    if (!enabled || !stableKey) return;
    if (!hydratedRef.current) return;

    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }

    if (isEmpty?.(value)) {
      if (!hasDraft) safeRemove(stableKey);
      return;
    }

    safeWrite(stableKey, {
      value,
      savedAt: new Date().toISOString(),
    });
    setHasDraft(true);
  }, [enabled, stableKey, value, isEmpty, hasDraft]);

  function clearDraft() {
    safeRemove(stableKey);
    setHasDraft(false);
  }

  return { hasDraft, clearDraft };
}
