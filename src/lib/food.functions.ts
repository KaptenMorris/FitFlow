import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RecognizeInput = z.object({
  imageBase64: z.string().min(10).max(8_000_000),
});

type FoodResult = {
  name: string;
  serving: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export const recognizeFoodFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RecognizeInput.parse(d))
  .handler(async ({ data }): Promise<FoodResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway saknar nyckel");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Du identifierar mat från en bild och uppskattar näringsvärden. Svara ENDAST med JSON: {\"name\":string,\"serving\":string,\"kcal\":number,\"protein_g\":number,\"carbs_g\":number,\"fat_g\":number}. Använd svensk text. Var realistisk.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Vad är detta för mat? Uppskatta näringsvärdena." },
              { type: "image_url", image_url: { url: data.imageBase64 } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI fel: ${res.status}`);
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Kunde inte tolka svar");
    const parsed = JSON.parse(match[0]);
    return {
      name: String(parsed.name ?? "Okänd mat"),
      serving: String(parsed.serving ?? "1 portion"),
      kcal: Math.round(Number(parsed.kcal) || 0),
      protein_g: Math.round(Number(parsed.protein_g) || 0),
      carbs_g: Math.round(Number(parsed.carbs_g) || 0),
      fat_g: Math.round(Number(parsed.fat_g) || 0),
    };
  });