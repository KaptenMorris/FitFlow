// Smart weight progression for the workout pass page.
// Looks at the user's recent set logs for an exercise and recommends:
//   - what weight to start with today,
//   - whether to hold, increase, or deload, and
//   - a short human-readable explanation.
//
// Progression rule (a common "double progression" model):
//   1. If the last session's top working weight was completed for all sets
//      AND every set hit the top of the rep range → recommend a small jump.
//   2. If reps were inside the target range → keep the same weight and
//      push for more reps next time.
//   3. If reps fell below the bottom of the target range on most sets →
//      deload ~10% so form/technique can catch up.
//   4. No history → tell the user to feel out a comfortable starting weight.

export type SetHistory = {
  reps: number | null;
  weight_kg: number | null;
  completed: boolean | null;
  created_at: string;
  session_id: string | null;
};

export type ProgressionAction = "start" | "hold" | "increase" | "deload";

export type Recommendation = {
  kg: number | null;
  action: ProgressionAction;
  message: string;
  prevKg: number | null;
  prevTopReps: number | null;
  targetReps: { min: number; max: number };
};

export function parseRepsRange(hint: string | null | undefined): { min: number; max: number } {
  if (!hint) return { min: 8, max: 12 };
  const m = hint.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const single = parseInt(hint, 10);
  if (!Number.isNaN(single)) return { min: single, max: single };
  return { min: 8, max: 12 };
}

function stepFor(kg: number): number {
  // Larger jumps for heavier compound work, smaller for accessories.
  if (kg >= 60) return 2.5;
  if (kg >= 20) return 1.25;
  return 0.5;
}

function roundToStep(kg: number, step: number): number {
  return Math.round(kg / step) * step;
}

export function recommendNextWeight(
  history: SetHistory[],
  repsHint: string | null | undefined,
): Recommendation {
  const target = parseRepsRange(repsHint);
  if (!history?.length) {
    return {
      kg: null,
      action: "start",
      message: "Ingen historik än — välj en bekväm vikt du klarar ~" + target.max + " reps med god teknik.",
      prevKg: null,
      prevTopReps: null,
      targetReps: target,
    };
  }
  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const lastSessionId = sorted.find((s) => s.session_id)?.session_id ?? null;
  const lastSets = sorted.filter(
    (s) => s.session_id === lastSessionId && s.completed && (s.weight_kg ?? 0) > 0 && (s.reps ?? 0) > 0,
  );
  if (!lastSets.length) {
    const last = sorted[0];
    const kg = last.weight_kg ?? null;
    return {
      kg,
      action: "hold",
      message: kg != null
        ? `Kör samma vikt som senast (${kg} kg) och sikta på ${target.min}–${target.max} reps.`
        : "Välj en bekväm vikt och sikta på " + target.min + "–" + target.max + " reps.",
      prevKg: kg,
      prevTopReps: last.reps ?? null,
      targetReps: target,
    };
  }
  const topKg = Math.max(...lastSets.map((s) => s.weight_kg ?? 0));
  const topSets = lastSets.filter((s) => (s.weight_kg ?? 0) === topKg);
  const topReps = Math.max(...topSets.map((s) => s.reps ?? 0));
  const allHitMax = topSets.length >= 2 && topSets.every((s) => (s.reps ?? 0) >= target.max);
  const allInRange = topSets.every((s) => (s.reps ?? 0) >= target.min);

  if (allHitMax) {
    const next = roundToStep(topKg + stepFor(topKg), stepFor(topKg));
    return {
      kg: next,
      action: "increase",
      message: `🎯 Du klarade ${target.max}+ reps på alla set med ${topKg} kg — öka till ${next} kg.`,
      prevKg: topKg,
      prevTopReps: topReps,
      targetReps: target,
    };
  }
  if (allInRange) {
    return {
      kg: topKg,
      action: "hold",
      message: `Kör ${topKg} kg igen och pressa mot ${target.max} reps innan du ökar vikten.`,
      prevKg: topKg,
      prevTopReps: topReps,
      targetReps: target,
    };
  }
  const step = stepFor(topKg);
  const deload = Math.max(step, roundToStep(topKg * 0.9, step));
  return {
    kg: deload,
    action: "deload",
    message: `Förra passet låg under målet (${topReps}/${target.min} reps) — testa ${deload} kg för bättre teknik.`,
    prevKg: topKg,
    prevTopReps: topReps,
    targetReps: target,
  };
}