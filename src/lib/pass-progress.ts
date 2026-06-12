import { useEffect, useState } from "react";

// Persisted per-day progress for an ongoing/finished workout pass.
// Keyed by `${schemaId}:${day}` → percent 0–100. Lives in localStorage so
// the schema overview page can reflect what the user has ticked off in
// the pass page (even after navigating away or refreshing).

const KEY = "fitflow:pass-progress";
const EVENT = "fitflow:pass-progress-changed";

type Map = Record<string, number>;

function read(): Map {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Map) : {};
  } catch {
    return {};
  }
}

function write(m: Map) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(m));
  window.dispatchEvent(new Event(EVENT));
}

export function setPassProgress(schemaId: string, day: number, percent: number) {
  const m = read();
  const k = `${schemaId}:${day}`;
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  if (m[k] === pct) return;
  m[k] = pct;
  write(m);
}

export function clearPassProgress(schemaId: string, day: number) {
  const m = read();
  const k = `${schemaId}:${day}`;
  if (!(k in m)) return;
  delete m[k];
  write(m);
}

export function usePassProgress(schemaId: string | undefined): Record<number, number> {
  const [map, setMap] = useState<Map>(() => read());
  useEffect(() => {
    const update = () => setMap(read());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  if (!schemaId) return {};
  const out: Record<number, number> = {};
  const prefix = `${schemaId}:`;
  for (const k of Object.keys(map)) {
    if (k.startsWith(prefix)) {
      const day = parseInt(k.slice(prefix.length), 10);
      if (!Number.isNaN(day)) out[day] = map[k];
    }
  }
  return out;
}