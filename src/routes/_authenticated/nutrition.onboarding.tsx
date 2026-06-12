import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getBaseUserData, upsertProfile, logWeight } from "@/lib/macrofactor/api";
import { mifflinStJeor, goalKcalDelta, distributeMacros, todayISO } from "@/lib/macrofactor/algorithms";
import type { Goal, DietStyle } from "@/lib/macrofactor/types";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/nutrition/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const baseQ = useQuery({ queryKey: ["mf-base"], queryFn: getBaseUserData });
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [rate, setRate] = useState([0.5]);
  const [diet, setDiet] = useState<DietStyle>("balanced");

  useEffect(() => {
    if (baseQ.data?.weightKg && !weight) setWeight(String(baseQ.data.weightKg));
  }, [baseQ.data, weight]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const w = parseFloat(weight) || baseQ.data?.weightKg || 75;
      const tdee = mifflinStJeor({ ...(baseQ.data ?? { age: null, gender: null, heightCm: null, weightKg: w }), weightKg: w });
      const delta = goalKcalDelta(goal, rate[0], w);
      const kcal = Math.max(1400, tdee + delta);
      const macros = distributeMacros({ kcal, style: diet, weightKg: w });
      await logWeight(w);
      await upsertProfile({
        goal, goal_rate_pct_per_week: rate[0], program_mode: "coached", diet_style: diet,
        kcal_target: kcal, ...macros,
        expenditure_estimate: tdee,
        starting_weight_kg: w,
        goal_weight_kg: goalWeight ? parseFloat(goalWeight) : null,
      });
    },
    onSuccess: () => { toast.success("Klart! Din plan är redo."); navigate({ to: "/nutrition" }); },
  });

  const steps = [
    {
      title: "Vad är ditt mål?",
      body: (
        <div className="grid grid-cols-3 gap-2">
          {[{i:"cut",l:"Gå ner"},{i:"maintain",l:"Bibehålla"},{i:"bulk",l:"Bygga"}].map((g) => (
            <button key={g.i} onClick={() => setGoal(g.i as Goal)} className={`p-4 rounded-xl text-sm font-medium border ${goal===g.i ? "border-primary bg-primary/10" : "border-border bg-secondary/30"}`}>{g.l}</button>
          ))}
        </div>
      ),
    },
    {
      title: "Din nuvarande vikt",
      body: (
        <div className="space-y-2">
          <Label className="text-xs">Vikt (kg)</Label>
          <Input type="number" step="0.1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="t.ex. 78.5" />
          <p className="text-[11px] text-muted-foreground">Vi loggar detta som första datapunkt för din True Weight-trend.</p>
        </div>
      ),
    },
    {
      title: goal === "maintain" ? "Hoppa över takten" : "Hur snabbt vill du gå?",
      body: goal === "maintain" ? <p className="text-sm text-muted-foreground">Ingen takt behövs för bibehållande.</p> : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Takt: {rate[0].toFixed(2)} %/v</Label>
            <span className="text-[10px] text-muted-foreground">≈ {(((rate[0]/100) * (parseFloat(weight)||75)).toFixed(2))} kg/vecka</span>
          </div>
          <Slider value={rate} onValueChange={setRate} min={0.1} max={1.2} step={0.05} />
          <div className="space-y-2">
            <Label className="text-xs">Mål-vikt (valfritt)</Label>
            <Input type="number" step="0.1" inputMode="decimal" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} placeholder="t.ex. 72" />
          </div>
        </div>
      ),
    },
    {
      title: "Välj kost-stil",
      body: (
        <div className="grid grid-cols-2 gap-2">
          {[{i:"balanced",l:"Balanserad"},{i:"low_carb",l:"Lågkolhydrat"},{i:"keto",l:"Keto"},{i:"high_carb",l:"Hög-kolhydrat"}].map((d) => (
            <button key={d.i} onClick={() => setDiet(d.i as DietStyle)} className={`p-3 rounded-lg text-sm border ${diet===d.i ? "border-primary bg-primary/10" : "border-border bg-secondary/30"}`}>{d.l}</button>
          ))}
        </div>
      ),
    },
    {
      title: "Klar att börja",
      body: (
        <div className="text-center space-y-3 py-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 grid place-items-center"><Check className="h-7 w-7 text-primary" /></div>
          <p className="text-sm">Vi sätter upp din plan med en startpunkt och börjar mäta din verkliga förbränning. Efter 7 dagar börjar coaching anpassa sig efter dig.</p>
        </div>
      ),
    },
  ];

  const canNext = step !== 1 || (parseFloat(weight) > 0);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />
        ))}
      </div>
      <Card className="p-5 space-y-4 min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
            <h2 className="text-lg font-semibold">{steps[step].title}</h2>
            {steps[step].body}
          </motion.div>
        </AnimatePresence>
      </Card>
      <div className="flex gap-2">
        {step > 0 && <Button variant="outline" onClick={() => setStep(step-1)} className="flex-1">Tillbaka</Button>}
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step+1)} disabled={!canNext} className="flex-1">Nästa <ArrowRight className="h-4 w-4 ml-1" /></Button>
        ) : (
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="flex-1">Skapa plan</Button>
        )}
      </div>
    </div>
  );
}