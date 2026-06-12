export type Goal = "cut" | "maintain" | "bulk";
export type ProgramMode = "coached" | "collaborative" | "manual";
export type DietStyle = "balanced" | "low_carb" | "keto" | "high_carb";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export interface NutritionProfile {
  user_id: string;
  goal: Goal;
  goal_rate_pct_per_week: number;
  program_mode: ProgramMode;
  diet_style: DietStyle;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  expenditure_estimate: number | null;
  starting_weight_kg: number | null;
  goal_weight_kg: number | null;
  last_checkin_at: string | null;
  onboarded_at: string | null;
}

export interface WeightEntry {
  id: string;
  entry_date: string;
  weight_kg: number;
  trend_kg: number | null;
}

export interface FoodEntry {
  id: string;
  log_date: string;
  meal: Meal;
  food_id: string | null;
  name_snapshot: string;
  servings: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  is_quick_add: boolean;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  serving_label: string;
  serving_grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sat_fat_g: number | null;
  sodium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  vit_c_mg: number | null;
  vit_d_ug: number | null;
  is_verified: boolean;
  category: string | null;
}

export interface MacroTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}