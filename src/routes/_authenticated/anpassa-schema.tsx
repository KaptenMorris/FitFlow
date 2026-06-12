import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Dumbbell, Sparkles, Calendar,
  Target, Flame, Heart, Activity, Zap, TrendingUp, Wrench, Cog, Wand2, Shuffle, MapPin, Search, X,
} from "lucide-react";
import bodyLean from "@/assets/body-lean.jpg";
import bodyAverage from "@/assets/body-average.jpg";
import bodyAthletic from "@/assets/body-athletic.jpg";
import bodyMuscular from "@/assets/body-muscular.jpg";
import bodyHeavy from "@/assets/body-heavy.jpg";

export const Route = createFileRoute("/_authenticated/anpassa-schema")({
  component: AnpassaSchemaPage,
});

type BodyType = "lean" | "average" | "athletic" | "muscular" | "heavy";
type DayMode = "auto" | "manual";
type Goal = "muskler" | "starkare" | "vikt" | "kondition" | "atletisk" | "halsa";
type Experience = "nyborjare" | "medel" | "avancerad";
type Equipment = "fria" | "maskiner" | "bada";

const BODY_TYPES: { id: BodyType; label: string; image: string; weightRange: string }[] = [
  { id: "lean",     label: "Smal",       image: bodyLean,     weightRange: "55–70 kg" },
  { id: "average",  label: "Genomsnitt", image: bodyAverage,  weightRange: "70–85 kg" },
  { id: "athletic", label: "Atletisk",   image: bodyAthletic, weightRange: "75–90 kg" },
  { id: "muscular", label: "Vältränad",  image: bodyMuscular, weightRange: "90–110 kg" },
  { id: "heavy",    label: "Kraftig",    image: bodyHeavy,    weightRange: "110–150 kg" },
];

const STEPS = ["Profil", "Mål", "Muskler", "Kroppstyp", "Schema"];

import goalMuskler from "@/assets/goal-muskler.jpg";
import goalStarkare from "@/assets/goal-starkare.jpg";
import goalVikt from "@/assets/goal-vikt.jpg";
import goalKondition from "@/assets/goal-kondition.jpg";
import goalAtletisk from "@/assets/goal-atletisk.jpg";
import goalHalsa from "@/assets/goal-halsa.jpg";
import muscleBrost from "@/assets/muscle-brost.jpg";
import muscleRygg from "@/assets/muscle-rygg.jpg";
import muscleAxlar from "@/assets/muscle-axlar.jpg";
import muscleArmar from "@/assets/muscle-armar.jpg";
import muscleMage from "@/assets/muscle-mage.jpg";
import muscleBen from "@/assets/muscle-ben.jpg";
import muscleRumpa from "@/assets/muscle-rumpa.jpg";
import muscleTriceps from "@/assets/muscle-triceps.jpg";
import muscleBiceps from "@/assets/muscle-biceps.jpg";
import muscleNacke from "@/assets/muscle-nacke.jpg";

type MuscleId = "brost"|"rygg"|"axlar"|"armar"|"mage"|"ben"|"rumpa"|"triceps"|"biceps"|"nacke";
const MUSCLES: { id: MuscleId; label: string; image: string }[] = [
  { id: "brost",   label: "Bröst",   image: muscleBrost },
  { id: "rygg",    label: "Rygg",    image: muscleRygg },
  { id: "axlar",   label: "Axlar",   image: muscleAxlar },
  { id: "armar",   label: "Armar",   image: muscleArmar },
  { id: "mage",    label: "Mage",    image: muscleMage },
  { id: "ben",     label: "Ben",     image: muscleBen },
  { id: "rumpa",   label: "Rumpa",   image: muscleRumpa },
  { id: "biceps",  label: "Biceps",  image: muscleBiceps },
  { id: "triceps", label: "Triceps", image: muscleTriceps },
  { id: "nacke",   label: "Nacke",   image: muscleNacke },
];

const GOALS: { id: Goal; label: string; desc: string; image: string }[] = [
  { id: "muskler",   label: "Bygga muskler",          desc: "Hypertrofi · 8–12 reps",      image: goalMuskler },
  { id: "starkare",  label: "Bli starkare",           desc: "Styrka · 4–6 tunga reps",     image: goalStarkare },
  { id: "vikt",      label: "Gå ner i vikt",          desc: "Fettförbränning · hög volym", image: goalVikt },
  { id: "kondition", label: "Kondition",              desc: "Uthållighet & puls",          image: goalKondition },
  { id: "atletisk",  label: "Atletisk & funktionell", desc: "Explosiv styrka",             image: goalAtletisk },
  { id: "halsa",     label: "Allmän hälsa",           desc: "Rörlighet & välmående",       image: goalHalsa },
];

const EXPERIENCES: { id: Experience; label: string }[] = [
  { id: "nyborjare",  label: "Nybörjare" },
  { id: "medel",      label: "Medel" },
  { id: "avancerad",  label: "Avancerad" },
];

const EQUIPMENTS: { id: Equipment; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "fria",     label: "Fria vikter", icon: Dumbbell },
  { id: "maskiner", label: "Maskiner",    icon: Cog },
  { id: "bada",     label: "Båda",        icon: Wrench },
];

const FREE_WEIGHT_EQ = ["Hantel", "Skivstång", "EZ-stång", "Olympisk skivstång", "Kettlebell", "Hammare", "Trapstång", "Medicinboll"];
const MACHINE_EQ = ["Kabel", "Smithmaskin", "Hävmaskin", "Crosstrainer", "SkiErg", "Trappmaskin", "Motionscykel", "Armergometer", "Släde"];

function equipmentListFor(pref: Equipment): string[] {
  if (pref === "fria") return FREE_WEIGHT_EQ;
  if (pref === "maskiner") return MACHINE_EQ;
  return [...FREE_WEIGHT_EQ, ...MACHINE_EQ];
}

const GOAL_SETTINGS: Record<Goal, { exercisesPerSession: number; setsPerExercise: number; repRange: string; minutes: number }> = {
  muskler:   { exercisesPerSession: 5, setsPerExercise: 4, repRange: "8–12",  minutes: 55 },
  starkare:  { exercisesPerSession: 4, setsPerExercise: 5, repRange: "4–6",   minutes: 60 },
  vikt:      { exercisesPerSession: 6, setsPerExercise: 3, repRange: "12–15", minutes: 50 },
  kondition: { exercisesPerSession: 5, setsPerExercise: 3, repRange: "15–20", minutes: 45 },
  atletisk:  { exercisesPerSession: 5, setsPerExercise: 4, repRange: "6–10",  minutes: 50 },
  halsa:     { exercisesPerSession: 4, setsPerExercise: 3, repRange: "10–12", minutes: 40 },
};

function bodyPartsFor(goal: Goal): string[] {
  if (goal === "kondition") return ["Kondition", "Ben", "Mage", "Rygg"];
  if (goal === "vikt") return ["Bröst", "Rygg", "Ben", "Axlar", "Mage", "Kondition"];
  return ["Bröst", "Rygg", "Axlar", "Biceps", "Triceps", "Ben", "Mage"];
}

function combineGoalSettings(goals: Goal[]) {
  if (goals.length === 0) return GOAL_SETTINGS.muskler;
  if (goals.length === 1) return GOAL_SETTINGS[goals[0]];
  const arr = goals.map((g) => GOAL_SETTINGS[g]);
  const avg = (k: "exercisesPerSession" | "setsPerExercise" | "minutes") =>
    Math.round(arr.reduce((s, v) => s + v[k], 0) / arr.length);
  // Combine rep ranges: use the broadest min..max
  const ranges = arr.map((v) => v.repRange.split("–").map((n) => parseInt(n, 10)));
  const lo = Math.min(...ranges.map((r) => r[0]));
  const hi = Math.max(...ranges.map((r) => r[1] || r[0]));
  return {
    exercisesPerSession: avg("exercisesPerSession"),
    setsPerExercise: avg("setsPerExercise"),
    repRange: `${lo}–${hi}`,
    minutes: avg("minutes"),
  };
}

