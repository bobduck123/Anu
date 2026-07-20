const STORAGE_KEY = "presence_anonymous_visitor_id";

export function anonymousVisitorId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function debounceEncounterKey(roomId: number, token?: string | null) {
  return `presence_encounter_${roomId}_${token || "direct"}`;
}

export function shouldCaptureEncounter(roomId: number, token?: string | null) {
  if (typeof window === "undefined") return false;
  const key = debounceEncounterKey(roomId, token);
  const last = Number(window.sessionStorage.getItem(key) || "0");
  if (Date.now() - last < 5 * 60 * 1000) return false;
  window.sessionStorage.setItem(key, String(Date.now()));
  return true;
}

