import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ url: z.string().url() });

export type RecipeFromUrl = {
  name: string;
  serving: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export const recipeFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<RecipeFromUrl> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway saknar nyckel");

    const page = await fetch(data.url, {
      headers: { "User-Agent": "Mozilla/5.0 FitFlow/1.0" },
    });
    if (!page.ok) throw new Error(`Kunde inte hämta sidan (${page.status})`);
    const html = await page.text();
    // Strip tags and trim to keep prompt small
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 12000);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Du extraherar ett recept från text och uppskattar näringsvärden per portion. Svara ENDAST med JSON: {\"name\":string,\"serving\":string,\"kcal\":number,\"protein_g\":number,\"carbs_g\":number,\"fat_g\":number}. Svenska. Var realistisk.",
          },
          { role: "user", content: `URL: ${data.url}\n\nText:\n${text}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI fel: ${res.status}`);
    const json = await res.json();
    const t: string = json.choices?.[0]?.message?.content ?? "";
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Kunde inte tolka svar");
    const p = JSON.parse(m[0]);
    return {
      name: String(p.name ?? "Recept"),
      serving: String(p.serving ?? "1 portion"),
      kcal: Math.round(Number(p.kcal) || 0),
      protein_g: Math.round(Number(p.protein_g) || 0),
      carbs_g: Math.round(Number(p.carbs_g) || 0),
      fat_g: Math.round(Number(p.fat_g) || 0),
    };
  });