import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ExpenditureChart, WeightTrendChart } from "@/components/nutrition/Charts";
import { getWeightEntries, getFoodLogRange, getProfile, getBaseUserData } from "@/lib/macrofactor/api";
import { computeWeightTrend, computeDynamicTDEE, mifflinStJeor, todayISO, addDays, sumEntries } from "@/lib/macrofactor/algorithms";

export const Route = createFileRoute("/_authenticated/nutrition/analytics")({
  component: Analytics,
});

function Analytics() {
  const [range, setRange] = useState<14|30|90>(30);
  const wQ = useQuery({ queryKey: ["mf-weight", 90], queryFn: () => getWeightEntries(90) });
  const from = addDays(todayISO(), -range);
  const fQ = useQuery({ queryKey: ["mf-log-range", from, todayISO()], queryFn: () => getFoodLogRange(from, todayISO()) });
  const pQ = useQuery({ queryKey: ["mf-profile"], queryFn: getProfile });
  const baseQ = useQuery({ queryKey: ["mf-base"], queryFn: getBaseUserData });

  const { weightData, expenditureData, totals, top } = useMemo(() => {
    const weights = (wQ.data ?? []).map((w) => ({ entry_date: w.entry_date, weight_kg: Number(w.weight_kg) }));
    const trend = computeWeightTrend(weights);
    const intakeByDate = new Map<string, number>();
    const macroByDate = new Map<string, { kcal: number; p: number; c: number; f: number }>();
    for (const e of fQ.data ?? []) {
      const cur = intakeByDate.get(e.log_date) ?? 0;
      intakeByDate.set(e.log_date, cur + Number(e.kcal));
      const m = macroByDate.get(e.log_date) ?? { kcal:0,p:0,c:0,f:0 };
      macroByDate.set(e.log_date, { kcal: m.kcal+Number(e.kcal), p: m.p+Number(e.protein_g), c: m.c+Number(e.carbs_g), f: m.f+Number(e.fat_g) });
    }
    const fallback = mifflinStJeor({ ...(baseQ.data ?? { age: null, gender: null, heightCm: null, weightKg: null }) });
    // expenditure over time: rolling window
    const expenditureData: { date: string; tdee: number; target?: number }[] = [];
    for (let i = 6; i < trend.length; i++) {
      const sub = trend.slice(Math.max(0, i-13), i+1);
      const res = computeDynamicTDEE({ trend: sub, intakeByDate, fallbackTDEE: fallback });
      expenditureData.push({ date: trend[i].entry_date, tdee: res.tdee, target: pQ.data?.kcal_target });
    }
    const weightData = trend.slice(-range).map((t) => ({ date: t.entry_date, weight: t.weight_kg, trend: t.trend_kg }));
    const totals = sumEntries(fQ.data ?? []);
    const days = Math.max(1, new Set((fQ.data ?? []).map((e) => e.log_date)).size);
    const avgTotals = { kcal: totals.kcal/days, protein_g: totals.protein_g/days, carbs_g: totals.carbs_g/days, fat_g: totals.fat_g/days };
    // top contributors per macro
    const byName = new Map<string, { name: string; kcal: number; protein: number; carbs: number; fat: number }>();
    for (const e of fQ.data ?? []) {
      const cur = byName.get(e.name_snapshot) ?? { name: e.name_snapshot, kcal: 0, protein: 0, carbs: 0, fat: 0 };
      cur.kcal += Number(e.kcal); cur.protein += Number(e.protein_g); cur.carbs += Number(e.carbs_g); cur.fat += Number(e.fat_g);
      byName.set(e.name_snapshot, cur);
    }
    const arr = Array.from(byName.values());
    const top = {
      protein: [...arr].sort((a,b) => b.protein - a.protein).slice(0,5),
      carbs: [...arr].sort((a,b) => b.carbs - a.carbs).slice(0,5),
      fat: [...arr].sort((a,b) => b.fat - a.fat).slice(0,5),
    };
    return { weightData, expenditureData, totals: avgTotals, top };
  }, [wQ.data, fQ.data, pQ.data, baseQ.data, range]);

  return (
    <div className="space-y-4 pb-10">
      <div className="flex gap-1 text-xs">
        {[14,30,90].map((d) => (
          <button key={d} onClick={() => setRange(d as any)} className={`px-3 py-1.5 rounded-full ${range===d ? "bg-primary text-primary-foreground" : "bg-secondary/60"}`}>{d}d</button>
        ))}
      </div>

      <Card className="p-4 space-y-2">
        <div>
          <h3 className="text-sm font-semibold">Förbränning (TDEE)</h3>
          <p className="text-[11px] text-muted-foreground">Dynamiskt beräknad från ditt intag och vikttrend</p>
        </div>
        {expenditureData.length >= 2 ? <ExpenditureChart data={expenditureData} /> : <p className="text-xs text-muted-foreground py-6 text-center">Behöver minst 7 dagar med vikt + intag</p>}
      </Card>

      <Card className="p-4 space-y-2">
        <div>
          <h3 className="text-sm font-semibold">True Weight trend</h3>
          <p className="text-[11px] text-muted-foreground">Punkter = scale, linje = smoothad trend</p>
        </div>
        {weightData.length >= 2 ? <WeightTrendChart data={weightData} /> : <p className="text-xs text-muted-foreground py-6 text-center">Logga vikt några dagar för att se trend</p>}
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Snitt per dag ({range}d)</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[["Kcal", totals.kcal], ["Protein", totals.protein_g], ["Kolh", totals.carbs_g], ["Fett", totals.fat_g]].map(([l,v]) => (
            <div key={l as string} className="p-2 rounded bg-secondary/40">
              <div className="text-[10px] text-muted-foreground">{l}</div>
              <div className="text-sm font-semibold tabular-nums">{Math.round(v as number)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Top contributors</h3>
        <div className="space-y-3">
          {(["protein","carbs","fat"] as const).map((k) => (
            <div key={k}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{k}</p>
              {top[k].length === 0 && <p className="text-xs text-muted-foreground">Ingen data</p>}
              {top[k].map((row) => (
                <div key={row.name} className="flex items-center justify-between py-1 text-xs">
                  <span className="truncate flex-1">{row.name}</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round((row as any)[k])} g</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}