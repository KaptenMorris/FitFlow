import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Personalization = {
  loading: boolean;
  age: number | null;
  isMinor: boolean;
  gender: string | null;
  goal: string | null;
  heightCm: number | null;
  weightKg: number | null;
  /** Estimated daily calorie target (Mifflin-St Jeor, lightly active), null if missing data */
  dailyKcal: number | null;
};

function calcAge(birth: string | null): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function calcKcal(p: { gender: string | null; weightKg: number | null; heightCm: number | null; age: number | null; goal: string | null }): number | null {
  if (!p.weightKg || !p.heightCm || !p.age) return null;
  // Mifflin-St Jeor BMR
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  const bmr = p.gender === "kvinna" ? base - 161 : base + 5;
  let tdee = bmr * 1.45; // lightly–moderately active default
  // Adjust by goal
  if (p.goal === "ner") tdee -= 400;
  else if (p.goal === "bygga") tdee += 250;
  // Safety floor for minors / low values
  return Math.max(1400, Math.round(tdee / 10) * 10);
}

export function usePersonalization(): Personalization {
  const [state, setState] = useState<Personalization>({
    loading: true, age: null, isMinor: false, gender: null, goal: null,
    heightCm: null, weightKg: null, dailyKcal: null,
  });
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setState((s) => ({ ...s, loading: false })); return; }
      const { data: p } = await supabase
        .from("profiles")
        .select("birth_date,gender,fitness_goal,height_cm,current_weight_kg")
        .eq("id", u.user.id)
        .maybeSingle();
      const age = calcAge((p as any)?.birth_date ?? null);
      const weightKg = (p as any)?.current_weight_kg ? Number((p as any).current_weight_kg) : null;
      const heightCm = (p as any)?.height_cm ? Number((p as any).height_cm) : null;
      const gender = (p as any)?.gender ?? null;
      const goal = (p as any)?.fitness_goal ?? null;
      const dailyKcal = calcKcal({ gender, weightKg, heightCm, age, goal });
      setState({
        loading: false,
        age, isMinor: age !== null && age < 18,
        gender, goal, heightCm, weightKg, dailyKcal,
      });
    })();
  }, []);
  return state;
}

export function goalLabel(goal: string | null): string {
  switch (goal) {
    case "bygga": return "bygga muskler";
    case "ner": return "gå ner i vikt";
    case "uthallighet": return "förbättra konditionen";
    case "halla": return "hålla formen";
    default: return "nå dina mål";
  }
}