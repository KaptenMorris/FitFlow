// Shared helpers for building a weekly training plan from a schema's
// description JSON. Used by both the schema overview page and the pass
// (workout) page so the same exercises are shown in both places.

export const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
export const FULL_DAY: Record<string, string> = {
  "Mån": "Måndag", "Tis": "Tisdag", "Ons": "Onsdag", "Tor": "Torsdag",
  "Fre": "Fredag", "Lör": "Lördag", "Sön": "Söndag",
};

// Maps schema body part names → DB body_part values (used in `.in("body_part", ...)`)
export const DB_FETCH_MAP: Record<string, string[]> = {
  "Bröst": ["Bröst"], "Rygg": ["Rygg"], "Axlar": ["Axlar"],
  "Armar": ["Överarmar", "Underarmar"], "Överarmar": ["Överarmar"],
  "Underarmar": ["Underarmar"], "Triceps": ["Överarmar"], "Biceps": ["Överarmar"],
  "Mage": ["Mage"], "Ben": ["Ben"], "Rumpa": ["Ben"], "Vader": ["Vader"],
  "Nacke": ["Nacke"], "Kondition": ["Kondition"],
};
// Maps schema body part names → pool bucket keys (used after grouping in memory).
// Biceps/Triceps are virtual buckets created by splitting "Överarmar" via `target`.
export const BODY_PART_MAP: Record<string, string[]> = {
  "Bröst": ["Bröst"], "Rygg": ["Rygg"], "Axlar": ["Axlar"],
  "Armar": ["Biceps", "Triceps", "Underarmar"], "Överarmar": ["Biceps", "Triceps"],
  "Underarmar": ["Underarmar"], "Triceps": ["Triceps"], "Biceps": ["Biceps"],
  "Mage": ["Mage"], "Ben": ["Ben"], "Rumpa": ["Ben"], "Vader": ["Vader"],
  "Nacke": ["Nacke"], "Kondition": ["Kondition"],
};

export type Parsed = {
  bodyParts?: string[];
  pickedDays?: string[];
  daysPerWeek?: number;
  daysMode?: "app" | "me";
  exercisesPerSession?: number;
  setsPerExercise?: number;
  equipmentPref?: string[];
  age?: string;
  height?: string;
  weight?: string;
  level?: string;
  period?: string;
  overrides?: Record<string, string>;
  extras?: Record<string, string[]>;
  regen?: Record<string, number>;
};

export type PlanExercise = {
  id: string;
  equipment: string;
  body_part: string | null;
  target?: string | null;
};

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededShuffle<T>(items: T[], seedSource: string): T[] {
  const out = [...items];
  let seed = hashString(seedSource) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildSchemaPlan<T extends PlanExercise>(
  parsed: Parsed | null,
  byPart: Record<string, T[]>,
  overrideEx: Record<string, T>,
  schemaSeed: string,
): { day: string; full: string; muscles: string[]; exercises: T[] }[] {
  const dayCount = parsed?.daysPerWeek ?? parsed?.pickedDays?.length ?? 3;
  const days: string[] = parsed?.daysMode === "me" && parsed.pickedDays?.length
    ? parsed.pickedDays
    : WEEKDAYS.slice(0, Math.min(7, Math.max(1, dayCount)));
  const parts = parsed?.bodyParts?.length ? parsed.bodyParts : ["Bröst", "Rygg", "Ben"];
  const perSession = parsed?.exercisesPerSession && parsed.exercisesPerSession > 0
    ? parsed.exercisesPerSession : 5;
  const dayMusclesMap: string[][] = Array.from({ length: days.length }, (_, i) => {
    const a = parts[(i * 2) % parts.length];
    const b = parts[(i * 2 + 1) % parts.length];
    return a === b && parts.length > 1 ? [a, parts[(i * 2 + 2) % parts.length]] : [a, b];
  });
  return days.map((d, i) => {
    const muscles = dayMusclesMap[i];
    const safeMuscles = muscles.length ? muscles : [parts[i % parts.length]];
    const regenSalt = parsed?.regen?.[String(i)] ?? 0;
    const daySeed = `${schemaSeed}:r${regenSalt}`;
    const eqPref = parsed?.equipmentPref && parsed.equipmentPref.length > 0
      ? new Set(parsed.equipmentPref) : null;
    const pools: T[][] = safeMuscles.map((m, muscleIdx) => {
      const all = (BODY_PART_MAP[m] ?? [m]).flatMap((bp) => byPart[bp] ?? []);
      const shuffledAll = seededShuffle(all, `${daySeed}:${d}:${m}:${muscleIdx}:all`);
      if (!eqPref) return shuffledAll;
      const filtered = all.filter((e) => eqPref.has(e.equipment));
      return filtered.length > 0
        ? seededShuffle(filtered, `${daySeed}:${d}:${m}:${muscleIdx}:filtered`)
        : shuffledAll;
    });
    const seen = new Set<string>();
    const exs: T[] = [];
    const groupCount = safeMuscles.length;
    const perGroup = Math.floor(perSession / groupCount);
    const remainder = perSession - perGroup * groupCount;
    const targets = safeMuscles.map((_, gi) => perGroup + (gi < remainder ? 1 : 0));
    const picked = safeMuscles.map(() => 0);
    for (let gi = 0; gi < groupCount; gi++) {
      const pool = pools[gi];
      if (!pool.length) continue;
      for (let k = 0; k < pool.length * 2 && picked[gi] < targets[gi]; k++) {
        const ex = pool[k % pool.length];
        if (seen.has(ex.id)) continue;
        seen.add(ex.id);
        exs.push(ex);
        picked[gi]++;
      }
    }
    if (exs.length < perSession) {
      const allPool = seededShuffle(pools.flat(), `${daySeed}:${d}:backfill`);
      for (let k = 0; k < allPool.length * 2 && exs.length < perSession; k++) {
        const ex = allPool[k % allPool.length];
        if (seen.has(ex.id)) continue;
        seen.add(ex.id);
        exs.push(ex);
      }
    }
    if (exs.length === 0) {
      const everything = Object.values(byPart).flat();
      const eqFiltered = eqPref
        ? everything.filter((e) => eqPref.has(e.equipment))
        : everything;
      const fallbackPool = seededShuffle(
        eqFiltered.length > 0 ? eqFiltered : everything,
        `${daySeed}:${d}:fallback`,
      );
      for (let k = 0; k < fallbackPool.length && exs.length < perSession; k++) {
        const ex = fallbackPool[k % fallbackPool.length];
        if (seen.has(ex.id)) continue;
        seen.add(ex.id);
        exs.push(ex);
      }
    }
    const overrides = parsed?.overrides ?? {};
    const finalExs = exs.map((ex, k) => {
      const ovId = overrides[`${i}:${k}`];
      if (ovId && overrideEx[ovId]) return overrideEx[ovId];
      return ex;
    });
    const extras = parsed?.extras?.[String(i)] ?? [];
    const extraExs = extras.map((eid) => overrideEx[eid]).filter(Boolean) as T[];
    return { day: d, full: FULL_DAY[d] ?? d, muscles: safeMuscles, exercises: [...finalExs, ...extraExs] };
  });
}