import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getProfile, upsertProfile, getWeightEntries, getFoodLogRange, insertCheckin, getBaseUserData } from "@/lib/macrofactor/api";
import { computeWeightTrend, computeDynamicTDEE, mifflinStJeor, goalEtaDays, distributeMacros, computeCheckinAdjustment, todayISO, addDays } from "@/lib/macrofactor/algorithms";
import type { Goal, ProgramMode, DietStyle } from "@/lib/macrofactor/types";
import { Sparkles, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getCheckins } from "@/lib/macrofactor/api";

export const Route = createFileRoute("/_authenticated/nutrition/coaching")({
  component: Coaching,
});

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: "cut", label: "Gå ner", desc: "Energiunderskott" },
  { id: "maintain", label: "Bibehålla", desc: "Energibalans" },
  { id: "bulk", label: "Bygga", desc: "Energiöverskott" },
];
const PROGRAMS: { id: ProgramMode; label: string; desc: string }[] = [
  { id: "coached", label: "Coachat", desc: "Appen justerar kalorier och makros automatiskt" },
  { id: "collaborative", label: "Samarbete", desc: "Du sätter kalorier, vi fördelar makros" },
  { id: "manual", label: "Manuellt", desc: "Du sätter allt själv" },
];
const DIETS: { id: DietStyle; label: string }[] = [
  { id: "balanced", label: "Balanserad" }, { id: "low_carb", label: "Lågkolhydrat" }, { id: "keto", label: "Keto" }, { id: "high_carb", label: "Hög-kolhydrat" },
];

