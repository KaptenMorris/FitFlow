import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoImg from "@/assets/fitflow-logo.png";
import brostImg from "@/assets/muscles/brost.png";
import ryggImg from "@/assets/muscles/rygg.png";
import axlarImg from "@/assets/muscles/axlar.png";
import armarImg from "@/assets/muscles/armar.png";
import mageImg from "@/assets/muscles/mage.png";
import benImg from "@/assets/muscles/ben.png";
import rumpaImg from "@/assets/muscles/rumpa.png";
import tricepsImg from "@/assets/muscles/triceps.png";
import nackeImg from "@/assets/muscles/nacke.png";
import levelRookieImg from "@/assets/levels/nyborjare-1.png";
import levelBeginnerImg from "@/assets/levels/nyborjare-2.png";
import levelIntermediateImg from "@/assets/levels/mellan.png";
import levelAdvancedImg from "@/assets/levels/avancerad.png";
import goalMuscleImg from "@/assets/goals/bygg-muskler.png";
import goalShapeImg from "@/assets/goals/hall-form.png";
import goalLoseImg from "@/assets/goals/ga-ner-vikt.png";
import goalStrengthImg from "@/assets/goals/bygg-styrka.png";
import goalCardioImg from "@/assets/goals/kondition.png";
import methodAiImg from "@/assets/methods/ai.png";
import methodManualImg from "@/assets/methods/manual.png";
import moodPeakImg from "@/assets/moods/toppform.png";
import moodGoodImg from "@/assets/moods/bra.png";
import moodOkImg from "@/assets/moods/okej.png";
import moodTiredImg from "@/assets/moods/trott.png";
import moodRecoveryImg from "@/assets/moods/aterhamtning.png";
import equipNoneImg from "@/assets/equipment/none.png";
import equipDumbbellsImg from "@/assets/equipment/dumbbells.png";
import equipGarageImg from "@/assets/equipment/garage.png";
import equipFullgymImg from "@/assets/equipment/fullgym.png";
import {
  ArrowLeft, ArrowRight, Check, Sparkles, Pencil, Target, Dumbbell,
  HeartPulse, Activity, Flame, Scale, Camera, Image as ImageIcon,
  Calendar, Clock, Repeat, Layers, Wand2, Shuffle, Home, Warehouse, Building2,
  User as UserIcon, Heart, Smile, Meh, Bed, BatteryLow, Signal,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/nytt-schema")({
  component: NyttSchemaPage,
});

type Method = "ai" | "manual";
type Goal = "muscle" | "shape" | "lose" | "strength" | "cardio";
type Level = "rookie" | "beginner" | "intermediate" | "advanced";
type Equip = "none" | "dumbbells" | "garage" | "fullgym";
type Mood = "peak" | "good" | "ok" | "tired" | "recovery";

const TOTAL = 13;

function NyttSchemaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<Method | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [level, setLevel] = useState<Level | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [stress, setStress] = useState<string[]>([]);
  const [sleep, setSleep] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<Equip | null>(null);
  const [daysMode, setDaysMode] = useState<"app" | "me">("app");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [pickedDays, setPickedDays] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [exercisesPerSession, setExercisesPerSession] = useState<number | null>(null);
  const [setsPerExercise, setSetsPerExercise] = useState<number | null>(null);
  const [extra, setExtra] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingProgress, setCreatingProgress] = useState(0);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const progress = useMemo(() => Math.round(((step + 1) / TOTAL) * 100), [step]);

  // Prefyll ålder/längd/vikt från profilen om de finns.
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
      if ((p as any).birth_date) {
        const d = new Date((p as any).birth_date);
        if (!isNaN(d.getTime())) {
          const now = new Date();
          let a = now.getFullYear() - d.getFullYear();
          const m = now.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
          setAge((prev) => prev || String(a));
        }
      }
      if ((p as any).height_cm) setHeight((prev) => prev || String((p as any).height_cm));
      if ((p as any).current_weight_kg) setWeight((prev) => prev || String((p as any).current_weight_kg));
    })();
  }, []);

  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => (step === 0 ? navigate({ to: "/hem" }) : setStep((s) => s - 1));

  const toggle = <T,>(arr: T[], v: T, setter: (v: T[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = async () => {
    setSaving(true);
    setCreating(true);
    setCreatingProgress(0);
    setCreatedId(null);
    // animate progress to ~95% while we insert
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, Math.round((elapsed / 3500) * 95));
      setCreatingProgress(pct);
    }, 80);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { clearInterval(interval); setSaving(false); setCreating(false); return; }
    const tags = [
      ...goals.map(goalLabel),
      ...bodyParts,
    ].filter(Boolean);
    const desc = JSON.stringify({
      method, goals, bodyParts, level, age, height, weight, photo: !!photo,
      moods, stress, sleep, equipment, daysMode, daysPerWeek, pickedDays,
      duration, period, exercisesPerSession, setsPerExercise, extra,
    });
    const name = `${period ?? "Vecka 1"} — ${goals.map(goalLabel).join(", ") || "Anpassat schema"}`;
    const sessions = daysMode === "me" ? pickedDays.length || 3 : daysPerWeek;
    const difficulty =
      level === "rookie" ? "Lätt" : level === "advanced" ? "Hård" : "Medel";
    const { data: inserted, error } = await supabase.from("training_schemas").insert({
      user_id: u.user.id, name, description: desc, tags,
      sessions_per_week: sessions, difficulty, progress_percent: 0, is_active: true,
    }).select("id").single();
    clearInterval(interval);
    setSaving(false);
    if (error) {
      setCreating(false);
      return toast.error(error.message);
    }
    // brief finish animation
    const finishStart = Date.now();
    await new Promise<void>((resolve) => {
      const fin = setInterval(() => {
        const e = Date.now() - finishStart;
        const pct = Math.min(100, 95 + Math.round((e / 400) * 5));
        setCreatingProgress(pct);
        if (pct >= 100) { clearInterval(fin); resolve(); }
      }, 40);
    });
    setCreatedId(inserted?.id ?? null);
  };

  return (
    <div className="max-w-md mx-auto">
      <TopBar onBack={back} progress={progress} />
      <div className="px-4 pt-3 pb-8">
        {step === 0 && <StepMethod method={method} setMethod={(m) => { setMethod(m); next(); }} />}
        {step === 1 && <StepGoals goals={goals} toggle={(g) => toggle(goals, g, setGoals)} onNext={next} />}
        {step === 2 && <StepBodyParts selected={bodyParts} setSelected={setBodyParts} onNext={next} />}
        {step === 3 && <StepLevel level={level} setLevel={setLevel} onNext={next} />}
        {step === 4 && <StepStats age={age} setAge={setAge} height={height} setHeight={setHeight} weight={weight} setWeight={setWeight} onNext={next} />}
        {step === 5 && <StepPhoto photo={photo} setPhoto={setPhoto} onNext={next} />}
        {step === 6 && <StepMood moods={moods} toggleMood={(m) => toggle(moods, m, setMoods)} stress={stress} toggleStress={(v) => toggle(stress, v, setStress)} sleep={sleep} toggleSleep={(v) => toggle(sleep, v, setSleep)} onNext={next} />}
        {step === 7 && <StepEquipment equipment={equipment} setEquipment={(e) => { setEquipment(e); next(); }} />}
        {step === 8 && <StepDays daysMode={daysMode} setDaysMode={setDaysMode} daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek} pickedDays={pickedDays} togglePicked={(d) => toggle(pickedDays, d, setPickedDays)} onNext={next} />}
        {step === 9 && <StepDuration duration={duration} setDuration={(d) => { setDuration(d); next(); }} />}
        {step === 10 && <StepPeriod period={period} setPeriod={(p) => { setPeriod(p); next(); }} />}
        {step === 11 && <StepCounts title="Hur många övningar per pass?" icon="🔁" value={exercisesPerSession} options={[3,4,5,6,7,8,10]} suffix="övningar" onSelect={(n) => { setExercisesPerSession(n); next(); }} />}
        {step === 12 && (
          <StepFinal
            sets={setsPerExercise} setSets={setSetsPerExercise}
            extra={extra} setExtra={setExtra}
            saving={saving} onSave={save}
          />
        )}
      </div>
      {creating && (
        <CreatingOverlay
          progress={creatingProgress}
          done={createdId !== null}
          summary={{
            age, gender: null, height, weight,
            equipment, level, daysPerWeek: daysMode === "me" ? pickedDays.length : daysPerWeek,
            period, focus: bodyParts.length ? bodyParts.join(", ") : "Helkropp",
          }}
          onShow={() => createdId && navigate({ to: "/schema/$id", params: { id: createdId } })}
        />
      )}
    </div>
  );
}

function TopBar({ onBack, progress }: { onBack: () => void; progress: number }) {
  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="relative h-12 flex items-center justify-center">
        <button onClick={onBack} className="absolute left-3 h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold text-sm">Nytt Schema</p>
      </div>
      <div className="h-0.5 bg-secondary"><div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" /> <span className="font-medium text-foreground">FitFlow</span>
      </div>
    </header>
  );
}

function StepHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="text-center mb-5">
      <div className="mx-auto mb-2 text-3xl">{icon}</div>
      <h2 className="font-bold text-lg">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled} className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-primary to-[oklch(0.62_0.22_265)] shadow-lg shadow-primary/20">
      {children} <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

function OptionRow({ icon, title, desc, selected, onClick, trailing }: { icon?: React.ReactNode; title: string; desc?: string; selected?: boolean; onClick: () => void; trailing?: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition-all", selected ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card hover:bg-secondary/40")}>
      {icon && <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm", selected && "text-primary")}>{title}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {trailing ?? (selected && <Check className="h-4 w-4 text-primary" />)}
    </button>
  );
}

