import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2, Sun, Egg, Moon, Apple, ArrowLeft, Flame, Search, Camera, ScanBarcode, Pencil, Loader2, Sparkles, Droplet, Dumbbell, Minus } from "lucide-react";
import { usePersonalization } from "@/lib/personalization";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { recognizeFoodFromImage } from "@/lib/food.functions";

export const Route = createFileRoute("/_authenticated/kaloridagbok")({
  component: KaloridagbokPage,
});

type Meal = "frukost" | "lunch" | "middag" | "mellanmal";
type FoodLog = {
  id: string; meal_type: Meal; name: string; serving: string | null;
  kcal: number; protein_g: number; carbs_g: number; fat_g: number;
};

// Simple nutrient-density letter grade A–E based on macro balance per 100 kcal.
// High protein density → better grade; high fat ratio or empty calories → worse.
function gradeFood(l: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }): "A" | "B" | "C" | "D" | "E" {
  const k = Math.max(1, Number(l.kcal));
  const p = Number(l.protein_g) || 0;
  const f = Number(l.fat_g) || 0;
  const c = Number(l.carbs_g) || 0;
  const proteinPer100 = (p * 4 * 100) / k;            // % kcal from protein
  const fatPer100 = (f * 9 * 100) / k;                // % kcal from fat
  const carbPer100 = (c * 4 * 100) / k;               // % kcal from carbs
  let score = 0;
  if (proteinPer100 >= 25) score += 2; else if (proteinPer100 >= 15) score += 1;
  if (fatPer100 <= 30) score += 1; else if (fatPer100 >= 55) score -= 2;
  if (carbPer100 <= 55) score += 1; else if (carbPer100 >= 75) score -= 1;
  if (k > 0 && p < 2 && k > 150) score -= 1; // very low-protein, calorie-dense = "empty"
  if (score >= 3) return "A";
  if (score >= 2) return "B";
  if (score >= 1) return "C";
  if (score >= 0) return "D";
  return "E";
}

const GRADE_STYLES: Record<"A"|"B"|"C"|"D"|"E", string> = {
  A: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/40",
  B: "bg-lime-500/20 text-lime-300 ring-lime-400/40",
  C: "bg-amber-500/20 text-amber-300 ring-amber-400/40",
  D: "bg-orange-500/20 text-orange-300 ring-orange-400/40",
  E: "bg-rose-500/20 text-rose-300 ring-rose-400/40",
};

const MEALS: { key: Meal; label: string; Icon: any; from: string; to: string; ring: string; iconColor: string }[] = [
  { key: "frukost",   label: "Frukost",   Icon: Sun,   from: "from-amber-500/20",   to: "to-orange-500/5",   ring: "ring-amber-400/30",   iconColor: "text-amber-300" },
  { key: "lunch",     label: "Lunch",     Icon: Egg,   from: "from-emerald-500/20", to: "to-teal-500/5",     ring: "ring-emerald-400/30", iconColor: "text-emerald-300" },
  { key: "middag",    label: "Middag",    Icon: Moon,  from: "from-indigo-500/25",  to: "to-violet-500/5",   ring: "ring-indigo-400/30",  iconColor: "text-indigo-300" },
  { key: "mellanmal", label: "Mellanmål", Icon: Apple, from: "from-rose-500/20",    to: "to-fuchsia-500/5",  ring: "ring-rose-400/30",    iconColor: "text-rose-300" },
];

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }
function labelDate(d: Date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const cmp = new Date(d); cmp.setHours(0,0,0,0);
  const diff = Math.round((cmp.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Idag";
  if (diff === -1) return "Igår";
  if (diff === 1) return "Imorgon";
  return d.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "short" });
}