function Coaching() {
  const qc = useQueryClient();
  const pQ = useQuery({ queryKey: ["mf-profile"], queryFn: getProfile });
  const wQ = useQuery({ queryKey: ["mf-weight", 30], queryFn: () => getWeightEntries(30) });
  const baseQ = useQuery({ queryKey: ["mf-base"], queryFn: getBaseUserData });
  const cQ = useQuery({ queryKey: ["mf-checkins"], queryFn: () => getCheckins(6) });
  const from = addDays(todayISO(), -14);
  const fQ = useQuery({ queryKey: ["mf-log-range", from, todayISO()], queryFn: () => getFoodLogRange(from, todayISO()) });

  const [goal, setGoal] = useState<Goal>("maintain");
  const [rate, setRate] = useState([0.5]);
  const [mode, setMode] = useState<ProgramMode>("coached");
  const [diet, setDiet] = useState<DietStyle>("balanced");

  useMemo(() => {
    if (pQ.data) {
      setGoal(pQ.data.goal);
      setRate([Number(pQ.data.goal_rate_pct_per_week)]);
      setMode(pQ.data.program_mode);
      setDiet(pQ.data.diet_style);
    }
  }, [pQ.data]);

  const trend = useMemo(() => computeWeightTrend((wQ.data ?? []).map((w) => ({ entry_date: w.entry_date, weight_kg: Number(w.weight_kg) }))), [wQ.data]);
  const currentWeight = trend.at(-1)?.trend_kg ?? baseQ.data?.weightKg ?? 75;
  const fallback = mifflinStJeor(baseQ.data ?? { age: null, gender: null, heightCm: null, weightKg: null });
  const intakeByDate = new Map<string, number>();
  for (const e of fQ.data ?? []) intakeByDate.set(e.log_date, (intakeByDate.get(e.log_date) ?? 0) + Number(e.kcal));
  const tdeeRes = computeDynamicTDEE({ trend, intakeByDate, fallbackTDEE: fallback });
  const eta = goalEtaDays({ trend, goalWeightKg: pQ.data?.goal_weight_kg ?? null, goal, rate_pct_per_week: rate[0], currentWeightKg: currentWeight });

  const saveMut = useMutation({
    mutationFn: async () => {
      const macros = distributeMacros({ kcal: pQ.data?.kcal_target ?? 2200, style: diet, weightKg: currentWeight });
      return upsertProfile({ goal, goal_rate_pct_per_week: rate[0], program_mode: mode, diet_style: diet, kcal_target: pQ.data?.kcal_target ?? 2200, ...macros });
    },
    onSuccess: () => { toast.success("Strategi sparad"); qc.invalidateQueries({ queryKey: ["mf-profile"] }); },
  });

  const checkinMut = useMutation({
    mutationFn: async () => {
      if (!pQ.data) throw new Error("Ingen profil");
      const adj = computeCheckinAdjustment({ tdee: tdeeRes.tdee, goal, rate_pct_per_week: rate[0], currentWeightKg: currentWeight, previousKcalTarget: pQ.data.kcal_target });
      const macros = distributeMacros({ kcal: adj.newTarget, style: diet, weightKg: currentWeight });
      await upsertProfile({ ...pQ.data, kcal_target: adj.newTarget, expenditure_estimate: tdeeRes.tdee, last_checkin_at: new Date().toISOString(), goal, goal_rate_pct_per_week: rate[0], program_mode: mode, diet_style: diet, ...macros });
      const trendChange = trend.length >= 7 ? trend[trend.length-1].trend_kg - trend[Math.max(0,trend.length-8)].trend_kg : null;
      await insertCheckin({ checkin_date: todayISO(), estimated_tdee: tdeeRes.tdee, previous_kcal_target: pQ.data.kcal_target, new_kcal_target: adj.newTarget, trend_change_kg: trendChange, reason: adj.reason });
      return adj;
    },
    onSuccess: (adj) => { toast.success(adj.reason); qc.invalidateQueries({ queryKey: ["mf-profile"] }); qc.invalidateQueries({ queryKey: ["mf-checkins"] }); },
  });

  return (
    <div className="space-y-4 pb-10">
      {/* TDEE summary */}
      <Card className="p-4 bg-gradient-to-br from-primary/15 via-card to-card border-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Din förbränning</p>
            <p className="text-3xl font-bold tabular-nums">{tdeeRes.tdee}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{tdeeRes.confidence === "low" ? "Lågt dataunderlag" : tdeeRes.confidence === "med" ? "Mellan dataunderlag" : "Högt dataunderlag"}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Mål-ETA</p>
            <p className="text-lg font-semibold">{eta ? `${eta} dgr` : "—"}</p>
          </div>
        </div>
      </Card>

      {/* Goal */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Mål</h3>
        <div className="grid grid-cols-3 gap-2">
          {GOALS.map((g) => (
            <button key={g.id} onClick={() => setGoal(g.id)} className={`p-3 rounded-lg text-center border ${goal===g.id ? "border-primary bg-primary/10" : "border-border bg-secondary/30"}`}>
              <div className="text-sm font-medium">{g.label}</div>
              <div className="text-[10px] text-muted-foreground">{g.desc}</div>
            </button>
          ))}
        </div>
        {goal !== "maintain" && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Takt: {rate[0].toFixed(2)} % kroppsvikt/vecka</Label>
              <span className="text-[10px] text-muted-foreground tabular-nums">≈ {((rate[0]/100)*currentWeight).toFixed(2)} kg/v</span>
            </div>
            <Slider value={rate} onValueChange={setRate} min={0.1} max={1.2} step={0.05} />
          </div>
        )}
      </Card>

      {/* Program mode */}
      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold">Program-läge</h3>
        {PROGRAMS.map((p) => (
          <button key={p.id} onClick={() => setMode(p.id)} className={`w-full text-left p-3 rounded-lg border ${mode===p.id ? "border-primary bg-primary/10" : "border-border bg-secondary/30"}`}>
            <div className="text-sm font-medium">{p.label}</div>
            <div className="text-[11px] text-muted-foreground">{p.desc}</div>
          </button>
        ))}
      </Card>

      {/* Diet style */}
      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold">Kost-stil</h3>
        <div className="grid grid-cols-2 gap-2">
          {DIETS.map((d) => (
            <button key={d.id} onClick={() => setDiet(d.id)} className={`p-2 rounded-lg text-sm border ${diet===d.id ? "border-primary bg-primary/10" : "border-border bg-secondary/30"}`}>{d.label}</button>
          ))}
        </div>
      </Card>

      <Button className="w-full" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Spara strategi</Button>

      {/* Weekly checkin */}
      <Card className="p-4 space-y-3 border-primary/40 bg-primary/5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Veckovis check-in</h3></div>
        <p className="text-[11px] text-muted-foreground">Vi jämför din faktiska förbränning med ditt mål och justerar kalorierna — utan att döma. Inga "straff" för dagar du åt mer.</p>
        <Button onClick={() => checkinMut.mutate()} disabled={checkinMut.isPending} className="w-full">Kör check-in</Button>
      </Card>

      {/* Checkin history */}
      {(cQ.data?.length ?? 0) > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold">Historik</h3>
          {cQ.data!.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-xs">{new Date(c.checkin_date).toLocaleDateString("sv-SE")}</p>
                <p className="text-[10px] text-muted-foreground">{c.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-xs tabular-nums">{c.previous_kcal_target} → {c.new_kcal_target}</p>
                <p className="text-[10px] text-muted-foreground tabular-nums flex items-center justify-end gap-1"><TrendingUp className="h-3 w-3" /> TDEE {c.estimated_tdee}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}