/* ====================== PAGE ====================== */
function AnpassaSchemaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 — Profile
  const [age, setAge] = useState(28);
  const [height, setHeight] = useState(180);
  const [weight, setWeight] = useState(80);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [dayMode, setDayMode] = useState<DayMode>("auto");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState<number>(4);

  // Step 2 — Goals (multi-select)
  const [goals, setGoals] = useState<Goal[]>([]);
  const primaryGoal: Goal | null = goals[0] ?? null;
  const toggleGoal = (g: Goal) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const [experience, setExperience] = useState<Experience>("medel");
  const [equipment, setEquipment] = useState<Equipment>("bada");
  const [volumeMode, setVolumeMode] = useState<"auto" | "manual">("auto");
  const [customExercises, setCustomExercises] = useState<number>(5);
  const [customSets, setCustomSets] = useState<number>(4);

  // Gym selection — when set, exercises are filtered by what the gym has
  type Gym = { id: string; name: string; city: string | null; chain: string | null; equipment: string[] };
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymId, setGymId] = useState<string>("");
  const selectedGym = useMemo(() => gyms.find((g) => g.id === gymId) ?? null, [gyms, gymId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gyms" as any)
        .select("id,name,city,chain,equipment")
        .order("name");
      if (data) setGyms(data as unknown as Gym[]);
    })();
  }, []);

  // Step 3 — Body type
  const [current, setCurrent] = useState<BodyType | null>(null);
  const [target, setTarget] = useState<BodyType | null>(null);

  // Step 3 — Muscle groups (default: all)
  const [muscles, setMuscles] = useState<MuscleId[]>(() => MUSCLES.map((m) => m.id));

  // Schema name
  const [nameMode, setNameMode] = useState<"auto" | "manual">("auto");
  const [customName, setCustomName] = useState<string>("");

  // Step 4 — saving
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Prefill ålder/längd/vikt från profilen
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("birth_date,height_cm,current_weight_kg")
        .eq("id", u.user.id)
        .maybeSingle();
      if (!p) return;
      const bd = (p as any).birth_date as string | null;
      if (bd) {
        const d = new Date(bd);
        if (!isNaN(d.getTime())) {
          const now = new Date();
          let a = now.getFullYear() - d.getFullYear();
          const m = now.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
          if (a > 0) setAge(a);
        }
      }
      const h = (p as any).height_cm;
      if (h) setHeight(Math.round(Number(h)));
      const w = (p as any).current_weight_kg;
      if (w) setWeight(Math.round(Number(w)));
    })();
  }, []);

  const canNext = useMemo(() => {
    if (step === 0) {
      if (dayMode === "auto") return age > 0 && height > 0 && weight > 0 && daysPerWeek > 0;
      return age > 0 && height > 0 && weight > 0 && selectedDays.length > 0;
    }
    if (step === 1) return goals.length > 0;
    if (step === 2) return muscles.length > 0;
    if (step === 3) return current !== null && target !== null;
    return true;
  }, [step, age, height, weight, daysPerWeek, dayMode, selectedDays, goals, current, target, muscles]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => (step === 0 ? navigate({ to: "/hem" }) : setStep((s) => s - 1));

  // Compute a tailored weekly plan from selections
  const effectiveDays = dayMode === "manual" ? selectedDays.length : daysPerWeek;
  const plan = useMemo(
    () => buildPlan(effectiveDays, current, target, primaryGoal, dayMode === "manual" ? selectedDays : null),
    [effectiveDays, current, target, primaryGoal, dayMode, selectedDays]
  );

  const save = async () => {
    setSaving(true);
    setGenerating(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); toast.error("Inte inloggad"); return; }
    const goalMetas = goals.map((id) => GOALS.find((g) => g.id === id)!).filter(Boolean);
    const baseSettings = combineGoalSettings(goals);
    const settings = volumeMode === "manual"
      ? { ...baseSettings, exercisesPerSession: customExercises, setsPerExercise: customSets }
      : baseSettings;
    const bodyParts = goals.length
      ? Array.from(new Set(goals.flatMap((g) => bodyPartsFor(g))))
      : ["Bröst", "Rygg", "Ben"];
    const muscleLabels = muscles.map((id) => MUSCLES.find((m) => m.id === id)?.label ?? id);
    // If a gym is selected, prefer its equipment list. Otherwise fall back to
    // the user's free/machine preference.
    const equipmentPref = selectedGym
      ? selectedGym.equipment
      : equipmentListFor(equipment);
    const autoName =
      goalMetas.length === 0 ? "Personligt schema"
      : goalMetas.length === 1 ? goalMetas[0].label
      : goalMetas.length === 2 ? `${goalMetas[0].label} + ${goalMetas[1].label}`
      : "Personligt kombi-schema";
    const trimmed = customName.trim();
    const name = nameMode === "manual" && trimmed.length > 0 ? trimmed : autoName;
    const tags = [
      ...(goalMetas.length ? goalMetas.map((m) => m.label) : ["Personligt"]),
      selectedGym ? selectedGym.name : (EQUIPMENTS.find((e) => e.id === equipment)?.label ?? ""),
      EXPERIENCES.find((e) => e.id === experience)?.label ?? "",
    ].filter(Boolean);
    const desc = JSON.stringify({
      age, height, weight,
      daysPerWeek: effectiveDays, dayMode, selectedDays,
      // Compatibility fields read by schema detail page
      daysMode: dayMode === "manual" ? "me" : "app",
      pickedDays: dayMode === "manual"
        ? selectedDays.map((i) => ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"][i])
        : undefined,
      period: `${weeks} veckor`,
      level: EXPERIENCES.find((e) => e.id === experience)?.label ?? "",
      current, target,
      goal: primaryGoal,
      goals,
      experience, equipment,
      gymId: selectedGym?.id ?? null,
      gymName: selectedGym?.name ?? null,
      bodyParts,
      muscleGroups: muscleLabels,
      muscleIds: muscles,
      equipmentPref,
      exercisesPerSession: settings.exercisesPerSession,
      setsPerExercise: settings.setsPerExercise,
      repRange: settings.repRange,
      plan,
    });
    const difficulty =
      experience === "avancerad" ? "Hård" :
      experience === "nyborjare" ? "Lätt" : "Medel";
    const { data: inserted, error } = await supabase
      .from("training_schemas")
      .insert({
        user_id: u.user.id,
        name,
        description: desc,
        tags,
        sessions_per_week: effectiveDays,
        difficulty,
        progress_percent: 0,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      setGenerating(false);
      return toast.error(error.message);
    }
    // Keep overlay until animation completes; navigation triggered by overlay onDone
    setSaving(false);
    (window as any).__fitflowNewSchemaId = inserted?.id;
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "#0A0D14" }}>
      {/* Ambient teal glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.13_190/0.18),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,oklch(0.7_0.15_200/0.12),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 pt-3 pb-56">
        {/* Top bar */}
        <div className="flex items-center gap-3 pb-5">
          <button
            onClick={back}
            className="h-10 w-10 rounded-full grid place-items-center bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition"
          >
            <ArrowLeft className="h-5 w-5 text-white/80" />
          </button>
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">Steg {step + 1} av {STEPS.length}</p>
        </div>

        {/* Stepper */}
        <StepIndicator step={step} />

        {/* Title */}
        <div className="mt-4 mb-4">
          <h1 className="text-[24px] leading-tight font-extrabold tracking-tight">
            Anpassa ditt träningsschema
          </h1>
          <p className="text-[13px] text-white/55 mt-1">
            {step === 0 && "Berätta lite om dig — vi bygger schemat efter dig."}
            {step === 1 && "Vad vill du uppnå? Vi optimerar passen för ditt mål."}
            {step === 2 && "Välj muskelgrupperna du vill fokusera på."}
            {step === 3 && "Välj kroppstyp idag och vart du vill nå."}
            {step === 4 && "FitFlow har balanserat din vecka — granska och bekräfta."}
          </p>
        </div>

        {step === 0 && (
          <StepProfile
            age={age} setAge={setAge}
            height={height} setHeight={setHeight}
            weight={weight} setWeight={setWeight}
            daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
            dayMode={dayMode} setDayMode={setDayMode}
            selectedDays={selectedDays} setSelectedDays={setSelectedDays}
            weeks={weeks} setWeeks={setWeeks}
          />
        )}
        {step === 1 && (
          <StepGoal
            goals={goals} toggleGoal={toggleGoal}
            experience={experience} setExperience={setExperience}
            equipment={equipment} setEquipment={setEquipment}
            volumeMode={volumeMode} setVolumeMode={setVolumeMode}
            customExercises={customExercises} setCustomExercises={setCustomExercises}
            customSets={customSets} setCustomSets={setCustomSets}
            gyms={gyms} gymId={gymId} setGymId={setGymId}
          />
        )}
        {step === 2 && (
          <StepMuscles muscles={muscles} setMuscles={setMuscles} />
        )}
        {step === 3 && (
          <StepBodyType
            current={current} setCurrent={setCurrent}
            target={target} setTarget={setTarget}
          />
        )}
        {step === 4 && (
          <StepPreview
            plan={plan} daysPerWeek={effectiveDays} goals={goals} equipment={equipment}
            nameMode={nameMode} setNameMode={setNameMode}
            customName={customName} setCustomName={setCustomName}
            autoName={
              goals.length === 0 ? "Personligt schema"
              : goals.length === 1 ? (GOALS.find((g) => g.id === goals[0])?.label ?? "Personligt schema")
              : goals.length === 2 ? `${GOALS.find((g) => g.id === goals[0])?.label} + ${GOALS.find((g) => g.id === goals[1])?.label}`
              : "Personligt kombi-schema"
            }
          />
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-20 inset-x-0 z-30 px-5 pt-6 pb-3 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/95 to-transparent">
        <div className="max-w-md mx-auto">
          {step < STEPS.length - 1 ? (
            <button
              disabled={!canNext}
              onClick={next}
              className={cn(
                "relative w-full h-12 rounded-2xl text-[15px] font-bold transition overflow-hidden",
                "bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_18px_40px_-12px_oklch(0.78_0.13_190/0.7)]",
                "active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
              )}
            >
              <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              <span className="inline-flex items-center justify-center gap-2">
                Fortsätt <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ) : (
            <button
              disabled={saving}
              onClick={save}
              className="relative w-full h-12 rounded-2xl text-[15px] font-bold bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_18px_40px_-12px_oklch(0.78_0.13_190/0.7)] active:scale-[0.99] disabled:opacity-50 overflow-hidden"
            >
              <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              {saving ? "Skapar…" : "Skapa mitt personliga schema"}
            </button>
          )}
        </div>
      </div>
      {generating && (
        <GenerationOverlay
          fields={[
            { label: "Ålder", value: `${age} år` },
            { label: "Längd", value: `${height} cm` },
            { label: "Vikt", value: `${weight} kg`.replace(".", ",") },
            { label: "Utrustning", value: EQUIPMENTS.find((e) => e.id === equipment)?.label ?? "" },
            { label: "Nivå", value: EXPERIENCES.find((e) => e.id === experience)?.label ?? "" },
            { label: "Dagar/vecka", value: `${effectiveDays} dagar` },
            { label: "Mål", value: goals.map((id) => GOALS.find((g) => g.id === id)?.label).filter(Boolean).join(" + ") || "" },
          ]}
          onDone={() => {
            const newId = (window as any).__fitflowNewSchemaId as string | undefined;
            setGenerating(false);
            if (newId) {
              toast.success("Schema skapat!");
              navigate({ to: "/schema/$id", params: { id: newId } });
            }
          }}
        />
      )}
    </div>
  );
}

/* ====================== GENERATION OVERLAY ====================== */
function GenerationOverlay({ fields, onDone }: { fields: { label: string; value: string }[]; onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const stages = [
    "Analyserar dina mål…",
    "Optimerar återhämtning…",
    "Beräknar optimal träningsvolym…",
    "Väljer ut perfekta övningar…",
    "Bygger din vecka…",
  ];

  useEffect(() => {
    const start = performance.now();
    const total = 4200; // ms
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / total);
      const pct = Math.floor(p * 100);
      setProgress(pct);
      setStageIdx(Math.min(stages.length - 1, Math.floor(p * stages.length)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 650);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealCount = Math.min(fields.length, Math.ceil((progress / 100) * fields.length));
  const done = progress >= 100;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0A0D14] text-white animate-fade-in overflow-y-auto">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.2_260/0.35),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.13_190/0.18),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 pt-6 pb-24">
        <h1 className="text-center font-extrabold text-[20px] tracking-tight">Nytt Schema</h1>
        <p className={cn(
          "text-center text-[13px] mt-2 transition-colors font-semibold",
          done ? "text-emerald-400" : "text-white/70"
        )}>
          {done ? "✓ Ditt program är klart!" : stages[stageIdx]}
        </p>

        {/* Hero card */}
        <div className="mt-5 flex justify-center">
          <div className="relative h-36 w-32 rounded-2xl border-2 border-[oklch(0.6_0.2_260/0.7)] bg-gradient-to-br from-[oklch(0.3_0.15_260/0.5)] to-[oklch(0.15_0.1_260/0.3)] grid place-items-center shadow-[0_0_40px_-6px_oklch(0.6_0.2_260/0.7),inset_0_0_30px_oklch(0.6_0.2_260/0.25)]">
            <div className="absolute inset-2 rounded-xl bg-white/[0.04] grid place-items-center">
              <Dumbbell className="h-12 w-12 text-white/70 animate-pulse" />
            </div>
            <span className="absolute top-1.5 left-1.5 h-3 w-3 border-l-2 border-t-2 border-[oklch(0.78_0.13_190)]" />
            <span className="absolute top-1.5 right-1.5 h-3 w-3 border-r-2 border-t-2 border-[oklch(0.78_0.13_190)]" />
            <span className="absolute bottom-1.5 left-1.5 h-3 w-3 border-l-2 border-b-2 border-[oklch(0.78_0.13_190)]" />
            <span className="absolute bottom-1.5 right-1.5 h-3 w-3 border-r-2 border-b-2 border-[oklch(0.78_0.13_190)]" />
          </div>
        </div>

        {/* Field checklist */}
        <div className="mt-6 space-y-2">
          {fields.map((f, i) => {
            const visible = i < revealCount;
            const checked = i < revealCount - 0; // checked once visible
            return (
              <div
                key={f.label}
                className={cn(
                  "flex items-center gap-3 px-4 h-12 rounded-2xl border bg-white/[0.03] border-white/10 transition-all duration-500",
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}
              >
                <span className="text-[12px] uppercase tracking-wider text-white/55 flex-1">{f.label}</span>
                <span className="text-[14px] font-bold text-white">{f.value}</span>
                <span className={cn(
                  "h-6 w-6 rounded-full grid place-items-center transition-all",
                  checked
                    ? "bg-[oklch(0.6_0.2_260)] text-white shadow-[0_0_10px_oklch(0.6_0.2_260/0.7)]"
                    : "bg-white/10 text-white/40"
                )}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[12px] font-semibold", done ? "text-emerald-400" : "text-white/60")}>
              {done ? "Klar!" : "Genererar…"}
            </span>
            <span className={cn("text-2xl font-extrabold tabular-nums", done ? "text-emerald-400" : "text-white")}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-150",
                done ? "bg-emerald-400 shadow-[0_0_12px_rgb(74,222,128,0.7)]" : "bg-[oklch(0.6_0.2_260)] shadow-[0_0_12px_oklch(0.6_0.2_260/0.7)]"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!done && (
          <p className="text-center text-[11px] text-white/40 mt-10">Vänta medan vi skapar ditt program…</p>
        )}
      </div>

      {done && (
        <div className="fixed bottom-20 inset-x-0 z-30 px-5 pt-6 pb-3 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/95 to-transparent animate-fade-in">
          <div className="max-w-md mx-auto">
            <button
              onClick={onDone}
              className="relative w-full h-12 rounded-2xl text-[15px] font-bold bg-[oklch(0.6_0.2_260)] text-white shadow-[0_18px_40px_-12px_oklch(0.6_0.2_260/0.8)] active:scale-[0.99]"
            >
              Visa mitt program →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================== STEP INDICATOR ====================== */
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "h-7 w-7 rounded-full grid place-items-center text-[11px] font-bold shrink-0 transition",
                  done && "bg-[oklch(0.78_0.13_190)] text-[#062028]",
                  active && "bg-white text-[#062028] shadow-[0_0_18px_oklch(0.78_0.13_190/0.7)]",
                  !done && !active && "bg-white/[0.06] text-white/50 border border-white/10",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </div>
              <span className={cn("text-[11px] uppercase tracking-wider truncate", active ? "text-white" : "text-white/40")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-white/10 relative overflow-hidden">
                {done && <div className="absolute inset-0 bg-[oklch(0.78_0.13_190)]" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ====================== STEP 1 — PROFILE ====================== */
function StepProfile({
  age, setAge, height, setHeight, weight, setWeight, daysPerWeek, setDaysPerWeek,
  dayMode, setDayMode, selectedDays, setSelectedDays, weeks, setWeeks,
}: {
  age: number; setAge: (n: number) => void;
  height: number; setHeight: (n: number) => void;
  weight: number; setWeight: (n: number) => void;
  daysPerWeek: number; setDaysPerWeek: (n: number) => void;
  dayMode: DayMode; setDayMode: (m: DayMode) => void;
  selectedDays: number[]; setSelectedDays: (d: number[]) => void;
  weeks: number; setWeeks: (n: number) => void;
}) {
  const toggleDay = (i: number) => {
    if (selectedDays.includes(i)) setSelectedDays(selectedDays.filter((x) => x !== i));
    else setSelectedDays([...selectedDays, i].sort((a, b) => a - b));
  };
  const shortDays = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <CompactNum label="Ålder" unit="år" value={age} onChange={setAge} min={14} max={90} />
        <CompactNum label="Längd" unit="cm" value={height} onChange={setHeight} min={140} max={220} step={0.1} decimals={1} />
        <CompactNum label="Vikt" unit="kg" value={weight} onChange={setWeight} min={40} max={200} step={0.1} decimals={1} />
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-[oklch(0.78_0.13_190/0.15)] border border-[oklch(0.78_0.13_190/0.3)] grid place-items-center text-[oklch(0.85_0.13_190)]">
            <Calendar className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-white/90">Träningsdagar</span>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-3">
          {([
            { id: "auto" as DayMode, label: "FitFlow väljer" },
            { id: "manual" as DayMode, label: "Jag väljer dagar" },
          ]).map((m) => {
            const on = dayMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setDayMode(m.id)}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold transition",
                  on
                    ? "bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_0_14px_-4px_oklch(0.78_0.13_190/0.8)]"
                    : "text-white/60 hover:text-white/90"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {dayMode === "auto" ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-white/45">Pass per vecka</span>
              <span className="text-lg font-bold tabular-nums text-[oklch(0.85_0.13_190)]">{daysPerWeek}</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[2, 3, 4, 5, 6, 7].map((n) => {
                const on = daysPerWeek === n;
                return (
                  <button
                    key={n}
                    onClick={() => setDaysPerWeek(n)}
                    className={cn(
                      "h-10 rounded-xl text-sm font-bold tabular-nums transition",
                      on
                        ? "bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_0_18px_-4px_oklch(0.78_0.13_190/0.8)]"
                        : "bg-white/[0.04] text-white/70 border border-white/10 hover:bg-white/[0.08]"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-white/45">Välj dina dagar</span>
              <span className="text-lg font-bold tabular-nums text-[oklch(0.85_0.13_190)]">{selectedDays.length}</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {shortDays.map((d, i) => {
                const on = selectedDays.includes(i);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-11 rounded-xl text-xs font-bold transition",
                      on
                        ? "bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_0_18px_-4px_oklch(0.78_0.13_190/0.8)]"
                        : "bg-white/[0.04] text-white/70 border border-white/10 hover:bg-white/[0.08]"
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {selectedDays.length === 0 && (
              <p className="text-[11px] text-white/40 mt-2">Tryck på dagarna du vill träna.</p>
            )}
          </>
        )}
      </div>

      {/* Weeks selector */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-[oklch(0.78_0.13_190/0.15)] border border-[oklch(0.78_0.13_190/0.3)] grid place-items-center text-[oklch(0.85_0.13_190)]">
            <Calendar className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-white/90">Längd på program</span>
          <span className="ml-auto text-lg font-bold tabular-nums text-[oklch(0.85_0.13_190)]">{weeks} v</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[2, 4, 8, 12].map((n) => {
            const on = weeks === n;
            return (
              <button
                key={n}
                onClick={() => setWeeks(n)}
                className={cn(
                  "h-10 rounded-xl text-sm font-bold tabular-nums transition",
                  on
                    ? "bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_0_18px_-4px_oklch(0.78_0.13_190/0.8)]"
                    : "bg-white/[0.04] text-white/70 border border-white/10 hover:bg-white/[0.08]"
                )}
              >
                {n} v
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NumberCard({
  label, unit, value, onChange, min, max, icon,
}: {
  label: string; unit: string; value: number; onChange: (n: number) => void;
  min: number; max: number; icon: React.ReactNode;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-[oklch(0.78_0.13_190/0.15)] border border-[oklch(0.78_0.13_190/0.3)] grid place-items-center text-[oklch(0.85_0.13_190)] shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
        <p className="text-xl font-bold tabular-nums">
          {value}
          <span className="text-xs font-medium text-white/40 ml-1">{unit}</span>
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(clamp(value - 1))}
          className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/10 text-white/80 text-lg font-bold hover:bg-white/[0.08]"
        >−</button>
        <button
          onClick={() => onChange(clamp(value + 1))}
          className="h-9 w-9 rounded-xl bg-[oklch(0.78_0.13_190/0.15)] border border-[oklch(0.78_0.13_190/0.4)] text-[oklch(0.9_0.13_190)] text-lg font-bold hover:bg-[oklch(0.78_0.13_190/0.25)]"
        >+</button>
      </div>
    </div>
  );
}

function CompactNum({
  label, unit, value, onChange, min, max, step = 1, decimals = 0,
}: {
  label: string; unit: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; decimals?: number;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const round = (n: number) => Math.round(n * 10 ** decimals) / 10 ** decimals;
  const [text, setText] = useState<string>(value.toString().replace(".", ","));
  useEffect(() => {
    setText(decimals > 0 ? value.toFixed(decimals).replace(".", ",") : String(value));
  }, [value, decimals]);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-2.5 flex flex-col items-center">
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d,\.]/g, "");
            setText(v);
            const parsed = parseFloat(v.replace(",", "."));
            if (!isNaN(parsed)) onChange(clamp(round(parsed)));
          }}
          onBlur={() => {
            const parsed = parseFloat(text.replace(",", "."));
            const final = isNaN(parsed) ? value : clamp(round(parsed));
            onChange(final);
            setText(decimals > 0 ? final.toFixed(decimals).replace(".", ",") : String(final));
          }}
          className="w-12 bg-transparent text-center text-lg font-bold tabular-nums leading-tight outline-none focus:text-[oklch(0.9_0.13_190)]"
        />
        <span className="text-[10px] font-medium text-white/40">{unit}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <button
          onClick={() => onChange(clamp(round(value - step)))}
          className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/10 text-white/80 text-sm font-bold hover:bg-white/[0.08]"
        >−</button>
        <button
          onClick={() => onChange(clamp(round(value + step)))}
          className="h-7 w-7 rounded-lg bg-[oklch(0.78_0.13_190/0.15)] border border-[oklch(0.78_0.13_190/0.4)] text-[oklch(0.9_0.13_190)] text-sm font-bold hover:bg-[oklch(0.78_0.13_190/0.25)]"
        >+</button>
      </div>
    </div>
  );
}

/* ====================== STEP 2 — BODY TYPE ====================== */
function StepBodyType({
  current, setCurrent, target, setTarget,
}: {
  current: BodyType | null; setCurrent: (v: BodyType) => void;
  target: BodyType | null; setTarget: (v: BodyType) => void;
}) {
  return (
    <div className="space-y-6">
      <BodyGrid title="Hur ser din kropp ut idag?" value={current} onChange={setCurrent} badge="Nuvarande" />
      <BodyGrid title="Hur vill du att den ska se ut?" value={target} onChange={setTarget} badge="Mål" />
    </div>
  );
}

/* ====================== STEP — MUSCLES ====================== */
function StepMuscles({ muscles, setMuscles }: { muscles: MuscleId[]; setMuscles: (m: MuscleId[]) => void }) {
  const allOn = muscles.length === MUSCLES.length;
  const toggle = (id: MuscleId) => {
    if (muscles.includes(id)) setMuscles(muscles.filter((x) => x !== id));
    else setMuscles([...muscles, id]);
  };
  const toggleAll = () => setMuscles(allOn ? [] : MUSCLES.map((m) => m.id));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[oklch(0.78_0.13_190/0.4)] bg-[oklch(0.78_0.13_190/0.1)]">
            <Target className="h-3.5 w-3.5 text-[oklch(0.85_0.13_190)]" />
          </span>
          <p className="text-[15px] font-bold tracking-tight text-white">Vilka delar vill du fokusera på?</p>
        </div>
        <span className="text-[11px] font-bold text-[oklch(0.85_0.13_190)] tabular-nums">{muscles.length}/{MUSCLES.length}</span>
      </div>
      <p className="text-[12px] text-white/50 -mt-1">Välj en eller flera</p>

      <div className="grid grid-cols-3 gap-2.5">
        {MUSCLES.map((m) => {
          const on = muscles.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className={cn(
                "group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all",
                on
                  ? "border-[oklch(0.78_0.13_190)] shadow-[0_0_22px_-4px_oklch(0.78_0.13_190/0.7),inset_0_0_18px_oklch(0.78_0.13_190/0.15)]"
                  : "border-white/10 hover:border-white/25 opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={m.image}
                alt={m.label}
                loading="lazy"
                width={512}
                height={512}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-transform",
                  on ? "scale-[1.04]" : "group-hover:scale-[1.02]"
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />
              {on && (
                <span className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full grid place-items-center bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_0_10px_oklch(0.78_0.13_190/0.7)]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                </span>
              )}
              <span
                className={cn(
                  "absolute bottom-1.5 inset-x-1 text-center text-[12px] font-bold tracking-wide",
                  on ? "text-[oklch(0.95_0.13_190)]" : "text-white/90"
                )}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={toggleAll}
        className={cn(
          "w-full flex items-center gap-2.5 px-4 h-12 rounded-2xl border transition mt-1",
          allOn
            ? "bg-[oklch(0.78_0.13_190/0.12)] border-[oklch(0.78_0.13_190/0.5)]"
            : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
        )}
      >
        <span className={cn(
          "h-5 w-5 rounded-md grid place-items-center transition",
          allOn ? "bg-[oklch(0.78_0.13_190)] text-[#062028]" : "border border-white/30"
        )}>
          {allOn && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
        </span>
        <span className="text-[13px] font-bold text-white">Välj alla muskelgrupper</span>
      </button>
    </div>
  );
}

/* ====================== STEP 2 — GOAL ====================== */
function StepGoal({
  goals, toggleGoal, experience, setExperience, equipment, setEquipment,
  volumeMode, setVolumeMode, customExercises, setCustomExercises, customSets, setCustomSets,
  gyms, gymId, setGymId,
}: {
  goals: Goal[]; toggleGoal: (g: Goal) => void;
  experience: Experience; setExperience: (e: Experience) => void;
  equipment: Equipment; setEquipment: (e: Equipment) => void;
  volumeMode: "auto" | "manual"; setVolumeMode: (m: "auto" | "manual") => void;
  customExercises: number; setCustomExercises: (n: number) => void;
  customSets: number; setCustomSets: (n: number) => void;
  gyms: { id: string; name: string; city: string | null; chain: string | null; equipment: string[] }[];
  gymId: string; setGymId: (v: string) => void;
}) {
  const combined = combineGoalSettings(goals);
  const autoEx = combined.exercisesPerSession;
  const autoSets = combined.setsPerExercise;
  const selectedGym = gyms.find((g) => g.id === gymId) ?? null;
  return (
    <div className="space-y-4">
      {/* Goal */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[oklch(0.78_0.13_190/0.4)] bg-[oklch(0.78_0.13_190/0.1)]">
            <Target className="h-3.5 w-3.5 text-[oklch(0.85_0.13_190)]" />
          </span>
          <p className="text-[15px] font-bold tracking-tight text-white">Vad är dina mål?</p>
        </div>
        <p className="text-[11px] text-white/45 -mt-1 mb-3 ml-9">Välj ett eller flera — vi kombinerar dem till ett skräddarsytt schema.</p>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((g) => {
            const on = goals.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                className={cn(
                  "group relative text-left rounded-3xl p-4 border transition-all duration-300 overflow-hidden",
                  on
                    ? "bg-[oklch(0.78_0.13_190/0.06)] border-2 border-[oklch(0.78_0.13_190/0.8)] shadow-[0_0_30px_-4px_oklch(0.78_0.13_190/0.35),inset_0_1px_0_oklch(0.95_0.13_190/0.15)]"
                    : "bg-white/[0.025] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] hover:-translate-y-0.5"
                )}
              >
                {on && (
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_0%,oklch(0.78_0.13_190/0.18),transparent_70%)]" />
                )}
                <div className={cn(
                  "relative h-20 w-full rounded-2xl overflow-hidden mb-3 border transition-all",
                  on
                    ? "border-[oklch(0.78_0.13_190/0.5)] shadow-[0_0_20px_-6px_oklch(0.78_0.13_190/0.5)]"
                    : "border-white/[0.06] group-hover:border-white/15"
                )}>
                  <img
                    src={g.image}
                    alt={g.label}
                    width={512}
                    height={512}
                    loading="lazy"
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover transition-transform duration-500",
                      on ? "scale-105" : "scale-100 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    )}
                  />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {on && (
                    <span aria-hidden className="absolute inset-0 bg-[oklch(0.78_0.13_190/0.15)] mix-blend-overlay" />
                  )}
                </div>
                <p className={cn("text-[14px] font-bold leading-tight", on ? "text-white" : "text-white/90")}>{g.label}</p>
                <p className={cn("text-[11px] mt-1 leading-snug", on ? "text-[oklch(0.85_0.13_190/0.75)]" : "text-white/45")}>{g.desc}</p>
                {on && (
                  <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[oklch(0.78_0.13_190)] grid place-items-center text-[#062028] shadow-[0_0_12px_oklch(0.78_0.13_190/0.7)]">
                    <Check className="h-3 w-3" strokeWidth={4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience */}
      <div className="rounded-3xl bg-white/[0.025] border border-white/[0.08] p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/45 mb-3 ml-1">Erfarenhet</p>
        <div
          className="relative grid grid-cols-3 p-1.5 rounded-2xl bg-black/30 border border-white/[0.05]"
        >
          {/* Sliding indicator */}
          <span
            aria-hidden
            className="absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-[oklch(0.78_0.13_190)] shadow-[0_4px_18px_-2px_oklch(0.78_0.13_190/0.5)] transition-transform duration-300 ease-out"
            style={{
              width: `calc((100% - 0.75rem) / 3)`,
              transform: `translateX(${EXPERIENCES.findIndex((e) => e.id === experience) * 100}%)`,
            }}
          />
          {EXPERIENCES.map((e) => {
            const on = experience === e.id;
            return (
              <button
                key={e.id}
                onClick={() => setExperience(e.id)}
                className={cn(
                  "relative z-10 h-10 rounded-xl text-[13px] font-bold transition-colors duration-200",
                  on ? "text-[#062028]" : "text-white/55 hover:text-white/90"
                )}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
        <p className="text-[11px] uppercase tracking-wider text-white/45 mb-2">Träningscenter</p>
        <GymPicker gyms={gyms} gymId={gymId} setGymId={setGymId} selectedGym={selectedGym} />
        {selectedGym && (
          <p className="text-[10px] text-[oklch(0.85_0.13_190)] mb-3 leading-relaxed">
            Övningar väljs utifrån utrustningen på <span className="font-bold">{selectedGym.name}</span>: {selectedGym.equipment.slice(0, 6).join(", ")}{selectedGym.equipment.length > 6 ? "…" : ""}.
          </p>
        )}
        <p className="text-[11px] uppercase tracking-wider text-white/45 mb-2">Utrustning</p>
        <div className="grid grid-cols-3 gap-1.5">
          {EQUIPMENTS.map((e) => {
            const Icon = e.icon;
            const on = equipment === e.id;
            return (
              <button
                key={e.id}
                onClick={() => setEquipment(e.id)}
                disabled={!!selectedGym}
                className={cn(
                  "h-16 rounded-xl flex flex-col items-center justify-center gap-1 border transition",
                  on
                    ? "bg-[oklch(0.78_0.13_190/0.15)] border-[oklch(0.78_0.13_190)] text-[oklch(0.95_0.13_190)] shadow-[0_0_18px_-6px_oklch(0.78_0.13_190/0.7)]"
                    : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]",
                  selectedGym && "opacity-40"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-bold">{e.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
          {selectedGym ? "Gymvalet bestämmer vilka övningar som väljs." : "Vi väljer övningar i ditt schema utifrån vad du har tillgång till."}
        </p>
      </div>

      {/* Volume: exercises & sets */}
      <div className="rounded-3xl bg-white/[0.025] border border-white/[0.08] p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[oklch(0.78_0.13_190/0.4)] bg-[oklch(0.78_0.13_190/0.1)]">
            <Wand2 className="h-3.5 w-3.5 text-[oklch(0.85_0.13_190)]" />
          </span>
          <p className="text-[13px] font-bold tracking-tight text-white">Övningar & set</p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/30 border border-white/[0.05] mb-3">
          {([
            { id: "auto" as const, label: "FitFlow väljer" },
            { id: "manual" as const, label: "Jag väljer" },
          ]).map((m) => {
            const on = volumeMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setVolumeMode(m.id)}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold transition",
                  on
                    ? "bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_0_14px_-4px_oklch(0.78_0.13_190/0.8)]"
                    : "text-white/60 hover:text-white/90"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {volumeMode === "auto" ? (
          <div className="space-y-3">
            <p className="text-[11px] text-white/55 leading-relaxed">
              Baserat på ditt mål: <span className="text-[oklch(0.9_0.13_190)] font-semibold">{autoEx} övningar</span> × <span className="text-[oklch(0.9_0.13_190)] font-semibold">{autoSets} set</span> per pass.
            </p>
            <button
              type="button"
              onClick={() => {
                const ex = 3 + Math.floor(Math.random() * 8); // 3–10
                const st = 2 + Math.floor(Math.random() * 5); // 2–6
                setCustomExercises(ex);
                setCustomSets(st);
                setVolumeMode("manual");
              }}
              className="w-full h-10 rounded-xl border border-[oklch(0.78_0.13_190/0.4)] bg-[oklch(0.78_0.13_190/0.12)] text-[oklch(0.9_0.13_190)] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[oklch(0.78_0.13_190/0.2)] transition"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Slumpa övningar & set
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Stepper label="Övningar / pass" value={customExercises} onChange={setCustomExercises} min={3} max={10} />
            <Stepper label="Set / övning" value={customSets} onChange={setCustomSets} min={2} max={6} />
            <button
              type="button"
              onClick={() => {
                const ex = 3 + Math.floor(Math.random() * 8); // 3–10
                const st = 2 + Math.floor(Math.random() * 5); // 2–6
                setCustomExercises(ex);
                setCustomSets(st);
              }}
              className="w-full h-10 rounded-xl border border-[oklch(0.78_0.13_190/0.4)] bg-[oklch(0.78_0.13_190/0.12)] text-[oklch(0.9_0.13_190)] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[oklch(0.78_0.13_190/0.2)] transition"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Slumpa (FitFlow väljer)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-2.5">
      <span className="text-[12px] font-semibold text-white/75">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(clamp(value - 1))}
          className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/10 text-white/80 text-sm font-bold hover:bg-white/[0.08]"
        >−</button>
        <span className="w-7 text-center text-base font-extrabold tabular-nums text-[oklch(0.9_0.13_190)]">{value}</span>
        <button
          onClick={() => onChange(clamp(value + 1))}
          className="h-8 w-8 rounded-lg bg-[oklch(0.78_0.13_190/0.15)] border border-[oklch(0.78_0.13_190/0.4)] text-[oklch(0.9_0.13_190)] text-sm font-bold hover:bg-[oklch(0.78_0.13_190/0.25)]"
        >+</button>
      </div>
    </div>
  );
}

function BodyGrid({
  title, value, onChange, badge,
}: { title: string; value: BodyType | null; onChange: (v: BodyType) => void; badge: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white/85 mb-3">{title}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {BODY_TYPES.map((b) => {
          const on = value === b.id;
          return (
            <div key={b.id} className="flex flex-col items-center">
              <button
                onClick={() => onChange(b.id)}
                className={cn(
                  "group relative w-full rounded-2xl border overflow-hidden transition-all aspect-[3/4]",
                  on
                    ? "border-[oklch(0.78_0.13_190)] shadow-[0_0_22px_-4px_oklch(0.78_0.13_190/0.8),inset_0_0_18px_oklch(0.78_0.13_190/0.18)]"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <img
                  src={b.image}
                  alt={b.label}
                  loading="lazy"
                  width={512}
                  height={768}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition",
                    on ? "scale-[1.02]" : "opacity-90 group-hover:opacity-100"
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
                {on && (
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#0A0D14]/90 border border-[oklch(0.78_0.13_190)] text-[9px] font-bold text-[oklch(0.9_0.13_190)] whitespace-nowrap shadow-[0_0_10px_oklch(0.78_0.13_190/0.6)]">
                    <Check className="h-2.5 w-2.5" strokeWidth={4} /> {badge}
                  </div>
                )}
                <span
                  className={cn(
                    "absolute bottom-1.5 inset-x-1 text-center text-[10px] font-bold uppercase tracking-wide",
                    on ? "text-[oklch(0.95_0.13_190)]" : "text-white/90"
                  )}
                >
                  {b.label}
                </span>
              </button>
              <p className="text-[10px] text-white/55 mt-1 tabular-nums">{b.weightRange}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Stylized SVG silhouettes per body type */
function BodySilhouette({ type, active }: { type: BodyType; active: boolean }) {
  const fill = active ? "oklch(0.85 0.13 190)" : "rgba(255,255,255,0.55)";
  const glow = active ? "drop-shadow(0 0 6px oklch(0.78 0.13 190 / 0.7))" : "none";

  // shoulder, chest, waist, hip, thigh widths
  const profiles: Record<BodyType, { sh: number; ch: number; wa: number; hi: number; th: number }> = {
    lean:     { sh: 18, ch: 16, wa: 12, hi: 15, th: 7 },
    average:  { sh: 20, ch: 19, wa: 16, hi: 18, th: 9 },
    athletic: { sh: 24, ch: 22, wa: 15, hi: 18, th: 9 },
    muscular: { sh: 28, ch: 26, wa: 17, hi: 20, th: 11 },
    heavy:    { sh: 22, ch: 24, wa: 23, hi: 24, th: 12 },
  };
  const p = profiles[type];
  const cx = 30;

  // Build symmetrical torso path
  const torso = [
    `M ${cx - p.sh} 22`,
    `C ${cx - p.sh} 26 ${cx - p.ch} 30 ${cx - p.ch} 36`,
    `C ${cx - p.ch} 42 ${cx - p.wa} 46 ${cx - p.wa} 52`,
    `C ${cx - p.wa} 58 ${cx - p.hi} 60 ${cx - p.hi} 64`,
    `L ${cx + p.hi} 64`,
    `C ${cx + p.hi} 60 ${cx + p.wa} 58 ${cx + p.wa} 52`,
    `C ${cx + p.wa} 46 ${cx + p.ch} 42 ${cx + p.ch} 36`,
    `C ${cx + p.ch} 30 ${cx + p.sh} 26 ${cx + p.sh} 22`,
    "Z",
  ].join(" ");

  return (
    <svg viewBox="0 0 60 100" className="w-full h-14" style={{ filter: glow }}>
      {/* head */}
      <circle cx={cx} cy={12} r={7} fill={fill} />
      {/* neck */}
      <rect x={cx - 3} y={18} width={6} height={5} fill={fill} />
      {/* torso */}
      <path d={torso} fill={fill} />
      {/* arms */}
      <path d={`M ${cx - p.sh} 24 Q ${cx - p.sh - 5} 40 ${cx - p.wa - 2} 56`} stroke={fill} strokeWidth={4} strokeLinecap="round" fill="none" />
      <path d={`M ${cx + p.sh} 24 Q ${cx + p.sh + 5} 40 ${cx + p.wa + 2} 56`} stroke={fill} strokeWidth={4} strokeLinecap="round" fill="none" />
      {/* legs */}
      <rect x={cx - p.hi + 1} y={64} width={p.th} height={32} rx={3} fill={fill} />
      <rect x={cx + p.hi - p.th - 1} y={64} width={p.th} height={32} rx={3} fill={fill} />
    </svg>
  );
}

/* ====================== STEP 3 — PREVIEW ====================== */
function StepPreview({
  plan, daysPerWeek, goals, equipment,
  nameMode, setNameMode, customName, setCustomName, autoName,
}: {
  plan: PlanDay[]; daysPerWeek: number; goals: Goal[]; equipment: Equipment;
  nameMode: "auto" | "manual"; setNameMode: (m: "auto" | "manual") => void;
  customName: string; setCustomName: (s: string) => void; autoName: string;
}) {
  const goalMetas = goals.map((id) => GOALS.find((g) => g.id === id)!).filter(Boolean);
  const goalLabel =
    goalMetas.length === 0 ? "Personligt"
    : goalMetas.length === 1 ? goalMetas[0].label
    : `${goalMetas.length} mål kombinerade`;
  const goalDesc =
    goalMetas.length <= 1
      ? (goalMetas[0]?.desc ?? "Anpassat")
      : goalMetas.map((m) => m.label).join(" + ");
  const settings = combineGoalSettings(goals);
  const equipmentLabel = EQUIPMENTS.find((e) => e.id === equipment)?.label ?? "";
  return (
    <div className="space-y-4">
      {/* Name your schema */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[oklch(0.78_0.13_190/0.4)] bg-[oklch(0.78_0.13_190/0.1)]">
            <Sparkles className="h-3.5 w-3.5 text-[oklch(0.85_0.13_190)]" />
          </span>
          <p className="text-[14px] font-bold tracking-tight text-white">Namn på schemat</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-3">
          {([
            { id: "auto" as const, label: "FitFlow döper" },
            { id: "manual" as const, label: "Jag döper själv" },
          ]).map((m) => {
            const on = nameMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setNameMode(m.id)}
                className={cn(
                  "h-9 rounded-lg text-xs font-bold transition",
                  on
                    ? "bg-[oklch(0.78_0.13_190)] text-[#062028] shadow-[0_0_14px_-4px_oklch(0.78_0.13_190/0.8)]"
                    : "text-white/60 hover:text-white/90"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        {nameMode === "auto" ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 h-12 flex items-center">
            <span className="text-[11px] uppercase tracking-wider text-white/45 mr-2">Förslag</span>
            <span className="text-[14px] font-bold text-[oklch(0.9_0.13_190)] truncate">{autoName}</span>
          </div>
        ) : (
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value.slice(0, 60))}
            placeholder="Ge ditt schema ett namn…"
            className="w-full h-12 rounded-2xl bg-white/[0.03] border border-white/10 px-4 text-[14px] font-bold text-white placeholder:text-white/30 outline-none focus:border-[oklch(0.78_0.13_190/0.7)] focus:bg-white/[0.05] transition"
          />
        )}
      </div>

      {/* Hero summary */}
      <div className="relative rounded-3xl p-5 overflow-hidden border border-white/10 bg-gradient-to-br from-[oklch(0.78_0.13_190/0.12)] via-white/[0.03] to-white/[0.02]">
        <div aria-hidden className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,oklch(0.78_0.13_190/0.4),transparent_70%)] blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-[oklch(0.78_0.13_190)] grid place-items-center text-[#062028] shadow-[0_10px_24px_-6px_oklch(0.78_0.13_190/0.7)]">
            <Sparkles className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wider text-[oklch(0.85_0.13_190)]">FitFlow-balanserat schema</p>
            <p className="font-bold text-base leading-tight">
              {daysPerWeek} pass · {goalLabel}
            </p>
          </div>
        </div>
        <p className="relative text-xs text-white/60 mt-3 leading-relaxed">
          {settings.exercisesPerSession} övningar × {settings.setsPerExercise} set, {settings.repRange} reps · {equipmentLabel}.
        </p>
        <div className="relative flex flex-wrap gap-1.5 mt-3">
          {[goalDesc, equipmentLabel, "Progressiv belastning"].filter(Boolean).map((t) => (
            <span key={t} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[oklch(0.78_0.13_190/0.15)] text-[oklch(0.9_0.13_190)] border border-[oklch(0.78_0.13_190/0.3)]">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-white/45">Din vecka</p>
          <p className="text-[11px] text-white/40">{plan.filter((d) => !d.rest).length} pass</p>
        </div>
        <ul>
          {plan.map((d, i) => (
            <li
              key={d.day}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5",
                i < plan.length - 1 && "border-b border-white/5",
                d.rest ? "opacity-60" : ""
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-xl grid place-items-center shrink-0",
                d.rest
                  ? "bg-white/[0.04] border border-white/10 text-white/40"
                  : "bg-[oklch(0.78_0.13_190/0.15)] border border-[oklch(0.78_0.13_190/0.35)] text-[oklch(0.9_0.13_190)]"
              )}>
                {d.rest ? <span className="text-xs">Z</span> : <Dumbbell className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-white/45">{d.day}</p>
                <p className="font-semibold text-[15px] truncate">
                  {d.rest ? "Vila" : d.focus}
                </p>
              </div>
              {!d.rest && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/[0.05] text-white/60 border border-white/10">
                  ~{d.minutes} min
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ====================== PLAN BUILDER ====================== */
type PlanDay = { day: string; focus: string; minutes: number; rest: boolean };

const DAYS_SV = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];

function buildPlan(days: number, current: BodyType | null, target: BodyType | null, goal: Goal | null, manualDays: number[] | null = null): PlanDay[] {
  // Pairs always 2 muscle groups per session — biased by target
  const baseSplits = [
    "Bröst & Mage",
    "Rygg & Biceps",
    "Axlar & Triceps",
    "Ben & Rumpa",
    "Bröst & Triceps",
    "Rygg & Mage",
    "Ben & Vader",
  ];

  // Re-order based on body-type target
  let order = [...baseSplits];
  if (target === "muscular") {
    order = ["Bröst & Mage", "Rygg & Biceps", "Axlar & Triceps", "Ben & Rumpa", "Bröst & Triceps", "Rygg & Mage", "Axlar & Mage"];
  } else if (target === "lean") {
    order = ["Bröst & Mage", "Rygg & Mage", "Axlar & Triceps", "Ben & Rumpa", "Ben & Mage", "Bröst & Rygg", "Axlar & Triceps"];
  } else if (target === "athletic") {
    order = ["Bröst & Mage", "Rygg & Biceps", "Axlar & Triceps", "Ben & Rumpa", "Bröst & Rygg", "Ben & Mage", "Axlar & Biceps"];
  }

  // Goal-specific overrides
  if (goal === "kondition") {
    order = ["Kondition & Ben", "Kondition & Mage", "Kondition & Rygg", "Ben & Mage", "Kondition & Axlar", "Rygg & Mage", "Ben & Rumpa"];
  } else if (goal === "vikt") {
    order = ["Bröst & Rygg", "Ben & Mage", "Axlar & Triceps", "Kondition & Mage", "Rygg & Biceps", "Ben & Rumpa", "Kondition & Ben"];
  } else if (goal === "starkare") {
    order = ["Bröst & Triceps", "Rygg & Biceps", "Ben & Rumpa", "Axlar & Triceps", "Bröst & Rygg", "Ben & Vader", "Rygg & Biceps"];
  } else if (goal === "atletisk") {
    order = ["Ben & Rumpa", "Bröst & Rygg", "Axlar & Mage", "Ben & Mage", "Rygg & Biceps", "Bröst & Triceps", "Ben & Vader"];
  }

  // Use manual day selection if provided, otherwise distribute evenly
  const trainingIdx = manualDays && manualDays.length > 0 ? [...manualDays].sort((a, b) => a - b) : pickEvenly(days);
  const focusByIdx: Record<number, string> = {};
  let cursor = 0;
  trainingIdx.forEach((dayIdx) => {
    // Pin Tuesday (idx 1) to Axlar & Triceps for tactile preview match
    if (dayIdx === 1) {
      focusByIdx[dayIdx] = "Axlar & Triceps";
    } else if (dayIdx === 0) {
      focusByIdx[dayIdx] = "Bröst & Mage";
    } else if (dayIdx === 3) {
      focusByIdx[dayIdx] = "Ben & Rumpa";
    } else {
      // Pick next non-used split
      while (Object.values(focusByIdx).includes(order[cursor])) cursor++;
      focusByIdx[dayIdx] = order[cursor % order.length];
      cursor++;
    }
  });

  const sessionMinutes = goal ? GOAL_SETTINGS[goal].minutes :
    target === "muscular" ? 55 : target === "lean" ? 40 : 50;

  return DAYS_SV.map((day, i) => {
    const focus = focusByIdx[i];
    return focus
      ? { day, focus, minutes: sessionMinutes, rest: false }
      : { day, focus: "Vila", minutes: 0, rest: true };
  });
}

function pickEvenly(n: number): number[] {
  // distribute n training days across 7
  const out: number[] = [];
  const step = 7 / n;
  for (let i = 0; i < n; i++) out.push(Math.round(i * step) % 7);
  return Array.from(new Set(out)).slice(0, n).sort((a, b) => a - b);
}

type GymLite = { id: string; name: string; city: string | null; chain: string | null; equipment: string[] };

function GymPicker({
  gyms, gymId, setGymId, selectedGym,
}: {
  gyms: GymLite[];
  gymId: string;
  setGymId: (v: string) => void;
  selectedGym: GymLite | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? gyms.filter((g) =>
          [g.name, g.city ?? "", g.chain ?? ""].some((s) => s.toLowerCase().includes(needle))
        )
      : gyms;
    return list.slice(0, 80);
  }, [gyms, q]);

  // Group by chain for nicer browsing
  const groups = useMemo(() => {
    const m = new Map<string, GymLite[]>();
    for (const g of filtered) {
      const k = g.chain ?? "Övrigt";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(g);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], "sv"));
  }, [filtered]);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 pl-9 pr-3 rounded-xl bg-black/40 border border-white/10 text-[13px] text-white font-medium text-left relative focus:outline-none focus:border-[oklch(0.78_0.13_190)] hover:border-white/20 transition-colors"
      >
        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        {selectedGym ? (
          <span className="flex items-center justify-between gap-2">
            <span className="truncate">
              {selectedGym.name}
              {selectedGym.city && selectedGym.city !== selectedGym.name.split(" ").pop() ? ` · ${selectedGym.city}` : ""}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setGymId(""); }}
              className="text-white/40 hover:text-white/80 -mr-1"
              aria-label="Rensa val"
            >
              <X className="h-4 w-4" />
            </span>
          </span>
        ) : (
          <span className="text-white/50">Sök & välj gym (frivilligt)</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0b1a20] border border-white/10 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
              <Search className="h-4 w-4 text-white/50" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Sök gym, kedja eller stad…"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => { setGymId(""); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-[12px] text-white/60 hover:bg-white/5 border-b border-white/5"
              >
                Inget gym — välj utrustning manuellt
              </button>
              {groups.length === 0 && (
                <p className="px-3 py-6 text-center text-[12px] text-white/40">Inga träffar.</p>
              )}
              {groups.map(([chain, items]) => (
                <div key={chain}>
                  <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-white/40">{chain}</p>
                  {items.map((g) => {
                    const on = g.id === gymId;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => { setGymId(g.id); setOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 flex items-center gap-2 transition-colors",
                          on ? "bg-[oklch(0.78_0.13_190/0.15)] text-white" : "text-white/85 hover:bg-white/5"
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5 text-white/40 shrink-0" />
                        <span className="flex-1 truncate text-[13px]">{g.name}</span>
                        {g.city && <span className="text-[11px] text-white/40">{g.city}</span>}
                        {on && <Check className="h-4 w-4 text-[oklch(0.85_0.13_190)]" />}
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 80 && (
                <p className="px-3 py-3 text-center text-[11px] text-white/40">Visar 80 träffar — förfina sökningen.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}