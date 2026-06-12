import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Radera all användardata explicit (FK saknar ON DELETE CASCADE mot auth.users).
    // Ordningen är vald så att barn-rader tas bort före föräldrar där det spelar roll.
    const ownedByUserId = [
      "workout_set_logs",
      "workout_sessions",
      "weight_logs",
      "training_schemas",
      "meal_log_entries",
      "food_logs",
      "diet_plans",
      "nutrition_plans",
      "mood_logs",
      "coach_messages",
      "coach_profile",
      "post_reactions",
      "post_comments",
      "posts",
      "recipe_favorites",
      "recipes",
      "user_roles",
    ] as const;

    for (const table of ownedByUserId) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) console.error(`[deleteMyAccount] ${table}:`, error.message);
    }

    // Vänskaper och recept-delningar har två user-kolumner.
    await supabaseAdmin.from("friendships").delete().or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    await supabaseAdmin.from("recipe_shares").delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    // Profilen sist (innan auth-användaren).
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });