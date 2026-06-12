import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_IMG_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

/** Plocka ut base64-bilddata ur olika möjliga svarsformat (OpenAI-images, Gemini chat-completions images). */
function extractB64(json: unknown): string | undefined {
  const j = json as Record<string, unknown> | undefined;
  if (!j || typeof j !== "object") return undefined;
  // OpenAI images shape
  const data = (j as { data?: Array<{ b64_json?: string; url?: string }> }).data;
  if (Array.isArray(data) && data[0]) {
    if (data[0].b64_json) return data[0].b64_json;
    const url = data[0].url;
    if (typeof url === "string" && url.startsWith("data:")) {
      const i = url.indexOf("base64,");
      if (i >= 0) return url.slice(i + 7);
    }
  }
  // Gemini via OpenRouter chat-completions images shape
  const choices = (j as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } | string }>; content?: unknown } }> }).choices;
  const msg = choices?.[0]?.message;
  const imgs = msg?.images;
  if (Array.isArray(imgs) && imgs[0]) {
    const iu = imgs[0].image_url;
    const url = typeof iu === "string" ? iu : iu?.url;
    if (typeof url === "string") {
      if (url.startsWith("data:")) {
        const i = url.indexOf("base64,");
        if (i >= 0) return url.slice(i + 7);
      }
      return url; // fallback (kan vara ren base64)
    }
  }
  return undefined;
}

async function callAI(key: string, model: string, messages: Array<{ role: string; content: string }>, json = true) {
  const res = await fetch(LOVABLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("För många förfrågningar – prova igen om en stund.");
    if (res.status === 402) throw new Error("AI-krediter slut. Lägg till krediter i Lovable-arbetsytan.");
    throw new Error("AI-fel: " + t);
  }
  const data = await res.json();
  let raw: string = data.choices?.[0]?.message?.content ?? "";
  if (json) {
    raw = raw.replace(/```json\s*|\s*```/g, "").trim();
    const start = raw.indexOf("{");
    const startA = raw.indexOf("[");
    if (start >= 0 && (startA < 0 || start < startA)) raw = raw.slice(start, raw.lastIndexOf("}") + 1);
    else if (startA >= 0) raw = raw.slice(startA, raw.lastIndexOf("]") + 1);
  }
  return raw;
}

export const lookupProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ query: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Saknar LOVABLE_API_KEY");
    const raw = await callAI(key, "google/gemini-2.5-flash-lite", [
      {
        role: "system",
        content:
          "Du är en näringsdatabas. Returnera ENDAST JSON utan kodblock med fälten: name (svenska), subtitle (kort beskrivning t.ex. 'Tillagad' eller 'Rå'), kcal, protein_g, fat_g, carbs_g – alla per 100g, heltal. Inkludera även note (kort kommentar t.ex. tillagningsmetod). Om livsmedlet inte finns returnera {\"error\":\"okänt\"}.",
      },
      { role: "user", content: `Livsmedel: ${data.query}` },
    ]);
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("Kunde inte tolka näringsdata.");
    }
  });

export const generateRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        meal_type: z.string().min(1),
        protein_type: z.string().min(1),
        portions: z.number().int().min(1).max(20),
        hint: z.string().max(200).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Saknar LOVABLE_API_KEY");
    const proteinRules: Record<string, string> = {
      kyckling:
        "Huvudprotein MÅSTE vara kyckling (kycklingfilé, kycklinglår eller kycklingfärs). FÖRBJUDET: nötkött, fläsk, lamm, fisk, skaldjur, tofu, baljväxter som huvudprotein. Receptets namn MÅSTE innehålla ordet 'kyckling'.",
      kött:
        "Huvudprotein MÅSTE vara rött kött (nötkött, biff, oxfilé, nötfärs, fläskkött eller lamm). FÖRBJUDET: kyckling, kalkon, fågel, fisk, skaldjur, vegetariska proteiner. Receptets namn MÅSTE innehålla ordet 'kött', 'biff', 'nöt' eller liknande – ALDRIG 'kyckling'.",
      fisk:
        "Huvudprotein MÅSTE vara fisk eller skaldjur (lax, torsk, tonfisk, räkor osv.). FÖRBJUDET: kyckling, nötkött, fläsk, lamm. Receptets namn MÅSTE innehålla fiskslaget – ALDRIG 'kyckling' eller 'kött'.",
      vegetarisk:
        "Receptet MÅSTE vara helt vegetariskt. FÖRBJUDET: allt kött, all kyckling/fågel, all fisk, alla skaldjur. Använd tofu, tempeh, baljväxter, ägg eller mejeri som protein. Receptets namn får INTE innehålla 'kyckling', 'kött' eller fiskslag.",
    };
    const pKey = data.protein_type.toLowerCase().trim();
    const proteinRule = proteinRules[pKey] ?? `Huvudprotein MÅSTE vara ${data.protein_type}.`;
    const raw = await callAI(key, "google/gemini-2.5-flash", [
      {
        role: "system",
        content:
          "Du genererar hälsosamma recept på svenska för en träningsapp. Returnera ENDAST JSON utan kodblock med exakt fälten: name (string), description (kort string, 1 mening), ingredients (array av objekt med name, grams (number, total för hela receptet), kcal_per_100 (number), protein_per_100 (number), fat_per_100 (number), carbs_per_100 (number)), steps (array av korta svenska instruktionssteg). Ingredienser ska vara realistiska gram totalt. Använd 4–8 ingredienser och 4–8 steg. Du MÅSTE följa proteinregeln exakt – fel protein är inte tillåtet under några omständigheter.",
      },
      {
        role: "user",
        content: `Skapa ett ${data.meal_type.toLowerCase()}-recept för ${data.portions} portioner.\n\nVALT PROTEIN: ${data.protein_type}\nPROTEINREGEL: ${proteinRule}\n\nBåde receptets namn, beskrivning och ingredienslista MÅSTE tydligt återspegla det valda proteinet (${data.protein_type}).${data.hint ? "\n\nÖnskemål: " + data.hint : ""}`,
      },
    ]);
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("Kunde inte tolka receptet.");
    }
  });

export const generateRecipeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      name: z.string().min(1).max(160),
      description: z.string().max(400).optional(),
      protein_type: z.string().max(60).optional(),
      ingredients: z.array(z.string()).max(20).optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Saknar LOVABLE_API_KEY");
    const proteinMap: Record<string, string> = {
      kyckling: "rätten MÅSTE innehålla synlig kyckling som huvudprotein. INGEN annan köttsort, INGEN fisk, INGA skaldjur.",
      kött: "rätten MÅSTE innehålla synligt nötkött/rött kött som huvudprotein. INGEN kyckling, INGEN fisk.",
      fisk: "rätten MÅSTE innehålla synlig fisk (t.ex. lax, torsk) som huvudprotein. INGEN kyckling, INGET rött kött.",
      vegetarisk: "rätten är helt VEGETARISK – inget kött, ingen kyckling, ingen fisk, inga skaldjur. Använd grönsaker, baljväxter, tofu eller liknande.",
    };
    const pKey = (data.protein_type ?? "").toLowerCase().trim();
    const proteinRule = proteinMap[pKey] ?? "";
    const ingredientList = data.ingredients?.length
      ? ` Synliga ingredienser: ${data.ingredients.slice(0, 10).join(", ")}.`
      : "";
    const prompt = `Professionell matfotografi ovanifrån av rätten "${data.name}". ${data.description ?? ""} ${proteinRule}${ingredientList} Vacker presentation på en tallrik, naturligt ljus, restaurangkvalitet, aptitretande, hög detalj, mörk träbakgrund. Bilden måste tydligt visa rätt typ av protein.`;
    const res = await fetch(LOVABLE_IMG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("För många bildförfrågningar – prova snart igen.");
      if (res.status === 402) throw new Error("AI-krediter slut.");
      throw new Error("Bildgenerering misslyckades: " + t);
    }
    const json = await res.json();
    const b64 = extractB64(json);
    if (!b64) {
      console.error("[generateRecipeImage] Oväntad respons:", JSON.stringify(json).slice(0, 500));
      throw new Error("Ingen bilddata returnerades.");
    }
    return { b64_json: b64 as string };
  });

/**
 * Säkerställer att ett recept har en genererad bild. Om image_url saknas:
 * genererar bild via AI, laddar upp till recipe-images, uppdaterar receptet
 * och returnerar publik URL. Cachas så alla användare ser samma bild.
 */
