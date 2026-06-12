import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronLeft, Check, Sparkles, Dumbbell, Flame, Scale, Zap,
  Armchair, PersonStanding, Activity, Ban, Milk, Egg, Fish, Shell, Nut, Wheat,
} from "lucide-react";
import goalMuscle from "@/assets/kostplan-goal-muscle.png";
import goalLoss from "@/assets/kostplan-goal-loss.png";
import goalMaintain from "@/assets/kostplan-goal-maintain.png";
import goalPerform from "@/assets/kostplan-goal-perform.png";
import imgMan from "@/assets/kostplan-man.jpg";
import imgWoman from "@/assets/kostplan-woman.jpg";
import imgActStilla from "@/assets/kostplan-act-stilla.jpg";
import imgActLatt from "@/assets/kostplan-act-latt.jpg";
import imgActMattlig from "@/assets/kostplan-act-mattlig.jpg";
import imgActMycket from "@/assets/kostplan-act-mycket.jpg";

export const Route = createFileRoute("/_authenticated/kostplan")({
  component: KostplanWizard,
});

type Goal = "bygga" | "ner" | "halla" | "prestera";
type Gender = "man" | "kvinna";
type Activity = "stilla" | "latt" | "mattlig" | "mycket";
type Day = "Må" | "Ti" | "On" | "To" | "Fr" | "Lö" | "Sö";

const ALL_DAYS: Day[] = ["Må", "Ti", "On", "To", "Fr", "Lö", "Sö"];
const DAY_FULL: Record<Day, string> = { Må:"Måndag", Ti:"Tisdag", On:"Onsdag", To:"Torsdag", Fr:"Fredag", Lö:"Lördag", Sö:"Söndag" };
const MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
const TOTAL_STEPS = 9;

function KostplanWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);

  // answers
  const [goals, setGoals] = useState<Goal[]>(["ner"]);
  const [gender, setGender] = useState<Gender>("man");
  const [birthYear, setBirthYear] = useState(1990);
  const [height, setHeight] = useState(175);
  const [currentWeight, setCurrentWeight] = useState(80);
  const [targetWeight, setTargetWeight] = useState(70);
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 3); return d;
  });
  const [activity, setActivity] = useState<Activity>("mattlig");
  const [cheatDays, setCheatDays] = useState<Day[]>(["Fr","Lö","Sö"]);
  const [includeProtein, setIncludeProtein] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(["Ingen"]);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS + 1, s + 1));
  const back = () => {
    if (step === 1) { navigate({ to: "/hem" }); return; }
    setStep((s) => Math.max(1, s - 1));
  };

  const startGeneration = async () => {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Inte inloggad"); setGenerating(false); return; }
    const { error } = await supabase.from("diet_plans").insert({
      user_id: user.id,
      goals,
      gender,
      birth_year: birthYear,
      height_cm: height,
      current_weight_kg: currentWeight,
      target_weight_kg: targetWeight,
      target_date: targetDate.toISOString().slice(0, 10),
      activity_level: activity,
      cheat_days: cheatDays.map((d) => DAY_FULL[d]),
      include_protein_powder: includeProtein,
      allergies: allergies.includes("Ingen") ? [] : allergies,
    });
    if (error) { toast.error(error.message); setGenerating(false); return; }
    // hold the finale animation for a polished beat, then reveal the result screen
    setTimeout(() => setShowResult(true), 4200);
  };

  const [showResult, setShowResult] = useState(false);

  // when entering step 10 (finale), kick off save + redirect
  useEffect(() => {
    if (step > TOTAL_STEPS && !generating) startGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const progress = Math.min(step, TOTAL_STEPS) / TOTAL_STEPS;
  const showFinale = step > TOTAL_STEPS;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden">
      {/* Cosmic / bioluminescent backdrop */}
      {!showFinale && (
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" style={{ background: "#0B0F19" }}>
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-[radial-gradient(closest-side,oklch(0.74_0.13_180/0.22),transparent_70%)] blur-3xl" />
          <div className="absolute top-1/3 -left-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.15_200/0.15),transparent_70%)] blur-3xl" />
          <div className="absolute -bottom-32 right-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.18_130/0.14),transparent_70%)] blur-3xl" />
          <svg className="absolute inset-x-0 bottom-0 w-full h-[55%] opacity-60" viewBox="0 0 800 400" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="kpLine" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="oklch(0.78 0.18 180 / 0)" />
                <stop offset="50%" stopColor="oklch(0.78 0.18 180 / 0.55)" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 180 / 0)" />
              </linearGradient>
            </defs>
            <path d="M0 320 C 180 260 260 360 420 300 S 680 240 800 310" stroke="url(#kpLine)" strokeWidth="1.2" />
            <path d="M0 360 C 200 300 320 380 480 340 S 720 290 800 350" stroke="url(#kpLine)" strokeWidth="1" opacity="0.7" />
            <path d="M0 280 C 160 220 280 300 440 260 S 700 220 800 270" stroke="url(#kpLine)" strokeWidth="0.8" opacity="0.5" />
          </svg>
        </div>
      )}
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      {/* Top bar */}
      <div className="relative flex items-center justify-center h-12 px-4 border-b border-border/40">
        {!showFinale && (
          <button onClick={back} className="absolute left-3 inline-flex items-center gap-1 text-sm text-primary">
            <ChevronLeft className="h-4 w-4" /> Tillbaka
          </button>
        )}
        <p className="text-sm font-semibold">Kostplan</p>
      </div>

      {/* Progress */}
      {!showFinale && (
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={back} className="text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button>
          <div className="relative h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-accent shadow-[0_0_12px_oklch(0.74_0.13_180/0.6)] transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{step}/{TOTAL_STEPS}</span>
        </div>
      )}

      {/* Step body */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {step === 1 && (
          <StepGoals goals={goals} setGoals={setGoals} />
        )}
        {step === 2 && (
          <StepGender value={gender} onChange={setGender} />
        )}
        {step === 3 && (
          <WheelPicker
            title="Vilket är ditt födelseår?"
            value={birthYear}
            onChange={setBirthYear}
            options={Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 12 - i).reverse()}
          />
        )}
        {step === 4 && (
          <RulerStep title="Hur lång är du?" unit="cm" min={140} max={220} value={height} onChange={setHeight} />
        )}
        {step === 5 && (
          <RulerStep title="Hur mycket väger du nu?" unit="kg" min={40} max={180} step={0.5} value={currentWeight} onChange={setCurrentWeight} />
        )}
        {step === 6 && (
          <StepTargetWeight
            height={height}
            current={currentWeight}
            value={targetWeight}
            onChange={setTargetWeight}
            date={targetDate}
            setDate={setTargetDate}
          />
        )}
        {step === 7 && (
          <StepActivity value={activity} onChange={setActivity} />
        )}
        {step === 8 && (
          <StepCheatDays
            days={cheatDays}
            setDays={setCheatDays}
            includeProtein={includeProtein}
            setIncludeProtein={setIncludeProtein}
          />
        )}
        {step === 9 && (
          <StepAllergies value={allergies} onChange={setAllergies} />
        )}
        {showFinale && (
          showResult ? (
            <ResultScreen
              goals={goals}
              gender={gender}
              birthYear={birthYear}
              height={height}
              currentWeight={currentWeight}
              targetWeight={targetWeight}
              targetDate={targetDate}
              activity={activity}
              onContinue={() => navigate({ to: "/kostschema" })}
            />
          ) : (
            <FinaleScreen
              goalLabel={
                goals[0] === "ner" ? "Gå ner i vikt" :
                goals[0] === "bygga" ? "Bygga muskler" :
                goals[0] === "halla" ? "Hålla vikten" : "Prestera bättre"
              }
              genderLabel={gender === "man" ? "Man" : "Kvinna"}
              trainingDays={7 - cheatDays.length}
            />
          )
        )}
      </div>

      {/* Footer */}
      {!showFinale && (
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            onClick={step === TOTAL_STEPS ? next : next}
            className="relative w-full h-14 rounded-full text-sm font-semibold text-primary-foreground bg-primary shadow-[0_10px_40px_-10px_oklch(0.74_0.13_180/0.7)] active:scale-[0.99] transition overflow-hidden"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/30" />
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            {step === TOTAL_STEPS ? "✨ Generera nytt schema" : "Fortsätt"}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

/* ====================== STEP COMPONENTS ====================== */

function StepHeader({ title, sub, emoji }: { title: string; sub?: string; emoji?: string }) {
  return (
    <div className="pt-2 pb-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{title} {emoji}</h1>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function StepGoals({ goals, setGoals }: { goals: Goal[]; setGoals: (g: Goal[]) => void }) {
  const items: { v: Goal; t: string; s: string; img: string; glow: string }[] = [
    { v: "bygga",    t: "Bygga muskler",  s: "Öka muskelmassa och styrka",      img: goalMuscle,   glow: "from-amber-400/20 to-yellow-500/5" },
    { v: "ner",      t: "Gå ner i vikt",  s: "Kalorireducerat kostschema",      img: goalLoss,     glow: "from-teal-400/25 to-emerald-500/5" },
    { v: "halla",    t: "Hålla vikten",   s: "Balanserad och hållbar kost",     img: goalMaintain, glow: "from-sky-400/20 to-indigo-500/5" },
    { v: "prestera", t: "Prestera bättre",s: "Optimera energi och uthållighet", img: goalPerform,  glow: "from-fuchsia-400/20 to-purple-500/5" },
  ];
  const toggle = (v: Goal) =>
    setGoals(goals.includes(v) ? goals.filter((g) => g !== v) : [...goals, v]);
  return (
    <div className="relative">
      {/* Ambient cosmic backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-[radial-gradient(closest-side,oklch(0.55_0.22_300/0.18),transparent_70%)] blur-2xl" />
        <div className="absolute top-40 -left-20 h-[280px] w-[280px] rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.18_200/0.12),transparent_70%)] blur-2xl" />
        <div className="absolute top-10 right-0 h-[260px] w-[260px] rounded-full bg-[radial-gradient(closest-side,oklch(0.65_0.22_330/0.12),transparent_70%)] blur-2xl" />
      </div>

      <div className="text-center pt-4 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight inline-flex items-center gap-3 justify-center">
          Vad är ditt mål? <span className="text-3xl">🎯</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Du kan välja flera mål</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto px-2">
        {items.map((it) => {
          const active = goals.includes(it.v);
          return (
            <button
              key={it.v}
              type="button"
              onClick={() => toggle(it.v)}
              className={cn(
                "group relative aspect-[3/4] rounded-3xl p-5 text-center overflow-hidden",
                "backdrop-blur-xl bg-white/[0.03] transition-all duration-300",
                "border ring-1",
                active
                  ? "border-teal-400/60 ring-teal-400/40 shadow-[0_0_40px_-8px_oklch(0.78_0.18_180/0.55),inset_0_0_30px_oklch(0.78_0.18_180/0.15)] -translate-y-1"
                  : "border-white/10 ring-white/[0.04] hover:border-white/20 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-20px_oklch(0.5_0.2_280/0.5)]",
              )}
            >
              {/* inner gradient sheen */}
              <span className={cn(
                "pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b",
                active ? "from-teal-400/15 via-transparent to-transparent" : `${it.glow}`,
              )} />
              {/* top edge highlight */}
              <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              {/* checkmark */}
              {active && (
                <span className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-400 text-zinc-950 shadow-[0_0_18px_oklch(0.78_0.18_180/0.7)]">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              )}

              <div className="relative flex flex-col items-center justify-between h-full">
                <div className="flex-1 flex items-center justify-center">
                  <img
                    src={it.img}
                    alt={it.t}
                    loading="lazy"
                    className={cn(
                      "h-24 md:h-28 w-auto object-contain transition-transform duration-300 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]",
                      "group-hover:scale-110",
                      active && "scale-110",
                    )}
                  />
                </div>
                <div>
                  <p className={cn(
                    "text-base md:text-lg font-bold tracking-tight",
                    active ? "text-teal-300" : "text-foreground",
                  )}>
                    {it.t}
                  </p>
                  <p className="text-xs md:text-[13px] text-muted-foreground mt-1 leading-snug">
                    {it.s}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepChoice<T extends string>({
  title, options, value, onChange,
}: { title: string; options: { value: T; label: string; emoji: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <>
      <StepHeader title={title} />
      <div className="space-y-2.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <RowCard key={o.value} active={active} onClick={() => onChange(o.value)}>
              <span className="text-2xl">{o.emoji}</span>
              <p className={cn("flex-1 text-sm font-semibold", active && "text-primary")}>{o.label}</p>
              {active && <CheckDot />}
            </RowCard>
          );
        })}
      </div>
    </>
  );
}

/* -------- Gender (big tall cards) -------- */
function StepGender({ value, onChange }: { value: Gender; onChange: (v: Gender) => void }) {
  const items: { v: Gender; label: string; img: string; tint: string }[] = [
    { v: "man", label: "Man", img: imgMan, tint: "from-sky-400/15 to-indigo-500/10" },
    { v: "kvinna", label: "Kvinna", img: imgWoman, tint: "from-fuchsia-400/15 to-purple-500/10" },
  ];
  return (
    <>
      <div className="text-center pt-4 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Vad är ditt kön?</h1>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
        {items.map((it) => {
          const active = value === it.v;
          return (
            <button
              key={it.v}
              type="button"
              onClick={() => onChange(it.v)}
              className={cn(
                "group relative aspect-[3/5] rounded-3xl p-5 overflow-hidden backdrop-blur-xl bg-white/[0.03] border ring-1 transition-all duration-300",
                active
                  ? "border-teal-400/60 ring-teal-400/40 shadow-[0_0_50px_-8px_oklch(0.78_0.18_180/0.6),inset_0_0_40px_oklch(0.78_0.18_180/0.15)] -translate-y-1"
                  : "border-white/10 ring-white/[0.04] hover:-translate-y-0.5 hover:border-white/20",
              )}
            >
              <span className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b", active ? "from-teal-400/15 via-transparent to-transparent" : it.tint)} />
              <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              {active && (
                <span className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-400 text-zinc-950 shadow-[0_0_18px_oklch(0.78_0.18_180/0.7)]">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              )}
              <img
                src={it.img}
                alt={it.label}
                loading="lazy"
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-transform duration-500",
                  active ? "scale-105" : "group-hover:scale-105",
                )}
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                <p className={cn("text-lg font-bold tracking-tight drop-shadow", active ? "text-teal-300" : "text-white")}>{it.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function CheckDot() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-400 ring-1 ring-teal-300/50 shadow-[0_0_14px_rgba(94,234,212,0.7)]">
      <Check className="h-3.5 w-3.5 text-zinc-950" strokeWidth={3} />
    </span>
  );
}

function RowCard({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition backdrop-blur-xl",
        active
          ? "border-teal-400/60 bg-teal-400/[0.06] ring-1 ring-teal-400/30 shadow-[0_0_24px_-8px_oklch(0.78_0.18_180/0.5)]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
      )}
    >
      {children}
    </button>
  );
}

/* -------- Wheel picker (year etc.) -------- */
function WheelPicker({
  title, value, onChange, options,
}: { title: string; value: number; onChange: (v: number) => void; options: number[] }) {
  const ITEM = 56;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const i = options.indexOf(value);
    if (i >= 0 && ref.current) ref.current.scrollTop = i * ITEM;
  }, []); // eslint-disable-line
  const onScroll = () => {
    if (!ref.current) return;
    const i = Math.round(ref.current.scrollTop / ITEM);
    const v = options[i];
    if (v != null && v !== value) onChange(v);
  };
  return (
    <>
      <StepHeader title={title} />
      <div className="relative mx-auto max-w-xs mt-8 rounded-[2.25rem] p-4 bg-gradient-to-b from-zinc-800/70 via-zinc-900/80 to-black/80 ring-1 ring-white/10 shadow-[inset_0_2px_0_rgba(255,255,255,0.08),0_30px_60px_-20px_rgba(0,0,0,0.7)]">
        {/* metallic side ridges */}
        <span className="pointer-events-none absolute left-0 top-12 bottom-12 w-1 rounded-r bg-gradient-to-b from-white/10 via-white/30 to-white/10" />
        <span className="pointer-events-none absolute right-0 top-12 bottom-12 w-1 rounded-l bg-gradient-to-b from-white/10 via-white/30 to-white/10" />
        <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 h-14 rounded-xl bg-teal-400/10 ring-1 ring-teal-400/40 shadow-[0_0_24px_-6px_oklch(0.78_0.18_180/0.6)] z-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-zinc-900 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent z-10" />
        <div
          ref={ref}
          onScroll={onScroll}
          className="relative h-[280px] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
          style={{ scrollPaddingTop: "112px" }}
        >
          <div style={{ height: 112 }} />
          {options.map((o) => (
            <div
              key={o}
              onClick={() => onChange(o)}
              className={cn(
                "snap-center h-14 flex items-center justify-center text-2xl font-bold transition",
                o === value ? "text-white scale-110 drop-shadow-[0_0_12px_rgba(94,234,212,0.6)]" : "text-zinc-600",
              )}
            >
              {o}
            </div>
          ))}
          <div style={{ height: 112 }} />
        </div>
      </div>
    </>
  );
}

/* -------- Ruler / slider with tick marks -------- */
function RulerStep({
  title, unit, min, max, step = 1, value, onChange,
}: { title: string; unit: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  const ticks = useMemo(() => {
    const arr: { v: number; major: boolean }[] = [];
    for (let v = min; v <= max; v += step) arr.push({ v, major: Math.round(v) % 5 === 0 });
    return arr;
  }, [min, max, step]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  const commit = () => {
    const n = Number(draft.replace(",", "."));
    if (!isNaN(n)) {
      const clamped = Math.min(max, Math.max(min, n));
      const snapped = Math.round(clamped / step) * step;
      onChange(Number(snapped.toFixed(2)));
    }
    setEditing(false);
  };
  return (
    <>
      <StepHeader title={title} />
      <div className="flex flex-col items-center pt-4">
        {/* Yellow measuring-tape strip */}
        <div className="relative w-full max-w-xl h-10 rounded-xl overflow-hidden ring-1 ring-primary/40 shadow-[0_8px_24px_-8px_oklch(0.74_0.13_180/0.5)]" style={{ background: "linear-gradient(180deg,oklch(0.88_0.1_180)_0%,oklch(0.74_0.13_180)_60%,oklch(0.5_0.13_180)_100%)" }}>
          <div className="absolute inset-0 flex items-end">
            {Array.from({ length: 41 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end">
                <span className={cn("w-px bg-zinc-900/70", i % 5 === 0 ? "h-5" : "h-3")} />
              </div>
            ))}
          </div>
          <span className="absolute left-2 top-1.5 h-2 w-2 rounded-full bg-zinc-900/40" />
          <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-zinc-900/40" />
        </div>

        {/* Neon glass display */}
        <div className="relative mt-6 rounded-3xl px-8 py-5 bg-gradient-to-b from-zinc-900/80 to-black/80 ring-1 ring-white/10 shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_20px_50px_-20px_rgba(0,0,0,0.7)]">
          <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-teal-400/20" />
        {editing ? (
          <div className="flex items-baseline">
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step={step}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
              className="text-6xl font-extrabold tabular-nums bg-transparent border-b border-teal-400 outline-none text-center w-56 text-teal-300"
            />
            <span className="text-base align-top text-teal-300/70 ml-1">{unit}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="text-6xl font-extrabold tabular-nums text-teal-300 drop-shadow-[0_0_18px_rgba(94,234,212,0.6)] hover:opacity-80 transition"
            title="Tryck för att skriva in exakt värde"
          >
            {value}
            <span className="text-base align-top text-teal-300/70 ml-1">{unit}</span>
          </button>
        )}
        </div>

        {/* Fine-tune +/- */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
            className="h-10 w-10 rounded-full bg-white/[0.04] border border-white/15 text-white/90 text-xl active:scale-95 hover:bg-white/10"
          >−</button>
          <div className="px-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm tabular-nums text-white/80">Finjustera</div>
          <button
            onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
            className="h-10 w-10 rounded-full bg-white/[0.04] border border-white/15 text-white/90 text-xl active:scale-95 hover:bg-white/10"
          >+</button>
        </div>

        <div className="relative w-full max-w-2xl mt-8">
          <div className="flex items-end h-10 overflow-hidden mb-2">
            {ticks.map((t) => (
              <div key={t.v} className="flex-1 flex flex-col items-center">
                {t.major && <span className="text-[10px] text-white/40">{t.v}</span>}
                <span className={cn("w-px bg-white/30", t.major ? "h-4" : "h-2")} />
              </div>
            ))}
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-teal-400"
          />
        </div>
      </div>
    </>
  );
}

/* -------- Target weight + date -------- */
function StepTargetWeight({
  height, current, value, onChange, date, setDate,
}: { height: number; current: number; value: number; onChange: (v: number) => void; date: Date; setDate: (d: Date) => void }) {
  const recommended = Math.round(((height / 100) ** 2) * 22);
  const diff = +(current - value).toFixed(1);
  const days = Math.max(1, Math.round((date.getTime() - Date.now()) / 86400000));
  const weeks = Math.max(1, Math.round(days / 7));
  const perWeek = Math.abs(diff / weeks).toFixed(1);
  const recommendedBadge = Math.abs(+perWeek) <= 1;

  return (
    <>
      <StepHeader title="Vad är din målvikt?" emoji="🎯" />
      <div className="flex flex-col items-center">
        <div className="relative rounded-3xl px-8 py-5 bg-gradient-to-b from-zinc-900/80 to-black/80 ring-1 ring-white/10 shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_20px_50px_-20px_rgba(0,0,0,0.7)]">
          <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-teal-400/20" />
          <p className="text-6xl font-extrabold tabular-nums text-teal-300 drop-shadow-[0_0_18px_rgba(94,234,212,0.6)]">{value}<span className="text-base align-top text-teal-300/70 ml-1">kg</span></p>
        </div>
        <input
          type="range" min={40} max={180} step={0.5} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full max-w-2xl mt-6 accent-teal-400"
        />
      </div>

      <button
        onClick={() => onChange(recommended)}
        className="mt-4 w-full text-left rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between"
      >
        <div className="text-xs">
          <p className="font-semibold">💡 FitFlow rekommenderar</p>
          <p className="text-muted-foreground"><span className="font-semibold text-emerald-300">{recommended} kg</span> — hälsosam vikt för din längd (BMI 22)</p>
        </div>
        <span className="text-xs text-emerald-300">Välj →</span>
      </button>

      <p className="text-center text-sm font-semibold mt-6">När vill du nå {value} kg?</p>
      <DateWheel date={date} setDate={setDate} />

      <div className={cn(
        "mt-4 rounded-2xl px-4 py-3 text-xs",
        recommendedBadge ? "border border-emerald-500/30 bg-emerald-500/10" : "border border-orange-500/30 bg-orange-500/10",
      )}>
        <span className={cn("inline-block rounded-full px-2 py-0.5 mr-1 text-[10px] font-semibold", recommendedBadge ? "bg-emerald-500 text-black" : "bg-orange-500 text-black")}>
          {recommendedBadge ? "Rekommenderas 🌱" : "Aggressivt ⚡"}
        </span>
        Jag vill {diff > 0 ? "gå ner" : diff < 0 ? "gå upp" : "hålla"} <b>{Math.abs(diff)} kg</b> på <b>{days} dagar</b>, i genomsnitt <b>{perWeek} kg per vecka</b>.
      </div>
    </>
  );
}

function DateWheel({ date, setDate }: { date: Date; setDate: (d: Date) => void }) {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  const set = (d: number, m: number, y: number) => setDate(new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate())));

  return (
    <div className="grid grid-cols-3 gap-3 mt-3">
      <MiniWheel options={MONTHS} value={MONTHS[month]} onChange={(v) => set(day, MONTHS.indexOf(v), year)} />
      <MiniWheel options={Array.from({ length: 31 }, (_, i) => String(i + 1))} value={String(day)} onChange={(v) => set(Number(v), month, year)} />
      <MiniWheel options={years.map(String)} value={String(year)} onChange={(v) => set(day, month, Number(v))} />
    </div>
  );
}

function MiniWheel({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const ITEM = 44;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const i = options.indexOf(value);
    if (i >= 0 && ref.current) ref.current.scrollTop = i * ITEM;
  }, [value]); // eslint-disable-line
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 rounded-lg bg-primary/15 ring-1 ring-primary/40" />
      <div
        ref={ref}
        onScroll={(e) => {
          const i = Math.round((e.target as HTMLDivElement).scrollTop / ITEM);
          const v = options[i]; if (v && v !== value) onChange(v);
        }}
        className="relative h-[176px] overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        <div style={{ height: 66 }} />
        {options.map((o) => (
          <div key={o} className={cn(
            "snap-center h-11 flex items-center justify-center font-bold transition",
            o === value ? "text-foreground text-lg" : "text-muted-foreground/40 text-sm",
          )}>{o}</div>
        ))}
        <div style={{ height: 66 }} />
      </div>
    </div>
  );
}

/* -------- Activity -------- */
function StepActivity({ value, onChange }: { value: Activity; onChange: (v: Activity) => void }) {
  const items: { v: Activity; t: string; s: string; img: string }[] = [
    { v: "stilla",  t: "Låg",   s: "Mest stillasittande",         img: imgActStilla  },
    { v: "latt",    t: "Lätt",  s: "Lätta promenader 1–2 ggr/v",  img: imgActLatt    },
    { v: "mattlig", t: "Medel", s: "Träning 3–4 ggr/v",           img: imgActMattlig },
    { v: "mycket",  t: "Hög",   s: "Intensiv träning varje dag",  img: imgActMycket  },
  ];
  return (
    <>
      <StepHeader title="Din aktivitetsnivå" />
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {items.map((it) => {
          const active = value === it.v;
          return (
            <button
              key={it.v}
              onClick={() => onChange(it.v)}
              className={cn(
                "group relative aspect-square rounded-2xl overflow-hidden text-left border ring-1 transition-all duration-300",
                active
                  ? "border-teal-400/60 ring-teal-400/40 shadow-[0_0_40px_-8px_oklch(0.78_0.18_180/0.55)] -translate-y-1"
                  : "border-white/10 ring-white/[0.04] hover:-translate-y-0.5",
              )}
            >
              <img src={it.img} alt={it.t} loading="lazy" className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-500", active ? "scale-105" : "group-hover:scale-105")} />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              {active && (
                <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-400 text-zinc-950 shadow-[0_0_18px_oklch(0.78_0.18_180/0.7)]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className={cn("text-base font-bold drop-shadow", active ? "text-teal-300" : "text-white")}>{it.t}</p>
                <p className="text-[10px] text-white/70 mt-0.5 leading-snug">{it.s}</p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* -------- Cheat days -------- */
function StepCheatDays({
  days, setDays, includeProtein, setIncludeProtein,
}: { days: Day[]; setDays: (d: Day[]) => void; includeProtein: boolean; setIncludeProtein: (b: boolean) => void }) {
  const toggle = (d: Day) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  return (
    <>
      <StepHeader title="Vilka är dina cheat days?" sub="Välj vilka dagar du INTE vill följa kosten" emoji="🍕" />
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {ALL_DAYS.map((d) => {
          const active = days.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggle(d)}
              className={cn(
                "relative h-20 rounded-2xl border text-lg font-bold flex items-center justify-center transition backdrop-blur-xl",
                active
                  ? "border-orange-500/70 bg-gradient-to-b from-orange-600/40 to-amber-900/30 text-orange-100 shadow-[0_0_30px_-8px_rgba(251,146,60,0.7),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]",
              )}
            >
              {d}
              {active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-orange-300 text-xs">▼</span>}
            </button>
          );
        })}
      </div>
      {/* Pizza + protein flavor */}
      <div className="relative mt-6 flex items-end justify-between max-w-sm mx-auto px-2 h-24">
        <div className="text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">🍕</div>
        <div className="text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">🥫</div>
      </div>
      {days.length > 0 && (
        <div className="mt-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs max-w-sm mx-auto">
          🍕 Cheat days: {days.map((d) => DAY_FULL[d]).join(", ")}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-6 mb-2">Proteinpulver</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setIncludeProtein(false)}
          className={cn(
            "h-12 rounded-xl border text-sm font-semibold transition",
            !includeProtein ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 bg-card/40",
          )}
        >🚫 Inga pulver</button>
        <button
          onClick={() => setIncludeProtein(true)}
          className={cn(
            "h-12 rounded-xl border text-sm font-semibold transition",
            includeProtein ? "border-primary/60 bg-primary/15 text-primary" : "border-border/60 bg-card/40",
          )}
        >🥤 Inkludera pulver</button>
      </div>
    </>
  );
}

/* -------- Allergies -------- */
function StepAllergies({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const items = [
    { t: "Ingen",    icon: <Ban   className="h-5 w-5 text-red-400" /> },
    { t: "Mjölk",    icon: <Milk  className="h-5 w-5 text-blue-200" /> },
    { t: "Ägg",      icon: <Egg   className="h-5 w-5 text-amber-200" /> },
    { t: "Fisk",     icon: <Fish  className="h-5 w-5 text-cyan-400" /> },
    { t: "Skaldjur", icon: <Shell className="h-5 w-5 text-rose-400" /> },
    { t: "Nötter",   icon: <Nut   className="h-5 w-5 text-amber-400" /> },
    { t: "Gluten",   icon: <Wheat className="h-5 w-5 text-yellow-300" /> },
  ];
  const toggle = (t: string) => {
    if (t === "Ingen") return onChange(["Ingen"]);
    const without = value.filter((x) => x !== "Ingen");
    onChange(without.includes(t) ? without.filter((x) => x !== t) : [...without, t]);
  };
  return (
    <>
      <StepHeader title="Matallergier?" sub="Vi anpassar schemat efter dina allergier" />
      <div className="space-y-2.5">
        {items.map((it) => {
          const active = value.includes(it.t);
          return (
            <RowCard key={it.t} active={active} onClick={() => toggle(it.t)}>
              {it.icon}
              <p className={cn("flex-1 text-sm font-semibold", active && "text-primary")}>{it.t}</p>
              {active && <CheckDot />}
            </RowCard>
          );
        })}
      </div>
    </>
  );
}

/* ====================== FINALE ====================== */
function FinaleScreen({
  goalLabel, genderLabel, trainingDays,
}: { goalLabel: string; genderLabel: string; trainingDays: number }) {
  const statuses = useMemo(() => [
    "Analyserar dina mål…",
    "Beräknar makros…",
    "Väljer rätt livsmedel…",
    "Bygger måltidsschema…",
    "Optimerar cheat days…",
    "Slutför ditt schema…",
  ], []);
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 3800;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 2.2);
      setProgress(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const si = setInterval(() => setStatusIdx((i) => (i + 1) % statuses.length), 620);
    return () => { cancelAnimationFrame(raf); clearInterval(si); };
  }, [statuses.length]);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden flex flex-col items-center justify-center text-white bg-[#02060a]">
      {/* Ambient green glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/10 blur-3xl kp-orb" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[520px] h-[200px] rounded-full bg-emerald-400/20 blur-3xl" />
      </div>

      {/* Center stack */}
      <div className="relative flex flex-col items-center text-center px-6 w-full max-w-sm">
        <h1 className="text-2xl font-extrabold tracking-tight">FitFlow</h1>
        <p className="mt-1 text-sm text-white/70">Ditt kostschema förbereds</p>

        {/* Holographic figure */}
        <div className="relative my-6 h-56 w-56 flex items-center justify-center">
          {/* base platform */}
          <div className="absolute bottom-2 h-3 w-44 rounded-full bg-emerald-400/40 blur-md" />
          <div className="absolute bottom-3 h-1 w-32 rounded-full bg-emerald-300/80" />

          {/* scanning rings */}
          <span className="absolute inset-4 rounded-full border border-emerald-400/40 kp-ring" />
          <span className="absolute inset-4 rounded-full border border-emerald-400/40 kp-ring" style={{ animationDelay: "0.7s" }} />
          <span className="absolute inset-4 rounded-full border border-emerald-400/30 kp-ring" style={{ animationDelay: "1.4s" }} />

          {/* macro badges floating around head */}
          <div className="absolute inset-0">
            <FloatBadge label="PRO" className="left-6 top-10" delay="0s" />
            <FloatBadge label="KOL" className="left-1/2 -translate-x-1/2 top-4" delay="0.4s" />
            <FloatBadge label="FETT" className="right-6 top-10" delay="0.8s" />
          </div>

          {/* body silhouette */}
          <svg viewBox="0 0 100 130" className="relative h-40 w-40 text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.7)]">
            <defs>
              <linearGradient id="bodyG" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <g fill="url(#bodyG)" opacity="0.9">
              <circle cx="50" cy="32" r="14" />
              <path d="M30 56 Q50 46 70 56 L72 92 Q50 100 28 92 Z" />
              <rect x="34" y="92" width="12" height="32" rx="6" />
              <rect x="54" y="92" width="12" height="32" rx="6" />
            </g>
          </svg>

          {/* scanning line */}
          <span className="absolute left-6 right-6 h-px bg-emerald-300/80 shadow-[0_0_12px_2px_rgba(110,231,183,0.8)] kp-scan" />
        </div>

        {/* User choice chips */}
        <div className="flex items-center gap-2 mb-6">
          <ChoiceChip top={goalLabel} bottom="Mål" />
          <ChoiceChip top={genderLabel} bottom="Kön" />
          <ChoiceChip top={`${trainingDays}`} bottom="dagar/v" />
        </div>

        {/* Status + progress */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span key={statusIdx} className="text-white/80 truncate kp-status-in">
              {statuses[statusIdx]}
            </span>
            <span className="font-bold tabular-nums text-emerald-400">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-[width] duration-200 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute bottom-0 h-1 w-1 rounded-full bg-emerald-300/70 kp-float"
            style={{
              left: `${(i * 7 + 5) % 100}%`,
              animationDelay: `${(i * 0.25).toFixed(2)}s`,
              animationDuration: `${2.8 + (i % 5) * 0.4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FloatBadge({ label, className, delay }: { label: string; className?: string; delay?: string }) {
  return (
    <div
      className={cn(
        "absolute h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-extrabold text-emerald-900 bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.8)] kp-float-soft",
        className,
      )}
      style={{ animationDelay: delay }}
    >
      {label}
    </div>
  );
}

function ChoiceChip({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center min-w-[78px]">
      <p className="text-[13px] font-bold leading-tight">{top}</p>
      <p className="text-[10px] text-white/55 leading-tight">{bottom}</p>
    </div>
  );
}

/* ====================== RESULT SCREEN ====================== */
function ResultScreen({
  goals, gender, birthYear, height, currentWeight, targetWeight, targetDate, activity, onContinue,
}: {
  goals: Goal[]; gender: Gender; birthYear: number; height: number;
  currentWeight: number; targetWeight: number; targetDate: Date;
  activity: Activity; onContinue: () => void;
}) {
  const age = new Date().getFullYear() - birthYear;
  const bmr = gender === "man"
    ? 10 * currentWeight + 6.25 * height - 5 * age + 5
    : 10 * currentWeight + 6.25 * height - 5 * age - 161;
  const mult = activity === "stilla" ? 1.2 : activity === "latt" ? 1.375 : activity === "mattlig" ? 1.55 : 1.725;
  let tdee = bmr * mult;
  const primary = goals[0];
  if (primary === "ner") tdee -= 500;
  else if (primary === "bygga") tdee += 300;
  else if (primary === "prestera") tdee += 200;
  const kcal = Math.max(1200, Math.round(tdee / 10) * 10);
  const proteinG = Math.round((primary === "ner" ? 2.2 : primary === "bygga" ? 2.0 : 1.8) * currentWeight);
  const fatG = Math.round((kcal * 0.28) / 9);
  const carbsG = Math.max(50, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  const totalKcalFromMacros = proteinG * 4 + carbsG * 4 + fatG * 9;
  const pctP = Math.round((proteinG * 4 / totalKcalFromMacros) * 100);
  const pctF = Math.round((fatG * 9 / totalKcalFromMacros) * 100);
  const pctC = 100 - pctP - pctF;

  const fmtDate = targetDate.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  const year = targetDate.getFullYear();
  const diff = Math.abs(currentWeight - targetWeight).toFixed(0);
  const direction = currentWeight > targetWeight ? "ner" : currentWeight < targetWeight ? "upp" : "kvar på";

  // animated counter
  const [animKcal, setAnimKcal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimKcal(Math.round(eased * kcal));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kcal]);

  // Save the plan once when the result screen mounts
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      // mark previous plans inactive
      await supabase.from("nutrition_plans").update({ is_active: false }).eq("user_id", u.user.id).eq("is_active", true);
      const { error } = await supabase.from("nutrition_plans").insert({
        user_id: u.user.id,
        kcal, protein_g: proteinG, carbs_g: carbsG, fat_g: fatG,
        goal: primary, activity, gender,
        height_cm: height,
        current_weight_kg: currentWeight,
        target_weight_kg: targetWeight,
        target_date: targetDate.toISOString().slice(0, 10),
        is_active: true,
      });
      if (error) toast.error("Kunde inte spara kostschemat");
      else toast.success("Kostschema sparat");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#05070d] text-white">
      {/* ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.18_165/0.22),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,oklch(0.72_0.15_200/0.16),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.22_300/0.12),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative max-w-md mx-auto px-5 pt-10 pb-32">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <Sparkles className="h-3 w-3" /> Plan klar
          </div>
          <h1 className="mt-4 text-[28px] leading-tight font-extrabold tracking-tight">
            Din personliga<br/>hälsoplan är klar!
          </h1>
          <p className="mt-2 text-sm text-white/60">Du kan ändra detta när som helst</p>
        </div>

        {/* Calorie hero card */}
        <div className="relative mt-7 rounded-[2rem] p-6 overflow-hidden bg-gradient-to-br from-emerald-500/15 via-white/[0.03] to-white/[0.02] border border-emerald-400/25 ring-1 ring-white/5 shadow-[0_30px_60px_-25px_oklch(0.78_0.18_165/0.5)]">
          <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative flex flex-col items-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/80 font-semibold">Daglig kaloriplan</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-6xl font-extrabold tabular-nums bg-gradient-to-b from-emerald-200 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_oklch(0.78_0.18_165/0.45)]">
                {animKcal.toLocaleString("sv-SE")}
              </span>
              <span className="text-sm font-semibold text-emerald-200/80">kcal/dag</span>
            </div>
            {/* segmented bar */}
            <div className="mt-5 w-full h-3 rounded-full overflow-hidden flex ring-1 ring-white/10 bg-white/5">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pctC}%` }} />
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${pctP}%` }} />
              <div className="h-full bg-gradient-to-r from-rose-400 to-fuchsia-500" style={{ width: `${pctF}%` }} />
            </div>
            <div className="mt-2 flex w-full justify-between text-[10px] text-white/50 font-medium">
              <span>Kolhydrater {pctC}%</span>
              <span>Protein {pctP}%</span>
              <span>Fett {pctF}%</span>
            </div>
          </div>
        </div>

        {/* Macro grid */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MacroCard label="Kolhydrater" value={carbsG} unit="g" from="from-amber-400" to="to-orange-500" emoji="🌾" />
          <MacroCard label="Protein" value={proteinG} unit="g" from="from-emerald-400" to="to-teal-500" emoji="🥩" />
          <MacroCard label="Fett" value={fatG} unit="g" from="from-rose-400" to="to-fuchsia-500" emoji="🥑" />
        </div>

        {/* Goal projection */}
        <div className="relative mt-5 rounded-[1.75rem] p-5 overflow-hidden bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-fuchsia-500/10 border border-violet-400/25">
          <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 text-xl">🎯</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-violet-200/80 font-semibold">Du kan nå</p>
              <p className="mt-0.5 text-xl font-extrabold tracking-tight">
                {targetWeight} kg <span className="text-white/60 font-bold">till {fmtDate}!</span>
              </p>
              <p className="text-xs text-white/60">{year} — gå {direction} {diff} kg</p>
            </div>
          </div>
          {/* mini trajectory */}
          <svg viewBox="0 0 200 60" className="mt-3 w-full h-14">
            <defs>
              <linearGradient id="trajG" x1="0" x2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.18 280)" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 165)" />
              </linearGradient>
              <linearGradient id="trajFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.18 165 / 0.35)" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 165 / 0)" />
              </linearGradient>
            </defs>
            <path d="M2 12 C 50 18, 90 30, 140 42 S 198 52, 198 52 L 198 60 L 2 60 Z" fill="url(#trajFill)" />
            <path d="M2 12 C 50 18, 90 30, 140 42 S 198 52, 198 52" fill="none" stroke="url(#trajG)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="2" cy="12" r="3.5" fill="oklch(0.7 0.18 280)" />
            <circle cx="198" cy="52" r="4.5" fill="oklch(0.78 0.18 165)" stroke="white" strokeWidth="1.5" />
          </svg>
          <div className="flex justify-between text-[10px] text-white/50 font-medium">
            <span>Idag · {currentWeight} kg</span>
            <span>{fmtDate} · {targetWeight} kg</span>
          </div>
        </div>

        {/* Health summary */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <SummaryStat label="Aktivitet" value={activity === "stilla" ? "Låg" : activity === "latt" ? "Lätt" : activity === "mattlig" ? "Medel" : "Hög"} icon="⚡" />
          <SummaryStat label="Mål" value={primary === "ner" ? "Gå ner" : primary === "bygga" ? "Bygga" : primary === "halla" ? "Hålla" : "Prestera"} icon="🎯" />
        </div>

        <p className="mt-6 text-center text-[11px] text-white/40">
          Beräknat med Mifflin-St Jeor · justerat efter ditt mål
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 p-4 bg-gradient-to-t from-[#05070d] via-[#05070d]/95 to-transparent">
        <div className="max-w-md mx-auto">
          <button
            onClick={onContinue}
            className="relative w-full h-14 rounded-full text-sm font-bold text-zinc-950 bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 shadow-[0_18px_50px_-12px_oklch(0.78_0.18_165/0.7)] active:scale-[0.99] transition overflow-hidden"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/40" />
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            ✨ Visa mitt kostschema
          </button>
        </div>
      </div>
    </div>
  );
}

function MacroCard({ label, value, unit, from, to, emoji }: { label: string; value: number; unit: string; from: string; to: string; emoji: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 bg-white/[0.04] border border-white/10 ring-1 ring-white/5">
      <span className={cn("pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl bg-gradient-to-br opacity-50", from, to)} />
      <div className="relative flex flex-col items-start">
        <span className="text-base">{emoji}</span>
        <p className="mt-2 text-2xl font-extrabold tabular-nums leading-none">{value}<span className="text-xs font-semibold text-white/50 ml-0.5">{unit}</span></p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</p>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl p-3 bg-white/[0.04] border border-white/10 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</p>
        <p className="text-sm font-bold truncate">{value}</p>
      </div>
    </div>
  );
}