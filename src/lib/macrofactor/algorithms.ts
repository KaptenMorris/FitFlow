import type { WeightEntry, NutritionProfile, FoodEntry, DietStyle, Goal, MacroTotals } from "./types";

/** Exponential moving average for daily weights. Returns array same length as input. */
export function computeWeightTrend(entries: { entry_date: string; weight_kg: number }[], alpha = 0.1): { entry_date: string; weight_kg: number; trend_kg: number }[] {
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  let prev: number | null = null;
  return sorted.map((e) => {
    const w = Number(e.weight_kg);
    const t = prev == null ? w : prev + alpha * (w - prev);
    prev = t;
    return { entry_date: e.entry_date, weight_kg: w, trend_kg: Math.round(t * 1000) / 1000 };
  });
}

/**
 * Calculate dynamic TDEE from energy intake + weight trend change.
 * kcalOut = kcalIn - (Δstored_kg × 7700)
 */
export function computeDynamicTDEE(opts: {
  trend: { entry_date: string; trend_kg: number }[];
  intakeByDate: Map<string, number>;
  fallbackTDEE: number;
  windowDays?: number;
}): { tdee: number; confidence: "low" | "med" | "high"; intakeDays: number } {
  const win = opts.windowDays ?? 14;
  if (opts.trend.length < 7) return { tdee: opts.fallbackTDEE, confidence: "low", intakeDays: 0 };
  const tail = opts.trend.slice(-win);
  const days = tail.length - 1;
  if (days < 1) return { tdee: opts.fallbackTDEE, confidence: "low", intakeDays: 0 };
  const dKg = tail[tail.length - 1].trend_kg - tail[0].trend_kg;
  let intakeSum = 0;
  let intakeDays = 0;
  for (const t of tail) {
    const v = opts.intakeByDate.get(t.entry_date);
    if (v != null && v > 0) { intakeSum += v; intakeDays++; }
  }
  if (intakeDays < 4) return { tdee: opts.fallbackTDEE, confidence: "low", intakeDays };
  const avgIntake = intakeSum / intakeDays;
  const storedKcalPerDay = (dKg * 7700) / days;
  const tdee = Math.round(avgIntake - storedKcalPerDay);
  const confidence = intakeDays >= 10 && tail.length >= 14 ? "high" : intakeDays >= 7 ? "med" : "low";
  // sanity clamp
  const clamped = Math.max(1200, Math.min(5500, tdee));
  return { tdee: clamped, confidence, intakeDays };
}

/** Mifflin-St Jeor BMR × activity factor — fallback when not enough data. */
export function mifflinStJeor(opts: { weightKg: number | null; heightCm: number | null; age: number | null; gender: string | null; activity?: number }): number {
  if (!opts.weightKg || !opts.heightCm || !opts.age) return 2200;
  const base = 10 * opts.weightKg + 6.25 * opts.heightCm - 5 * opts.age;
  const bmr = opts.gender === "kvinna" || opts.gender === "female" ? base - 161 : base + 5;
  return Math.round(bmr * (opts.activity ?? 1.45));
}

/** Goal kcal delta from goal & rate. */
export function goalKcalDelta(goal: Goal, rate_pct_per_week: number, current_weight_kg: number): number {
  if (goal === "maintain") return 0;
  const dir = goal === "cut" ? -1 : 1;
  const kgPerWeek = (rate_pct_per_week / 100) * current_weight_kg;
  const kcalPerDay = (kgPerWeek * 7700) / 7;
  return Math.round(dir * kcalPerDay);
}

