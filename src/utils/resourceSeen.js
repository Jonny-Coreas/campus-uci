function seenKey({ profileId, type }) {
  return `campus-uci:${profileId || "anon"}:${type}:seen`;
}

export function getSeenIds({ profileId, type }) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(seenKey({ profileId, type }));
    return new Set(JSON.parse(raw || "[]"));
  } catch {
    return new Set();
  }
}

export function isSeen({ profileId, type, id }) {
  if (!id) return false;
  return getSeenIds({ profileId, type }).has(id);
}

export function markSeen({ profileId, type, id }) {
  if (typeof window === "undefined" || !id) return;
  const ids = getSeenIds({ profileId, type });
  ids.add(id);
  window.localStorage.setItem(seenKey({ profileId, type }), JSON.stringify([...ids]));
}