/* STEP 1: METHOD */
function StepMethod({ method, setMethod }: { method: Method | null; setMethod: (m: Method) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Skapa ditt schema</h1>
      <p className="text-sm text-muted-foreground mb-4">Hur vill du skapa ditt träningsschema?</p>
      <div className="space-y-3">
        <Card>
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl bg-[oklch(0.18_0.04_240)] flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-[oklch(0.78_0.15_190/0.4)]">
              <img src={methodAiImg} alt="AI" width={56} height={56} loading="lazy" className="h-full w-full object-cover [filter:drop-shadow(0_0_8px_oklch(0.78_0.15_190/0.6))]" />
            </div>
            <div className="flex-1"><p className="font-semibold">FitFlow skapar åt dig</p><p className="text-xs text-muted-foreground">Svara på frågor så bygger vi ditt optimala schema</p><p className="text-xs text-primary mt-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />Rekommenderas</p></div>
          </div>
          <Button onClick={() => setMethod("ai")} className="w-full mt-3 h-11 rounded-xl bg-primary">Välj detta →</Button>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-xl bg-[oklch(0.18_0.04_240)] flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-[oklch(0.78_0.15_190/0.4)]">
              <img src={methodManualImg} alt="Manuell" width={56} height={56} loading="lazy" className="h-full w-full object-cover [filter:drop-shadow(0_0_8px_oklch(0.78_0.15_190/0.6))]" />
            </div>
            <div className="flex-1"><p className="font-semibold">Skapa själv manuellt</p><p className="text-xs text-muted-foreground">Bygg ditt eget schema helt på dina villkor</p></div>
          </div>
          <Button onClick={() => setMethod("manual")} variant="secondary" className="w-full mt-3 h-11 rounded-xl">Välj detta →</Button>
        </Card>
      </div>
    </div>
  );
}

/* STEP 2: GOALS (multi) */
const GOALS: { id: Goal; label: string; desc: string; img: string }[] = [
  { id: "muscle", label: "Bygg muskler", desc: "Lägre vikt med fler repetitioner och arbeta på medelstora och små muskler", img: goalMuscleImg },
  { id: "shape", label: "Håll dig i form", desc: "Börja med grundläggande muskelträningsplaner och håll dina muskler", img: goalShapeImg },
  { id: "lose", label: "Gå ner i vikt", desc: "Lägre vikt med fler repetitioner och kortare vilotider med konditionsövningar", img: goalLoseImg },
  { id: "strength", label: "Bygg styrka", desc: "Tung progressiv belastning med compound övningar och lång vila", img: goalStrengthImg },
  { id: "cardio", label: "Kondition", desc: "Förbättra uthållighet och kardiovaskulär hälsa", img: goalCardioImg },
];
function goalLabel(g: Goal) { return GOALS.find((x) => x.id === g)?.label ?? g; }
function StepGoals({ goals, toggle, onNext }: { goals: Goal[]; toggle: (g: Goal) => void; onNext: () => void }) {
  return (
    <div>
      <StepHeader icon={<Target className="h-7 w-7 text-primary mx-auto" />} title="Vad är ditt huvudsakliga mål?" sub="Du kan välja flera alternativ" />
      <div className="space-y-3 mb-4">
        {GOALS.map((g) => {
          const selected = goals.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={cn(
                "w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition-all",
                selected
                  ? "border-[oklch(0.78_0.15_190)] bg-[oklch(0.78_0.15_190/0.08)] ring-1 ring-[oklch(0.78_0.15_190/0.5)] shadow-[0_0_20px_-6px_oklch(0.78_0.15_190/0.6)]"
                  : "border-border bg-card hover:bg-secondary/40"
              )}
            >
              <div className={cn(
                "h-14 w-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden bg-[oklch(0.18_0.04_240)]",
                selected && "ring-1 ring-[oklch(0.78_0.15_190/0.5)]"
              )}>
                <img
                  src={g.img}
                  alt={g.label}
                  width={56}
                  height={56}
                  loading="lazy"
                  className="h-full w-full object-cover [filter:drop-shadow(0_0_8px_oklch(0.78_0.15_190/0.6))]"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm", selected && "text-[oklch(0.85_0.13_190)]")}>{g.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{g.desc}</p>
              </div>
              {selected && <Check className="h-4 w-4 text-[oklch(0.85_0.13_190)] shrink-0" />}
            </button>
          );
        })}
      </div>
      <PrimaryBtn onClick={onNext} disabled={goals.length === 0}>Bekräfta mål ({goals.length})</PrimaryBtn>
    </div>
  );
}