/** Days until goal weight given current trend, fallback to goal rate. */
export function goalEtaDays(opts: { trend: { entry_date: string; trend_kg: number }[]; goalWeightKg: number | null; goal: Goal; rate_pct_per_week: number; currentWeightKg: number; }): number | null {
  if (!opts.goalWeightKg || opts.goal === "maintain") return null;
  const diff = opts.goalWeightKg - opts.currentWeightKg;
  let kgPerWeek: number;
  if (opts.trend.length >= 14) {
    const tail = opts.trend.slice(-14);
    const total = tail[tail.length - 1].trend_kg - tail[0].trend_kg;
    kgPerWeek = (total / (tail.length - 1)) * 7;
  } else {
    kgPerWeek = (opts.goal === "cut" ? -1 : 1) * (opts.rate_pct_per_week / 100) * opts.currentWeightKg;
  }
  if (Math.abs(kgPerWeek) < 0.01) return null;
  if ((diff > 0 && kgPerWeek <= 0) || (diff < 0 && kgPerWeek >= 0)) return null;
  return Math.round((diff / kgPerWeek) * 7);
}

/** Distribute macros given kcal and diet style; enforces protein floor 1.8 g/kg. */
export function distributeMacros(opts: { kcal: number; style: DietStyle; weightKg: number | null }): { protein_g: number; carbs_g: number; fat_g: number } {
  const proteinFloor = opts.weightKg ? Math.round(opts.weightKg * 1.8) : Math.round(opts.kcal * 0.3 / 4);
  let pPct: number, cPct: number, fPct: number;
  switch (opts.style) {
    case "low_carb": pPct = 0.30; cPct = 0.25; fPct = 0.45; break;
    case "keto":     pPct = 0.25; cPct = 0.05; fPct = 0.70; break;
    case "high_carb":pPct = 0.25; cPct = 0.55; fPct = 0.20; break;
    default:         pPct = 0.30; cPct = 0.40; fPct = 0.30;
  }
  let protein_g = Math.max(proteinFloor, Math.round((opts.kcal * pPct) / 4));
  const proteinKcal = protein_g * 4;
  const remaining = Math.max(0, opts.kcal - proteinKcal);
  const cShare = cPct / (cPct + fPct);
  const carbs_g = Math.round((remaining * cShare) / 4);
  const fat_g = Math.round((remaining * (1 - cShare)) / 9);
  return { protein_g, carbs_g, fat_g };
}

/** Sum entries -> macros. */
export function sumEntries(entries: Pick<FoodEntry, "kcal"|"protein_g"|"carbs_g"|"fat_g">[]): MacroTotals {
  return entries.reduce<MacroTotals>((acc, e) => ({
    kcal: acc.kcal + Number(e.kcal||0),
    protein_g: acc.protein_g + Number(e.protein_g||0),
    carbs_g: acc.carbs_g + Number(e.carbs_g||0),
    fat_g: acc.fat_g + Number(e.fat_g||0),
  }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
}

/**
 * Weekly coaching check-in. Adherence-neutral: uses actual TDEE data, never
 * "penalizes" overeating — just recomputes target.
 */
export function computeCheckinAdjustment(opts: {
  tdee: number;
  goal: Goal;
  rate_pct_per_week: number;
  currentWeightKg: number;
  previousKcalTarget: number;
}): { newTarget: number; delta: number; reason: string } {
  const goalDelta = goalKcalDelta(opts.goal, opts.rate_pct_per_week, opts.currentWeightKg);
  const idealTarget = Math.round(opts.tdee + goalDelta);
  // Smooth: max ±250 kcal change per week
  const diff = idealTarget - opts.previousKcalTarget;
  const clamped = Math.max(-250, Math.min(250, diff));
  const newTarget = Math.max(1200, opts.previousKcalTarget + clamped);
  let reason = "Målet ligger kvar — du följer din plan.";
  if (clamped > 50) reason = `Din förbränning är högre än väntat. Höjer kalorierna med ${clamped} kcal.`;
  else if (clamped < -50) reason = `Trenden visar långsammare framsteg. Sänker kalorierna med ${Math.abs(clamped)} kcal.`;
  return { newTarget, delta: clamped, reason };
}

export function calcAge(birth: string | null): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}