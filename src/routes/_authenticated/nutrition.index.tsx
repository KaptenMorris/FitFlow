import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MacroRing } from "@/components/nutrition/MacroRing";
import { Plus, Copy, Trash2, Flame, ChevronLeft, ChevronRight, Sparkles, Zap, Scale } from "lucide-react";
import { getProfile, getFoodLog, deleteFoodEntry, copyDay, logWeight, getWeightEntries } from "@/lib/macrofactor/api";
import { sumEntries, todayISO, addDays, computeWeightTrend } from "@/lib/macrofactor/algorithms";
import type { Meal, FoodEntry } from "@/lib/macrofactor/types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/nutrition/")({
  component: Dashboard,
});

const MEALS: { id: Meal; label: string; icon: string }[] = [
  { id: "breakfast", label: "Frukost", icon: "🌅" },
  { id: "lunch", label: "Lunch", icon: "🥗" },
  { id: "dinner", label: "Middag", icon: "🍽️" },
  { id: "snack", label: "Mellanmål", icon: "🍎" },
];

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [weightOpen, setWeightOpen] = useState(false);
  const [weight, setWeight] = useState("");

  const profileQ = useQuery({ queryKey: ["mf-profile"], queryFn: getProfile });
  const logQ = useQuery({ queryKey: ["mf-log", date], queryFn: () => getFoodLog(date) });
  const wQ = useQuery({ queryKey: ["mf-weight", 30], queryFn: () => getWeightEntries(30) });

  const delMut = useMutation({ mutationFn: deleteFoodEntry, onSuccess: () => qc.invalidateQueries({ queryKey: ["mf-log"] }) });
  const copyMut = useMutation({
    mutationFn: () => copyDay(addDays(date, -1), date),
    onSuccess: (n) => { toast.success(`Kopierade ${n} poster från igår`); qc.invalidateQueries({ queryKey: ["mf-log"] }); },
  });
  const wMut = useMutation({
    mutationFn: (w: number) => logWeight(w),
    onSuccess: () => { toast.success("Vikt loggad"); qc.invalidateQueries({ queryKey: ["mf-weight"] }); setWeightOpen(false); setWeight(""); },
  });

  // Redirect to onboarding if no profile
  if (profileQ.isSuccess && !profileQ.data) {
    return (
      <div className="space-y-4 pt-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 grid place-items-center">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Sätt upp din nutritionsprofil</h2>
        <p className="text-sm text-muted-foreground px-4">5 snabba steg så bygger vi en plan som anpassar sig efter din faktiska förbränning.</p>
        <Button onClick={() => navigate({ to: "/nutrition/onboarding" })} className="mt-4">Kom igång</Button>
      </div>
    );
  }

  const profile = profileQ.data;
  const entries: FoodEntry[] = logQ.data ?? [];
  const totals = sumEntries(entries);
  const target = profile ?? { kcal_target: 2200, protein_g: 150, carbs_g: 250, fat_g: 70 };
  const kcalLeft = Math.max(0, target.kcal_target - totals.kcal);

  const trend = computeWeightTrend((wQ.data ?? []).map((w) => ({ entry_date: w.entry_date, weight_kg: Number(w.weight_kg) })));
  const latestTrend = trend.at(-1)?.trend_kg ?? null;

  return (
    <div className="space-y-4">
      {/* Date scrubber */}
      <div className="flex items-center justify-between gap-2">
        <Button size="icon" variant="ghost" onClick={() => setDate((d) => addDays(d, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <button onClick={() => setDate(todayISO())} className="text-sm font-medium tabular-nums">{date === todayISO() ? "Idag" : new Date(date).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "short" })}</button>
        <Button size="icon" variant="ghost" disabled={date >= todayISO()} onClick={() => setDate((d) => addDays(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Hero kcal */}
      <Card className="p-5 bg-gradient-to-br from-primary/15 via-card to-card border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Kalorier kvar</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tabular-nums">{Math.round(kcalLeft)}</span>
              <span className="text-sm text-muted-foreground">/ {target.kcal_target} kcal</span>
            </div>
          </div>
          <div className="h-14 w-14 rounded-full bg-primary/20 grid place-items-center">
            <Flame className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-secondary/50 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (totals.kcal / target.kcal_target) * 100)}%` }} transition={{ duration: 0.7 }} className="h-full bg-primary" />
        </div>
      </Card>

      {/* Macro rings */}
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <MacroRing consumed={totals.protein_g} target={target.protein_g} label="Protein" color="hsl(195 90% 60%)" />
          <MacroRing consumed={totals.carbs_g} target={target.carbs_g} label="Kolhydrater" color="hsl(35 95% 60%)" />
          <MacroRing consumed={totals.fat_g} target={target.fat_g} label="Fett" color="hsl(330 80% 65%)" />
        </div>
      </Card>

      {/* Quick actions row */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => navigate({ to: "/nutrition/log" })} className="rounded-xl bg-primary text-primary-foreground py-3 text-xs font-medium flex items-center justify-center gap-1.5">
          <Plus className="h-4 w-4" /> Logga
        </button>
        <button onClick={() => copyMut.mutate()} className="rounded-xl bg-secondary py-3 text-xs flex items-center justify-center gap-1.5">
          <Copy className="h-4 w-4" /> Kopiera igår
        </button>
        <button onClick={() => setWeightOpen(true)} className="rounded-xl bg-secondary py-3 text-xs flex items-center justify-center gap-1.5">
          <Scale className="h-4 w-4" /> Vikt
        </button>
      </div>

      {latestTrend != null && (
        <Card className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">True Weight</p>
            <p className="text-lg font-semibold tabular-nums">{latestTrend.toFixed(1)} kg</p>
          </div>
          <Link to="/nutrition/analytics" className="text-xs text-primary">Se trend →</Link>
        </Card>
      )}

      {/* Meals */}
      <div className="space-y-3">
        {MEALS.map((m) => {
          const items = entries.filter((e) => e.meal === m.id);
          const mt = sumEntries(items);
          return (
            <Card key={m.id} className="overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.icon}</span>
                  <span className="text-sm font-medium">{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{Math.round(mt.kcal)} kcal</span>
                  <Link to="/nutrition/log" search={{ meal: m.id, date } as any} className="h-7 w-7 rounded-full bg-primary/15 text-primary grid place-items-center"><Plus className="h-4 w-4" /></Link>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <div className="px-3 py-4 text-[11px] text-muted-foreground">Inget loggat än</div>
                ) : items.map((it) => (
                  <motion.div key={it.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="px-3 py-2 flex items-center justify-between border-b border-border/30 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{it.name_snapshot}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{Math.round(it.kcal)} kcal · P {Math.round(it.protein_g)}g · K {Math.round(it.carbs_g)}g · F {Math.round(it.fat_g)}g {it.is_quick_add && "· quick add"}</p>
                    </div>
                    <button onClick={() => delMut.mutate(it.id)} className="h-7 w-7 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive grid place-items-center"><Trash2 className="h-3.5 w-3.5" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      <div className="pb-6 text-center">
        <Link to="/nutrition/coaching" className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <Zap className="h-3 w-3" /> Anpassa din strategi
        </Link>
      </div>

      <Dialog open={weightOpen} onOpenChange={setWeightOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Logga vikt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="w">Vikt (kg)</Label>
            <Input id="w" type="number" step="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="t.ex. 78.4" />
            <Button className="w-full" onClick={() => { const n = parseFloat(weight); if (!isNaN(n)) wMut.mutate(n); }}>Spara</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}