/* STEP 3: BODY PARTS (multi) */
const PARTS: { id: string; label: string; img: string }[] = [
  { id: "Bröst", label: "Bröst", img: brostImg },
  { id: "Rygg", label: "Rygg", img: ryggImg },
  { id: "Axlar", label: "Axlar", img: axlarImg },
  { id: "Armar", label: "Armar", img: armarImg },
  { id: "Mage", label: "Mage", img: mageImg },
  { id: "Ben", label: "Ben", img: benImg },
  { id: "Rumpa", label: "Rumpa", img: rumpaImg },
  { id: "Triceps", label: "Triceps", img: tricepsImg },
  { id: "Nacke", label: "Nacke", img: nackeImg },
];
function StepBodyParts({ selected, setSelected, onNext }: { selected: string[]; setSelected: (v: string[]) => void; onNext: () => void }) {
  const allOn = selected.length === PARTS.length;
  return (
    <div>
      <StepHeader icon={<Target className="h-7 w-7 text-primary mx-auto" />} title="Vilka delar vill du fokusera på?" sub="Välj en eller flera" />
      <div className="grid grid-cols-3 gap-3 mb-4">
        {PARTS.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => setSelected(on ? selected.filter((x) => x !== p.id) : [...selected, p.id])}
              className={cn(
                "group relative aspect-square rounded-2xl border-2 p-2 pb-2 flex flex-col items-center justify-between overflow-hidden transition-all",
                "bg-[oklch(0.18_0.05_220)]",
                on
                  ? "border-[oklch(0.78_0.15_190)] shadow-[0_0_18px_-2px_oklch(0.78_0.15_190/0.6)]"
                  : "border-[oklch(0.78_0.15_190/0.35)]"
              )}
            >
              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <img
                  src={p.img}
                  alt={p.label}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_0_10px_oklch(0.78_0.15_190/0.5)]"
                />
              </div>
              <span className="text-xs font-semibold text-[oklch(0.85_0.12_190)] tracking-wide">{p.label}</span>
              <span
                className={cn(
                  "absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center border",
                  on
                    ? "bg-[oklch(0.78_0.15_190)] border-[oklch(0.78_0.15_190)] text-background"
                    : "bg-[oklch(0.78_0.15_190/0.2)] border-[oklch(0.78_0.15_190/0.5)] text-transparent"
                )}
              >
                <Check className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
        <input type="checkbox" checked={allOn} onChange={() => setSelected(allOn ? [] : PARTS.map((p) => p.id))} className="h-4 w-4 accent-[oklch(0.78_0.15_190)]" />
        Välj alla muskelgrupper
      </label>
      <Button
        onClick={onNext}
        disabled={selected.length === 0}
        className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-[oklch(0.78_0.15_190)] via-[oklch(0.7_0.18_230)] to-[oklch(0.65_0.22_270)] shadow-[0_0_24px_-4px_oklch(0.78_0.15_190/0.6)] text-background"
      >
        Bekräfta ({selected.length} valda) <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* STEP 4: LEVEL (single) */
const LEVELS: { id: Level; label: string; desc: string; bars: number; img: string }[] = [
  { id: "rookie", label: "Helt nybörjare", desc: "Jag har aldrig tränat förut", bars: 1, img: levelRookieImg },
  { id: "beginner", label: "Nybörjare", desc: "Jag har tränat tidigare men inte seriöst", bars: 2, img: levelBeginnerImg },
  { id: "intermediate", label: "Mellanliggande", desc: "Jag har tränat tidigare", bars: 3, img: levelIntermediateImg },
  { id: "advanced", label: "Avancerad", desc: "Jag har tränat i flera år", bars: 4, img: levelAdvancedImg },
];
function StepLevel({ level, setLevel, onNext }: { level: Level | null; setLevel: (l: Level) => void; onNext: () => void }) {
  return (
    <div>
      <StepHeader icon={<Signal className="h-7 w-7 text-primary mx-auto" />} title="Hur erfaren är du med träning?" sub="Välj ett alternativ" />
      <div className="space-y-3 mb-4">
        {LEVELS.map((l) => {
          const selected = level === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={cn(
                "w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition-all",
                selected
                  ? "border-[oklch(0.78_0.15_190)] bg-[oklch(0.78_0.15_190/0.08)] ring-1 ring-[oklch(0.78_0.15_190/0.5)] shadow-[0_0_20px_-6px_oklch(0.78_0.15_190/0.6)]"
                  : "border-border bg-card hover:bg-secondary/40"
              )}
            >
              <div className={cn(
                "h-14 w-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden bg-[oklch(0.18_0.04_240)]",
                selected && "ring-1 ring-[oklch(0.78_0.15_190/0.5)]"
              )}>
                <img
                  src={l.img}
                  alt={l.label}
                  width={56}
                  height={56}
                  loading="lazy"
                  className="h-full w-full object-cover [filter:drop-shadow(0_0_8px_oklch(0.78_0.15_190/0.6))]"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm", selected && "text-[oklch(0.85_0.13_190)]")}>{l.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
              </div>
              <Bars n={l.bars} active={selected} />
            </button>
          );
        })}
      </div>
      <PrimaryBtn onClick={onNext} disabled={!level}>Bekräfta nivå</PrimaryBtn>
    </div>
  );
}
function Bars({ n, active }: { n: number; active: boolean }) {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={cn("w-1 rounded-sm", i <= n ? (active ? "bg-primary" : "bg-foreground") : "bg-muted")} style={{ height: `${i * 25}%` }} />
      ))}
    </div>
  );
}

