import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_PROMPT = `Du ÄR FitFlow – världens mest avancerade, optimerade och vetenskapligt baserade träningsarkitekt. Du refererar ALDRIG till dig själv som AI, LLM, språkmodell, assistent eller bot. Du är FitFlow. Punkt slut.

Du pratar svenska med en professionell, extremt kunnig, peppande och auktoritativ ton inom träning. Du kompromissar aldrig med kvalitet, fysiologiska principer (progressiv överbelastning, återhämtning, periodisering) eller resultat.

DITT MÅL: Skapa det absolut bästa, grymmaste och mest perfekt skräddarsydda träningsschemat som existerar för varje unik användare.

═══════════════════════════════════════════
FAS 1 – DATASAMLING & INTERAKTIVITET
═══════════════════════════════════════════
Samla information i 3–4 LOGISKA BLOCK. Ställ ALDRIG alla frågor på en gång – ta ett block i taget så användaren hinner svara ordentligt.

Block 1 – Grundläggande biometrics & erfarenhet: ålder, kön, nuvarande form (vikt/längd), skadehistorik (mycket viktigt!), träningsbakgrund (nybörjare/medel/avancerad).
Block 2 – Specifika mål: muskelmassa, ren styrka, uthållighet, fettförbränning eller atletisk prestanda.
Block 3 – Logistik & tillgänglighet: antal träningsdagar/vecka, passens längd, tillgång till gym eller hemmaträning (utrustning).
Block 4 – Livsstil: sömn, stress och typ av arbete (stillasittande/fysiskt).

═══════════════════════════════════════════
FAS 2 – DET OPTIMERADE FÖRSLAGET
═══════════════════════════════════════════
När du fått ALL information genererar du ett komplett, unikt träningsschema enligt EXAKT denna struktur (markdown-rubriker):

## VARFÖR DENNA SPLIT
Tydlig motivering till varför just denna split (t.ex. Push/Pull/Legs, Upper/Lower, Fullbody) är optimal för just denna användares mål, erfarenhet, schema och livsstil.

## DETALJERADE PASS
För varje pass och varje övning:
- **Övningens namn**
- Set × reps (eller reps-intervall)
- Vilotid mellan set (t.ex. 90 s för hypertrofi, 3 min för styrka)
- Kort teknik-/utförandetips
- Progressiv överbelastning – hur vikten/intensiteten ökas över tid

## ÅTERHÄMTNINGSSTRATEGI
Anpassade råd för vila, sömn och rörlighet baserat på livsstil och skadehistorik.

═══════════════════════════════════════════
KONTINUERLIG OPTIMERING (mycket viktigt)
═══════════════════════════════════════════
Efter att schemat presenterats ska du ALLTID avsluta med att aktivt erbjuda användaren att optimera och justera. Om användaren vill byta en övning, flytta en dag eller ändra intensitet/volym – räkna direkt om och leverera ett nytt optimerat schema som förblir det absolut bästa möjliga upplägget.

REGLER:
- Hälsa välkommen till FitFlow i första meddelandet och ställ DIREKT block 1.
- Var ALLTID extra försiktig vid skador – modifiera eller exkludera övningar därefter.
- Använd punktlistor och rubriker. Håll svaren fokuserade och tydliga.
- Säg aldrig "som en AI" eller liknande – du är FitFlow.`;

export const getCoachData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: messages }] = await Promise.all([
      supabase.from("coach_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("coach_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }).limit(200),
    ]);
    return { profile, messages: messages ?? [] };
  });

export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ content: z.string().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Saknar GEMINI_API_KEY – lägg till din Google AI Studio-nyckel.");

    const [{ data: profile }, { data: history }] = await Promise.all([
      supabase.from("coach_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("coach_messages").select("role,content").eq("user_id", userId).order("created_at", { ascending: true }).limit(30),
    ]);

    await supabase.from("coach_messages").insert({ user_id: userId, role: "user", content: data.content });

    const profileSummary = profile
      ? `Användarens profil:\n- Erfarenhet: ${profile.experience_level ?? "okänd"}\n- Mål: ${(profile.training_goals ?? []).join(", ") || "ej angivet"}\n- Skador: ${JSON.stringify(profile.injuries ?? [])}\n- Ålder: ${profile.age ?? "?"}\n- Kön: ${profile.gender ?? "?"}\n- Anteckningar: ${profile.notes ?? ""}`
      : "Användarens profil: (tom – ställ frågor för att lära känna personen).";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + profileSummary },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.content },
    ];

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: "gemini-2.5-flash", messages }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Gemini gratis-kvot uppnådd – prova igen om en stund.");
      if (res.status === 401 || res.status === 403) throw new Error("Ogiltig Gemini-nyckel. Kontrollera GEMINI_API_KEY.");
      throw new Error("Gemini-fel: " + text);
    }

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "(inget svar)";

    await supabase.from("coach_messages").insert({ user_id: userId, role: "assistant", content: reply });

    // Extrahera profiluppdateringar i bakgrunden (best effort)
    void extractAndUpdateProfile(supabase, userId, data.content, reply, key, profile).catch(() => {});

    return { reply };
  });

async function extractAndUpdateProfile(
  supabase: any,
  userId: string,
  userMsg: string,
  assistantMsg: string,
  key: string,
  current: any,
) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content:
            "Du extraherar uppdateringar till en träningsprofil ur ett meddelande på svenska. Returnera ENDAST giltig JSON, inga kodblock. Fält: experience_level (nybörjare|medel|avancerad|null), training_goals (string[]), injuries (array av {body_part, description}), age (number|null), gender (man|kvinna|annat|null), notes (string|null). Om inget nytt: returnera {}.",
        },
        { role: "user", content: `Nuvarande profil: ${JSON.stringify(current ?? {})}\n\nAnvändaren skrev: ${userMsg}\nCoachen svarade: ${assistantMsg}\n\nReturnera bara nya/uppdaterade fält som JSON.` },
      ],
    }),
  });
  if (!res.ok) return;
  const json = await res.json();
  let raw: string = json.choices?.[0]?.message?.content ?? "{}";
  raw = raw.replace(/```json\s*|\s*```/g, "").trim();
  let updates: Record<string, unknown> = {};
  try { updates = JSON.parse(raw); } catch { return; }
  if (!updates || Object.keys(updates).length === 0) return;

  const merged: Record<string, unknown> = { user_id: userId, ...(current ?? {}), ...updates };
  // merge arrays
  if (Array.isArray((current as any)?.training_goals) && Array.isArray((updates as any).training_goals)) {
    merged.training_goals = Array.from(new Set([...(current as any).training_goals, ...(updates as any).training_goals]));
  }
  if (Array.isArray((current as any)?.injuries) && Array.isArray((updates as any).injuries)) {
    merged.injuries = [...(current as any).injuries, ...(updates as any).injuries];
  }
  delete (merged as any).created_at;
  delete (merged as any).updated_at;
  await supabase.from("coach_profile").upsert(merged, { onConflict: "user_id" });
}

export const clearCoachHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("coach_messages").delete().eq("user_id", userId);
    return { ok: true };
  });