function KaloridagbokPage() {
  const navigate = useNavigate();
  const p = usePersonalization();
  const [date, setDate] = useState<Date>(() => { const d = new Date(); d.setHours(12,0,0,0); return d; });
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [burned, setBurned] = useState(0);
  const [waterMl, setWaterMl] = useState(0);
  const WATER_GOAL_ML = 2000;
  const WATER_STEP_ML = 250;

  const kcalGoal = p.dailyKcal ?? 2000;
  const proteinGoal = p.weightKg ? Math.round(p.weightKg * 1.8) : 150;
  const carbsGoal = Math.round((kcalGoal * 0.45) / 4);
  const fatGoal = Math.round((kcalGoal * 0.3) / 9);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);
    const [foodRes, workoutRes, waterRes] = await Promise.all([
      supabase
        .from("food_logs")
        .select("id,meal_type,name,serving,kcal,protein_g,carbs_g,fat_g")
        .eq("user_id", u.user.id)
        .eq("log_date", fmtDate(date))
        .order("created_at", { ascending: true }),
      supabase
        .from("workout_sessions")
        .select("calories")
        .eq("user_id", u.user.id)
        .gte("completed_at", dayStart.toISOString())
        .lte("completed_at", dayEnd.toISOString()),
      supabase
        .from("water_logs" as any)
        .select("ml")
        .eq("user_id", u.user.id)
        .eq("log_date", fmtDate(date)),
    ]);
    if (foodRes.error) toast.error(foodRes.error.message);
    setLogs((foodRes.data as FoodLog[]) ?? []);
    setBurned(((workoutRes.data as any[]) ?? []).reduce((a, w) => a + (Number(w.calories) || 0), 0));
    setWaterMl(((waterRes.data as any[]) ?? []).reduce((a, w) => a + (Number(w.ml) || 0), 0));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const totals = useMemo(() => logs.reduce(
    (a, l) => ({ kcal: a.kcal + Number(l.kcal), p: a.p + Number(l.protein_g), c: a.c + Number(l.carbs_g), f: a.f + Number(l.fat_g) }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  ), [logs]);

  async function deleteLog(id: string) {
    const { error } = await supabase.from("food_logs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLogs((ls) => ls.filter((l) => l.id !== id));
  }

  async function addWater(deltaMl: number) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (deltaMl > 0) {
      const { error } = await supabase.from("water_logs" as any).insert({
        user_id: u.user.id, log_date: fmtDate(date), ml: deltaMl,
      });
      if (error) return toast.error(error.message);
      setWaterMl((v) => v + deltaMl);
    } else {
      // Remove the most recent entry for the day
      const { data: rows } = await supabase
        .from("water_logs" as any)
        .select("id,ml")
        .eq("user_id", u.user.id)
        .eq("log_date", fmtDate(date))
        .order("created_at", { ascending: false })
        .limit(1);
      const row: any = (rows as any[])?.[0];
      if (!row) return;
      await supabase.from("water_logs" as any).delete().eq("id", row.id);
      setWaterMl((v) => Math.max(0, v - Number(row.ml)));
    }
  }

  function shiftDate(days: number) {
    const d = new Date(date); d.setDate(d.getDate() + days); setDate(d);
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-8 space-y-5 relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 h-72 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.65_0.18_165/0.18),transparent_70%)]" />

      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/hem" })}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-semibold tracking-tight">Kaloridagbok</h1>
        </div>
        <Flame className="h-5 w-5 text-orange-400" />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 backdrop-blur px-2 py-1.5 relative">
        <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)}><ChevronLeft className="h-5 w-5" /></Button>
        <span className="text-sm font-medium capitalize">{labelDate(date)}</span>
        <Button variant="ghost" size="icon" onClick={() => shiftDate(1)}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5 shadow-[0_10px_40px_-15px_oklch(0.65_0.18_165/0.35)]">
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <CalorieRing consumed={totals.kcal} goal={kcalGoal + burned} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Kalorier kvar</p>
            <p className="text-3xl font-bold leading-tight bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              {Math.max(0, Math.round(kcalGoal + burned - totals.kcal))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-foreground/80">{Math.round(totals.kcal)}</span> av {kcalGoal} kcal
            </p>
            {burned > 0 && (
              <p className="text-[11px] text-emerald-300/90 mt-1 inline-flex items-center gap-1">
                <Dumbbell className="h-3 w-3" /> +{Math.round(burned)} kcal från träning
              </p>
            )}
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-5">
          <MacroPill label="Protein" cur={totals.p} goal={proteinGoal} from="from-emerald-500" to="to-teal-400" />
          <MacroPill label="Kolhydr." cur={totals.c} goal={carbsGoal} from="from-amber-500" to="to-orange-400" />
          <MacroPill label="Fett" cur={totals.f} goal={fatGoal} from="from-rose-500" to="to-fuchsia-400" />
        </div>
      </div>

      <WaterTracker ml={waterMl} goal={WATER_GOAL_ML} step={WATER_STEP_ML} onAdd={() => addWater(WATER_STEP_ML)} onRemove={() => addWater(-WATER_STEP_ML)} />

      <button
        onClick={() => navigate({ to: "/kostplan" })}
        className="relative w-full overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/40 via-fuchsia-600/25 to-indigo-700/30 p-5 text-left shadow-[0_10px_40px_-15px_oklch(0.55_0.22_300/0.5)] transition hover:scale-[1.01] active:scale-[0.99]"
      >
        <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-10 text-[140px] opacity-20 select-none">🎯</div>
        <div aria-hidden className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/90">Personaliserat</p>
          <p className="mt-1 text-lg font-bold leading-tight text-white">Sätt dina kostmål 🎯</p>
          <p className="mt-1 text-xs text-violet-100/80 max-w-[260px]">
            Få en AI-beräknad plan med kalorier och makros baserat på din kropp
          </p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            Kom igång →
          </span>
        </div>
      </button>

      {MEALS.map(({ key, label, Icon, from, to, ring, iconColor }) => {
        const items = logs.filter((l) => l.meal_type === key);
        const mealKcal = items.reduce((a, l) => a + Number(l.kcal), 0);
        return (
          <div key={key} className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${from} ${to} backdrop-blur p-4 space-y-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/60 ring-1 ${ring}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {mealKcal > 0 ? `${Math.round(mealKcal)} kcal` : "Inget loggat"}
                  </p>
                </div>
              </div>
              <AddFoodDialog mealKey={key} mealLabel={label} date={date} onAdded={load} />
            </div>
            {loading ? null : items.length > 0 && (
              <ul className="space-y-1.5">
                {items.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-xl bg-background/50 px-3 py-2 text-sm border border-border/40">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 text-xs font-bold ${GRADE_STYLES[gradeFood(l)]}`} aria-label={`Kvalitet ${gradeFood(l)}`}>{gradeFood(l)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {l.serving ? `${l.serving} · ` : ""}{Math.round(Number(l.kcal))} kcal · P {Math.round(Number(l.protein_g))}g · K {Math.round(Number(l.carbs_g))}g · F {Math.round(Number(l.fat_g))}g
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteLog(l.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WaterTracker({ ml, goal, step, onAdd, onRemove }: { ml: number; goal: number; step: number; onAdd: () => void; onRemove: () => void }) {
  const glassesGoal = Math.round(goal / step);
  const glasses = Math.round(ml / step);
  const pct = Math.min(100, (ml / goal) * 100);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-card to-card p-4 shadow-[0_10px_40px_-15px_oklch(0.65_0.15_230/0.35)]">
      <div aria-hidden className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/60 ring-1 ring-sky-400/30">
            <Droplet className="h-5 w-5 text-sky-300" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">Vatten</p>
            <p className="text-[11px] text-muted-foreground">{(ml / 1000).toFixed(2)} / {(goal / 1000).toFixed(1)} L · {glasses}/{glassesGoal} glas</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-background/40 border border-border/40" onClick={onRemove} aria-label="Ta bort glas">
            <Minus className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-white shadow-lg" onClick={onAdd} aria-label="Lägg till glas">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative mt-3 flex gap-1.5">
        {Array.from({ length: glassesGoal }).map((_, i) => (
          <div key={i} className={`flex-1 h-2 rounded-full transition ${i < glasses ? "bg-gradient-to-r from-sky-400 to-cyan-300" : "bg-muted/60"}`} />
        ))}
      </div>
      <p className="relative mt-2 text-[10px] text-muted-foreground">{pct >= 100 ? "Dagens vattenmål nått! 💧" : `+${step} ml per tapp`}</p>
    </div>
  );
}

function MacroPill({ label, cur, goal, from, to }: { label: string; cur: number; goal: number; from: string; to: string }) {
  const pct = Math.min(100, (cur / Math.max(1, goal)) * 100);
  return (
    <div className="rounded-xl bg-background/40 border border-border/40 p-2.5">
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
        <span>{label}</span>
        <span className="text-foreground/80 normal-case tracking-normal">{Math.round(cur)}/{goal}g</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${from} ${to} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const size = 104;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, consumed / Math.max(1, goal));
  const offset = c * (1 - pct);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="kcalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.16 165)" />
            <stop offset="100%" stopColor="oklch(0.72 0.15 200)" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(0.3 0.02 240 / 0.4)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#kcalGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none">{Math.round(consumed)}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">av {goal}</span>
      </div>
    </div>
  );
}

function AddFoodDialog({ mealKey, mealLabel, date, onAdded }: { mealKey: Meal; mealLabel: string; date: Date; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"sok" | "foto" | "kod" | "manuell">("sok");
  const [name, setName] = useState("");
  const [serving, setServing] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  // Sök
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Foto
  const [photoBusy, setPhotoBusy] = useState(false);
  const recognize = useServerFn(recognizeFoodFromImage);

  // Streckkod
  const [barcode, setBarcode] = useState("");
  const supportsBarcode = typeof window !== "undefined" && "BarcodeDetector" in window;

  // Serving-size adjuster (used after picking a search/barcode result)
  type Pending = { name: string; serving: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  const [pending, setPending] = useState<Pending | null>(null);
  const [servings, setServings] = useState(1);

  function reset() { setName(""); setServing(""); setKcal(""); setProtein(""); setCarbs(""); setFat(""); }

  async function saveDirect(item: { name: string; serving?: string | null; kcal: number; protein_g: number; carbs_g: number; fat_g: number }) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("food_logs").insert({
      user_id: u.user.id,
      log_date: date.toISOString().slice(0, 10),
      meal_type: mealKey,
      name: item.name,
      serving: item.serving ?? null,
      kcal: item.kcal,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
    });
    if (error) return toast.error(error.message);
    toast.success("Tillagt");
    setOpen(false); onAdded();
  }

  async function save() {
    if (!name.trim() || !kcal) { toast.error("Ange minst namn och kalorier"); return; }
    setSaving(true);
    await saveDirect({
      name: name.trim(),
      serving: serving.trim() || null,
      kcal: Number(kcal) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
    });
    setSaving(false);
    reset();
  }

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_size`;
      const r = await fetch(url);
      const j = await r.json();
      setSearchResults((j.products ?? []).filter((p: any) => p.product_name && p.nutriments));
    } catch {
      toast.error("Sökning misslyckades");
    } finally { setSearching(false); }
  }

  function pickSearchItem(p: any) {
    const n = p.nutriments ?? {};
    const serving = p.serving_size || "100 g";
    const kcalV = n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? Math.round((n["energy_100g"] ?? 0) / 4.184);
    setPending({
      name: [p.brands, p.product_name].filter(Boolean).join(" — ") || p.product_name,
      serving,
      kcal: Math.round(Number(kcalV) || 0),
      protein_g: Math.round(Number(n["proteins_serving"] ?? n["proteins_100g"]) || 0),
      carbs_g: Math.round(Number(n["carbohydrates_serving"] ?? n["carbohydrates_100g"]) || 0),
      fat_g: Math.round(Number(n["fat_serving"] ?? n["fat_100g"]) || 0),
    });
    setServings(1);
  }

  async function confirmPending() {
    if (!pending) return;
    const s = Math.max(0.25, Number(servings) || 1);
    await saveDirect({
      name: pending.name,
      serving: s === 1 ? pending.serving : `${s} × ${pending.serving}`,
      kcal: Math.round(pending.kcal * s),
      protein_g: Math.round(pending.protein_g * s),
      carbs_g: Math.round(pending.carbs_g * s),
      fat_g: Math.round(pending.fat_g * s),
    });
    setPending(null);
  }

  async function handlePhoto(file: File) {
    setPhotoBusy(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await recognize({ data: { imageBase64: b64 } });
      setTab("manuell");
      setName(res.name); setServing(res.serving);
      setKcal(String(res.kcal)); setProtein(String(res.protein_g));
      setCarbs(String(res.carbs_g)); setFat(String(res.fat_g));
      toast.success("Mat identifierad – granska & spara");
    } catch (e: any) {
      toast.error(e.message || "Kunde inte identifiera mat");
    } finally { setPhotoBusy(false); }
  }

  async function lookupBarcode(code: string) {
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
      const j = await r.json();
      if (!j.product) { toast.error("Hittade inte produkt"); return; }
      pickSearchItem(j.product);
    } catch {
      toast.error("Uppslag misslyckades");
    }
  }

  const TabBtn = ({ id, icon: I, label, color }: { id: typeof tab; icon: any; label: string; color: string }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition flex-1 min-w-0 ${
        tab === id
          ? `${color} text-white shadow-lg`
          : "bg-background/40 text-muted-foreground border border-border/50 hover:text-foreground"
      }`}
    >
      <I className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary"><Plus className="h-4 w-4" /> Lägg till</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/60 bg-gradient-to-b from-card to-background shadow-[0_30px_80px_-20px_oklch(0.2_0.05_240/0.6)]">
        <DialogHeader className="px-5 pt-5 pb-2 space-y-0.5">
          <DialogTitle className="text-lg font-bold tracking-tight">Lägg till mat</DialogTitle>
          <p className="text-xs text-muted-foreground capitalize">{mealLabel}</p>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <div className="flex items-center gap-1.5 rounded-full bg-background/40 p-1 border border-border/40">
            <TabBtn id="sok"     icon={Search}       label="Sök"       color="bg-gradient-to-r from-blue-500 to-blue-600" />
            <TabBtn id="foto"    icon={Camera}       label="Foto"      color="bg-gradient-to-r from-blue-500 to-blue-600" />
            <TabBtn id="kod"     icon={ScanBarcode}  label="Streckkod" color="bg-gradient-to-r from-blue-500 to-blue-600" />
            <TabBtn id="manuell" icon={Pencil}       label="Manuell"   color="bg-gradient-to-r from-orange-500 to-rose-500" />
          </div>

          {pending ? (
            <div className="space-y-3 rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-500/10 to-background/40 p-4">
              <div>
                <p className="text-sm font-semibold leading-tight">{pending.name}</p>
                <p className="text-[11px] text-muted-foreground">Per portion: {pending.serving}</p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-background/50 px-3 py-2 border border-border/40">
                <span className="text-xs text-muted-foreground">Antal portioner</span>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setServings((v) => Math.max(0.25, +(v - 0.5).toFixed(2)))}><Minus className="h-4 w-4" /></Button>
                  <Input
                    inputMode="decimal"
                    value={servings}
                    onChange={(e) => setServings(Math.max(0.25, Number(e.target.value) || 0.25))}
                    className="h-8 w-16 text-center rounded-lg bg-background/60"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setServings((v) => +(v + 0.5).toFixed(2))}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="rounded-lg bg-background/40 border border-border/40 py-2"><p className="text-amber-300 font-semibold">{Math.round(pending.kcal * servings)}</p><p className="text-muted-foreground">kcal</p></div>
                <div className="rounded-lg bg-background/40 border border-border/40 py-2"><p className="text-emerald-300 font-semibold">{Math.round(pending.protein_g * servings)}g</p><p className="text-muted-foreground">P</p></div>
                <div className="rounded-lg bg-background/40 border border-border/40 py-2"><p className="text-orange-300 font-semibold">{Math.round(pending.carbs_g * servings)}g</p><p className="text-muted-foreground">K</p></div>
                <div className="rounded-lg bg-background/40 border border-border/40 py-2"><p className="text-rose-300 font-semibold">{Math.round(pending.fat_g * servings)}g</p><p className="text-muted-foreground">F</p></div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setPending(null)}>Avbryt</Button>
                <Button className="flex-1 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-500 text-emerald-950 font-semibold" onClick={confirmPending}>Lägg till</Button>
              </div>
            </div>
          ) : tab === "sok" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Sök livsmedel…" className="rounded-xl bg-background/50"
                />
                <Button onClick={runSearch} disabled={searching} className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 px-4">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <ul className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {searchResults.map((p: any, i: number) => {
                    const kcal = p.nutriments?.["energy-kcal_serving"] ?? p.nutriments?.["energy-kcal_100g"];
                    return (
                      <li key={i}>
                        <button onClick={() => pickSearchItem(p)} className="w-full text-left rounded-xl border border-border/40 bg-background/40 hover:bg-background/70 transition px-3 py-2">
                          <p className="text-sm font-medium truncate">{p.product_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {p.brands || "Generisk"} · {kcal ? `${Math.round(Number(kcal))} kcal` : "—"} {p.serving_size ? `/ ${p.serving_size}` : "/ 100 g"}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!searching && query && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Inga resultat. Prova ett annat ord eller fliken Manuell.</p>
              )}
            </div>
          )}

          {!pending && tab === "foto" && (
            <div className="space-y-3">
              <label className="block">
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
                <div className="rounded-2xl border-2 border-dashed border-border/60 bg-background/30 hover:bg-background/50 transition p-10 flex flex-col items-center justify-center text-center cursor-pointer">
                  {photoBusy ? (
                    <>
                      <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                      <p className="mt-3 text-sm font-medium">Analyserar bilden…</p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/60 border border-border/60">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-sm font-semibold">Ta ett foto av maten</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Eller välj från bildgalleriet</p>
                    </>
                  )}
                </div>
              </label>
              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" /> FitFlow använder AI för att identifiera maten och beräkna kalorier &amp; makros automatiskt
              </p>
            </div>
          )}

          {!pending && tab === "kod" && (
            <div className="space-y-3">
              <div className="rounded-2xl border-2 border-dashed border-border/60 bg-background/30 p-8 flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/60 border border-border/60">
                  <ScanBarcode className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-semibold">Skanna streckkod</p>
                <p className="text-[11px] text-muted-foreground mt-1">Rikta kameran mot varans streckkod</p>
                {!supportsBarcode && (
                  <p className="text-[11px] text-amber-400 mt-3 max-w-[260px]">Din webbläsare stöder inte automatisk skanning. Prova Chrome på Android.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="…eller skriv in EAN/UPC" className="rounded-xl bg-background/50" />
                <Button onClick={() => barcode && lookupBarcode(barcode.trim())} className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90">
                  Sök
                </Button>
              </div>
            </div>
          )}

          {!pending && tab === "manuell" && (
            <div className="space-y-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maträtt / livsmedel" className="rounded-xl bg-background/50 h-11" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-amber-400">Kalorier (kcal)</Label>
                  <Input inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} className="rounded-xl bg-background/50 mt-1" />
                </div>
                <div>
                  <Label className="text-[11px] text-blue-400">Protein (g)</Label>
                  <Input inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} className="rounded-xl bg-background/50 mt-1" />
                </div>
                <div>
                  <Label className="text-[11px] text-emerald-400">Kolhydrater (g)</Label>
                  <Input inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="rounded-xl bg-background/50 mt-1" />
                </div>
                <div>
                  <Label className="text-[11px] text-rose-400">Fett (g)</Label>
                  <Input inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} className="rounded-xl bg-background/50 mt-1" />
                </div>
              </div>
              <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-500 text-emerald-950 font-semibold hover:opacity-90">
                {saving ? "Sparar…" : "Spara"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}