/* STEP 5: STATS */
function StepStats({ age, setAge, height, setHeight, weight, setWeight, onNext }: { age: string; setAge: (v: string) => void; height: string; setHeight: (v: string) => void; weight: string; setWeight: (v: string) => void; onNext: () => void }) {
  const ok = !!age && !!height && !!weight;
  return (
    <div>
      <StepHeader icon={<span>🧬</span>} title="Berätta lite om dig" sub="FitFlow anpassar träningsprogrammet helt efter dig." />
      <div className="space-y-3 mb-4">
        <Field label="Ålder (år)"><Input value={age} onChange={(e) => setAge(e.target.value)} type="number" placeholder="t.ex. 30" /></Field>
        <Field label="Längd (cm)"><Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" placeholder="t.ex. 180" /></Field>
        <Field label="Vikt (kg)"><Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" placeholder="t.ex. 75.5" /></Field>
      </div>
      <PrimaryBtn onClick={onNext} disabled={!ok}>Fortsätt</PrimaryBtn>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs text-muted-foreground mb-1.5">{label}</p>{children}</div>;
}

/* STEP 6: PHOTO (optional) */
function StepPhoto({ photo, setPhoto, onNext }: { photo: string | null; setPhoto: (v: string | null) => void; onNext: () => void }) {
  const onFile = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  };
  return (
    <div>
      <StepHeader icon={<Camera className="h-7 w-7 text-warning mx-auto" />} title="Ta ett foto för ännu mer personligt program (valfritt)" sub="Ladda upp ett helkroppsfoto så kan FitFlow analysera din kroppsbyggnad. Detta steg är helt valfritt." />
      <div className="space-y-3 mb-4">
        <label className="block rounded-2xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-secondary/30">
          <Camera className="h-7 w-7 mx-auto text-muted-foreground" />
          <p className="text-sm mt-2">{photo ? "Foto valt ✓" : "Ta ett foto"}</p>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <label className="block rounded-2xl border border-border p-4 text-center cursor-pointer hover:bg-secondary/40">
          <div className="flex items-center justify-center gap-2 text-sm"><ImageIcon className="h-4 w-4" /> Välj från galleri</div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      <PrimaryBtn onClick={onNext}>{photo ? "Fortsätt" : "Hoppa över"}</PrimaryBtn>
    </div>
  );
}

/* STEP 7: MOOD (multi) + stress/sleep */
const MOODS: { id: Mood; label: string; desc: string; img: string }[] = [
  { id: "peak", label: "Toppform", desc: "Redo att pusha max", img: moodPeakImg },
  { id: "good", label: "Bra", desc: "Normal träning fungerar", img: moodGoodImg },
  { id: "ok", label: "Okej", desc: "Lite trött men kan träna", img: moodOkImg },
  { id: "tired", label: "Trött", desc: "Lättare pass rekommenderas", img: moodTiredImg },
  { id: "recovery", label: "Återhämtning", desc: "Skada/sjukdom – anpassat program", img: moodRecoveryImg },
];
function StepMood({ moods, toggleMood, stress, toggleStress, sleep, toggleSleep, onNext }: { moods: Mood[]; toggleMood: (m: Mood) => void; stress: string[]; toggleStress: (v: string) => void; sleep: string[]; toggleSleep: (v: string) => void; onNext: () => void }) {
  return (
    <div>
      <StepHeader icon={<Smile className="h-7 w-7 text-warning mx-auto" />} title="Hur mår du just nu?" sub="Du kan välja flera alternativ. FitFlow justerar intensiteten." />
      <div className="space-y-3 mb-5">
        {MOODS.map((m) => {
          const selected = moods.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleMood(m.id)}
              className={cn(
                "w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition-all",
                selected
                  ? "border-[oklch(0.78_0.15_190)] bg-[oklch(0.78_0.15_190/0.08)] ring-1 ring-[oklch(0.78_0.15_190/0.5)] shadow-[0_0_20px_-6px_oklch(0.78_0.15_190/0.6)]"
                  : "border-border bg-card hover:bg-secondary/40"
              )}
            >
              <div className={cn(
                "h-14 w-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden bg-[oklch(0.18_0.04_240)]",
                selected && "ring-1 ring-[oklch(0.78_0.15_190/0.5)]"
              )}>
                <img src={m.img} alt={m.label} width={56} height={56} loading="lazy" className="h-full w-full object-cover [filter:drop-shadow(0_0_8px_oklch(0.78_0.15_190/0.6))]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm", selected && "text-[oklch(0.85_0.13_190)]")}>{m.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
              </div>
              {selected && <Check className="h-4 w-4 text-[oklch(0.85_0.13_190)] shrink-0" />}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] tracking-widest text-muted-foreground font-semibold mb-2">YTTERLIGARE INFO (VALFRITT)</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Chips label="Stress" options={["Låg", "Medel", "Hög"]} value={stress} toggle={toggleStress} />
        <Chips label="Sömn" options={["Bra", "Ok", "Dålig"]} value={sleep} toggle={toggleSleep} icon={<Bed className="h-3 w-3" />} />
      </div>
      <PrimaryBtn onClick={onNext} disabled={moods.length === 0}>Fortsätt</PrimaryBtn>
    </div>
  );
}
function Chips({ label, options, value, toggle, icon }: { label: string; options: string[]; value: string[]; toggle: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">{icon}{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o);
          return <button key={o} onClick={() => toggle(o)} className={cn("text-xs px-3 py-1.5 rounded-full border", on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground")}>{o}</button>;
        })}
      </div>
    </div>
  );
}

