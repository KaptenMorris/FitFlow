import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ query: z.string().min(1).max(60) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    void userId;
    const { data: rows, error } = await supabase
      .rpc("search_public_profiles", { _q: data.query });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ addressee_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.addressee_id === userId) throw new Error("Du kan inte lägga till dig själv.");
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: userId, addressee_id: data.addressee_id });
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

export const respondFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ friendship_id: z.string().uuid(), accept: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: fs, error: fetchErr } = await supabase
      .from("friendships")
      .select("addressee_id,status")
      .eq("id", data.friendship_id)
      .single();
    if (fetchErr || !fs) throw new Error("Förfrågan hittades inte.");
    if (fs.addressee_id !== userId) throw new Error("Endast mottagaren kan svara på förfrågan.");
    if (fs.status !== "pending") throw new Error("Förfrågan är redan besvarad.");
    const { error } = await supabase
      .from("friendships")
      .update({ status: data.accept ? "accepted" : "declined" })
      .eq("id", data.friendship_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const shareRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ recipe_id: z.string().uuid(), to_user_ids: z.array(z.string().uuid()).min(1).max(50) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.to_user_ids.map((to) => ({
      recipe_id: data.recipe_id,
      from_user_id: userId,
      to_user_id: to,
    }));
    const { error } = await supabase.from("recipe_shares").upsert(rows, {
      onConflict: "recipe_id,to_user_id",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });