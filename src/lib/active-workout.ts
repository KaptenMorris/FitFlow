import { useEffect, useState } from "react";

const KEY = "fitflow:active-workout";

export type ActiveWorkout = {
  schemaId: string;
  day: number;
  startedAt: number; // ms epoch
  name?: string;
};

const EVENT = "fitflow:active-workout-changed";

export function readActiveWorkout(): ActiveWorkout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ActiveWorkout;
    if (!v?.schemaId || typeof v.startedAt !== "number") return null;
    return v;
  } catch {
    return null;
  }
}

export function setActiveWorkout(v: ActiveWorkout) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new Event(EVENT));
}

export function clearActiveWorkout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Ensures an active workout exists for the given schemaId/day.
 * Returns the startedAt timestamp. If one already exists for the same
 * schemaId+day it's reused (so the timer survives navigation/refresh).
 */
export function ensureActiveWorkout(schemaId: string, day: number, name?: string): number {
  const existing = readActiveWorkout();
  if (existing && existing.schemaId === schemaId && existing.day === day) {
    return existing.startedAt;
  }
  const startedAt = Date.now();
  setActiveWorkout({ schemaId, day, startedAt, name });
  return startedAt;
}

export function useActiveWorkout(): ActiveWorkout | null {
  const [v, setV] = useState<ActiveWorkout | null>(() => readActiveWorkout());
  useEffect(() => {
    const update = () => setV(readActiveWorkout());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return v;
}