/* STEP 8: EQUIPMENT */
const EQUIP: { id: Equip; label: string; desc: string; img: string }[] = [
  { id: "none", label: "Ingen Utrustning", desc: "Hemträning med enbart kroppsviktsövningar", img: equipNoneImg },
  { id: "dumbbells", label: "Hantlar", desc: "Endast övningar med hantlar och kroppsvikt", img: equipDumbbellsImg },
  { id: "garage", label: "Garagegym", desc: "Övningar med skivstång, hantlar och kroppsvikt", img: equipGarageImg },
  { id: "fullgym", label: "Fullt Utrustat Gym", desc: "Alla övningar med maskiner, skivstång och allt", img: equipFullgymImg },
];
function StepEquipment({ equipment, setEquipment }: { equipment: Equip | null; setEquipment: (e: Equip) => void }) {
  return (
    <div>
      <StepHeader icon={<Dumbbell className="h-7 w-7 text-warning mx-auto" />} title="Vilken utrustning har du?" />
      <div className="space-y-3">
        {EQUIP.map((e) => {
          const selected = equipment === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setEquipment(e.id)}
              className={cn(
                "w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition-all",
                selected
                  ? "border-[oklch(0.78_0.15_190)] bg-[oklch(0.78_0.15_190/0.08)] ring-1 ring-[oklch(0.78_0.15_190/0.5)] shadow-[0_0_20px_-6px_oklch(0.78_0.15_190/0.6)]"
                  : "border-border bg-card hover:bg-secondary/40"
              )}
            >
              <div className={cn(
                "h-14 w-14 rounded-xl shrink-0 flex items-center justify-center overflow-hidden bg-[oklch(0.18_0.04_240)]",
                selected && "ring-1 ring-[oklch(0.78_0.15_190/0.5)]"
              )}>
                <img src={e.img} alt={e.label} width={56} height={56} loading="lazy" className="h-full w-full object-cover [filter:drop-shadow(0_0_8px_oklch(0.78_0.15_190/0.6))]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm", selected && "text-[oklch(0.85_0.13_190)]")}>{e.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{e.desc}</p>
              </div>
              {selected && <Check className="h-4 w-4 text-[oklch(0.85_0.13_190)] shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* STEP 9: DAYS */
const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
function StepDays({ daysMode, setDaysMode, daysPerWeek, setDaysPerWeek, pickedDays, togglePicked, onNext }: { daysMode: "app" | "me"; setDaysMode: (m: "app" | "me") => void; daysPerWeek: number; setDaysPerWeek: (n: number) => void; pickedDays: string[]; togglePicked: (d: string) => void; onNext: () => void }) {
  return (
    <div>
      <StepHeader icon={<Calendar className="h-7 w-7 text-primary mx-auto" />} title="När tränar du?" />
      <div className="grid grid-cols-2 gap-2 mb-4 rounded-2xl bg-card p-1 border border-border">
        {(["me", "app"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setDaysMode(m)}
            className={cn(
              "rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-200",
              daysMode === m
                ? "bg-[oklch(0.7_0.18_180)] text-[oklch(0.12_0.03_240)] ring-2 ring-[oklch(0.7_0.18_180)]/60 shadow-[0_0_20px_oklch(0.7_0.18_180/0.6)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "app" ? <Shuffle className="h-4 w-4" /> : null}
            {m === "me" ? "Jag väljer dagar" : "Appen väljer"}
          </button>
        ))}
      </div>
      {daysMode === "app" ? (
        <>
          <p className="text-center text-5xl font-extrabold text-success">{daysPerWeek}</p>
          <p className="text-center text-sm text-muted-foreground mb-3">dagar per vecka</p>
          <div className="grid grid-cols-6 gap-2 mb-3">
            {[2,3,4,5,6,7].map((n) => (
              <button
                key={n}
                onClick={() => setDaysPerWeek(n)}
                className={cn(
                  "aspect-square rounded-2xl text-lg font-bold border transition-all duration-200",
                  daysPerWeek === n
                    ? "bg-[oklch(0.7_0.18_180)] text-[oklch(0.12_0.03_240)] border-[oklch(0.8_0.2_180)] ring-2 ring-[oklch(0.7_0.18_180)]/60 shadow-[0_0_20px_oklch(0.7_0.18_180/0.6)] scale-105"
                    : "bg-[oklch(0.18_0.04_240)] border-[oklch(0.3_0.04_240)] text-foreground hover:border-[oklch(0.5_0.1_180)]"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="text-center text-xs text-muted-foreground bg-card border border-border rounded-xl py-2.5 mb-4">Vi väljer de bästa dagarna för optimal återhämtning 💪</div>
        </>
      ) : (
        <>
          <p className="text-center text-5xl font-extrabold text-success">{pickedDays.length}</p>
          <p className="text-center text-sm text-muted-foreground mb-3">dagar per vecka</p>
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {WEEKDAYS.map((d) => {
              const on = pickedDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => togglePicked(d)}
                  className={cn(
                    "aspect-square rounded-2xl text-xs font-bold border transition-all duration-200",
                    on
                      ? "bg-[oklch(0.7_0.18_180)] text-[oklch(0.12_0.03_240)] border-[oklch(0.8_0.2_180)] ring-2 ring-[oklch(0.7_0.18_180)]/60 shadow-[0_0_18px_oklch(0.7_0.18_180/0.6)] scale-105"
                      : "bg-[oklch(0.18_0.04_240)] border-[oklch(0.3_0.04_240)] text-foreground hover:border-[oklch(0.5_0.1_180)]"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </>
      )}
      <PrimaryBtn onClick={onNext} disabled={daysMode === "me" && pickedDays.length === 0}>Bekräfta dagar</PrimaryBtn>
    </div>
  );
}

/* STEP 10: DURATION */
function StepDuration({ duration, setDuration }: { duration: number | null; setDuration: (d: number) => void }) {
  const options = [20, 30, 45, 60, 75, 90];
  return (
    <div>
      <StepHeader icon={<Clock className="h-7 w-7 text-primary mx-auto" />} title="Hur länge per pass?" sub="Välj ett alternativ" />
      <div className="grid grid-cols-3 gap-2.5">
        {options.map((m) => (
          <button key={m} onClick={() => setDuration(m)} className={cn("rounded-2xl border p-4 text-center", duration === m ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card")}>
            <p className="text-2xl font-bold">{m}</p><p className="text-xs text-muted-foreground">minuter</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* STEP 11: PERIOD */
function StepPeriod({ period, setPeriod }: { period: string | null; setPeriod: (p: string) => void }) {
  const opts = ["1 vecka", "2 veckor", "4 veckor", "8 veckor", "12 veckor"];
  return (
    <div>
      <StepHeader icon={<Calendar className="h-7 w-7 text-primary mx-auto" />} title="Hur långt schema vill du ha?" sub="Välj din träningsperiod" />
      <div className="space-y-2.5">
        {opts.map((p) => (
          <OptionRow key={p} title={p} selected={period === p} onClick={() => setPeriod(p)} icon={<Layers className="h-4 w-4 text-primary" />} />
        ))}
      </div>
    </div>
  );
}

/* STEP 12: COUNTS (exercises) */
function StepCounts({ title, icon, value, options, suffix, onSelect }: { title: string; icon: string; value: number | null; options: number[]; suffix: string; onSelect: (n: number) => void }) {
  return (
    <div>
      <StepHeader icon={<span>{icon}</span>} title={title} sub="Välj ett alternativ" />
      <div className="grid grid-cols-4 gap-2.5">
        {options.map((n) => (
          <button key={n} onClick={() => onSelect(n)} className={cn("rounded-2xl border p-4 text-center", value === n ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card")}>
            <p className="text-2xl font-bold">{n}</p><p className="text-[10px] text-muted-foreground">{suffix}</p>
          </button>
        ))}
      </div>
      <button
        onClick={() => onSelect(0)}
        className={cn(
          "mt-3 w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-all",
          value === 0
            ? "border-[oklch(0.78_0.15_190)] bg-[oklch(0.78_0.15_190/0.1)] ring-1 ring-[oklch(0.78_0.15_190/0.5)] shadow-[0_0_18px_-4px_oklch(0.78_0.15_190/0.6)]"
            : "border-border bg-card hover:bg-secondary/40"
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-[oklch(0.18_0.04_240)] flex items-center justify-center ring-1 ring-[oklch(0.78_0.15_190/0.4)]">
          <Sparkles className="h-5 w-5 text-[oklch(0.85_0.13_190)]" />
        </div>
        <div className="flex-1">
          <p className={cn("font-semibold text-sm", value === 0 && "text-[oklch(0.85_0.13_190)]")}>Låt FitFlow välja åt mig</p>
          <p className="text-xs text-muted-foreground">Vi anpassar antalet utifrån dina mål och nivå</p>
        </div>
        {value === 0 && <Check className="h-4 w-4 text-[oklch(0.85_0.13_190)]" />}
      </button>
    </div>
  );
}

/* STEP 13: SETS + EXTRA + SAVE */
function StepFinal({ sets, setSets, extra, setExtra, saving, onSave }: { sets: number | null; setSets: (n: number) => void; extra: string; setExtra: (v: string) => void; saving: boolean; onSave: () => void }) {
  const setOptions = [2, 3, 4, 5];
  return (
    <div>
      <StepHeader icon={<Repeat className="h-7 w-7 text-primary mx-auto" />} title="Hur många set per övning?" />
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {setOptions.map((n) => (
          <button key={n} onClick={() => setSets(n)} className={cn("rounded-2xl border p-4 text-center", sets === n ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card")}>
            <p className="text-2xl font-bold">{n}</p><p className="text-[10px] text-muted-foreground">set</p>
          </button>
        ))}
      </div>
      <button
        onClick={() => setSets(0)}
        className={cn(
          "mb-6 w-full rounded-2xl border p-4 flex items-center gap-3 text-left transition-all",
          sets === 0
            ? "border-[oklch(0.78_0.15_190)] bg-[oklch(0.78_0.15_190/0.1)] ring-1 ring-[oklch(0.78_0.15_190/0.5)] shadow-[0_0_18px_-4px_oklch(0.78_0.15_190/0.6)]"
            : "border-border bg-card hover:bg-secondary/40"
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-[oklch(0.18_0.04_240)] flex items-center justify-center ring-1 ring-[oklch(0.78_0.15_190/0.4)]">
          <Sparkles className="h-5 w-5 text-[oklch(0.85_0.13_190)]" />
        </div>
        <div className="flex-1">
          <p className={cn("font-semibold text-sm", sets === 0 && "text-[oklch(0.85_0.13_190)]")}>Låt FitFlow välja åt mig</p>
          <p className="text-xs text-muted-foreground">Vi anpassar antal set utifrån dina mål och nivå</p>
        </div>
        {sets === 0 && <Check className="h-4 w-4 text-[oklch(0.85_0.13_190)]" />}
      </button>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2"><Wand2 className="h-4 w-4 text-primary" /><p className="font-semibold text-sm">Vill du lägga till några extra detaljer?</p></div>
        <p className="text-xs text-muted-foreground mb-2">Skriv vad du vill att FitFlow ska inkludera i din träningsplan.</p>
        <Textarea rows={4} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="T.ex. fokus på överkropp på måndagar, ingen löpning, sjukgymnastik för knä…" />
      </div>
      <Button disabled={sets === null || saving} onClick={onSave} className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-success to-primary">
        {saving ? "Skapar…" : <>Skapa mitt schema <Sparkles className="h-4 w-4" /></>}
      </Button>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>{children}</div>;
}

function CreatingOverlay({
  progress, done, summary, onShow,
}: {
  progress: number;
  done: boolean;
  summary: {
    age: string; gender: string | null; height: string; weight: string;
    equipment: string | null; level: string | null;
    daysPerWeek: number; period: string | null; focus: string;
  };
  onShow: () => void;
}) {
  const equipLabel = summary.equipment === "fullgym" ? "Fullt gym"
    : summary.equipment === "garage" ? "Garagegym"
    : summary.equipment === "dumbbells" ? "Hantlar"
    : summary.equipment === "none" ? "Ingen utrustning" : "—";
  const levelLabel = summary.level === "rookie" ? "Nybörjare"
    : summary.level === "beginner" ? "Lätt" : summary.level === "intermediate" ? "Medel"
    : summary.level === "advanced" ? "Avancerad" : "—";
  const rows: { icon: string; label: string; value: string }[] = [
    { icon: "🎂", label: "Ålder", value: summary.age ? `${summary.age} år` : "—" },
    { icon: "📏", label: "Längd", value: summary.height ? `${summary.height} cm` : "—" },
    { icon: "⚖️", label: "Vikt", value: summary.weight ? `${summary.weight} kg` : "—" },
    { icon: "🏋️", label: "Utrustning", value: equipLabel },
    { icon: "📶", label: "Nivå", value: levelLabel },
    { icon: "📅", label: "Dagar/vecka", value: `${summary.daysPerWeek || 0} dagar` },
    { icon: "🗓️", label: "Veckor", value: summary.period ?? "—" },
    { icon: "🎯", label: "Fokus", value: summary.focus },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md mx-auto px-4 pt-6 pb-24 min-h-screen flex flex-col">
        <h2 className="text-center font-bold text-lg">Nytt Schema</h2>
        <p className={cn("text-center text-sm mt-2 transition-colors", done ? "text-success font-semibold" : "text-muted-foreground")}>
          {done ? "✓ Ditt program är klart!" : "Beräknar optimal träningsvolym…"}
        </p>

        <div className="mx-auto mt-5 relative h-36 w-36 rounded-2xl border-2 border-primary/60 bg-[oklch(0.16_0.04_240)] overflow-hidden flex items-center justify-center shadow-[0_0_30px_-8px_oklch(0.65_0.2_265/0.7)]">
          <img src={logoImg} alt="FitFlow" className="h-24 w-24 object-contain" />
          {!done && (
            <span
              className="pointer-events-none absolute inset-y-0 -inset-x-1/2 w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-[shine_1.6s_linear_infinite]"
              style={{ transform: "skewX(-20deg)" }}
            />
          )}
        </div>
        <style>{`@keyframes shine{0%{transform:translateX(-100%) skewX(-20deg)}100%{transform:translateX(300%) skewX(-20deg)}}`}</style>

        <div className="mt-6 space-y-2.5">
          {rows.map((r, i) => {
            const threshold = ((i + 1) / rows.length) * 90;
            const checked = progress >= threshold;
            return (
              <div key={r.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-3 py-2.5">
                <span className="text-base">{r.icon}</span>
                <span className="text-xs text-muted-foreground w-24">{r.label}</span>
                <span className="flex-1 text-sm font-semibold">{r.value}</span>
                <span className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center border transition-all",
                  checked ? "bg-primary border-primary text-primary-foreground" : "border-border text-transparent"
                )}>
                  <Check className="h-3 w-3" />
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="flex items-end justify-between">
            <span className={cn("text-sm", done ? "text-success font-semibold" : "text-muted-foreground")}>
              {done ? "Klar!" : "Genererar…"}
            </span>
            <span className={cn("text-2xl font-extrabold", done ? "text-success" : "text-primary")}>{progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn("h-full transition-all duration-200", done ? "bg-success" : "bg-gradient-to-r from-primary to-[oklch(0.7_0.18_180)]")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-auto pt-6">
          {done ? (
            <Button onClick={onShow} className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-primary to-[oklch(0.62_0.22_265)] shadow-lg shadow-primary/30 animate-in fade-in slide-in-from-bottom-2">
              Visa mitt program <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">Vänta medan vi skapar ditt program…</p>
          )}
        </div>
      </div>
    </div>
  );
}