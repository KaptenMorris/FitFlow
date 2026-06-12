import { supabase } from "@/integrations/supabase/client";
import type { NutritionProfile, WeightEntry, FoodEntry, Food, Meal, Goal, ProgramMode, DietStyle } from "./types";
import { addDays, todayISO } from "./algorithms";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Inte inloggad");
  return data.user.id;
}

export async function getProfile(): Promise<NutritionProfile | null> {
  const user_id = await uid();
  const { data, error } = await supabase.from("mf_nutrition_profile").select("*").eq("user_id", user_id).maybeSingle();
  if (error) throw error;
  return (data as NutritionProfile) ?? null;
}

export async function upsertProfile(p: Partial<NutritionProfile> & { kcal_target: number; protein_g: number; carbs_g: number; fat_g: number; goal: Goal; program_mode: ProgramMode; diet_style: DietStyle; goal_rate_pct_per_week: number }): Promise<NutritionProfile> {
  const user_id = await uid();
  const payload = { ...p, user_id, onboarded_at: p.onboarded_at ?? new Date().toISOString() };
  const { data, error } = await supabase.from("mf_nutrition_profile").upsert(payload as any, { onConflict: "user_id" }).select().single();
  if (error) throw error;
  return data as NutritionProfile;
}

export async function getWeightEntries(days = 90): Promise<WeightEntry[]> {
  const user_id = await uid();
  const since = addDays(todayISO(), -days);
  const { data, error } = await supabase.from("mf_weight_entries").select("*").eq("user_id", user_id).gte("entry_date", since).order("entry_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WeightEntry[];
}

export async function logWeight(weight_kg: number, entry_date: string = todayISO()): Promise<void> {
  const user_id = await uid();
  const { error } = await supabase.from("mf_weight_entries").upsert({ user_id, entry_date, weight_kg, source: "manual" } as any, { onConflict: "user_id,entry_date" });
  if (error) throw error;
}

export async function getFoodLog(date: string): Promise<FoodEntry[]> {
  const user_id = await uid();
  const { data, error } = await supabase.from("mf_food_log").select("*").eq("user_id", user_id).eq("log_date", date).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FoodEntry[];
}

export async function getFoodLogRange(from: string, to: string): Promise<FoodEntry[]> {
  const user_id = await uid();
  const { data, error } = await supabase.from("mf_food_log").select("*").eq("user_id", user_id).gte("log_date", from).lte("log_date", to);
  if (error) throw error;
  return (data ?? []) as FoodEntry[];
}

export async function searchFoods(q: string): Promise<Food[]> {
  let query = supabase.from("mf_foods").select("*").limit(40);
  if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Food[];
}

export async function recentFoodNames(limit = 8): Promise<{ name: string; food_id: string | null; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[]> {
  const user_id = await uid();
  const { data, error } = await supabase.from("mf_food_log").select("name_snapshot,food_id,kcal,protein_g,carbs_g,fat_g,created_at").eq("user_id", user_id).order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  const seen = new Set<string>();
  const out: { name: string; food_id: string | null; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[] = [];
  for (const r of data ?? []) {
    const key = (r as any).name_snapshot;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: key, food_id: (r as any).food_id, kcal: Number((r as any).kcal), protein_g: Number((r as any).protein_g), carbs_g: Number((r as any).carbs_g), fat_g: Number((r as any).fat_g) });
    if (out.length >= limit) break;
  }
  return out;
}

export async function logFood(input: { food?: Food; servings: number; meal: Meal; date: string; quick?: { name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number } }): Promise<void> {
  const user_id = await uid();
  let payload: any = { user_id, log_date: input.date, meal: input.meal, servings: input.servings };
  if (input.food) {
    const f = input.food;
    payload = {
      ...payload,
      food_id: f.id,
      name_snapshot: f.name,
      kcal: f.kcal * input.servings,
      protein_g: f.protein_g * input.servings,
      carbs_g: f.carbs_g * input.servings,
      fat_g: f.fat_g * input.servings,
      fiber_g: (f.fiber_g ?? 0) * input.servings,
      sugar_g: (f.sugar_g ?? 0) * input.servings,
      is_quick_add: false,
    };
  } else if (input.quick) {
    const q = input.quick;
    payload = {
      ...payload,
      food_id: null,
      name_snapshot: q.name,
      kcal: q.kcal * input.servings,
      protein_g: q.protein_g * input.servings,
      carbs_g: q.carbs_g * input.servings,
      fat_g: q.fat_g * input.servings,
      is_quick_add: true,
    };
  } else {
    throw new Error("Ingen mat angiven");
  }
  const { error } = await supabase.from("mf_food_log").insert(payload);
  if (error) throw error;
}

export async function deleteFoodEntry(id: string): Promise<void> {
  const { error } = await supabase.from("mf_food_log").delete().eq("id", id);
  if (error) throw error;
}

export async function copyDay(fromDate: string, toDate: string): Promise<number> {
  const user_id = await uid();
  const { data, error } = await supabase.from("mf_food_log").select("meal,food_id,name_snapshot,servings,kcal,protein_g,carbs_g,fat_g,fiber_g,sugar_g,is_quick_add").eq("user_id", user_id).eq("log_date", fromDate);
  if (error) throw error;
  if (!data || data.length === 0) return 0;
  const rows = data.map((r) => ({ ...(r as any), user_id, log_date: toDate }));
  const { error: e2 } = await supabase.from("mf_food_log").insert(rows);
  if (e2) throw e2;
  return rows.length;
}

export async function getCheckins(limit = 12) {
  const user_id = await uid();
  const { data, error } = await supabase.from("mf_checkins").select("*").eq("user_id", user_id).order("checkin_date", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function insertCheckin(row: { checkin_date: string; estimated_tdee: number; previous_kcal_target: number; new_kcal_target: number; trend_change_kg: number | null; reason: string }) {
  const user_id = await uid();
  const { error } = await supabase.from("mf_checkins").insert({ ...row, user_id });
  if (error) throw error;
}

export async function getBaseUserData(): Promise<{ age: number | null; gender: string | null; heightCm: number | null; weightKg: number | null }> {
  const user_id = await uid();
  const { data } = await supabase.from("profiles").select("birth_date,gender,height_cm,current_weight_kg").eq("id", user_id).maybeSingle();
  if (!data) return { age: null, gender: null, heightCm: null, weightKg: null };
  const birth = (data as any).birth_date as string | null;
  let age: number | null = null;
  if (birth) {
    const d = new Date(birth);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    }
  }
  return { age, gender: (data as any).gender ?? null, heightCm: (data as any).height_cm ? Number((data as any).height_cm) : null, weightKg: (data as any).current_weight_kg ? Number((data as any).current_weight_kg) : null };
}