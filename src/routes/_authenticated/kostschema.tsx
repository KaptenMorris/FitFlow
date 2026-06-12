import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, RefreshCw, Trash2, Flame, ChevronDown, Pencil,
  Plus, Check, Pizza, BookOpen, Info, X, Clock, Users, Lightbulb, ChefHat, Minus, Sparkles,
  ShoppingCart, Share2, Copy, MoreVertical, Apple, Beef, Milk, Wheat, Package,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/kostschema")({
  component: KostschemaPage,
});

const DAYS = [
  { full: "Måndag", short: "Mån", cheat: false },
  { full: "Tisdag", short: "Tis", cheat: false },
  { full: "Onsdag", short: "Ons", cheat: false },
  { full: "Torsdag", short: "Tors", cheat: false },
  { full: "Fredag", short: "Fre", cheat: true },
  { full: "Lördag", short: "Lör", cheat: true },
  { full: "Söndag", short: "Sön", cheat: true },
];
const TOTAL_WEEKS = 12;

type Plan = {
  id: string;
  goals: string[];
  gender: string | null;
  birth_year: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  cheat_days: string[];
  created_at: string;
};

type Ingredient = { qty: number; unit: string; name: string; alt?: string };
type RecipeVariant = {
  title: string;
  cookMin: number;
  ingredients: Ingredient[];
  steps: string[];
  tip?: string;
};
type Meal = {
  name: string;
  time: string;
  kcal: number;
  p: number; c: number; f: number;
  variants: RecipeVariant[];
};

const SAMPLE_MEALS: Meal[] = [
  {
    name: "Frukost", time: "08:00", kcal: 450, p: 20, c: 40, f: 10,
    variants: [
      { title: "Avokadotoast med ägg", cookMin: 10,
        ingredients: [
          { qty: 2, unit: "st", name: "ägg" },
          { qty: 1, unit: "skiva", name: "fullkornsbröd", alt: "1 skiva surdegsbröd" },
          { qty: 0.5, unit: "st", name: "avokado" },
          { qty: 1, unit: "tsk", name: "olivolja" },
        ],
        steps: [
          "Rosta brödet gyllenbrunt.",
          "Stek äggen i olivolja efter smak.",
          "Mosa avokadon och bred på brödet.",
          "Toppa med äggen, salta och peppra.",
        ],
        tip: "Pressa över lite citron för extra fräschör." },
      { title: "Proteinhavregryn med bär", cookMin: 8,
        ingredients: [
          { qty: 60, unit: "g", name: "havregryn" },
          { qty: 250, unit: "ml", name: "mjölk", alt: "250 ml havredryck" },
          { qty: 1, unit: "skopa", name: "vaniljprotein" },
          { qty: 50, unit: "g", name: "blåbär" },
        ],
        steps: ["Koka havregrynen i mjölken.", "Rör ner proteinpulvret när gröten svalnat.", "Toppa med bär."],
        tip: "Tillsätt en tsk honung om du vill ha mer sötma." },
    ],
  },
  {
    name: "Mellanmål 1", time: "10:30", kcal: 220, p: 12, c: 25, f: 6,
    variants: [
      { title: "Banan & mandlar", cookMin: 2,
        ingredients: [{ qty: 1, unit: "st", name: "banan" }, { qty: 30, unit: "g", name: "mandlar", alt: "30 g cashewnötter" }],
        steps: ["Skala bananen.", "Ät tillsammans med mandlarna."],
        tip: "Förvara mandlarna i en liten burk för enkel snacks." },
    ],
  },
  {
    name: "Lunch", time: "12:30", kcal: 600, p: 40, c: 60, f: 15,
    variants: [
      { title: "Kyckling med quinoa & grönsaker", cookMin: 25,
        ingredients: [
          { qty: 150, unit: "g", name: "kycklingfilé" },
          { qty: 100, unit: "g", name: "quinoa", alt: "100 g basmatiris" },
          { qty: 200, unit: "g", name: "blandade grönsaker" },
          { qty: 1, unit: "msk", name: "olivolja" },
        ],
        steps: [
          "Koka quinoan enligt anvisning.",
          "Stek kycklingen i olivolja, krydda med salt och peppar.",
          "Sautera grönsakerna kort.",
          "Servera tillsammans.",
        ],
        tip: "Pressa över lime för en fräsch touch." },
    ],
  },
  {
    name: "Mellanmål 2", time: "15:00", kcal: 200, p: 18, c: 15, f: 6,
    variants: [
      { title: "Grekisk yoghurt med bär", cookMin: 2,
        ingredients: [{ qty: 200, unit: "g", name: "grekisk yoghurt" }, { qty: 50, unit: "g", name: "blandade bär" }],
        steps: ["Lägg yoghurten i en skål.", "Toppa med bären."],
        tip: "Strö över krossade nötter för extra crunch." },
    ],
  },
  {
    name: "Middag", time: "18:30", kcal: 580, p: 38, c: 45, f: 18,
    variants: [
      { title: "Ugnsbakad lax med sötpotatis och broccoli", cookMin: 30,
        ingredients: [
          { qty: 200, unit: "g", name: "lax" },
          { qty: 150, unit: "g", name: "sötpotatis", alt: "150 g vanlig potatis" },
          { qty: 150, unit: "g", name: "broccoli", alt: "150 g blomkål" },
          { qty: 1, unit: "msk", name: "olivolja", alt: "1 msk rapsolja" },
          { qty: 1, unit: "tsk", name: "citronsaft" },
        ],
        steps: [
          "Sätt ugnen på 200 grader Celsius.",
          "Skala och skär sötpotatisen i tärningar. Koka dem i lättsaltat vatten i ca 10 minuter.",
          "Lägg laxen i en ugnsform och krydda med salt, peppar och citronsaft.",
          "Lägg broccoli och den kokta sötpotatisen runt laxen, ringla över olivolja.",
          "Grädda i ugnen i ca 15–20 minuter, tills laxen är genomstekt och grönsakerna är mjuka.",
        ],
        tip: "För extra smak, tillsätt några färska örter som dill eller persilja." },
      { title: "Kycklinglår med rotfrukter", cookMin: 40,
        ingredients: [
          { qty: 200, unit: "g", name: "kycklinglår" },
          { qty: 200, unit: "g", name: "rotfrukter", alt: "200 g sötpotatis" },
          { qty: 1, unit: "msk", name: "olivolja" },
          { qty: 1, unit: "tsk", name: "timjan" },
        ],
        steps: ["Sätt ugnen på 200°C.", "Skär rotfrukterna och lägg i ugnsform.", "Lägg kycklinglåren ovanpå.", "Krydda och ringla över olja.", "Tillaga 35–40 minuter."],
        tip: "Vänd rotfrukterna efter halva tiden för jämn färg." },
    ],
  },
  {
    name: "Mellanmål 3", time: "20:30", kcal: 150, p: 12, c: 12, f: 5,
    variants: [
      { title: "Äpple & cottage cheese", cookMin: 2,
        ingredients: [{ qty: 1, unit: "st", name: "äpple" }, { qty: 2, unit: "msk", name: "cottage cheese" }],
        steps: ["Skär äpplet i klyftor.", "Servera med cottage cheese."],
        tip: "Strö lite kanel ovanpå för bättre smak." },
    ],
  },
  {
    name: "Kvällsmat", time: "21:30", kcal: 100, p: 10, c: 5, f: 3,
    variants: [
      { title: "Vetekaka med smör", cookMin: 2,
        ingredients: [{ qty: 1, unit: "st", name: "vetekaka" }, { qty: 1, unit: "tsk", name: "smör" }],
        steps: ["Bred smör på vetekakan."],
        tip: "Toppa med en skiva ost för extra protein." },
    ],
  },
];

function KostschemaPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState(1);
  const [openDay, setOpenDay] = useState<string | null>("Måndag");
  const [checkedMeals, setCheckedMeals] = useState<Set<string>>(new Set());
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Meal | null>(null);
  const [showShopping, setShowShopping] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("diet_plans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setPlan(data as Plan | null);
      setLoading(false);
    })();
  }, []);

  const macros = useMemo(() => calcMacros(plan), [plan]);
  const totalMeals = SAMPLE_MEALS.length * 4; // 4 träningsdagar
  const consumedMeals = checkedMeals.size;
  const completionPct = Math.round((consumedMeals / totalMeals) * 100);

  const toggleMeal = (key: string) => {
    setCheckedMeals((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Laddar ditt schema…
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-sm text-muted-foreground">Du har inget kostschema ännu.</p>
        <button
          onClick={() => navigate({ to: "/kostplan" })}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20"
        >Skapa schema</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-foreground pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0e14]/80 border-b border-white/5">
        <div className="relative flex items-center justify-center h-12 px-4 max-w-3xl mx-auto">
          <button
            onClick={() => navigate({ to: "/hem" })}
            className="absolute left-3 inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Tillbaka
          </button>
          <p className="text-sm font-semibold tracking-wide">Kostplan</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-3xl mx-auto">
        {/* Plan switcher tabs */}
        <div className="flex items-center gap-2">
          <button className="px-3.5 py-1.5 rounded-full text-[12px] font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-emerald-950 shadow-lg shadow-emerald-500/25">
            Viktminskning · 12v
          </button>
          <button className="px-3 py-1.5 rounded-full text-[12px] font-semibold border border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] transition inline-flex items-center gap-1">
            <Plus className="h-3 w-3" /> Ny
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <IconBtn><RefreshCw className="h-4 w-4" /></IconBtn>
            <IconBtn><Trash2 className="h-4 w-4" /></IconBtn>
          </div>
        </div>

        {/* Generate shopping list */}
        <button
          onClick={() => setShowShopping(true)}
          className="group w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-emerald-500/5 px-4 py-3.5 flex items-center gap-3 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/10 transition"
        >
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-emerald-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition">
            <ShoppingCart className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-extrabold">Generera inköpslista</p>
            <p className="text-[11px] text-muted-foreground">Smart sammanställning från ditt schema</p>
          </div>
          <ChevronRight className="h-4 w-4 text-emerald-400" />
        </button>

        {/* Title + pills */}
        <div className="space-y-2.5">
          <h1 className="text-[26px] font-extrabold tracking-tight leading-tight bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
            12-veckors kostschema
          </h1>
          <div className="flex flex-wrap gap-2">
            <Pill color="emerald">Gå ner i vikt</Pill>
            <Pill color="amber">{macros.totalKcal} kcal/dag</Pill>
          </div>
        </div>

        {/* Week navigator */}
        <PremiumCard>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeek((w) => Math.max(1, w - 1))}
              disabled={week === 1}
              className="h-10 w-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 flex items-center justify-center transition"
            ><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80 font-semibold">Aktiv vecka</p>
              <p className="text-xl font-extrabold mt-0.5">Vecka {week}</p>
              <p className="text-[11px] text-muted-foreground">av {TOTAL_WEEKS} veckor</p>
            </div>
            <button
              onClick={() => setWeek((w) => Math.min(TOTAL_WEEKS, w + 1))}
              disabled={week === TOTAL_WEEKS}
              className="h-10 w-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 flex items-center justify-center transition"
            ><ChevronRight className="h-4 w-4" /></button>
          </div>
        </PremiumCard>

        {/* Total progress */}
        <PremiumCard>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-semibold">Totalt genomfört</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {consumedMeals} av {totalMeals} måltider klara
              </p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-400 tabular-nums">{completionPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </PremiumCard>

        {/* Weekly day tracker */}
        <PremiumCard>
          <p className="text-sm font-semibold mb-3">Veckans framsteg</p>
          <div className="flex justify-between gap-1.5">
            {DAYS.map((d, i) => {
              const todayIdx = (new Date().getDay() + 6) % 7;
              const isToday = i === todayIdx;
              return (
                <div key={d.full} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={cn(
                    "relative h-10 w-10 rounded-xl flex items-center justify-center border transition",
                    isToday
                      ? "border-primary/70 bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-[0_0_18px_oklch(0.7_0.2_220/0.55)] ring-2 ring-primary/40"
                      : d.cheat
                        ? "border-orange-500/40 bg-gradient-to-br from-orange-500/20 to-rose-500/10 text-orange-300"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground",
                  )}>
                    {d.cheat ? <Pizza className="h-4 w-4" /> : <Check className={cn("h-4 w-4", isToday ? "opacity-90" : "opacity-30")} />}
                    {isToday && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.7_0.2_220)] animate-pulse" />}
                  </div>
                  <span className={cn("text-[10px] font-medium", isToday ? "text-primary font-bold" : "text-muted-foreground")}>{d.short}</span>
                </div>
              );
            })}
          </div>
        </PremiumCard>

        {/* Macros */}
        <PremiumCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Makrofördelning</p>
              <p className="text-[11px] text-muted-foreground">Snitt per aktiv dag</p>
            </div>
            <button className="h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-5">
            <Donut macros={macros} />
            <div className="flex-1 space-y-2.5 text-xs">
              <MacroRow color="emerald" label="Protein" grams={macros.proteinG} pct={macros.proteinPct} />
              <MacroRow color="amber" label="Kolhydrater" grams={macros.carbsG} pct={macros.carbsPct} />
              <MacroRow color="rose" label="Fett" grams={macros.fatG} pct={macros.fatPct} />
            </div>
          </div>

          {/* Expandable nutrition info */}
          <button
            onClick={() => setShowNutritionInfo((v) => !v)}
            className="mt-4 w-full h-11 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 flex items-center justify-between text-[13px] font-semibold transition"
          >
            <span className="inline-flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-emerald-400" />
              Näringslära — vad gör vad?
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showNutritionInfo && "rotate-180")} />
          </button>
          {showNutritionInfo && (
            <div className="mt-3 space-y-2 text-[12px] text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
              <p><span className="text-emerald-300 font-semibold">Protein</span> bygger och reparerar muskler.</p>
              <p><span className="text-amber-300 font-semibold">Kolhydrater</span> ger snabb energi för träning.</p>
              <p><span className="text-rose-300 font-semibold">Fett</span> stödjer hormoner och cellfunktion.</p>
            </div>
          )}
        </PremiumCard>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={`${consumedMeals}`} label="Måltider klara" accent="emerald" />
          <Stat value="3 / 7" label="Dagar klara" accent="cyan" />
          <Stat value="3" label="Cheat days" accent="orange" />
        </div>

        {/* Weekly meals accordion */}
        <div className="pt-3 space-y-2">
          <h2 className="text-lg font-extrabold">Veckans måltider</h2>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Klicka på en dag för att se måltider. Rödmarkerade är cheat days.
          </p>

          <div className="space-y-2 pt-1">
            {DAYS.map((d, i) => {
              const open = openDay === d.full;
              const todayIdx = (new Date().getDay() + 6) % 7;
              const isToday = i === todayIdx;
              const dayMealsCount = SAMPLE_MEALS.length;
              const dayChecked = SAMPLE_MEALS.filter((m) => checkedMeals.has(`${d.full}|${m.name}`)).length;
              const dayPct = Math.round((dayChecked / dayMealsCount) * 100);
              return (
                <div
                  key={d.full}
                  className={cn(
                    "rounded-2xl border overflow-hidden transition",
                    isToday
                      ? "border-primary/60 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent shadow-[0_0_24px_-4px_oklch(0.7_0.2_220/0.55)] ring-1 ring-primary/40"
                      : d.cheat
                        ? "border-orange-500/30 bg-gradient-to-br from-orange-950/40 via-[#1a1410] to-[#13100d]"
                        : "border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/[0.12]",
                  )}
                >
                  <button
                    onClick={() => setOpenDay(open ? null : d.full)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      isToday
                        ? "bg-primary/20 text-primary shadow-[0_0_14px_oklch(0.7_0.2_220/0.6)]"
                        : d.cheat
                          ? "bg-orange-500/15 text-orange-300"
                          : "bg-emerald-500/10 text-emerald-300",
                    )}>
                      {d.cheat ? <Pizza className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-bold", isToday && "text-primary", !isToday && d.cheat && "text-orange-200")}>{d.full}</p>
                        {isToday && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase tracking-wider">Idag</span>}
                        {d.cheat && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold uppercase tracking-wider">Cheat</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {d.cheat ? "Cheat day · fri måltid" : `${macros.totalKcal} kcal · ${dayMealsCount} måltider`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-extrabold tabular-nums",
                        d.cheat ? "text-orange-300" : "text-emerald-400",
                      )}>{dayPct}%</p>
                      <p className="text-[10px] text-muted-foreground">{dayChecked}/{dayMealsCount}</p>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                      open && "rotate-180",
                    )} />
                  </button>

                  {open && !d.cheat && (
                    <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {SAMPLE_MEALS.map((m) => {
                        const key = `${d.full}|${m.name}`;
                        const done = checkedMeals.has(key);
                        return (
                          <div
                            key={m.name}
                            className={cn(
                              "rounded-xl border p-3 transition",
                              done
                                ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                                : "border-white/[0.06] bg-[#0f1419] hover:border-white/[0.12]",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleMeal(key)}
                                className={cn(
                                  "h-6 w-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 transition",
                                  done
                                    ? "border-emerald-400 bg-emerald-400 text-emerald-950"
                                    : "border-white/20 hover:border-emerald-400/60",
                                )}
                              >
                                {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className={cn("text-sm font-bold", done && "line-through text-muted-foreground")}>{m.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{m.time} · {m.kcal} kcal</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold shrink-0">
                                    <MacroChip color="emerald">{m.p}g P</MacroChip>
                                    <MacroChip color="amber">{m.c}g C</MacroChip>
                                    <MacroChip color="rose">{m.f}g F</MacroChip>
                                  </div>
                                </div>
                                <ul className="mt-2 space-y-0.5">
                                  {m.variants[0].ingredients.slice(0, 3).map((ing) => (
                                    <li key={ing.name} className="text-[12px] text-muted-foreground flex items-center gap-2">
                                      <span className="h-1 w-1 rounded-full bg-emerald-400/60" />
                                      {formatQty(ing.qty)} {ing.unit} {ing.name}
                                    </li>
                                  ))}
                                </ul>
                                <button
                                  onClick={() => setActiveRecipe(m)}
                                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-emerald-950 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 transition"
                                >
                                  <BookOpen className="h-3 w-3" /> Visa Recept & Instruktioner
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Denna kostplan är utformad för att hjälpa till med viktminskning för en {plan.gender === "man" ? "man" : "kvinna"} med
            en vikt på {plan.current_weight_kg ?? 80} kg. Justera eller starta om från dina inställningar när som helst.
          </p>
        </div>
      </div>
      {activeRecipe && <RecipeModal meal={activeRecipe} onClose={() => setActiveRecipe(null)} />}
      {showShopping && <ShoppingListModal meals={SAMPLE_MEALS} onClose={() => setShowShopping(false)} />}
    </div>
  );
}

/* ---------- primitives ---------- */
function PremiumCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]">
      {children}
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-9 w-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground flex items-center justify-center transition">
      {children}
    </button>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: "emerald" | "amber" }) {
  const cls = {
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  }[color];
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border", cls)}>
      {children}
    </span>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent: "emerald" | "cyan" | "orange" }) {
  const cls = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    orange: "text-orange-400",
  }[accent];
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3.5 text-center">
      <p className={cn("text-2xl font-extrabold tabular-nums", cls)}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  );
}

function MacroChip({ children, color }: { children: React.ReactNode; color: "emerald" | "amber" | "rose" }) {
  const cls = {
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    rose: "bg-rose-500/15 text-rose-300",
  }[color];
  return <span className={cn("px-1.5 py-0.5 rounded", cls)}>{children}</span>;
}

function MacroRow({ color, label, grams, pct }: { color: "emerald" | "amber" | "rose"; label: string; grams: number; pct: number }) {
  const dot = {
    emerald: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    amber: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    rose: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]",
  }[color];
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", dot)} />
        <span className="text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="tabular-nums">
        <span className="font-bold text-foreground">{grams}g</span>
        <span className="text-muted-foreground ml-2 text-[11px]">{pct}%</span>
      </div>
    </div>
  );
}

function Donut({ macros }: { macros: ReturnType<typeof calcMacros> }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const segs = [
    { pct: macros.proteinPct, color: "#34d399" },
    { pct: macros.carbsPct, color: "#fbbf24" },
    { pct: macros.fatPct, color: "#fb7185" },
  ];
  let acc = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="11" />
        {segs.map((s, i) => {
          const len = (s.pct / 100) * c;
          const dasharray = `${len} ${c - len}`;
          const dashoffset = -acc;
          acc += len;
          return (
            <circle
              key={i}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="11"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
              style={{ filter: `drop-shadow(0 0 4px ${s.color}80)` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-extrabold tabular-nums leading-none">{macros.totalKcal}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">kcal</p>
      </div>
    </div>
  );
}

/* ---------- macro calc ---------- */
function calcMacros(plan: Plan | null) {
  if (!plan) return { totalKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, proteinPct: 0, carbsPct: 0, fatPct: 0 };
  const w = plan.current_weight_kg ?? 80;
  const h = plan.height_cm ?? 175;
  const age = plan.birth_year ? new Date().getFullYear() - plan.birth_year : 30;
  const isMan = plan.gender === "man";
  const bmr = 10 * w + 6.25 * h - 5 * age + (isMan ? 5 : -161);
  const af = { stilla: 1.2, latt: 1.375, mattlig: 1.55, mycket: 1.725 }[plan.activity_level ?? "mattlig"] ?? 1.55;
  let tdee = bmr * af;
  const goal = plan.goals?.[0] ?? "ner";
  if (goal === "ner") tdee *= 0.8;
  else if (goal === "bygga") tdee *= 1.1;
  else if (goal === "prestera") tdee *= 1.05;
  const totalKcal = Math.round(tdee / 50) * 50;
  const proteinG = Math.round(w * 2);
  const fatG = Math.round((totalKcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((totalKcal - proteinG * 4 - fatG * 9) / 4));
  const sum = proteinG * 4 + carbsG * 4 + fatG * 9 || 1;
  return {
    totalKcal,
    proteinG, carbsG, fatG,
    proteinPct: Math.round((proteinG * 4 / sum) * 100),
    carbsPct: Math.round((carbsG * 4 / sum) * 100),
    fatPct: Math.round((fatG * 9 / sum) * 100),
  };
}

/* ---------- helpers ---------- */
function formatQty(n: number) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(/\.0$/, "");
}

/* ---------- Recipe modal ---------- */
function RecipeModal({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const [variantIdx, setVariantIdx] = useState(0);
  const [servings, setServings] = useState(1);
  const [checkedIng, setCheckedIng] = useState<Set<string>>(new Set());
  const variant = meal.variants[variantIdx];
  const scale = servings;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-xl sm:my-6 max-h-screen sm:max-h-[92vh] overflow-y-auto bg-gradient-to-br from-[#11161d] to-[#0a0e14] sm:rounded-2xl border border-white/[0.08] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* sticky header */}
        <div className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between bg-[#0a0e14]/90 backdrop-blur-xl border-b border-white/5">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="text-sm font-bold tracking-wide">Recept</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Variant selector */}
          {meal.variants.length > 1 ? (
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              {meal.variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setVariantIdx(i)}
                  className={cn(
                    "h-11 rounded-xl text-[13px] font-bold transition",
                    i === variantIdx
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                  )}
                >Variant {i + 1}</button>
              ))}
            </div>
          ) : null}

          {/* Title */}
          <div>
            <h2 className="text-[22px] font-extrabold leading-tight tracking-tight">{variant.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-emerald-400" />{variant.cookMin} min</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-emerald-400" />{servings} {servings === 1 ? "portion" : "portioner"}</span>
              <span className="text-emerald-400 font-bold">{Math.round(meal.kcal * scale)} kcal</span>
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-2">
            <ModalMacro color="emerald" label="Protein" value={`${Math.round(meal.p * scale)}g`} />
            <ModalMacro color="amber" label="Kolhydrater" value={`${Math.round(meal.c * scale)}g`} />
            <ModalMacro color="rose" label="Fett" value={`${Math.round(meal.f * scale)}g`} />
          </div>

          {/* Portions stepper */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
            <p className="text-[13px] font-semibold">Antal portioner</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setServings((s) => Math.max(1, s - 1))} className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition"><Minus className="h-3.5 w-3.5" /></button>
              <span className="w-6 text-center font-extrabold tabular-nums">{servings}</span>
              <button onClick={() => setServings((s) => Math.min(12, s + 1))} className="h-8 w-8 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 flex items-center justify-center transition"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-[15px] font-extrabold mb-2.5">Ingredienser</h3>
            <ul className="space-y-2">
              {variant.ingredients.map((ing) => {
                const k = ing.name;
                const done = checkedIng.has(k);
                return (
                  <li key={k} className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        setCheckedIng((prev) => {
                          const n = new Set(prev);
                          if (n.has(k)) n.delete(k); else n.add(k);
                          return n;
                        });
                      }}
                      className={cn(
                        "h-5 w-5 mt-0.5 shrink-0 rounded-md border-2 flex items-center justify-center transition",
                        done ? "border-emerald-400 bg-emerald-400 text-emerald-950" : "border-white/20 hover:border-emerald-400/60",
                      )}
                    >{done && <Check className="h-3 w-3" strokeWidth={3} />}</button>
                    <div className="flex-1">
                      <p className={cn("text-[13px] font-semibold", done && "line-through text-muted-foreground")}>
                        <span className="text-emerald-300">{formatQty(ing.qty * scale)} {ing.unit}</span> {ing.name}
                      </p>
                      {ing.alt && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
                          Alternativ: {ing.alt}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-[15px] font-extrabold mb-2.5">Tillagning</h3>
            <ol className="space-y-3">
              {variant.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-emerald-950 text-[12px] font-extrabold flex items-center justify-center shadow-md shadow-emerald-500/30">
                    {i + 1}
                  </span>
                  <p className="text-[13.5px] leading-relaxed pt-0.5">{s}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Tip */}
          {variant.tip && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5">
              <p className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-emerald-300">
                <Lightbulb className="h-3.5 w-3.5" /> Tips
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">{variant.tip}</p>
            </div>
          )}

          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}

function ModalMacro({ color, label, value }: { color: "emerald" | "amber" | "rose"; label: string; value: string }) {
  const cls = {
    emerald: "from-emerald-500/15 to-emerald-500/[0.02] border-emerald-500/25 text-emerald-300",
    amber: "from-amber-500/15 to-amber-500/[0.02] border-amber-500/25 text-amber-300",
    rose: "from-rose-500/15 to-rose-500/[0.02] border-rose-500/25 text-rose-300",
  }[color];
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-2.5 text-center", cls)}>
      <p className="text-base font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}
/* ---------- Shopping list ---------- */
type Category = "Frukt & Grönt" | "Kött & Fågel / Protein" | "Mejeriprodukter" | "Skafferi & Torrvaror" | "Övrigt";

const CATEGORY_META: Record<Category, { icon: typeof Apple; color: string; ring: string }> = {
  "Frukt & Grönt":            { icon: Apple,   color: "text-emerald-300", ring: "from-emerald-500/15 to-emerald-500/[0.02] border-emerald-500/25" },
  "Kött & Fågel / Protein":   { icon: Beef,    color: "text-rose-300",    ring: "from-rose-500/15 to-rose-500/[0.02] border-rose-500/25" },
  "Mejeriprodukter":          { icon: Milk,    color: "text-cyan-300",    ring: "from-cyan-500/15 to-cyan-500/[0.02] border-cyan-500/25" },
  "Skafferi & Torrvaror":     { icon: Wheat,   color: "text-amber-300",   ring: "from-amber-500/15 to-amber-500/[0.02] border-amber-500/25" },
  "Övrigt":                   { icon: Package, color: "text-violet-300",  ring: "from-violet-500/15 to-violet-500/[0.02] border-violet-500/25" },
};

const CATEGORY_RULES: Array<[RegExp, Category]> = [
  [/(banan|äpple|bär|blåbär|broccoli|sötpotat|potat|rotfrukt|grönsak|blomkål|citron|lime|avokado)/i, "Frukt & Grönt"],
  [/(kyckling|lax|fisk|kött|nöt|fläsk|biff|färs|protein|ägg|skinka)/i, "Kött & Fågel / Protein"],
  [/(mjölk|yoghurt|cottage|ost|grädde|smör|kvarg|havredryck)/i, "Mejeriprodukter"],
  [/(havregryn|quinoa|ris|pasta|bröd|vetekaka|mandlar|nötter|cashew|olivolja|rapsolja|olja|timjan|krydd|honung|peppar|salt|surdeg|fullkorn)/i, "Skafferi & Torrvaror"],
];

function categorize(name: string): Category {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(name)) return cat;
  return "Övrigt";
}

type AggItem = { id: string; name: string; qty: number; unit: string; category: Category; custom?: boolean };

function aggregateIngredients(meals: Meal[], days: number): AggItem[] {
  // Each day contributes one variant (variant 0). days = how many training days to include.
  const map = new Map<string, AggItem>();
  for (let d = 0; d < days; d++) {
    for (const meal of meals) {
      for (const ing of meal.variants[0].ingredients) {
        const key = `${ing.name.toLowerCase()}|${ing.unit}`;
        const ex = map.get(key);
        if (ex) ex.qty += ing.qty;
        else map.set(key, {
          id: key,
          name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1),
          qty: ing.qty,
          unit: ing.unit,
          category: categorize(ing.name),
        });
      }
    }
  }
  return [...map.values()];
}

type Timeframe = { id: string; label: string; days: number };
const TIMEFRAMES: Timeframe[] = [
  { id: "week", label: "Denna vecka", days: 7 },
  { id: "3days", label: "Kommande 3 dagar", days: 3 },
  { id: "day", label: "1 dag", days: 1 },
];

function ShoppingListModal({ meals, onClose }: { meals: Meal[]; onClose: () => void }) {
  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[0]);
  const [items, setItems] = useState<AggItem[]>(() => aggregateIngredients(meals, TIMEFRAMES[0].days));
  const [done, setDone] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(aggregateIngredients(meals, timeframe.days));
    setDone(new Set());
    setRemoved(new Set());
  }, [timeframe, meals]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const visible = items.filter((i) => !removed.has(i.id));
  const active = visible.filter((i) => !done.has(i.id));
  const doneItems = visible.filter((i) => done.has(i.id));
  const grouped = active.reduce<Record<Category, AggItem[]>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {} as Record<Category, AggItem[]>);

  const toggleDone = (id: string) => setDone((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const removeItem = (id: string) => setRemoved((p) => new Set(p).add(id));
  const addCustom = () => {
    const name = newItem.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    setItems((p) => [...p, { id, name, qty: 1, unit: "st", category: categorize(name), custom: true }]);
    setNewItem("");
  };

  const buildText = () => {
    let text = `🛒 Inköpslista — ${timeframe.label}\n\n`;
    const order: Category[] = ["Frukt & Grönt", "Kött & Fågel / Protein", "Mejeriprodukter", "Skafferi & Torrvaror", "Övrigt"];
    for (const cat of order) {
      const list = (grouped[cat] || []);
      if (!list.length) continue;
      text += `${cat}:\n`;
      for (const it of list) text += `• ${it.name}: ${formatQty(it.qty)} ${it.unit}\n`;
      text += "\n";
    }
    return text.trim();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setToast("Kopierad till urklipp!");
      setTimeout(() => setToast(null), 2000);
    } catch { setToast("Kunde inte kopiera"); setTimeout(() => setToast(null), 2000); }
    setMenuOpen(false);
  };

  const handleShare = async () => {
    const text = buildText();
    if (navigator.share) {
      try { await navigator.share({ title: "Inköpslista", text }); } catch { /* avbruten */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
    setMenuOpen(false);
  };

  const categoryOrder: Category[] = ["Frukt & Grönt", "Kött & Fågel / Protein", "Mejeriprodukter", "Skafferi & Torrvaror", "Övrigt"];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-xl sm:my-6 max-h-screen sm:max-h-[92vh] overflow-y-auto bg-gradient-to-br from-[#11161d] to-[#0a0e14] sm:rounded-2xl border border-white/[0.08] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between bg-[#0a0e14]/90 backdrop-blur-xl border-b border-white/5">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-emerald-950 shadow-md shadow-emerald-500/30">
              <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-wide leading-tight">Inköpslista</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{visible.length} varor · {done.size} klara</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition">
              <MoreVertical className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-10 top-10 z-20 w-52 rounded-xl border border-white/10 bg-[#11161d] shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <button onClick={handleShare} className="w-full px-3 py-2 rounded-lg text-[13px] font-semibold text-left hover:bg-white/[0.06] transition inline-flex items-center gap-2">
                  <Share2 className="h-3.5 w-3.5 text-emerald-400" /> Dela lista
                </button>
                <button onClick={handleCopy} className="w-full px-3 py-2 rounded-lg text-[13px] font-semibold text-left hover:bg-white/[0.06] transition inline-flex items-center gap-2">
                  <Copy className="h-3.5 w-3.5 text-cyan-400" /> Kopiera till urklipp
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Timeframe selector */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-2">Tidsperiod</p>
            <div className="grid grid-cols-3 gap-2">
              {TIMEFRAMES.map((t) => {
                const active = t.id === timeframe.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTimeframe(t)}
                    className={cn(
                      "h-11 rounded-xl text-[12px] font-bold transition border",
                      active
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-emerald-950 border-transparent shadow-lg shadow-emerald-500/25"
                        : "bg-white/[0.03] border-white/10 text-muted-foreground hover:bg-white/[0.06]",
                    )}
                  >{t.label}</button>
                );
              })}
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12px] font-semibold text-muted-foreground">Framsteg</p>
              <p className="text-[12px] font-extrabold text-emerald-400 tabular-nums">
                {done.size}/{visible.length}
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                style={{ width: visible.length ? `${(done.size / visible.length) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Add custom */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 focus-within:border-emerald-500/40 transition">
            <Plus className="h-4 w-4 text-emerald-400 shrink-0" />
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
              placeholder="Lägg till vara…"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
            />
            <button
              onClick={addCustom}
              disabled={!newItem.trim()}
              className="px-3 h-8 rounded-lg text-[12px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-30 transition"
            >Lägg till</button>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            {categoryOrder.map((cat) => {
              const list = grouped[cat] || [];
              if (!list.length) return null;
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className={cn("rounded-2xl border bg-gradient-to-br p-3.5", meta.ring)}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={cn("h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center", meta.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className={cn("text-[13px] font-extrabold", meta.color)}>{cat}</p>
                    <span className="ml-auto text-[10px] text-muted-foreground font-bold">{list.length}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {list.map((it) => (
                      <ShoppingRow key={it.id} item={it} onToggle={() => toggleDone(it.id)} onRemove={() => removeItem(it.id)} />
                    ))}
                  </ul>
                </div>
              );
            })}
            {active.length === 0 && (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6 text-center">
                <p className="text-[14px] font-extrabold text-emerald-300">Allt klart! 🎉</p>
                <p className="text-[12px] text-muted-foreground mt-1">Alla varor är ikundvagnen.</p>
              </div>
            )}
          </div>

          {/* Done section */}
          {doneItems.length > 0 && (
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] p-3.5">
              <p className="text-[12px] font-extrabold text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Klara ({doneItems.length})
              </p>
              <ul className="space-y-1.5">
                {doneItems.map((it) => (
                  <ShoppingRow key={it.id} item={it} done onToggle={() => toggleDone(it.id)} onRemove={() => removeItem(it.id)} />
                ))}
              </ul>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-emerald-500 text-emerald-950 text-[12px] font-bold shadow-2xl shadow-emerald-500/40 animate-in fade-in slide-in-from-bottom-2">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function ShoppingRow({ item, done, onToggle, onRemove }: { item: AggItem; done?: boolean; onToggle: () => void; onRemove: () => void }) {
  return (
    <li className={cn(
      "group flex items-center gap-3 rounded-xl px-2.5 py-2 transition",
      done ? "opacity-50" : "hover:bg-white/[0.04]",
    )}>
      <button
        onClick={onToggle}
        className={cn(
          "h-6 w-6 shrink-0 rounded-md border-2 flex items-center justify-center transition active:scale-90",
          done ? "border-emerald-400 bg-emerald-400 text-emerald-950 shadow-md shadow-emerald-500/40" : "border-white/20 hover:border-emerald-400/60",
        )}
        aria-label={done ? "Avmarkera" : "I kundvagnen"}
      >
        {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-semibold truncate", done && "line-through")}>{item.name}</p>
      </div>
      <span className={cn(
        "text-[12px] font-extrabold tabular-nums px-2 py-0.5 rounded-md",
        done ? "text-muted-foreground" : "text-emerald-300 bg-emerald-500/10",
      )}>{formatQty(item.qty)} {item.unit}</span>
      <button
        onClick={onRemove}
        className="h-7 w-7 rounded-full bg-white/[0.04] text-muted-foreground hover:bg-rose-500/15 hover:text-rose-300 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
        aria-label="Ta bort"
      ><X className="h-3.5 w-3.5" /></button>
    </li>
  );
}