export const ensureRecipeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ recipeId: z.string().uuid(), force: z.boolean().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Saknar LOVABLE_API_KEY");

    // Ownership check via user-scoped client (RLS enforced).
    const { userId, supabase: userClient } = context;
    const { data: owned, error: ownErr } = await userClient
      .from("recipes")
      .select("id,user_id")
      .eq("id", data.recipeId)
      .single();
    if (ownErr || !owned || owned.user_id !== userId) {
      throw new Error("Du har inte behörighet till detta recept.");
    }

    const { data: rec, error: recErr } = await supabaseAdmin
      .from("recipes")
      .select("id,name,description,protein_type,ingredients,image_url,image_path")
      .eq("id", data.recipeId)
      .single();
    if (recErr || !rec) throw new Error("Receptet hittades inte");

    // If we already have a stored path, return a fresh signed URL for it.
    if ((rec as { image_path?: string | null }).image_path && !data.force) {
      const { data: signed } = await supabaseAdmin.storage
        .from("recipe-images")
        .createSignedUrl((rec as { image_path: string }).image_path, 60 * 60);
      if (signed?.signedUrl) return { image_url: signed.signedUrl };
    }

    const proteinMap: Record<string, string> = {
      kyckling: "rätten MÅSTE innehålla synlig kyckling som huvudprotein. INGEN annan köttsort, INGEN fisk.",
      kött: "rätten MÅSTE innehålla synligt nötkött/rött kött. INGEN kyckling, INGEN fisk.",
      fisk: "rätten MÅSTE innehålla synlig fisk (t.ex. lax, torsk). INGEN kyckling, INGET rött kött.",
      vegetarisk: "rätten är helt VEGETARISK – inget kött, ingen kyckling, ingen fisk.",
    };
    const pKey = ((rec.protein_type as string | null) ?? "").toLowerCase().trim();
    const proteinRule = proteinMap[pKey] ?? "";
    type IngLite = { name?: string };
    const ingNames = Array.isArray(rec.ingredients)
      ? (rec.ingredients as IngLite[]).map((i) => i?.name).filter(Boolean).slice(0, 10).join(", ")
      : "";
    const prompt = `Professionell matfotografi ovanifrån av rätten "${rec.name}". ${rec.description ?? ""} ${proteinRule}${ingNames ? " Synliga ingredienser: " + ingNames + "." : ""} Vacker presentation på en tallrik, naturligt ljus, restaurangkvalitet, aptitretande, hög detalj, mörk träbakgrund.`;

    const res = await fetch(LOVABLE_IMG_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) return { image_url: null, error: "RATE_LIMIT" as const };
      if (res.status === 402) return { image_url: null, error: "NO_CREDITS" as const };
      return { image_url: null, error: ("IMG_FAIL: " + t.slice(0, 200)) as string };
    }
    const json = await res.json();
    const b64 = extractB64(json);
    if (!b64) {
      console.error("[ensureRecipeImage] Oväntad respons:", JSON.stringify(json).slice(0, 500));
      return { image_url: null, error: "NO_IMAGE_DATA" as const };
    }

    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${userId}/${rec.id}-${Date.now()}.png`;
    const up = await supabaseAdmin.storage
      .from("recipe-images")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (up.error) throw new Error("Uppladdning misslyckades: " + up.error.message);
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("recipe-images")
      .createSignedUrl(path, 60 * 60);
    if (signErr || !signed?.signedUrl) {
      return { image_url: null, error: "SIGN_FAIL" as const };
    }

    await supabaseAdmin
      .from("recipes")
      .update({ image_path: path, image_url: null })
      .eq("id", rec.id);
    return { image_url: signed.signedUrl };
  });

/**
 * Mint signed URLs for a batch of recipes. RLS via the user-scoped client
 * ensures the caller can only resolve images for recipes they're allowed
 * to see (own or public). Returns `{ [id]: signedUrl | null }`.
 */
export const signRecipeImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ recipeIds: z.array(z.string().uuid()).max(200) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase: userClient } = context;
    if (data.recipeIds.length === 0) return { urls: {} as Record<string, string | null> };
    const { data: rows, error } = await userClient
      .from("recipes")
      .select("id,image_path")
      .in("id", data.recipeIds);
    if (error) throw new Error(error.message);
    const urls: Record<string, string | null> = {};
    await Promise.all(
      (rows ?? []).map(async (r: { id: string; image_path: string | null }) => {
        if (!r.image_path) { urls[r.id] = null; return; }
        const { data: signed } = await supabaseAdmin.storage
          .from("recipe-images")
          .createSignedUrl(r.image_path, 60 * 60);
        urls[r.id] = signed?.signedUrl ?? null;
      }),
    );
    return { urls };
  });